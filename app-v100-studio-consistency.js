(()=>{
  // Retired compatibility shim. Application Studio v109 is the canonical
  // preparation truth. Keep this file harmless in case an older cached
  // loader still requests it.
  function stateFromTrack(t){
    return window.OpportunityStudioTruth?.getState?.(t) || null;
  }
  function refresh(){
    return window.OpportunityStudioTruth?.refresh?.();
  }
  window.OpportunityStudioConsistency={
    refresh,
    stateFromTrack,
    retired:true
  };
})();
