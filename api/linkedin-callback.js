import { db } from '../lib/db.js';
import { configured, digest, readCookie, constantTimeEqual,
  exchangeCode, verifyIdToken, redirectHome } from '../lib/linkedin-oidc.js';

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).end();
  }
  const state=String(req.query?.state||'');
  const cookie=readCookie(req);
  const code=String(req.query?.code||'');
  // Refuse unauthenticated callbacks before any OAuth token exchange.
  if(!configured() || !/^[a-zA-Z0-9_-]{30,150}$/.test(state) ||
     !/^[a-zA-Z0-9_-]{30,150}$/.test(cookie))
    return redirectHome(res,'invalid');
  try{
    const sql=db();
    const rows=await sql`
      DELETE FROM public.linkedin_oauth_pending
      WHERE state_hash=${digest(state)} AND expires_at>now()
      RETURNING cookie_hash,nonce,auth_user_id
    `;
    if(!rows.length || !constantTimeEqual(rows[0].cookie_hash,digest(cookie)))
      return redirectHome(res,'expired');
    if(req.query?.error){
      return redirectHome(res,'cancelled');
    }
    if(!/^[a-zA-Z0-9._~-]{5,2048}$/.test(code))
      return redirectHome(res,'invalid');
    const idToken=await exchangeCode(code);
    const identity=await verifyIdToken(idToken,rows[0].nonce);
    // Never merge by email; only the linked provider's signed subject may identify a connection.
    const matches=await sql`
      SELECT auth_user_id,provider_subject FROM public.linkedin_connected_accounts
      WHERE auth_user_id=${rows[0].auth_user_id}
         OR provider_subject=${identity.subject}
    `;
    if(matches.some(x=>String(x.auth_user_id)!==String(rows[0].auth_user_id)))
      return redirectHome(res,'already-used');
    if(matches.some(x=>String(x.auth_user_id)===String(rows[0].auth_user_id)
                       && x.provider_subject!==identity.subject))
      return redirectHome(res,'already-linked');
    if(!matches.length){
      const created=await sql`
        INSERT INTO public.linkedin_connected_accounts (auth_user_id,provider_subject)
        VALUES (${rows[0].auth_user_id},${identity.subject})
        ON CONFLICT DO NOTHING
        RETURNING provider_subject
      `;
      if(!created.length)return redirectHome(res,'already-used');
    }
    return redirectHome(res,'connected');
  }catch(e){
    console.error('LinkedIn connection callback unsuccessful',String(e?.message||e).slice(0,180));
    return redirectHome(res,'unavailable');
  }
}
