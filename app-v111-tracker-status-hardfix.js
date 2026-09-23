(()=>{
  // Status rendering is owned by OpportunityStudioTruth (app-v109).
  // Keep this compatibility surface without mutation observers or polling.
  window.OpportunityTrackerStatusHardfix={refresh:()=>window.OpportunityStudioTruth?.refresh?.()};

  const loadEligibilityFirstV238=()=>{
    if(document.querySelector('script[data-om-eligibility-first-v238]'))return;
    const q=document.createElement('script');
    q.src='/app-v153-eligibility-first-tracker-v230.js?v=238';
    q.defer=true;
    q.dataset.omEligibilityFirstV238='true';
    document.body.appendChild(q);
  };

  const loadEligibilityTruthV234=()=>{
    if(document.querySelector('script[data-om-eligibility-truth-v234]')){loadEligibilityFirstV238();return;}
    const t=document.createElement('script');
    t.src='/app-v154-eligibility-truth-v234.js?v=234';
    t.defer=true;
    t.dataset.omEligibilityTruthV234='true';
    t.onload=loadEligibilityFirstV238;
    document.body.appendChild(t);
  };

  const loadExpiredStageV226=()=>{
    if(document.querySelector('script[data-om-expired-stage-v226]')){loadEligibilityTruthV234();return;}
    const z=document.createElement('script');
    z.src='/app-v152-expired-stage-css-v226.js?v=235';
    z.defer=true;
    z.dataset.omExpiredStageV226='true';
    z.onload=loadEligibilityTruthV234;
    document.body.appendChild(z);
  };

  const loadExpiredPolish=()=>{
    if(document.querySelector('script[data-om-expired-polish-v225]')){loadExpiredStageV226();return;}
    const p=document.createElement('script');
    p.src='/app-v151-expired-tracker-polish-v225.js?v=235';
    p.defer=true;
    p.dataset.omExpiredPolishV225='true';
    p.onload=loadExpiredStageV226;
    document.body.appendChild(p);
  };

  const loadExpiredTracker=()=>{
    if(document.querySelector('script[data-om-expired-tracker-v224]')){loadExpiredPolish();return;}
    const x=document.createElement('script');
    x.src='/app-v150-expired-tracker-lifecycle-v224.js?v=236';
    x.defer=true;
    x.dataset.omExpiredTrackerV224='true';
    x.onload=loadExpiredPolish;
    document.body.appendChild(x);
  };

  // v231 keeps the v228 truth checks and, when Open tracker is clicked,
  // scrolls to and briefly highlights the exact tracked opportunity card.
  if(!document.querySelector('script[data-om-analysis-truth-v231]')){
    const s=document.createElement('script');
    s.src='/app-v150-analysis-deadline-truth-v223.js?v=231';
    s.defer=true;
    s.dataset.omAnalysisTruthV231='true';
    s.onload=loadExpiredTracker;
    document.body.appendChild(s);
  }else loadExpiredTracker();
})();