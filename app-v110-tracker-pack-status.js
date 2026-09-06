(()=>{
  // Single event-driven owner for the Tracker Application Pack status.
  // v109 owns truth; this module only adopts/presents one existing row.
  let scheduled=false;
  let running=false;
  const store=()=>window.tracks||(typeof tracks==='object'&&tracks?tracks:null);
  const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();

  function documentPolicy(t){
    const f=t?.preparation?.rolePack?.finalApplication||{};
    const policy=f.providerDocumentPolicy||{};
    const writingNotRequested=Boolean(f.writingSampleNotRequested)||policy.writingSample==='not_requested';
    const pdfNotRequested=Boolean(f.singlePdfNotRequested)||policy.combinedPdf==='not_requested';
    return{writingNotRequested,pdfNotRequested,notRequestedCount:Number(writingNotRequested)+Number(pdfNotRequested)};
  }

  function packHtml(s,t){
    if(s.sourceMode==='dedicatedPrepare'){
      const policy=documentPolicy(t);
      const required=[
        {ready:s.cvReady,notRequested:false},
        {ready:s.motReady,notRequested:false},
        {ready:s.writingReady,notRequested:policy.writingNotRequested},
        {ready:s.pdfReady,notRequested:policy.pdfNotRequested}
      ];
      const requiredDocs=required.filter(x=>!x.notRequested);
      const requiredDone=requiredDocs.filter(x=>x.ready).length;
      const requiredReady=requiredDocs.length>0&&requiredDone===requiredDocs.length;
      const docCopy=requiredReady?'Required documents ready':`${requiredDone}/${requiredDocs.length} required documents ready`;
      const omitted=policy.notRequestedCount?` · ${policy.notRequestedCount} document requirement${policy.notRequestedCount===1?'':'s'} not requested`:'';
      return `<b>Application pack:</b> ${docCopy} · ${s.providerReady?'Final provider check confirmed':'Provider re-check pending'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded${omitted}`;
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
    const track=tracksStore[id];
    const state=truth.getState(track);
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
    const html=packHtml(state,track);
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

  function settle(){
    schedule(0);
    setTimeout(()=>schedule(0),140);
    setTimeout(()=>schedule(0),280);
  }

  const previousRender=window.renderTracker;
  if(typeof previousRender==='function'&&!previousRender.__omPackStatusOwner){
    const wrapped=function(...args){
      const out=previousRender.apply(this,args);
      settle();
      return out;
    };
    wrapped.__omPackStatusOwner=true;
    wrapped.__omPrior=previousRender;
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
  }

  window.addEventListener('opportunity:statechange',settle);
  window.addEventListener('opportunity:hydrated',settle);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle,.prepOpen'))settle();
  },true);

  settle();
  window.OpportunityTrackerPackStatus={refresh:settle,schedule};
})();
