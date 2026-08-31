(()=>{
  // Preparation now lives on /prepare. Keep only lightweight routing/decorating
  // on the main workspace; no DOM observers or polling loops.
  const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
  const exactId=url=>`exact_${hash(url)}`;
  let scheduled=false;

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

  function cardId(card){return card?.dataset?.exactTrackId||''}

  function dashboardId(btn){
    const card=btn?.closest?.('.deepV2Card');
    if(!card)return'';
    const url=card.querySelector('.deepV2Actions a[href]')?.href||'';
    return url?exactId(url):'';
  }

  function decorate(){
    scheduled=false;
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

  function schedule(delay=0){
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{decorate();resumePending()},delay);
  }

  document.addEventListener('click',e=>{
    const prep=e.target.closest?.('.prepOpen');
    if(prep){
      const id=prep.dataset.exactTrackId||cardId(prep.closest('.focusCard'));
      if(!id)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();go(id);return;
    }

    const exact=e.target.closest?.('.exactPrepare');
    if(!exact)return;
    const id=dashboardId(exact);
    if(!id)return;
    const tracked=Boolean(window.tracks?.[id])||exact.classList.contains('tracked')||/in tracker/i.test(exact.textContent||'');
    if(tracked){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();go(id);return;
    }

    try{sessionStorage.setItem('opp_prepare_pending',id)}catch{}
    setTimeout(()=>{
      if(window.tracks?.[id]){
        try{sessionStorage.removeItem('opp_prepare_pending')}catch{}
        go(id);
      }
    },180);
  },true);

  function resumePending(){
    let id='';
    try{id=sessionStorage.getItem('opp_prepare_pending')||''}catch{}
    if(!id||!window.tracks?.[id])return;
    try{sessionStorage.removeItem('opp_prepare_pending')}catch{}
    go(id);
  }

  const oldRender=window.renderTracker;
  if(typeof oldRender==='function'&&!oldRender.__omPrepareRoute){
    const wrapped=function(...args){
      const out=oldRender.apply(this,args);
      schedule(0);
      return out;
    };
    wrapped.__omPrepareRoute=true;
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
  }

  window.addEventListener('opportunity:statechange',()=>schedule(20));
  window.addEventListener('opportunity:hydrated',()=>schedule(20));
  window.addEventListener('popstate',()=>schedule(20));
  setTimeout(()=>schedule(0),120);

  window.OpportunityPreparationWorkspace={open:go,close:()=>{},refresh:decorate};
})();
