(()=>{
  const previousEvaluate=evaluate;
  const norm=v=>String(v||'').trim().toLowerCase();
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const result=(r,status,detail,hard=r.hard!==false)=>({label:r.label||'Eligibility rule',status,detail,hard,source_url:r.source_url||'',source_note:r.source_note||'',rule_code:r.code||''});
  const isStudent=p=>/student/i.test(p.edu||'');
  const isUndergrad=p=>/undergraduate student/i.test(p.edu||'');
  const hasBachelor=p=>/bachelor's degree|master's student|master's degree|phd student|phd degree/i.test(p.edu||'');
  const hasMasters=p=>/master's degree|phd student|phd degree/i.test(p.edu||'');
  const fieldIsStem=p=>/computer|engineering|biological|physical|environmental|mathematics|medicine|agriculture/i.test(p.field||'');
  const parseDate=s=>{const t=new Date(String(s||'')+'T00:00:00Z').getTime();return Number.isFinite(t)?t:null};

  function degreeRoute(rule,p){
    const v=val(rule),kind=v.kind||'';
    if(kind==='gates_cambridge'){
      if(!p.edu)return result(rule,'review','Add education level to assess postgraduate study eligibility.');
      if(hasBachelor(p))return result(rule,'review','Your degree level can support a Cambridge postgraduate application, but exact course admission still needs confirmation.');
      return result(rule,'fail','Gates Cambridge requires an eligible postgraduate course at Cambridge.');
    }
    if(kind==='yenching'){
      if(!p.edu)return result(rule,'review','Add education level to assess Yenching eligibility.');
      if(hasBachelor(p))return result(rule,'pass','Your Passport shows the bachelor-level baseline required by Yenching.');
      if(isUndergrad(p)){
        const d=parseDate(p.graduationDate);if(d==null)return result(rule,'review','Final-year applicants may qualify; add expected graduation date to confirm completion by 31 August 2027.');
        return d<=parseDate('2027-08-31')?result(rule,'pass','Expected graduation is on or before 31 August 2027.'):result(rule,'fail','The degree must be completed by 31 August 2027.');
      }
      return result(rule,'fail','Yenching requires a bachelor degree or final-year bachelor status.');
    }
    if(kind==='kaust'){
      if(!p.edu)return result(rule,'review','Add education level to identify the KAUST graduate route.');
      if(hasMasters(p))return result(rule,'pass','Your degree level can support a KAUST PhD application, subject to programme relevance.');
      if(hasBachelor(p))return result(rule,'pass','Your degree level can support a KAUST Master’s application, subject to programme relevance.');
      return result(rule,'fail','KAUST graduate admission requires a relevant bachelor degree for Master’s entry or relevant master degree for PhD entry.');
    }
    if(kind==='eth_esop'){
      if(!p.edu)return result(rule,'review','Add education level to assess ETH ESOP eligibility.');
      if(/master's degree|phd/i.test(p.edu||''))return result(rule,'fail','Applicants who already hold a Master degree are not eligible for ESOP.');
      if(hasBachelor(p)||isUndergrad(p))return result(rule,'review','Your level fits a Master’s-entry route; ETH Master admission and bachelor completion still need to be confirmed.');
      return result(rule,'fail','ESOP is tied to entry into an ETH Master’s programme.');
    }
    if(kind==='maastricht_master'){
      if(!p.edu)return result(rule,'review','Add education level to assess Master’s eligibility.');
      return hasBachelor(p)?result(rule,'review','Your degree level can support a participating Maastricht Master’s application; programme admission still needs confirmation.'):result(rule,'fail','This scholarship is for applicants to participating Master’s programmes.');
    }
    if(kind==='swiss_research'){
      if(!p.edu)return result(rule,'review','Add education level to identify the Swiss scholarship route.');
      if(hasMasters(p))return result(rule,'pass','Your degree level fits the research/PhD scholarship baseline.');
      return result(rule,'fail','The standard Swiss research and PhD scholarship routes require a completed Master’s degree or equivalent.');
    }
    if(kind==='cambridge_trust'){
      if(!p.edu)return result(rule,'review','Add education level to assess Cambridge postgraduate funding eligibility.');
      if(hasBachelor(p))return result(rule,'review','Your level can support a Cambridge postgraduate application; exact course level and offer status still need confirmation.');
      return result(rule,'fail','Cambridge Trust postgraduate funding requires entry to an eligible Master’s or PhD course.');
    }
    if(kind==='jjwbgsp')return hasBachelor(p)?result(rule,'pass','Your Passport shows the bachelor-degree baseline.'):p.edu?result(rule,'fail','JJ/WBGSP requires a bachelor’s degree or equivalent.'):result(rule,'review','Add education level to test the bachelor-degree requirement.');
    if(kind==='adb_jsp')return hasBachelor(p)?result(rule,'pass','Your Passport shows the bachelor-degree baseline.'):p.edu?result(rule,'fail','ADB-JSP requires a bachelor degree or equivalent.'):result(rule,'review','Add education level to test the bachelor-degree requirement.');
    return null;
  }

  function gpaRule(rule,p){
    const v=val(rule),g=Number(p.gpa);
    if(p.gpa===''||p.gpa==null||!Number.isFinite(g))return result(rule,'review',v.message||'Add GPA or academic result to assess this requirement.');
    if(v.scale===4)return g<=4?(g>=Number(v.min)?result(rule,'pass',`Your GPA meets the ${v.min}/4.0 minimum.`):result(rule,'fail',`The minimum permitted GPA is ${v.min}/4.0.`)):result(rule,'review','Your GPA appears to use a different scale; official conversion is needed.');
    if(v.scale===10)return g<=10?(g>=Number(v.min)?result(rule,'pass',`Your GPA meets the ${v.min}/10 threshold.`):result(rule,'fail',`The published threshold is ${v.min}/10.`)):result(rule,'review','Your GPA appears to use a different scale; official conversion is needed.');
    return result(rule,'review','Academic-result scale needs provider-specific conversion.');
  }
  function ageRule(rule,p){
    const v=val(rule);if(!p.age)return result(rule,'review','Add age to test this requirement.');const a=Number(p.age);
    if(v.min!=null&&a<Number(v.min))return result(rule,'fail',`Minimum age is ${v.min}.`);
    if(v.max!=null&&a>Number(v.max))return result(rule,'fail',`Maximum age is ${v.max}.`);
    return result(rule,'pass','Age fits the verified rule.');
  }
  function englishRule(rule,p){
    const v=val(rule);
    if(v.waiver_degree_taught_english&&/degree taught in english/i.test(p.english||''))return result(rule,'pass','Your Passport indicates a degree taught in English and this route allows that waiver.');
    if(v.waiver_degree_countries&&p.degreeCountry&&v.waiver_degree_countries.some(c=>norm(c)===norm(p.degreeCountry)))return result(rule,'pass','Your degree country fits the published English-test exemption route.');
    if(p.english&&p.english!=='Not specified')return result(rule,'review',v.detail||'You have an English-readiness signal, but the provider’s exact accepted evidence or score still needs confirmation.');
    return result(rule,'review',v.detail||'Add English readiness to test this requirement.');
  }
  function experienceRule(rule,p){
    const v=val(rule),m=Number(p.expMonths||0),min=Number(v.min_months||0);
    if(m<min)return result(rule,'fail',`At least ${min} months of qualifying professional experience are required.`);
    if(v.post_degree&&!p.graduationDate)return result(rule,'review','You meet the experience quantity, but it must have been acquired after the bachelor degree; add graduation date to verify timing.');
    if(v.relevance_required)return result(rule,'review','You meet the experience quantity, but the provider requires development-related/relevant professional work.');
    return result(rule,'pass',`You meet the ${min}-month experience threshold.`);
  }
  function degreeAge(rule,p){
    const v=val(rule),d=parseDate(p.graduationDate);if(d==null)return result(rule,'review',`Add graduation date to confirm the degree was earned at least ${v.min_years} years before the application deadline.`);
    const years=(Date.now()-d)/(365.2425*864e5);return years>=Number(v.min_years)?result(rule,'pass',`Your stored graduation date is at least ${v.min_years} years ago.`):result(rule,'fail',`The bachelor degree must have been earned at least ${v.min_years} years before the application deadline.`);
  }
  function graduationBy(rule,p){
    const v=val(rule),d=parseDate(p.graduationDate);if(d==null)return result(rule,'review',`Add graduation date to confirm completion by ${v.date}.`);
    return d<=parseDate(v.date)?result(rule,'pass',`Graduation timing fits the ${v.date} deadline.`):result(rule,'fail',`Required qualification must be completed by ${v.date}.`);
  }
  function swissResidence(rule,p){
    if(!p.residence)return result(rule,'review','Add country of residence to test the Swiss prior-residence restriction.');
    if(norm(p.residence)!=='switzerland')return result(rule,'pass','Your current residence does not trigger the Swiss prior-residence limit.');
    return result(rule,'review','You currently reside in Switzerland; the exact entry date is needed to confirm the 13-month limit.');
  }
  function noMasters(rule,p){
    if(!p.edu)return result(rule,'review','Add education level to test the prior-Master restriction.');
    return /master's degree|phd/i.test(p.edu||'')?result(rule,'fail','This route excludes applicants who already hold a Master degree or higher.'):result(rule,'pass','Your Passport does not show a completed Master degree.');
  }
  function notGraduateStudent(rule,p){
    if(!p.edu)return result(rule,'review','Add education status to test the current-enrolment restriction.');
    return /master's student|phd student/i.test(p.edu||'')?result(rule,'fail','This programme excludes applicants already enrolled in a graduate degree programme.'):result(rule,'pass','Your Passport does not show current graduate-degree enrolment.');
  }
  function homeCountry(rule,p){
    if(!p.nat||!p.residence)return result(rule,'review','Add nationality and residence to test the home-country requirement.');
    if(norm(p.nat)!==norm(p.residence))return result(rule,'fail','This programme requires the applicant to be living in the home country.');
    return result(rule,'review','Nationality and residence match, but current work location and return-home commitment still need confirmation.');
  }
  function special(rule,p){
    const v=val(rule);
    if(rule.certainty&&rule.certainty!=='confirmed')return result(rule,'review',rule.source_note||'This rule comes from the latest published cycle and must be refreshed for the next cycle before it can decide eligibility.');
    if(rule.code==='degree_route_v4')return degreeRoute(rule,p);
    if(rule.code==='gpa_v4')return gpaRule(rule,p);
    if(rule.code==='age_v4')return ageRule(rule,p);
    if(rule.code==='english_v4')return englishRule(rule,p);
    if(rule.code==='experience_v4')return experienceRule(rule,p);
    if(rule.code==='degree_age_v4')return degreeAge(rule,p);
    if(rule.code==='graduation_by_v4')return graduationBy(rule,p);
    if(rule.code==='swiss_residence_v4')return swissResidence(rule,p);
    if(rule.code==='no_masters_v4')return noMasters(rule,p);
    if(rule.code==='not_graduate_student_v4')return notGraduateStudent(rule,p);
    if(rule.code==='home_country_v4')return homeCountry(rule,p);
    if(rule.code==='top_percent_v4')return result(rule,'review',`The scholarship expects roughly the top ${v.percent||10}% of the bachelor cohort; class percentile is not stored in the Passport.`);
    if(rule.code==='admission_v4')return result(rule,'review',rule.source_note||v.detail||'Admission to an eligible programme must be confirmed.');
    if(rule.code==='provider_condition_v4')return result(rule,v.hard===false?'info':'review',rule.source_note||v.detail||'This provider-specific condition needs confirmation.',v.hard!==false);
    return null;
  }

  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];let checks=[...(base.checks||[])];
    for(const rule of rules){const s=special(rule,currentProfile);if(!s)continue;const covers=val(rule).covers||[];checks=checks.filter(c=>c.rule_code!==rule.code&&!covers.includes(c.label));checks.unshift(s)}
    const seen=new Set();checks=checks.filter(c=>{const k=`${c.label}|${c.rule_code||''}`;if(seen.has(k))return false;seen.add(k);return true});
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length,reviews=checks.filter(c=>c.status==='review').length,passes=checks.filter(c=>c.status==='pass').length,hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;if(fails){label='Not eligible';cls='ineligible';rank=0}else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,precisionV24:true};
  };
  window.evaluate=evaluate;try{renderAll()}catch{}
})();
