(()=>{
  const previousEvaluate=evaluate;
  const norm=v=>String(v||'').trim().toLowerCase();
  const value=rule=>rule?.value&&typeof rule.value==='object'?rule.value:{};
  const result=(rule,status,detail,hard=rule.hard!==false)=>({label:rule.label||'Eligibility rule',status,detail,hard,source_url:rule.source_url||'',source_note:rule.source_note||'',rule_code:rule.code||''});
  const completedBachelor=p=>/bachelor's degree|master's student|master's degree|phd student|phd degree/i.test(p.edu||'');
  const completedMasters=p=>/master's degree|phd student|phd degree/i.test(p.edu||'');
  const postSecondary=p=>/undergraduate student|bachelor's degree|master's student|master's degree|phd student|phd degree/i.test(p.edu||'');
  const currentPhd=p=>/phd student/i.test(p.edu||'');
  const fieldMap={
    'Business & Management':['economics and management'],
    'Economics':['economics and management'],
    'Accounting & Finance':['economics and management'],
    'Law & Legal Studies':['law and political science'],
    'Politics & Public Policy':['law and political science'],
    'History, Philosophy & Religion':['history, french language and civilization'],
    'Languages & Linguistics':['history, french language and civilization'],
    'Biological & Life Sciences':['biology and health'],
    'Medicine & Dentistry':['biology and health'],
    'Public Health':['biology and health'],
    'Environmental & Earth Sciences':['ecological transition'],
    'Mathematics & Statistics':['mathematics and digital'],
    'Computer Science, AI & Data':['mathematics and digital'],
    'Engineering — Aerospace':['engineering sciences'],
    'Engineering — Chemical':['engineering sciences'],
    'Engineering — Civil':['engineering sciences'],
    'Engineering — Electrical & Electronic':['engineering sciences'],
    'Engineering — Mechanical':['engineering sciences'],
    'Engineering — Other':['engineering sciences']
  };

  function stale(rule){return rule.certainty&&rule.certainty!=='confirmed'}
  function ageCutoff(rule,p){
    const v=value(rule);if(!p.age)return result(rule,'review','Add age or date of birth to resolve this verified age rule.');
    const a=Number(p.age),cut=v.birth_on_or_after||'';
    if(!cut)return result(rule,'review','This age rule needs an exact date-of-birth check.');
    const boundaryYear=new Date(cut+'T00:00:00Z').getUTCFullYear();
    const refYear=Number(v.reference_year||2026);const maxApprox=refYear-boundaryYear;
    if(a<=maxApprox-1)return result(rule,'pass',`Your age is safely within the verified birth-date cutoff (${cut}).`);
    if(a>=maxApprox+1)return result(rule,'fail',`The verified rule requires birth on or after ${cut}.`);
    return result(rule,'review',`Your age is on the boundary; exact date of birth is needed for the ${cut} cutoff.`);
  }
  function academicPercent(rule,p){
    const v=value(rule),min=Number(v.min||0);
    if(p.gpa===''||p.gpa==null)return result(rule,'review',`The provider requires at least ${min}% academic achievement; add an academic result or verify the official equivalency.`);
    const g=Number(p.gpa);
    if(g>10&&g<=100)return g>=min?result(rule,'pass',`Your stored academic percentage meets the ${min}% minimum.`):result(rule,'fail',`The verified minimum is ${min}%.`);
    return result(rule,'review',`Your GPA uses a different scale; the provider's ${min}% threshold needs an official/equivalent conversion.`);
  }
  function routeAge(rule,p){
    const v=value(rule),routes=v.routes||{};if(!p.edu)return result(rule,'review','Add education level to identify the applicable scholarship level and age cap.');
    let key='';if(/secondary|undergraduate student/i.test(p.edu))key='undergraduate';else if(/bachelor's degree/i.test(p.edu))key='masters';else if(/master's student|master's degree/i.test(p.edu))key='phd';
    if(!key||!routes[key])return result(rule,'review','Your intended scholarship level must be confirmed before applying the programme-specific age cap.');
    const max=Number(routes[key]);if(!p.age)return result(rule,'review',`The ${key} route requires applicants to be under ${max}; add age to confirm.`);
    return Number(p.age)<max?result(rule,'pass',`Age fits the ${key} route's under-${max} rule.`):result(rule,'fail',`The ${key} route requires applicants to be under ${max}.`);
  }
  function routeAcademic(rule,p){
    const v=value(rule),routes=v.routes||{};if(!p.edu)return result(rule,'review','Add education level to identify the applicable academic threshold.');
    let key='';if(/secondary|undergraduate student/i.test(p.edu))key='undergraduate';else if(/bachelor's degree|master's student|master's degree|phd/i.test(p.edu))key='graduate';
    if(!key||routes[key]==null)return result(rule,'review','Scholarship level must be confirmed before applying the academic threshold.');
    const proxy={...rule,value:{min:routes[key]}};return academicPercent(proxy,p);
  }
  function educationRule(rule,p){
    const v=value(rule),kind=v.kind||'';
    if(kind==='bachelor_or_higher')return completedBachelor(p)?result(rule,'pass','Your Passport shows a completed bachelor-level degree or higher.'):p.edu?result(rule,'fail','A completed bachelor-level degree or higher is required.'):result(rule,'review','Add education level to test this requirement.');
    if(kind==='masters_or_equivalent_for_doctoral')return completedMasters(p)?result(rule,'pass','Your Passport shows a completed master-level qualification or higher.'):result(rule,'review','Doctoral-entry equivalency depends on the target Japanese graduate school and your prior qualification.');
    if(kind==='twelve_years_schooling')return postSecondary(p)?result(rule,'pass','Your post-secondary status implies completion of the 12-year schooling baseline.'):result(rule,'review','MEXT requires completion (or timely prospective completion) of 12 years of schooling; the Passport does not store school-completion timing.');
    if(kind==='commonwealth_2_1_or_2_2_plus_pg')return result(rule,'review','CSC requires a UK-equivalent 2:1 first degree, or 2:2 plus a relevant postgraduate qualification; academic equivalency must be checked from transcripts.');
    return null;
  }
  function eiffelField(rule,p){
    const allowed=(value(rule).areas||[]).map(norm);if(!p.field)return result(rule,'review','Add field of study to compare with Eiffel priority areas.');
    const mapped=(fieldMap[p.field]||[]).map(norm);return mapped.some(x=>allowed.includes(x))?result(rule,'pass','Your field maps to an Eiffel priority area.'):result(rule,'review','Your field is not an obvious one-to-one match to an Eiffel priority area; the French institution must confirm programme fit.');
  }
  function special(rule,p){
    const v=value(rule),op=rule.operator;
    if(stale(rule))return result(rule,'review',rule.source_note||'This criterion is from the latest published cycle but the next cycle has not yet been confirmed.');
    if(rule.code==='birth_date_cutoff')return ageCutoff(rule,p);
    if(rule.code==='academic_percentage_min')return academicPercent(rule,p);
    if(rule.code==='age_by_level')return routeAge(rule,p);
    if(rule.code==='academic_percentage_by_level')return routeAcademic(rule,p);
    if(rule.code==='education_v3')return educationRule(rule,p);
    if(rule.code==='field_priority')return eiffelField(rule,p);
    if(rule.code==='not_current_phd')return currentPhd(p)?result(rule,'fail','The verified rule excludes applicants already registered for a PhD/MPhil-to-PhD before the stated cutoff.'):result(rule,'pass','Your Passport does not show current PhD enrolment.');
    if(rule.code==='field_related_prior_study')return p.field?result(rule,'review','MEXT requires the proposed research field to be the same as or related to your previous university major; proposed research field is not yet stored.'):result(rule,'review','Add your field of study and proposed research area to resolve this rule.');
    if(rule.code==='institution_nomination')return result(rule,'review','A French higher-education institution must select and submit the Eiffel application; direct student applications are ineligible.');
    if(rule.code==='high_income_exposure_max')return result(rule,'review',`Eligibility depends on whether you have studied or worked for ${v.max_months||12} months or more in a high-income country; the Passport does not yet store that history.`);
    if(rule.code==='financial_need')return result(rule,'review','The provider requires the applicant to be unable to afford the programme without the scholarship; this is declaration/evidence based.');
    if(rule.code==='selected_course_only')return result(rule,'review','Only provider-approved/participating courses are eligible; exact course choice is not yet stored in the Passport.');
    if(rule.code==='parent_nationality')return result(rule,'review','GKS requires the applicant and both parents to hold non-Korean citizenship; parent nationality is not stored in the Passport.');
    if(rule.code==='provider_condition_v3')return result(rule,v.hard===false?'info':'review',rule.source_note||v.detail||'This applicant-specific condition needs confirmation.',v.hard!==false);
    return null;
  }

  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];let checks=[...(base.checks||[])];
    for(const rule of rules){const s=special(rule,currentProfile);if(!s)continue;const covers=value(rule).covers||[];checks=checks.filter(c=>c.rule_code!==rule.code&&!covers.includes(c.label));checks.unshift(s)}
    const seen=new Set();checks=checks.filter(c=>{const k=`${c.label}|${c.rule_code||''}`;if(seen.has(k))return false;seen.add(k);return true});
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length,reviews=checks.filter(c=>c.status==='review').length,passes=checks.filter(c=>c.status==='pass').length,hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;if(fails){label='Not eligible';cls='ineligible';rank=0}else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,finalEligibility:true};
  };
  window.evaluate=evaluate;try{renderAll()}catch{}
})();