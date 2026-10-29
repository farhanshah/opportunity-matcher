import {db} from '../lib/db.js';
import {verifiedInternship} from '../lib/exact-internship-publishing.js';
const authorised=req=>Boolean(process.env.CRON_SECRET)&&req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
const FEEDS=[['UNDP','/api/undp-openings'],['WFP','/api/wfp-openings'],['UNOPS','/api/unops-openings'],['UNICEF','/api/unicef-openings'],['FAO','/api/specific-openings?opportunity_id=INT-012']];
async function fetchConfirmed(provider,path){
 const response=await fetch('https://oppmatcher.tech'+path,{
   signal:AbortSignal.timeout(42000),headers:{Accept:'application/json','Cache-Control':'no-cache'}
 });
 if(!response.ok)throw Error(provider+' provider adapter HTTP '+response.status);
 const body=await response.text();
 if(body.length>2500000)throw Error(provider+' provider data too large');
 const data=JSON.parse(body);
 if(data.ok!==true||data.provider!==provider||data.adapter_state==='unreadable'||
    data.fetch_error||!Array.isArray(data.openings))throw Error(provider+' provider adapter not currently readable');
 const fetched=new Date(data.fetched_at);
 if(!Number.isFinite(fetched.getTime())||Math.abs(Date.now()-fetched.getTime())>15*60000)
  throw Error(provider+' provider observation is stale');
 const verified=data.openings.slice(0,35).map(row=>verifiedInternship(row,provider,fetched)).filter(Boolean);
 return {openings:verified,diagnostic:{
    status:'completed',adapter_state:String(data.adapter_state||'unknown').slice(0,55),
    provider_candidates:Number(data.candidate_count||0),
    exact_jobs_reported:Number(data.exact_verified_count||0),
    accepted:verified.length,
    checked_at:fetched.toISOString(),
    provider_host_errors:Array.isArray(data.host_errors)?data.host_errors.slice(0,3).map(x=>String(x).slice(0,95)):[]
 }};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!authorised(req))return res.status(401).json({ok:false,error:'Unauthorized'});
 let sql,runId=null;
 try{
  sql=db();
  const [run]=await sql`INSERT INTO opportunity_official_feed_runs(provider,status)
    VALUES('exact_internships','running') RETURNING id`;
  runId=run.id;
  const checks=await Promise.allSettled(FEEDS.map(([name,path])=>fetchConfirmed(name,path)));
  const records=new Map();let providerErrors=0,successfulSources=0;
  const providerDetails={};
  for(let i=0;i<checks.length;i++){
   const check=checks[i];const provider=FEEDS[i][0];
   if(check.status!=='fulfilled'){
    const reason=String(check.reason?.message||check.reason).slice(0,140);
    providerDetails[provider]={status:'failed',reason};
    providerErrors++;
    console.warn('Official internship feed unavailable',provider+': '+reason);
    continue;
   }
   providerDetails[provider]=check.value.diagnostic;
   successfulSources++;
   for(const row of check.value.openings)
      if(!records.has(row.canonical_url))records.set(row.canonical_url,row);
  }
  if(!successfulSources){
   await sql`UPDATE opportunity_official_feed_runs
      SET details=${JSON.stringify({providers:providerDetails})}::jsonb WHERE id=${runId}`;
   throw Error('No official vacancy adapter returned readable data');
  }
  let newEntries=0,refreshed=0,skipped=0;
  for(const row of [...records.values()].slice(0,60)){
   try{
    const [stored]=await sql`
      INSERT INTO worldwide_source_listings(
       canonical_url,provider,title,evidence_hash,source_status,
       verified_page_at,last_checked_at,evidence)
      VALUES(${row.canonical_url},${row.provider},${row.title},${row.evidence_hash},
        'source_confirmed',${row.checked_at},now(),${JSON.stringify(row.evidence)}::jsonb)
      ON CONFLICT(canonical_url) DO UPDATE SET
       title=EXCLUDED.title,provider=EXCLUDED.provider,
       evidence_hash=EXCLUDED.evidence_hash,source_status='source_confirmed',
       verified_page_at=EXCLUDED.verified_page_at,last_checked_at=now(),
       evidence=EXCLUDED.evidence,updated_at=now()
      WHERE worldwide_source_listings.verified_page_at<=EXCLUDED.verified_page_at
      RETURNING (xmax=0) AS newly_inserted
    `;
    if(!stored)skipped++;else if(stored.newly_inserted)newEntries++;else refreshed++;
   }catch(err){
    skipped++;console.warn('Internship publication unavailable',String(err?.message||err).slice(0,110));
   }
  }
  await sql`UPDATE opportunity_official_feed_runs
    SET status='completed',completed_at=now(),queries_attempted=${FEEDS.length},
      fetched=${records.size},recorded=${newEntries},errors=${providerErrors+skipped},
      details=${JSON.stringify({providers:providerDetails,refreshed,skipped})}::jsonb
    WHERE id=${runId}`;
  return res.status(200).json({ok:true,provider_feeds_checked:FEEDS.length,
   provider_feeds_available:successfulSources,providers:providerDetails,exact_vacancies:records.size,
   newly_published:newEntries,refreshed,withheld:skipped,
   source_tier:'Exact official vacancies only; no personal eligibility claims'});
 }catch(err){
  if(sql&&runId)try{await sql`UPDATE opportunity_official_feed_runs
   SET status='failed',completed_at=now(),errors=1,
       error_message=${String(err?.message||err).slice(0,160)} WHERE id=${runId}`
  }catch{}
  console.error('Internship feed ingestion failed',String(err?.message||err).slice(0,150));
  return res.status(503).json({ok:false,error:'Exact internship ingestion unavailable'});
 }
}
