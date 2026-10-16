import { db } from '../lib/db.js';
import {
  ORIGIN, configured, freshToken, digest, bearerToken, getAccountBySession,
  authorizationUrl, setConnectCookie, sendJson
} from '../lib/linkedin-oidc.js';

export default async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='POST')
    return sendJson(res,405,{ok:false,error:'Method not allowed'});
  res.setHeader('Vary','Origin');
  if(req.method==='POST' && req.headers.origin!==ORIGIN)
    return sendJson(res,403,{ok:false,error:'Invalid origin'});
  const token=bearerToken(req);
  if(!token)return sendJson(res,401,{ok:false,error:'Sign in to OppMatcher first'});
  try{
    const sql=db();
    const account=await getAccountBySession(sql,token);
    if(!account)return sendJson(res,401,{ok:false,error:'Your session expired. Sign in again.'});
    if(req.method==='GET'){
      const rows=await sql`SELECT linked_at FROM public.linkedin_connected_accounts WHERE auth_user_id=${account.id} LIMIT 1`;
      return sendJson(res,200,{ok:true,configured:configured(),linked:rows.length>0});
    }
    if(req.body?.action==='disconnect'){
      await sql`DELETE FROM public.linkedin_connected_accounts WHERE auth_user_id=${account.id}`;
      return sendJson(res,200,{ok:true,linked:false});
    }
    if(req.body?.action!=='connect')
      return sendJson(res,400,{ok:false,error:'Invalid action'});
    if(!configured())return sendJson(res,503,{ok:false,error:'LinkedIn connection is not configured yet'});
    if(!account.verified)return sendJson(res,403,{ok:false,error:'Verify your OppMatcher email first'});
    const existing=await sql`SELECT 1 FROM public.linkedin_connected_accounts WHERE auth_user_id=${account.id} LIMIT 1`;
    if(existing.length)return sendJson(res,409,{ok:false,error:'LinkedIn is already connected'});
    // Limit unfinished attempts and keep no raw OAuth credentials in the database.
    const recent=await sql`
      SELECT count(*)::integer AS n FROM public.linkedin_oauth_pending
      WHERE auth_user_id=${account.id} AND expires_at>now()
    `;
    if(Number(recent[0]?.n||0)>=3)
      return sendJson(res,429,{ok:false,error:'Too many connection attempts. Try again in ten minutes.'});
    const state=freshToken(),cookie=freshToken(),nonce=freshToken();
    await sql`
      INSERT INTO public.linkedin_oauth_pending
        (state_hash,cookie_hash,nonce,auth_user_id,expires_at)
      VALUES (${digest(state)},${digest(cookie)},${nonce},${account.id},now()+interval '10 minutes')
    `;
    setConnectCookie(res,cookie);
    return sendJson(res,200,{ok:true,url:authorizationUrl(state,nonce)});
  }catch(e){
    console.error('LinkedIn connection request failed',String(e?.message||e).slice(0,190));
    return sendJson(res,500,{ok:false,error:'LinkedIn connection is temporarily unavailable'});
  }
}
