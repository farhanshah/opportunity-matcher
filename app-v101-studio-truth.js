(()=>{
  // Retired compatibility shim.
  // v109 owns Application Studio truth and tracker status rendering.
  // Keep this path harmless for older cached bootstraps that may still request it.
  function refresh(){
    return window.OpportunityStudioTruth?.refresh?.();
  }
  function getState(t){
    return window.OpportunityStudioTruth?.getState?.(t) || null;
  }
  function relevantVerifyKeys(t){
    return window.OpportunityStudioTruth?.relevantVerifyKeys?.(t) || [];
  }
  window.OpportunityStudioTruthLegacyV101={
    refresh,
    getState,
    relevantVerifyKeys,
    retired:true
  };
})();
