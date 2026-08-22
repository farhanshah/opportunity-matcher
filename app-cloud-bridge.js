(()=>{
  const EXACT_KEY='oppExactTracksV1',JOURNAL='oppExactJournalV1';
  const emit=()=>window.dispatchEvent(new CustomEvent('opportunity:statechange'));
  const wrapMutation=name=>{
    const original=window[name];
    if(typeof original!=='function')return;
    window[name]=function(...args){const result=original.apply(this,args);emit();return result};
    try{eval(`${name}=window['${name}']`)}catch{}
  };
  const valid=o=>Object.fromEntries(Object.entries(o||{}).filter(([,t])=>t?.exactVacancy?.url));
  const readKey=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'{}');return x&&typeof x==='object'?valid(x):{}}catch{return{}}};
  const currentExact=()=>valid(tracks||{});
  const preservedExact=()=>({...readKey(JOURNAL),...readKey(EXACT_KEY),...currentExact()});
  window.OpportunityState={
    getProfile:()=>({...currentProfile}),
    setProfile:p=>{currentProfile=normalizeOldProfile(p||{});localStorage.setItem(PROFILE_KEY,JSON.stringify(currentProfile));renderPassportSummary();},
    getSaved:()=>[...saved],
    setSaved:ids=>{saved=new Set(ids||[]);localStorage.setItem('oppSavedV6',JSON.stringify([...saved]));},
    getTracks:()=>JSON.parse(JSON.stringify(tracks||{})),
    setTracks:value=>{
      const keepExact=preservedExact();
      tracks={...(value||{}),...keepExact};
      localStorage.setItem('oppTracksV6',JSON.stringify(tracks));
      if(Object.keys(keepExact).length){
        localStorage.setItem(EXACT_KEY,JSON.stringify({...readKey(EXACT_KEY),...keepExact}));
        localStorage.setItem(JOURNAL,JSON.stringify({...readKey(JOURNAL),...keepExact}));
      }
    },
    getOpps:()=>opps,
    render:()=>renderAll(),
    clear:()=>{currentProfile={};saved=new Set();tracks={};localStorage.removeItem(PROFILE_KEY);localStorage.removeItem('oppProfileV6');localStorage.removeItem('oppSavedV6');localStorage.removeItem('oppTracksV6');localStorage.removeItem(EXACT_KEY);localStorage.removeItem(JOURNAL);renderAll();}
  };
  ['toggleSave','addTrack','trackStage','checklistToggle'].forEach(wrapMutation);
  const originalSave=window.saveProfileState;
  if(typeof originalSave==='function'){
    window.saveProfileState=function(...args){const r=originalSave.apply(this,args);emit();return r};
    try{saveProfileState=window.saveProfileState}catch{}
  }
  import('/app-cloud-v13.js').catch(err=>console.error('Cloud workspace module failed',err));
})();
