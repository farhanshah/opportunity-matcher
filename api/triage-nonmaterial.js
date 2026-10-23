import {db} from '../lib/db.js';
const authorized=req=>Boolean(process.env.CRON_SECRET)&&req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});
 if(!authorized(req))return res.status(401).json({ok:false,error:'Unauthorized'});
 try{
  const sql=db();
  // Only an exact same substantive <main> document with matching extracted
  // material fields is safe. Navigation/footer-only differences are ignored.
  // Changed funding, eligibility, deadlines or applications stay pending.
  // Keep each snapshot, alert, fingerprint, and review note for audit.
  const decisions=await sql`
    WITH proven AS (
      SELECT d.id FROM detected_changes d
      JOIN monitored_sources s ON s.id=d.source_id
      JOIN source_snapshots before ON before.id=d.previous_snapshot_id AND before.source_id=s.id
      JOIN source_snapshots after ON after.id=d.current_snapshot_id AND after.source_id=s.id
      WHERE d.status='pending_review'
        AND before.id<>after.id
        AND before.http_status BETWEEN 200 AND 299
        AND after.http_status BETWEEN 200 AND 299
        AND regexp_count(before.raw_html,'<main([[:space:]>])',1,'i')=1
        AND regexp_count(after.raw_html,'<main([[:space:]>])',1,'i')=1
        AND length(substring(before.raw_html from '(?is)<main[^>]*>(.*?)</main>'))>1000
        AND substring(before.raw_html from '(?is)<main[^>]*>(.*?)</main>') =
            substring(after.raw_html from '(?is)<main[^>]*>(.*?)</main>')
        AND coalesce(before.extraction_payload->'dates','[]'::jsonb) =
            coalesce(after.extraction_payload->'dates','[]'::jsonb)
        AND coalesce(before.extraction_payload->'funding','null'::jsonb) =
            coalesce(after.extraction_payload->'funding','null'::jsonb)
        AND coalesce(before.extraction_payload->'eligibility','null'::jsonb) =
            coalesce(after.extraction_payload->'eligibility','null'::jsonb)
        AND coalesce(before.extraction_payload->'application','null'::jsonb) =
            coalesce(after.extraction_payload->'application','null'::jsonb)
      ORDER BY d.detected_at ASC
      LIMIT 150
    )
    UPDATE detected_changes d SET status='resolved_nonmaterial',reviewed_at=now(),
      review_note='Automatic evidence triage: paired successful official snapshots have exactly equal substantive MAIN content (>1000 chars), identical dates, funding, eligibility and application extraction. Site chrome changed only. Snapshots retained. No programme freshness or eligibility verified.'
    FROM proven WHERE d.id=proven.id AND d.status='pending_review'
    RETURNING d.id,d.risk_level
  `;
  return res.status(200).json({ok:true,resolved:decisions.length,
    high_risk_cleared:decisions.filter(x=>x.risk_level==='high').length,
    policy:'Strict equal programme body and material facts only. Uncertain changes remain pending.'});
 }catch(error){
  console.error('Conservative evidence triage',String(error?.message||error).slice(0,140));
  return res.status(500).json({ok:false,error:'Evidence triage failed safely'});
 }
}
