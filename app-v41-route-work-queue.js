(()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v||'').trim().toLowerCase();
  const isActive=o=>norm(o?.Status)!=='closed';
  const css=document.createElement('style');
  css.textContent=`
    .routeWorkQueue{margin-top:10px;border:1px solid rgba(20,28,45,.08);border-radius:18px;background:#fff;padding:18px}
    .routeWorkHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
    .routeWorkHead h3{margin:4px 0 4px;font-size:17px;letter-spacing:-.025em;color:#171b24}
    .routeWorkHead p{margin:0;color:#858c99;font-size:10px;line-height:1.5;max-width:690px}
    .routeWorkGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
    .routeWorkCard{border:1px solid #e8eaf0;background:#fbfcfd;border-radius:13px;padding:13px;min-height:145px;display:flex;flex-direction:column}
    .routeWorkCard.primary{background:linear-gradient(145deg,#f6f3ff,#fbfcff);border-color:#ded6ff}
    .routeWorkCard .rwTop{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .routeWorkCard .rwTop span{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#7a8190;font-weight:800}
    .routeWorkCard .rwTop b{font-size:18px;color:#171b24;letter-spacing:-.04em}
    .routeWorkCard h4{font-size:11px;color:#20252e;margin:12px 0 4px}.routeWorkCard p{font-size:8px;line-height:1.45;color:#8f96a3;margin:0}
    .rwExamples{margin-top:8px;padding-top:8px;border-top:1px solid #eceef3;font-size:7.5px;line-height:1.45;color:#5f6674}.rwExamples b{color:#343a46;font-size:7.5px;font-weight:780}
    .routeWorkCard small{margin-top:auto;padding-top:10px;color:#6f58ee;font-size:8px;font-weight:750}
    .routeWorkNext{margin-top:10px;border-radius:12px;background:#171b25;color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:16px}
    .routeWorkNext div{min-width:0}.routeWorkNext span{display:block;color:#aab1c0;font-size:8px;text-transform:uppercase;letter-spacing:.1em}.routeWorkNext b{display:block;font-size:11px;margin-top:3px}.routeWorkNext button{border:0;border-radius:9px;background:#d9ff67;color:#11150a;height:34px;padding:0 12px;font-size:9px;font-weight:850;cursor:pointer;white-space:nowrap}
    @media(max-width:1050px){.routeWorkGrid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.routeWorkGrid{grid-template-columns:1fr}.routeWorkHead,.routeWorkNext{display:grid}}
  `;
  document.head.appendChild(css);

  function bucket(check){
    const text=norm(`${check?.label||''} ${check?.detail||''} ${check?.rule_code||''}`);
    if(/vacancy|assignment|specific role|specific opening/.test(text))return{key:'vacancy',label:'Specific opening',copy:'Choose a real vacancy or assignment before this rule can be evaluated safely.'};
    if(/cycle-specific|current cycle|next current list|next official cycle|call-specific|changes each cycle/.test(text))return{key:'cycle',label:'Cycle refresh',copy:'Wait for or capture the next official call instead of guessing from an older cycle.'};
    if(/country-specific|country selector|provider route|member-country|member state|provider maintains|country group|authoritative.*list|residence-country/.test(text))return{key:'provider',label:'Provider route',copy:'Normalize the provider’s country or programme route with official evidence.'};
    return{key:'evidence',label:'Applicant evidence',copy:'A declaration, admission choice or provider-specific fact is still needed.'};
  }
  function collect(){
    const make=()=>({checks:0,opps:new Set(),names:new Map()});
    const buckets={vacancy:make(),cycle:make(),provider:make(),evidence:make()};
    for(const o of (opps||[]).filter(isActive)){
      const ev=evaluate(o);if(!['review','possible'].includes(ev.cls))continue;
      for(const c of ev.checks||[]){
        if(c.status!=='review'||c.hard===false)continue;
        const b=bucket(c),id=o.Opportunity_ID,name=o.Opportunity_Name||o.Provider||id;
        buckets[b.key].checks++;buckets[b.key].opps.add(id);if(id&&!buckets[b.key].names.has(id))buckets[b.key].names.set(id,name);
      }
    }
    return buckets;
  }
  function examples(bucket){
    const names=[...bucket.names.values()],shown=names.slice(0,2),more=Math.max(0,names.length-shown.length);
    if(!shown.length)return'';
    return `<div class="rwExamples"><b>Affected:</b> ${shown.map(esc).join(' · ')}${more?` · +${more} more`:''}</div>`;
  }
  function markup(){
    const b=collect();
    const meta={
      vacancy:{label:'Specific opening',copy:'Vacancy or assignment must be selected first.'},
      cycle:{label:'Cycle refresh',copy:'Current official call or list is still pending.'},
      provider:{label:'Provider route',copy:'Country/programme route needs deeper normalization.'},
      evidence:{label:'Applicant evidence',copy:'Admission, declaration or provider-specific evidence is needed.'}
    };
    const order=Object.keys(b).sort((a,z)=>b[z].checks-b[a].checks);
    const top=order[0];
    const next={
      vacancy:'Build the Specific Openings layer so umbrella programmes can be matched against real vacancies.',
      cycle:'Keep the freshness watch active and capture the next published cycle before changing eligibility.',
      provider:'Continue a targeted provider-route normalization sprint using official lists and country pages.',
      evidence:'Expose only the evidence questions that are actually needed on an opportunity-by-opportunity basis.'
    }[top];
    const cards=order.map((k,i)=>`<article class="routeWorkCard ${i===0?'primary':''}"><div class="rwTop"><span>${esc(meta[k].label)}</span><b>${b[k].checks}</b></div><h4>${b[k].opps.size} affected route${b[k].opps.size===1?'':'s'}</h4><p>${esc(meta[k].copy)}</p>${examples(b[k])}<small>${i===0?'highest current workload':'kept conservative'}</small></article>`).join('');
    return `<section class="routeWorkQueue"><div class="routeWorkHead"><div><div class="matchIntelEy" style="color:#6c54ee">Route work queue</div><h3>Turn uncertainty into a concrete product task.</h3><p>These buckets separate uncertainty we can solve with a specific opening, a fresh cycle, provider normalization, or applicant evidence. This keeps the matcher conservative without leaving “Needs review” as a dead end.</p></div></div><div class="routeWorkGrid">${cards}</div><div class="routeWorkNext"><div><span>Recommended next build</span><b>${esc(next)}</b></div><button onclick="setView('discover')">Review affected routes ↗</button></div></section>`;
  }
  function mount(){
    const dash=document.querySelector('#dashboard .dashPremium');if(!dash)return;
    dash.querySelectorAll('.routeWorkQueue').forEach(x=>x.remove());
    const drivers=dash.querySelector('.reviewDrivers');if(drivers){
      const note=drivers.querySelector('.activeScopeNote');
      if(note)note.textContent='Both the match distribution and this driver analysis now use the same active opportunity pool; closed records are excluded from these diagnostics.';
      drivers.insertAdjacentHTML('afterend',markup());
    }
  }
  const prev=renderDashboard;
  renderDashboard=function(){prev();mount()};window.renderDashboard=renderDashboard;
  const oldSet=window.setView;if(typeof oldSet==='function'){const wrapped=function(v,...args){const r=oldSet(v,...args);if(v==='dashboard')setTimeout(mount,0);return r};try{setView=wrapped}catch{}window.setView=wrapped;document.querySelectorAll('.navbtn[data-v]').forEach(btn=>{btn.onclick=()=>wrapped(btn.dataset.v)})}
  try{if(!document.getElementById('dashboard')?.classList.contains('hide'))mount()}catch(e){console.warn('Route work queue mount skipped',e)}
})();
