import { db } from '../lib/db.js';

import { sendWelcome } from '../lib/welcome-delivery.js';

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
      SELECT u.id,u.name,u.email,u."emailVerified",u.banned
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
