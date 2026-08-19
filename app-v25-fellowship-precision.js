(()=>{
  const previousEvaluate=evaluate;
  const norm=v=>String(v||'').trim().toLowerCase();
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const result=(r,status,detail,hard=r.hard!==false)=>({label:r.label||'Eligibility rule',status,detail,hard,source_url:r.source_url||'',source_note:r.source_note||'',rule_code:r.code||''});
  const hasBachelor=p=>/bachelor's degree|master's student|master's degree|phd student|phd degree/i.test(p.edu||'');
  const hasMasters=p=>/master's degree|phd student|phd degree/i.test(p.edu||'');
  const hasPhd=p=>/phd degree/i.test(p.edu||'');
  const isStudent=p=>/student/i.test(p.edu||'');
  const parseDate=s=>{const t=new Date(String(s||'')+'T00:00:00Z').getTime();return Number.isFinite(t)?t:null};

  function education(rule,p){
    const v=val(rule),kind=v.kind||'';
    if(kind==='bachelor_min')return hasBachelor(p)?result(rule,'pass','Your Passport shows at least a bachelor-level degree.'):p.edu?result(rule,'fail','This programme requires at least a first university degree.'):result(rule,'review','Add education level to test the first-degree requirement.');
    if(kind==='masters_min')return hasMasters(p)?result(rule,'pass','Your Passport shows a completed master-level qualification or higher.'):p.edu?result(rule,'fail','This programme requires a Master’s degree.'):result(rule,'review','Add education level to test the Master’s-degree requirement.');
    if(kind==='radcliffe_terminal'){
      if(!hasPhd(p))return result(rule,'review','Academic Radcliffe routes normally require a doctorate or equivalent terminal degree; creative/journalism routes use different criteria.');
      const d=parseDate(p.graduationDate);if(d==null)return result(rule,'review','Academic routes require the terminal degree by December 2023 for 2027–28; add the degree completion date.');
      return d<=parseDate('2023-12-31')?result(rule,'review','Terminal-degree timing fits, but discipline-specific publication/output requirements still need confirmation.'):result(rule,'fail','For the 2027–28 academic routes, the terminal degree must have been received by December 2023.');
    }
    if(kind==='none_required')return result(rule,'pass','The provider does not set a universal academic-degree requirement.',false);
    return null;
  }
  function age(rule,p){
    const v=val(rule);if(!p.age)return result(rule,'review','Add age to test this requirement.');const a=Number(p.age);
    if(v.conditional_max){
      if(a<Number(v.standard_max))return result(rule,'pass',`Age is below the standard limit of ${v.standard_max}.`);
      if(a>=Number(v.conditional_max))return result(rule,'fail',`Applicants must be under ${v.standard_max}, or under ${v.conditional_max} only under the stated exception.`);
      return result(rule,'review',`Age is above the standard limit; eligibility depends on the provider’s exception (${v.exception||'special condition'}).`);
    }
    if(v.min!=null&&a<Number(v.min))return result(rule,'fail',`Minimum age is ${v.min}.`);
    if(v.max!=null&&a>Number(v.max))return result(rule,'fail',`Maximum age is ${v.max}.`);
    return result(rule,'pass','Age fits the verified requirement.');
  }
  function experience(rule,p){
    const v=val(rule),m=Number(p.expMonths||0),min=Number(v.min_months||0);
    if(m<min)return result(rule,'fail',`At least ${min} months of professional experience are required.`);
    if(v.relevance_required)return result(rule,'review',`You meet the ${min}-month quantity, but the provider requires experience specifically in ${v.relevance||'the relevant professional field'}.`);
    return result(rule,'pass',`You meet the ${min}-month experience threshold.`);
  }
  function profession(rule,p){
    const v=val(rule),field=norm(p.field);
    if(v.kind==='journalist'){
      const adjacent=/journal|media|communication/.test(field);
      return result(rule,'review',adjacent?'Your field is journalism/media-adjacent, but current professional journalism status must still be confirmed.':'This fellowship requires current professional journalism work; occupation is not yet stored in the Passport.');
    }
    if(v.kind==='science_journalist')return result(rule,'review','The programme requires full-time journalism specifically covering science, health, technology or environment; the Passport does not yet store beat/current role.');
    if(v.kind==='ocean_professional')return result(rule,'review','The fellowship requires a mid-level government or professional role directly connected to ocean affairs/law of the sea; current professional duties are not stored in the Passport.');
    if(v.kind==='international_law')return result(rule,'review',/law/.test(field)?'Your field is law-related, but professional international-law experience must still be confirmed.':'A legal background plus professional international-law experience is required.');
    return result(rule,'review',v.detail||'Current professional role needs confirmation.');
  }
  function english(rule,p){
    const v=val(rule);if(p.english&&p.english!=='Not specified')return result(rule,v.evidence_required?'review':'pass',v.evidence_required?'You have an English-readiness signal, but this programme requires accepted evidence/certification.':'Your Passport contains an English-readiness signal.');
    return result(rule,'review',v.detail||'English proficiency must be confirmed.');
  }
  function radcliffe(rule,p){
    if(isStudent(p))return result(rule,'fail','Applicants currently enrolled in a degree programme are ineligible for the Radcliffe Fellowship.');
    const field=norm(p.field),m=Number(p.expMonths||0);
    if(/journal|media|communication/.test(field))return m>=60?result(rule,'review','Your experience quantity can fit the journalism route, but Radcliffe requires at least five years specifically as a professional journalist and journalism work samples.'):result(rule,'fail','The journalism route requires at least five years of professional journalism experience.');
    if(/engineering|computer|mathemat|biolog|physical|environment|medicine|public health/.test(field))return hasPhd(p)?result(rule,'review','Science/engineering/mathematics applicants need a doctorate by December 2023 plus at least five refereed articles; publication history is not stored.'):result(rule,'fail','The science/engineering/mathematics route requires a doctorate or equivalent terminal qualification.');
    if(/business|econom|law|politic|history|language|education|social|humanit/.test(field))return hasPhd(p)?result(rule,'review','Humanities/social-sciences applicants need a terminal degree by December 2023 plus the required scholarly publications; publication history is not stored.'):result(rule,'review','This field may fit a humanities/social-science or creative route, but the relevant terminal-degree/output requirement needs confirmation.');
    return result(rule,'review','Radcliffe uses discipline-specific scholarly, journalism, nonfiction or creative-output routes; select the intended discipline to resolve eligibility.');
  }
  function special(rule,p){
    const v=val(rule);
    if(rule.certainty&&rule.certainty!=='confirmed')return result(rule,'review',rule.source_note||'This criterion belongs to the latest published cycle and must be refreshed before it can decide the next cycle.');
    if(rule.code==='education_v5')return education(rule,p);
    if(rule.code==='age_v5')return age(rule,p);
    if(rule.code==='experience_v5')return experience(rule,p);
    if(rule.code==='profession_v5')return profession(rule,p);
    if(rule.code==='english_v5')return english(rule,p);
    if(rule.code==='radcliffe_route_v5')return radcliffe(rule,p);
    if(rule.code==='current_degree_exclusion_v5')return isStudent(p)?result(rule,'fail','Current degree enrolment is excluded by this programme.'):result(rule,'pass','Your Passport does not show current degree enrolment.');
    if(rule.code==='recent_fellowship_exclusion_v5')return result(rule,'review',`Applicants must not have completed a residential fellowship of ${v.min_length_months||4}+ months within the previous ${v.within_years||2} years; fellowship history is not stored in the Passport.`);
    if(rule.code==='vacancy_specific_v5')return result(rule,'review',rule.source_note||v.detail||'Additional eligibility is defined by the individual fellowship vacancy.');
    if(rule.code==='provider_condition_v5')return result(rule,v.hard===false?'info':'review',rule.source_note||v.detail||'This provider-specific condition needs confirmation.',v.hard!==false);
    return null;
  }
  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];let checks=[...(base.checks||[])];
    for(const rule of rules){const s=special(rule,currentProfile);if(!s)continue;const covers=val(rule).covers||[];checks=checks.filter(c=>c.rule_code!==rule.code&&!covers.includes(c.label));checks.unshift(s)}
    const seen=new Set();checks=checks.filter(c=>{const k=`${c.label}|${c.rule_code||''}`;if(seen.has(k))return false;seen.add(k);return true});
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length,reviews=checks.filter(c=>c.status==='review').length,passes=checks.filter(c=>c.status==='pass').length,hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;if(fails){label='Not eligible';cls='ineligible';rank=0}else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,fellowshipPrecisionV25:true};
  };
  window.evaluate=evaluate;try{renderAll()}catch{}
})();