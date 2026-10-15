(()=>{
  const ADVANCED=['degreeStatus','degreeName','graduationYear','graduationDate','degreeCountry','workHours'];
  const BACKUP_KEY='oppPassportAdvancedBackupV1';
  const state=window.OpportunityState;
  if(!state||state.__omPassportCloudCanonical)return;

  const readBackup=()=>{
    try{const x=JSON.parse(localStorage.getItem(BACKUP_KEY)||'{}');return x&&typeof x==='object'?x:{}}
    catch{return{}}
  };
  let backup=readBackup();

  function remember(profile={}){
    let touched=false;
    for(const key of ADVANCED){
      if(Object.prototype.hasOwnProperty.call(profile,key)){
        backup[key]=profile[key];
        touched=true;
      }
    }
    if(touched){try{localStorage.setItem(BACKUP_KEY,JSON.stringify(backup))}catch{}}
  }

  function mergeMissingAdvanced(profile={}){
    const next={...profile};
    for(const key of ADVANCED){
      if(!Object.prototype.hasOwnProperty.call(next,key)&&Object.prototype.hasOwnProperty.call(backup,key))next[key]=backup[key];
    }
    return next;
  }

  remember(state.getProfile?.()||{});
  const originalSetProfile=state.setProfile?.bind(state);
  if(typeof originalSetProfile==='function'){
    state.setProfile=function(profile={}){
      const merged=mergeMissingAdvanced(profile);
      const out=originalSetProfile(merged);
      remember(state.getProfile?.()||merged);
      window.dispatchEvent(new CustomEvent('opportunity:passportchange'));
      return out;
    };
  }

  let renderQueued=false;
  function refreshDashboard(){
    remember(state.getProfile?.()||{});
    if(renderQueued)return;
    renderQueued=true;
    queueMicrotask(()=>{
      renderQueued=false;
      const dash=document.getElementById('dashboard');
      if(dash&&!dash.classList.contains('hide')){
        try{window.renderDashboard?.()}catch(e){console.warn('Passport dashboard refresh skipped',e)}
      }
    });
  }

  window.addEventListener('opportunity:statechange',refreshDashboard);
  window.addEventListener('opportunity:passportchange',refreshDashboard);
  window.addEventListener('focus',()=>{remember(state.getProfile?.()||{})});

  window.addEventListener('opportunity:signedout',()=>{
    backup={};
    try{localStorage.removeItem(BACKUP_KEY)}catch{}
  });
  state.__omPassportCloudCanonical=true;
  window.OpportunityPassportCloudCanonical={
    snapshot:()=>({...backup}),
    refresh:refreshDashboard
  };
})();
