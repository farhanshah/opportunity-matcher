import { db } from '../lib/db.js';
import { canonicalUrl, officialHostMatches, verifyCandidate } from '../lib/auto-discovery.js';
import { resolveOfficialRedirect } from '../lib/verification-redirects.js';

const BATCH = 12;
const CONCURRENCY = 6;
function allowed(req) {
  return Boolean(process.env.CRON_SECRET) && req.headers.authorization === 'Bearer ' + process.env.CRON_SECRET;
}

async function getProviderHtml(raw) {
  const original=canonicalUrl(raw);
  if(!original) throw Error('Official URL invalid or not HTTPS');
  let current=original;
  const seenRedirects=new Set();
  for(let n=0;n<5;n++){
    if(seenRedirects.has(current))throw Error('Official provider redirect loop');
    seenRedirects.add(current);
    const r=await fetch(current,{redirect:'manual',signal:AbortSignal.timeout(8500),
      headers:{Accept:'text/html,application/xhtml+xml','User-Agent':'OpportunityMatcher-RecordVerification/1.0'}});
    if([301,302,303,307,308].includes(r.status)){
      // Security-validate each redirect, but keep its real path, including the trailing slash.
      // Canonicalization removes that slash and can otherwise create a false redirect loop.
      const next=resolveOfficialRedirect(r.headers.get('location'),current,original);
      current=next;continue;
    }
    if(!r.ok)throw Error('HTTP '+r.status);
    if(!/text\/html|application\/xhtml\+xml/i.test(r.headers.get('content-type')||''))throw Error('Non-HTML provider response');
    const size=Number(r.headers.get('content-length')||0);
    if(size>1800000)throw Error('Document exceeds safe size');
    const html=(await r.text()).slice(0,1000000);
    if(html.length<350)throw Error('Empty or unreadable provider document');
    return {html,url:current};
  }
  throw Error('Too many provider redirects');
}

async function checkOne(sql,opp){
  let outcome='needs_evidence';
  let updated=false;
  try{
    const page=await getProviderHtml(opp.official_source_url);
    const report=verifyCandidate(page.html,page.url,opp.provider);
    const lower=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    if(!report.verified){
      outcome='needs_evidence: '+report.reasons.slice(0,4).join('; ');
    } else if(lower(report.record.title)!==lower(opp.title)){
      outcome='needs_evidence: programme title mismatch';
    } else {
      // A matching name alone cannot confirm a different award, funding package
      // or destination. Only label the record verified when these basic
      // programme identity facts agree with the provider's explicit evidence.
      const oldType=String(opp.opportunity_type||'').toLowerCase().trim();
      const oldFunding=String(opp.funding_type||'').toLowerCase().trim();
      const oldDestination=String(opp.destination_country||'').toLowerCase().trim();
      const materialMismatch=Boolean(
        (oldType && oldType!==report.record.type.toLowerCase()) ||
        (oldFunding && oldFunding!==report.record.funding.toLowerCase()) ||
        (oldDestination && oldDestination!==report.record.destination.toLowerCase().trim())
      );
      const oldCountry=JSON.stringify(opp.eligible_nationalities||[]).toLowerCase();
      const oldDegree=JSON.stringify(opp.education_levels||[]).toLowerCase();
      const oldFields=JSON.stringify(opp.fields_of_study||[]).toLowerCase();
      const fitCountry=!oldCountry || oldCountry==='[]' || oldCountry.includes('all nationalit');
      const fitDegree=!oldDegree || oldDegree==='[]' || oldDegree.includes(report.record.education[0].toLowerCase());
      const fitFields=!oldFields || oldFields==='[]' || oldFields.includes('all field');
      if(materialMismatch || !fitCountry || !fitDegree || !fitFields){
        outcome='needs_evidence: verified source differs from stored eligibility';
      } else {
        // Country-specific paths are independently scoped, so a general
        // programme page must never overwrite their deadlines or rules.
        const [routes]=await sql`
          SELECT count(*)::int AS count FROM opportunity_country_routes
          WHERE opportunity_id=${opp.id} AND is_active=true
        `;
        if(routes.count){
          outcome='needs_evidence: country-specific application routes need direct evidence';
        }else{
          const r=report.record;
          const [saved]=await sql`
            UPDATE opportunities SET application_close_date=${r.deadline}, application_open_date=${r.openDate || null},
              eligible_nationalities=CASE WHEN eligible_nationalities IS NULL OR eligible_nationalities='[]'::jsonb
                THEN ${JSON.stringify(r.nationality)}::jsonb ELSE eligible_nationalities END,
              education_levels=CASE WHEN education_levels IS NULL OR education_levels='[]'::jsonb
                THEN ${JSON.stringify(r.education)}::jsonb ELSE education_levels END,
              fields_of_study=CASE WHEN fields_of_study IS NULL OR fields_of_study='[]'::jsonb
                THEN ${JSON.stringify(r.fields)}::jsonb ELSE fields_of_study END,
              status=${r.status},last_verified_at=now(),verification_confidence='high',
              updated_at=now()
            WHERE id=${opp.id} RETURNING id
          `;
          updated=Boolean(saved);
          outcome=updated?'verified_current_cycle':'needs_evidence: update failed';
        }
      }
    }
  }catch(e){outcome='retry_needed: '+String(e.message||e).slice(0,160)}
  await sql`
    UPDATE opportunities SET last_recheck_at=now(),
      last_recheck_outcome=${outcome.slice(0,500)}
    WHERE id=${opp.id}
  `;
  return {id:opp.external_id,outcome,updated};
}

