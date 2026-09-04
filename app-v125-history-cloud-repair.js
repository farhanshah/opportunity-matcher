(()=>{
  let finished=false,attempts=0,timer=null,observer=null;
  const source=()=>((typeof tracks==='object'&&tracks)||window.tracks||{});
  const settled=()=>{
    const text=String(document.getElementById('cloudSyncPill')?.textContent||'').trim().toLowerCase();
    return /cloud synced|local only|reconnect|sync issue/.test(text);
  };
  const event=stage=>({
    id:`system-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
    at:new Date().toISOString(),
    type:'system',
    label:'History tracking started',
    detail:`Existing application adopted at the current stage: ${stage||'Saved'}. Earlier timestamps were not reconstructed.`,
    onceKey:'history-started'
  });
  function repair(){
    if(finished)return;
    const all=source();
    if(!Object.keys(all).length)return;
    let changed=false;
    for(const t of Object.values(all)){
      t.checklist??={documents:false,statement:false,references:false};
      if(!Array.isArray(t.checklist.history))t.checklist.history=[];
      if(t.checklist.history.length)continue;
      t.checklist.history.push(event(t.stage));
      changed=true;
    }
    if(changed){
      try{typeof persist==='function'&&persist()}catch(e){console.warn('History cloud repair persist failed',e)}
      try{window.OpportunityApplicationHistory?.refresh?.()}catch{}
      setTimeout(()=>window.dispatchEvent(new CustomEvent('opportunity:statechange')),0);
    }
    finished=true;
    cleanup();
  }
  function check(){
    if(finished)return;
    attempts++;
    if(settled())repair();
    if(!finished&&attempts<24)timer=setTimeout(check,500);
    else if(!finished){repair();}
  }
  function cleanup(){if(timer)clearTimeout(timer);observer?.disconnect?.()}
  function watch(){
    const pill=document.getElementById('cloudSyncPill');
    if(pill){observer=new MutationObserver(()=>{if(settled())repair()});observer.observe(pill,{childList:true,subtree:true,characterData:true});}
    timer=setTimeout(check,250);
  }
  watch();
  window.OpportunityHistoryCloudRepair={repair};
})();
