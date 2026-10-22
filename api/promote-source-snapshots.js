import {db} from '../lib/db.js';
import {storeSourceListing} from '../lib/source-listings.js';
const authorised=req=>Boolean(process.env.CRON_SECRET)&&
 req.headers.authorization==='Bearer '+process.env.CRON_SECRET;

// Reuse actual HTTP-200 official snapshots, never search snippets.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!authorised(req))return res.status(401).json({ok:false,error:'Unauthorized'});
 try{
   const sql=db();
   const sources=await sql`
     SELECT m.id,m.provider,m.source_url,s.fetched_at,
       left(s.raw_html,400000) AS html
     FROM monitored_sources m
     JOIN LATERAL (
       SELECT fetched_at,raw_html,http_status
       FROM source_snapshots
       WHERE source_id=m.id
       ORDER BY fetched_at DESC LIMIT 1
     ) s ON true
     WHERE m.is_active=true AND s.http_status=200
       AND s.fetched_at>=now()-interval '72 hours'
       AND s.raw_html IS NOT NULL
     ORDER BY s.fetched_at DESC LIMIT 24
   `;
   let recorded=0,withheld=0,alreadyCurrent=0;
   for(const s of sources){
     try{
       const result=await storeSourceListing(sql,null,s,{
         url:s.source_url,html:s.html,checkedAt:s.fetched_at
       });
       if(result.stored)recorded++;
       else if(result.reason==='Programme already recently fully verified')alreadyCurrent++;
       else withheld++;
     }catch(err){
       withheld++;
       console.warn('Source listing skipped',String(err?.message||err).slice(0,100));
     }
   }
   return res.status(200).json({ok:true,scanned:sources.length,
     recorded,already_fully_verified:alreadyCurrent,withheld,
     claim:'Source confirmed only; application status and eligibility not verified'});
 }catch(error){
   console.error('Snapshot publication unavailable',String(error?.message||error).slice(0,160));
   return res.status(503).json({ok:false,error:'Official snapshot listing pass unavailable'});
 }
}
