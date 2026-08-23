(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();

  function syntheticExact(id,t){
    const m=t?.exactVacancy||{};
    let base=null;
    try{base=(opps||[]).find(o=>o.Opportunity_ID===m.programmeId)}catch{}
    return{
      Opportunity_ID:id,
      Opportunity_Name:m.title||base?.Opportunity_Name||'Verified live vacancy',
      Provider:m.provider||base?.Provider||'Official provider',
      Type:base?.Type||'Internship',
      Destination:m.location||base?.Destination||'See official vacancy',
      Funding:base?.Funding||'Varies',
      Status:'Open',
      Close_Date:m.deadline||'',
      Application_URL:m.url||'',
      Official_Source_URL:m.url||'',
      Last_Verified:(m.addedAt||new Date().toISOString()).slice(0,10),
      Benefits:Array.isArray(base?.Benefits)?base.Benefits:[],
      Eligibility_Notes:'Tracked from a verified exact vacancy. Re-check the official posting before submission.'
    };
  }

  function withMissingTrackedOpps(fn){
    if(!Array.isArray(window.opps||opps))return fn();
    const list=window.opps||opps,added=[];
    try{
      for(const [id,t] of Object.entries(window.tracks||tracks||{})){
        if(list.some(o=>o?.Opportunity_ID===id))continue;
        if(!t?.exactVacancy?.url)continue;
        list.push(syntheticExact(id,t));added.push(id);
      }
      return fn();
    }finally{
      if(added.length){
        for(let i=list.length-1;i>=0;i--)if(added.includes(list[i]?.Opportunity_ID))list.splice(i,1);
      }
    }
  }

  function wrapTracker(){
    const prior=window.renderTracker;
    if(typeof prior!=='function'||prior.__omExactIntegrityV130)return false;
    const wrapped=function(...args){
      return withMissingTrackedOpps(()=>prior.apply(this,args));
    };
    wrapped.__omExactIntegrityV130=true;
    wrapped.__omPrior=prior;
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
    return true;
  }

  function refreshTrackerIfVisible(){
    const tracker=document.getElementById('tracker');
    if(!tracker||tracker.classList.contains('hide'))return;
    try{window.renderTracker?.()}catch(e){console.warn('Tracker integrity refresh failed',e)}
    setTimeout(()=>{
      try{window.OpportunityExactTrackerPolish?.refresh?.()}catch{}
      try{window.OpportunityExactBoardBridge?.refresh?.()}catch{}
    },30);
  }

  function relabelCloudWorkspace(){
    document.querySelectorAll('#dashboard .dashPanelHead span').forEach(el=>{
      if(norm(el.textContent)==='browser-local workspace'){
        el.textContent='cloud-synced workspace';
        el.classList.add('omCloudWorkspaceLabel');
      }
    });
  }

  function verifyCount(){
    const tracker=document.getElementById('tracker');
    if(!tracker||tracker.classList.contains('hide'))return;
    const expected=Object.keys(window.tracks||tracks||{}).length;
    const focus=document.querySelectorAll('#tracker .focusCard').length;
    const board=document.querySelectorAll('#tracker .boardCardV11').length;
    const shown=Math.max(focus,board);
    if(expected>shown)refreshTrackerIfVisible();
  }

  function refresh(){
    wrapTracker();
    relabelCloudWorkspace();
    verifyCount();
  }

  const observer=new MutationObserver(muts=>{
    if(!muts.some(m=>m.addedNodes?.length))return;
    clearTimeout(observer._t);observer._t=setTimeout(refresh,90);
  });
  observer.observe(document.body,{subtree:true,childList:true});

  window.addEventListener('opportunity:statechange',()=>setTimeout(()=>{refresh();refreshTrackerIfVisible()},80));
  window.addEventListener('focus',()=>setTimeout(refresh,80));
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.navbtn[data-v="tracker"],#tracker .viewToggle button'))setTimeout(()=>{refresh();refreshTrackerIfVisible()},80);
  },true);

  setTimeout(refresh,100);setTimeout(()=>{refresh();refreshTrackerIfVisible()},700);setTimeout(refresh,1600);
  window.OpportunityWorkspaceIntegrity={refresh,hydrateTracker:refreshTrackerIfVisible};
})();
