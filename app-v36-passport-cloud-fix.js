(()=>{
  const client=()=>window.OpportunityCloudClient;
  const state=()=>window.OpportunityState;
  const dateOnly=v=>v?String(v).slice(0,10):'';
  const graduationYear=p=>{
    if(p?.graduationDate){const y=Number(String(p.graduationDate).slice(0,4));if(Number.isFinite(y)&&y>1900)return y}
    const y=Number(p?.graduationYear||0);return Number.isFinite(y)&&y>1900?y:null;
  };
  async function user(){
    const c=client();if(!c)return null;
    try{const r=await c.auth.getSession();const d=r?.data??r;return d?.user||null}catch{return null}
  }
  async function hydrate(){
    const c=client(),s=state(),u=await user();if(!c||!s||!u)return false;
    try{
      const r=await c.from('user_passports').select('degree_status,degree_name,graduation_year,graduation_date,degree_country,work_experience_hours').eq('auth_user_id',u.id).limit(1);
      if(r?.error)throw r.error;const row=(r?.data??r)?.[0];if(!row)return false;
      const p=s.getProfile();
      const next={
        ...p,
        degreeStatus:row.degree_status||p.degreeStatus||'',
        degreeName:row.degree_name||p.degreeName||'',
        graduationYear:row.graduation_year??p.graduationYear??'',
        graduationDate:dateOnly(row.graduation_date)||p.graduationDate||'',
        degreeCountry:row.degree_country||p.degreeCountry||'',
        workHours:row.work_experience_hours??p.workHours??''
      };
      const changed=['degreeStatus','degreeName','graduationYear','graduationDate','degreeCountry','workHours'].some(k=>String(next[k]??'')!==String(p[k]??''));
      if(changed){s.setProfile(next);try{localStorage.setItem(PROFILE_KEY,JSON.stringify(next))}catch{}try{renderAll()}catch{}}
      return true;
    }catch(e){console.warn('Passport v2 cloud restore skipped',e);return false}
  }
  let syncTimer=null;
  async function sync(){
    const c=client(),s=state(),u=await user();if(!c||!s||!u)return;
    const p=s.getProfile();
    try{
      const payload={
        degree_status:p.degreeStatus||null,
        degree_name:p.degreeName||null,
        graduation_year:graduationYear(p),
        graduation_date:p.graduationDate||null,
        degree_country:p.degreeCountry||null,
        work_experience_hours:Number(p.workHours||0)>0?Number(p.workHours):null
      };
      const r=await c.from('user_passports').update(payload).eq('auth_user_id',u.id);if(r?.error)throw r.error;
    }catch(e){console.warn('Passport v2 cloud sync skipped',e)}
  }
  window.addEventListener('opportunity:statechange',()=>{clearTimeout(syncTimer);syncTimer=setTimeout(sync,1200)});
  let tries=0;const timer=setInterval(async()=>{tries++;if(await hydrate()||tries>48)clearInterval(timer)},250);
  window.addEventListener('focus',()=>hydrate());
})();
