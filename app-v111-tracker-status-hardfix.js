(()=>{
  // Status rendering is owned by OpportunityStudioTruth (app-v109).
  // Keep this compatibility surface without mutation observers or polling.
  window.OpportunityTrackerStatusHardfix={refresh:()=>window.OpportunityStudioTruth?.refresh?.()};

  // v222: keep the opportunity analysis modal honest about tracker state.
  if(!document.querySelector('script[data-om-analysis-track-v222]')){
    const s=document.createElement('script');
    s.src='/app-v149-analysis-track-state-v222.js?v=222';
    s.defer=true;
    s.dataset.omAnalysisTrackV222='true';
    document.body.appendChild(s);
  }
})();