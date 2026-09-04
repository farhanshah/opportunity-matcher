(()=>{
  let finished=false,attempts=0,timer=null,observer=null;
  const source=()=>((typeof tracks==='object'&&tracks)||window.tracks||{});
  const now=()=>new Date().toISOString();
  const settled=()=>{
    const text=String(document.getElementById('cloudSyncPill')?.textContent||'').trim().toLowerCase();
    return /cloud synced|local only|reconnect|sync issue/.test(text);
  };
  const history=t=>{
    t.checklist??={documents:false,statement:false,references:false};
    if(!Array.isArray(t.checklist.history))t.checklist.history=[];
    return t.checklist.history;
  };
  function push(t,{type='milestone',label,detail,onceKey}){
    const list=history(t);
    if(onceKey&&list.some(e=>e?.onceKey===onceKey))return false;
    list.push({
      id:`${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
      at:now(),type,label,detail,onceKey:onceKey||''
    });
    return true;
  }
  function studioState(t){
    try{
      const truth=window.OpportunityStudioTruth;
      if(typeof truth?.getState!=='function')return null;
      const s=truth.getState(t);if(!s)return null;
      const documentsReady=s.sourceMode==='dedicatedPrepare'
        ?Boolean(s.cvReady&&s.motReady&&s.writingReady&&s.pdfReady)
        :Boolean(s.assembled&&s.cvReady&&s.motReady);
      return{
        verified:Boolean(s.verified),
        documentsReady,
        providerReady:Boolean(s.providerReady),
        progress:Number(s.progress||0)
      };
    }catch{return null;}
  }
  function reconcileTrack(t){
    const s=studioState(t);if(!s)return false;
    let changed=false;
    const observed='Current Application Studio state confirms this milestone is already complete. The original completion time was not reconstructed.';
    if(s.verified)changed=push(t,{label:'Official checks already complete',detail:observed,onceKey:'milestone-verified'})||changed;
    if(s.documentsReady)changed=push(t,{label:'Application documents already ready',detail:observed,onceKey:'milestone-documents-ready'})||changed;
    if(s.providerReady)changed=push(t,{label:'Final provider check already confirmed',detail:observed,onceKey:'milestone-provider-ready'})||changed;
    if(String(t.stage||'')==='Ready to submit'||s.progress>=100){
      changed=push(t,{type:'stage',label:'Application pack already ready',detail:'Current tracker state confirms this application is ready to submit. The original Ready-to-submit transition time was not reconstructed.',onceKey:'stage-ready-adopted'})||changed;
    }
    return changed;
  }
  function reconcile(){
    if(finished)return;
    const all=source();if(!Object.keys(all).length)return;
    let changed=false;
    for(const t of Object.values(all))changed=reconcileTrack(t)||changed;
    if(changed){
      try{typeof persist==='function'&&persist()}catch(e){console.warn('History milestone reconciliation persist failed',e)}
      try{window.OpportunityApplicationHistory?.refresh?.()}catch{}
      setTimeout(()=>window.dispatchEvent(new CustomEvent('opportunity:statechange')),0);
    }
    finished=true;cleanup();
  }
  function check(){
    if(finished)return;attempts++;
    if(settled())reconcile();
    if(!finished&&attempts<24)timer=setTimeout(check,500);
    else if(!finished)reconcile();
  }
  function cleanup(){if(timer)clearTimeout(timer);observer?.disconnect?.()}
  function watch(){
    const pill=document.getElementById('cloudSyncPill');
    if(pill){observer=new MutationObserver(()=>{if(settled())reconcile()});observer.observe(pill,{childList:true,subtree:true,characterData:true});}
    timer=setTimeout(check,300);
  }
  watch();
  window.OpportunityHistoryMilestoneReconcile={reconcile};
})();