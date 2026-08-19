(()=>{
  const previousEvaluate=evaluate;
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const canon=v=>window.OpportunityCountryRoutes?.canon?window.OpportunityCountryRoutes.canon(v):String(v||'').trim().toLowerCase();
  const inList=(country,list=[])=>Boolean(country)&&list.some(x=>canon(x)===canon(country));
  const result=(r,status,detail,hard=r.hard!==false)=>({label:r.label||'Eligibility rule',status,detail,hard,source_url:r.source_url||'',source_note:r.source_note||'',rule_code:r.code||''});
  const hasBachelor=p=>/bachelor's degree|master's student|master's degree|phd student|phd degree/i.test(p.edu||'');

  function multiRouteCountry(rule,p){
    const v=val(rule);
    if(v.kind!=='idb_internship')return null;
    if(!p.nat)return result(rule,'review','Add nationality to resolve the IDB internship route.');
    if(inList(p.nat,v.hq_countries||[]))return result(rule,'pass',`${p.nat} is one of the 48 IDB member countries, so the Washington headquarters citizenship route is available.`);
    if(v.idb_invest_worldwide||v.country_office_local_route)return result(rule,'review',`${p.nat} is outside the headquarters member-country route, but IDB Invest has no citizenship restriction and country-office internships can use local citizenship/legal-residence eligibility. Select the intended internship location/entity to resolve this.`);
    return result(rule,'fail','Nationality does not fit a verified IDB internship route.');
  }

  function australiaResidence(rule,p,o){
    if(!p.residence)return result(rule,'review','Add country of residence to verify where you are applying from.');
    const countryRule=(o.Eligibility_Rules||[]).find(r=>r.code==='country_scope');
    const countries=val(countryRule).countries||[];
    if(inList(p.residence,countries))return result(rule,'pass',`${p.residence} is within the participating-country network for the standard residence/application route.`);
    return result(rule,'review','The standard route requires residence/application from an eligible developing country, but DFAT permits specified third-country exceptions. Your circumstances need the country profile/program-area check.');
  }

  function declaration(rule,detail){return result(rule,'review',detail||rule.source_note||'This condition requires applicant evidence or self-declaration not stored in the Passport.');}

  function australiaEnglish(rule,p){
    if(!p.english||p.english==='Not specified')return result(rule,'review','Australia Awards requires the DFAT/institution English standard; add English evidence to your Passport.');
    return result(rule,'review','Your Passport has an English-readiness signal, but the June 2026 handbook uses specific English-medium or IELTS/TOEFL/PTE evidence and the institution can set a higher standard.');
  }

  function manaakiExperience(rule,p){
    const v=val(rule),months=Number(p.expMonths||0);
    if(!hasBachelor(p))return result(rule,'review','This work-experience rule applies to postgraduate applicants; intended scholarship study level is not yet stored.');
    if(months===0)return result(rule,'review','Postgraduate Manaaki applicants need relevant work experience: one year full-time (30+ hours/week) or two years part-time. Add relevant experience details to verify the route.');
    if(months>=24)return result(rule,'review','Your experience duration can satisfy the two-year part-time route, but relevance and weekly-hours pattern must be confirmed.');
    if(months>=12)return result(rule,'review','Your experience duration can satisfy the one-year route only if it was relevant and averaged at least 30 hours per week.');
    return result(rule,'review','For a postgraduate Manaaki route, the published minimum is one year full-time or two years part-time relevant experience.');
  }

  function manaakiLevel(rule,p){
    const v=val(rule),nat=canon(p.nat);
    if(!p.nat)return result(rule,'review','Add nationality to resolve the available Manaaki study levels.');
    if((v.postgraduate_only||[]).some(c=>canon(c)===nat))return result(rule,'review','Your country currently has postgraduate-only Manaaki tertiary study. Intended qualification level is not stored in the Passport.');
    if(nat===canon('Timor-Leste'))return result(rule,'review','Timor-Leste currently allows undergraduate and postgraduate study; select intended study level to finish this check.');
    if(nat===canon('Samoa'))return result(rule,'review','Samoa has both open and Foundation routes with different level conditions; select the intended route.');
    return result(rule,'review','Available qualification levels are country-specific; select the intended Manaaki study level to finish this check.');
  }

  function special(rule,p,o){
    const v=val(rule);
    if(rule.certainty&&rule.certainty!=='confirmed')return result(rule,'review',rule.source_note||'This criterion is not confirmed for the active cycle.');
    if(rule.code==='country_scope'&&v.scope==='multi_route')return multiRouteCountry(rule,p);
    if(rule.code==='australia_residence_v10')return australiaResidence(rule,p,o);
    if(rule.code==='australia_english_v10')return australiaEnglish(rule,p);
    if(['australia_status_v10','australia_partner_v10','military_v10','prior_award_v10','criminal_history_v10','country_profile_v10','admission_v10','visa_v10','lower_level_exclusion_v10','overlapping_funding_v10'].includes(rule.code))return declaration(rule,v.detail);
    if(rule.code==='manaaki_experience_v10')return manaakiExperience(rule,p);
    if(rule.code==='manaaki_level_v10')return manaakiLevel(rule,p);
    if(['manaaki_history_v10','manaaki_visa_v10','return_contribution_v10'].includes(rule.code))return declaration(rule,v.detail);
    if(rule.code==='manaaki_english_v10')return result(rule,'info','English test scores are generally required only if shortlisted for tertiary study, and the exact admission threshold depends on the course/institution.',false);
    if(rule.code==='recommended_subject_v10')return result(rule,'info','Manaaki strongly prioritises country-recommended subjects; non-aligned applications are highly unlikely to progress, but this is treated as selection fit rather than a universal binary exclusion.',false);
    return null;
  }

  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];
    let checks=[...(base.checks||[])];
    for(const rule of rules){
      const s=special(rule,currentProfile,o);if(!s)continue;
      checks=checks.filter(c=>c.rule_code!==rule.code);
      if(rule.code==='country_scope')checks=checks.filter(c=>c.label!=='Country eligibility'&&c.label!=='Nationality');
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
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,umbrellaPrecisionV30:true};
  };
  window.evaluate=evaluate;try{renderAll()}catch{}
})();
