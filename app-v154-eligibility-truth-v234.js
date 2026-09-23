(()=>{
  const VERSION='v234';
  const prior=window.evaluate;
  if(typeof prior!=='function'||window.OpportunityEligibilityTruthV234)return;

  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const profile=()=>{try{return window.OpportunityState?.getProfile?.()||window.currentProfile||currentProfile||{}}catch{return{}}};

  function repairCheck(check,p){
    if(!check)return check;
    const label=norm(check.label),detail=norm(check.detail),code=String(check.rule_code||'');

    // A completed Master's/PhD does not erase the underlying Bachelor's degree.
    // Only repair the legacy generic education comparator. Provider-specific
    // "no prior Master's" rules remain untouched and can still fail separately.
    if(check.status==='fail'&&label==='education'&&
       /listed education requirement does not appear compatible with/.test(detail)&&
       /master|phd|doctoral/.test(norm(p.edu))){
      return {...check,status:'pass',detail:'Your completed higher degree also confirms the bachelor-level baseline. Provider-specific course-entry rules still apply.'};
    }

    // Missing exact eligible-hour data is uncertainty, not proof of ineligibility.
    // If the user has entered a positive total, the underlying rule keeps its
    // pass/fail result. Zero/blank is treated as "not supplied yet".
    if(check.status==='fail'&&code==='work_hours_min'&&!(Number(p.workHours||0)>0)){
      return {...check,status:'review',detail:'Add your eligible post-degree work hours to the Passport before this exact-hours rule can be called a pass or fail.'};
    }
    return check;
  }

  function recompute(base,checks){
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length;
    const reviews=checks.filter(c=>c.status==='review').length;
    const passes=checks.filter(c=>c.status==='pass').length;
    const hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;
    if(fails){label='Not eligible';cls='ineligible';rank=0}
    else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}
    else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}
    else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return {...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,eligibilityTruthV234:true};
  }

  const wrapped=function(o){
    const base=prior(o),p=profile();
    const checks=(base?.checks||[]).map(c=>repairCheck(c,p));
    return recompute(base||{},checks);
  };
  window.evaluate=wrapped;
  try{evaluate=wrapped}catch{}
  window.OpportunityEligibilityTruthV234={version:VERSION,refresh:()=>{try{renderAll()}catch{}}};
  try{renderAll()}catch{}
})();