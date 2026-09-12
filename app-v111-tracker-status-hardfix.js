(()=>{
  // Status rendering is owned by OpportunityStudioTruth (app-v109).
  // Keep this compatibility surface without mutation observers or polling.
  window.OpportunityTrackerStatusHardfix={refresh:()=>window.OpportunityStudioTruth?.refresh?.()};

  const loadExpiredStageV226=()=>{
    if(document.querySelector('script[data-om-expired-stage-v226]'))return;
    const z=document.createElement('script');
    z.src='/app-v152-expired-stage-css-v226.js?v=226';
    z.defer=true;
    z.dataset.omExpiredStageV226='true';
    document.body.appendChild(z);
  };

  const loadExpiredPolish=()=>{
    if(document.querySelector('script[data-om-expired-polish-v225]')){loadExpiredStageV226();return;}
    const p=document.createElement('script');
    p.src='/app-v151-expired-tracker-polish-v225.js?v=225';
    p.defer=true;
    p.dataset.omExpiredPolishV225='true';
    p.onload=loadExpiredStageV226;
    document.body.appendChild(p);
  };

  const loadExpiredTracker=()=>{
    if(document.querySelector('script[data-om-expired-tracker-v224]')){loadExpiredPolish();return;}
    const x=document.createElement('script');
    x.src='/app-v150-expired-tracker-lifecycle-v224.js?v=224';
    x.defer=true;
    x.dataset.omExpiredTrackerV224='true';
    x.onload=loadExpiredPolish;
    document.body.appendChild(x);
  };

  // v223: keep the analysis modal truthful about both tracker state and passed deadlines.
  // v224 applies the same deadline truth to Tracker cards.
  // v225 removes stale stage controls and copy from closed Tracker records.
  // v226 force-hides the legacy stage selector after any later tracker repaint.
  if(!document.querySelector('script[data-om-analysis-truth-v223]')){
    const s=document.createElement('script');
    s.src='/app-v150-analysis-deadline-truth-v223.js?v=223';
    s.defer=true;
    s.dataset.omAnalysisTruthV223='true';
    s.onload=loadExpiredTracker;
    document.body.appendChild(s);
  }else loadExpiredTracker();
})();