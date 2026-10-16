import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyNeonJwt, getAccountBySession, bearerToken } from '../lib/linkedin-oidc.js';

const base='https://ep-empty-fog-aw7p1xu9.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
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
    iss:base,aud:base,sub:subject,role:'authenticated',iat:now,exp:now+900,...extra
  })).toString('base64url');
  return head+'.'+body+'.'+sign(null,Buffer.from(head+'.'+body),signedKey).toString('base64url');
}
test('valid Neon JWT signed by pinned issuer identifies only the authenticated user',async()=>{
  const jwt=token();
  assert.deepEqual(await verifyNeonJwt(jwt),{userId:subject,sessionId:null});
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
