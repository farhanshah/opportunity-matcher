(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function actionable(o){
    if(!o)return false;
    if(norm(o.Status)==='closed')return false;
    let label='';
    try{label=norm(typeof deadline==='function'?deadline(o):'')}catch{}
    if(/\b(?:local cycle closed|cycle closed|closed|deadline passed|expired)\b/.test(label))return false;
    try{
      const d=typeof days==='function'?days(o):99999;
      if(Number.isFinite(d)&&d<0)return false;
    }catch{}
    return true;
  }

  function candidates(){
    try{
      return (opps||[])
        .filter(actionable)
        .map(o=>({o,ev:evaluate(o)}))
        .filter(x=>x.ev?.cls!=='ineligible')
        .sort((a,b)=>(b.ev?.rank||0)-(a.ev?.rank||0)||(b.ev?.relevance||0)-(a.ev?.relevance||0)||((typeof days==='function'?days(a.o):99999)-(typeof days==='function'?days(b.o):99999)))
        .slice(0,4);
    }catch{return[]}
  }

  function markup(rows){
    if(!rows.length)return '<div class="empty">No currently actionable priority routes.</div>';
    return rows.map(({o,ev})=>`<article class="priorityCard" onclick="openDetail('${safe(o.Opportunity_ID)}')"><div class="priorityTop"><div class="priorityLogo">${safe(typeof logoLetter==='function'?logoLetter(o):'O')}</div><span class="priorityMatch">${safe(ev?.label||'Review')}</span></div><h4>${safe(o.Opportunity_Name)}</h4><p>${safe(o.Provider)}</p><div class="priorityFoot"><span>${safe(o.Destination||'Global')}</span><b>${safe(typeof deadline==='function'?deadline(o):(o.Status||'Status varies'))}</b></div></article>`).join('');
  }

  function refresh(){
    const dash=document.getElementById('dashboard');
    if(!dash||dash.classList.contains('hide'))return;
    const panels=[...dash.querySelectorAll('.dashPanel')];
    const panel=panels.find(p=>norm(p.querySelector('.dashPanelHead h3')?.textContent)==='priority opportunities');
    const grid=panel?.querySelector('.priorityGrid');
    if(!grid)return;
    const rows=candidates();
    const sig=rows.map(x=>`${x.o.Opportunity_ID}:${x.ev?.label||''}:${typeof deadline==='function'?deadline(x.o):''}`).join('|');
    if(grid.dataset.omActionablePrioritySig===sig)return;
    grid.innerHTML=markup(rows);
    grid.dataset.omActionablePrioritySig=sig;
  }

  function schedule(){queueMicrotask(refresh)}

  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'&&!oldRender.__omActionablePriority){
    const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};
    wrapped.__omActionablePriority=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const oldSet=window.setView;
  if(typeof oldSet==='function'&&!oldSet.__omActionablePriority){
    const wrapped=(v,...args)=>{const out=oldSet(v,...args);if(v==='dashboard')schedule();return out};
    wrapped.__omActionablePriority=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrapped(b.dataset.v)});
  }

  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  window.addEventListener('opportunity:verifiedfeedchange',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))schedule()},true);
  schedule();
  window.OpportunityActionablePriority={refresh:schedule};
})();
