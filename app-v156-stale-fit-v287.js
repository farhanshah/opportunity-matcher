(()=>{
  // A historically favourable Passport match cannot prove current provider eligibility.
  const existing=window.evaluate;
  if(typeof existing!=='function'||window.OpportunityStaleFitV288)return;
  const original=existing;
  const revise=function(opportunity){
    const result=original.apply(this,arguments);
    const timestamp=Date.parse(String(opportunity?.Last_Verified||''));
    const now=Date.now();
    const needsRecheck=opportunity?.Verification_Stale!==false || !Number.isFinite(timestamp) ||
      timestamp<now-30*86400000 || timestamp>now+300000;
    if(!result||!needsRecheck||result.cls!=='eligible')return result;
    return {...result,label:'Profile fit · verify source',cls:'possible',rank:Math.min(Number(result.rank)||3,3),
      historicalFit:true,verifiedEligibility:false};
  };
  try{evaluate=revise}catch{}
  window.evaluate=revise;
  window.OpportunityStaleFitV288={version:'v288',evaluate:revise};
  try{window.renderAll?.()}catch{}
})();