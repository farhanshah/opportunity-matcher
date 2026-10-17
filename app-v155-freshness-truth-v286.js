(()=>{
  // Catalogue freshness is shown from live server metrics, not from browser caches
  // or a successful monitor HTTP fetch. Do not alter matching or database records.
  const ID='oppFreshnessTruthV286';
  const style=document.createElement('style');
  style.textContent=`
    .oppFreshnessTruthV286{box-sizing:border-box;display:flex;align-items:flex-start;gap:12px;
      padding:13px 16px;margin:0 0 18px;border:1px solid #b99854;
      border-radius:13px;background:#fff7e5;color:#3e321b;font-size:12px;line-height:1.5}
    .oppFreshnessTruthV286 strong{font-size:13px;font-weight:800}
    .oppFreshnessTruthV286 p{margin:3px 0 0;line-height:1.5}
    .oppFreshnessTruthV286 .oppFreshnessIcon{font-weight:900;font-size:16px;line-height:1.3}
    .landing .oppFreshnessTruthV286{margin:0 0 24px}
    #app .oppFreshnessTruthV286{background:#292414;color:#f7ead0;border-color:#846b35}
    @media(max-width:700px){.oppFreshnessTruthV286{padding:12px;font-size:11px}.oppFreshnessTruthV286 strong{font-size:12px}}
  `;
  document.head.appendChild(style);
  function mount(kind){
    const parent=kind==='public'?document.querySelector('#live-opportunities .section'):document.querySelector('#app .appBody');
    if(!parent)return null;
    const id=ID+'-'+kind;
    let item=document.getElementById(id);
    if(!item){
      item=document.createElement('div');
      item.id=id;item.className='oppFreshnessTruthV286';item.setAttribute('role','status');
      const before=kind==='public'?parent.querySelector('#featuredGrid'):parent.firstElementChild;
      parent.insertBefore(item,before);
    }
    return item;
  }
  function render(data){
    const total=Number(data.opportunities),stale=Number(data.programme_needs_recheck);
    const sources=Number(data.monitored_sources),success=Number(data.sources_successful_7d);
    if(!data.ok||!Number.isSafeInteger(total)||!Number.isSafeInteger(stale)||stale<0||stale>total)return;
    const message=stale>0
      ?`<strong>${stale} of ${total} programme records need source re-verification.</strong>
         <p>Opportunity suggestions and saved deadlines are leads, not confirmed current eligibility.
         Open each official provider page before applying.${Number.isSafeInteger(sources)&&Number.isSafeInteger(success)
            ?` Source monitoring fetched ${success} of ${sources} official pages successfully in the past 7 days, but that does not re-verify every programme rule.`:''}</p>`
      :`<strong>Catalogue source checks are current.</strong>
         <p>Always confirm your country's application requirements and deadline on the official provider page.</p>`;
    for(const kind of ['public','workspace']){
      const container=mount(kind);
      if(container){container.innerHTML='<span class="oppFreshnessIcon" aria-hidden="true">!</span><div>'+message+'</div>';container.hidden=false;}
    }
  }
  function unavailable(){
    for(const kind of ['public','workspace']){
      const container=mount(kind);
      if(container)container.innerHTML='<span class="oppFreshnessIcon" aria-hidden="true">!</span><div><strong>Source freshness status unavailable.</strong><p>Please verify programme requirements directly with the official provider.</p></div>';
    }
  }
  async function refresh(){
    try{
      const response=await fetch('/api/health',{cache:'no-store',headers:{Accept:'application/json'}});
      if(!response.ok)throw Error('Health check unavailable');
      const data=await response.json();
      if(!data.ok||!Number.isSafeInteger(Number(data.programme_needs_recheck)))throw Error('Incomplete freshness metrics');
      render(data);
    }catch(e){unavailable();}
  }
  unavailable();
  void refresh();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()});
  window.OpportunityFreshnessTruth={refresh};
})();