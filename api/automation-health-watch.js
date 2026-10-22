import {db} from '../lib/db.js';
const authorised=req=>Boolean(process.env.CRON_SECRET)&&req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
export function healthFindings(x){
 const issues=[];
 if(Number(x.official_discovery)<1)issues.push('Official-source discovery did not complete in the last 24 hours');
 if(Number(x.worldwide_discovery)<1)issues.push('Worldwide search did not complete in the last 24 hours');
 if(Number(x.worldwide_verification)<1)issues.push('Worldwide verification did not complete in the last 24 hours');
 if(Number(x.digest_sent)<1)issues.push('Daily discovery email not recorded as sent in the last 24 hours');
 if(Number(x.due_records)>0&&Number(x.catalogue_rechecks)<1)issues.push('Catalogue verification has due records but no successful check attempt');
 return issues;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!authorised(req))return res.status(401).json({ok:false,error:'Unauthorized'});
 try{
  const sql=db();
  const [stats]=await sql`SELECT
   (SELECT count(*)::int FROM opportunity_discovery_runs WHERE status='completed' AND started_at>now()-interval '24 hours') AS official_discovery,
   (SELECT count(*)::int FROM opportunity_web_search_runs WHERE status='completed' AND started_at>now()-interval '24 hours') AS worldwide_discovery,
   (SELECT count(*)::int FROM opportunity_web_verification_runs WHERE status='completed' AND started_at>now()-interval '24 hours') AS worldwide_verification,
   (SELECT count(*)::int FROM opportunity_daily_digest_delivery WHERE status='sent' AND sent_at>now()-interval '24 hours') AS digest_sent,
   (SELECT count(*)::int FROM opportunities WHERE last_recheck_at>now()-interval '24 hours') AS catalogue_rechecks,
   (SELECT count(*)::int FROM opportunities WHERE last_recheck_at IS NULL) AS due_records`;
  const issues=healthFindings(stats);
  if(!issues.length)return res.status(200).json({ok:true,healthy:true,alerts_sent:0,stats});
  if(!process.env.RESEND_API_KEY||!process.env.DISCOVERY_REPORT_TO_EMAIL||!process.env.WELCOME_FROM_EMAIL)
   return res.status(200).json({ok:false,healthy:false,issues,alert_configured:false});
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const [claim]=await sql`INSERT INTO opportunity_automation_alerts(report_date,status,alert_json)
   VALUES (${day}::date,'sending',${JSON.stringify(issues)}::jsonb)
   ON CONFLICT(report_date) DO NOTHING RETURNING report_date`;
  if(!claim)return res.status(200).json({ok:true,healthy:false,issues,alerts_sent:0,deduplicated:true});
  const message='OppMatcher automatic health warning ('+day+')\\n\\n'+issues.join('\\n')+
    '\\n\\nInspect the private Operations console. This does not mark unverified programmes as verified.';
  let id=null;
  try{
   const result=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),
     headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json',
      'Idempotency-Key':'oppmatcher-automation-alert-'+day},
     body:JSON.stringify({from:'OppMatcher <'+process.env.WELCOME_FROM_EMAIL+'>',
      to:[process.env.DISCOVERY_REPORT_TO_EMAIL],
      subject:'OppMatcher automation health warning · '+day,text:message})});
   const body=await result.json().catch(()=>({}));
   if(!result.ok||!body.id)throw Error('Email provider HTTP '+result.status);
   id=String(body.id);
   await sql`UPDATE opportunity_automation_alerts SET status='sent',sent_at=now(),
     provider_message_id=${id} WHERE report_date=${day}::date`;
   return res.status(200).json({ok:true,healthy:false,issues,alerts_sent:1});
  }catch(err){
   await sql`UPDATE opportunity_automation_alerts SET status='failed',
     error_message=${String(err?.message||err).slice(0,180)} WHERE report_date=${day}::date`;
   return res.status(502).json({ok:false,healthy:false,issues,alerts_sent:0,error:'Health alert email failed'});
  }
 }catch(err){console.error('Health-watch error',String(err?.message||err).slice(0,150));
  return res.status(500).json({ok:false,error:'Private health assessment unavailable'});}
}
