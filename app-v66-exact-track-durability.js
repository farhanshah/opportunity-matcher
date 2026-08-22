(()=>{
  const KEY='oppExactTracksV1',JOURNAL='oppExactJournalV1';
  let renderTimer=null,lastRenderAt=0;
  const readKey=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}};
  const writeKey=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const valid=o=>Object.fromEntries(Object.entries(o||{}).filter(([,t])=>t?.exactVacancy?.url));
  const active=()=>valid(tracks||{});
  const recoverable=()=>({...valid(readKey(JOURNAL)),...valid(readKey(KEY)),...active()});
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
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
    const now=Date.now();if(now-lastRenderAt<140)return;
    clearTimeout(renderTimer);renderTimer=setTimeout(()=>{
      if(!trackerVisible())return;
      lastRenderAt=Date.now();
      try{window.renderTracker?.()}catch(e){console.warn('Exact tracker hydration render failed',e)}
      setTimeout(()=>{try{window.OpportunityExactTrackerPolish?.refresh?.()}catch{};try{window.OpportunityExactBoardBridge?.refresh?.()}catch{}},30);
    },0);
  }
  function save(){
    const merged=recoverable();
    writeKey(KEY,merged);
    writeKey(JOURNAL,{...valid(readKey(JOURNAL)),...active()});
  }
  function remove(id){
    for(const k of [KEY,JOURNAL]){const x=readKey(k);delete x[id];writeKey(k,x)}
  }
  function restore(){
    const stored=recoverable();let changed=false;
    for(const [id,t] of Object.entries(stored)){
      if(!t?.exactVacancy?.url)continue;
      if(!tracks?.[id]){tracks[id]=t;changed=true}
    }
    if(changed){
      try{localStorage.setItem('oppTracksV6',JSON.stringify(tracks))}catch{}
      writeKey(KEY,recoverable());
      setTimeout(()=>window.renderDashboard?.(),0);
    }
    ensureTrackerHydrated(changed);
    return changed;
  }
  restore();
  const oldPersist=window.persist;
  if(typeof oldPersist==='function'){
    const wrapped=function(...args){const out=oldPersist.apply(this,args);save();ensureTrackerHydrated();return out};
    try{persist=wrapped}catch{}window.persist=wrapped;
  }
  window.addEventListener('opportunity:statechange',()=>{restore();save();ensureTrackerHydrated()});
  window.addEventListener('popstate',()=>setTimeout(()=>{restore();ensureTrackerHydrated()},40));
  const cloudPill=document.getElementById('cloudSyncPill');
  if(cloudPill)new MutationObserver(()=>setTimeout(()=>{restore();ensureTrackerHydrated(true)},40)).observe(cloudPill,{childList:true,subtree:true,characterData:true});
  setInterval(()=>{restore();save();ensureTrackerHydrated()},500);
  window.OpportunityExactTrackDurability={save,restore,remove,hydrate:()=>ensureTrackerHydrated(true),status:()=>({stored:Object.keys(valid(readKey(KEY))).length,journal:Object.keys(valid(readKey(JOURNAL))).length,active:Object.keys(active()).length,visible:trackerVisible(),missing:trackerNeedsHydration()})};
})();
