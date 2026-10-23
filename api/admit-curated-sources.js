import {db} from '../lib/db.js';
import {validatedCuratedProviders} from '../lib/curated-provider-sources.js';
const authorised=req=>Boolean(process.env.CRON_SECRET)&&req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!authorised(req))return res.status(401).json({ok:false,error:'Unauthorized'});
 try{
  const sql=db();
  const entries=validatedCuratedProviders();
  // These are hand-picked exact provider pages, not web-search leads.
  // Defer eligibility, status and deadlines to strict downstream verification.
  const rows=await sql`
    WITH candidates AS (
      SELECT source_key,provider,source_url FROM jsonb_to_recordset(${JSON.stringify(entries)}::jsonb)
      AS s(source_key text,provider text,source_url text)
    )
    INSERT INTO monitored_sources
      (source_key,provider,source_url,source_type,check_interval_minutes,expected_terms,is_active)
    SELECT c.source_key,c.provider,c.source_url,'official_page',1440,'[]'::jsonb,true
    FROM candidates c
    WHERE NOT EXISTS (
      SELECT 1 FROM monitored_sources m
      WHERE regexp_replace(m.source_url,'/+$','')=regexp_replace(c.source_url,'/+$','')
    )
    ON CONFLICT (source_key) DO NOTHING
    RETURNING source_key
  `;
  return res.status(200).json({ok:true,curated:entries.length,admitted:rows.length,
    policy:'Official publisher pages only; no open status or personal match inferred'});
 }catch(error){
  console.error('Curated source admission unavailable',String(error?.message||error).slice(0,180));
  return res.status(500).json({ok:false,error:'Curated source admission failed safely'});
 }
}
