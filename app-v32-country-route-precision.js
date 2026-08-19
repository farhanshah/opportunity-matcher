(()=>{
  const previousEvaluate=evaluate;
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const canon=v=>window.OpportunityCountryRoutes?.canon?window.OpportunityCountryRoutes.canon(v):String(v||'').trim().toLowerCase();
  const result=(r,status,detail,hard=r.hard!==false)=>({label:r.label||'Eligibility rule',status,detail,hard,source_url:r.source_url||'',source_note:r.source_note||'',rule_code:r.code||''});
  const hasBachelor=p=>/bachelor's degree|master's student|master's degree|phd student|phd degree/i.test(p.edu||'');
  const hasMasters=p=>/master's degree|phd student|phd degree/i.test(p.edu||'');
  const profileCountry=p=>p.nat||p.residence||'';

  function exactRoute(o){
    try{const info=window.OpportunityCountryRoutes?.routeInfo?.(o);return info?.exact?info.primary:null}catch{return null}
  }

  function routeCountryOverride(o,p){
    const route=exactRoute(o);if(!route)return null;
    const country=profileCountry(p);
    return {label:'Country eligibility',status:'pass',detail:`${country||route.country} has a verified provider route for ${route.cycle||'the current programme cycle'}. Application status and local deadline are shown separately.`,hard:true,source_url:route.official_source_url||'',source_note:route.notes||'',rule_code:'country_scope'};
  }

  function appliesToRoute(rule,p){
    const country=val(rule).route_country;
    if(!country)return true;
    return canon(profileCountry(p))===canon(country);
  }

  function special(rule,p,o){
    const v=val(rule);
    if(rule.certainty&&rule.certainty!=='confirmed')return result(rule,'review',rule.source_note||'This country-route rule belongs to the latest published cycle and must be refreshed before it can decide a future cycle.');
    if(!appliesToRoute(rule,p))return null;

    if(rule.code==='nomination_residence_v12'){
      if(!p.nat||!p.residence)return result(rule,'review','Add both nationality and residence to test the Fulbright nominating-country rule.');
      if(canon(p.nat)===canon(p.residence))return result(rule,'pass','Your nationality and residence point to the same home-country nomination route.');
      return result(rule,'review','Fulbright requires residence in the country of nomination. Your stored nationality and residence differ, so the local Fulbright office must confirm the correct nomination route.');
    }
    if(rule.code==='us_citizenship_exclusion_v12'){
      if(canon(p.nat)==='united states')return result(rule,'fail','The Foreign Student route does not accept U.S. citizens.');
      return result(rule,'pass','Your stored nationality is not U.S. citizenship. Dual-U.S.-citizenship status should still be self-declared in the application.');
    }
    if(rule.code==='english_v12'){
      if(!p.english||p.english==='Not specified')return result(rule,'review','Fulbright requires English fluency; add English evidence to your Passport.');
      return result(rule,'review','Your Passport contains an English-readiness signal, but Fulbright publishes recommended TOEFL/IELTS evidence and the exact test route still needs confirmation.');
    }
    if(rule.code==='pakistan_degree_route_v12'){
      if(!p.edu)return result(rule,'review','Add education level to test the Pakistan Fulbright degree route.');
      if(hasMasters(p))return result(rule,'pass','Your education level can support the Pakistan PhD route and also exceeds the Master’s baseline.');
      if(hasBachelor(p))return result(rule,'pass','Your education level can support the Pakistan Master’s route, subject to the formal 16-year education check.');
      return result(rule,'fail','The Pakistan Fulbright degree route requires the published 16-year Master’s baseline or 18-year PhD baseline.');
    }
    if(rule.code==='pakistan_gre_v12')return result(rule,'review','Pakistan Fulbright requires GRE General with at least 145 on each section; GRE scores are not stored in the Passport.');
    if(rule.code==='pakistan_experience_v12')return result(rule,'info','Two years of relevant work experience applies specifically to MBA and Public Policy/Administration applicants; intended Fulbright degree is not yet stored.',false);
    if(rule.code==='pakistan_status_exclusions_v12')return result(rule,'review','Pakistan-specific U.S.-status/family, prior-Fulbright and current foreign-study/visa exclusions require applicant self-declaration.');
    if(rule.code==='swiss_country_route_v12'){
      const route=exactRoute(o);
      if(route)return result(rule,'pass',`Your country route is published for 2027/28. Available scholarship types: ${(v.scholarship_types||[]).join(' and ')||'see country route'}.`);
      return result(rule,'review','Select or add country of origin to resolve the Swiss scholarship types and local deadline.');
    }
    return null;
  }

  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];
    let checks=[...(base.checks||[])];
    const country=routeCountryOverride(o,currentProfile);
    if(country){checks=checks.filter(c=>c.rule_code!=='country_scope'&&c.label!=='Country eligibility'&&!(c.label==='Nationality'&&!c.rule_code));checks.unshift(country)}
    for(const rule of rules){
      const s=special(rule,currentProfile,o);if(!s)continue;
      checks=checks.filter(c=>c.rule_code!==rule.code);
      checks.unshift(s);
    }
    const seen=new Set();checks=checks.filter(c=>{const k=`${c.label}|${c.rule_code||''}`;if(seen.has(k))return false;seen.add(k);return true});
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length;
    const reviews=checks.filter(c=>c.status==='review').length;
    const passes=checks.filter(c=>c.status==='pass').length;
    const hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;
    if(fails){label='Not eligible';cls='ineligible';rank=0}
    else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}
    else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}
    else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,countryRoutePrecisionV32:true};
  };
  window.evaluate=evaluate;try{renderAll()}catch{}
})();
