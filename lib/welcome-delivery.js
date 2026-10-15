import { welcomeMessage } from './welcome-content.js';

async function claim(sql,row) {
  await sql`
    INSERT INTO account_welcome_emails(auth_user_id,email_address,status)
    VALUES(${row.id},${row.email},'queued')
    ON CONFLICT(auth_user_id) DO NOTHING
  `;
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

export async function sendWelcome(sql,row,key,from) {
  if (!key || !from || !/^[^@\s]+@oppmatcher\.tech$/i.test(from))
    return 'not_configured';
  if (!row?.id || !row?.email || !row?.emailVerified || row?.banned)
    return 'not_verified';
  const delivery=await claim(sql,row);
  if (!delivery) return 'already_handled';
  const message=welcomeMessage(row.name);
  try{
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',signal:AbortSignal.timeout(12000),
      headers:{
        Authorization:'Bearer '+key,
        'Content-Type':'application/json',
        'Idempotency-Key':'oppmatcher-welcome-'+row.id
      },
      body:JSON.stringify({
        from,to:[row.email],subject:message.subject,html:message.html
      })
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok || !payload.id) throw Error('Mail provider HTTP '+response.status);
    await sql`
      UPDATE account_welcome_emails
      SET status='sent',sent_at=now(),provider_message_id=${String(payload.id)},
          last_error=NULL
      WHERE auth_user_id=${row.id} AND sent_at IS NULL
    `;
    return 'sent';
  }catch(e){
    const backoff=Math.min(24,2**delivery.attempts);
    await sql`
      UPDATE account_welcome_emails
      SET status='failed',last_error=${String(e.message||e).slice(0,250)},
        next_attempt_at=now()+(${backoff}*interval '1 hour')
      WHERE auth_user_id=${row.id} AND sent_at IS NULL
    `;
    return 'failed';
  }
}
