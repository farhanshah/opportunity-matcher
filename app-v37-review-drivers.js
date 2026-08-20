(()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const css=document.createElement('style');
  css.textContent=`
    .reviewDrivers{margin-top:12px;border:1px solid rgba(20,28,45,.08);border-radius:18px;background:#fff;padding:18px}
    .reviewDriversHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
    .reviewDriversHead h3{margin:4px 0 4px;font-size:17px;letter-spacing:-.025em;color:#171b24}
    .reviewDriversHead p{margin:0;color:#858c99;font-size:10px;line-height:1.5;max-width:650px}
    .reviewDriversMeta{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
    .reviewDriversMeta span{border:1px solid #e5e8ee;background:#fafbfc;color:#747c8b;border-radius:999px;padding:6px 9px;font-size:8px;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
    .reviewDriverGrid{display:grid;grid-template-columns:1.2fr .8fr;gap:10px;margin-top:14px}
    .driverList{display:grid;gap:7px}
    .driverRow{border:1px solid #e8eaf0;background:#fbfcfd;border-radius:12px;padding:11px 12px;display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center}
    .driverCount{width:28px;height:28px;border-radius:9px;background:#171c28;color:#fff;display:grid;place-items:center;font-size:10px;font-weight:850}
    .driverRow b{display:block;color:#252a33;font-size:10px}.driverRow small{display:block;color:#959ca8;font-size:8px;line-height:1.35;margin-top:3px}
    .driverType{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#765cf0;border:1px solid #e4dfff;background:#f8f6ff;border-radius:999px;padding:5px 7px}
    .nextSignalCard{border:1px solid rgba(116,88,255,.13);border-radius:14px;background:linear-gradient(145deg,#f8f7ff,#fbfcff);padding:15px;display:flex;flex-direction:column}
    .nextSignalCard .ey{font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#6c54ee;font-weight:850}.nextSignalCard h4{font-size:16px;letter-spacing:-.025em;color:#191d25;margin:7px 0 6px}.nextSignalCard p{font-size:10px;color:#7e8593;line-height:1.55;margin:0}.nextSignalCard button{margin-top:auto;border:0;border-radius:10px;background:#171b25;color:#fff;height:36px;font-size:9px;font-weight:760;cursor:pointer}
    .activeScopeNote{margin-top:9px;color:#9aa1ad;font-size:8px}
    @media(max-width:850px){.reviewDriverGrid{grid-template-columns:1fr}.reviewDriversHead{display:grid}.reviewDriversMeta{justify-content:flex-start}}
  `;
  document.head.appendChild(css);

  const isActive=o=>String(o?.Status||'').toLowerCase()!=='closed';
  const activeOpps=()=>opps.filter(isActive);
  const normalize=s=>String(s||'').trim().toLowerCase();
  function classify(check){
    const text=normalize(`${check?.label||''} ${check?.detail||''} ${check?.rule_code||''}`);
    if(/gpa|grade|academic score|cgpa/.test(text))return'Profile';
    if(/ielts|toefl|english test|language score|language requirement/.test(text))return'Profile';
    if(/work experience|experience hours|professional experience/.test(text))return'Profile';
    if(/graduat|degree country|academic stage|final year|study year/.test(text))return'Profile';
    if(/nomination|admission|supervisor|course-specific|programme-specific|program-specific|vacancy|application route/.test(text))return'Route';
    if(/country list|country-specific|provider|current cycle|cycle-specific|call-specific/.test(text))return'Provider';
    return'Provider';
  }
  function drivers(){
    const map=new Map();let reviewOpps=0,possibleOpps=0,totalChecks=0;
    for(const o of activeOpps()){
      const ev=evaluate(o);if(ev.cls==='review')reviewOpps++;if(ev.cls==='possible')possibleOpps++;
      if(!['review','possible'].includes(ev.cls))continue;
      for(const c of ev.checks||[]){
        if(c.status!=='review'||c.hard===false)continue;totalChecks++;
        const key=c.label||c.rule_code||'Provider-specific eligibility';
        const cur=map.get(key)||{label:key,count:0,type:classify(c),detail:c.detail||''};cur.count++;if(!cur.detail&&c.detail)cur.detail=c.detail;map.set(key,cur);
      }
    }
    return{rows:[...map.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).slice(0,5),reviewOpps,possibleOpps,totalChecks};
  }
  function recommendation(d){
    const p=currentProfile||{};const all=(d.rows||[]).map(x=>normalize(`${x.label} ${x.detail}`)).join(' ');
    if((p.gpa===''||p.gpa==null)&&/gpa|grade|academic score|cgpa/.test(all))return{title:'Add your GPA / final classification',body:'Some remaining checks are academic-performance rules. A verified GPA or equivalent classification could resolve more of them.',action:'Edit Passport'};
    if(!/ielts|toefl/i.test(String(p.english||''))&&/ielts|toefl|english test|language score/.test(all))return{title:'English test details are the next useful signal',body:'Your degree-taught-in-English status is useful, but some programmes require a named test or minimum score. We should add this only if the active review queue justifies it.',action:'Edit Passport'};
    if(!(Number(p.workHours||0)>0)&&/work experience|experience hours|professional experience/.test(all))return{title:'Work-experience detail may unlock more routes',body:'A few programmes use hours or qualifying professional experience rather than a simple years field. Only add a total you can defend.',action:'Edit Passport'};
    return{title:'Do not add more Passport fields yet',body:'The remaining uncertainty is mainly provider-, route-, or cycle-specific. The better move is deeper rule normalization and freshness evidence, not a longer profile form.',action:'Review matches'};
  }
  function markup(){
    const d=drivers(),rec=recommendation(d),n=activeOpps().length;
    const rows=d.rows.length?d.rows.map(x=>`<div class="driverRow"><div class="driverCount">${x.count}</div><div><b>${esc(x.label)}</b><small>${esc(x.detail||'Requires provider-specific confirmation before the matcher can be certain.')}</small></div><span class="driverType">${esc(x.type)}</span></div>`).join(''):`<div class="driverRow"><div class="driverCount">0</div><div><b>No hard review drivers</b><small>Active matches are currently resolving without hard review checks.</small></div><span class="driverType">Clear</span></div>`;
    const action=rec.action==='Edit Passport'?`openOnboard(true)`:`setView('discover')`;
    return `<section class="reviewDrivers"><div class="reviewDriversHead"><div><div class="matchIntelEy" style="color:#6c54ee">What is still holding matches back</div><h3>Review drivers across your active opportunity pool.</h3><p>This separates profile-answerable uncertainty from provider and route-specific evidence, so we do not keep adding fields that will not improve matching.</p></div><div class="reviewDriversMeta"><span>${n} active routes</span><span>${d.reviewOpps} need review</span><span>${d.totalChecks} hard checks unresolved</span></div></div><div class="reviewDriverGrid"><div class="driverList">${rows}</div><aside class="nextSignalCard"><div class="ey">Next best move</div><h4>${esc(rec.title)}</h4><p>${esc(rec.body)}</p><button onclick="${action}">${esc(rec.action)} ↗</button></aside></div><div class="activeScopeNote">Match distribution above includes the full 100-record database; this driver analysis focuses only on currently active routes so the next action stays practical.</div></section>`;
  }
  function mount(){
    const dash=document.querySelector('#dashboard .dashPremium');if(!dash)return;
    dash.querySelectorAll('.reviewDrivers').forEach(el=>el.remove());
    const precision=dash.querySelector('.matchIntel .precisionNext');
    if(precision)precision.insertAdjacentHTML('afterend',markup());
    else{const intel=dash.querySelector('.matchIntel');if(intel)intel.insertAdjacentHTML('afterend',markup())}
  }
  const previousDashboard=renderDashboard;
  renderDashboard=function(){previousDashboard();mount()};window.renderDashboard=renderDashboard;
  const prevSet=window.setView;if(typeof prevSet==='function'){const wrapped=function(v,...args){const r=prevSet(v,...args);if(v==='dashboard')setTimeout(mount,0);return r};try{setView=wrapped}catch{}window.setView=wrapped;document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrapped(b.dataset.v)})}
  try{if(!document.getElementById('dashboard')?.classList.contains('hide'))mount()}catch(e){console.warn('Review driver mount skipped',e)}
})();
