(()=>{
  const LIVE_INDEX={
    'INT-005':1,
    'INT-006':2,
    'INT-013':5,
    'INT-019':7
  };
  const SPECIFIC_IDS=new Set(['FEL-015','INT-011','INT-012','INT-016']);
  function authoritativeCounts(){
    const s=window.OpportunityBestLive?.status?.();
    if(!s?.at||!Array.isArray(s.items))return null;
    const counts={};
    for(const item of s.items){
      const id=String(item?.programmeId||'');
      if(!id)continue;
      counts[id]=(counts[id]||0)+1;
    }
    return{counts,state:s};
  }
  function sync(){
    const box=document.querySelector('#dashboard .specificWorkbench');
    if(!box)return;
    const auth=authoritativeCounts();
    if(!auth)return;
    const cards=[...box.querySelectorAll('.specificRoute')];
    for(const [id,index] of Object.entries(LIVE_INDEX)){
      const card=cards[index];if(!card)continue;
      const n=Number(auth.counts[id]||0),badge=card.querySelector('.specificBadge'),copy=card.querySelector('p');
      card.classList.toggle('exact',n>0);
      if(n>0){
        if(badge)badge.textContent=`${n} exact live`;
        if(copy)copy.textContent='Exact vacancies currently survive the authoritative live-vacancy feed and are safe to evaluate next.';
      }else{
        if(badge)badge.textContent='No exact opening';
        if(copy)copy.textContent='No vacancy from this route currently survives the authoritative exact-provider feed.';
      }
    }
    const coverage=window.OpportunitySpecificOpeningCoverage?.status?.();
    let total=0;
    if(Array.isArray(coverage?.rows))for(const row of coverage.rows)if(SPECIFIC_IDS.has(row.id))total+=Number(row.exact||0);
    for(const id of Object.keys(LIVE_INDEX))total+=Number(auth.counts[id]||0);
    const meta=box.querySelector('.specificWorkbenchMeta');
    if(meta)meta.textContent=`8/8 routes connected · ${total} exact live`;
  }
  const timer=setInterval(sync,700);
  window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(sync,20));
  window.addEventListener('focus',sync);
  setTimeout(sync,300);
  window.OpportunityOpeningAuthoritySync={refresh:sync,stop:()=>clearInterval(timer)};
})();