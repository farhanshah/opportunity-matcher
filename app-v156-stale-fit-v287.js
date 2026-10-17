(()=>{
  // A historically favourable Passport match cannot prove current provider eligibility.
  const existing=window.evaluate;
  if(typeof existing!=='function'||window.OpportunityStaleFitV287)return;
  const original=existing;
  const revise=function(opportunity){
    const result=original.apply(this,arguments);
    if(!result||!opportunity?.Verification_Stale||result.cls!=='eligible')return result;
    return {...result,label:'Profile fit · verify source',cls:'possible',rank:Math.min(Number(result.rank)||3,3),
      historicalFit:true,verifiedEligibility:false};
  };
  try{evaluate=revise}catch{}
  window.evaluate=revise;
  window.OpportunityStaleFitV287={version:'v287',evaluate:revise};
  try{window.renderAll?.()}catch{}
})();