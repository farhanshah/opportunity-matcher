import {db} from '../lib/db.js';
import {safeSuccessors} from '../lib/official-source-successors.js';
const authorized=req=>Boolean(process.env.CRON_SECRET)&&req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});
 if(!authorized(req))return res.status(401).json({ok:false,error:'Unauthorized'});
 try{
  const sql=db(),definitions=JSON.stringify(safeSuccessors());
  // Stage the alternative under its OWN source ID. Never overwrite existing
  // snapshots or erase blocked history. The regular monitor fetches it later.
  const staged=await sql`
   WITH candidates AS (
    SELECT * FROM jsonb_to_recordset(${definitions}::jsonb)
    AS x(original_key text,successor_key text,provider text,source_url text,
         expected_terms jsonb,external_id text)
   ),valid AS (
    SELECT c.* FROM candidates c
    JOIN monitored_sources original ON original.source_key=c.original_key
    WHERE NOT EXISTS(
      SELECT 1 FROM monitored_sources existing
      WHERE regexp_replace(existing.source_url,'/+$','')=regexp_replace(c.source_url,'/+$','')
    )
   )
   INSERT INTO monitored_sources(source_key,provider,source_url,source_type,check_interval_minutes,expected_terms,is_active)
   SELECT successor_key,provider,source_url,'official_page',1440,expected_terms,true FROM valid
   ON CONFLICT(source_key) DO NOTHING RETURNING source_key
  `;
  // Retire the failing original only AFTER the independent replacement is
  // successfully monitored and its content meets the expected-content guard.
  const retired=await sql`
   WITH candidates AS (
    SELECT * FROM jsonb_to_recordset(${definitions}::jsonb)
    AS x(original_key text,successor_key text,provider text,source_url text,
         expected_terms jsonb,external_id text)
   ),healthy AS (
    SELECT c.original_key,c.successor_key,c.source_url,c.external_id
    FROM candidates c
    JOIN monitored_sources replacement ON replacement.source_key=c.successor_key
    WHERE replacement.is_active=true
      AND replacement.source_url=c.source_url
      AND replacement.last_error IS NULL
      AND replacement.last_http_status IN (200,304)
      AND replacement.last_success_at>=now()-interval '7 days'
      AND EXISTS(SELECT 1 FROM source_snapshots snap
        WHERE snap.source_id=replacement.id AND length(coalesce(snap.extracted_text,''))>=300
          AND snap.fetched_at>=now()-interval '7 days')
   )
   UPDATE monitored_sources old SET is_active=false,source_type='superseded_official_page',updated_at=now()
   FROM healthy h WHERE old.source_key=h.original_key AND old.is_active=true
   AND old.last_error IS NOT NULL AND old.last_http_status IN (403,429,503)
   RETURNING old.source_key,h.source_url,h.external_id
  `;
  // Update the programme's official link only for this specifically mapped
  // programme. This does NOT stamp last_verified_at or open/eligible status.
  let relinked=0;
  for(const row of retired){
   if(!row.external_id)continue;
   const candidates=safeSuccessors();
   const mapped=candidates.find(x=>x.original_key===row.source_key&&x.external_id===row.external_id&&x.source_url===row.source_url);
   if(!mapped)continue;
   const changed=await sql`
     UPDATE opportunities SET official_source_url=${mapped.source_url},updated_at=now()
     WHERE external_id=${mapped.external_id}
       AND official_source_url=(SELECT source_url FROM monitored_sources WHERE source_key=${mapped.original_key})
     RETURNING external_id
   `;
   relinked+=changed.length;
  }
  return res.status(200).json({ok:true,configured:safeSuccessors().length,staged:staged.length,
    retired:retired.map(x=>x.source_key),official_urls_relinked:relinked,
    rule:'Retirement requires a recent successful monitored successor; programme facts never auto-verified'});
 }catch(error){
  console.error('Source successor reconciliation',String(error?.message||error).slice(0,180));
  return res.status(500).json({ok:false,error:'Source reconciliation failed safely'});
 }
}
