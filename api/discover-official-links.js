import {db} from '../lib/db.js';
import {findOfficialLinks,canonicalUrl} from '../lib/auto-discovery.js';
import {trustedSourceForLead} from '../lib/world-verification.js';
const authorised=req=>Boolean(process.env.CRON_SECRET)&&req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
// Mine recent successful HTML snapshots of approved official providers.
// No speculative host admission and no direct publication from HTML links.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!authorised(req))return res.status(401).json({ok:false,error:'Unauthorized'});
 let sql,runId=null;
 try{
  sql=db();
  const [run]=await sql`INSERT INTO opportunity_official_feed_runs(provider,status)
    VALUES('official_provider_links','running') RETURNING id`;
  runId=run.id;
  // Rotate official sources twice daily, so one large institution cannot
  // starve other regions and providers of inspection slots.
  const pages=await sql`
   SELECT m.id,m.provider,m.source_url,s.raw_html,m.last_success_at AS checked_at
   FROM monitored_sources m
   JOIN LATERAL(
     SELECT raw_html,fetched_at,http_status
     FROM source_snapshots WHERE source_id=m.id
     ORDER BY fetched_at DESC LIMIT 1
   ) s ON true
   WHERE m.is_active=true AND s.http_status=200
     AND m.last_error IS NULL AND m.last_http_status IN (200,304)
     AND m.last_success_at>=now()-interval '7 days'
     AND s.raw_html IS NOT NULL
   ORDER BY md5(m.source_key || to_char(now() AT TIME ZONE 'UTC','YYYYMMDDHH24'))
   LIMIT 40
  `;
  const sources=await sql`SELECT id,provider,source_url,is_active
    FROM monitored_sources WHERE is_active=true`;
  const leadMap=new Map();
  for(const page of pages){
   const links=findOfficialLinks(page.raw_html,page.source_url,8).slice(0,5);
   for(const link of links){
    const trust=trustedSourceForLead({canonical_url:link.url,title:link.title},sources);
    if(trust.status!=='trusted')continue;
    const canonical=canonicalUrl(link.url);
    if(!canonical||leadMap.has(canonical))continue;
    leadMap.set(canonical,{canonical_url:canonical,title:link.title,
      search_query:'internal:official-snapshot-links',
      search_region:'Official provider',
      snippet:'Programme link found on a monitored official provider page',
      source_provider:trust.source.provider,matched_official_host:true});
    if(leadMap.size>=160)break;
   }
   if(leadMap.size>=160)break;
  }
  const leads=[...leadMap.values()];
  let newLeads=0;
  if(leads.length){
   const rows=await sql`
     INSERT INTO opportunity_web_leads(
       canonical_url,title,snippet,search_query,search_region,
       source_provider,matched_official_host,review_status,verification_status)
     SELECT r.canonical_url,r.title,r.snippet,r.search_query,r.search_region,
       r.source_provider,true,'unverified','pending'
     FROM jsonb_to_recordset(${JSON.stringify(leads)}::jsonb) AS r(
       canonical_url text,title text,snippet text,search_query text,
       search_region text,source_provider text,matched_official_host boolean)
     ON CONFLICT(canonical_url) DO UPDATE SET
       last_seen_at=now(),
       matched_official_host=true,
       verification_status=CASE
         WHEN opportunity_web_leads.verification_status='source_review'
          AND opportunity_web_leads.verification_reason='Provider hostname is not in the official-source registry'
         THEN 'pending' ELSE opportunity_web_leads.verification_status END,
       verification_reason=CASE
         WHEN opportunity_web_leads.verification_status='source_review'
          AND opportunity_web_leads.verification_reason='Provider hostname is not in the official-source registry'
         THEN NULL ELSE opportunity_web_leads.verification_reason END
     RETURNING (xmax=0) AS is_new
   `;
   newLeads=rows.filter(row=>row.is_new).length;
  }
  await sql`UPDATE opportunity_official_feed_runs
    SET completed_at=now(),status='completed',queries_attempted=${pages.length},
      fetched=${leads.length},recorded=${newLeads},errors=0 WHERE id=${runId}`;
  return res.status(200).json({ok:true,official_pages_scanned:pages.length,
     programme_links_found:leads.length,new_official_leads:newLeads,
     verified_and_published_here:0,
     note:'Leads await current programme-specific evidence verification'});
 }catch(e){
  if(sql&&runId)try{
   await sql`UPDATE opportunity_official_feed_runs SET completed_at=now(),
     status='failed',error_message=${String(e?.message||e).slice(0,140)},
     errors=1 WHERE id=${runId}`
  }catch{}
  console.error('Official link discovery unavailable',String(e?.message||e).slice(0,145));
  return res.status(503).json({ok:false,error:'Official provider link discovery unavailable'});
 }
}
