(()=>{
  const BLOCKED_PROGRAMMES=new Set(['INT-005']);
  function patchSource(){
    const api=window.OpportunityBestLive;if(!api||api.__providerPolicyPatched)return;
    const originalStatus=api.status?.bind(api);if(originalStatus){api.status=()=>{const s=originalStatus()||{};const items=Array.isArray(s.items)?s.items.filter(x=>!BLOCKED_PROGRAMMES.has(String(x.programmeId||'').toUpperCase())):[];return{...s,items,provider_policy:'fail-closed',withheld_providers:['UNICEF']}}}
    api.__providerPolicyPatched=true;
    try{window.OpportunityDeepVacancyRanking?.refresh?.()}catch{}
  }
  function cleanRenderedFeed(){
    const section=document.querySelector('#dashboard .deepLive');if(!section)return;
    let removed=0;
    [...section.querySelectorAll('.deepLiveCard')].forEach(card=>{
      const provider=(card.querySelector('.deepLiveProvider')?.textContent||'').trim().toUpperCase();
      if(provider==='UNICEF'){card.remove();removed++}
    });
    const cards=[...section.querySelectorAll('.deepLiveCard')];
    cards.forEach((card,i)=>{const badge=card.querySelector('.deepLiveVerdict');if(badge)badge.textContent=badge.textContent.replace(/^#\d+\s*·\s*/,`#${i+1} · `)});
    const meta=section.querySelector('.deepLiveMeta');if(meta){
      const ranked=[...meta.querySelectorAll('span')].find(x=>/ranked/i.test(x.textContent||''));if(ranked)ranked.textContent=`${cards.length} ranked`;
      meta.querySelectorAll('.providerPolicyMeta').forEach(x=>x.remove());
      const s=document.createElement('span');s.className='providerPolicyMeta';s.textContent='UNICEF exact verification unavailable';meta.appendChild(s);
    }
    let note=section.querySelector('.providerPolicyNote');if(!note){note=document.createElement('div');note.className='providerPolicyNote';note.style.cssText='margin-top:10px;padding:9px 11px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.035);color:#aeb6c5;font-size:8px;line-height:1.5;position:relative;z-index:1';note.innerHTML='<b style="color:#dfff87">Provider verification policy:</b> UNICEF vacancy leads are withheld from this verified ranking while UNICEF redirects server-side exact-job checks to a generic listing page. Use the official UNICEF board from programme analysis for source-of-truth browsing.';section.appendChild(note)}
    if(!cards.length){const grid=section.querySelector('.deepLiveGrid');if(grid){const empty=document.createElement('div');empty.className='deepLiveEmpty';empty.innerHTML='<b>No vacancy currently survives exact provider verification strongly enough to rank.</b><p>Opportunity is withholding unverifiable provider leads rather than presenting them as live.</p>';grid.replaceWith(empty)}}
  }
  function run(){patchSource();cleanRenderedFeed()}
  const obs=new MutationObserver(()=>setTimeout(run,80));obs.observe(document.body,{childList:true,subtree:true});
  setInterval(run,1200);setTimeout(run,150);
  window.OpportunityProviderVerificationPolicy={refresh:run,mode:'fail-closed',withheld:['UNICEF']};
})();
