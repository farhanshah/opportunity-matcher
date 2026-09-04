(()=>{
  let queued=false,observer=null,observed=null;
  const escV=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const relative=n=>n===null?'':n<0?`${Math.abs(n)}d overdue`:n===0?'Due today':n===1?'Due tomorrow':`In ${n} days`;

  function rows(){
    try{return window.OpportunityActionRadar?.actions?.()||[]}catch(e){console.warn('Action radar rows unavailable',e);return[]}
  }

  function markup(items){
    const overdue=items.filter(x=>x.days!==null&&x.days<0).length;
    const next7=items.filter(x=>x.days!==null&&x.days>=0&&x.days<=7).length;
    const attention=items.filter(x=>x.kind==='missing').length;
    return `<section class="applicationActionRadar" data-om-action-radar="1" data-om-radar-anchor-fix="1"><div class="actionRadarHead"><div><div class="actionRadarEy">Application action radar</div><h3>${items.length?`${items.length} application action${items.length===1?'':'s'} worth attention.`:'No scheduled application actions right now.'}</h3><p>Tracked deadlines and post-submission dates, ranked by what needs your attention first.</p></div><div class="actionRadarStats"><div class="actionRadarStat"><b>${overdue}</b><span>overdue</span></div><div class="actionRadarStat"><b>${next7}</b><span>next 7 days</span></div><div class="actionRadarStat"><b>${attention}</b><span>needs details</span></div></div></div><div class="actionRadarList">${items.length?items.slice(0,6).map(x=>`<div class="actionRadarRow" data-radar-track-id="${escV(x.id)}"><div class="actionRadarIcon">${escV(x.icon)}</div><div class="actionRadarCopy"><span>${escV(x.eyebrow)} · ${escV(x.provider)}</span><b>${escV(x.title)}</b><small>${escV(x.headline)}${x.detail?` · ${escV(x.detail)}`:''}</small></div><div class="actionRadarDue ${escV(x.urgency)}">${escV(x.days!==null?relative(x.days):x.urgencyLabel)}</div><button type="button" class="actionRadarOpen" data-radar-open="${escV(x.id)}">Open tracker ↗</button></div>`).join(''):'<div class="actionRadarEmpty">When a tracked application has a deadline, follow-up, interview or offer decision to act on, it will appear here automatically.</div>'}</div></section>`;
  }

  function findActionHub(dash){
    const direct=dash.querySelector('.omActionHub');
    if(direct)return direct;
    const headings=[...dash.querySelectorAll('h1,h2,h3,h4')];
    const h=headings.find(el=>/Turn the dashboard into a decision, not a report\.?/i.test(String(el.textContent||'').trim()));
    if(!h)return null;
    let node=h;
    while(node&&node.parentElement!==dash){
      if(node.matches?.('section,.dashPanel,.card,.panel'))return node;
      node=node.parentElement;
    }
    return node||h.parentElement;
  }

  function mount(){
    queued=false;
    const dash=document.getElementById('dashboard');
    if(!dash||dash.classList.contains('hide'))return;
    const anchor=findActionHub(dash);
    if(!anchor||!anchor.parentNode)return;
    const items=rows();
    const sig=items.map(x=>[x.id,x.type,x.days,x.headline,x.detail].join(':')).join('|');
    let panel=dash.querySelector('.applicationActionRadar');
    const needsRender=!panel||panel.dataset.radarSig!==sig||!panel.dataset.omRadarAnchorFix;
    if(needsRender){
      const html=markup(items);
      if(panel){panel.outerHTML=html;panel=dash.querySelector('.applicationActionRadar')}
      else{anchor.insertAdjacentHTML('beforebegin',html);panel=anchor.previousElementSibling}
    }
    if(!panel)return;
    panel.dataset.radarSig=sig;
    panel.dataset.omRadarAnchorFix='1';
    if(panel.nextElementSibling!==anchor)anchor.parentNode.insertBefore(panel,anchor);
  }

  function schedule(){
    if(queued)return;
    queued=true;
    queueMicrotask(()=>requestAnimationFrame(mount));
  }

  function bind(){
    const dash=document.getElementById('dashboard');
    if(!dash)return;
    if(dash!==observed){
      observer?.disconnect();
      observed=dash;
      observer=new MutationObserver(records=>{
        if(records.some(r=>r.type==='childList'&&(r.addedNodes.length||r.removedNodes.length)&&!r.target?.closest?.('.applicationActionRadar')))schedule();
      });
      observer.observe(dash,{childList:true,subtree:true});
    }
    schedule();
  }

  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'&&!oldRender.__omRadarAnchorV131){
    const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};
    wrapped.__omRadarAnchorV131=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const oldSet=window.setView;
  if(typeof oldSet==='function'&&!oldSet.__omRadarAnchorV131){
    const wrapped=(v,...args)=>{const out=oldSet(v,...args);if(v==='dashboard')schedule();return out};
    wrapped.__omRadarAnchorV131=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrapped(b.dataset.v)});
  }

  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))schedule()},true);
  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',()=>{bind();schedule()});
  window.addEventListener('opportunity:cloudsynced',schedule);
  window.addEventListener('load',bind,{once:true});
  queueMicrotask(bind);
  window.OpportunityActionRadarAnchor={refresh:()=>{bind();schedule()}};
})();
