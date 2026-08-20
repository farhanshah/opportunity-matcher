(()=>{
  const priorEvaluate=evaluate;
  const norm=v=>String(v||'').trim().toLowerCase();
  const arr=v=>Array.isArray(v)?v:[];
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const completedBachelor=p=>/bachelor's degree|master's degree|phd degree/i.test(String(p?.edu||''))||/completed/i.test(String(p?.degreeStatus||''));
  const currentStudent=p=>/student/i.test(String(p?.edu||''))&&!/completed/i.test(String(p?.degreeStatus||''));
  const graduationDate=p=>{const s=String(p?.graduationDate||'');if(!s)return null;const d=new Date(s+'T00:00:00Z');return Number.isNaN(d.getTime())?null:d};
  const monthsSince=d=>{if(!d)return null;const now=new Date();return (now.getUTCFullYear()-d.getUTCFullYear())*12+(now.getUTCMonth()-d.getUTCMonth())-(now.getUTCDate()<d.getUTCDate()?1:0)};
  const result=(r,status,detail,hard=r?.hard!==false)=>({label:r?.label||'Eligibility',status,detail,hard,source_url:r?.source_url||'',source_note:r?.source_note||'',rule_code:r?.code||''});
  const FIELD_TOKENS={
    'Business & Management':['business','management','commerce','entrepreneur'],
    'Accounting & Finance':['account','finance','banking'],
    'Economics':['economics','economic'],
    'Computer Science, AI & Data':['computer','software','data','technology','artificial intelligence'],
    'International Relations & Development':['international relations','development','global affairs'],
    'Politics & Public Policy':['public policy','political','governance'],
    'Communication, Media & Journalism':['communication','media','journalism'],
    'Law & Legal Studies':['law','legal'],
    'Public Health':['public health','health policy'],
    'Agriculture, Food & Forestry':['agriculture','food','forestry','rural development']
  };
  function fieldPass(r,p){
    if(r?.certainty&&r.certainty!=='confirmed')return null;
    const v=val(r),pf=arr(v.passport_fields);
    if(pf.length&&p?.field&&pf.some(x=>norm(x)===norm(p.field)))return result(r,'pass',`${p.field} is explicitly included in the verified programme field mapping.`);
    if(v.vacancy_specific===true)return null;
    if(r.code==='field_priority'&&p?.field){
      const hay=arr(v.areas).join(' ').toLowerCase();const tokens=FIELD_TOKENS[p.field]||[];
      if(tokens.some(t=>hay.includes(t)))return result(r,'pass',`${p.field} aligns with a verified priority study area.`);
    }
    return null;
  }
  function educationPass(r,p){
    if(r?.certainty&&r.certainty!=='confirmed')return null;
    const v=val(r),code=r.code||'',kind=v.kind||'',grad=graduationDate(p),m=monthsSince(grad);
    if(code==='education_v5'){
      if(kind==='bachelor_min')return completedBachelor(p)?result(r,'pass','Your completed Bachelor’s degree meets the verified first-degree minimum.'):null;
      if(kind==='masters_min')return /master's degree|phd degree/i.test(String(p?.edu||''))?result(r,'pass','Your completed postgraduate degree meets the verified Master’s minimum.'):completedBachelor(p)?result(r,'fail','This programme requires a completed Master’s degree.'):null;
    }
    if(code==='current_degree_exclusion_v5'){
      if(/completed/i.test(String(p?.degreeStatus||''))&&!currentStudent(p))return result(r,'pass','Your Passport shows you are not currently enrolled in a degree programme.');
      if(currentStudent(p))return result(r,'fail','The verified rule excludes applicants currently enrolled in a degree programme.');
    }
    if(code==='education_baseline'){
      if(kind==='bachelor_completed'&&completedBachelor(p))return result(r,'pass','Your Passport confirms a completed Bachelor-level degree.');
      if(kind==='secondary_current'&&completedBachelor(p))return result(r,'fail','This programme is for current secondary-school students, not applicants who have already completed university study.');
    }
    if(code==='degree_age_years_max'&&grad&&Number.isFinite(Number(v.max_years))){
      const ageYears=(Date.now()-grad.getTime())/(365.2425*864e5);
      return ageYears<=Number(v.max_years)?result(r,'pass',`Your degree is within the verified ${v.max_years}-year recency window.`):result(r,'fail',`The verified degree-recency limit is ${v.max_years} years.`);
    }
    if(code==='education_route_v6'){
      if(!completedBachelor(p))return null;
      if(kind==='unhcr'&&m!=null)return m<=24?result(r,'pass','Your graduation date is within UNHCR’s verified two-year recent-graduate window.'):result(r,'fail','UNHCR’s graduate route requires graduation within the last two years.');
      if(kind==='ebrd'&&m!=null)return m<=12?result(r,'pass','Your graduation date is within EBRD’s normal 12-month recent-graduate route.'):result(r,'review','Your Bachelor’s degree is completed, but the normal EBRD graduate recency route is within 12 months.');
      if(kind==='unfpa'&&m!=null)return m<=12?result(r,'pass','Your graduation date is within UNFPA’s verified one-year recent-graduate route.'):result(r,'fail','UNFPA’s recent-graduate route is limited to one year after graduation.');
      if(kind==='fao')return result(r,'pass','Your completed Bachelor’s degree fits FAO’s student/recent-graduate education baseline; vacancy-level requirements still apply.');
    }
    if(code==='education_route_v7'){
      if(kind==='ecb'&&completedBachelor(p))return result(r,'pass','Your completed Bachelor’s degree satisfies the ECB first-cycle degree baseline.');
      if(!completedBachelor(p)||m==null)return null;
      if(kind==='ifad')return m<=24?result(r,'pass','Your graduation date is within IFAD’s verified 24-month graduate route.'):result(r,'fail','IFAD’s graduate route requires completion within 24 months.');
      if(kind==='iom')return m<=12?result(r,'pass','Your graduation date is within IOM’s verified one-year graduate route.'):result(r,'fail','IOM’s graduate route requires starting within one year of graduation.');
      if(kind==='unesco')return m<=12?result(r,'pass','Your graduation date is within UNESCO’s verified 12-month recent-graduate route.'):result(r,'fail','UNESCO’s recent-graduate route is limited to 12 months.');
      if(kind==='itu')return m<=6?result(r,'pass','Your graduation date is within ITU’s verified six-month recent-graduate route.'):result(r,'fail','ITU’s recent-graduate route is limited to six months.');
      if(kind==='wipo')return m<=24?result(r,'pass','Your graduation date is within WIPO’s verified two-year recent-graduate route.'):result(r,'fail','WIPO’s graduate internship route uses a two-year recency window.');
      if(kind==='eib'&&Number(p?.expMonths||0)<12)return result(r,'pass','Your completed degree and under-one-year recorded experience fit the EIB graduate-route baseline.');
    }
    if(code==='degree_route_v4'){
      if(kind==='yenching'&&completedBachelor(p))return result(r,'pass','Your completed Bachelor’s degree satisfies Yenching’s degree-completion baseline.');
      if(kind==='adb_jsp'&&completedBachelor(p))return result(r,'pass','Your completed Bachelor’s degree satisfies the verified ADB-JSP degree baseline.');
    }
    if(code==='education_route_v8'&&kind==='mccall'&&completedBachelor(p)&&grad){
      return result(r,'pass','Your first Bachelor’s completion timing fits the published 2027 McCall MacBain route baseline.');
    }
    return null;
  }
  function recalc(base,checks){
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length;
    const reviews=checks.filter(c=>c.status==='review').length;
    const passes=checks.filter(c=>c.status==='pass').length;
    const hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;
    if(fails){label='Not eligible';cls='ineligible';rank=0}
    else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}
    else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}
    else if(passes>=2){label='Possible match';cls='possible';rank=3}
    if(fails<=Number(base.fails||0)&&hardReviews<=Number(base.hardReviews||0)&&rank<Number(base.rank||0)){label=base.label;cls=base.cls;rank=base.rank}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,profileResolversV40:true};
  }
  evaluate=function(o){
    const base=priorEvaluate(o),rules=arr(o?.Eligibility_Rules);if(!rules.length)return base;
    let checks=[...(base.checks||[])];
    for(const r of rules){
      const replacement=fieldPass(r,currentProfile)||educationPass(r,currentProfile);if(!replacement)continue;
      const idx=checks.findIndex(c=>c.rule_code===r.code);
      if(idx>=0){if(checks[idx].status==='fail'&&replacement.status!=='fail')continue;checks[idx]=replacement}
      else checks.unshift(replacement);
    }
    const seen=new Set();checks=checks.filter(c=>{const k=`${c.rule_code||''}|${c.label}`;if(seen.has(k))return false;seen.add(k);return true});
    return recalc(base,checks);
  };
  window.evaluate=evaluate;
  try{renderAll()}catch{}
})();
