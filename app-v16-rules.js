(()=>{
  const legacyEvaluateV16=evaluate;
  const SUB_SAHARAN=new Set(['Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon','Cape Verde','Central African Republic','Chad','Comoros','Congo, Democratic Republic of the','Congo, Republic of the','Côte d’Ivoire','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Kenya','Lesotho','Liberia','Madagascar','Malawi','Mali','Mauritania','Mauritius','Mozambique','Namibia','Niger','Nigeria','Rwanda','São Tomé and Príncipe','Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Uganda','Zambia','Zimbabwe']);
  const dimForCode=code=>({nationality:'Nationality',residence:'Residence',residence_country:'Residence',age:'Age',work_hours_min:'Experience',work_experience_months:'Experience',education:'Education',current_student:'Education',student_status:'Education',english:'English',field:'Field of study',graduation_by:'Education',first_bachelor_date:'Education',academic_grade:'Academic grade',pakistan_study_residence:'Residence',oxford_new_graduate_course:'Course route',eligible_course:'Course route',stanford_admission:'Course route',home_country_work:'Residence'})[code]||'Provider rule';
  const result=(rule,status,detail)=>({label:rule.label||dimForCode(rule.code),status,detail,hard:rule.hard!==false,source_url:rule.source_url||'',source_note:rule.source_note||'',rule_code:rule.code||''});
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const norm=s=>String(s||'').trim().toLowerCase();
  const exactIn=(needle,values=[])=>values.some(v=>norm(v)===norm(needle));

  function checkNormalizedRule(rule,p){
    const v=val(rule),code=rule.code,op=rule.operator;
    if(rule.certainty&&rule.certainty!=='confirmed')return result(rule,'review','Official wording still needs confirmation before this rule can decide eligibility.');
    if(code==='nationality'){
      if(op==='any')return result(rule,'pass','No nationality restriction in the verified rule.');
      if(op==='in'){
        if(!p.nat)return result(rule,'review','Add nationality to test this rule.');
        if(exactIn(p.nat,v.values||[]))return result(rule,'pass',`${p.nat} is covered by the verified country rule.`);
        return v.partial_list?result(rule,'review','This record currently stores only part of the provider country list; verify the official source.'):result(rule,'fail',`${p.nat} is not in the verified eligible-country list.`);
      }
      if(op==='not_in'){
        if(!p.nat)return result(rule,'review','Add nationality to test this rule.');
        if(exactIn(p.nat,v.excluded_profile_values||[]))return result(rule,'fail',`${p.nat} is outside the verified citizenship route for this programme.`);
        return v.partial_exclusion?result(rule,'review','Citizenship may be eligible, but the full provider list still needs normalization.'):result(rule,'pass','Nationality does not hit a verified exclusion.');
      }
      if(op==='review'&&v.region==='Sub-Saharan Africa'){
        if(!p.nat)return result(rule,'review','Add nationality to test the regional rule.');
        return SUB_SAHARAN.has(p.nat)?result(rule,'pass','Nationality falls within the programme region.'):result(rule,'fail',`${p.nat} is outside the programme’s Sub-Saharan Africa eligibility region.`);
      }
      return result(rule,'review','Nationality requires provider-specific review.');
    }
    if(code==='residence'||code==='residence_country'){
      if(!p.residence)return result(rule,'review','Add country of residence to test this rule.');
      if(op==='in'&&exactIn(p.residence,v.values||[]))return result(rule,'pass',`${p.residence} matches the verified residence rule.`);
      if(op==='in'&&v.partial_list)return result(rule,'review','The stored residence list is intentionally partial; verify the official source.');
      if(op==='in')return result(rule,'fail',`${p.residence} is not in the verified residence list.`);
      return result(rule,'review','Residence condition needs provider-specific review.');
    }
    if(code==='age'){
      if(!p.age)return result(rule,'review','Add age to test this rule.');
      if(op==='between'){
        const a=Number(p.age),min=Number(v.min),max=Number(v.max);
        if(v.exceptional_min!=null&&a>=Number(v.exceptional_min)&&a<min)return result(rule,'review','Your age falls in the provider’s exceptional-consideration band rather than the standard range.');
        if(Number.isFinite(min)&&a<min)return result(rule,'fail',`Minimum standard age is ${min}.`);
        if(Number.isFinite(max)&&a>max)return result(rule,'fail',`Maximum standard age is ${max}.`);
        return result(rule,'pass',`Age fits the verified ${min}–${max} range.`);
      }
      return result(rule,'review','This provider uses a date-specific or alternative age route that needs an exact birth/graduation check.');
    }
    if(code==='work_hours_min'){
      const hours=Number(p.workHours||0);
      if(hours>0)return hours>=Number(v.hours||0)?result(rule,'pass',`You meet the verified ${v.hours}-hour minimum.`):result(rule,'fail',`Verified minimum is ${v.hours} eligible hours.`);
      if(Number(p.expMonths||0)===0)return result(rule,'fail',`This programme requires at least ${v.hours} eligible post-degree work hours.`);
      return result(rule,'review',`This rule is measured in exact eligible hours (${v.hours}); add hours before we call it a pass.`);
    }
    if(code==='work_experience_months'){
      if(/community/i.test(rule.label||'')&&Number(p.expMonths||0)>0)return result(rule,'review',`The ${v.months}-month minimum must specifically be community-development experience.`);
      return Number(p.expMonths||0)>=Number(v.months||0)?result(rule,'pass',`You meet the ${v.months}-month experience minimum.`):result(rule,'fail',`Verified minimum is ${v.months} months of relevant experience.`);
    }
    if(code==='education'){
      const e=norm(p.edu),values=v.values||[];
      if(values.includes('bachelor_completed')||values.includes('bachelor_final_year')){
        if(/bachelor's degree|master's|phd degree/.test(e))return result(rule,'pass','Your completed degree level satisfies the verified baseline.');
        if(e.includes('undergraduate student'))return result(rule,'review','Final-year status is required but is not yet stored in your Passport.');
        return result(rule,'fail','The verified route requires a bachelor-level qualification or final-year status.');
      }
      if(values.includes('bachelor_last_two_years')||values.includes('masters_any_year')){
        if(/bachelor's degree|master's degree|master's student/.test(e))return result(rule,'pass','Your academic stage fits one of the verified OIST routes.');
        if(e.includes('undergraduate student'))return result(rule,'review','OIST requires the last two bachelor years; add degree stage to confirm.');
        if(e.includes('phd'))return result(rule,'fail','This internship route does not target PhD-level applicants.');
      }
      return result(rule,'review','Education wording needs one more structured signal.');
    }
    if(code==='current_student'||code==='student_status'){
      return /student/i.test(p.edu||'')?result(rule,'pass','Your Passport indicates current student status.'):result(rule,'fail','This verified route requires current university-student status.');
    }
    if(code==='english'){
      return p.english&&p.english!=='Not specified'?result(rule,'pass','Your Passport contains an English-readiness signal; verify the exact evidence requested.'):result(rule,'review','Add English readiness to test the provider requirement.');
    }
    if(code==='graduation_by'||code==='first_bachelor_date'){
      const date=p.graduationDate||'';
      if(!date)return result(rule,'review','Add your graduation date to resolve this verified degree-timing rule.');
      const t=new Date(date+'T00:00:00Z').getTime();
      if(code==='graduation_by')return t<=new Date(v.date+'T23:59:59Z').getTime()?result(rule,'pass','Graduation timing fits the verified deadline.'):result(rule,'fail',`Degree must be completed by ${v.date}.`);
      return t>=new Date(v.date+'T00:00:00Z').getTime()?result(rule,'pass','First-degree timing fits the verified eligibility window.'):result(rule,'fail',`First bachelor degree must be from ${v.date} or later for the standard route.`);
    }
    if(code==='field'&&op==='any')return result(rule,'pass','The verified programme has no subject-area restriction.');
    if(code==='home_country_work'){
      if(p.nat&&p.residence&&norm(p.nat)===norm(p.residence))return result(rule,'review','Residence matches your home country, but current work location still needs confirmation.');
      return result(rule,'review','The provider requires living and working in the home country.');
    }
    return result(rule,'review',rule.source_note||'This verified provider condition needs an additional Passport signal before it can be resolved.');
  }

  function dedupeChecks(checks){
    const seen=new Set();return checks.filter(c=>{const key=`${c.label}|${c.rule_code||''}`;if(seen.has(key))return false;seen.add(key);return true});
  }

  evaluate=function(o){
    const legacy=legacyEvaluateV16(o);
    const rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];
    if(!rules.length)return legacy;
    const structured=rules.map(r=>checkNormalizedRule(r,currentProfile));
    const covered=new Set(structured.map(c=>dimForCode(c.rule_code)));
    const fallback=legacy.checks.filter(c=>!covered.has(c.label)).map(c=>({...c,hard:c.status==='review'}));
    const checks=dedupeChecks([...structured,...fallback]);
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length;
    const reviews=checks.filter(c=>c.status==='review').length;
    const passes=checks.filter(c=>c.status==='pass').length;
    const hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;
    if(fails){label='Not eligible';cls='ineligible';rank=0}
    else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}else{label='Needs review';cls='review';rank=1}}
    else if(passes>=3){label=legacy.relevance>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}
    else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{checks,fails,reviews,passes,relevance:legacy.relevance,label,cls,rank,normalized:true,hardReviews};
  };
  try{renderAll()}catch{}
})();