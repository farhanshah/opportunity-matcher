import { db } from '../lib/db.js';

import { welcomeMessage } from '../lib/welcome-content.js';

async function reserve(sql,row){
  const [entry]=await sql`
    INSERT INTO account_welcome_emails(auth_user_id,email_address,status)
    VALUES(${row.id},${row.email},'queued')
    ON CONFLICT(auth_user_id) DO NOTHING RETURNING auth_user_id
  `;
  // Claim a queued or retryable delivery. The idempotency key protects
  // against duplicate sends if a function crashes after the provider accepts.
  const [claimed]=await sql`
    UPDATE account_welcome_emails
    SET status='sending',attempts=attempts+1,last_attempt_at=now()
    WHERE auth_user_id=${row.id} AND sent_at IS NULL
      AND attempts<6
      AND (status IN ('queued','failed') OR
        (status='sending' AND last_attempt_at<now()-interval '15 minutes'))
      AND next_attempt_at<=now()
    RETURNING attempts
  `;
  return claimed||null;
}
async function sendWelcome(sql,row,key,from) {
  const delivery=await reserve(sql,row);
  if(!delivery)return 'already_handled';
  const message=welcomeMessage(row.name);
  try{
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      signal:AbortSignal.timeout(12000),
      headers:{
        'Authorization':'Bearer '+key,
        'Content-Type':'application/json',
        'Idempotency-Key':'oppmatcher-welcome-'+row.id
      },
      body:JSON.stringify({
        from,to:[row.email],subject:message.subject,html:message.html
      })
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||!payload.id)throw Error('Mail provider HTTP '+response.status);
    await sql`
      UPDATE account_welcome_emails SET status='sent',sent_at=now(),
        provider_message_id=${String(payload.id)},last_error=NULL
      WHERE auth_user_id=${row.id}
    `;
    return 'sent';
  }catch(error){
    const attempt=delivery.attempts;
    await sql`
      UPDATE account_welcome_emails SET status='failed',
        last_error=${String(error.message||error).slice(0,250)},
        next_attempt_at=now()+ (${Math.min(24,Math.pow(2,attempt))}*interval '1 hour')
      WHERE auth_user_id=${row.id} AND sent_at IS NULL
    `;
    return 'failed';
  }
}
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  if(!process.env.CRON_SECRET ||
     req.headers.authorization!=='Bearer '+process.env.CRON_SECRET)
    return res.status(401).json({error:'Unauthorized'});
  res.setHeader('Cache-Control','no-store');
  const key=process.env.RESEND_API_KEY||'';
  const from=process.env.WELCOME_FROM_EMAIL||'';
  if(!key||!from||!/^.+@oppmatcher\.tech$/i.test(from))
    return res.status(200).json({
      ok:false,configured:false,
      message:'Transactional email is disabled until the verified OppMatcher sender and mail API key are configured.'
    });
  try{
    const sql=db();
    // Unverified addresses must not receive automated account messages.
    const users=await sql`
      SELECT u.id,u.name,u.email
      FROM neon_auth."user" u
      LEFT JOIN account_welcome_emails w ON w.auth_user_id=u.id
      WHERE u."emailVerified"=TRUE
        AND u.banned IS DISTINCT FROM TRUE
        AND u."createdAt">now()-interval '90 days'
        AND (w.auth_user_id IS NULL OR
          (w.status IN ('queued','failed','sending') AND w.sent_at IS NULL
            AND w.attempts<6 AND w.next_attempt_at<=now()))
      ORDER BY u."createdAt" ASC LIMIT 12
    `;
    let sent=0,failed=0,unchanged=0;
    for(const row of users){
      const state=await sendWelcome(sql,row,key,from);
      if(state==='sent')sent++;
      else if(state==='failed')failed++;
      else unchanged++;
    }
    return res.status(200).json({ok:true,configured:true,checked:users.length,sent,failed,unchanged});
  }catch(e){
    console.error('Welcome delivery batch failure',e);
    return res.status(500).json({ok:false,error:'Welcome delivery could not complete'});
  }
}
