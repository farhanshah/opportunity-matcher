import {db} from '../lib/db.js';
import {verifyCandidate} from '../lib/auto-discovery.js';
import {trustedSourceForLead,WORLD_VERIFICATION_BATCH_SIZE} from '../lib/world-verification.js';
import {fetchOfficial,publish} from './discover.js';
import {storeSourceListing} from '../lib/source-listings.js';

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
        WHERE l.review_status='unverified' AND
          -- New search leads get a small burst of attempts; valid official
          -- programmes are never permanently abandoned after four tries.
          ( (l.verification_status='pending' AND l.verification_attempts<4)
            OR (l.verification_status='checking'
               AND l.verification_checked_at<now()-interval '40 minutes'
               AND l.verification_attempts<4)
            OR (l.verification_status='needs_evidence'
               AND l.matched_official_host=true
               AND l.verification_checked_at<now()-interval '14 days')
            -- A current, named official news call may have been checked
            -- before the enhanced call-page classifier was deployed.
            -- Retry it a few times promptly, but do not publish without a
            -- fresh fetch and the usual official-page evidence checks.
            OR (l.verification_status='needs_evidence'
               AND l.matched_official_host=true
               AND l.verification_attempts<6
               AND l.verification_checked_at BETWEEN
                   now()-interval '7 days' AND now()-interval '45 minutes'
               AND l.canonical_url ~* '/news/20[0-9]{2}/'
               AND l.title ~* '(open call|call for applications?|applications? open|extended application deadline)'
               AND NOT EXISTS (
                   SELECT 1 FROM worldwide_source_listings w
                   WHERE w.canonical_url=l.canonical_url
                     AND w.source_status='source_confirmed'))
            OR (l.verification_status='retry_needed'
               AND l.matched_official_host=true
               AND l.verification_checked_at<now() -
                 CASE WHEN l.verification_reason ILIKE '%HTTP 403%'
                        THEN interval '14 days'
                      WHEN l.verification_reason ILIKE '%HTTP 429%'
                        THEN interval '7 days'
                      WHEN l.verification_reason ILIKE '%HTTP 404%'
                        THEN interval '7 days'
                      ELSE interval '3 days' END)
            -- If we later register a genuinely official source domain,
            -- allow old leads back into verification even after 4 failures.
            OR (l.verification_status='source_review'
               AND l.verification_reason='Provider hostname is not in the official-source registry'
               AND (l.verification_checked_at IS NULL OR l.verification_checked_at<now()-interval '1 day')
               AND EXISTS (
                 SELECT 1 FROM monitored_sources m WHERE m.is_active=true
                   AND lower(regexp_replace(split_part(m.source_url,'/',3),'^www[.]',''))=
                       lower(regexp_replace(split_part(l.canonical_url,'/',3),'^www[.]',''))
               ))
          )
        -- Give real, registered provider pages and programme-shaped URLs
        -- first consideration. This only controls queue order, never trust.
        ORDER BY l.matched_official_host DESC,
          CASE WHEN l.canonical_url ~*
            '/(scholarships?|fellowships?|internships?|studentships?|opportunities|grants?|awards?|funding|careers?|applications?|programmes?)'
            THEN 0 ELSE 1 END,
          l.first_seen_at ASC
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
      needs_evidence:0,needs_source_review:0,provider_errors:0,source_confirmed:0};
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
            // A real provider page may be source-confirmed even when its
            // deadline/eligibility cannot be verified. Store it ONLY in the
            // separate discovery tier, never as a matchable opportunity.
            try{
              const listing=await storeSourceListing(sql,lead,trust.source,page);
              if(listing.isNew)summary.source_confirmed++;
            }catch(listingError){
              console.warn('Partial source listing unavailable',
                String(listingError?.message||listingError).slice(0,100));
            }
          }else{
            const [existing]=await sql`
              SELECT id FROM opportunities
              WHERE regexp_replace(official_source_url,'/+$','')=${page.url.replace(/\/+$/,'')}
              LIMIT 1
            `;
            // An existing URL is not proof that the stored award is current.
            // Reuse the strict publication path: it checks title, funding,
            // type, nationalities and protected country-specific routes
            // before updating an existing record's verified timestamp.
            const outcome=await publish(sql,trust.source,page.url,checked);
            if(outcome.status==='published'){
              if(existing){
                status='already_listed';reviewStatus='already_listed';
                reason='Existing catalogue record safely refreshed from current official evidence';
              }else{
                status='published';reviewStatus='reviewed';
                reason='New programme published with complete official evidence';
              }
              publishedId=outcome.id;
            }else{
              status='needs_evidence';
              reason=String(outcome.reason||'Publication conflict').slice(0,900);
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
    for(let offset=0;offset<leads.length;offset+=4)
      await Promise.all(leads.slice(offset,offset+4).map(inspect));
    await sql`
      UPDATE opportunity_web_verification_runs SET status='completed',completed_at=now(),
        inspected=${summary.inspected},published_new=${summary.published_new},
        verified_existing=${summary.verified_existing},source_confirmed=${summary.source_confirmed},
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
