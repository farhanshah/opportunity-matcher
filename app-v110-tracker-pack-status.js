(()=>{
  // Single event-driven owner for the canonical tracker Application Pack status.
  // v109 owns state; this module only presents that state. No observers or polling.
  let scheduled=false;
  let running=false;
  const store=()=>window.tracks||(typeof tracks==='object'&&tracks?tracks:null);

  const style=document.createElement('style');
  style.textContent=`
    /* Once a canonical status exists, the old context is presentation-only legacy.
       Hide it rather than deleting/recreating DOM, which prevents flicker and loops. */
    .focusCard.exactTracked:has([data-om-canonical-pack-status="true"]) .exactTrackContext{display:none!important}
    .focusCard.exactTracked [data-om-canonical-pack-status="true"]{display:block!important;margin-top:9px}
  `;
  document.head.appendChild(style);

  function packHtml(s){
    if(s.sourceMode==='dedicatedPrepare'){
      const docsDone=[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length;
      return `<b>Application pack:</b> ${docsDone===4?'Documents ready':`${docsDone}/4 document gates ready`} · ${s.providerReady?'Final provider check confirmed':'Provider re-check pending'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
    }
    return `<b>Application pack:</b> ${s.evidenceTotal?`${s.drafted}/${s.evidenceTotal} proof areas drafted`:'Evidence mapping in progress'} · ${s.assembled?'Pack assembled':'Pack not assembled'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
  }

  function ensureCard(card){
    const id=card?.dataset?.exactTrackId;
    const tracksStore=store();
    const truth=window.OpportunityStudioTruth;
    if(!id||!tracksStore?.[id]||typeof truth?.getState!=='function')return;
    const state=truth.getState(tracksStore[id]);
    if(!state)return;

    const identity=card.querySelector('.focusIdentity > div:last-child');
    if(!identity)return;

    let canonical=card.querySelector('[data-om-canonical-pack-status="true"]');
    if(!canonical){
      canonical=document.createElement('div');
      canonical.className='exactTrackLine exactPackStatusV133 omCanonicalPackStatus';
      canonical.dataset.omCanonicalPackStatus='true';
    }

    // Keep canonical status OUTSIDE the legacy exactTrackContext so CSS can hide
    // the entire legacy context without hiding the source-of-truth status.
    if(canonical.parentElement!==identity)identity.appendChild(canonical);

    const html=packHtml(state);
    if(canonical.innerHTML!==html)canonical.innerHTML=html;
  }

  function refresh(){
    scheduled=false;
    if(running)return;
    running=true;
    try{
      document.querySelectorAll('#tracker .focusCard.exactTracked[data-exact-track-id]').forEach(ensureCard);
    }finally{running=false}
  }

  function schedule(delay=0){
    if(scheduled)return;
    scheduled=true;
    setTimeout(refresh,delay);
  }

  const previousRender=window.renderTracker;
  if(typeof previousRender==='function'&&!previousRender.__omPackStatusOwner){
    const wrapped=function(...args){
      const out=previousRender.apply(this,args);
      schedule(0);
      return out;
    };
    wrapped.__omPackStatusOwner=true;
    wrapped.__omPrior=previousRender;
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
  }

  window.addEventListener('opportunity:statechange',()=>schedule(0));
  window.addEventListener('opportunity:hydrated',()=>schedule(0));
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle,.prepOpen'))schedule(20);
  },true);

  setTimeout(refresh,80);
  window.OpportunityTrackerPackStatus={refresh,schedule};
})();
