/* Account-first Passport UX. Database permissions remain server-side. */
(()=>{
 'use strict';
 if(window.OpportunityAccountGate)return;
 const INTENT='oppAccountPassportIntentV1';
 const allowed=new Set(['passport','workspace']);
 let intent='',loginOpened=false,resuming=false;
 try{const stored=sessionStorage.getItem(INTENT);if(allowed.has(stored))intent=stored}catch{}
 const cloud=()=>window.OpportunityCloud;
 const ready=()=>cloud()?.isAccountReady?.()===true;
 const signedIn=()=>cloud()?.isSignedIn?.()===true;
 const originals=Object.fromEntries([
  'openOnboard','finishOnboard','showApp','setView','toggleSave',
  'addTrack','trackStage','checklistToggle'
 ].map(k=>[k,window[k]]));
 const remember=value=>{
  intent=allowed.has(value)?value:'';
  try{if(intent)sessionStorage.setItem(INTENT,intent);else sessionStorage.removeItem(INTENT)}catch{}
 };
 function showAuth(){
  const c=cloud();
  if(!c?.openAuth)return false;
  if(signedIn())return true;
  if(!loginOpened){
   loginOpened=true;
   c.setMode?.('signup');
   c.openAuth();
  }
  return true;
 }
 function request(value){
  remember(value);
  loginOpened=false;
  if(ready())void resume();
  else showAuth();
  return false;
 }
 function passport(edit=false){
  if(!ready())return request('passport');
  return originals.openOnboard?.(edit);
 }
 function workspace(...args){
  if(!ready())return request('workspace');
  return originals.showApp?.(...args);
 }
 window.openOnboard=passport;
 window.finishOnboard=function(...args){
  return ready()?originals.finishOnboard?.apply(this,args):request('passport');
 };
 window.showApp=workspace;
 window.sample=function(){window.location.assign('/latest');return false};
 for(const name of ['toggleSave','addTrack','trackStage','checklistToggle']){
  if(typeof originals[name]!=='function')continue;
  window[name]=function(...args){
   return ready()?originals[name].apply(this,args):request('workspace');
  };
 }
 if(typeof originals.setView==='function'){
  window.setView=function(...args){
   return ready()?originals.setView.apply(this,args):request('workspace');
  };
 }
 // Legacy modules use unqualified global function names.
 try{openOnboard=window.openOnboard}catch{}
 try{finishOnboard=window.finishOnboard}catch{}
 try{showApp=window.showApp}catch{}
 try{sample=window.sample}catch{}
 try{toggleSave=window.toggleSave}catch{}
 try{addTrack=window.addTrack}catch{}
 try{trackStage=window.trackStage}catch{}
 try{checklistToggle=window.checklistToggle}catch{}
 try{setView=window.setView}catch{}

 // Covers late-bound workspace controls and old inline event handlers.
 document.addEventListener('click',e=>{
  if(ready())return;
  if(e.target?.closest?.('#app')||e.target?.closest?.('#onboard .passportSubmit')){
   e.preventDefault();
   e.stopImmediatePropagation();
   request('workspace');
  }
 },true);

 async function resume(){
  if(!intent||!ready()||resuming)return;
  resuming=true;
  try{
   const requested=intent;
   remember('');
   if(requested==='passport'){
    // Neon Auth opens its own one-time cloud Passport form on first sign-in.
    if(document.getElementById('cloudCompleteForm')){
     document.getElementById('cloudAuthModal')?.classList.remove('hide');
     return;
    }
    cloud()?.closeAuth?.();
    originals.openOnboard?.(true);
   }else{
    cloud()?.closeAuth?.();
    originals.showApp?.();
    const path=location.pathname.replace(/^\/+|\/+$/g,'').toLowerCase();
    const view=['discover','saved','tracker','dashboard'].includes(path)?path:'discover';
    originals.setView?.(view,{replace:true});
   }
  }finally{resuming=false;loginOpened=false}
 }
 // Intent survives social OAuth returning to the original tab.
 setInterval(()=>{
  if(ready()){if(intent)void resume();return}
  if(intent&&!signedIn()&&!loginOpened)showAuth();
 },200);
 window.addEventListener('opportunity:signedout',()=>{
  remember('');
  loginOpened=false;
  document.getElementById('onboard')?.classList.add('hide');
  document.getElementById('app')?.classList.add('hide');
  document.getElementById('landing')?.classList.remove('hide');
 });
 window.OpportunityAccountGate={beginPassport:passport,beginWorkspace:workspace,isReady:ready};
})();
