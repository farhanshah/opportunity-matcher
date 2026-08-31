(()=>{
  // Single event-driven owner for the Tracker Application Pack status.
  // v109 owns truth; this module only adopts/presents one existing row.
  let scheduled=false;
  let running=false;
  const store=()=>window.tracks||(typeof tracks==='object'&&tracks?tracks:null);
  const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();

  function packHtml(s){
    if(s.sourceMode==='dedicatedPrepare'){
      const docsDone=[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length;
      return `<b>Application pack:</b> ${docsDone===4?'Documents ready':`${docsDone}/4 document gates ready`} · ${s.providerReady?'Final provider check confirmed':'Provider re-check pending'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
    }
    return `<b>Application pack:</b> ${s.evidenceTotal?`${s.drafted}/${s.evidenceTotal} proof areas drafted`:'Evidence mapping in progress'} · ${s.assembled?'Pack assembled':'Pack not assembled'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
  }

  function leafPackRows(card){
    return [...card.querySelectorAll('div,span,p,small')].filter(el=>{
      if(!/^Application pack:/i.test(text(el)))return false;
      return ![...el.querySelectorAll('div,span,p,small')].some(ch=>ch!==el&&/^Application pack:/i.test(text(ch)));
    });
  }

  function ensureCard(card){
    const id=card?.dataset?.exactTrackId;
    const tracksStore=store();
    const truth=window.OpportunityStudioTruth;
    if(!id||!tracksStore?.[id]||typeof truth?.getState!=='function')return;
    const state=truth.getState(tracksStore[id]);
    if(!state)return;

    let rows=leafPackRows(card);
    let canonical=card.querySelector('[data-om-canonical-pack-status="true"]');

    // Adopt the legacy cream row when it exists rather than creating a second row.
    if(!canonical){
      canonical=rows.find(el=>/proof areas drafted|pack not assembled/i.test(text(el)))||rows[0];
      if(!canonical){
        const identity=card.querySelector('.focusIdentity > div:last-child');
        if(!identity)return;
        canonical=document.createElement('div');
        canonical.className='exactTrackLine';
        identity.appendChild(canonical);
      }
      canonical.dataset.omCanonicalPackStatus='true';
      canonical.classList.add('exactPackStatusV133','omCanonicalPackStatus');
    }

    canonical.hidden=false;
    canonical.style.removeProperty('display');
    canonical.removeAttribute('aria-hidden');
    const html=packHtml(state);
    if(canonical.innerHTML!==html)canonical.innerHTML=html;

    // Hide only extra leaf-level pack rows. No observers, removals or parent hiding.
    rows=leafPackRows(card);
    rows.forEach(el=>{
      if(el===canonical)return;
      el.hidden=true;
      el.style.display='none';
      el.setAttribute('aria-hidden','true');
    });
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
