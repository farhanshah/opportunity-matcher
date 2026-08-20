(()=>{
  const KEY='oppExactTracksV1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return{}}};
  const exactOnly=()=>Object.fromEntries(Object.entries(tracks||{}).filter(([,t])=>t?.exactVacancy?.url));
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(exactOnly()))}catch{}
  }
  function restore(){
    const stored=read();let changed=false;
    for(const [id,t] of Object.entries(stored)){
      if(!t?.exactVacancy?.url)continue;
      if(!tracks?.[id]){tracks[id]=t;changed=true}
    }
    if(changed){
      try{localStorage.setItem('oppTracksV6',JSON.stringify(tracks))}catch{}
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
  setInterval(()=>{restore();save()},900);
  window.OpportunityExactTrackDurability={save,restore};
})();