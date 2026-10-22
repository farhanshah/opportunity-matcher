import {db} from '../lib/db.js';
import {grantSearchKeyword,validGrantLead,officialGrantPost} from '../lib/grantsgov-feed.js';
const API='https://api.grants.gov/v1/api/';
const validSecret=req=>Boolean(process.env.CRON_SECRET)&&req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!validSecret(req))return res.status(401).json({ok:false,error:'Unauthorized'});
 let queryCount=0,inspected=0,recorded=0,withheld=0;
 try{
  const sql=db();const keyword=grantSearchKeyword();
  const result=await officialGrantPost(API+'search2',{
   rows:18,keyword,oppNum:'',eligibilities:'',agencies:'',oppStatuses:'posted',aln:'',fundingCategories:''
  });
  queryCount=1;
  const hits=Array.isArray(result.oppHits)?result.oppHits:[];
  // A relevant keyword is not proof of student eligibility.
  const relevant=hits.filter(hit=>
    /\b(?:fellowships?|scholarships?|internships?|studentships?|research training)\b/i.test(String(hit?.title||''))&&
    String(hit?.oppStatus||'').toLowerCase()==='posted'
  ).slice(0,5);
  for(const hit of relevant){
   inspected++;
   try{
    const detail=await officialGrantPost(API+'fetchOpportunity',{opportunityId:Number(hit.id)});
    const lead=validGrantLead({...hit,search_keyword:keyword},detail);
    if(!lead){withheld++;continue}
    const [stored]=await sql`
      INSERT INTO worldwide_source_listings(
       canonical_url,provider,title,evidence_hash,source_status,
       verified_page_at,last_checked_at,evidence)
      VALUES(
       ${lead.url},${'Grants.gov · '+lead.agency},${lead.title},${lead.hash},
       'source_confirmed',now(),now(),${JSON.stringify(lead.evidence)}::jsonb)
      ON CONFLICT(canonical_url) DO UPDATE SET
       title=EXCLUDED.title,provider=EXCLUDED.provider,
       evidence_hash=EXCLUDED.evidence_hash,source_status='source_confirmed',
       verified_page_at=now(),last_checked_at=now(),evidence=EXCLUDED.evidence,
       updated_at=now()
      WHERE worldwide_source_listings.evidence_hash IS DISTINCT FROM EXCLUDED.evidence_hash
        OR worldwide_source_listings.source_status<>'source_confirmed'
      RETURNING id
    `;
    if(stored)recorded++;
   }catch(e){
     withheld++;
     console.warn('Official grant detail deferred',String(e?.message||e).slice(0,110));
   }
  }
  return res.status(200).json({ok:true,source:'Grants.gov',
   keyword,search_requests:queryCount,details_checked:inspected,
   added_or_updated:recorded,withheld,
   claim:'Source-confirmed federal notices only. Personal eligibility not verified.'});
 }catch(e){
  console.error('Official grant feed unavailable',String(e?.message||e).slice(0,130));
  return res.status(503).json({ok:false,error:'Official federal grant feed unavailable',
    search_requests:queryCount});
 }
}
