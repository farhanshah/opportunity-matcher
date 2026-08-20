(()=>{
  const priorEvaluate=evaluate;
  const result=(rule,detail)=>({label:'Country eligibility',status:'review',detail,hard:true,source_url:rule?.source_url||'',source_note:rule?.source_note||'',rule_code:'country_scope'});
  function recalc(base,checks){
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length;
    const reviews=checks.filter(c=>c.status==='review').length;
    const passes=checks.filter(c=>c.status==='pass').length;
    const hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;
    if(fails){label='Not eligible';cls='ineligible';rank=0}
    else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}
    else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}
    else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,countryCycleRoutingV53:true};
  }
  evaluate=function(o){
    const base=priorEvaluate(o);
    const rule=(Array.isArray(o?.Eligibility_Rules)?o.Eligibility_Rules:[]).find(r=>r.code==='country_scope');
    if(!rule||rule.certainty!=='next_cycle_pending')return base;
    const detail=rule.source_note||'The next official cycle country list is still pending; do not reuse an older country list to decide eligibility.';
    const checks=(base.checks||[]).filter(c=>c.rule_code!=='country_scope');
    checks.unshift(result(rule,detail));
    return recalc(base,checks);
  };
  window.evaluate=evaluate;
  try{renderAll()}catch{}
})();
