(()=>{
  const previousEvaluate=evaluate;
  const norm=v=>String(v||'').trim().toLowerCase();
  const result=(rule,status,detail,hard=rule.hard!==false)=>({label:rule.label||'Eligibility rule',status,detail,hard,source_url:rule.source_url||'',source_note:rule.source_note||'',rule_code:rule.code||''});
  const value=rule=>rule?.value&&typeof rule.value==='object'?rule.value:{};
  const isStudent=p=>/student/i.test(p.edu||'');
  const isUndergrad=p=>/undergraduate student/i.test(p.edu||'');
  const isMastersStudent=p=>/master's student/i.test(p.edu||'');
  const isPhdStudent=p=>/phd student/i.test(p.edu||'');
  const isGraduate=p=>/bachelor's degree|master's degree|phd degree/i.test(p.edu||'');
  const dateValue=s=>{const t=new Date(String(s||'')+'T00:00:00Z').getTime();return Number.isFinite(t)?t:null};
  const monthsSince=date=>{const t=dateValue(date);if(t==null)return null;return (Date.now()-t)/(30.4375*864e5)};
  const fieldIn=(p,vals=[])=>vals.some(v=>norm(v)===norm(p.field));

  function educationStage(req,p){
    const v=req.value||{},kind=v.kind||'';
    if(kind==='wbg_pioneers'){
      if(isMastersStudent(p)||isPhdStudent(p))return{status:'pass',detail:'Your Passport shows an eligible postgraduate student stage.'};
      if(isUndergrad(p))return{status:'review',detail:'Undergraduates must be in their final year; add an expected graduation date or confirm final-year status.'};
      return{status:'fail',detail:'This programme is for final-year undergraduate students or current Master’s/PhD students.'};
    }
    if(kind==='treasury_rising_senior'){
      if(!isUndergrad(p))return{status:'fail',detail:'The Treasury internship is limited to rising undergraduate seniors; Master’s students and graduates are not eligible.'};
      const t=dateValue(p.graduationDate);if(t==null)return{status:'review',detail:'Add your expected graduation date to confirm the required second-to-last-year undergraduate stage.'};
      const lo=dateValue(v.graduation_min),hi=dateValue(v.graduation_max);
      return t>=lo&&t<=hi?{status:'pass',detail:`Expected graduation falls within the verified ${v.graduation_min} to ${v.graduation_max} window.`}:{status:'fail',detail:`Expected graduation must fall between ${v.graduation_min} and ${v.graduation_max}.`};
    }
    if(kind==='student_or_recent_graduate'){
      if(isStudent(p))return{status:'pass',detail:'Your Passport shows current university-student status.'};
      if(isGraduate(p)){
        const m=monthsSince(p.graduationDate);if(m==null)return{status:'review',detail:`Graduates may qualify within ${v.recent_months} months; add graduation date to confirm.`};
        return m>=0&&m<=Number(v.recent_months)?{status:'pass',detail:`Graduation is within the verified ${v.recent_months}-month recent-graduate window.`}:{status:'fail',detail:`Graduates must apply within ${v.recent_months} months of completing their qualification.`};
      }
      return{status:'fail',detail:'This route requires current student status or a recent completed university qualification.'};
    }
    if(kind==='undp_intern'){
      if(isMastersStudent(p))return{status:'pass',detail:'Current Master’s students fit the published UNDP student route.'};
      if(isUndergrad(p))return{status:'review',detail:'UNDP accepts Bachelor’s students in their final year; final-year status is not yet stored in your Passport.'};
      if(isGraduate(p)){
        const m=monthsSince(p.graduationDate);if(m==null)return{status:'review',detail:'Recent graduates may qualify for one year after graduation; add graduation date to confirm.'};
        return m>=0&&m<=12?{status:'pass',detail:'Graduation is within UNDP’s one-year recent-graduate window.'}:{status:'fail',detail:'UNDP’s general internship route is limited to graduates within one year after graduation.'};
      }
      return{status:'fail',detail:'The published UNDP internship route is for Master’s students, final-year Bachelor’s students, or recent graduates.'};
    }
    if(kind==='who_intern'){
      if(isMastersStudent(p)||isPhdStudent(p))return{status:'pass',detail:'Your postgraduate student stage implies completion of the three-year university-study baseline; vacancy field fit still applies.'};
      if(isUndergrad(p))return{status:'review',detail:'WHO requires three years of full-time university study before the internship; add study stage to confirm.'};
      if(isGraduate(p)){
        const m=monthsSince(p.graduationDate);if(m==null)return{status:'review',detail:'WHO may accept graduates within 18 months; add graduation date to confirm.'};
        return m>=0&&m<=18?{status:'pass',detail:'Graduation is within WHO’s 18-month recent-graduate window.'}:{status:'fail',detail:'Completed qualifications are eligible only within 18 months of graduation.'};
      }
      return{status:'fail',detail:'WHO requires qualifying university study or a recent completed qualification.'};
    }
    if(kind==='cern_summer'){
      if(isPhdStudent(p)||isGraduate(p))return{status:'fail',detail:'CERN Summer Students must be current Bachelor’s or Master’s students, not PhD students or graduates.'};
      if(isMastersStudent(p))return{status:'pass',detail:'Your Master’s student stage is compatible with CERN’s Bachelor’s/Master’s student requirement.'};
      if(isUndergrad(p))return{status:'review',detail:'CERN requires at least six completed semesters and continued enrolment through the start of summer; add study stage to confirm.'};
      return{status:'fail',detail:'CERN Summer Students must be pursuing a Bachelor’s or Master’s degree.'};
    }
    if(kind==='susi_student'){
      if(!isUndergrad(p))return{status:'fail',detail:'SUSI Student Leaders is for undergraduate students.'};
      return{status:'review',detail:'SUSI requires at least one semester remaining; that semester-level signal is not yet stored in your Passport.'};
    }
    if(kind==='ugrad_student'){
      if(!isUndergrad(p))return{status:'fail',detail:'Global UGRAD is for currently enrolled undergraduate students.'};
      return{status:'review',detail:'Global UGRAD requires at least one year remaining at the home university after the exchange; that study-stage signal is not yet stored.'};
    }
    if(kind==='phd_student')return isPhdStudent(p)?{status:'pass',detail:'Your Passport shows current PhD student status.'}:{status:'fail',detail:'This route requires current PhD student status.'};
    if(kind==='advanced_law_near_completion'){
      if(!fieldIn(p,['Law & Legal Studies']))return{status:'fail',detail:'This route is specific to advanced legal studies.'};
      if(/master's student|master's degree|phd student|phd degree/i.test(p.edu||''))return{status:'review',detail:'Your level may fit, but the IMF Legal route requires being within one to two years of completing an LLM, J.D. or equivalent advanced law degree.'};
      return{status:'fail',detail:'This route requires an advanced law degree path.'};
    }
    return{status:'review',detail:'Education stage needs provider-specific confirmation.'};
  }

  function checkRequirement(req,p){
    const v=req.value||{};
    if(req.code==='education_stage')return educationStage(req,p);
    if(req.code==='field')return !p.field?{status:'review',detail:'Add field of study to resolve this route.'}:fieldIn(p,v.passport_fields||[])?{status:'pass',detail:'Your field maps to the verified programme area.'}:{status:v.hard===false?'review':'fail',detail:'Your stored field does not map to this route’s verified programme area.'};
    if(req.code==='english')return p.english&&p.english!=='Not specified'?{status:'pass',detail:'Your Passport contains an English-readiness signal.'}:{status:'review',detail:'Add English readiness to resolve the language rule.'};
    if(req.code==='age'){
      if(!p.age)return{status:'review',detail:'Add age to test this route.'};const a=Number(p.age);
      if(v.min!=null&&a<Number(v.min))return{status:'fail',detail:`Minimum age is ${v.min}.`};
      if(v.min_exclusive!=null&&a<=Number(v.min_exclusive))return{status:'fail',detail:`Applicant must be older than ${v.min_exclusive}.`};
      if(v.max!=null&&a>Number(v.max))return{status:'fail',detail:`Maximum age is ${v.max}.`};
      if(v.max_exclusive!=null&&a>=Number(v.max_exclusive))return{status:'fail',detail:`Applicant must be below ${v.max_exclusive}.`};
      return{status:'pass',detail:'Age fits the verified route.'};
    }
    if(req.code==='work_experience_months'){
      const m=Number(p.expMonths||0);if(v.min!=null&&m<Number(v.min))return{status:'fail',detail:`At least ${v.min} months of experience are required.`};
      if(v.max!=null&&m>Number(v.max))return{status:'fail',detail:`This route allows at most ${v.max} months of professional experience.`};
      return{status:'pass',detail:'Experience quantity fits the verified range.'};
    }
    if(req.code==='current_student')return isStudent(p)?{status:'pass',detail:'Your Passport shows current student status.'}:{status:'fail',detail:'This route requires current student status.'};
    if(req.code==='provider_review')return{status:'review',detail:req.detail||v.detail||'This provider condition requires applicant-specific confirmation.'};
    return{status:'review',detail:'This verified route needs an additional Passport signal.'};
  }

  function routeV2(rule,p){
    const v=value(rule),routes=Array.isArray(v.routes)?v.routes:[];if(v.schema_version!==2||!routes.length)return null;
    const outcomes=routes.map(route=>{const cs=(route.requirements||[]).map(r=>checkRequirement(r,p));const fail=cs.some(c=>c.status==='fail');const review=!fail&&cs.some(c=>c.status==='review');return{label:route.label||route.id,status:fail?'fail':review?'review':'pass',checks:cs}});
    const pass=outcomes.find(x=>x.status==='pass');if(pass)return result(rule,'pass',`Available Passport signals satisfy the ${pass.label} route.`);
    const possible=outcomes.filter(x=>x.status==='review');if(possible.length)return result(rule,'review',`A verified route remains possible (${possible.map(x=>x.label).join(' / ')}), but more applicant-specific information is needed.`);
    return result(rule,'fail','Available Passport signals do not satisfy any verified route for this programme.');
  }

  function special(rule,p){
    const v=value(rule);
    if(rule.code==='route_eligibility')return routeV2(rule,p);
    if(rule.code==='age'&&rule.operator==='min'){
      if(!p.age)return result(rule,'review','Add age to test this rule.');return Number(p.age)>=Number(v.min)?result(rule,'pass',`Age meets the minimum of ${v.min}.`):result(rule,'fail',`Minimum age is ${v.min}.`);
    }
    if(rule.code==='age'&&rule.operator==='min_exclusive'){
      if(!p.age)return result(rule,'review','Add age to test this rule.');return Number(p.age)>Number(v.min)?result(rule,'pass',`Age is above the required threshold of ${v.min}.`):result(rule,'fail',`Applicant must be older than ${v.min}.`);
    }
    if(rule.code==='work_experience_months'&&rule.operator==='between'){
      const m=Number(p.expMonths||0),min=Number(v.min||0),max=Number(v.max);if(m<min)return result(rule,'fail',`Minimum experience is ${min} months.`);if(Number.isFinite(max)&&m>max)return result(rule,'fail',`Maximum professional experience is ${max} months.`);return result(rule,'pass','Experience quantity fits the verified range.');
    }
    return null;
  }

  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];let checks=[...(base.checks||[])];
    for(const rule of rules){const s=special(rule,currentProfile);if(!s)continue;const covers=value(rule).covers||[];checks=checks.filter(c=>c.rule_code!==rule.code&&!covers.includes(c.label));checks.unshift(s)}
    const seen=new Set();checks=checks.filter(c=>{const k=`${c.label}|${c.rule_code||''}`;if(seen.has(k))return false;seen.add(k);return true});
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length,reviews=checks.filter(c=>c.status==='review').length,passes=checks.filter(c=>c.status==='pass').length,hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;if(fails){label='Not eligible';cls='ineligible';rank=0}else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,internshipEligibility:true};
  };
  window.evaluate=evaluate;try{renderAll()}catch{}
})();
