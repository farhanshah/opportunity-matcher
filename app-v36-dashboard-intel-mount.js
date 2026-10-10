(()=>{
  const escV36=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const previousDashboard=renderDashboard;
  const strippedProfile=p=>({...p,degreeStatus:'',degreeName:'',degreeCountry:'',graduationDate:'',graduationYear:'',workHours:0});
  const isActive=o=>{if(String(o?.Status||'').trim().toLowerCase()==='closed')return false;try{const d=typeof days==='function'?Number(days(o)):NaN;if(Number.isFinite(d)&&d<0)return false}catch{}return true};
  const activePool=()=>opps.filter(isActive);

  function evalWithProfile(profile,list=activePool()){
    const original=currentProfile;
    try{currentProfile=profile;return list.map(o=>({id:o.Opportunity_ID,ev:evaluate(o)}))}
    finally{currentProfile=original}
  }
  function distribution(list){
    const d={eligible:0,possible:0,review:0,ineligible:0};
    list.forEach(x=>{d[x.ev.cls]=(d[x.ev.cls]||0)+1});
    return d;
  }
  function impact(){
    const pool=activePool();
    const after=pool.map(o=>({id:o.Opportunity_ID,ev:evaluate(o)}));
    const before=evalWithProfile(strippedProfile({...currentProfile}),pool);
    const byBefore=new Map(before.map(x=>[x.id,x.ev]));
    let improved=0,resolved=0;
    for(const x of after){
      const b=byBefore.get(x.id);if(!b)continue;
      if(Number(x.ev.rank||0)>Number(b.rank||0))improved++;
      resolved+=Math.max(0,Number(b.hardReviews||0)-Number(x.ev.hardReviews||0));
    }
    return{improved,resolved,dist:distribution(after),activeCount:pool.length,excludedCount:Math.max(0,opps.length-pool.length)};
  }
  function signals(){
    const p=currentProfile||{};
    return[
      {name:'Academic stage',ok:!!p.degreeStatus,detail:p.degreeStatus||'Add current year / completed status'},
      {name:'Graduation timing',ok:!!p.graduationDate,detail:p.graduationDate||'Needed for recent-graduate windows'},
      {name:'Degree country',ok:!!p.degreeCountry,detail:p.degreeCountry||'Useful for country-specific study rules'},
      {name:'Eligible work hours',ok:Number(p.workHours||0)>0,detail:Number(p.workHours||0)>0?`${p.workHours} hours recorded`:'Only add when you know the eligible total'}
    ];
  }
  function html(){
    if(!opps?.length)return'';
    const m=impact(),d=m.dist,s=signals(),complete=s.filter(x=>x.ok).length;
    const uplift=m.improved?`${m.improved} active match${m.improved===1?'':'es'} improved with advanced Passport signals.`:'Your advanced fields are reducing uncertainty even where the final label has not changed yet.';
    const scope=`${m.activeCount} active routes${m.excludedCount?` · ${m.excludedCount} closed records excluded`:''}`;
    return `<section class="matchIntel" data-v36="true"><div class="matchIntelHero"><div><div class="matchIntelEy">Passport v2 · match intelligence</div><h3>See what your profile actually resolves.</h3><p>${escV36(uplift)} This compares the same active opportunity pool with and without Passport v2 signals, without changing your saved profile.</p></div><div class="matchIntelUplift"><div><b>${m.improved}</b><span>match labels improved</span></div><div><b>${m.resolved}</b><span>hard review checks resolved</span></div></div></div><div class="matchDist"><div class="matchDistCard"><span>Strong / likely</span><b>${d.eligible||0}</b><small>high-confidence fit</small></div><div class="matchDistCard"><span>Possible</span><b>${d.possible||0}</b><small>worth checking</small></div><div class="matchDistCard"><span>Needs review</span><b>${d.review||0}</b><small>missing or provider-specific evidence</small></div><div class="matchDistCard"><span>Not eligible</span><b>${d.ineligible||0}</b><small>verified blocker found</small></div></div><div style="margin-top:7px;font-size:8px;color:#8e96a5;letter-spacing:.04em">${escV36(scope)}</div><div class="precisionNext"><div class="precisionNextHead"><div><div class="matchIntelEy" style="color:#6c54ee">Profile precision</div><h3>${complete}/4 advanced signals available</h3><p>These fields are optional. Opportunity only uses them when an official rule needs them.</p></div><button class="precisionEdit" onclick="openOnboard(true)">Edit Passport ↗</button></div><div class="precisionSignals">${s.map(x=>`<div class="precisionSignal ${x.ok?'done':''}"><i>${x.ok?'✓':'○'}</i><b>${escV36(x.name)}</b><span>${escV36(x.detail)}</span></div>`).join('')}</div></div></section>`;
  }
  function mount(){
    const dash=document.querySelector('#dashboard .dashPremium');if(!dash)return;
    dash.querySelectorAll('.matchIntel').forEach(el=>el.remove());
    const hero=dash.querySelector('.dashHero');
    if(hero)hero.insertAdjacentHTML('afterend',html());
    else dash.insertAdjacentHTML('afterbegin',html());
  }
  renderDashboard=function(){previousDashboard();mount()};
  window.renderDashboard=renderDashboard;
  const priorSet=window.setView;
  if(typeof priorSet==='function'){
    const setV36=function(v,...args){const r=priorSet(v,...args);if(v==='dashboard')setTimeout(mount,0);return r};
    try{setView=setV36}catch{}
    window.setView=setV36;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>setV36(b.dataset.v)});
  }
  try{if(!document.getElementById('dashboard')?.classList.contains('hide'))renderDashboard()}catch(e){console.warn('Dashboard intelligence mount skipped',e)}
})();
