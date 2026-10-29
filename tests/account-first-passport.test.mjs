import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

function simulate({route='/'}={}){
 const counts={auth:0,open:0,save:0,workspace:0,view:0,preview:0,mode:''};
 let hasAccount=false,hasCloudForm=false,interval=null;
 const saved=new Map(),listeners=new Map();
 const flags=new Map();
 const element=id=>({classList:{
  add:name=>{if(!flags.has(id))flags.set(id,new Set());flags.get(id).add(name)},
  remove:name=>flags.get(id)?.delete(name),
  contains:name=>flags.get(id)?.has(name)||false
 }});
 const nodes=Object.fromEntries(['cloudAuthModal','onboard','app','landing'].map(id=>[id,element(id)]));
 const cloud={
  isAccountReady:()=>hasAccount,
  isSignedIn:()=>hasAccount,
  openAuth:()=>{counts.auth++},
  setMode:mode=>{counts.mode=mode},
  closeAuth(){}
 };
 const window={
  OpportunityCloud:cloud,
  openOnboard:()=>{counts.open++},
  finishOnboard:()=>{counts.save++},
  showApp:()=>{counts.workspace++},
  setView:()=>{counts.view++},
  toggleSave:()=>{counts.save++},
  addTrack:()=>{counts.save++},
  trackStage:()=>{counts.save++},
  checklistToggle:()=>{counts.save++},
  location:{assign:()=>{counts.preview++}},
  addEventListener:(name,fn)=>listeners.set(name,fn)
 };
 const document={
  addEventListener(){},
  getElementById:id=>{
   if(id==='cloudCompleteForm')return hasCloudForm?{}:null;
   if(nodes[id])return nodes[id];
   return null;
  }
 };
 const sandbox={window,document,
  sessionStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
  setInterval:fn=>{interval=fn;return 1},
  location:{pathname:route},
  console
 };
 vm.runInNewContext(read('app-account-gate-v1.js'),sandbox);
 return {window,counts,interval:()=>interval?.(),setAccount:v=>{hasAccount=v},
  setCloudForm:v=>{hasCloudForm=v},listeners,intent:()=>saved.get('oppAccountPassportIntentV1'),
  hidden:()=>nodes.app.classList.contains('hide')};
}
test('public site is discoverable, with a sign-up-first Passport CTA',()=>{
 const page=read('index.html'),loader=read('app-v07.js');
 assert.match(page,/Free account required to save your Passport/);
 assert.match(page,/href="\/blog\/"/);
 assert.match(page,/href="\/latest"/);
 assert.doesNotMatch(page,/onclick="sample\(\)"/);
 assert.ok(loader.includes("'/app-account-gate-v1.js'"));
 assert.ok(loader.indexOf("'/app-account-gate-v1.js'")>loader.indexOf("'/app-v103-boot-finalize.js'"));
});
test('guests cannot create a Passport, save a listing or enter private workspace',()=>{
 const s=simulate();
 s.window.openOnboard();
 s.window.finishOnboard();
 s.window.showApp();
 s.window.toggleSave('SCH-1');
 s.window.addTrack('SCH-1');
 assert.equal(s.counts.open,0);
 assert.equal(s.counts.save,0);
 assert.equal(s.counts.workspace,0);
 assert.ok(s.counts.auth>=1);
 assert.equal(s.counts.mode,'signup');
 assert.equal(s.intent(),'workspace');
});
test('a signed-in cloud user can use the full Passport and tracker',()=>{
 const s=simulate();s.setAccount(true);
 s.window.openOnboard(true);
 s.window.finishOnboard();
 s.window.showApp();
 s.window.addTrack('SCH-1');
 assert.equal(s.counts.open,1);
 assert.equal(s.counts.save,2);
 assert.equal(s.counts.workspace,1);
 assert.equal(s.counts.auth,0);
});
test('first-time account onboarding wins over legacy local form',async()=>{
 const s=simulate();s.window.openOnboard();s.setAccount(true);s.setCloudForm(true);
 s.interval();await Promise.resolve();
 assert.equal(s.counts.open,0);
 assert.equal(s.intent(),undefined);
});
test('after returning OAuth, account restores requested Passport form',async()=>{
 const s=simulate();s.window.openOnboard();s.setAccount(true);
 s.interval();await Promise.resolve();
 assert.equal(s.counts.open,1);
 assert.equal(s.intent(),undefined);
});
test('signed-out guest route keeps private views hidden until account ready',async()=>{
 const s=simulate({route:'/tracker'});
 s.window.showApp();assert.equal(s.counts.workspace,0);
 s.setAccount(true);s.interval();await Promise.resolve();
 assert.equal(s.counts.workspace,1);
 assert.equal(s.counts.view,1);
});
test('after signout no guest Passport can be resumed',()=>{
 const s=simulate();s.window.openOnboard();
 s.listeners.get('opportunity:signedout')?.();
 assert.equal(s.intent(),undefined);
});
test('account truth comes from Neon Auth client, not local profile storage',()=>{
 const cloud=read('app-cloud-v13.js');
 const gate=read('app-account-gate-v1.js');
 assert.match(cloud,/isSignedIn:\(\)=>Boolean\(session\?\.user\)/);
 assert.match(cloud,/isAccountReady:\(\)=>Boolean\(session\?\.user&&ready\)/);
 assert.match(gate,/cloud\(\)\?\.isAccountReady\?\.\(\)===true/);
 assert.doesNotMatch(gate,/localStorage\.setItem/);
 assert.match(gate,/cloudCompleteForm/);
});

test('a direct private route hides early-rendered workspace and requests sign-in',()=>{
 const s=simulate({route:'/tracker'});
 assert.equal(s.hidden(),true);
 assert.equal(s.intent(),'workspace');
 s.interval();
 assert.ok(s.counts.auth>=1);
 s.setAccount(true);
 s.interval();
 assert.equal(s.intent(),undefined);
});
