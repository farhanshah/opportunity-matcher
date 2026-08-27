(()=>{
  // Legacy preparation compatibility layer.
  // The old in-Tracker modal was intentionally retired: it duplicated the
  // Application Studio, added a large DOM subtree and could make Tracker
  // unresponsive. Every preparation entry point now uses /prepare?id=… .
  const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
  const exactId=url=>`exact_${hash(url)}`;

  const style=document.createElement('style');
  style.textContent=`
    .prepOpen{border:0;background:#d8ff69;color:#192008;border-radius:10px;padding:9px 12px;font-size:8px;font-weight:950;white-space:nowrap;cursor:pointer}
    .prepOpen:hover{filter:brightness(.98)}
  `;
  document.head.appendChild(style);

  function go(id){
    if(!id)return;
    location.assign(`/prepare?id=${encodeURIComponent(id)}`);
  }

  function cardId(card){
    return card?.dataset?.exactTrackId||'';
  }

  function dashboardId(btn){
    const card=btn?.closest?.('.deepV2Card');
    if(!card)return'';
    const url=card.querySelector('.deepV2Actions a[href]')?.href||'';
    return url?exactId(url):'';
  }

  function decorate(){
    document.querySelectorAll('#tracker .focusCard.exactTracked').forEach(card=>{
      const id=cardId(card);
      if(!id||!window.tracks?.[id]?.exactVacancy)return;
      const wrap=card.querySelector('.exactTrackActions')||card.querySelector('.focusTasks');
      if(!wrap)return;
      let b=wrap.querySelector('.prepOpen');
      if(!b){
        b=document.createElement('button');
        b.className='prepOpen';
        b.textContent='Prepare application';
        wrap.insertBefore(b,wrap.firstChild);
      }
      b.dataset.exactTrackId=id;
      b.onclick=e=>{e.preventDefault();e.stopPropagation();go(id)};
    });
  }

  // Capture clicks so later legacy modules cannot replace the preparation
  // behaviour with the retired in-page modal or a Tracker-only redirect.
  document.addEventListener('click',e=>{
    const prep=e.target.closest?.('.prepOpen');
    if(prep){
      const id=prep.dataset.exactTrackId||cardId(prep.closest('.focusCard'));
      if(!id)return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      go(id);
      return;
    }

    const exact=e.target.closest?.('.exactPrepare');
    if(!exact)return;
    const id=dashboardId(exact);
    if(!id)return;
    const tracked=Boolean(window.tracks?.[id])||exact.classList.contains('tracked')||/in tracker/i.test(exact.textContent||'');
    if(tracked){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      go(id);
      return;
    }

    // On the first Dashboard click, allow the existing workflow to create the
    // exact tracked record, then continue directly into Application Studio.
    try{sessionStorage.setItem('opp_prepare_pending',id)}catch{}
    setTimeout(()=>{
      if(window.tracks?.[id]){
        try{sessionStorage.removeItem('opp_prepare_pending')}catch{}
        go(id);
      }
    },180);
  },true);

  // Complete a pending Dashboard -> Tracker transition from a legacy handler.
  function resumePending(){
    let id='';
    try{id=sessionStorage.getItem('opp_prepare_pending')||''}catch{}
    if(!id||!window.tracks?.[id])return;
    try{sessionStorage.removeItem('opp_prepare_pending')}catch{}
    go(id);
  }

  const obs=new MutationObserver(()=>setTimeout(()=>{decorate();resumePending()},20));
  obs.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:statechange',()=>setTimeout(()=>{decorate();resumePending()},20));
  setInterval(decorate,1200);
  setTimeout(()=>{decorate();resumePending()},400);

  window.OpportunityPreparationWorkspace={open:go,close:()=>{},refresh:decorate};
})();