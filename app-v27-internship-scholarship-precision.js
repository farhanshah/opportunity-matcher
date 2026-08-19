(()=>{
  const previousEvaluate=evaluate;
  const norm=v=>String(v||'').trim().toLowerCase();
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const result=(r,status,detail,hard=r.hard!==false)=>({label:r.label||'Eligibility rule',status,detail,hard,source_url:r.source_url||'',source_note:r.source_note||'',rule_code:r.code||''});
  const isUndergrad=p=>/undergraduate student/i.test(p.edu||'');
  const isMastersStudent=p=>/master's student/i.test(p.edu||'');
  const isPhdStudent=p=>/phd student/i.test(p.edu||'');
  const hasBachelor=p=>/bachelor's degree|master's student|master's degree|phd student|phd degree/i.test(p.edu||'');
  const hasUniversityDegree=p=>/bachelor's degree|master's degree|phd degree/i.test(p.edu||'');
  const hasMasters=p=>/master's degree|phd student|phd degree/i.test(p.edu||'');
  const parseDate=s=>{const t=new Date(String(s||'')+'T00:00:00Z').getTime();return Number.isFinite(t)?t:null};
  const monthsSince=s=>{const t=parseDate(s);return t==null?null:(Date.now()-t)/(30.4375*864e5)};

  function recentGraduate(p,maxMonths,label){
    if(!hasUniversityDegree(p))return null;
    const m=monthsSince(p.graduationDate);
    if(m==null)return{status:'review',detail:`${label} accepts recent graduates; add graduation date to verify the ${maxMonths}-month window.`};
    return m>=0&&m<=maxMonths?{status:'pass',detail:`Graduation is within the verified ${maxMonths}-month window.`}:{status:'fail',detail:`This route requires graduation within ${maxMonths} months.`};
  }

  function education(rule,p){
    const v=val(rule),kind=v.kind||'';
    if(!p.edu)return result(rule,'review','Add education level to resolve this education route.');
    if(kind==='ifad'){
      if(isMastersStudent(p)||isPhdStudent(p))return result(rule,'pass','Your postgraduate enrolment satisfies the two-year undergraduate-study baseline.');
      if(isUndergrad(p))return result(rule,'review','IFAD requires at least two completed undergraduate years and course attendance within the last 24 months; study-year detail is not stored.');
      if(hasUniversityDegree(p)){const r=recentGraduate(p,24,'IFAD');return result(rule,r.status,r.detail)}
      return result(rule,'fail','IFAD requires current qualifying university study or graduation within 24 months.');
    }
    if(kind==='iom'){
      if(isMastersStudent(p)||isPhdStudent(p))return result(rule,'pass','Graduate-school enrolment fits the IOM internship route.');
      if(isUndergrad(p))return result(rule,'review','IOM accepts final-year first-degree students; final-year status is not yet stored in the Passport.');
      if(hasUniversityDegree(p)){const r=recentGraduate(p,12,'IOM');return result(rule,r.status,r.detail)}
      return result(rule,'fail','IOM requires final-year first-degree study, graduate-school enrolment, or graduation within one year.');
    }
    if(kind==='unesco'){
      if(isMastersStudent(p)||isPhdStudent(p))return result(rule,'pass','Your current second/higher university degree fits UNESCO’s student route.');
      if(isUndergrad(p))return result(rule,'review','UNESCO requires third-year or final-year Bachelor’s status; year-of-study is not stored.');
      if(hasUniversityDegree(p)){const r=recentGraduate(p,12,'UNESCO');return result(rule,r.status,r.detail)}
      return result(rule,'fail','UNESCO requires an eligible current-student route or graduation within 12 months.');
    }
    if(kind==='itu'){
      if(isUndergrad(p)||isMastersStudent(p)||isPhdStudent(p))return result(rule,'pass','Your current university enrolment fits the ITU student route.');
      if(hasUniversityDegree(p)){const r=recentGraduate(p,6,'ITU');return result(rule,r.status,r.detail)}
      return result(rule,'fail','ITU requires current university enrolment or graduation within six months of the internship.');
    }
    if(kind==='eib'){
      if(isUndergrad(p)||isMastersStudent(p))return result(rule,'review','EIB accepts final-year university students; final-year status must be confirmed.');
      if(hasUniversityDegree(p))return result(rule,'pass','Your completed university qualification fits the recent-graduate route; experience since the last degree is checked separately.');
      return result(rule,'fail','EIB traineeships require final-year university status or recent graduate status.');
    }
    if(kind==='idb'){
      if(isUndergrad(p))return result(rule,'review','IDB requires undergraduate interns to be at least in their second year; study-year detail is not stored.');
      if(isMastersStudent(p)||isPhdStudent(p))return result(rule,'review','IDB requires graduate students to have completed at least 50% of coursework; progress is not stored.');
      return result(rule,'fail','The standard IDB internship route requires active undergraduate or graduate student status.');
    }
    if(kind==='ecb')return hasBachelor(p)?result(rule,'pass','Your Passport shows the completed first-cycle degree baseline required by the ECB.'):result(rule,'fail','ECB traineeships require at least a completed bachelor-level qualification.');
    if(kind==='wipo'){
      if(isUndergrad(p))return result(rule,'review','WIPO Category I accepts third/fourth-year undergraduates or students needing an internship for degree requirements; year/requirement detail is not stored.');
      if(isMastersStudent(p))return result(rule,'review','WIPO category depends on whether Master’s coursework/thesis has been completed; that progress signal is not stored.');
      if(/bachelor's degree/i.test(p.edu||'')){const r=recentGraduate(p,24,'WIPO Category I');return result(rule,r.status,r.detail)}
      if(/master's degree|phd degree/i.test(p.edu||'')){const r=recentGraduate(p,24,'WIPO Category II');return result(rule,r.status,r.detail)}
      return result(rule,'fail','WIPO requires one of its verified undergraduate/graduate student or recent-graduate routes.');
    }
    if(kind==='epfl'){
      if(/master's degree|phd/i.test(p.edu||''))return result(rule,'fail','Candidates who already hold a Master’s degree are not eligible for the EPFL Excellence Fellowship.');
      if(hasBachelor(p)||isUndergrad(p))return result(rule,'review','Your level can support an EPFL Master’s application; actual Master admission must still be confirmed.');
      return result(rule,'fail','The fellowship is tied to admission to an EPFL Master’s programme.');
    }
    return null;
  }

  function age(rule,p){
    const v=val(rule);if(!p.age)return result(rule,'review','Add age to test this rule.');const a=Number(p.age);
    if(v.phd_exception&&isPhdStudent(p)&&a>=Number(v.max_exclusive||30))return result(rule,'review',`ITU may make an age exception for PhD candidates; the specific vacancy must confirm it.`);
    if(v.min!=null&&a<Number(v.min))return result(rule,'fail',`Minimum age is ${v.min}.`);
    if(v.max!=null&&a>Number(v.max))return result(rule,'fail',`Maximum age is ${v.max}.`);
    if(v.max_exclusive!=null&&a>=Number(v.max_exclusive))return result(rule,'fail',`Applicant must be under ${v.max_exclusive}.`);
    return result(rule,'pass','Age fits the verified rule.');
  }

  function language(rule,p){
    const v=val(rule),e=norm(p.english);
    if(v.english_required){if(!e||e==='not specified')return result(rule,'review','English proficiency is required; add English evidence to the Passport.');return result(rule,'pass','Your Passport contains an English-readiness signal.');}
    if(v.english_or_french){
      if(e&&e!=='not specified')return result(rule,'pass','Your English-readiness signal satisfies the English-or-French language route.');
      return result(rule,'review','Excellent/professional English or French is required; add a language signal.');
    }
    if(v.english_and_other_eu)return result(rule,'review','ECB requires fluent English plus another EU official language; the Passport does not yet store a second-language signal.');
    if(v.assignment_language)return result(rule,'review','A base language condition is known, but the exact assignment may require an additional language.');
    return null;
  }

  function experienceCap(rule,p){
    const v=val(rule),m=Number(p.expMonths||0),max=Number(v.max_months||0);
    if(!Number.isFinite(m))return result(rule,'review','Add work-experience duration to test this rule.');
    if(v.post_degree){
      if(m<max)return result(rule,'pass',`Total experience is below ${max} months, so post-degree experience cannot exceed the verified cap.`);
      return result(rule,'review',`The provider caps post-degree professional experience at ${max} months; the Passport stores total experience but not its timing.`);
    }
    return m<max?result(rule,'pass',`Experience is below the ${max}-month cap.`):result(rule,'fail',`This route requires less than ${max} months of relevant work experience.`);
  }

  function prior(rule){return result(rule,'review',rule.source_note||val(rule).detail||'This prior employment/internship or family relationship condition requires a self-declaration.');}
  function field(rule,p){if(!p.field)return result(rule,'review','Add field of study to compare with the provider’s work areas.');return result(rule,'review',rule.source_note||'Field relevance is assessed against the chosen vacancy or programme.');}
  function ares(rule){return result(rule,'review',rule.source_note||'The 2027/28 checker confirms this eligibility dimension but the exact threshold is not exposed in the accessible official page.');}

  function special(rule,p){
    if(rule.certainty&&rule.certainty!=='confirmed')return result(rule,'review',rule.source_note||'This criterion is not confirmed for the active cycle.');
    if(rule.code==='education_route_v7')return education(rule,p);
    if(rule.code==='age_v7')return age(rule,p);
    if(rule.code==='language_v7')return language(rule,p);
    if(rule.code==='experience_cap_v7')return experienceCap(rule,p);
    if(rule.code==='field_fit_v7')return field(rule,p);
    if(['prior_org_v7','family_v7','availability_v7','insurance_visa_v7','other_funding_v7'].includes(rule.code))return prior(rule);
    if(rule.code==='ares_dimension_v7')return ares(rule);
    return null;
  }

  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];let checks=[...(base.checks||[])];
    for(const rule of rules){const s=special(rule,currentProfile);if(!s)continue;const covers=val(rule).covers||[];checks=checks.filter(c=>c.rule_code!==rule.code&&!covers.includes(c.label));checks.unshift(s)}
    const seen=new Set();checks=checks.filter(c=>{const k=`${c.label}|${c.rule_code||''}`;if(seen.has(k))return false;seen.add(k);return true});
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length,reviews=checks.filter(c=>c.status==='review').length,passes=checks.filter(c=>c.status==='pass').length,hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;if(fails){label='Not eligible';cls='ineligible';rank=0}else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,precisionV27:true};
  };
  window.evaluate=evaluate;try{renderAll()}catch{}
})();
