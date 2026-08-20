(()=>{
  const css=document.createElement('style');
  css.textContent=`
    .v2PrecisionHint{color:#5f6674!important;background:#f7f8fb!important;border-color:#dfe3ea!important}
    .v2PrecisionHint b{color:#20242d!important}
    .matchIntel{margin-top:16px;display:grid;gap:12px}
    .matchIntelHero{border:1px solid rgba(20,28,45,.09);border-radius:18px;background:linear-gradient(135deg,#111727,#20254a);color:white;padding:20px;display:grid;grid-template-columns:1.25fr .75fr;gap:22px;align-items:center;overflow:hidden;position:relative}
    .matchIntelHero:after{content:"";position:absolute;width:220px;height:220px;border-radius:50%;right:-70px;top:-90px;background:radial-gradient(circle,rgba(216,255,105,.18),transparent 68%);pointer-events:none}
    .matchIntelEy{font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:#d8ff69;font-weight:850}
    .matchIntelHero h3{font-size:24px;line-height:1.05;letter-spacing:-.035em;margin:7px 0 8px}
    .matchIntelHero p{font-size:11px;line-height:1.55;color:rgba(255,255,255,.62);margin:0;max-width:560px}
    .matchIntelUplift{display:grid;grid-template-columns:1fr 1fr;gap:8px;position:relative;z-index:1}
    .matchIntelUplift div{border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.035);padding:13px}
    .matchIntelUplift b{font-size:26px;display:block;letter-spacing:-.04em}.matchIntelUplift span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.46);margin-top:4px;line-height:1.35}
    .matchDist{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    .matchDistCard{border:1px solid rgba(20,28,45,.08);background:white;border-radius:15px;padding:14px;min-height:94px;display:flex;flex-direction:column;justify-content:space-between}
    .matchDistCard span{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#7c8494}.matchDistCard b{font-size:27px;letter-spacing:-.04em;color:#161a22}.matchDistCard small{font-size:9px;color:#9aa1ae}
    .precisionNext{border:1px solid rgba(20,28,45,.08);background:#fff;border-radius:17px;padding:17px}
    .precisionNextHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.precisionNextHead h3{font-size:16px;margin:4px 0 3px;letter-spacing:-.025em}.precisionNextHead p{font-size:10px;color:#848b99;margin:0}.precisionEdit{border:0;border-radius:10px;background:#171b25;color:white;padding:9px 12px;font-size:9px;font-weight:750;cursor:pointer}.precisionSignals{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:13px}.precisionSignal{border:1px solid #e7e9ee;border-radius:11px;padding:10px;background:#fafbfc}.precisionSignal.done{background:#f6faec;border-color:#e3edc7}.precisionSignal i{display:block;font-style:normal;font-size:13px;margin-bottom:6px}.precisionSignal b{display:block;font-size:10px;color:#252a33}.precisionSignal span{display:block;font-size:8px;color:#9097a4;margin-top:3px;line-height:1.35}
    @media(max-width:900px){.matchIntelHero{grid-template-columns:1fr}.matchDist,.precisionSignals{grid-template-columns:1fr 1fr}}
    @media(max-width:560px){.matchDist,.precisionSignals{grid-template-columns:1fr}.matchIntelUplift{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(css);

  const escV35=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const previousDashboard=renderDashboard;
  const strippedProfile=p=>({...p,degreeStatus:'',degreeName:'',degreeCountry:'',graduationDate:'',graduationYear:'',workHours:0});

  function evalWithProfile(profile){
    const original=currentProfile;
    try{currentProfile=profile;return opps.map(o=>({id:o.Opportunity_ID,ev:evaluate(o)}))}
    finally{currentProfile=original}
  }
  function distribution(list){const d={eligible:0,possible:0,review:0,ineligible:0};list.forEach(x=>{d[x.ev.cls]=(d[x.ev.cls]||0)+1});return d}
  function impact(){
    const after=opps.map(o=>({id:o.Opportunity_ID,ev:evaluate(o)}));
    const before=evalWithProfile(strippedProfile({...currentProfile}));
    const byBefore=new Map(before.map(x=>[x.id,x.ev]));let improved=0,resolved=0;
    for(const x of after){const b=byBefore.get(x.id);if(!b)continue;if(Number(x.ev.rank||0)>Number(b.rank||0))improved++;resolved+=Math.max(0,Number(b.hardReviews||0)-Number(x.ev.hardReviews||0))}
    return{after,before,improved,resolved,dist:distribution(after),baseDist:distribution(before)};
  }
  function signals(){const p=currentProfile||{};return[
    {name:'Academic stage',ok:!!p.degreeStatus,detail:p.degreeStatus||'Add current year / completed status'},
    {name:'Graduation timing',ok:!!p.graduationDate,detail:p.graduationDate||'Needed for recent-graduate windows'},
    {name:'Degree country',ok:!!p.degreeCountry,detail:p.degreeCountry||'Useful for country-specific study rules'},
    {name:'Eligible work hours',ok:Number(p.workHours||0)>0,detail:Number(p.workHours||0)>0?`${p.workHours} hours recorded`:'Only add when you know the eligible total'}
  ]}
  function intelHtml(){
    if(!opps.length)return'';const m=impact(),d=m.dist,s=signals(),complete=s.filter(x=>x.ok).length;
    const uplift=m.improved?`${m.improved} match${m.improved===1?'':'es'} improved with advanced Passport signals.`:'Your current advanced fields are not changing a final match label yet — they still reduce uncertainty inside individual checks.';
    return `<section class="matchIntel"><div class="matchIntelHero"><div><div class="matchIntelEy">Passport v2 · match intelligence</div><h3>See what your profile actually resolves.</h3><p>${escV35(uplift)} We compare the same 100 opportunities with and without Passport v2 signals, without changing your saved profile.</p></div><div class="matchIntelUplift"><div><b>${m.improved}</b><span>match labels improved</span></div><div><b>${m.resolved}</b><span>hard review checks resolved</span></div></div></div><div class="matchDist"><div class="matchDistCard"><span>Strong / likely</span><b>${d.eligible||0}</b><small>high-confidence fit</small></div><div class="matchDistCard"><span>Possible</span><b>${d.possible||0}</b><small>worth checking</small></div><div class="matchDistCard"><span>Needs review</span><b>${d.review||0}</b><small>missing or provider-specific evidence</small></div><div class="matchDistCard"><span>Not eligible</span><b>${d.ineligible||0}</b><small>verified blocker found</small></div></div><div class="precisionNext"><div class="precisionNextHead"><div><div class="matchIntelEy" style="color:#6c54ee">Profile precision</div><h3>${complete}/4 advanced signals available</h3><p>These fields are optional. Opportunity only uses them when an official rule needs them.</p></div><button class="precisionEdit" onclick="openOnboard(true)">Edit Passport ↗</button></div><div class="precisionSignals">${s.map(x=>`<div class="precisionSignal ${x.ok?'done':''}"><i>${x.ok?'✓':'○'}</i><b>${escV35(x.name)}</b><span>${escV35(x.detail)}</span></div>`).join('')}</div></div></section>`;
  }

  renderDashboard=function(){previousDashboard();const host=document.getElementById('dashGrid');if(!host)return;host.querySelector('.matchIntel')?.remove();host.insertAdjacentHTML('afterbegin',intelHtml())};
  window.renderDashboard=renderDashboard;
  const prevAll=renderAll;renderAll=function(){prevAll();try{if(!document.getElementById('dashboard')?.classList.contains('hide'))renderDashboard()}catch{}};window.renderAll=renderAll;
  try{renderDashboard()}catch{}
})();
