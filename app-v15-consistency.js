(()=>{
  const ROUTES=new Set(['discover','saved','tracker','dashboard']);
  let internal=false,copyTimer=null;
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const appVisible=()=>{const el=document.getElementById('app');return Boolean(el&&!el.classList.contains('hide'))};
  const signedIn=()=>{const el=document.getElementById('cloudAccountEntry');return Boolean(el&&el.classList.contains('cloudAccountBtn')&&!el.classList.contains('signedOut'))};
  const cloudReady=()=>document.getElementById('cloudSyncPill')?.textContent?.trim()==='Cloud synced';
  const storageMode=()=>cloudReady()?'cloud':signedIn()?'syncing':'local';
  const visibleView=()=>['discover','saved','tracker','dashboard'].find(id=>{const el=document.getElementById(id);return el&&!el.classList.contains('hide')})||'discover';
  const routeFromPath=()=>{const p=location.pathname.replace(/^\/+|\/+$/g,'');return ROUTES.has(p)?p:null};

  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
  function setHtml(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html}

  function applyStorageCopy(){
    const mode=storageMode();
    document.documentElement.dataset.workspaceStorage=mode;
    const cloud=mode==='cloud',syncing=mode==='syncing';

    const privacy=q('.filterPanel .privacyNote');
    if(privacy)setText(privacy,cloud?'☁ Cloud-synced to your account.':syncing?'☁ Connecting your cloud workspace…':'🔒 Stored only in this browser until you sign in.');

    qa('.metric').forEach(metric=>{
      const label=metric.querySelector('span')?.textContent?.trim().toLowerCase();
      const hint=metric.querySelector('.metricHint');
      if(!hint)return;
      if(label==='shortlisted'||label==='saved')setText(hint,cloud?'synced to your account':syncing?'cloud sync connecting':'saved in this browser');
      if(label==='applications'||label==='tracked')setText(hint,cloud?'synced across devices':syncing?'cloud sync connecting':'in this browser');
    });

    const savedP=q('.savedHero p');
    if(savedP){
      const text=cloud?'Keep the opportunities you may actually act on—not another endless bookmarks folder. Your shortlist is synced securely to your account.':syncing?'Keep the opportunities you may actually act on—not another endless bookmarks folder. Your cloud workspace is connecting.':'Keep the opportunities you may actually act on—not another endless bookmarks folder. Saved items stay in this browser until you sign in.';
      setText(savedP,text);
    }

    qa('.dashPanelHead span').forEach(span=>{
      const t=span.textContent.toLowerCase();
      if(t.includes('browser-local')||t.includes('cloud workspace')||t.includes('local workspace'))setText(span,cloud?'cloud workspace · synced across devices':syncing?'cloud workspace · connecting':'local workspace · this browser');
    });

    const onboardP=q('#onboard .modalBox > p');
    if(onboardP){
      setText(onboardP,cloud?'Required fields make the first cut useful. The rest improves eligibility checks. Changes save to your cloud workspace.':syncing?'Required fields make the first cut useful. The rest improves eligibility checks. Your cloud workspace is connecting.':'Required fields make the first cut useful. The rest improves eligibility checks. Sign in to sync this Passport across devices.');
    }

    qa('.sideFoot').forEach(side=>{
      if(cloud&&side.textContent.includes('stored in this browser'))setHtml(side,`<b>Cloud workspace</b>Your Passport, shortlist and tracker are synced securely across devices.`);
    });
  }

  function writeRoute(view,replace=false){
    if(!ROUTES.has(view))return;
    const target=`/${view}`;
    if(location.pathname===target&&!location.hash)return;
    history[replace?'replaceState':'pushState']({opportunityView:view},'',target);
  }

  const baseSet=window.setView;
  if(typeof baseSet==='function'){
    const setViewV15=function(view,opts={}){
      const result=baseSet(view);
      applyStorageCopy();
      if(!internal&&!opts.skipHistory)writeRoute(view,Boolean(opts.replace));
      return result;
    };
    try{setView=setViewV15}catch{}
    window.setView=setViewV15;
    qa('.navbtn[data-v]').forEach(btn=>{btn.onclick=()=>setViewV15(btn.dataset.v)});
  }

  const baseShowLanding=window.showLanding;
  if(typeof baseShowLanding==='function'){
    const showLandingV15=function(...args){
      internal=true;const result=baseShowLanding.apply(this,args);internal=false;
      if(location.pathname!=='/'||location.hash)history.pushState({public:true},'','/');
      applyStorageCopy();return result;
    };
    try{showLanding=showLandingV15}catch{}
    window.showLanding=showLandingV15;
  }

  const baseShowApp=window.showApp;
  if(typeof baseShowApp==='function'){
    const showAppV15=function(...args){
      const result=baseShowApp.apply(this,args);
      const route=routeFromPath()||visibleView();
      if(!routeFromPath())writeRoute(route,true);
      applyStorageCopy();return result;
    };
    try{showApp=showAppV15}catch{}
    window.showApp=showAppV15;
  }

  function openRouteFromUrl(){
    const route=routeFromPath();
    if(route){
      internal=true;
      try{window.showApp?.();baseSet?.(route)}catch(e){console.warn('Workspace route restore failed',e)}
      internal=false;applyStorageCopy();
      return;
    }
    if(location.pathname==='/'&&!location.hash&&appVisible())writeRoute(visibleView(),true);
  }

  window.addEventListener('popstate',()=>{
    const route=routeFromPath();
    internal=true;
    try{if(route){window.showApp?.();baseSet?.(route)}else window.showLanding?.()}finally{internal=false;applyStorageCopy()}
  });

  window.addEventListener('opportunity:statechange',()=>{clearTimeout(copyTimer);copyTimer=setTimeout(applyStorageCopy,80)});
  const observer=new MutationObserver(()=>{clearTimeout(copyTimer);copyTimer=setTimeout(()=>{applyStorageCopy();if(appVisible()&&!routeFromPath())writeRoute(visibleView(),true)},80)});
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});

  const css=document.createElement('link');css.rel='stylesheet';css.href='/consistency-v15.css';css.dataset.consistencyV15='true';document.head.appendChild(css);
  openRouteFromUrl();applyStorageCopy();
  setTimeout(openRouteFromUrl,500);setTimeout(applyStorageCopy,1000);setTimeout(applyStorageCopy,2200);
})();
