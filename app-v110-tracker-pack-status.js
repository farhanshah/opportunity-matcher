(()=>{
  // v109 is the only source of application-preparation truth.
  // This module only guarantees that the tracker has one canonical pack-status node
  // and removes any legacy status strip left behind by older renderers.
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
    const nodes=[...card.querySelectorAll('div,p,span')].filter(el=>clean(el.textContent).includes('application pack:'));
    // Keep only the deepest matching elements so a parent container is never removed.
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
    for(const node of packNodes(card)){
      if(node!==canonical)node.remove();
    }

    if(!canonical?.isConnected){
      const context=card.querySelector('.exactTrackContext');
      if(!context)return;
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
      document.querySelectorAll('#tracker .focusCard[data-exact-track-id]').forEach(ensureCard);
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
  if(typeof previousRender==='function'&&!previousRender.__omPackDomGuard){
    const wrapped=function(...args){
      const out=previousRender.apply(this,args);
      schedule(35);
      return out;
    };
    wrapped.__omPackDomGuard=true;
    wrapped.__omPrior=previousRender;
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
  }

  const tracker=document.getElementById('tracker');
  if(tracker){
    const observer=new MutationObserver(mutations=>{
      if(running)return;
      if(mutations.some(m=>m.type==='childList'))schedule(0);
    });
    observer.observe(tracker,{subtree:true,childList:true});
  }

  window.addEventListener('opportunity:statechange',()=>schedule(30));
  window.addEventListener('opportunity:hydrated',()=>schedule(30));
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.navbtn[data-v="tracker"],#tracker .viewToggle button,.prepOpen'))schedule(60);
  },true);

  setTimeout(refresh,120);
  window.OpportunityTrackerPackStatus={refresh,schedule};
})();