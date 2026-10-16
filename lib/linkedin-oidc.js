import { createHash, createPublicKey, randomBytes, timingSafeEqual, verify as verifySignature } from 'node:crypto';

export const ORIGIN='https://oppmatcher.tech';
export const CALLBACK_URL=ORIGIN+'/api/linkedin-callback';
export const COOKIE_NAME='__Host-opp_li_connect';

export function configured(){
  return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
}

export function freshToken(){return randomBytes(32).toString('base64url');}
export function digest(value){return createHash('sha256').update(String(value)).digest('hex');}
export function constantTimeEqual(a,b){
  const x=Buffer.from(String(a)),y=Buffer.from(String(b));
  return x.length===y.length && timingSafeEqual(x,y);
}
export function readCookie(req,name=COOKIE_NAME){
  const cookie=String(req.headers.cookie||'');
  for(const pair of cookie.split(';')){
    const pos=pair.indexOf('=');
    if(pos<0)continue;
    if(pair.slice(0,pos).trim()===name)return pair.slice(pos+1).trim();
  }
  return '';
}
export function setConnectCookie(res,token){
  res.setHeader('Set-Cookie',COOKIE_NAME+'='+token+'; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax');
}
export function clearConnectCookie(res){
  res.setHeader('Set-Cookie',COOKIE_NAME+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
}
export function redirectHome(res,status){
  clearConnectCookie(res);
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  res.writeHead(302,{Location:ORIGIN+'/discover?linkedin_connect='+encodeURIComponent(status)});
  res.end();
}
export function sendJson(res,status,payload){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  return res.status(status).json(payload);
}
export function bearerToken(req){
  const match=/^Bearer ([A-Za-z0-9._~-]{20,4096})$/.exec(String(req.headers.authorization||''));
  return match?.[1]||null;
}
// Neon Auth's browser SDK uses short-lived signed JWTs for Data API calls.
// Its signed JWT is not the opaque session.token stored in neon_auth.session.
const NEON_AUTH_BASE='https://ep-empty-fog-aw7p1xu9.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const NEON_JWKS_URL=NEON_AUTH_BASE+'/.well-known/jwks.json';
// Managed Neon Auth signs JWTs using the provider origin, without the database/auth path.
const NEON_AUTH_ISSUER=new URL(NEON_AUTH_BASE).origin;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let keysCache=null,keysExpiry=0;
function decodePart(part){
  if(typeof part!=='string'||part.length<1||part.length>10000||!/^[a-zA-Z0-9_-]+$/.test(part))
    throw new Error('Malformed Neon identity token');
  return Buffer.from(part,'base64url');
}
async function getNeonSigningKeys(){
  if(keysCache && Date.now()<keysExpiry)return keysCache;
  const response=await fetch(NEON_JWKS_URL,{redirect:'error',signal:AbortSignal.timeout(7500),headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Neon Auth signing keys unavailable');
  const data=await response.json();
  if(!Array.isArray(data.keys)||data.keys.length>30)throw new Error('Neon Auth signing keys invalid');
  keysCache=data.keys;keysExpiry=Date.now()+120000;
  return keysCache;
}
export async function verifyNeonJwt(token){
  if(typeof token!=='string'||token.length>9000)return null;
  const parts=token.split('.');
  if(parts.length!==3)return null;
  const header=JSON.parse(decodePart(parts[0]).toString('utf8'));
  const claims=JSON.parse(decodePart(parts[1]).toString('utf8'));
  const alg=header?.alg;
  if(!['EdDSA','ES256','RS256'].includes(alg)||typeof header.kid!=='string')
    throw new Error('Invalid Neon token signing method');
  const keys=await getNeonSigningKeys();
  const jwk=keys.find(k=>k.kid===header.kid &&
    (!k.alg||k.alg===alg) &&
    ((alg==='EdDSA'&&k.kty==='OKP'&&k.crv==='Ed25519')||
     (alg==='ES256'&&k.kty==='EC'&&k.crv==='P-256')||
     (alg==='RS256'&&k.kty==='RSA')));
  if(!jwk)throw new Error('Neon token signing key not found');
  const key=createPublicKey({format:'jwk',key:jwk});
  const signature=decodePart(parts[2]);
  const signed=Buffer.from(parts[0]+'.'+parts[1]);
  const verified=alg==='EdDSA'
    ?verifySignature(null,signed,key,signature)
    :alg==='ES256'
      ?verifySignature('sha256',signed,{key,dsaEncoding:'ieee-p1363'},signature)
      :verifySignature('RSA-SHA256',signed,key,signature);
  if(!verified)throw new Error('Neon token signature invalid');
  const now=Math.floor(Date.now()/1000);
  // Neon Auth's managed JWT can omit aud; when present it must target this Neon Auth instance.
  // In every case pin to the verified issuer, JWKS signing key, role and database session.
  const allowedAudiences=[NEON_AUTH_ISSUER,NEON_AUTH_BASE,NEON_AUTH_BASE+'/'];
  const audienceValid=claims.aud==null ||
    (typeof claims.aud==='string'&&allowedAudiences.includes(claims.aud)) ||
    (Array.isArray(claims.aud)&&claims.aud.some(a=>typeof a==='string'&&allowedAudiences.includes(a)));
  if(![NEON_AUTH_ISSUER,NEON_AUTH_BASE,NEON_AUTH_BASE+'/'].includes(claims.iss) ||
    !audienceValid ||
    claims.role!=='authenticated' || !UUID.test(claims.sub||'') ||
    !Number.isFinite(claims.exp)||claims.exp<=now ||
    !Number.isFinite(claims.iat)||claims.iat>now+60 ||
    claims.exp-claims.iat>3600 ||
    (claims.nbf!=null&&(!Number.isFinite(claims.nbf)||claims.nbf>now+60)))
    throw new Error('Neon token claims invalid');
  return {userId:claims.sub,sessionId:UUID.test(claims.sid||'')?claims.sid:null};
}
export async function getAccountBySession(sql,token){
  if(!token)return null;
  if(token.split('.').length===3){
    // Accept only a JWT verified against this specific Neon Auth instance.
    const identity=await verifyNeonJwt(token);
    if(!identity)return null;
    const rows=await sql`
      SELECT u.id,u."emailVerified" AS verified,u.banned,s.id AS auth_session_id
      FROM neon_auth."user" u
      JOIN neon_auth.session s ON s."userId"=u.id
      WHERE u.id=${identity.userId}
        AND (${identity.sessionId}::uuid IS NULL OR s.id=${identity.sessionId}::uuid)
        AND s."expiresAt">now()
        AND s."impersonatedBy" IS NULL
        AND u.banned IS DISTINCT FROM TRUE
      ORDER BY s."updatedAt" DESC LIMIT 1
    `;
    return rows[0]||null;
  }
  const rows=await sql`
    SELECT u.id,u."emailVerified" AS verified,u.banned,s.id AS auth_session_id
      FROM neon_auth.session s
      JOIN neon_auth."user" u ON u.id=s."userId"
     WHERE s.token=${token}
       AND s."expiresAt">now()
       AND s."impersonatedBy" IS NULL
       AND u.banned IS DISTINCT FROM TRUE
     LIMIT 1
  `;
  return rows[0]||null;
}
export function authorizationUrl(state){
  const u=new URL('https://www.linkedin.com/oauth/v2/authorization');
  u.searchParams.set('response_type','code');
  u.searchParams.set('client_id',process.env.LINKEDIN_CLIENT_ID);
  u.searchParams.set('redirect_uri',CALLBACK_URL);
  u.searchParams.set('scope','openid profile email');
  u.searchParams.set('state',state);
  // Authorization-code flow uses the one-time state, HttpOnly cookie, and server-held client secret.
  // LinkedIn's documented ID token claims do not guarantee nonce support.
  return u.href;
}
async function fetchJson(url,options={}){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(8500),redirect:'error'});
  const data=await response.json().catch(()=>null);
  if(!response.ok || !data)throw new Error('Identity provider request unsuccessful');
  return data;
}
export async function exchangeCode(code){
  const body=new URLSearchParams({
    grant_type:'authorization_code',code,redirect_uri:CALLBACK_URL,
    client_id:process.env.LINKEDIN_CLIENT_ID,
    client_secret:process.env.LINKEDIN_CLIENT_SECRET
  });
  const response=await fetchJson('https://www.linkedin.com/oauth/v2/accessToken',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
    body:body.toString()
  });
  if(typeof response.id_token!=='string')throw new Error('LinkedIn did not return an OIDC ID token');
  return response.id_token;
}
function decodeBase64Url(s){
  if(!/^[a-zA-Z0-9_-]+$/.test(s)||s.length>9000)throw new Error('Malformed identity token');
  return Buffer.from(s,'base64url');
}
export async function verifyIdToken(jwt){
  if(typeof jwt!=='string'||jwt.length>12000)throw new Error('Identity token missing');
  const parts=jwt.split('.');
  if(parts.length!==3)throw new Error('Invalid identity token structure');
  const header=JSON.parse(decodeBase64Url(parts[0]).toString('utf8'));
  const claims=JSON.parse(decodeBase64Url(parts[1]).toString('utf8'));
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200)
    throw new Error('Unexpected identity token signing method');
  const keyset=await fetchJson('https://www.linkedin.com/oauth/openid/jwks');
  const jwk=Array.isArray(keyset.keys)?keyset.keys.find(k=>k.kid===header.kid && k.kty==='RSA' && (!k.alg||k.alg==='RS256')):null;
  if(!jwk)throw new Error('LinkedIn signing key unavailable');
  const ok=verifySignature('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key:jwk,format:'jwk'}),decodeBase64Url(parts[2]));
  if(!ok)throw new Error('Invalid LinkedIn identity token signature');
  const now=Math.floor(Date.now()/1000);
  if(claims.iss!=='https://www.linkedin.com'||claims.aud!==process.env.LINKEDIN_CLIENT_ID
     ||!Number.isFinite(claims.exp)||claims.exp<=now
     ||!Number.isFinite(claims.iat)||claims.iat>now+120
     ||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255)
    throw new Error('LinkedIn identity token claims rejected');
  return {subject:claims.sub};
}
