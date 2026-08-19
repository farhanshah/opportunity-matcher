(()=>{
  const previousEvaluate=evaluate;
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const canon=v=>window.OpportunityCountryRoutes?.canon?window.OpportunityCountryRoutes.canon(v):String(v||'').trim().toLowerCase();
  const inList=(country,list=[])=>Boolean(country)&&list.some(x=>canon(x)===canon(country));
  const result=(r,status,detail,hard=r.hard!==false)=>({label:r.label||'Eligibility rule',status,detail,hard,source_url:r.source_url||'',source_note:r.source_note||'',rule_code:r.code||''});
  const isStudent=p=>/student/i.test(p.edu||'');
  const isPhd=p=>/phd student|phd degree/i.test(p.edu||'');

  function special(rule,p){
    const v=val(rule);
    if(rule.code==='country_scope'&&v.refugee_nationality_exception&&v.residence_based){
      const countries=Array.isArray(v.countries)?v.countries:[];
      if(!p.residence)return result(rule,'review','Add country of residence to test the ordinary-residence route.');
      if(inList(p.residence,countries))return result(rule,'pass',`${p.residence} is inside the verified ordinary-residence list.`);
      if(p.nat&&inList(p.nat,countries))return result(rule,'review','Your ordinary residence is outside the standard list, but your nationality is eligible and the provider allows a refugee/displaced-person nationality exception; refugee/displaced status must be confirmed.');
      return result(rule,'fail','Neither the stored ordinary residence nor the available refugee-nationality route fits the verified country list.');
    }
    if(rule.certainty&&rule.certainty!=='confirmed')return result(rule,'review',rule.source_note||'This rule is not confirmed for the active cycle.');
    if(rule.code==='phd_exclusion_v9')return isPhd(p)?result(rule,'fail','Current or graduated PhD applicants are excluded from this internship.'):result(rule,'pass','Your Passport does not show a PhD-student or PhD-graduate status.');
    if(rule.code==='student_approval_v9')return isStudent(p)?result(rule,'review','Current students need approval from their home institution; this approval is not stored in the Passport.'):result(rule,'pass','The home-institution approval condition applies only to currently enrolled students.');
    if(rule.code==='us_status_v9'){
      if(canon(p.nat)==='united states')return result(rule,'fail','U.S. citizens are not eligible for this programme.');
      return result(rule,'review','Your nationality does not show U.S. citizenship, but U.S. permanent-resident status and recent permanent-residency applications still require self-declaration.');
    }
    if(rule.code==='j1_visa_v9')return result(rule,'review','J-1 visa eligibility must be confirmed from the applicant’s immigration circumstances.');
    if(rule.code==='ms_office_v9')return result(rule,'review','Windows MS Office proficiency is required but is not yet stored in the Passport.');
    if(rule.code==='collaboration_v9')return result(rule,'review','WFP behaviour and cross-cultural collaboration competencies are assessed from the application and are not stored in the Passport.');
    if(rule.code==='new_full_time_course_v9')return result(rule,'review','The scholarship requires a new full-time Oxford graduate course; intended course and offer status must be confirmed.');
    if(rule.code==='return_residence_v9')return result(rule,'review','The applicant must intend to return to the country of ordinary residence after study; this requires self-declaration.');
    if(rule.code==='current_oxford_exclusion_v9')return result(rule,'review','Current Oxford enrolment and the existing-scholar exception are not stored in the Passport.');
    if(rule.code==='deferred_offer_exclusion_v9')return result(rule,'review','Deferred-offer status must be checked against the current Oxford application.');
    if(rule.code==='public_life_connection_v9')return result(rule,'review','The required link between study, career objectives and improving public life is assessed from the scholarship statement/application.');
    if(rule.code==='professional_background_v9')return result(rule,'info','VLIR-UOS gives preference to specified development-oriented professional backgrounds, but this is not a universal exclusion.',false);
    return null;
  }

  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];
    let checks=[...(base.checks||[])];
    for(const rule of rules){
      const s=special(rule,currentProfile);if(!s)continue;
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
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,blockerPrecisionV29:true};
  };
  window.evaluate=evaluate;try{renderAll()}catch{}
})();