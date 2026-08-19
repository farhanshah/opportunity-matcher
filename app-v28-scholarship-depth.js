(()=>{
  const previousEvaluate=evaluate;
  const norm=v=>String(v||'').trim().toLowerCase();
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const result=(r,status,detail,hard=r.hard!==false)=>({label:r.label||'Eligibility rule',status,detail,hard,source_url:r.source_url||'',source_note:r.source_note||'',rule_code:r.code||''});
  const isSecondary=p=>/secondary school/i.test(p.edu||'');
  const isUndergrad=p=>/undergraduate student/i.test(p.edu||'');
  const hasBachelor=p=>/bachelor's degree|master's student|master's degree|phd student|phd degree/i.test(p.edu||'');
  const hasMasters=p=>/master's degree|phd student|phd degree/i.test(p.edu||'');
  const parseDate=s=>{const t=new Date(String(s||'')+'T00:00:00Z').getTime();return Number.isFinite(t)?t:null};
  const yearsSince=s=>{const t=parseDate(s);return t==null?null:(Date.now()-t)/(365.2425*864e5)};

  function education(rule,p){
    const v=val(rule),kind=v.kind||'';
    if(!p.edu)return result(rule,'review','Add education level to resolve this scholarship route.');
    if(kind==='ubc_international'){
      if(!isSecondary(p))return result(rule,'fail','UBC International Scholars requires entry directly from an accredited secondary school into a first undergraduate degree.');
      return result(rule,'review','Your education level fits the direct-from-secondary-school route; exact high-school graduation date and first-degree status still need confirmation.');
    }
    if(kind==='pearson'){
      if(!isSecondary(p))return result(rule,'fail','Pearson is limited to final-year/recent senior-secondary students who are not already in post-secondary study.');
      return result(rule,'review','Your education level fits the secondary-school route; exact 2026/27 final-year or June-2026-or-later graduation timing still needs confirmation.');
    }
    if(kind==='melbourne_research'){
      if(/master's student|phd student/i.test(p.edu||''))return result(rule,'review','Your postgraduate stage could fit a graduate-research route, but the University must confirm research-degree admission/enrolment.');
      if(hasBachelor(p))return result(rule,'review','Your prior degree can support graduate-research admission, but the target Masters-by-Research/PhD entry requirements still need confirmation.');
      return result(rule,'fail','The Graduate Research Scholarships are tied to a University of Melbourne graduate research degree.');
    }
    if(kind==='mastercard_ubc'){
      if(!hasBachelor(p))return result(rule,'fail','A completed Bachelor’s degree is required.');
      if(hasMasters(p))return result(rule,'fail','Applicants who already hold a Master’s degree are not eligible for this UBC Mastercard Foundation route.');
      return result(rule,'pass','Your Passport shows the required completed Bachelor’s degree without a completed Master’s degree.');
    }
    if(kind==='pershing'){
      if(!hasBachelor(p))return result(rule,'fail','The Oxford 1+1 MBA route requires eligibility for postgraduate study.');
      return result(rule,'review','Your degree level can support postgraduate admission, but eligibility requires admission to the MBA and an eligible Oxford Master’s route.');
    }
    if(kind==='ucl_master')return hasBachelor(p)?result(rule,'review','Your degree level can support a UCL taught Master’s application; a complete eligible UCL admission application is still required.'):result(rule,'fail','This scholarship is for applicants to eligible UCL postgraduate taught Master’s programmes.');
    if(kind==='reach_oxford'){
      if(!isSecondary(p))return result(rule,'review','Reach Oxford is for new undergraduate entrants; the Passport does not show a direct secondary-school entry route.');
      return result(rule,'pass','Your education level fits a new undergraduate-entry route.');
    }
    if(kind==='mccall'){
      if(isUndergrad(p)){
        const d=parseDate(p.graduationDate);if(d==null)return result(rule,'review','Current students must be on track to earn their first Bachelor’s degree by August 2027; add expected graduation date.');
        return d<=parseDate('2027-08-31')?result(rule,'pass','Expected first-Bachelor completion is by August 2027.'):result(rule,'fail','Current students must complete their first Bachelor’s degree by August 2027.');
      }
      if(hasBachelor(p))return result(rule,'review','A first Bachelor’s degree is present; the scholarship also checks when that first degree was earned and may apply the older-graduate age route.');
      return result(rule,'fail','McCall MacBain requires a current or completed first Bachelor’s degree route.');
    }
    return null;
  }

  function age(rule,p){
    const v=val(rule);if(!p.age)return result(rule,'review','Add age to test this scholarship age rule.');const a=Number(p.age);
    if(v.max!=null&&a>Number(v.max))return result(rule,'fail',`The verified maximum age is ${v.max}.`);
    if(v.min!=null&&a<Number(v.min))return result(rule,'fail',`The verified minimum age is ${v.min}.`);
    return result(rule,'pass','Age fits the verified scholarship rule.');
  }

  function levelAge(rule,p){
    const v=val(rule);if(!p.age)return result(rule,'review','Add age to compare with the VLIR-UOS programme-level age cap.');
    return result(rule,'review',`VLIR-UOS uses different age caps by study route (Bachelor/initial Master versus advanced Master); the intended ICP Connect programme level is not stored in the Passport.`);
  }

  function graduation(rule,p){
    const v=val(rule),d=parseDate(p.graduationDate);if(d==null)return result(rule,'review',`Add the relevant graduation date to test the ${v.date||'published'} timing rule.`);
    const cutoff=parseDate(v.date);if(cutoff==null)return result(rule,'review','The graduation cutoff needs exact-date verification.');
    return d>=cutoff?result(rule,'pass',`Graduation timing is on or after ${v.date}.`):result(rule,'fail',`This route requires graduation on or after ${v.date}.`);
  }

  function mccallTiming(rule,p){
    const v=val(rule),d=parseDate(p.graduationDate);
    if(isUndergrad(p))return education({...rule,value:{kind:'mccall'}},p);
    if(!hasBachelor(p))return result(rule,'fail','A first Bachelor’s degree route is required.');
    if(d==null)return result(rule,'review','Add the first Bachelor’s graduation date to determine the recent-graduate or older-graduate route.');
    if(d>=parseDate('2021-01-01'))return result(rule,'pass','Your stored Bachelor’s graduation date is January 2021 or later, which fits the five-year route.');
    if(!p.age)return result(rule,'review','Your first Bachelor’s degree appears older than five years; age on 1 January 2026 is needed for the older-graduate route.');
    return Number(p.age)<=31?result(rule,'review','Your current age suggests the older-graduate age route may fit, but exact age on 1 January 2026 must be confirmed.'):result(rule,'fail','For a first Bachelor’s degree earned before January 2021, the applicant needed to be 30 or younger on 1 January 2026.');
  }

  function language(rule,p){
    const v=val(rule),e=norm(p.english);
    if(v.provider_has_no_universal_test)return result(rule,'info','The scholarship provider does not impose a universal English test; the chosen university/programme may impose its own language requirement.',false);
    if(v.conditional_if_not_english_degree){
      if(/degree taught in english/i.test(p.english||''))return result(rule,'pass','Your Passport indicates a Bachelor’s degree taught in English, which fits the published conditional language route.');
      return result(rule,'review','If the Bachelor’s degree was not taught in English, the programme requires accepted English-proficiency evidence.');
    }
    if(v.admission_standard){
      if(!e||e==='not specified')return result(rule,'review','The target university’s English admission standard must be met; add English evidence to the Passport.');
      return result(rule,'review','Your Passport contains an English-readiness signal, but the target programme’s exact admission standard still needs confirmation.');
    }
    return null;
  }

  function admission(rule){return result(rule,'review',rule.source_note||val(rule).detail||'Admission to the specified eligible programme must be confirmed.');}
  function financial(rule){return result(rule,'review',rule.source_note||'Financial need is assessed from household income, assets and available funding and is not fully represented in the Passport.');}
  function declaration(rule){return result(rule,'review',rule.source_note||val(rule).detail||'This scholarship condition requires an applicant declaration or evidence not yet stored in the Passport.');}
  function selection(rule){return result(rule,'info',rule.source_note||val(rule).detail||'This is a competitive selection factor rather than a deterministic eligibility gate.',false);}
  function programme(rule,p){
    const v=val(rule);
    if(v.exclude_medicine&&/medicine/i.test(p.field||''))return result(rule,'fail','Medicine is excluded from this scholarship.');
    if(v.allowed_programmes)return result(rule,'review','Only specifically listed programmes are eligible; the intended programme is not stored in the Passport.');
    if(v.first_undergraduate_only&&hasBachelor(p))return result(rule,'fail','This award is for a first undergraduate degree.');
    return result(rule,'review',rule.source_note||'Programme-level eligibility must be confirmed.');
  }

  function special(rule,p){
    if(rule.certainty&&rule.certainty!=='confirmed')return result(rule,'review',rule.source_note||'This criterion is from the latest published cycle and must be refreshed before it can decide the next-cycle result.');
    if(rule.code==='education_route_v8')return education(rule,p);
    if(rule.code==='age_v8')return age(rule,p);
    if(rule.code==='level_age_v8')return levelAge(rule,p);
    if(rule.code==='graduation_cutoff_v8')return graduation(rule,p);
    if(rule.code==='mccall_timing_v8')return mccallTiming(rule,p);
    if(rule.code==='language_v8')return language(rule,p);
    if(rule.code==='admission_v8')return admission(rule);
    if(rule.code==='financial_need_v8')return financial(rule);
    if(rule.code==='programme_v8')return programme(rule,p);
    if(['nomination_v8','prior_scholarship_v8','visa_status_v8','no_other_award_v8','return_home_v8','application_route_v8','study_history_v8'].includes(rule.code))return declaration(rule);
    if(rule.code==='selection_v8')return selection(rule);
    return null;
  }

  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];let checks=[...(base.checks||[])];
    for(const rule of rules){const s=special(rule,currentProfile);if(!s)continue;const covers=val(rule).covers||[];checks=checks.filter(c=>c.rule_code!==rule.code&&!covers.includes(c.label));checks.unshift(s)}
    const seen=new Set();checks=checks.filter(c=>{const k=`${c.label}|${c.rule_code||''}`;if(seen.has(k))return false;seen.add(k);return true});
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length,reviews=checks.filter(c=>c.status==='review').length,passes=checks.filter(c=>c.status==='pass').length,hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;if(fails){label='Not eligible';cls='ineligible';rank=0}else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,scholarshipDepthV28:true};
  };
  window.evaluate=evaluate;try{renderAll()}catch{}
})();
