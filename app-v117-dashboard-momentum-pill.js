(()=>{
  let scheduled=false;
  const phrases=/not started yet|complete one preparation task to build momentum|momentum building|in progress|pipeline active/i;

  function metrics(){
    try{return window.OpportunityDashboardMomentum?.metrics?.()||null}catch{return null}
  }

  function copy(m){
    if(!m)return'';
    if(Number(m.submitted||0)>0)return `Application pipeline active — ${m.submitted} submitted or beyond.`;
    if(Number(m.ready||0)>0)return `Momentum building — ${m.ready} application pack${m.ready===1?'':'s'} ready to submit.`;
    if(Number(m.momentum||0)>0)return 'In progress — keep moving one application forward.';
    return 'Not started yet — complete one preparation task to build momentum.';
  }

  function patch(){
    scheduled=false;
    const box=document.querySelector('#dashboard .momentum');
    if(!box)return;
    const text=copy(metrics());
    if(!text)return;
    const candidates=[...box.querySelectorAll('*')].filter(el=>phrases.test(String(el.textContent||'').trim()));
    if(!candidates.length)return;
    candidates.sort((a,b)=>String(a.textContent||'').length-String(b.textContent||'').length);
    const target=candidates[0];
    if(target&&target.textContent!==text)target.textContent=text;
  }

  function schedule(){
    if(scheduled)return;scheduled=true;
    queueMicrotask(()=>{patch();requestAnimationFrame(patch)});
  }

  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'&&!oldRender.__omMomentumPillV117){
    const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};
    wrapped.__omMomentumPillV117=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const oldSet=window.setView;
  if(typeof oldSet==='function'&&!oldSet.__omMomentumPillV117){
    const wrapped=(v,...args)=>{const out=oldSet(v,...args);if(v==='dashboard')schedule();return out};
    wrapped.__omMomentumPillV117=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrapped(b.dataset.v)});
  }

  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  window.addEventListener('focus',()=>{if(!document.getElementById('dashboard')?.classList.contains('hide'))schedule()});
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))schedule()},true);
  schedule();
})();
