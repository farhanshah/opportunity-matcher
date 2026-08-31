(()=>{
  const norm=v=>String(v||'').trim();

  const style=document.createElement('style');
  style.textContent=`
    html[data-om-theme="light"] #dashboard .matchIntelHero h3,
    html[data-om-theme="light"] #dashboard .deepLiveV2 h3,
    html[data-om-theme="light"] #dashboard .deepV2Card h4,
    html[data-om-theme="light"] #dashboard .deepV2Signal b,
    html[data-om-theme="light"] #dashboard .deepV2Foot{color:#fff!important}
    html[data-om-theme="light"] #dashboard .matchIntelHero p,
    html[data-om-theme="light"] #dashboard .deepLiveV2 p{color:#aeb6c6!important}
  `;
  document.head.appendChild(style);

  function fixGrammar(){
    const hub=document.querySelector('#dashboard .omActionHub');
    if(!hub)return;
    hub.querySelectorAll('b,strong,h1,h2,h3,h4,p,div').forEach(el=>{
      if(el.children.length)return;
      if(/^1 tracked application need attention soon\.?$/i.test(norm(el.textContent))){
        el.textContent='1 tracked application needs attention soon.';
      }
    });
  }

  let applying=false;
  function apply(){
    if(applying)return;
    applying=true;
    try{
      fixGrammar();
      window.OpportunityLiveTrackedContext?.refresh?.();
      window.OpportunityActionablePriority?.refresh?.();
      window.OpportunityReadinessLabels?.refresh?.();
    }finally{applying=false}
  }

  let observer=null,observed=null,queued=false;
  function queueApply(){
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{queued=false;apply()});
  }

  function bind(){
    const premium=document.querySelector('#dashboard .dashPremium');
    if(!premium||premium===observed)return;
    observer?.disconnect();
    observed=premium;
    observer=new MutationObserver(records=>{
      if(records.some(r=>r.type==='childList'&&(r.addedNodes.length||r.removedNodes.length)))queueApply();
    });
    observer.observe(premium,{childList:true,subtree:false});
    queueApply();
  }

  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'&&!oldRender.__omDashboardConvergence){
    const wrapped=(...args)=>{const out=oldRender(...args);queueMicrotask(bind);return out};
    wrapped.__omDashboardConvergence=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const oldSet=window.setView;
  if(typeof oldSet==='function'&&!oldSet.__omDashboardConvergence){
    const wrapped=(v,...args)=>{const out=oldSet(v,...args);if(v==='dashboard')queueMicrotask(bind);return out};
    wrapped.__omDashboardConvergence=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrapped(b.dataset.v)});
  }

  window.addEventListener('opportunity:verifiedfeedchange',queueApply);
  window.addEventListener('opportunity:statechange',queueApply);
  window.addEventListener('opportunity:hydrated',queueApply);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))queueMicrotask(bind)},true);
  queueMicrotask(bind);

  window.OpportunityDashboardConvergence={refresh:()=>{bind();queueApply()}};
})();
