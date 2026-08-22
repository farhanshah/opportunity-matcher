(()=>{
  const KEY='oppExactTracksV1',JOURNAL='oppExactJournalV1';
  const readKey=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}};
  const writeKey=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const valid=o=>Object.fromEntries(Object.entries(o||{}).filter(([,t])=>t?.exactVacancy?.url));
  const active=()=>valid(tracks||{});
  const recoverable=()=>({...valid(readKey(JOURNAL)),...valid(readKey(KEY)),...active()});
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
      setTimeout(()=>window.renderTracker?.(),0);
      setTimeout(()=>window.renderDashboard?.(),0);
    }
  }
  restore();
  const oldPersist=window.persist;
  if(typeof oldPersist==='function'){
    const wrapped=function(...args){const out=oldPersist.apply(this,args);save();return out};
    try{persist=wrapped}catch{}window.persist=wrapped;
  }
  window.addEventListener('opportunity:statechange',()=>{restore();save()});
  setInterval(()=>{restore();save()},500);
  window.OpportunityExactTrackDurability={save,restore,remove,status:()=>({stored:Object.keys(valid(readKey(KEY))).length,journal:Object.keys(valid(readKey(JOURNAL))).length,active:Object.keys(active()).length})};
})();
