import {db} from '../lib/db.js';
import {verifyCandidate} from '../lib/auto-discovery.js';
import {trustedSourceForLead,WORLD_VERIFICATION_BATCH_SIZE} from '../lib/world-verification.js';
import {fetchOfficial,publish} from './discover.js';

const authorised=req=>Boolean(process.env.CRON_SECRET)&&
  req.headers.authorization==='Bearer '+process.env.CRON_SECRET;

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  if(!authorised(req))return res.status(401).json({error:'Unauthorized'});
  let sql=null,runId=null;
  try{
    sql=db();
    const [started]=await sql`INSERT INTO opportunity_web_verification_runs(status)
      VALUES('running') RETURNING id`;
    runId=started.id;
    // Claim atomically to prevent overlapping jobs from verifying the same lead.
    const leads=await sql`
      WITH queue AS (
        SELECT l.id FROM opportunity_web_leads l
        WHERE l.review_status='unverified' AND l.verification_attempts<4 AND
          (l.verification_status='pending'
           OR (l.verification_status='checking' AND l.verification_checked_at<now()-interval '40 minutes')
           OR (l.verification_status='needs_evidence' AND l.verification_checked_at<now()-interval '7 days')
           OR (l.verification_status='retry_needed' AND l.verification_checked_at<now()-interval '1 day')
           -- A rejected domain can become eligible if an official provider is
           -- registered later. Reconsider it only when that exact hostname is
           -- now in the active registry. The full page must still pass the
           -- programme-specific source and evidence checks below.
           OR (l.verification_status='source_review'
             AND l.verification_checked_at<now()-interval '1 day'
             AND EXISTS (
               SELECT 1 FROM monitored_sources m
               WHERE m.is_active=true AND
                 lower(regexp_replace(split_part(m.source_url,'/',3),'^www[.]',''))=
                 lower(regexp_replace(split_part(l.canonical_url,'/',3),'^www[.]',''))
             )))
        ORDER BY l.matched_official_host DESC,l.first_seen_at ASC
        LIMIT ${WORLD_VERIFICATION_BATCH_SIZE} FOR UPDATE SKIP LOCKED
      )
      UPDATE opportunity_web_leads l SET verification_status='checking',
        verification_attempts=verification_attempts+1,verification_checked_at=now()
      FROM queue WHERE l.id=queue.id
      RETURNING l.id,l.canonical_url,l.title,l.matched_official_host
    `;
    const sources=await sql`SELECT id,source_url,provider,is_active
      FROM monitored_sources WHERE is_active=true`;
    const summary={inspected:leads.length,published_new:0,verified_existing:0,
      needs_evidence:0,needs_source_review:0,provider_errors:0};
    const results=[];
    async function inspect(lead){
      let status='retry_needed',reason='Provider check incomplete',evidence={},
        publishedId=null,reviewStatus='unverified';
      try{
        const trust=trustedSourceForLead(lead,sources);
        if(trust.status!=='trusted'){
          status='source_review';reason=trust.reason;
          evidence={source_status:'not_approved_official_provider'};
        }else{
          // Search titles and snippets are never authoritative evidence.
          const page=await fetchOfficial(trust.url,trust.source.source_url);
          const checked=verifyCandidate(page.html,page.url,trust.source.provider);
          evidence={...checked.evidence,registered_provider:trust.source.provider,
            registered_source:trust.source.source_url};
          if(!checked.verified){
            status='needs_evidence';reason=checked.reasons.join('; ').slice(0,900);
          }else{
            const [existing]=await sql`
              SELECT id FROM opportunities
              WHERE regexp_replace(official_source_url,'/+$','')=${page.url.replace(/\/+$/,'')}
              LIMIT 1
            `;
            if(existing){
              status='already_listed';reviewStatus='already_listed';
              publishedId=existing.id;reason='Officially verified page already exists in catalogue';
            }else{
              const outcome=await publish(sql,trust.source,page.url,checked);
              if(outcome.status==='published'){
                status='published';reviewStatus='reviewed';publishedId=outcome.id;
                reason='Complete official programme evidence verified';
              }else{
                status='needs_evidence';reason=String(outcome.reason||'Publication conflict').slice(0,900);
              }
            }
          }
        }
      }catch(error){
        status='retry_needed';
        reason='Provider request or verification error: '+String(error?.message||error).slice(0,160);
      }
      try{
        await sql`
          UPDATE opportunity_web_leads SET verification_status=${status},
            verification_reason=${reason},verification_evidence=${JSON.stringify(evidence)}::jsonb,
            verification_checked_at=now(),review_status=${reviewStatus},
            published_opportunity_id=${publishedId}
          WHERE id=${lead.id} AND verification_status='checking'
        `;
      }catch(error){
        console.error('Lead outcome persistence failed',String(error?.message||error).slice(0,130));
        status='retry_needed';
      }
      if(status==='published')summary.published_new++;
      else if(status==='already_listed')summary.verified_existing++;
      else if(status==='needs_evidence')summary.needs_evidence++;
      else if(status==='source_review')summary.needs_source_review++;
      else summary.provider_errors++;
      results.push({id:lead.id,status,reason:reason.slice(0,180)});
    }
    for(let offset=0;offset<leads.length;offset+=3)
      await Promise.all(leads.slice(offset,offset+3).map(inspect));
    await sql`
      UPDATE opportunity_web_verification_runs SET status='completed',completed_at=now(),
        inspected=${summary.inspected},published_new=${summary.published_new},
        verified_existing=${summary.verified_existing},
        needs_evidence=${summary.needs_evidence},
        needs_source_review=${summary.needs_source_review},
        provider_errors=${summary.provider_errors},results=${JSON.stringify(results)}::jsonb
      WHERE id=${runId}
    `;
    return res.status(200).json({ok:true,...summary});
  }catch(error){
    console.error('Worldwide verification failed',String(error?.message||error).slice(0,160));
    if(sql&&runId)try{
      await sql`UPDATE opportunity_web_verification_runs SET status='failed',
        completed_at=now(),error_message=${String(error?.message||error).slice(0,160)}
        WHERE id=${runId}`;
    }catch{}
    return res.status(500).json({ok:false,error:'World verification failed safely'});
  }
}
