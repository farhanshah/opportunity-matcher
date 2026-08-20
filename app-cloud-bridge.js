(()=>{
  const emit=()=>window.dispatchEvent(new CustomEvent('opportunity:statechange'));
  const wrapMutation=name=>{
    const original=window[name];
    if(typeof original!=='function')return;
    window[name]=function(...args){const result=original.apply(this,args);emit();return result};
    try{eval(`${name}=window['${name}']`)}catch{}
  };
  const exactTracks=()=>Object.fromEntries(Object.entries(tracks||{}).filter(([,t])=>t?.exactVacancy?.url));
  window.OpportunityState={
    getProfile:()=>({...currentProfile}),
    setProfile:p=>{currentProfile=normalizeOldProfile(p||{});localStorage.setItem(PROFILE_KEY,JSON.stringify(currentProfile));renderPassportSummary();},
    getSaved:()=>[...saved],
    setSaved:ids=>{saved=new Set(ids||[]);localStorage.setItem('oppSavedV6',JSON.stringify([...saved]));},
    getTracks:()=>JSON.parse(JSON.stringify(tracks||{})),
    setTracks:value=>{
      const keepExact=exactTracks();
      tracks={...(value||{}),...keepExact};
      localStorage.setItem('oppTracksV6',JSON.stringify(tracks));
    },
    getOpps:()=>opps,
    render:()=>renderAll(),
    clear:()=>{currentProfile={};saved=new Set();tracks={};localStorage.removeItem(PROFILE_KEY);localStorage.removeItem('oppProfileV6');localStorage.removeItem('oppSavedV6');localStorage.removeItem('oppTracksV6');renderAll();}
  };
  ['toggleSave','addTrack','trackStage','checklistToggle'].forEach(wrapMutation);
  const originalSave=window.saveProfileState;
  if(typeof originalSave==='function'){
    window.saveProfileState=function(...args){const r=originalSave.apply(this,args);emit();return r};
    try{saveProfileState=window.saveProfileState}catch{}
  }
  import('/app-cloud-v13.js').catch(err=>console.error('Cloud workspace module failed',err));
})();