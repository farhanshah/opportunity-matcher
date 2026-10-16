import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyNeonJwt, getAccountBySession, bearerToken, redirectHome, authorizationUrl, verifyIdToken } from '../lib/linkedin-oidc.js';

const base='https://ep-empty-fog-aw7p1xu9.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const issuer=new URL(base).origin;
const { publicKey, privateKey }=generateKeyPairSync('ed25519');
const signingKey={...publicKey.export({format:'jwk'}),kid:'test-key-1',alg:'EdDSA',use:'sig'};
const subject='00000000-0000-4000-8000-000000000007';
const now=Math.floor(Date.now()/1000);
const originalFetch=global.fetch;
global.fetch=async url=>{
  assert.equal(String(url),base+'/.well-known/jwks.json');
  return {ok:true,json:async()=>({keys:[signingKey]})};
};
test.after(()=>{global.fetch=originalFetch});
function token(extra={},signedKey=privateKey){
  const head=Buffer.from(JSON.stringify({alg:'EdDSA',kid:signingKey.kid,typ:'JWT'})).toString('base64url');
  const body=Buffer.from(JSON.stringify({
    iss:issuer,sub:subject,role:'authenticated',iat:now,exp:now+900,...extra
  })).toString('base64url');
  return head+'.'+body+'.'+sign(null,Buffer.from(head+'.'+body),signedKey).toString('base64url');
}
test('valid Neon JWT signed by pinned issuer identifies only the authenticated user',async()=>{
  const jwt=token();
  assert.deepEqual(await verifyNeonJwt(jwt),{userId:subject,sessionId:null});
});
test('realistic Neon issuer uses provider origin and an optional audience',async()=>{
  assert.equal(new URL(base).origin,issuer);
  assert.deepEqual(await verifyNeonJwt(token()),{userId:subject,sessionId:null});
});
test('JWT with audience for this exact Neon Auth deployment is accepted',async()=>{
  assert.deepEqual(await verifyNeonJwt(token({aud:base})),{userId:subject,sessionId:null});
});
test('a JWT signed for another issuer is rejected even with a trusted signing key',async()=>{
  await assert.rejects(verifyNeonJwt(token({iss:'https://attacker.example'})),/claims invalid/);
});
test('JWT from wrong audience is rejected after signature verification',async()=>{
  await assert.rejects(verifyNeonJwt(token({aud:'https://attacker.test'})),/claims invalid/);
});
test('anonymous JWT cannot connect a LinkedIn identity',async()=>{
  await assert.rejects(verifyNeonJwt(token({role:'anonymous'})),/claims invalid/);
});
test('expired or unbounded JWT fails closed',async()=>{
  await assert.rejects(verifyNeonJwt(token({exp:now-10})),/claims invalid/);
  await assert.rejects(verifyNeonJwt(token({exp:now+20000})),/claims invalid/);
});
test('forged JWT from another signing key is rejected',async()=>{
  const bad=generateKeyPairSync('ed25519');
  await assert.rejects(verifyNeonJwt(token({},bad.privateKey)),/signature invalid/);
});
test('only signed user subject is bound to a DB account lookup',async()=>{
  let bound=null;
  const mockSql=async (strings,...values)=>{
    assert.match(strings.join('?'),/JOIN neon_auth.session/);
    bound=values;
    return [{id:subject,verified:true,auth_session_id:subject}];
  };
  const user=await getAccountBySession(mockSql,token());
  assert.equal(user.id,subject);
  assert.equal(bound[0],subject);
  assert.equal(bound[1],null);
});
test('bearer parser never accepts malformed authorization headers',()=>{
  assert.equal(bearerToken({headers:{authorization:'Basic abc'}}),null);
  assert.equal(bearerToken({headers:{authorization:'Bearer abc'}}),null);
  assert.equal(bearerToken({headers:{authorization:'Bearer '+token()}}),token());
});

test('opaque Neon session token is validated using a current database session',async()=>{
  const opaque='S'.repeat(48);
  let checked=false;
  const mockSql=async(strings,...values)=>{
    const query=strings.join('?');
    assert.match(query,/FROM neon_auth.session/);
    assert.ok(query.includes('s.token=?'));
    assert.ok(query.includes('s."expiresAt">now()'));
    assert.equal(values[0],opaque);
    checked=true;
    return [{id:subject,verified:true,auth_session_id:subject}];
  };
  const account=await getAccountBySession(mockSql,opaque);
  assert.equal(account.id,subject);
  assert.equal(checked,true);
});

