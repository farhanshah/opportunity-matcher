import {db} from '../lib/db.js';

const ENDPOINT='https://api.grants.gov/v1/api/search2';
const TOPICS=['fellowship','scholarship'];
const authorised=req=>Boolean(process.env.CRON_SECRET)&&
 req.headers.authorization==='Bearer '+process.env.CRON_SECRET;

// Do not import organisational grants as individual scholarships. We retain
// only postings explicitly named scholarship/fellowship and leave eligibility
// unknown until the official synopsis is independently verified.
export function grantsGovCandidate(hit){
 const id=String(hit?.id??'');
 const title=String(hit?.title??'').replace(/\s+/g,' ').trim();
 if(!/^[0-9]{1,12}$/.test(id)||title.length<18||title.length>195||
   !/\b(scholarships?|fellowships?)\b/i.test(title)||
   String(hit?.oppStatus||'').toLowerCase()!=='posted')return null;
 const provider=String(hit?.agencyName||'U.S. federal grant agency').slice(0,110);
 return {
  canonical_url:'https://www.grants.gov/search-results-detail/'+id,
  title,provider,
  id,number:String(hit?.number||'').slice(0,85),
  evidence:{
   scope:'official_grants_gov_search2',
   api:'https://api.grants.gov/v1/api/search2',
   official_opportunity_id:id,
   opportunity_number:String(hit?.number||'').slice(0,85),
   agency_name:provider,
   api_status:'posted',
   guarantees:['official_agency_posting_exists'],
   unverified:['individual_applicant_eligibility','country_eligibility',
    'application_deadline','funding_terms','personal_match'],
   matching_approved:false
  }
 };
}
async function search(term){
 const response=await fetch(ENDPOINT,{
  method:'POST',signal:AbortSignal.timeout(12000),
  headers:{Accept:'application/json','Content-Type':'application/json'},
  body:JSON.stringify({rows:25,keyword:term,oppStatuses:'posted',
   startRecordNum:0})
 });
 if(!response.ok)throw Error('Grants.gov API HTTP '+response.status);
 const body=await response.json();
 if(Number(body?.errorcode)!==0||!Array.isArray(body?.data?.oppHits))
  throw Error('Unexpected official search2 response');
 return body.data.oppHits;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!authorised(req))return res.status(401).json({ok:false,error:'Unauthorized'});
 let sql,runId=null;
 try{
  sql=db();
  const [run]=await sql`INSERT INTO opportunity_official_feed_runs(provider,status)
    VALUES('Grants.gov','running') RETURNING id`;
  runId=run.id;
  const results=await Promise.allSettled(TOPICS.map(search));
  let errors=0,fetched=0,recorded=0;
  const unique=new Map();
  for(const task of results){
   if(task.status!=='fulfilled'){errors++;console.warn('Official grants search unavailable',String(task.reason?.message||task.reason).slice(0,90));continue}
   fetched+=task.value.length;
   for(const h of task.value){
    const item=grantsGovCandidate(h);
    if(item&&!unique.has(item.id))unique.set(item.id,item);
   }
  }
  // Bounded: no more than 15 governmental listings per execution.
  for(const item of [...unique.values()].slice(0,15)){
   try{
    const rows=await sql`
      INSERT INTO worldwide_source_listings
        (canonical_url,provider,title,evidence_hash,source_status,
         verified_page_at,last_checked_at,evidence)
      VALUES (
        ${item.canonical_url},${item.provider},${item.title},
        ${'grants-gov-id-'+item.id},'source_confirmed',now(),now(),
        ${JSON.stringify(item.evidence)}::jsonb)
      ON CONFLICT(canonical_url) DO UPDATE SET
        title=EXCLUDED.title,provider=EXCLUDED.provider,
        evidence_hash=EXCLUDED.evidence_hash,source_status='source_confirmed',
        verified_page_at=EXCLUDED.verified_page_at,last_checked_at=now(),
        evidence=EXCLUDED.evidence,updated_at=now()
      RETURNING id
    `;
    recorded+=rows.length;
   }catch(error){
    errors++;
    console.warn('Official grants listing withheld',String(error?.message||error).slice(0,100));
   }
  }
  const status=errors===results.length?'failed':errors?'partial':'completed';
  await sql`UPDATE opportunity_official_feed_runs SET
    completed_at=now(),status=${status},queries_attempted=${TOPICS.length},
    fetched=${fetched},recorded=${recorded},errors=${errors}
    WHERE id=${runId}`;
  return res.status(status==='failed'?503:200).json({
    ok:status!=='failed',status,queried:TOPICS.length,fetched,
    stored_as_source_confirmed:recorded,errors,
    note:'Official U.S. government postings only; no verified personal eligibility or open-status claims.'
  });
 }catch(error){
  console.error('Grants.gov official feed failure',String(error?.message||error).slice(0,130));
  if(sql&&runId)try{
   await sql`UPDATE opportunity_official_feed_runs
     SET completed_at=now(),status='failed',
     error_message=${String(error?.message||error).slice(0,140)}
     WHERE id=${runId}`;
  }catch{}
  return res.status(503).json({ok:false,error:'Official grants feed unavailable'});
 }
}
