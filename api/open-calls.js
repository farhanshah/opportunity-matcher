import {db} from '../lib/db.js';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
 try{
  const sql=db();
  const items=await sql`
   SELECT title,provider,source_url,closing_at,eligible_countries,requirements_note,last_checked_at,coalesce((evidence->>'deadline_time_confirmed')::boolean,false) AS deadline_time_confirmed
   FROM official_open_calls
   WHERE status='open' AND closing_at>now()
     AND last_checked_at>=now()-interval '48 hours'
   ORDER BY closing_at ASC LIMIT 20
  `;
  return res.status(200).json({
   calls:items.map(x=>({
    title:x.title,provider:x.provider,official_url:x.source_url,
    closes_at:x.closing_at,deadline_time_confirmed:x.deadline_time_confirmed,eligible_countries:x.eligible_countries,
    requirements_note:x.requirements_note,provider_checked_at:x.last_checked_at,
    provider_application_status:'open',personal_eligibility:'not_assessed',
    category:'official_open_call'
   })),
   count:items.length,
   meaning:'Official pages explicitly advertised applications as open at the source check. Restrictions apply; this is not an eligibility match.',
   checked_at:new Date().toISOString()
  });
 }catch(err){
  console.error('Open official calls unavailable',String(err?.message||err).slice(0,110));
  return res.status(503).json({error:'Official call bulletin currently unavailable'});
 }
}
