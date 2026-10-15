(()=>{
  const EXACT_KEY='oppExactTracksV1',JOURNAL='oppExactJournalV1';
  const emit=()=>window.dispatchEvent(new CustomEvent('opportunity:statechange'));
  const wrapMutation=name=>{
    const original=window[name];
    if(typeof original!=='function')return;
    window[name]=function(...args){const result=original.apply(this,args);emit();return result};
    // Avoid executing generated JavaScript; supported mutations are explicit.
    try{
      switch(name){
        case 'toggleSave': toggleSave=window.toggleSave;break;
        case 'addTrack': addTrack=window.addTrack;break;
        case 'trackStage': trackStage=window.trackStage;break;
        case 'checklistToggle': checklistToggle=window.checklistToggle;break;
      }
    }catch{}
  };
  const valid=o=>Object.fromEntries(Object.entries(o||{}).filter(([,t])=>t?.exactVacancy?.url));
  const readKey=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'{}');return x&&typeof x==='object'?valid(x):{}}catch{return{}}};
  const currentExact=()=>valid(tracks||{});
  const preservedExact=()=>({...readKey(JOURNAL),...readKey(EXACT_KEY),...currentExact()});

  const earlyExact=preservedExact();
  if(Object.keys(earlyExact).length){
    tracks={...(tracks||{}),...earlyExact};
    try{localStorage.setItem('oppTracksV6',JSON.stringify(tracks))}catch{}
  }

  function syntheticExact(id,m={}){
    const base=Array.isArray(opps)?opps.find(o=>o.Opportunity_ID===m.programmeId):null;
    return{
      Opportunity_ID:id,
      Opportunity_Name:m.title||'Verified vacancy',
      Provider:m.provider||base?.Provider||'Official provider',
      Type:base?.Type||'Internship',
      Destination:m.location||base?.Destination||'See vacancy',
      Funding:base?.Funding||'Varies',
      Status:'Open',
      Close_Date:m.deadline||'',
      Application_URL:m.url||'',
      Official_Source_URL:m.url||'',
      Last_Verified:(m.addedAt||'').slice(0,10),
      Benefits:Array.isArray(base?.Benefits)?base.Benefits:[],
      Eligibility_Notes:'Tracked from a verified exact vacancy. Re-check the official posting before submission.'
    };
  }
  function withExactOpps(fn){
    if(!Array.isArray(opps))return fn();
    const added=[];
    for(const [id,t] of Object.entries(tracks||{})){
      const m=t?.exactVacancy;if(!m?.url||opps.some(o=>o.Opportunity_ID===id))continue;
      opps.push(syntheticExact(id,m));added.push(id);
    }
    try{return fn()}finally{
      if(!added.length)return;
      for(let i=opps.length-1;i>=0;i--)if(added.includes(opps[i]?.Opportunity_ID))opps.splice(i,1);
    }
  }

  const originalRenderTracker=window.renderTracker;
  if(typeof originalRenderTracker==='function'){
    const wrappedTracker=function(){return withExactOpps(()=>originalRenderTracker())};
    try{renderTracker=wrappedTracker}catch{}
    window.renderTracker=wrappedTracker;
  }

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
  import('/app-cloud-v13.js?build=20261015-v273').catch(err=>console.error('Cloud workspace module failed',err));
})();
