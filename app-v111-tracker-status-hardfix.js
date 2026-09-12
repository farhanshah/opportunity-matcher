(()=>{
  // Status rendering is owned by OpportunityStudioTruth (app-v109).
  // Keep this compatibility surface without mutation observers or polling.
  window.OpportunityTrackerStatusHardfix={refresh:()=>window.OpportunityStudioTruth?.refresh?.()};

  const loadExpiredTracker=()=>{
    if(document.querySelector('script[data-om-expired-tracker-v224]'))return;
    const x=document.createElement('script');
    x.src='/app-v150-expired-tracker-lifecycle-v224.js?v=224';
    x.defer=true;
    x.dataset.omExpiredTrackerV224='true';
    document.body.appendChild(x);
  };

  // v223: keep the analysis modal truthful about both tracker state and passed deadlines.
  // v224 then applies the same deadline truth to Tracker cards.
  if(!document.querySelector('script[data-om-analysis-truth-v223]')){
    const s=document.createElement('script');
    s.src='/app-v150-analysis-deadline-truth-v223.js?v=223';
    s.defer=true;
    s.dataset.omAnalysisTruthV223='true';
    s.onload=loadExpiredTracker;
    document.body.appendChild(s);
  }else loadExpiredTracker();
})();