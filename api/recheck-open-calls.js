import {db} from '../lib/db.js';
import {OFFICIAL_OPEN_CALLS,officialPageSaysOpen,officialMopgaPortalSaysOpen} from '../lib/official-open-calls.js';
const authorised=req=>Boolean(process.env.CRON_SECRET)&&req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
async function fetchProvider(url){
 let current=url;
 for(let i=0;i<3;i++){
  const r=await fetch(current,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html','User-Agent':'OppMatcher-Official-Call-Status/1.0'}});
  if([301,302,303,307,308].includes(r.status)){
   const next=new URL(r.headers.get('location')||'',current);
   if(next.protocol!=='https:'||!['www.chevening.org','royalsociety.org','www.royalsociety.org','www.campusfrance.org','campusfrance.smapply.io'].includes(next.hostname))throw Error('Provider redirect outside trusted domain');
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
   let transportUnavailable=false,providerExplicitlyClosed=false,confirmationRoute='';
   if(Date.now()>=Date.parse(call.deadline)){status='closed';reason='Published deadline elapsed';}
   else{
    try{
     const html=await fetchProvider(call.url);
     status=officialPageSaysOpen(html,call)?'open':'needs_recheck';
     providerExplicitlyClosed=/(?:applications? (?:are|is) closed|call for applications is closed|status:\s*closed|no longer accepting applications)/i.test(html.replace(/<[^>]+>/g,' '));
     if(status==='open')confirmationRoute='official_programme_page';
     reason=status==='open'?'Official page confirms open status and deadline':'Official page does not clearly confirm status';
    }catch(err){
     transportUnavailable=true;
     reason='Official page temporarily unavailable: '+String(err?.message||err).slice(0,100);
    }
    if(call.slug==='campus-france-mopga-2027'&&status!=='open'&&!providerExplicitlyClosed){
     try{
      const portalHtml=await fetchProvider(call.portal_url);
      if(officialMopgaPortalSaysOpen(portalHtml,call)){
       status='open';confirmationRoute='official_campus_france_application_portal';
       transportUnavailable=false;
       reason='Official Campus France application portal confirms exact opening and deadline';
      }else{
       status='needs_recheck';transportUnavailable=false;
       reason='Official Campus France portal no longer confirms current application';
      }
     }catch(err){
      transportUnavailable=true;
      reason+='; official portal unavailable: '+String(err?.message||err).slice(0,65);
     }
    }
   }
   const evidence=JSON.stringify({last_check_reason:reason,
     checked_by:'official_open_calls_cron',deadline_time_confirmed:call.slug==='campus-france-mopga-2027',
     personal_eligibility:'not_assessed',confirmation_route:confirmationRoute,
     last_attempted_at:new Date().toISOString()});
   if(status==='open'){
     // Newly identified, specifically reviewed official calls are inserted
     // only after a fresh HTTP 200 provider page confirms status and deadline.
     // No search snippet, archived notice or unreviewed source is published.
     const provider=call.provider||(call.url.includes('chevening.org')?'Chevening':'Royal Society');
     await sql`
       INSERT INTO official_open_calls(slug,title,provider,source_url,status,closing_at,
         eligible_countries,requirements_note,last_checked_at,evidence)
       VALUES(${call.slug},${call.title},${provider},${call.url},'open',
         ${call.deadline}::timestamptz,${JSON.stringify(call.countries)}::jsonb,
         ${call.requirement},now(),${evidence}::jsonb)
       ON CONFLICT(slug) DO UPDATE SET status='open',last_checked_at=now(),
         closing_at=EXCLUDED.closing_at, requirements_note=EXCLUDED.requirements_note,
         evidence=official_open_calls.evidence||EXCLUDED.evidence,
         updated_at=now()
     `;
   }else if(transportUnavailable&&status!=='closed'){
     // A fetch error does not prove that applications closed. Preserve
     // the previous successful check timestamp; the public 48h TTL still
     // hides calls whose official evidence becomes stale.
     await sql`
       UPDATE official_open_calls SET evidence=evidence||${evidence}::jsonb,updated_at=now()
       WHERE slug=${call.slug}
     `;
     const previous=await sql`
       SELECT status,last_checked_at FROM official_open_calls WHERE slug=${call.slug}
     `;
     status=previous[0]?.status==='open' &&
       Date.parse(previous[0]?.last_checked_at||'')>=Date.now()-48*3600000
       ?'open_cached':'needs_recheck';
   }else{
     await sql`
       UPDATE official_open_calls SET status=${status},last_checked_at=now(),
         evidence=evidence||${evidence}::jsonb,updated_at=now()
       WHERE slug=${call.slug}
     `;
   }
   if(status==='open'||status==='open_cached')open++;else if(status==='closed')closed++;else needsRecheck++;
   results.push({slug:call.slug,status,confirmation_route:confirmationRoute});
  }
  return res.status(200).json({ok:true,open,closed,needs_recheck:needsRecheck,results});
 }catch(err){
  console.error('Official call update failed',String(err?.message||err).slice(0,130));
  return res.status(503).json({ok:false,error:'Official call verification unavailable'});
 }
}
