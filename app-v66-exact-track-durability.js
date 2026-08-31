(()=>{
  const KEY='oppExactTracksV1',JOURNAL='oppExactJournalV1';
  let renderTimer=null,lastRenderAt=0;
  const readKey=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}};
  const writeKey=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const valid=o=>Object.fromEntries(Object.entries(o||{}).filter(([,t])=>t?.exactVacancy?.url));
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const newer=(a,b)=>{const ta=Date.parse(a||0)||0,tb=Date.parse(b||0)||0;return tb>=ta?b:a};
  const richerText=(a,b)=>{const A=String(a||''),B=String(b||'');if(!A.trim())return B;if(!B.trim())return A;return B.length>=A.length?B:A};
  const trackStore=()=>window.tracks||(typeof tracks==='object'&&tracks?tracks:{});

  function mergeReq(a={},b={}){
    return{...a,...b,evidence:richerText(a.evidence,b.evidence),cvBullet:richerText(a.cvBullet,b.cvBullet),motivation:richerText(a.motivation,b.motivation),updatedAt:newer(a.updatedAt,b.updatedAt)};
  }
  function mergeRolePack(a={},b={}){
    const req={};
    for(const id of new Set([...Object.keys(a.requirementEvidence||{}),...Object.keys(b.requirementEvidence||{})]))req[id]=mergeReq(a.requirementEvidence?.[id],b.requirementEvidence?.[id]);
    return{...a,...b,cvNotes:richerText(a.cvNotes,b.cvNotes),evidenceBank:richerText(a.evidenceBank,b.evidenceBank),motivationDraftText:richerText(a.motivationDraftText,b.motivationDraftText),gapsQuestions:richerText(a.gapsQuestions,b.gapsQuestions),promptedTargets:{...(a.promptedTargets||{}),...(b.promptedTargets||{})},requirementEvidence:req};
  }
  function mergePreparation(a={},b={}){
    const out={...a,...b,rolePack:mergeRolePack(a.rolePack,b.rolePack)};
    out.notes=richerText(a.notes,b.notes);
    out.updatedAt=newer(a.updatedAt,b.updatedAt);
    for(const k of ['eligibilityReviewed','languageChecked','nationalityChecked','educationChecked','fieldChecked','cvReady','educationEvidence','idReady','motivationDraft','referencesChecked']){
      if(a[k]===true||b[k]===true)out[k]=true;else if(typeof b[k]==='boolean')out[k]=b[k];else if(typeof a[k]==='boolean')out[k]=a[k];
    }
    return out;
  }
  function mergeTrack(a={},b={}){
    if(!a||!Object.keys(a).length)return b||{};
    if(!b||!Object.keys(b).length)return a||{};
    return{...a,...b,exactVacancy:{...(a.exactVacancy||{}),...(b.exactVacancy||{})},preparation:mergePreparation(a.preparation,b.preparation)};
  }
  function mergeMaps(...maps){const out={};for(const map of maps)for(const [id,t] of Object.entries(valid(map)))out[id]=mergeTrack(out[id],t);return out}

  const active=()=>valid(trackStore());
  const recoverable=()=>mergeMaps(readKey(JOURNAL),readKey(KEY),active());
  const trackerVisible=()=>{const el=document.getElementById('tracker');return Boolean(el&&!el.classList.contains('hide'))};
  const renderedTitles=()=>new Set([...document.querySelectorAll('#tracker .focusTitle,#tracker .boardTitleV11')].map(x=>norm(x.textContent)).filter(Boolean));
  const expectedTitles=()=>Object.values(active()).map(t=>norm(t?.exactVacancy?.title)).filter(Boolean);

  function trackerNeedsHydration(){
    if(!trackerVisible())return false;
    const expected=expectedTitles();if(!expected.length)return false;
    const shown=renderedTitles();return expected.some(title=>!shown.has(title));
  }

  function ensureTrackerHydrated(force=false){
    if(!trackerVisible())return;
    if(!force&&!trackerNeedsHydration())return;
    const now=Date.now();if(now-lastRenderAt<250)return;
    clearTimeout(renderTimer);
    renderTimer=setTimeout(()=>{
      if(!trackerVisible())return;
      lastRenderAt=Date.now();
      try{window.renderTracker?.()}catch(e){console.warn('Exact tracker hydration render failed',e)}
      setTimeout(()=>{
        try{window.OpportunityExactTrackerPolish?.refresh?.()}catch{}
        try{window.OpportunityExactBoardBridge?.refresh?.()}catch{}
        try{window.OpportunityTrackerPackStatus?.schedule?.(0)}catch{}
      },20);
    },0);
  }

  function save(){
    const merged=recoverable();
    writeKey(KEY,merged);
    writeKey(JOURNAL,mergeMaps(readKey(JOURNAL),active()));
  }

  function remove(id){
    for(const k of [KEY,JOURNAL]){const x=readKey(k);delete x[id];writeKey(k,x)}
  }

  function restore(){
    const current=trackStore();
    const stored=mergeMaps(readKey(JOURNAL),readKey(KEY));
    let changed=false,richened=false;
    for(const [id,t] of Object.entries(stored)){
      if(!t?.exactVacancy?.url)continue;
      if(!current[id]){current[id]=t;changed=true;continue}
      const merged=mergeTrack(t,current[id]);
      if(JSON.stringify(merged)!==JSON.stringify(current[id])){current[id]=merged;richened=true}
    }
    if(changed||richened){
      try{localStorage.setItem('oppTracksV6',JSON.stringify(current))}catch{}
      writeKey(KEY,recoverable());
      setTimeout(()=>window.renderDashboard?.(),0);
    }
    ensureTrackerHydrated(changed||richened);
    return changed||richened;
  }

  restore();

  const oldPersist=window.persist;
  if(typeof oldPersist==='function'&&!oldPersist.__omExactDurability){
    const wrapped=function(...args){const out=oldPersist.apply(this,args);save();ensureTrackerHydrated();return out};
    wrapped.__omExactDurability=true;
    try{persist=wrapped}catch{}
    window.persist=wrapped;
  }

  window.addEventListener('beforeunload',save);
  window.addEventListener('pagehide',save);
  window.addEventListener('opportunity:statechange',()=>{restore();save();ensureTrackerHydrated()});
  window.addEventListener('opportunity:hydrated',()=>{restore();ensureTrackerHydrated()});
  window.addEventListener('popstate',()=>setTimeout(()=>{restore();ensureTrackerHydrated()},40));
  window.addEventListener('focus',()=>{restore();ensureTrackerHydrated()});
  window.addEventListener('storage',e=>{
    if([KEY,JOURNAL,'oppTracksV6'].includes(e.key))setTimeout(()=>{restore();ensureTrackerHydrated()},0);
  });

  window.OpportunityExactTrackDurability={save,restore,remove,mergeTrack,hydrate:()=>ensureTrackerHydrated(true),status:()=>({stored:Object.keys(valid(readKey(KEY))).length,journal:Object.keys(valid(readKey(JOURNAL))).length,active:Object.keys(active()).length,visible:trackerVisible(),missing:trackerNeedsHydration()})};
})();
