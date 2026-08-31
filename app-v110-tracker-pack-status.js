(()=>{
  // Single, event-driven owner of the tracker Application Pack status.
  // State comes only from OpportunityStudioTruth (v109). No observers or polling.
  let scheduled=false;
  let running=false;

  const clean=v=>String(v||'').replace(/\s+/g,' ').trim().toLowerCase();
  const store=()=>window.tracks||(typeof tracks==='object'&&tracks?tracks:null);

  function packHtml(s){
    if(s.sourceMode==='dedicatedPrepare'){
      const docsDone=[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length;
      return `<b>Application pack:</b> ${docsDone===4?'Documents ready':`${docsDone}/4 document gates ready`} · ${s.providerReady?'Final provider check confirmed':'Provider re-check pending'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
    }
    return `<b>Application pack:</b> ${s.evidenceTotal?`${s.drafted}/${s.evidenceTotal} proof areas drafted`:'Evidence mapping in progress'} · ${s.assembled?'Pack assembled':'Pack not assembled'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
  }

  function packNodes(card){
    const nodes=[...card.querySelectorAll('div,p,span')].filter(el=>clean(el.textContent).startsWith('application pack:'));
    return nodes.filter(el=>!nodes.some(other=>other!==el&&el.contains(other)));
  }

  function ensureCard(card){
    const id=card?.dataset?.exactTrackId;
    const tracksStore=store();
    const truth=window.OpportunityStudioTruth;
    if(!id||!tracksStore?.[id]||typeof truth?.getState!=='function')return;

    const state=truth.getState(tracksStore[id]);
    if(!state)return;

    let canonical=card.querySelector('[data-om-canonical-pack-status="true"]');
    const nodes=packNodes(card);

    // Remove only leaf status rows. Never remove an identity/context parent.
    for(const node of nodes){
      if(node!==canonical)node.remove();
    }

    if(!canonical?.isConnected){
      const identity=card.querySelector('.focusIdentity > div:last-child');
      if(!identity)return;
      let context=identity.querySelector('.exactTrackContext');
      if(!context){
        context=document.createElement('div');
        context.className='exactTrackContext';
        identity.appendChild(context);
      }
      canonical=document.createElement('div');
      canonical.className='exactTrackLine exactPackStatusV133';
      canonical.dataset.omCanonicalPackStatus='true';
      context.appendChild(canonical);
    }

    const html=packHtml(state);
    if(canonical.innerHTML!==html)canonical.innerHTML=html;
  }

  function refresh(){
    scheduled=false;
    if(running)return;
    running=true;
    try{
      document.querySelectorAll('#tracker .focusCard.exactTracked[data-exact-track-id]').forEach(ensureCard);
    }finally{
      running=false;
    }
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
