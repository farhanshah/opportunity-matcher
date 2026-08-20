(()=>{
  // Superseded by v51 Exact Provider Adapters + v52 Exact Feed Authority.
  // Keep the public compatibility surface without any DOM polling or mutation observers.
  window.OpportunityProviderVerificationPolicy={refresh:()=>{},mode:'exact-adapters-only',withheld:['UNICEF']};
})();
