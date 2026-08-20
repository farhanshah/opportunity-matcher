(()=>{
  const priorEvaluate=evaluate;
  const clean=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
  const canon=v=>window.OpportunityCountryRoutes?.canon?window.OpportunityCountryRoutes.canon(v):clean(v);
  const result=(rule,route,status,detail)=>({
    label:rule?.label||'Country eligibility',status,detail,hard:rule?.hard!==false,
    source_url:route?.official_source_url||rule?.source_url||'',
    source_note:route?.notes||rule?.source_note||'',rule_code:'country_scope'
  });
  function exactConfirmedRoute(o){
    const nat=currentProfile?.nat||'';if(!nat)return null;
    const routes=Array.isArray(o?.Country_Routes)?o.Country_Routes:[];
    const exact=routes.filter(r=>canon(r.country)===canon(nat)&&r?.eligibility_overrides?.country_eligibility_confirmed===true);
    if(!exact.length)return null;
    return exact.sort((a,b)=>{
      const ah=/high/i.test(a.confidence||'')?1:0,bh=/high/i.test(b.confidence||'')?1:0;if(ah!==bh)return bh-ah;
      const ad=a.close_date?Date.parse(a.close_date):0,bd=b.close_date?Date.parse(b.close_date):0;return bd-ad;
    })[0];
  }
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
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,countryRouteResolved:true};
  }
  evaluate=function(o){
    const base=priorEvaluate(o);
    const rule=(Array.isArray(o?.Eligibility_Rules)?o.Eligibility_Rules:[]).find(r=>r.code==='country_scope');
    if(!rule)return base;
    const route=exactConfirmedRoute(o);if(!route)return base;
    const current=(base.checks||[]).find(c=>c.rule_code==='country_scope');
    if(current?.status==='fail')return base;
    const detail=`Your ${currentProfile.nat} nationality has a verified provider route (${route.route_name||'country route'}). Country eligibility is confirmed; route-, cycle- and programme-specific conditions still apply.`;
    const country=result(rule,route,'pass',detail);
    const checks=(base.checks||[]).filter(c=>c.rule_code!=='country_scope');checks.unshift(country);
    return recalc(base,checks);
  };
  window.evaluate=evaluate;
  try{renderAll()}catch{}
})();
