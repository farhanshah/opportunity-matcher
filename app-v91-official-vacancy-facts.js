(()=>{
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const cache=new Map(),loading=new Set();

  const style=document.createElement('style');style.textContent=`
    .prepOfficialFacts{grid-column:1/-1;background:#fff;border:1px solid #dfe5eb;border-radius:15px;padding:13px 14px;display:grid;gap:10px}
    .prepOfficialFactsHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.prepOfficialFactsHead b{display:block;font-size:10px;color:#171d27}.prepOfficialFactsHead p{margin:3px 0 0;font-size:7.5px;line-height:1.45;color:#7f8792}.prepOfficialBadge{padding:5px 7px;border-radius:999px;background:#eef9e5;border:1px solid #d9eabf;color:#45642b;font-size:6.5px;font-weight:900;white-space:nowrap}
    .prepOfficialGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.prepOfficialCell{padding:9px;border:1px solid #e6e9ee;border-radius:10px;background:#fafbfc;min-width:0}.prepOfficialCell span{display:block;font-size:6.2px;text-transform:uppercase;letter-spacing:.08em;color:#959ca7}.prepOfficialCell b{display:block;margin-top:3px;font-size:8px;line-height:1.35;color:#242a34;overflow-wrap:anywhere}.prepOfficialCell.desired b{color:#6b7280}.prepOfficialNote{font-size:7px;line-height:1.45;color:#707783;padding:8px 9px;border-radius:9px;background:#f6f8f2;border:1px solid #e5eadb}
    @media(max-width:850px){.prepOfficialGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.prepOfficialGrid{grid-template-columns:1fr}.prepOfficialFactsHead{flex-direction:column}}
  `;document.head.appendChild(style);

  function rowFromShell(shell=document.getElementById('prepShell')){
    const href=shell?.querySelector('a.prepBtn.official')?.href;if(!href||typeof tracks!=='object'||!tracks)return null;
    const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);return entry?{id:entry[0],t:entry[1],m:entry[1].exactVacancy}:null
  }
  function jobId(url){try{const u=new URL(String(url||''));if(!/oraclecloud\.com$/i.test(u.hostname))return'';const m=u.pathname.match(/\/job\/(\d+)/i);return m?m[1]:''}catch{return''}}
  function persist(row){try{persist?.()}catch{};try{window.OpportunityExactTrackDurability?.save?.()}catch{};try{window.dispatchEvent(new CustomEvent('opportunity:statechange'))}catch{}}
  function fmtFacts(f={}){return[
    ['Apply before',f.apply_before||'Check official posting'],
    ['Schedule',f.job_schedule||'Not extracted'],
    ['Work mode / locations',f.locations||'See official posting'],
    ['Duration',f.contract_duration||'Not extracted'],
    ['Minimum education',f.education_work_experience||'See detailed eligibility'],
    ['Required language',f.required_languages||'See official posting'],
    ['Desired language',f.desired_languages||'None stated','desired'],
    ['Vacancy type',f.vacancy_type||'Internship'],
    ['Agency / bureau',[f.agency,f.bureau].filter(Boolean).join(' · ')||'UNDP']
  ]}
  function annotateChecklist(shell,f){
    const elig=shell.querySelector('[data-prep-key="eligibilityReviewed"]')?.closest('.prepCheck');if(elig){const d=elig.querySelector('span');if(d)d.textContent='Official summary facts are captured below. Review only the detailed eligibility conditions that are not contained in the summary block.'}
    const lang=shell.querySelector('[data-prep-key="languageChecked"]')?.closest('.prepCheck');if(lang&&f.required_languages){const b=lang.querySelector('b'),d=lang.querySelector('span');if(b)b.textContent=`Required language: ${f.required_languages} (source-confirmed)`;if(d)d.textContent=`Official vacancy confirms ${f.required_languages} as required${f.desired_languages?`; ${f.desired_languages} are desired only and are not treated as blockers`:''}. Check only whether the application requests separate proof.`}
    const edu=shell.querySelector('[data-prep-key="educationChecked"]')?.closest('.prepCheck');if(edu&&f.education_work_experience){const b=edu.querySelector('b'),d=edu.querySelector('span');if(b)b.textContent=`Minimum education: ${f.education_work_experience} (source-confirmed)`;if(d)d.textContent='The official summary confirms the minimum degree level. Still verify student/recent-graduate timing and accepted academic fields in the detailed eligibility section.'}
    const deadline=[...shell.querySelectorAll('.prepFact')].find(x=>x.querySelector('span')?.textContent?.trim()==='Deadline')?.querySelector('b');if(deadline&&f.apply_before)deadline.textContent=f.apply_before;
  }
  function render(shell,row,data){
    const f=data?.facts||{};if(!Object.keys(f).length)return;const body=shell.querySelector('.prepBody');if(!body)return;
    let panel=body.querySelector('.prepOfficialFacts');if(!panel){panel=document.createElement('section');panel.className='prepOfficialFacts';const cmd=body.querySelector('.prepCommand');if(cmd)cmd.insertAdjacentElement('afterend',panel);else body.insertBefore(panel,body.firstChild)}
    const sig=JSON.stringify(f);if(panel.dataset.sig!==sig){panel.dataset.sig=sig;panel.innerHTML=`<div class="prepOfficialFactsHead"><div><b>Official vacancy facts</b><p>Captured from the exact UNDP vacancy summary so users do not need to re-check facts the source already states.</p></div><span class="prepOfficialBadge">Exact official source</span></div><div class="prepOfficialGrid">${fmtFacts(f).map(([k,v,c])=>`<div class="prepOfficialCell ${c||''}"><span>${safe(k)}</span><b>${safe(v)}</b></div>`).join('')}</div><div class="prepOfficialNote">Required and desired conditions are kept separate. These summary facts do not replace detailed checks for student/recent-graduate status, accepted fields, nationality/residence rules or any other vacancy-specific condition lower on the official page.</div>`}
    annotateChecklist(shell,f)
  }
  async function load(shell,row){
    if(!row||String(row.m?.provider||'').toUpperCase()!=='UNDP')return;const id=jobId(row.m?.url);if(!id)return;
    const stored=row.t.preparation?.officialVacancyFacts;if(stored?.facts&&Date.now()-new Date(stored.fetched_at||0).getTime()<6*3600000){render(shell,row,stored);return}
    if(cache.has(id)){render(shell,row,cache.get(id));return}if(loading.has(id))return;loading.add(id);
    try{const r=await fetch(`/api/undp-vacancy-facts?job=${encodeURIComponent(id)}&ts=${Date.now()}`,{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d?.error||String(r.status));if(!d?.facts||!Object.keys(d.facts).length)return;cache.set(id,d);row.t.preparation={...(row.t.preparation||{}),officialVacancyFacts:d};persist(row);render(shell,row,d)}catch(e){console.warn('Official UNDP vacancy facts withheld',e)}finally{loading.delete(id)}
  }
  function mount(){const modal=document.getElementById('prepModal'),shell=document.getElementById('prepShell');if(!modal||modal.classList.contains('hide')||!shell)return;const row=rowFromShell(shell);if(!row)return;const stored=row.t.preparation?.officialVacancyFacts;if(stored?.facts)render(shell,row,stored);load(shell,row)}
  const obs=new MutationObserver(()=>setTimeout(mount,80));obs.observe(document.body,{subtree:true,childList:true});window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(mount,120));setInterval(mount,1600);setTimeout(mount,700);window.OpportunityOfficialVacancyFacts={refresh:mount};
})();
