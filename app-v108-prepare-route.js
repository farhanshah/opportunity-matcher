(()=>{
  const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
  const exactId=url=>`exact_${hash(url)}`;

  function go(id){
    if(!id)return;
    location.href=`/prepare?id=${encodeURIComponent(id)}`;
  }

  function exactButtonId(btn){
    if(!btn)return'';
    const direct=btn.dataset?.exactTrackId||btn.closest?.('[data-exact-track-id]')?.dataset?.exactTrackId;
    if(direct)return direct;
    const card=btn.closest?.('.deepV2Card');
    const url=card?.querySelector?.('.deepV2Actions a[href]')?.href||'';
    return url?exactId(url):'';
  }

  document.addEventListener('click',e=>{
    const target=e.target.closest?.('button,a');
    if(!target)return;

    // Tracker preparation actions already have an exact tracking id.
    const prep=target.closest?.('.prepOpen');
    if(prep){
      const card=prep.closest('.focusCard');
      const id=card?.dataset?.exactTrackId||prep.dataset?.exactTrackId;
      if(!id)return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      go(id);
      return;
    }

    // Dashboard exact-vacancy actions are created by the older action workflow.
    // Let its first click persist/track the vacancy, then leave the SPA tracker
    // redirect and open the dedicated preparation page for that same vacancy.
    const exact=target.closest?.('.exactPrepare');
    if(!exact)return;
    const id=exactButtonId(exact);
    if(!id)return;

    const alreadyTracked=Boolean(window.tracks?.[id])||exact.classList.contains('tracked')||/in tracker/i.test(exact.textContent||'');
    if(alreadyTracked){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      go(id);
      return;
    }

    try{sessionStorage.setItem('opp_prepare_pending',id)}catch{}
    setTimeout(()=>go(id),90);
  },true);

  // Safety bridge in case a legacy action completed its Tracker transition first.
  const pending=(()=>{try{return sessionStorage.getItem('opp_prepare_pending')||''}catch{return''}})();
  if(pending&&location.pathname==='/tracker'){
    try{sessionStorage.removeItem('opp_prepare_pending')}catch{}
    setTimeout(()=>go(pending),120);
  }

  const existing=window.OpportunityPreparationWorkspace;
  if(existing&&typeof existing==='object')existing.open=go;
  window.OpportunityPrepareRoute={open:go};
})();