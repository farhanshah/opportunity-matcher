import {db} from '../lib/db.js';
// Public, curated provider monitoring summary. Never expose applicant or monitor error details.
const SOURCES=Object.freeze({
 chevening:['chevening_timeline'],
 worldbank:['jj_wbgsp','world_bank_pioneers','world_bank_ypp'],
 erasmus:['erasmus_mundus','new_erasmus_traineeships'],
 oxford:['clarendon','reach_oxford','weidenfeld','catalogue_sch-007'],
 rhodes:['rhodes_main'],
 rotary:['rotary_peace','successor_rotary_current_official_page','successor_rotary_fellowships'],
 swedish:['si_global_professionals','catalogue_sch-012'],
 daad:['daad_scholarships','daad_epos']
});
export function summarizeSourceHealth(rows,now=new Date()){
 const output={};
 for(const [key,keys] of Object.entries(SOURCES)){
  const matches=(rows||[]).filter(row=>keys.includes(row.source_key)&&row.is_active);
  const newest=field=>matches.map(r=>r[field]).filter(Boolean).map(v=>new Date(v).getTime())
    .filter(Number.isFinite).sort((a,b)=>b-a)[0]||null;
  const sevenDays=now.getTime()-7*86400000;
  const success=matches.filter(r=>r.last_success_at&&new Date(r.last_success_at).getTime()>=sevenDays);
  const problems=matches.some(r=>r.has_error===true||Number(r.last_http_status)>=400);
  const recent=newest('last_success_at');
  output[key]={
   monitored_pages:matches.length,
   successful_pages_7d:success.length,
   last_success_at:recent?new Date(recent).toISOString():null,
   status:matches.length===0?'not_registered':
     problems?'attention_needed':success.length?'monitored':'awaiting_success'
  };
 }
 return output;
}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 try{
  const sql=db();
  const rows=await sql`SELECT source_key,is_active,last_checked_at,last_success_at,
    (last_error IS NOT NULL) AS has_error,last_http_status
    FROM monitored_sources
    WHERE source_key IN (
      'chevening_timeline','jj_wbgsp','world_bank_pioneers','world_bank_ypp',
      'erasmus_mundus','new_erasmus_traineeships',
      'clarendon','reach_oxford','weidenfeld','catalogue_sch-007',
      'rhodes_main','rotary_peace','successor_rotary_current_official_page',
      'successor_rotary_fellowships','si_global_professionals','catalogue_sch-012',
      'daad_scholarships','daad_epos')`;
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=300');
  return res.status(200).json({ok:true,sources:summarizeSourceHealth(rows),
    note:'Official-page monitoring is not evidence of current applications, funding or individual eligibility.'});
 }catch(error){
  console.error('Public source summaries temporarily unavailable',String(error?.message||error).slice(0,90));
  return res.status(503).json({ok:false,error:'Source monitoring details temporarily unavailable'});
 }
}