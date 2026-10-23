import {db} from '../lib/db.js';
const authorized=req=>Boolean(process.env.CRON_SECRET)&&req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});
 if(!authorized(req))return res.status(401).json({ok:false,error:'Unauthorized'});
 try{
  const sql=db();
  // Restricted to two manually audited programme pages. Never assume that
  // equal navigation, a matching year or an old fingerprint proves a rule.
  const decisions=await sql`
    WITH proven AS (
      SELECT d.id FROM detected_changes d
      JOIN monitored_sources s ON s.id=d.source_id
      JOIN source_snapshots before ON before.id=d.previous_snapshot_id AND before.source_id=s.id
      JOIN source_snapshots after ON after.id=d.current_snapshot_id AND after.source_id=s.id
      WHERE d.status='pending_review'
        AND s.source_key IN ('community_college_initiative_pakistan','fulbright_pakistan')
        AND before.id<>after.id
        AND regexp_count(before.raw_html,'<main([[:space:]>])',1,'i')=1
        AND regexp_count(after.raw_html,'<main([[:space:]>])',1,'i')=1
        AND length(substring(before.raw_html from '(?is)<main[^>]*>(.*?)</main>'))>1000
        AND substring(before.raw_html from '(?is)<main[^>]*>(.*?)</main>') =
            substring(after.raw_html from '(?is)<main[^>]*>(.*?)</main>')
        AND coalesce(before.extraction_payload->'dates','[]'::jsonb) =
            coalesce(after.extraction_payload->'dates','[]'::jsonb)
    )
    UPDATE detected_changes d SET status='resolved_nonmaterial',reviewed_at=now(),
      review_note='Exact equal programme main HTML and matching dates in paired official snapshots. Only page chrome differed. Original evidence retained; no new scholarship cycle, eligibility, deadline or funding verified.'
    FROM proven WHERE d.id=proven.id AND d.status='pending_review'
    RETURNING d.id,d.risk_level
  `;
  return res.status(200).json({ok:true,resolved:decisions.length,
    policy:'Identical substantive programme body and unchanged dates only; original evidence retained'});
 }catch(error){
  console.error('Conservative evidence triage',String(error?.message||error).slice(0,140));
  return res.status(500).json({ok:false,error:'Evidence triage failed safely'});
 }
}
