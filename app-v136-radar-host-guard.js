(()=>{
  let observer=null;
  let observedHost=null;
  let queued=false;

  function refreshRadar(){
    queued=false;
    try{window.OpportunityActionRadarRescue?.refresh?.()}catch(e){console.warn('Action radar host refresh failed',e)}
  }

  function schedule(){
    if(queued)return;
    queued=true;
    queueMicrotask(()=>requestAnimationFrame(refreshRadar));
  }

  function bind(){
    const host=document.getElementById('dashGrid');
    if(!host)return;
    if(host!==observedHost){
      observer?.disconnect();
      observedHost=host;
      observer=new MutationObserver(records=>{
        if(records.some(r=>r.type==='childList'&&(r.addedNodes.length||r.removedNodes.length)))schedule();
      });
      observer.observe(host,{childList:true});
    }
    schedule();
  }

  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'&&!oldRender.__omRadarHostGuard){
    const wrapped=(...args)=>{
      const out=oldRender(...args);
      queueMicrotask(bind);
      return out;
    };
    wrapped.__omRadarHostGuard=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const oldSet=window.setView;
  if(typeof oldSet==='function'&&!oldSet.__omRadarHostGuard){
    const wrapped=(v,...args)=>{
      const out=oldSet(v,...args);
      if(v==='dashboard')queueMicrotask(bind);
      return out;
    };
    wrapped.__omRadarHostGuard=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
  }

  ['opportunity:statechange','opportunity:hydrated','opportunity:cloudsynced','opportunity:verifiedfeedchange'].forEach(name=>window.addEventListener(name,bind));
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))queueMicrotask(bind)},true);
  window.addEventListener('load',bind,{once:true});
  queueMicrotask(bind);

  window.OpportunityRadarHostGuard={refresh:()=>{bind();schedule()}};
})();