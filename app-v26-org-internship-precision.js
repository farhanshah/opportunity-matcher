(()=>{
  const previousEvaluate=evaluate;
  const norm=v=>String(v||'').trim().toLowerCase();
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const result=(r,status,detail,hard=r.hard!==false)=>({label:r.label||'Eligibility rule',status,detail,hard,source_url:r.source_url||'',source_note:r.source_note||'',rule_code:r.code||''});
  const isUndergrad=p=>/undergraduate student/i.test(p.edu||'');
  const isMastersStudent=p=>/master's student/i.test(p.edu||'');
  const isPhdStudent=p=>/phd student/i.test(p.edu||'');
  const hasMasters=p=>/master's degree|phd student|phd degree/i.test(p.edu||'');
  const hasUniversityDegree=p=>/bachelor's degree|master's degree|phd degree/i.test(p.edu||'');
  const parseDate=s=>{const t=new Date(String(s||'')+'T00:00:00Z').getTime();return Number.isFinite(t)?t:null};
  const monthsSince=s=>{const t=parseDate(s);return t==null?null:(Date.now()-t)/(30.4375*864e5)};

  function recentGraduate(p,maxMonths,label){
    if(!hasUniversityDegree(p))return null;
    const m=monthsSince(p.graduationDate);
    if(m==null)return {status:'review',detail:`${label} accepts recent graduates; add graduation date to verify the time window.`};
    return m>=0&&m<=maxMonths?{status:'pass',detail:`Your graduation date is within the ${maxMonths}-month recent-graduate window.`}:{status:'fail',detail:`This route requires graduation within ${maxMonths} months.`};
  }

  function education(rule,p){
    const v=val(rule),kind=v.kind||'';
    if(!p.edu)return result(rule,'review','Add education level to resolve the internship education route.');
    if(kind==='wto'){
      if(isPhdStudent(p))return result(rule,'pass','Current doctoral study fits the WTO postgraduate route.');
      if(isMastersStudent(p))return result(rule,'review','WTO requires at least one year of the Master’s degree to be completed; year-of-study is not yet stored in the Passport.');
      if(/master's degree|phd degree/i.test(p.edu||'')){
        const r=recentGraduate(p,24,'WTO');return result(rule,r.status,r.detail);
      }
      return result(rule,'fail','WTO internships require an eligible postgraduate student or recent postgraduate graduate route.');
    }
    if(kind==='fao'){
      if(isUndergrad(p)||isMastersStudent(p)||isPhdStudent(p))return result(rule,'pass','Your Passport shows current university enrolment, which fits the FAO student route.');
      if(hasUniversityDegree(p))return result(rule,'review','FAO also accepts recent graduates, but the central page does not publish one universal recency limit; current assignment rules must confirm it.');
      return result(rule,'fail','FAO requires current university enrolment or recent university-graduate status.');
    }
    if(kind==='wfp'){
      if(isMastersStudent(p)||isPhdStudent(p))return result(rule,'pass','Your postgraduate student stage satisfies the two-years-of-undergraduate-study baseline; recent class attendance still applies.');
      if(isUndergrad(p))return result(rule,'review','WFP requires at least two completed undergraduate years and class attendance in the past 12 months; study-year detail is not stored.');
      if(hasUniversityDegree(p)){
        const r=recentGraduate(p,6,'WFP');return result(rule,r.status,r.detail);
      }
      return result(rule,'fail','WFP requires a current student or recent-graduate route.');
    }
    if(kind==='ilo'){
      if(isPhdStudent(p))return result(rule,'pass','Higher-degree enrolment fits the ILO education route, subject to relevance to ILO work.');
      if(isMastersStudent(p))return result(rule,'review','ILO requires the last year of a graduate degree; final-year status is not yet stored in the Passport.');
      if(/master's degree|phd degree/i.test(p.edu||'')){
        const r=recentGraduate(p,12,'ILO');return result(rule,r.status,r.detail);
      }
      return result(rule,'fail','ILO internships require final-year graduate study, higher-degree study, or a qualifying graduate completed within the previous year.');
    }
    if(kind==='unhcr'){
      if(isMastersStudent(p)||isPhdStudent(p))return result(rule,'pass','Your postgraduate enrolment implies the required two undergraduate years have been completed.');
      if(isUndergrad(p))return result(rule,'review','UNHCR requires at least two completed undergraduate years; study-year detail is not stored.');
      if(hasUniversityDegree(p)){
        const r=recentGraduate(p,24,'UNHCR');return result(rule,r.status,r.detail);
      }
      return result(rule,'fail','UNHCR requires current university enrolment or graduation within two years.');
    }
    if(kind==='adb'){
      if(!(isMastersStudent(p)||isPhdStudent(p)))return result(rule,'fail','ADB internships are only for current Master’s or PhD students.');
      return result(rule,'review','Your degree stage fits, but ADB requires you to remain enrolled for the entire internship; continued-enrolment timing is not stored.');
    }
    if(kind==='aiib'){
      if(isMastersStudent(p)||isPhdStudent(p))return result(rule,'pass','Your current Master’s/PhD enrolment fits the published AIIB internship route.');
      if(/master's degree|phd degree/i.test(p.edu||''))return result(rule,'review','The current programme page allows graduates from the same application year; graduation timing must be checked against the active call.');
      return result(rule,'fail','The current AIIB programme is aimed at Master’s/doctoral students or qualifying same-year graduates.');
    }
    if(kind==='ebrd'){
      if(isMastersStudent(p)||isPhdStudent(p))return result(rule,'pass','Your postgraduate study stage fits the normal EBRD internship profile.');
      if(/bachelor's degree/i.test(p.edu||'')){
        const r=recentGraduate(p,12,'EBRD');return result(rule,r.status,r.detail);
      }
      return result(rule,'review','EBRD normally expects postgraduate study or an undergraduate programme completed within the last 12 months.');
    }
    if(kind==='unops'){
      if(isUndergrad(p)||isMastersStudent(p)||isPhdStudent(p))return result(rule,'pass','Your current university enrolment is compatible with the common UNOPS internship education route; the specific vacancy still governs.');
      if(hasUniversityDegree(p)){
        const r=recentGraduate(p,36,'UNOPS');return result(rule,r.status,r.detail);
      }
      return result(rule,'fail','UNOPS internship vacancies generally require current university study or recent graduation.');
    }
    if(kind==='unfpa'){
      if(isMastersStudent(p)||isPhdStudent(p))return result(rule,'pass','Your postgraduate enrolment fits a UNFPA internship route.');
      if(isUndergrad(p))return result(rule,'review','UNFPA requires at least one completed academic year for the current first-degree route; year-of-study is not stored.');
      if(hasUniversityDegree(p)){
        const r=recentGraduate(p,12,'UNFPA');return result(rule,r.status,r.detail);
      }
      return result(rule,'review','UNFPA also accepts some postgraduate professional-trainee routes that are not yet represented in the Passport.');
    }
    return null;
  }

  function age(rule,p){
    const v=val(rule);if(!p.age)return result(rule,'review','Add age to test this internship age rule.');const a=Number(p.age);
    if(v.min!=null&&a<Number(v.min))return result(rule,'fail',`Minimum age is ${v.min}.`);
    if(v.max!=null&&a>Number(v.max))return result(rule,'fail',`Maximum age at internship start is ${v.max}.`);
    return result(rule,'pass','Age fits the verified programme rule.');
  }
  function language(rule,p){
    const v=val(rule),english=norm(p.english);
    if(v.english_b2){
      if(!english||english==='not specified')return result(rule,'review','UNHCR requires at least B2 English; add English evidence to the Passport.');
      return result(rule,'review','Your Passport has an English-readiness signal, but B2-equivalent evidence still needs confirmation.');
    }
    if(v.english_required){
      if(!english||english==='not specified')return result(rule,'review','This programme requires English proficiency; add English evidence to the Passport.');
      return result(rule,'pass','Your Passport contains an English-readiness signal.');
    }
    if(v.one_of_languages)return result(rule,'review',`Working proficiency in at least one of ${v.one_of_languages.join(', ')} is required; the Passport currently stores only a general English signal.`);
    if(v.office_language_plus_un_language)return result(rule,'review','UNFPA requires a UN working language plus fluency in the official language of the office; the specific office language is vacancy-dependent.');
    return null;
  }
  function field(rule,p){
    const v=val(rule);if(!p.field)return result(rule,'review','Add field of study to compare with the internship’s work area.');
    if(v.vacancy_specific)return result(rule,'review','Your field is recorded, but relevance must be checked against the specific vacancy/assignment.');
    return result(rule,'review',rule.source_note||'The provider requires study in a field relevant to its work; detailed field-to-role mapping is still needed.');
  }
  function selfDeclaration(rule,p){
    const v=val(rule);
    if(v.kind==='family')return result(rule,'review',rule.source_note||'Immediate-family employment restrictions require a self-declaration not yet stored in the Passport.');
    if(v.kind==='prior_internship')return result(rule,'review',rule.source_note||'Previous internship/ILO employment history must be confirmed.');
    if(v.kind==='residence_or_visa')return result(rule,'review',rule.source_note||'Assignment-country residence/immigration status must be confirmed before the internship starts.');
    if(v.kind==='development_interest')return result(rule,'review',rule.source_note||'The provider requires demonstrated interest in development; this is assessed from the application rather than the current Passport.');
    return result(rule,'review',rule.source_note||'This applicant-specific condition requires confirmation.');
  }

  function special(rule,p){
    if(rule.certainty&&rule.certainty!=='confirmed')return result(rule,'review',rule.source_note||'This criterion belongs to the latest published cycle and must be refreshed for the next cycle.');
    if(rule.code==='education_route_v6')return education(rule,p);
    if(rule.code==='age_v6')return age(rule,p);
    if(rule.code==='language_v6')return language(rule,p);
    if(rule.code==='field_fit_v6')return field(rule,p);
    if(rule.code==='self_declaration_v6')return selfDeclaration(rule,p);
    return null;
  }

  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];let checks=[...(base.checks||[])];
    for(const rule of rules){const s=special(rule,currentProfile);if(!s)continue;const covers=val(rule).covers||[];checks=checks.filter(c=>c.rule_code!==rule.code&&!covers.includes(c.label));checks.unshift(s)}
    const seen=new Set();checks=checks.filter(c=>{const k=`${c.label}|${c.rule_code||''}`;if(seen.has(k))return false;seen.add(k);return true});
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length,reviews=checks.filter(c=>c.status==='review').length,passes=checks.filter(c=>c.status==='pass').length,hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;if(fails){label='Not eligible';cls='ineligible';rank=0}else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,orgInternshipPrecision:true};
  };
  window.evaluate=evaluate;try{renderAll()}catch{}
})();