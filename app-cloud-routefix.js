(()=>{
  const ROUTE_FLAG='oppCloudRouteAfterAuth';
  const STAY_PUBLIC='oppCloudStayPublic';
  let routed=false,patched=false;

  const tracksCount=()=>{
    try{return Object.keys(window.OpportunityState?.getTracks?.()||{}).length}catch{return 0}
  };
  const hasPassport=()=>{
    try{const p=window.OpportunityState?.getProfile?.()||{};return Boolean(p.nat&&p.edu&&p.field)}catch{return false}
  };
  const cloudReady=()=>document.getElementById('cloudSyncPill')?.textContent?.trim()==='Cloud synced';
  const signedIn=()=>document.getElementById('cloudAccountEntry')?.classList.contains('cloudAccountBtn')&&!document.getElementById('cloudAccountEntry')?.classList.contains('signedOut');

  function enterWorkspace(force=false){
    if(routed)return false;
    if(!force&&sessionStorage.getItem(STAY_PUBLIC)==='1')return false;
    if(!signedIn()||!cloudReady()||!hasPassport())return false;
    try{
      sessionStorage.removeItem(ROUTE_FLAG);
      sessionStorage.removeItem(STAY_PUBLIC);
      window.showApp?.();
      const view=tracksCount()>0?'tracker':'discover';
      window.setView?.(view);
      routed=true;
      return true;
    }catch(e){console.warn('Cloud route restore failed',e);return false}
  }

  function patchNavigation(){
    if(patched||!window.OpportunityCloud)return;
    patched=true;

    const originalEmail=window.OpportunityCloud.emailSubmit;
    if(typeof originalEmail==='function'){
      window.OpportunityCloud.emailSubmit=async function(...args){
        sessionStorage.setItem(ROUTE_FLAG,'1');
        sessionStorage.removeItem(STAY_PUBLIC);
        routed=false;
        const result=await originalEmail.apply(this,args);
        let tries=0;const t=setInterval(()=>{tries++;if(enterWorkspace(true)||tries>60)clearInterval(t)},100);
        return result;
      };
    }

    const originalGoogle=window.OpportunityCloud.google;
    if(typeof originalGoogle==='function'){
      window.OpportunityCloud.google=function(...args){
        sessionStorage.setItem(ROUTE_FLAG,'1');
        sessionStorage.removeItem(STAY_PUBLIC);
        return originalGoogle.apply(this,args);
      };
    }

    const originalShowLanding=window.showLanding;
    if(typeof originalShowLanding==='function'){
      window.showLanding=function(...args){sessionStorage.setItem(STAY_PUBLIC,'1');routed=false;return originalShowLanding.apply(this,args)};
      try{showLanding=window.showLanding}catch{}
    }

    const originalShowApp=window.showApp;
    if(typeof originalShowApp==='function'){
      window.showApp=function(...args){sessionStorage.removeItem(STAY_PUBLIC);return originalShowApp.apply(this,args)};
      try{showApp=window.showApp}catch{}
    }
  }

  let ticks=0;
  const boot=setInterval(()=>{
    ticks++;
    patchNavigation();
    const forced=sessionStorage.getItem(ROUTE_FLAG)==='1';
    if(forced)enterWorkspace(true);
    else if(ticks>8)enterWorkspace(false);
    if(ticks>160)clearInterval(boot);
  },100);
})();