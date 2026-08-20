(()=>{
  let patched=false,refreshTriggered=false;
  function patch(){
    const api=window.OpportunityBestLive;if(!api)return false;
    if(!patched){
      const previous=api.status?.bind(api);
      if(previous){api.status=()=>{const s=previous()||{},all=Array.isArray(s.items)?s.items:[],items=all.filter(x=>x?.status_verified===true&&x?.verification_level==='exact');return{...s,items,provider_policy:'exact-adapters-only',candidate_items:all.length,withheld_unverified:Math.max(0,all.length-items.length)}}}
      patched=true;api.__exactAdapterPolicy=true;
    }
    if(!refreshTriggered){refreshTriggered=true;setTimeout(()=>{try{api.refresh?.()}catch{}},120)}
    return true;
  }
  function decorate(){
    const section=document.querySelector('#dashboard .deepLive');if(!section)return;
    const meta=section.querySelector('.deepLiveMeta');if(meta&&!meta.querySelector('.exactAdapterMeta')){const x=document.createElement('span');x.className='exactAdapterMeta';x.textContent='exact provider adapters only';meta.appendChild(x)}
    let note=section.querySelector('.exactAdapterNote');if(!note){note=document.createElement('div');note.className='exactAdapterNote';note.style.cssText='margin-top:8px;color:#7f8797;font-size:8px;line-height:1.5;position:relative;z-index:1';note.textContent='Verified ranking now accepts only vacancies that pass a provider-specific exact-job adapter. Board-only candidates remain available through programme analysis but are not promoted here.';section.appendChild(note)}
  }
  function run(){if(patch()){try{window.OpportunityDeepVacancyRanking?.refresh?.()}catch{}decorate()}}
  const obs=new MutationObserver(()=>setTimeout(run,100));obs.observe(document.body,{childList:true,subtree:true});
  setInterval(run,1600);setTimeout(run,180);
  window.OpportunityExactProviderAdapters={mode:'exact-only',refresh:()=>{refreshTriggered=false;run()}};
})();
