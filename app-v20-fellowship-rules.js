(()=>{
  const previousEvaluate=evaluate;
  const norm=v=>String(v||'').trim().toLowerCase();
  const exact=(a,b)=>norm(a)===norm(b);
  const inList=(v,list=[])=>list.some(x=>exact(v,x));
  const result=(rule,status,detail,hard=rule.hard!==false)=>({label:rule.label||'Eligibility rule',status,detail,hard,source_url:rule.source_url||'',source_note:rule.source_note||'',rule_code:rule.code||''});
  const value=rule=>rule?.value&&typeof rule.value==='object'?rule.value:{};
  const completedBachelor=p=>/bachelor's degree|master's student|master's degree|phd student|phd degree/i.test(p.edu||'');
  const completedPhd=p=>/phd degree/i.test(p.edu||'');
  const isStudent=p=>/student/i.test(p.edu||'');

  function requirement(req,p){
    const v=req?.value||{};
    if(req.code==='education'){
      const vals=v.values||[];
      if(vals.includes('phd_completed'))return completedPhd(p)?{status:'pass',detail:'Your Passport shows a completed PhD.'}:{status:'fail',detail:'This route requires a completed PhD.'};
      if(vals.includes('graduate_level')||vals.includes('bachelor_completed'))return completedBachelor(p)?{status:'pass',detail:'Your completed degree meets the academic baseline.'}:{status:'fail',detail:'This route requires a completed bachelor-level degree or higher.'};
      return {status:'review',detail:'Academic route needs a more specific degree check.'};
    }
    if(req.code==='work_experience_months'){
      const months=Number(p.expMonths||0),min=Number(v.months||0),max=v.max_months==null?null:Number(v.max_months);
      if(months<min)return {status:'fail',detail:`This route requires at least ${min} months of experience.`};
      if(max!=null&&months>max&&v.max_is_hard)return {status:'fail',detail:`This route is limited to ${max} months of career experience.`};
      if(v.relevance_required)return {status:'review',detail:`You meet the ${min}-month quantity, but the provider requires experience in a specific field.`};
      return {status:'pass',detail:`You meet the ${min}-month experience minimum.`};
    }
    if(req.code==='english')return p.english&&p.english!=='Not specified'?{status:'pass',detail:'Your Passport contains an English-readiness signal.'}:{status:'review',detail:'Add English readiness to resolve this route.'};
    if(req.code==='not_current_student')return p.edu?(isStudent(p)?{status:'fail',detail:'This route does not accept applicants who will be enrolled in another degree programme.'}:{status:'pass',detail:'Your Passport does not show current student status.'}):{status:'review',detail:'Add education status to resolve current-enrolment eligibility.'};
    if(req.code==='leadership_experience_months'){
      const months=Number(p.expMonths||0),min=Number(v.months||0);
      if(months<min)return {status:'fail',detail:`You do not yet have enough total experience to satisfy the ${min}-month leadership threshold.`};
      return {status:'review',detail:`Total experience is sufficient, but ${min} months must specifically be leadership experience.`};
    }
    if(req.code==='specific_student_route')return isStudent(p)?{status:'review',detail:'You are a current student, but the exact eligible school/programme is not stored in your Passport.'}:{status:'fail',detail:'This route is only for students entering the specified final year of study.'};
    if(req.code==='provider_review')return {status:'review',detail:req.detail||v.detail||'This provider-specific condition needs confirmation.'};
    return {status:'review',detail:'This route contains a provider-specific condition that is not yet captured in the Passport.'};
  }

  function routeRule(rule,p){
    const v=value(rule),routes=Array.isArray(v.routes)?v.routes:[];
    if(!routes.length)return result(rule,'review','Route-specific criteria have not been structured yet.');
    const outcomes=routes.map(route=>{
      const checks=(route.requirements||[]).map(r=>requirement(r,p));
      const fail=checks.some(c=>c.status==='fail');
      const review=!fail&&checks.some(c=>c.status==='review');
      return {label:route.label||route.id||'route',status:fail?'fail':review?'review':'pass'};
    });
    const passed=outcomes.find(x=>x.status==='pass');
    if(passed)return result(rule,'pass',`Available Passport signals satisfy the ${passed.label} route.`);
    const possible=outcomes.filter(x=>x.status==='review');
    if(possible.length)return result(rule,'review',`A route remains possible (${possible.map(x=>x.label).join(' / ')}), but one or more provider conditions still need confirmation.`);
    return result(rule,'fail','Available Passport signals do not satisfy any verified route for this programme.');
  }

  function specialRule(rule,p){
    const v=value(rule),op=rule.operator;
    if(rule.certainty&&rule.certainty!=='confirmed')return result(rule,'review','The stored rule is tied to an earlier/current cycle and must be re-confirmed before deciding eligibility.');
    if(rule.code==='route_eligibility')return routeRule(rule,p);
    if(rule.code==='education'&&op==='not_required')return result(rule,'pass','No universal degree-level minimum is stated for this programme.');
    if(rule.code==='field'&&op==='not_applicable')return result(rule,'pass','No universal academic subject restriction is stated; professional or programme-fit criteria apply instead.');
    if(rule.code==='field'&&op==='official_list'){
      if(!p.field)return result(rule,'review','Add field of study to compare with the official programme fields.');
      if(inList(p.field,v.passport_fields||[]))return result(rule,'pass','Your field maps clearly to one of the provider’s listed programme areas.');
      return result(rule,'review','Your field may still fit, but the provider’s programme-area taxonomy needs a manual mapping.');
    }
    if(rule.code==='not_current_student'){
      const r=requirement({code:'not_current_student'},p);return result(rule,r.status,r.detail);
    }
    if(rule.code==='residence'&&op==='not_in'){
      if(!p.residence)return result(rule,'review','Add country of residence to test this restriction.');
      return inList(p.residence,v.values||[])?result(rule,'fail',`${p.residence} is excluded by the current residence rule.`):result(rule,'pass','Residence does not hit a verified exclusion.');
    }
    if(rule.code==='age'&&op==='preferred_between'){
      if(!p.age)return result(rule,'info','Provider has a preferred age band; add age if you want to compare it.',false);
      const a=Number(p.age),min=Number(v.min),max=Number(v.max);
      return a>=min&&a<=max?result(rule,'pass',`Age is inside the provider’s preferred ${min}–${max} band.`,false):result(rule,'info',`Age is outside the preferred ${min}–${max} band, but the provider says exceptions are considered.`,false);
    }
    if(rule.code==='age'&&op==='max_exclusive'){
      if(!p.age)return result(rule,'review','Add age to test this rule.');
      return Number(p.age)<Number(v.max)?result(rule,'pass',`Age is below the verified limit of ${v.max}.`):result(rule,'fail',`Applicant must be under ${v.max}.`);
    }
    if(rule.code==='work_experience_months'&&(v.relevance_required||v.max_months!=null)){
      const r=requirement({code:'work_experience_months',value:v},p);return result(rule,r.status,r.detail);
    }
    if(rule.code==='provider_condition')return result(rule,'review',rule.source_note||v.detail||'A provider-specific condition still needs confirmation.');
    return null;
  }

  const PACIFIC=new Set(['Fiji','Kiribati','Marshall Islands','Federated States of Micronesia','Nauru','Palau','Papua New Guinea','Samoa','Solomon Islands','Tonga','Tuvalu','Vanuatu','Cook Islands','Niue']);
  function correctCountry(o,checks,p){
    const rule=(o.Eligibility_Rules||[]).find(r=>r.code==='country_scope');if(!rule)return checks;
    const v=value(rule),idx=checks.findIndex(c=>c.rule_code==='country_scope');if(idx<0)return checks;
    if(v.citizen_or_permanent_resident){
      const countries=v.countries||[];
      let c;
      if(p.nat&&inList(p.nat,countries))c=result(rule,'pass','Your citizenship is within the verified eligible-country scope.');
      else if(p.residence&&inList(p.residence,countries))c=result(rule,'review','Your residence is in the eligible region, but permanent-resident status still needs confirmation.');
      else if(p.nat&&p.residence)c=result(rule,'fail','Neither stored citizenship nor residence fits the verified country route.');
      else c=result(rule,'review','Add nationality and residence to test the citizen/permanent-resident route.');
      checks[idx]=c;
    }
    if(v.scope==='worldwide_except'&&v.dual_us_citizenship_allowed&&norm(p.nat)==='united states')checks[idx]=result(rule,'review','U.S.-only citizens are ineligible, but dual U.S. citizens may qualify; add the second nationality before deciding.');
    if(v.regional_placeholder==='Pacific Islands'&&checks[idx]?.status==='fail'&&PACIFIC.has(p.nat))checks[idx]=result(rule,'review','The provider groups Pacific Islands together without a complete country-by-country list; verify the current regional interpretation.');
    return checks;
  }

  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];
    let checks=[...(base.checks||[])];
    for(const rule of rules){
      const special=specialRule(rule,currentProfile);if(!special)continue;
      const covers=value(rule).covers||[];
      checks=checks.filter(c=>c.rule_code!==rule.code&&!covers.includes(c.label));
      checks.unshift(special);
    }
    checks=correctCountry(o,checks,currentProfile);
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
    return {...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,deepEligibility:true};
  };
  window.evaluate=evaluate;
  try{renderAll()}catch{}
})();
