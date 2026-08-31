(()=>{
  // Status rendering is owned by OpportunityStudioTruth (app-v109).
  // Keep this compatibility surface without observers or polling so older callers do not break.
  window.OpportunityTrackerPackStatus={refresh:()=>window.OpportunityStudioTruth?.refresh?.()};
})();