test('browser prefers working opaque token when optional Neon JWT endpoint returns 404',async()=>{
  const {readFileSync}=await import('node:fs');
  const code=readFileSync(new URL('../app-cloud-v13.js',import.meta.url),'utf8');
  const start=code.indexOf('async function linkedinBearer(){');
  const end=code.indexOf('async function refreshLinkedInStatus(',start);
  assert.ok(start>=0&&end>start,'browser token function is present');
  const body=code.slice(start,end);
  let jwtCalls=0;
  const session={session:{token:'S'.repeat(48)}};
  const client={auth:{getJWTToken:async()=>{jwtCalls++;throw Error('HTTP 404')}}};
  const browserFunction=Function('session','client','return ('+body+')')(session,client);
  assert.equal(await browserFunction(),'S'.repeat(48));
  assert.equal(jwtCalls,0);
});

test('LinkedIn callbacks land on the workspace with an encoded, non-secret status',()=>{
  const headers={};
  let location=null,ended=false;
  const response={
    setHeader:(name,value)=>{headers[name]=value;},
    writeHead:(status,values)=>{assert.equal(status,302);location=values.Location;},
    end:()=>{ended=true;}
  };
  redirectHome(response,'missing-cookie');
  assert.equal(location,'https://oppmatcher.tech/discover?linkedin_connect=missing-cookie');
  assert.match(headers['Set-Cookie'],/Max-Age=0/);
  assert.equal(headers['Cache-Control'],'no-store');
  assert.equal(ended,true);
});
test('browser remembers only a callback status, never an access token',async()=>{
  const {readFileSync}=await import('node:fs');
  const script=readFileSync(new URL('../app-v07.js',import.meta.url),'utf8');
  assert.match(script,/sessionStorage\.setItem\('oppLinkedInCallbackOutcomeV1',outcome\)/);
  assert.match(script,/\^\[a-z-\]\{3,40\}\$/);
});

test('LinkedIn authorization-code flow uses cryptographic state without requesting nonce',()=>{
  const prior=process.env.LINKEDIN_CLIENT_ID;
  process.env.LINKEDIN_CLIENT_ID='test-li-client';
  try{
    const target=new URL(authorizationUrl('Q'.repeat(43),'no-longer-needed'));
    assert.equal(target.hostname,'www.linkedin.com');
    assert.equal(target.pathname,'/oauth/v2/authorization');
    assert.equal(target.searchParams.get('state'),'Q'.repeat(43));
    assert.equal(target.searchParams.get('response_type'),'code');
    assert.equal(target.searchParams.get('nonce'),null);
    assert.equal(target.searchParams.get('scope'),'openid profile email');
  }finally{
    if(prior===undefined)delete process.env.LINKEDIN_CLIENT_ID;
    else process.env.LINKEDIN_CLIENT_ID=prior;
  }
});
test('LinkedIn signed ID token without nonce validates against the pinned issuer, key and client',async()=>{
  const pair=generateKeyPairSync('rsa',{modulusLength:2048});
  const jwk={...pair.publicKey.export({format:'jwk'}),kid:'linkedin-test-key',alg:'RS256',use:'sig'};
  const priorClient=process.env.LINKEDIN_CLIENT_ID;
  const priorFetch=global.fetch;
  process.env.LINKEDIN_CLIENT_ID='linkedin-client-test';
  global.fetch=async(url)=>{
    assert.equal(String(url),'https://www.linkedin.com/oauth/openid/jwks');
    return {ok:true,json:async()=>({keys:[jwk]})};
  };
  const createLinkedinJwt=(claims={})=>{
    const header=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url');
    const now=Math.floor(Date.now()/1000);
    const payload=Buffer.from(JSON.stringify({
      iss:'https://www.linkedin.com',aud:'linkedin-client-test',
      sub:'linked-member-123',iat:now,exp:now+600,...claims
    })).toString('base64url');
    return header+'.'+payload+'.'+sign('RSA-SHA256',Buffer.from(header+'.'+payload),pair.privateKey).toString('base64url');
  };
  try{
    assert.deepEqual(await verifyIdToken(createLinkedinJwt()),{subject:'linked-member-123'});
    // The actual OpenID discovery URI differs from LinkedIn's documentation example.
    assert.deepEqual(await verifyIdToken(createLinkedinJwt({iss:'https://www.linkedin.com/oauth'})),
      {subject:'linked-member-123'});
    await assert.rejects(verifyIdToken(createLinkedinJwt({aud:'wrong-client'})),/claims rejected/);
    await assert.rejects(verifyIdToken(createLinkedinJwt({iss:'https:\/\/attacker.example'})),/claims rejected/);
    await assert.rejects(verifyIdToken(createLinkedinJwt({iss:'https://www.linkedin.com.oauth.attacker.example'})),/claims rejected/);
    await assert.rejects(verifyIdToken(createLinkedinJwt({iss:'http://www.linkedin.com/oauth'})),/claims rejected/);
    await assert.rejects(verifyIdToken(createLinkedinJwt({exp:Math.floor(Date.now()/1000)-10})),/claims rejected/);
  }finally{
    global.fetch=priorFetch;
    if(priorClient===undefined)delete process.env.LINKEDIN_CLIENT_ID;
    else process.env.LINKEDIN_CLIENT_ID=priorClient;
  }
});
