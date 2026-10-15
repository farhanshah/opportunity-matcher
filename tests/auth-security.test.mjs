import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function loadHandler(){
  const source=readFileSync(new URL('../api/welcome-now.js',import.meta.url),'utf8')
    .replace(/^import .*;$/gm,'').replace(/^export default /gm,'');
  const factory=new Function('db','sendWelcome',source+'\nreturn handler;');
  return factory;
}
function req({method='POST',origin='https://oppmatcher.tech',
  token='A'.repeat(48),contentType='application/json'}={}){
  return {method,headers:{origin,
    authorization:token?'Bearer '+token:'',
    'content-type':contentType}};
}
function res(){
  const state={status:200,body:null,headers:{}};
  const response={
    setHeader:(k,v)=>{state.headers[k]=v;return response},
    status:n=>{state.status=n;return response},
    json:payload=>{state.body=payload;return response}
  };
  return {state,response};
}
test('reject wrong origin without querying user account data',async()=>{
  let called=0;
  const handler=loadHandler()(()=>{called++;return()=>[]},async()=> 'sent');
  const out=res();
  await handler(req({origin:'https://attacker.example'}),out.response);
  assert.equal(out.state.status,403);
  assert.equal(called,0);
});
test('reject absent or malformed credentials',async()=>{
  const handler=loadHandler()(()=>{throw Error('Unexpected DB query')},async()=> 'sent');
  const out=res();
  await handler(req({token:''}),out.response);
  assert.equal(out.state.status,401);
});
test('sender unavailable does not misreport delivery',async()=>{
  const handler=loadHandler()(()=>{throw Error('Unexpected DB query')},async()=> 'sent');
  const out=res();
  await handler(req(),out.response);
  assert.equal(out.state.status,200);
  assert.equal(out.state.body.configured,false);
});
test('server validates current session and resolves verified user, never trusts body email',async()=>{
  let query='';
  const id='00000000-0000-0000-0000-000000000004';
  const row={id,name:'Graduate',email:'member@example.com',emailVerified:true,banned:false};
  const handler=loadHandler()(()=>async(strings,...values)=>{
    query=strings.join('?');assert.equal(values.length,1);
    assert.equal(values[0],'A'.repeat(48));
    return [row];
  },async(sql,user,key,from)=>{
    assert.equal(user,row);
    assert.equal(key,'key_test');
    assert.equal(from,'welcome@oppmatcher.tech');
    return 'sent'
  });
  process.env.RESEND_API_KEY='key_test';
  process.env.WELCOME_FROM_EMAIL='welcome@oppmatcher.tech';
  try{
    const out=res();
    await handler(req(),out.response);
    assert.equal(out.state.body.status,'sent');
    assert.match(query,/FROM neon_auth\.session/);
    assert.match(query,/s\."expiresAt">now\(\)/);
    assert.match(query,/u\.banned IS DISTINCT FROM TRUE/);
  }finally{
    delete process.env.RESEND_API_KEY;
    delete process.env.WELCOME_FROM_EMAIL;
  }
});
test('expired or nonexistent session never sends',async()=>{
  let sends=0;
  const handler=loadHandler()(()=>async()=>[],async()=>{sends++});
  process.env.RESEND_API_KEY='key_test';
  process.env.WELCOME_FROM_EMAIL='welcome@oppmatcher.tech';
  try{
    const out=res();await handler(req(),out.response);
    assert.equal(out.state.status,401);assert.equal(sends,0);
  }finally{
    delete process.env.RESEND_API_KEY;
    delete process.env.WELCOME_FROM_EMAIL;
  }
});
