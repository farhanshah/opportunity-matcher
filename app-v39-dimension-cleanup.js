(()=>{
  const priorEvaluate=evaluate;
  const norm=v=>String(v||'').trim().toLowerCase();
  const arr=v=>Array.isArray(v)?v:[];
  const val=r=>r?.value&&typeof r.value==='object'?r.value:{};
  const fieldRule=r=>{
    const code=norm(r?.code),label=norm(r?.label),covers=arr(val(r).covers).map(norm);
    return code==='field'||code.includes('field_fit')||code.includes('field_priority')||code.includes('course_relevance')||code==='programme_v8'||covers.includes('field of study')||/subject eligibility|academic field|study area|discipline/.test(label);
  };
  const educationRule=r=>{
    const code=norm(r?.code),label=norm(r?.label),covers=arr(val(r).covers).map(norm);
    return code==='education'||code.includes('education_')||code.includes('degree_')||code.includes('student')||code.includes('graduation')||code.includes('academic_stage')||covers.includes('education')||/degree baseline|education route|student route|academic stage|degree requirement/.test(label);
  };
  const ruleCheckCodes=(checks,rules)=>new Set(checks.filter(c=>c.rule_code&&rules.some(r=>r.code===c.rule_code)).map(c=>c.rule_code));
  const result=(rule,status,detail,hard=rule?.hard!==false)=>({label:rule?.label||'Provider rule',status,detail,hard,source_url:rule?.source_url||'',source_note:rule?.source_note||'',rule_code:rule?.code||''});
  function fieldResolution(rules,p){
    for(const r of rules){
      if(r.certainty&&r.certainty!=='confirmed')continue;
      const v=val(r),fields=arr(v.passport_fields);
      if(fields.length&&p?.field&&fields.some(x=>norm(x)===norm(p.field)))return result(r,'pass',`${p.field} is explicitly covered by the verified field mapping.`);
      if(v.exclude_medicine&&p?.field&&norm(p.field)!=='medicine & dentistry')return result(r,'pass','The verified subject rule accepts all listed courses except medicine; your stored field does not hit that exclusion.');
      if(r.code==='field'&&r.hard===false&&!fields.length)return result(r,'info',r.source_note||'No universal academic-field restriction applies.',false);
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
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,dimensionCleanup:true};
  }
  evaluate=function(o){
    const base=priorEvaluate(o),rules=arr(o?.Eligibility_Rules);if(!rules.length)return base;
    let checks=[...(base.checks||[])];
    const fr=rules.filter(fieldRule),er=rules.filter(educationRule);
    if(fr.length){
      const structured=ruleCheckCodes(checks,fr);
      const hasStructured=[...structured].length>0;
      const generic=checks.find(c=>c.label==='Field of study'&&!c.rule_code);
      if(generic){
        if(hasStructured)checks=checks.filter(c=>c!==generic);
        else{const resolved=fieldResolution(fr,currentProfile);if(resolved){checks=checks.filter(c=>c!==generic);checks.unshift(resolved)}else if(fr.every(r=>r.hard===false&&(!r.certainty||r.certainty==='confirmed'))){generic.status='info';generic.hard=false;generic.detail='No universal academic-field restriction is used as a hard eligibility blocker for this programme.'}}
      }
    }
    if(er.length){
      const structured=ruleCheckCodes(checks,er);
      const generic=checks.find(c=>c.label==='Education'&&!c.rule_code);
      if(generic&&structured.size)checks=checks.filter(c=>c!==generic);
      else if(generic&&er.every(r=>r.hard===false&&(!r.certainty||r.certainty==='confirmed'))){generic.status='info';generic.hard=false;generic.detail='Education is not a universal hard blocker in the verified programme rule.'}
    }
    const seen=new Set();checks=checks.filter(c=>{const k=`${c.label}|${c.rule_code||''}|${c.status}`;if(seen.has(k))return false;seen.add(k);return true});
    return recalc(base,checks);
  };
  window.evaluate=evaluate;
  try{renderAll()}catch{}
})();
