import { db } from '../lib/db.js';
import { sendWelcome } from '../lib/welcome-delivery.js';

const EXPECTED_ORIGIN='https://oppmatcher.tech';
const configured=()=>Boolean(process.env.RESEND_API_KEY) &&
  /^[^@\s]+@oppmatcher\.tech$/i.test(process.env.WELCOME_FROM_EMAIL||'');

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
  if(req.headers.origin!==EXPECTED_ORIGIN)
    return res.status(403).json({ok:false,error:'Invalid request origin'});
  if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type']||'')))
    return res.status(415).json({ok:false,error:'JSON required'});
  const header=String(req.headers.authorization||'');
  const match=/^Bearer ([A-Za-z0-9._~-]{20,4096})$/.exec(header);
  if(!match)return res.status(401).json({ok:false,error:'Sign in required'});
  if(!configured())return res.status(200).json({
    ok:false,configured:false,
    message:'Welcome email is not active until the sender domain is verified.'
  });
  try{
    const sql=db();
    // Never trust an email address or user ID from browser data.
    // Resolve a live Better Auth session token on the server itself.
    const [account]=await sql`
      SELECT u.id,u.name,u.email,u."emailVerified",u.banned
      FROM neon_auth.session s
      JOIN neon_auth."user" u ON u.id=s."userId"
      WHERE s.token=${match[1]} AND s."expiresAt">now()
        AND s."impersonatedBy" IS NULL
        AND u.banned IS DISTINCT FROM TRUE
      LIMIT 1
    `;
    if(!account)return res.status(401).json({ok:false,error:'Session expired. Sign in again'});
    if(!account.emailVerified)
      return res.status(200).json({ok:false,verified:false,
        message:'Email confirmation is needed before the welcome message.'});
    const status=await sendWelcome(sql,account,process.env.RESEND_API_KEY,
      process.env.WELCOME_FROM_EMAIL);
    return res.status(200).json({ok:true,status});
  }catch(e){
    console.error('Welcome sign-in trigger failed',String(e?.message||e).slice(0,160));
    return res.status(500).json({ok:false,error:'Unable to check welcome delivery'});
  }
}
