(()=>{
  const root=document.documentElement;
  const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PUBLIC_TARGETS='#landing .section.reveal,#landing .feature,#landing .liveCard,#landing .step';
  let publicIO=null;

  function addHotfixCss(){
    if(document.querySelector('link[data-om-hotfix-v129]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/hotfix-v129.css';
    link.dataset.omHotfixV129='true';
    document.head.appendChild(link);
  }

  function publicObserver(){
    if(publicIO||reduce())return;
    publicIO=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        entry.target.classList.add('omMotionIn','omRevealed');
        publicIO.unobserve(entry.target);
      }
    },{threshold:.08,rootMargin:'0px 0px -28px 0px'});
  }

  function bindPublic(scope=document){
    scope.querySelectorAll?.(PUBLIC_TARGETS).forEach((el,i)=>{
      if(el.dataset.omMotionV129)return;
      el.dataset.omMotionV129='1';
      el.style.setProperty('--om-stagger',Math.min(i,7));
      if(reduce()){
        el.classList.add('omMotionIn','omRevealed');
        return;
      }
      el.classList.add('omMotionTarget');
      publicObserver();
      publicIO?.observe(el);
    });
  }

  function clearWorkspaceMotion(){
    document.querySelectorAll('#app .omMotionTarget,#app .omRevealTarget').forEach(el=>{
      el.classList.add('omMotionIn','omRevealed');
    });
    document.querySelectorAll('#app .appBody > section').forEach(section=>{
      section.style.opacity='';
      section.style.transform='';
      section.style.filter='';
    });
  }

  function enterSection(section){
    if(!section||section.classList.contains('hide')||reduce())return;
    section.animate(
      [{opacity:.88,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:260,easing:'cubic-bezier(.16,1,.3,1)'}
    );
  }

  function enterVisibleView(){
    const visible=[...document.querySelectorAll('#app .appBody > section')].find(s=>!s.classList.contains('hide'));
    if(!visible)return;
    clearWorkspaceMotion();
    enterSection(visible);
  }

  function watchViews(){
    document.querySelectorAll('#app .appBody > section').forEach(section=>{
      if(section.dataset.omViewWatchV129)return;
      section.dataset.omViewWatchV129='1';
      let wasHidden=section.classList.contains('hide');
      new MutationObserver(()=>{
        const hidden=section.classList.contains('hide');
        if(hidden===wasHidden)return;
        wasHidden=hidden;
        if(!hidden)requestAnimationFrame(()=>{clearWorkspaceMotion();enterSection(section)});
      }).observe(section,{attributes:true,attributeFilter:['class']});
    });
  }

  function dynamicWatch(){
    const mo=new MutationObserver(muts=>{
      if(!muts.some(m=>m.addedNodes?.length))return;
      clearTimeout(mo._t);
      mo._t=setTimeout(()=>{
        bindPublic();
        watchViews();
        clearWorkspaceMotion();
      },70);
    });
    mo.observe(document.body,{subtree:true,childList:true});
  }

  function prime(){
    addHotfixCss();
    root.classList.add('omMotionPrimed','omMotionReady');
    bindPublic();
    watchViews();
    clearWorkspaceMotion();
    setTimeout(enterVisibleView,80);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.navbtn[data-v]'))setTimeout(enterVisibleView,40);
  });
  window.addEventListener('focus',()=>{clearWorkspaceMotion();bindPublic()});
  window.addEventListener('opportunity:themechange',()=>setTimeout(clearWorkspaceMotion,30));

  dynamicWatch();
  prime();
  window.OpportunityMotion={refresh:()=>{bindPublic();watchViews();clearWorkspaceMotion();enterVisibleView()}};
})();
