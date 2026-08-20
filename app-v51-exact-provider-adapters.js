(()=>{
  let installed=false;
  function install(){
    const api=window.OpportunityBestLive;
    if(!api)return false;
    if(!installed){
      const previous=api.status?.bind(api);
      if(previous){
        api.status=()=>{
          const s=previous()||{};
          const all=Array.isArray(s.items)?s.items:[];
          const items=all.filter(x=>x?.status_verified===true&&x?.verification_level==='exact');
          return {...s,items,provider_policy:'exact-adapters-only',candidate_items:all.length,withheld_unverified:Math.max(0,all.length-items.length)};
        };
      }
      installed=true;
      api.__exactAdapterPolicy=true;
      setTimeout(()=>{try{api.refresh?.()}catch{}},120);
    }
    window.OpportunityExactProviderAdapters={
      mode:'exact-only',
      refresh:()=>{try{api.refresh?.()}catch{}}
    };
    return true;
  }

  if(!install()){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(install()||attempts>=30)clearInterval(timer);
    },100);
  }
})();