export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
  if(!allowed(req)) return res.status(401).json({error:'Unauthorized'});
  res.setHeader('Cache-Control','no-store');
  try{
    const sql=db();
    // A definitively elapsed published closing date can be closed without
    // guessing the next cycle. Active country-specific routes are protected.
    const closed=await sql`
      UPDATE opportunities o SET status='Closed',updated_at=now()
      WHERE o.status='Open' AND o.application_close_date < CURRENT_DATE
        AND NOT EXISTS(
          SELECT 1 FROM opportunity_country_routes r
          WHERE r.opportunity_id=o.id AND r.is_active=true
            AND r.application_close_date>=CURRENT_DATE
            AND lower(coalesce(r.status,'')) NOT IN ('closed','expired')
        )
      RETURNING o.external_id
    `;
    const records=await sql`
      SELECT id,external_id,title,provider,opportunity_type,funding_type,destination_country,official_source_url,eligible_nationalities,education_levels,fields_of_study
      FROM opportunities WHERE official_source_url IS NOT NULL AND official_source_url<>''
        -- Honour provider rate limits and inaccessible routes. Check eligible
        -- records first rather than retrying a known blocked page every 2h.
        AND (last_recheck_at IS NULL OR last_recheck_at <= now() -
          CASE
            WHEN last_recheck_outcome LIKE 'retry_needed: HTTP 403%' THEN interval '7 days'
            WHEN last_recheck_outcome LIKE 'retry_needed: HTTP 429%' THEN interval '2 days'
            WHEN last_recheck_outcome LIKE 'retry_needed: HTTP 404%' THEN interval '3 days'
            WHEN last_recheck_outcome LIKE 'retry_needed: %redirect%' THEN interval '3 days'
            WHEN last_recheck_outcome LIKE 'retry_needed: %timeout%' THEN interval '6 hours'
            ELSE interval '12 hours'
          END)
      ORDER BY last_recheck_at NULLS FIRST,external_id LIMIT ${BATCH}
    `;
    const results=[];
    for(let i=0;i<records.length;i+=CONCURRENCY){
      results.push(...await Promise.all(records.slice(i,i+CONCURRENCY).map(o=>checkOne(sql,o))));
    }
    return res.status(200).json({
      ok:true,expired_closed:closed.length,records_rechecked:results.length,
      source_verified:results.filter(x=>x.updated).length,
      needs_more_evidence:results.filter(x=>!x.updated).length,results,ran_at:new Date().toISOString()
    });
  }catch(e){console.error('Scheduled re-verification failure',e);
    return res.status(500).json({ok:false,error:'Re-verification failed safely'});
  }
}
