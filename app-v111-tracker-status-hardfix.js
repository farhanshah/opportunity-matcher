(()=>{
  // Status rendering is owned by OpportunityStudioTruth (app-v109).
  // Keep this compatibility surface without mutation observers or polling.
  window.OpportunityTrackerStatusHardfix={refresh:()=>window.OpportunityStudioTruth?.refresh?.()};

  // v223: keep the analysis modal truthful about both tracker state and passed deadlines.
  if(!document.querySelector('script[data-om-analysis-truth-v223]')){
    const s=document.createElement('script');
    s.src='/app-v150-analysis-deadline-truth-v223.js?v=223';
    s.defer=true;
    s.dataset.omAnalysisTruthV223='true';
    document.body.appendChild(s);
  }
})();