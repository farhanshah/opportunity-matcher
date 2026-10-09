(()=>{
  const VERSION='v247';
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

  function routeFor(id){
    const t=(typeof tracks==='object'&&tracks?.[id])||window.tracks?.[id];
    if(!t)return null;
    if(t.exactVacancy?.url)return t.exactVacancy;
    const o=(typeof opps!=='undefined'&&Array.isArray(opps))?opps.find(x=>String(x?.Opportunity_ID)===String(id)):null;
    if(!o)return t.prepareMeta?.url?t.prepareMeta:null;
    let ev=null,route=null;
    try{ev=typeof evaluate==='function'?evaluate(o):null}catch{}
    try{route=window.OpportunityCountryRoutes?.routeInfo?.(o)?.primary||null}catch{}
    const labels=(ev?.checks||[]).map(x=>String(x?.label||'').toLowerCase());
    const signals=[];
    if(labels.some(x=>/country|nationality|residence/.test(x)))signals.push({label:'nationality / residence requirement'});
    if(labels.some(x=>/education|degree|academic/.test(x)))signals.push({label:'education requirement'});
    if(labels.some(x=>/field|study|discipline/.test(x)))signals.push({label:'field / academic discipline requirement'});
    if(labels.some(x=>/work|experience|hours/.test(x)))signals.push({label:'post-degree work-experience requirement'});
    if(labels.some(x=>/english|language/.test(x)))signals.push({label:'language requirement'});
    t.prepareMeta={
      sourceKind:'programme',
      title:o.Opportunity_Name||'Tracked opportunity',
      provider:o.Provider||'Official provider',
      organization:o.Provider||'Official provider',
      url:route?.application_url||o.Application_URL||o.Official_Source_URL||'',
      officialUrl:route?.official_source_url||o.Official_Source_URL||o.Application_URL||'',
      deadline:route?.deadline_text||route?.close_date||o.Close_Date||'',
      location:o.Destination||'',
      work_mode:o.Destination||'',
      type:o.Type||'Opportunity',
      funding:o.Funding||'',
      badge:ev?.label||'Tracked programme',
      why:typeof whySnippet==='function'?whySnippet(ev||{checks:[]}):'Tracked from your verified opportunity list.',
      readiness:'Re-check the official provider guidance before preparing or submitting.',
      signals,
      seededAt:new Date().toISOString()
    };
    try{typeof persist==='function'&&persist()}catch{}
    return t.prepareMeta;
  }

  function go(id){
    if(!id)return;
    const route=routeFor(id);
    if(!route?.url)return;
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
    if(t.prepareMeta?.sourceKind==='programme'){
      const p=t.preparation||{};
      const f=p.rolePack?.finalApplication||{};
      const done=[p.programmeDocumentsReady,p.programmeStatementReady,p.programmeReferencesReady].filter(Boolean).length;
      const provider=Boolean(f.providerCheckedAt);
      if(done===3&&provider)return{label:'View application pack ↗',complete:true};
      if(done>0||p.eligibilityReviewed)return{label:'Continue preparation ↗',complete:false};
      return{label:'Prepare application ↗',complete:false};
    }
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
    document.querySelectorAll('#tracker .focusCard').forEach(card=>{
      const id=card.dataset.exactTrackId||card.dataset.trackId;
      if(!id)return;
      const t=(typeof tracks==='object'&&tracks?.[id])||window.tracks?.[id];
      if(!t)return;
      const tasks=card.querySelector('.focusTasks');if(!tasks)return;
      const locked=[...card.classList].some(x=>x.startsWith('omEligibilityFirstV'));
      const stageText=String(card.querySelector('.focusStage b')?.textContent||t.stage||'').trim();
      const closed=/^closed$/i.test(stageText)||/deadline passed|local cycle closed/i.test(card.textContent||'');
      let wrap=tasks.querySelector('.exactTrackActions');
      let btn=tasks.querySelector('.prepOpen');
      if(!btn){
        btn=document.createElement('button');btn.type='button';btn.className='prepOpen';btn.dataset.exactTrackId=id;
        if(wrap){
          const official=wrap.querySelector('.exactOfficial');
          if(official)wrap.insertBefore(btn,official);else wrap.appendChild(btn);
        }else{
          const analysis=tasks.querySelector('.focusOpen');
          if(analysis)tasks.insertBefore(btn,analysis);else tasks.appendChild(btn);
        }
      }
      btn.dataset.exactTrackId=id;
      btn.disabled=false;
      routeFor(id);
      const state=buttonState(id);

      if(closed){
        delete btn.dataset.eligibilityRedirect;
        if(state.complete||state.label!=='Prepare application ↗'){
          btn.removeAttribute('aria-disabled');
          btn.textContent='View saved pack ↗';
          btn.classList.add('isComplete');
          btn.title='Open the saved application pack for reference';
        }else{
          btn.disabled=true;
          btn.setAttribute('aria-disabled','true');
          btn.textContent='Closed';
          btn.classList.remove('isComplete');
          btn.title='Provider deadline passed';
        }
        return;
      }

      if(locked){
        btn.removeAttribute('aria-disabled');
        btn.dataset.eligibilityRedirect='1';
        btn.textContent='Eligibility check first ↗';
        btn.title='Open the eligibility check that must be resolved before preparation';
        return;
      }
      delete btn.dataset.eligibilityRedirect;
      btn.removeAttribute('aria-disabled');
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
      const id=card?.dataset?.exactTrackId||card?.dataset?.trackId||prep.dataset?.exactTrackId;if(!id)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const locked=[...card.classList].some(x=>x.startsWith('omEligibilityFirstV'));
      if(locked||prep.dataset.eligibilityRedirect==='1'){
        const resolve=card.querySelector('.focusOpen');
        if(resolve){
          resolve.click();
          return;
        }
        return;
      }
      go(id);return;
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