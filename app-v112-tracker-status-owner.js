(()=>{
  // Compatibility shim only. v109 is the single active tracker-status owner.
  window.OpportunityTrackerStatusOwner={
    refresh:()=>window.OpportunityStudioTruth?.refresh?.(),
    retired:true
  };
})();
