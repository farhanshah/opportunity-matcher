(()=>{
  let queued=false;
  let observer=null;
  let observed=null;

  function refresh(){
    queued=false;
    try{window.OpportunityActionRadar?.refresh?.()}catch(e){console.warn('Action radar refresh skipped',e)}
  }

  function schedule(){
    if(queued)return;
    queued=true;
    queueMicrotask(refresh);
  }

  function bind(){
    const dash=document.getElementById('dashboard');
    if(!dash)return;
    if(dash!==observed){
      observer?.disconnect();
      observed=dash;
      observer=new MutationObserver(records=>{
        const meaningful=records.some(r=>{
          if(r.type!=='childList'||(!r.addedNodes.length&&!r.removedNodes.length))return false;
          const el=r.target?.nodeType===1?r.target:null;
          return !el?.closest?.('.applicationActionRadar');
        });
        if(meaningful)schedule();
      });
      observer.observe(dash,{childList:true,subtree:true});
    }
    schedule();
  }

  const priorRender=window.renderDashboard;
  if(typeof priorRender==='function'&&!priorRender.__omRadarGuardV130){
    const wrapped=(...args)=>{const out=priorRender(...args);queueMicrotask(bind);return out};
    wrapped.__omRadarGuardV130=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const priorSet=window.setView;
  if(typeof priorSet==='function'&&!priorSet.__omRadarGuardV130){
    const wrapped=(v,...args)=>{const out=priorSet(v,...args);if(v==='dashboard')queueMicrotask(bind);return out};
    wrapped.__omRadarGuardV130=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrapped(b.dataset.v)});
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.navbtn[data-v="dashboard"]'))queueMicrotask(bind);
  },true);
  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',()=>{bind();schedule()});
  window.addEventListener('opportunity:cloudsynced',schedule);
  window.addEventListener('load',bind,{once:true});
  queueMicrotask(bind);

  window.OpportunityActionRadarGuard={refresh:()=>{bind();schedule()}};
})();
