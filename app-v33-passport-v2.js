(()=>{
  const css=document.createElement('style');
  css.textContent=`
    .precisionGroup.v2Precision{border:1px solid rgba(216,255,105,.12);background:linear-gradient(180deg,rgba(216,255,105,.035),rgba(116,88,255,.025));border-radius:16px;padding:16px;margin-top:4px}
    .precisionGroup.v2Precision .passportGroupTitle{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .precisionGroup.v2Precision .passportGroupTitle .v2Tag{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#d8ff69;border:1px solid rgba(216,255,105,.18);background:rgba(216,255,105,.05);padding:4px 7px;border-radius:999px}
    .v2PrecisionHint{grid-column:1/-1;display:flex;gap:9px;align-items:flex-start;padding:10px 12px;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:rgba(255,255,255,.018);font-size:11px;line-height:1.45;color:rgba(255,255,255,.58)}
    .v2PrecisionHint b{color:rgba(255,255,255,.88)}
    .passportPrecisionCard{margin-top:10px;padding:10px 11px;border:1px solid rgba(216,255,105,.12);border-radius:11px;background:linear-gradient(90deg,rgba(216,255,105,.045),rgba(116,88,255,.035));display:flex;justify-content:space-between;gap:12px;align-items:center}
    .passportPrecisionCard span{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.48)}
    .passportPrecisionCard b{font-size:10px;color:#d8ff69}
    .passportPrecisionCard small{display:block;font-size:9px;color:rgba(255,255,255,.38);margin-top:3px;text-align:right}
    @media(max-width:700px){.precisionGroup.v2Precision .passportGroupTitle{align-items:flex-start;flex-direction:column}.passportPrecisionCard{align-items:flex-start}}
  `;
  document.head.appendChild(css);

  const DEGREE_STATUS=['Current — Year 1','Current — Year 2','Current — Year 3','Current — Year 4+','Final year','Completed','Not started / awaiting enrolment'];
  const escHtml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v||'').trim().toLowerCase();
  const completedEducation=p=>/bachelor's degree|master's degree|phd degree/i.test(p?.edu||'');
  const currentStudent=p=>/undergraduate student|master's student|phd student/i.test(p?.edu||'');
  const statusYear=p=>{const s=norm(p?.degreeStatus);if(s.includes('final year'))return 99;const m=s.match(/year\s*(\d+)/);if(m)return Number(m[1]);if(s.includes('year 4+'))return 4;return 0};
  const isFinal=p=>statusYear(p)===99;
  const isCompleted=p=>norm(p?.degreeStatus).includes('completed')||(!p?.degreeStatus&&completedEducation(p));
  const profileGraduationYear=p=>{if(p?.graduationDate){const y=Number(String(p.graduationDate).slice(0,4));if(Number.isFinite(y))return y}const y=Number(p?.graduationYear||0);return Number.isFinite(y)&&y>1900?y:null};
  const res=(rule,status,detail,hard=rule.hard!==false)=>({label:rule.label||'Education stage',status,detail,hard,source_url:rule.source_url||'',source_note:rule.source_note||'',rule_code:rule.code||''});
  const value=rule=>rule?.value&&typeof rule.value==='object'?rule.value:{};

  function ensureV2Fields(){
    const form=document.querySelector('#onboard .passportForm');if(!form)return;
    let group=form.querySelector('.precisionGroup');
    if(!group){group=document.createElement('div');group.className='passportGroup precisionGroup';group.innerHTML='<div class="passportGroupTitle">Eligibility precision</div><div class="modalGrid"></div>';const groups=[...form.querySelectorAll('.passportGroup')];const target=groups[groups.length-1];if(target)form.insertBefore(group,target);else form.appendChild(group)}
    group.classList.add('v2Precision');
    const title=group.querySelector('.passportGroupTitle');if(title)title.innerHTML='Academic stage & eligibility <span class="v2Tag">Passport v2</span>';
    const grid=group.querySelector('.modalGrid')||group;
    if(!document.getElementById('obDegreeStatus')){
      const status=document.createElement('div');status.className='field';status.innerHTML=`<label>Current degree status</label><select id="obDegreeStatus">${opts(DEGREE_STATUS,'','Select academic stage')}</select>`;grid.insertBefore(status,grid.firstChild);
    }
    if(!document.getElementById('obDegreeName')){
      const name=document.createElement('div');name.className='field';name.innerHTML='<label>Degree / qualification name</label><input id="obDegreeName" type="text" maxlength="140" placeholder="e.g. BSc Computer Science">';const first=grid.children[1]||null;grid.insertBefore(name,first);
    }
    if(!document.getElementById('obWorkHours')){
      const hours=document.createElement('div');hours.className='field';hours.innerHTML='<label>Post-degree work hours</label><input id="obWorkHours" type="number" min="0" max="100000" step="1" placeholder="Leave blank if not confirmed"><small style="display:block;margin-top:6px;line-height:1.4;opacity:.62">Exact total completed after your first degree. Only use hours you can support from your work history.</small>';grid.appendChild(hours);
    }
    if(!group.querySelector('.v2PrecisionHint')){
      const hint=document.createElement('div');hint.className='v2PrecisionHint';hint.innerHTML='<span>↗</span><div><b>Why this improves matching</b><br>Final-year and study-year rules are common in UN, development-bank and international internship programmes. We only use these answers when an official rule actually needs them.</div>';grid.appendChild(hint);
    }
    const oldHint=group.querySelector('.precisionHint');if(oldHint)oldHint.style.display='none';
    const gradLabel=document.querySelector('label[for="obGradDate"]');if(gradLabel)gradLabel.textContent='Graduation / expected graduation date';
  }

  const previousOpen=openOnboard;
  openOnboard=function(edit=false){
    previousOpen(edit);ensureV2Fields();const p=currentProfile||{};
    const status=document.getElementById('obDegreeStatus'),name=document.getElementById('obDegreeName');
    if(status)status.value=p.degreeStatus||(completedEducation(p)?'Completed':'');
    if(name)name.value=p.degreeName||'';
    const hours=document.getElementById('obWorkHours');if(hours)hours.value=Number(p.workHours||0)>0?String(p.workHours):'';
  };
  window.openOnboard=openOnboard;

  const previousFinish=finishOnboard;
  finishOnboard=function(){
    ensureV2Fields();
    const rawHours=document.getElementById('obWorkHours')?.value;
    const extra={
      degreeStatus:document.getElementById('obDegreeStatus')?.value||'',
      degreeName:document.getElementById('obDegreeName')?.value?.trim()||'',
      workHours:rawHours===''?'':Math.max(0,Math.round(Number(rawHours)||0))
    };
    previousFinish();
    if(currentProfile?.nat&&currentProfile?.edu&&currentProfile?.field){
      if(!extra.degreeStatus&&completedEducation(currentProfile))extra.degreeStatus='Completed';
      Object.assign(currentProfile,extra,{graduationYear:profileGraduationYear(currentProfile)||''});
      saveProfileState();try{renderAll()}catch{}
    }
  };
  window.finishOnboard=finishOnboard;

  const previousSample=sample;
  sample=function(){previousSample();currentProfile.degreeStatus='Completed';currentProfile.degreeName='Business Management';saveProfileState();try{renderAll()}catch{}};
  window.sample=sample;

  const previousSummary=renderPassportSummary;
  renderPassportSummary=function(){
    previousSummary();
    const box=document.getElementById('passportSummary');if(!box)return;const p=currentProfile||{};
    if(p.degreeStatus){box.insertAdjacentHTML('beforeend',`<div class="summaryItem"><span>Academic stage</span><b>${escHtml(p.degreeStatus)}</b></div>`)}
    if(p.graduationDate){box.insertAdjacentHTML('beforeend',`<div class="summaryItem"><span>Graduation</span><b>${escHtml(p.graduationDate)}</b></div>`)}
    if(Number(p.workHours||0)>0){box.insertAdjacentHTML('beforeend',`<div class="summaryItem"><span>Post-degree work hours</span><b>${escHtml(String(p.workHours))}</b></div>`)}
    const signals=[p.degreeStatus,p.graduationDate,p.degreeCountry,Number(p.workHours||0)>0?String(p.workHours):''].filter(Boolean).length;
    const label=signals>=3?'High precision':signals>=1?'Improved':'Basic';
    box.insertAdjacentHTML('afterend',`<div class="passportPrecisionCard"><span>Eligibility precision</span><div><b>${label}</b><small>${signals} advanced signal${signals===1?'':'s'} available</small></div></div>`);
  };
  window.renderPassportSummary=renderPassportSummary;

  ensureV2Fields();

  const previousEvaluate=evaluate;
  function stageUpgrade(rule,p){
    if(rule.certainty&&rule.certainty!=='confirmed')return null;
    const v=value(rule),kind=v.kind||'',year=statusYear(p),final=isFinal(p);
    if(!p.degreeStatus&&currentStudent(p))return null;

    if(rule.code==='education'&&Array.isArray(v.values)&&v.values.includes('bachelor_final_year')&&/undergraduate student/i.test(p.edu||'')){
      return final?res(rule,'pass','Your Passport confirms final-year Bachelor’s status.'):res(rule,'fail','This route requires final-year Bachelor’s status or a completed Bachelor’s degree.');
    }

    if(rule.code==='education_route_v6'){
      if(kind==='wto'&&/master's student/i.test(p.edu||''))return year>=2||final?res(rule,'pass','Your Passport shows at least the second year/final year of the Master’s route.'):res(rule,'review','WTO requires at least one completed year of postgraduate study; your current academic-stage signal does not yet prove that threshold.');
      if(kind==='wfp'&&/undergraduate student/i.test(p.edu||''))return year>=3||final?res(rule,'pass','Your Passport confirms at least two completed undergraduate years.'):year?res(rule,'fail','WFP requires at least two completed undergraduate years.'):null;
      if(kind==='ilo'&&/master's student/i.test(p.edu||''))return final?res(rule,'pass','Your Passport confirms final-year graduate study.'):res(rule,'review','ILO requires the last year of a graduate degree for this student route.');
      if(kind==='unhcr'&&/undergraduate student/i.test(p.edu||''))return year>=3||final?res(rule,'pass','Your Passport confirms at least two completed undergraduate years.'):year?res(rule,'fail','UNHCR requires at least two completed undergraduate years.'):null;
      if(kind==='unfpa'&&/undergraduate student/i.test(p.edu||''))return year>=2||final?res(rule,'pass','Your Passport confirms at least one completed academic year.'):year?res(rule,'fail','UNFPA requires at least one completed academic year for this route.'):null;
    }

    if(rule.code==='education_route_v7'){
      if(kind==='ifad'&&/undergraduate student/i.test(p.edu||''))return year>=3||final?res(rule,'pass','Your Passport confirms at least two completed undergraduate years; recent course attendance still applies.'):year?res(rule,'fail','IFAD requires at least two completed undergraduate years.'):null;
      if(kind==='iom'&&/undergraduate student/i.test(p.edu||''))return final?res(rule,'pass','Your Passport confirms final-year first-degree status.'):res(rule,'fail','The current-student IOM route requires final-year first-degree status.');
      if(kind==='unesco'&&/undergraduate student/i.test(p.edu||''))return year>=3||final?res(rule,'pass','Your Passport confirms third-year or final-year Bachelor’s status.'):year?res(rule,'fail','UNESCO requires third-year or final-year Bachelor’s status.'):null;
      if(kind==='eib'&&currentStudent(p))return final?res(rule,'pass','Your Passport confirms final-year university status.'):res(rule,'review','EIB uses a final-year student route; your Passport shows you are enrolled but not in final year.');
      if(kind==='idb'&&/undergraduate student/i.test(p.edu||''))return year>=2||final?res(rule,'pass','Your Passport confirms second-year-or-later undergraduate status.'):year?res(rule,'fail','IDB undergraduate interns must be at least in their second year.'):null;
      if(kind==='idb'&&/master's student|phd student/i.test(p.edu||''))return year>=2||final?res(rule,'pass','Your academic stage strongly supports the IDB 50%-coursework progression requirement.'):res(rule,'review','IDB graduate interns must have completed at least 50% of coursework; first-year status alone cannot confirm that.');
      if(kind==='wipo'&&/undergraduate student/i.test(p.edu||''))return year>=3||final?res(rule,'pass','Your Passport confirms third/fourth-year undergraduate status for WIPO Category I.'):res(rule,'review','WIPO may still accept an earlier-year student when an internship is a degree requirement; that condition is not stored.');
    }

    if(rule.code==='education_route_v8'&&kind==='mastercard_ubc'){
      if(isCompleted(p)&&/bachelor's degree/i.test(p.edu||''))return res(rule,'pass','Your Passport confirms a completed Bachelor’s degree and no completed Master’s degree.');
    }
    return null;
  }

  evaluate=function(o){
    const base=previousEvaluate(o),rules=Array.isArray(o.Eligibility_Rules)?o.Eligibility_Rules:[];let checks=[...(base.checks||[])];
    for(const rule of rules){const upgraded=stageUpgrade(rule,currentProfile);if(!upgraded)continue;checks=checks.filter(c=>c.rule_code!==rule.code);checks.unshift(upgraded)}
    const seen=new Set();checks=checks.filter(c=>{const k=`${c.label}|${c.rule_code||''}`;if(seen.has(k))return false;seen.add(k);return true});
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length,reviews=checks.filter(c=>c.status==='review').length,passes=checks.filter(c=>c.status==='pass').length,hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;if(fails){label='Not eligible';cls='ineligible';rank=0}else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,passportV2:true};
  };
  window.evaluate=evaluate;

  let cloudTimer=null;
  const getClient=()=>window.OpportunityCloudClient;
  async function sessionUser(){const client=getClient();if(!client)return null;try{const r=await client.auth.getSession();const d=r?.data??r;return d?.user||null}catch{return null}}
  async function hydrateV2(){
    const client=getClient(),state=window.OpportunityState;if(!client||!state)return false;const user=await sessionUser();if(!user)return false;
    try{
      const r=await client.from('user_passports').select('degree_status,degree_name,graduation_year').eq('auth_user_id',user.id).limit(1);if(r?.error)throw r.error;const row=(r?.data??r)?.[0];if(!row)return false;
      const p=state.getProfile();const next={...p,degreeStatus:row.degree_status||p.degreeStatus||(completedEducation(p)?'Completed':''),degreeName:row.degree_name||p.degreeName||'',graduationYear:row.graduation_year??p.graduationYear??profileGraduationYear(p)??''};
      state.setProfile(next);localStorage.setItem(PROFILE_KEY,JSON.stringify(next));try{renderAll()}catch{}return true;
    }catch(e){console.warn('Passport v2 hydration skipped',e);return false}
  }
  async function syncV2(){
    const client=getClient(),state=window.OpportunityState;if(!client||!state)return;const user=await sessionUser();if(!user)return;const p=state.getProfile();
    try{const r=await client.from('user_passports').update({degree_status:p.degreeStatus||null,degree_name:p.degreeName||null,graduation_year:profileGraduationYear(p)}).eq('auth_user_id',user.id);if(r?.error)throw r.error}catch(e){console.warn('Passport v2 sync skipped',e)}
  }
  window.addEventListener('opportunity:statechange',()=>{clearTimeout(cloudTimer);cloudTimer=setTimeout(syncV2,950)});
  let tries=0;const poll=setInterval(async()=>{tries++;if(await hydrateV2()||tries>40)clearInterval(poll)},250);

  try{renderPassportSummary();renderAll()}catch{}
})();
