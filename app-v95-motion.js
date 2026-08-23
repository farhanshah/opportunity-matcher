(()=>{
  const root=document.documentElement;
  const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TARGETS=[
    '.section.reveal','.feature','.liveCard','.step','.oppCard.upgraded','.savedTile',
    '.trackerOverviewHero','.trackerMiniStat','.boardColumnV11','.focusCard','.focusSummaryHero','.focusSummaryStat',
    '.dashHero','.dashPanel','.reviewDrivers','.routeWorkQueue','.intelHero','.intelStat','.priorityCard','.deadlineRowV9','.pipeStage','.deepV2Card'
  ].join(',');
  const GROUPS=[
    '.featureGrid','.liveGrid','.steps','.oppGrid','.savedGridPremium','.trackerOverview','.trackerBoardV11',
    '.focusSummary','.focusQueue','.intelSide','.priorityGrid','.pipelinePanel','.routeWorkGrid','.driverList','.deepV2Grid'
  ].join(',');
  let io=null;

  function makeObserver(){
    if(io||reduce())return;
    io=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        entry.target.classList.add('omMotionIn');
        io.unobserve(entry.target);
      }
    },{threshold:.10,rootMargin:'0px 0px -34px 0px'});
  }

  function bindGroup(group){
    if(group.dataset.omMotionGroup)return;
    group.dataset.omMotionGroup='1';
    [...group.children].forEach((child,i)=>child.style.setProperty('--om-stagger',Math.min(i,7)));
  }

  function bindTarget(el){
    if(el.dataset.omMotionV2)return;
    el.dataset.omMotionV2='1';
    el.classList.add('omMotionTarget');
    if(reduce()){
      el.classList.add('omMotionIn');
      return;
    }
    makeObserver();
    io?.observe(el);
  }

  function bindAll(scope=document){
    scope.querySelectorAll?.(GROUPS).forEach(bindGroup);
    scope.querySelectorAll?.(TARGETS).forEach(bindTarget);
  }

  function metricPop(scope=document){
    const selectors='.metric,.intelStat,.savedStat,.trackerMiniStat,.focusSummaryStat,.pipeStage';
    scope.querySelectorAll?.(selectors).forEach((el,i)=>{
      if(el.dataset.omMetricBound)return;
      el.dataset.omMetricBound='1';
      el.style.setProperty('--om-stagger',Math.min(i,6));
      if(!reduce()){
        setTimeout(()=>{
          el.classList.remove('omMetricPop');
          void el.offsetWidth;
          el.classList.add('omMetricPop');
        },120+i*55);
      }
    });
  }

  function enterVisibleView(){
    const visible=[...document.querySelectorAll('#app .appBody > section')].find(s=>!s.classList.contains('hide'));
    if(!visible)return;
    visible.classList.remove('omViewEnter');
    void visible.offsetWidth;
    visible.classList.add('omViewEnter');
    bindAll(visible);
    metricPop(visible);
  }

  function watchViews(){
    document.querySelectorAll('#app .appBody > section').forEach(section=>{
      if(section.dataset.omViewWatch)return;
      section.dataset.omViewWatch='1';
      new MutationObserver(muts=>{
        if(muts.some(m=>m.attributeName==='class')&&!section.classList.contains('hide')){
          requestAnimationFrame(()=>enterVisibleView());
        }
      }).observe(section,{attributes:true,attributeFilter:['class']});
    });
  }

  function dynamicWatch(){
    const mo=new MutationObserver(muts=>{
      let changed=false;
      for(const m of muts){
        if(m.addedNodes?.length){changed=true;break}
      }
      if(!changed)return;
      clearTimeout(mo._t);
      mo._t=setTimeout(()=>{bindAll();watchViews();metricPop();},55);
    });
    mo.observe(document.body,{subtree:true,childList:true});
  }

  function prime(){
    if(reduce()){
      root.classList.add('omMotionReady');
      bindAll();watchViews();metricPop();
      return;
    }
    root.classList.add('omMotionPrimed');
    bindAll();watchViews();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      root.classList.add('omMotionReady');
      enterVisibleView();
      metricPop();
    }));
  }

  function waitForTheme(){
    const link=document.querySelector('link[data-om-theme-css]');
    if(link?.sheet){prime();return}
    if(link){
      let done=false;
      const go=()=>{if(done)return;done=true;prime()};
      link.addEventListener('load',go,{once:true});
      setTimeout(go,1600);
      return;
    }
    setTimeout(waitForTheme,40);
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.navbtn[data-v]');
    if(btn&&!reduce())setTimeout(enterVisibleView,20);
  });

  window.addEventListener('opportunity:themechange',()=>{
    document.body.classList.add('omThemeChanging');
    setTimeout(()=>document.body.classList.remove('omThemeChanging'),420);
  });

  dynamicWatch();
  waitForTheme();
  window.OpportunityMotion={refresh:()=>{bindAll();watchViews();enterVisibleView();metricPop()}};
})();
