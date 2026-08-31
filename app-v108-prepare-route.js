(()=>{
  const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
  const exactId=url=>`exact_${hash(url)}`;
  let scheduled=false;

  const style=document.createElement('style');
  style.textContent=`
    #tracker .prepOpen{display:inline-flex;align-items:center;justify-content:center;border:1px solid #d8ff69;background:#d8ff69;color:#151923;border-radius:10px;padding:9px 11px;font-size:8px;font-weight:950;line-height:1;white-space:nowrap;cursor:pointer}
    #tracker .prepOpen:hover{filter:brightness(.96);transform:translateY(-1px)}
    #tracker .prepOpen.isComplete{background:rgba(216,255,105,.09);color:#d8ff69;border-color:rgba(216,255,105,.32)}
    @media(max-width:760px){#tracker .prepOpen{width:100%}}
  `;
  document.head.appendChild(style);

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

  function buttonState(id){
    const t=(typeof tracks==='object'&&tracks?.[id])||window.tracks?.[id];
    if(!t)return{label:'Prepare application ↗',complete:false};
    let s=null;
    try{s=window.OpportunityStudioTruth?.getState?.(t)||null}catch{}
    if(s?.sourceMode==='dedicatedPrepare'){
      if(s.progress>=100||s.finalReady)return{label:'View application pack ↗',complete:true};
      if(s.progress>0)return{label:'Continue preparation ↗',complete:false};
    }
    return{label:'Prepare application ↗',complete:false};
  }

  function ensureTrackerPrepareButtons(){
    scheduled=false;
    document.querySelectorAll('#tracker .focusCard[data-exact-track-id]').forEach(card=>{
      const id=card.dataset.exactTrackId;if(!id)return;
      const tasks=card.querySelector('.focusTasks');if(!tasks)return;
      let wrap=tasks.querySelector('.exactTrackActions');
      if(!wrap){wrap=document.createElement('div');wrap.className='exactTrackActions';tasks.appendChild(wrap)}
      let btn=wrap.querySelector('.prepOpen');
      if(!btn){
        btn=document.createElement('button');btn.type='button';btn.className='prepOpen';btn.dataset.exactTrackId=id;
        const official=wrap.querySelector('.exactOfficial');
        if(official)wrap.insertBefore(btn,official);else wrap.appendChild(btn);
      }
      const state=buttonState(id);
      if(btn.textContent!==state.label)btn.textContent=state.label;
      btn.classList.toggle('isComplete',state.complete);
      btn.title=state.complete?'Open the completed Application Studio pack':'Open Application Studio';
    });
  }

  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(ensureTrackerPrepareButtons)}

  document.addEventListener('click',e=>{
    const target=e.target.closest?.('button,a');if(!target)return;
    const prep=target.closest?.('.prepOpen');
    if(prep){
      const card=prep.closest('.focusCard');
      const id=card?.dataset?.exactTrackId||prep.dataset?.exactTrackId;if(!id)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();go(id);return;
    }

    const exact=target.closest?.('.exactPrepare');if(!exact)return;
    const id=exactButtonId(exact);if(!id)return;
    const alreadyTracked=Boolean(window.tracks?.[id])||exact.classList.contains('tracked')||/in tracker/i.test(exact.textContent||'');
    if(alreadyTracked){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();go(id);return}
    try{sessionStorage.setItem('opp_prepare_pending',id)}catch{}
    setTimeout(()=>go(id),90);
  },true);

  const pending=(()=>{try{return sessionStorage.getItem('opp_prepare_pending')||''}catch{return''}})();
  if(pending&&location.pathname==='/tracker'){
    try{sessionStorage.removeItem('opp_prepare_pending')}catch{}
    setTimeout(()=>go(pending),120);
  }

  const oldRender=window.renderTracker;
  if(typeof oldRender==='function'&&!oldRender.__omPrepareRouteV164){
    const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};
    wrapped.__omPrepareRouteV164=true;
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
  }

  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle'))schedule()},true);
  schedule();

  const existing=window.OpportunityPreparationWorkspace;
  if(existing&&typeof existing==='object')existing.open=go;
  window.OpportunityPrepareRoute={open:go,refresh:schedule};
})();