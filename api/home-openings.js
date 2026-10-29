import {db} from '../lib/db.js';
import {restrictionFromTitle} from '../lib/public-opportunity-seo.js';
const https=url=>{try{const u=new URL(String(url||''));return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&!/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)}catch{return false}};
const slug=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function publicHomeOpening(row,now=Date.now()){
 const checked=Date.parse(row?.last_verified_at),deadline=Date.parse(row?.deadline_at);
 const id=String(row?.provider_job_id||'');
 if(row?.status!=='open'||row?.status_verified!==true||row?.verification_level!=='exact'||
   !/^\d{3,15}$/.test(id)||!https(row?.source_url)||
   !Number.isFinite(checked)||checked<now-7*86400000||checked>now+300000||
   !Number.isFinite(deadline)||deadline<=now||String(row.title||'').trim().length<8)return null;
 const provider=String(row.provider||'').trim();
 if(!provider)return null;
 return {title:String(row.title).trim(),provider,category:String(row.opportunity_type||'Opportunity'),
   location:String(row.location||'Official posting').slice(0,140),
   deadline:new Date(deadline).toISOString().slice(0,10),
   verified_at:new Date(checked).toISOString(),
   restriction:restrictionFromTitle(row.title)||null,
   detail_url:'/opportunities/'+slug(provider)+'-'+id,
   application_status:'open_from_exact_official_record',eligibility:'provider_restrictions_apply'};
}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=120');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const sql=db();
  const rows=await sql`
   SELECT provider,provider_job_id,title,opportunity_type,location,deadline_at,
     last_verified_at,source_url,status,status_verified,verification_level
   FROM exact_vacancies
   WHERE status='open' AND status_verified=true AND verification_level='exact'
     AND deadline_at>now() AND last_verified_at BETWEEN now()-interval '7 days' AND now()+interval '5 minutes'
   ORDER BY last_verified_at DESC,deadline_at ASC LIMIT 50
  `;
  const listings=rows.map(x=>publicHomeOpening(x)).filter(Boolean).slice(0,6);
  return res.status(200).json({ok:true,count:listings.length,listings,
   meaning:'Current exact official vacancies, without assumptions about personal eligibility',
   checked_at:new Date().toISOString()});
 }catch(e){console.error('Home official openings unavailable',String(e?.message||e).slice(0,140));
  return res.status(503).json({ok:false,error:'Official openings temporarily unavailable'});
 }
}
