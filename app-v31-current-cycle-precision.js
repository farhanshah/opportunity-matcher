(()=>{
  const previousEvaluate=evaluate;
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const result=(r,status,detail,hard=r.hard!==false)=>({label:r.label||'Eligibility rule',status,detail,hard,source_url:r.source_url||'',source_note:r.source_note||'',rule_code:r.code||''});
  const hasBachelor=p=>/bachelor's degree|master's student|master's degree|phd student|phd degree/i.test(p.edu||'');
  const hasMasters=p=>/master's degree|phd student|phd degree/i.test(p.edu||'');

  function special(rule,p){
    const v=val(rule);
    if(rule.certainty&&rule.certainty!=='confirmed')return result(rule,'review',rule.source_note||'This rule is not confirmed for the active cycle.');

    if(rule.code==='funding_deadline_v11'){
      return result(rule,'info','For 2027 entry the Gates Cambridge deadline is 14 October 2026 for US citizens normally resident in the USA and 8 December 2026 for other eligible applicants.',false);
    }

    if(rule.code==='course_relevance_v11'){
      if(!p.field)return result(rule,'review','Add field of study, then compare it with the selected EPOS course.');
      return result(rule,'review','EPOS requires a Bachelor subject related to the selected postgraduate course. Your field is stored, but the intended EPOS course is not yet stored in the Passport.');
    }
    if(rule.code==='language_route_v11'){
      const e=String(p.english||'');
      if(!e||e==='Not specified')return result(rule,'review','EPOS language evidence depends on the selected course: German-taught routes require German evidence, while English-taught routes use course-specific IELTS/TOEFL requirements.');
      return result(rule,'review','Your Passport has an English-readiness signal, but EPOS language evidence is course-specific and German-taught programmes use a separate German route.');
    }
    if(rule.code==='epos_application_route_v11'){
      return result(rule,'review','EPOS is applied for through a selected postgraduate course and the exact deadline is course-specific. Select the intended EPOS course to resolve the application route.');
    }
    if(rule.code==='development_profile_v11'){
      return result(rule,'info','EPOS selection also considers development-related motivation, social responsibility and potential to support change after the scholarship.',false);
    }

    if(rule.code==='swiss_route_v11'){
      if(!p.edu)return result(rule,'review','Add education level and select the intended Swiss scholarship type: research fellowship, PhD or art.');
      if(hasMasters(p))return result(rule,'review','Your education can support a Swiss research/PhD route, but the intended scholarship type, degree-completion timing and host/supervisor evidence still need confirmation.');
      if(hasBachelor(p))return result(rule,'review','A Bachelor can support the limited-country first-Master art route; research/PhD routes require the published Master-level baseline. Select the intended scholarship type to resolve this.');
      return result(rule,'review','Swiss 2027/28 eligibility differs between research, PhD and art routes; select the intended scholarship type to resolve the education route.');
    }
    if(rule.code==='no_postdoc_award_v11'){
      return result(rule,'info','Swiss Government postdoctoral scholarships are not offered from the 2027/28 academic year. This does not by itself reject applicants using an eligible research, PhD or art route.',false);
    }
    if(rule.code==='graduation_by_v4'&&v.route_specific){
      return result(rule,'info','The 31 July 2027 Master-completion deadline applies to the research/PhD routes (30 June 2027 for ETH Zurich); the art route uses a Bachelor-completion deadline instead.',false);
    }
    if(rule.code==='provider_condition_v4_supervisor'&&v.route_specific){
      return result(rule,'info','Swiss academic-supervisor support is a hard requirement for research and PhD applications; it does not apply in the same form to the art scholarship route.',false);
    }
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
    const seen=new Set();
    checks=checks.filter(c=>{const k=`${c.label}|${c.rule_code||''}`;if(seen.has(k))return false;seen.add(k);return true});
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length;
    const reviews=checks.filter(c=>c.status==='review').length;
    const passes=checks.filter(c=>c.status==='pass').length;
    const hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;
    if(fails){label='Not eligible';cls='ineligible';rank=0}
    else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}
    else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}
    else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,currentCyclePrecisionV31:true};
  };
  window.evaluate=evaluate;try{renderAll()}catch{}
})();
