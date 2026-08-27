(()=>{
  const root=document.documentElement;
  const ROUTES=new Set(['discover','saved','tracker','dashboard']);
  let done=false;

  function routeFromPath(){
    const p=location.pathname.replace(/^\/+|\/+$/g,'');
    return ROUTES.has(p)?p:null;
  }

  function applyRoute(){
    const route=routeFromPath();
    try{
      if(route){
        window.showApp?.();
        window.setView?.(route,{skipHistory:true,replace:true});
      }else if(location.pathname==='/'||!location.pathname){
        window.showLanding?.();
      }
    }catch(err){console.warn('Final route hydration failed',err)}
  }

  function refreshLatestLayers(){
    try{window.OpportunityTheme?.refresh?.()}catch{}
    try{window.OpportunityMotion?.refresh?.()}catch{}
    try{window.OpportunityProductUX?.refresh?.()}catch{}
    try{window.OpportunityWorkspaceIntegrity?.refresh?.()}catch{}
    try{window.OpportunityStudioTruth?.refresh?.()}catch{}
    try{window.OpportunityStudioRuntimeGuard?.refresh?.()}catch{}
  }

  function cssReady(){
    const theme=document.querySelector('link[data-om-theme-css]');
    const studio=document.querySelector('link[data-om-hotfix-v133]');
    return Boolean(theme?.sheet&&studio?.sheet);
  }

  function reveal(){
    if(done)return;done=true;
    applyRoute();
    refreshLatestLayers();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      applyRoute();
      refreshLatestLayers();
      root.classList.add('omBootReady');
      root.dataset.omHydrated='true';
      window.dispatchEvent(new CustomEvent('opportunity:hydrated'));
    }));
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(cssReady()||tries>=20){clearInterval(timer);setTimeout(reveal,90)}
  },50);

  if(document.fonts?.ready)document.fonts.ready.then(()=>{if(cssReady())setTimeout(reveal,40)}).catch(()=>{});
  setTimeout(reveal,1800);
  window.OpportunityBootFinalize={reveal,applyRoute};

  import('/app-v108-prepare-route.js?v=3').catch(err=>console.warn('Dedicated preparation route failed to load',err));
})();