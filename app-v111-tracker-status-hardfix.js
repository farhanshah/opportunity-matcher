(()=>{
  // Status rendering is owned by OpportunityStudioTruth (app-v109).
  // Keep this compatibility surface without mutation observers or polling.
  window.OpportunityTrackerStatusHardfix={refresh:()=>window.OpportunityStudioTruth?.refresh?.()};

  const loadEligibilityFirstV230=()=>{
    if(document.querySelector('script[data-om-eligibility-first-v230]'))return;
    const q=document.createElement('script');
    q.src='/app-v153-eligibility-first-tracker-v230.js?v=230';
    q.defer=true;
    q.dataset.omEligibilityFirstV230='true';
    document.body.appendChild(q);
  };

  const loadExpiredStageV226=()=>{
    if(document.querySelector('script[data-om-expired-stage-v226]')){loadEligibilityFirstV230();return;}
    const z=document.createElement('script');
    z.src='/app-v152-expired-stage-css-v226.js?v=226';
    z.defer=true;
    z.dataset.omExpiredStageV226='true';
    z.onload=loadEligibilityFirstV230;
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

  // v229 keeps the v228 truth checks and, when Open tracker is clicked,
  // scrolls to and briefly highlights the exact tracked opportunity card.
  if(!document.querySelector('script[data-om-analysis-truth-v229]')){
    const s=document.createElement('script');
    s.src='/app-v150-analysis-deadline-truth-v223.js?v=229';
    s.defer=true;
    s.dataset.omAnalysisTruthV229='true';
    s.onload=loadExpiredTracker;
    document.body.appendChild(s);
  }else loadExpiredTracker();
})();