(()=>{
  function addPrecisionFields(){
    const form=document.querySelector('#onboard .passportForm');
    if(!form||document.getElementById('obGradDate'))return;
    const groups=[...form.querySelectorAll('.passportGroup')];
    const target=groups[groups.length-1];
    const section=document.createElement('div');
    section.className='passportGroup precisionGroup';
    section.innerHTML=`<div class="passportGroupTitle">Eligibility precision <span style="font-weight:500;opacity:.55;text-transform:none;letter-spacing:0">Optional · only used when a provider requires it</span></div><div class="modalGrid"><div class="field"><label>Degree country</label><select id="obDegreeCountry">${opts(COUNTRIES,'','Select degree country')}</select></div><div class="field"><label>Graduation date</label><input id="obGradDate" type="date"></div><div class="field"><label>Eligible work-experience hours</label><input id="obWorkHours" type="number" min="0" step="1" placeholder="e.g. 2800"></div><div class="field precisionHint"><label>Why we ask</label><div style="padding:12px 13px;border:1px solid rgba(116,88,255,.16);border-radius:12px;background:rgba(116,88,255,.05);font-size:12px;line-height:1.45;color:inherit">Some scholarships use exact degree dates or hours. Leave these blank unless you know them—we will show <b>Check</b> rather than guess.</div></div></div>`;
    if(target)form.insertBefore(section,target);else form.appendChild(section);
  }
  const oldOpen=openOnboard;
  openOnboard=function(edit=false){oldOpen(edit);addPrecisionFields();const p=currentProfile||{};const dc=document.getElementById('obDegreeCountry'),gd=document.getElementById('obGradDate'),wh=document.getElementById('obWorkHours');if(dc)dc.value=p.degreeCountry||'';if(gd)gd.value=p.graduationDate||'';if(wh)wh.value=p.workHours||''};
  window.openOnboard=openOnboard;
  const oldFinish=finishOnboard;
  finishOnboard=function(){const extra={degreeCountry:document.getElementById('obDegreeCountry')?.value||'',graduationDate:document.getElementById('obGradDate')?.value||'',workHours:document.getElementById('obWorkHours')?.value?Number(document.getElementById('obWorkHours').value):0};oldFinish();if(currentProfile?.nat&&currentProfile?.edu&&currentProfile?.field){Object.assign(currentProfile,extra);saveProfileState();try{renderAll()}catch{}}};
  window.finishOnboard=finishOnboard;
  addPrecisionFields();

  let cloudTimer=null;
  const getClient=()=>window.OpportunityCloudClient;
  async function sessionUser(){const client=getClient();if(!client)return null;try{const r=await client.auth.getSession();const d=r?.data??r;return d?.user||null}catch{return null}}
  async function hydratePrecision(){const client=getClient(),state=window.OpportunityState;if(!client||!state)return false;const user=await sessionUser();if(!user)return false;try{const r=await client.from('user_passports').select('degree_country,graduation_date,work_experience_hours').eq('auth_user_id',user.id).limit(1);if(r?.error)throw r.error;const row=(r?.data??r)?.[0];if(!row)return false;const p=state.getProfile();const next={...p,degreeCountry:row.degree_country||p.degreeCountry||'',graduationDate:row.graduation_date||p.graduationDate||'',workHours:row.work_experience_hours??p.workHours??0};state.setProfile(next);localStorage.setItem(PROFILE_KEY,JSON.stringify(next));try{renderAll()}catch{}return true}catch(e){console.warn('Precision profile hydration skipped',e);return false}}
  async function syncPrecision(){const client=getClient(),state=window.OpportunityState;if(!client||!state)return;const user=await sessionUser();if(!user)return;const p=state.getProfile();try{const r=await client.from('user_passports').update({degree_country:p.degreeCountry||null,graduation_date:p.graduationDate||null,work_experience_hours:Number(p.workHours||0)||null}).eq('auth_user_id',user.id);if(r?.error)throw r.error}catch(e){console.warn('Precision profile sync skipped',e)}}
  window.addEventListener('opportunity:statechange',()=>{clearTimeout(cloudTimer);cloudTimer=setTimeout(syncPrecision,900)});
  let tries=0;const poll=setInterval(async()=>{tries++;if(await hydratePrecision()||tries>40)clearInterval(poll)},250);
})();