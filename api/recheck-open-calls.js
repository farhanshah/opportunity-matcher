import {db} from '../lib/db.js';
import {OFFICIAL_OPEN_CALLS,officialPageSaysOpen} from '../lib/official-open-calls.js';
const authorised=req=>Boolean(process.env.CRON_SECRET)&&req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
async function fetchProvider(url){
 let current=url;
 for(let i=0;i<3;i++){
  const r=await fetch(current,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html','User-Agent':'OppMatcher-Official-Call-Status/1.0'}});
  if([301,302,303,307,308].includes(r.status)){
   const next=new URL(r.headers.get('location')||'',current);
   if(next.protocol!=='https:'||!['www.chevening.org','royalsociety.org','www.royalsociety.org'].includes(next.hostname))throw Error('Provider redirect outside trusted domain');
   current=next.href;continue;
  }
  if(!r.ok)throw Error('Provider HTTP '+r.status);
  if(!/text\/html/i.test(r.headers.get('content-type')||''))throw Error('Provider response not HTML');
  if(Number(r.headers.get('content-length')||0)>2000000)throw Error('Provider response too large');
  return (await r.text()).slice(0,1900000);
 }
 throw Error('Too many provider redirects');
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!authorised(req))return res.status(401).json({ok:false,error:'Unauthorized'});
 try{
  const sql=db();
  let open=0,closed=0,needsRecheck=0;
  const results=[];
  for(const call of OFFICIAL_OPEN_CALLS){
   let status='needs_recheck';
   let reason='Provider response unavailable';
   if(Date.now()>=Date.parse(call.deadline)){status='closed';reason='Published deadline elapsed';}
   else{
    try{
     const html=await fetchProvider(call.url);
     status=officialPageSaysOpen(html,call)?'open':'needs_recheck';
     reason=status==='open'?'Official page confirms open status and deadline':'Official page no longer explicitly confirms open status';
    }catch(err){reason=String(err?.message||err).slice(0,160);}
   }
   await sql`
     UPDATE official_open_calls SET status=${status},
      last_checked_at=now(),
      evidence=evidence||${JSON.stringify({last_check_reason:reason,checked_by:'official_open_calls_cron'})}::jsonb,
      updated_at=now() WHERE slug=${call.slug}
   `;
   if(status==='open')open++;else if(status==='closed')closed++;else needsRecheck++;
   results.push({slug:call.slug,status});
  }
  return res.status(200).json({ok:true,open,closed,needs_recheck:needsRecheck,results});
 }catch(err){
  console.error('Official call update failed',String(err?.message||err).slice(0,130));
  return res.status(503).json({ok:false,error:'Official call verification unavailable'});
 }
}
