(()=>{
  const escV=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let queued=false,observer=null,observed=null;

  function relative(n){
    if(n===null||n===undefined||Number.isNaN(Number(n)))return'';
    n=Number(n);
    if(n<0)return`${Math.abs(n)}d overdue`;
    if(n===0)return'Due today';
    if(n===1)return'Due tomorrow';
    return`In ${n} days`;
  }

  function rows(){
    try{
      const fn=window.OpportunityActionRadar?.actions;
      if(typeof fn!=='function')return[];
      const value=fn();
      return Array.isArray(value)?value:[];
    }catch(e){console.warn('Action radar rows unavailable',e);return[]}
  }

  function markup(items){
    const overdue=items.filter(x=>x.days!==null&&x.days!==undefined&&Number(x.days)<0).length;
    const next7=items.filter(x=>x.days!==null&&x.days!==undefined&&Number(x.days)>=0&&Number(x.days)<=7).length;
    const attention=items.filter(x=>x.kind==='missing').length;
    const body=items.length?items.slice(0,6).map(x=>`<div class="actionRadarRow" data-radar-track-id="${escV(x.id)}"><div class="actionRadarIcon">${escV(x.icon||'•')}</div><div class="actionRadarCopy"><span>${escV(x.eyebrow||'Application action')} · ${escV(x.provider||'Tracked application')}</span><b>${escV(x.title||'Application')}</b><small>${escV(x.headline||'Needs attention')}${x.detail?` · ${escV(x.detail)}`:''}</small></div><div class="actionRadarDue ${escV(x.urgency||'open')}">${escV(x.days!==null&&x.days!==undefined?relative(x.days):(x.urgencyLabel||'Open action'))}</div><button type="button" class="actionRadarOpen" data-radar-open="${escV(x.id)}">Open tracker ↗</button></div>`).join(''):'<div class="actionRadarEmpty">When a tracked application has a deadline, follow-up, interview or offer decision to act on, it will appear here automatically.</div>';
    return `<section class="applicationActionRadar" data-om-action-radar="stable-parent"><div class="actionRadarHead"><div><div class="actionRadarEy">Application action radar</div><h3>${items.length?`${items.length} application action${items.length===1?'':'s'} worth attention.`:'No scheduled application actions right now.'}</h3><p>Tracked deadlines and post-submission dates, ranked by what needs your attention first.</p></div><div class="actionRadarStats"><div class="actionRadarStat"><b>${overdue}</b><span>overdue</span></div><div class="actionRadarStat"><b>${next7}</b><span>next 7 days</span></div><div class="actionRadarStat"><b>${attention}</b><span>needs details</span></div></div></div><div class="actionRadarList">${body}</div></section>`;
  }

  function mount(){
    queued=false;
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return;
    const intel=dashboard.querySelector('.matchIntel');
    const parent=intel?.parentElement;
    if(!intel||!parent)return;

    const items=rows();
    const sig=items.map(x=>[x.id,x.type,x.days,x.headline,x.detail].join(':')).join('|');
    const panels=[...dashboard.querySelectorAll('.applicationActionRadar')];
    let panel=panels[0]||null;
    panels.slice(1).forEach(x=>x.remove());

    if(!panel){
      intel.insertAdjacentHTML('afterend',markup(items));
      panel=intel.nextElementSibling;
    }else{
      if(panel.parentElement!==parent||panel.previousElementSibling!==intel){
        intel.insertAdjacentElement('afterend',panel);
      }
      if(panel.dataset.radarSig!==sig){
        const fresh=document.createElement('div');
        fresh.innerHTML=markup(items);
        const replacement=fresh.firstElementChild;
        if(replacement){
          panel.replaceWith(replacement);
          panel=replacement;
        }
      }
    }

    if(!panel)return;
    panel.dataset.radarSig=sig;
    document.documentElement.dataset.omRadarMounted='1';
  }

  function schedule(){
    if(queued)return;
    queued=true;
    queueMicrotask(mount);
  }

  function bind(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return;
    if(dashboard!==observed){
      observer?.disconnect();
      observed=dashboard;
      observer=new MutationObserver(records=>{
        const meaningful=records.some(r=>{
          if(r.type!=='childList'||(!r.addedNodes.length&&!r.removedNodes.length))return false;
          const target=r.target?.nodeType===1?r.target:null;
          return !target?.closest?.('.applicationActionRadar');
        });
        if(meaningful)schedule();
      });
      observer.observe(dashboard,{childList:true,subtree:true});
    }
    schedule();
  }

  const priorRender=window.renderDashboard;
  if(typeof priorRender==='function'&&!priorRender.__omRadarStableParentV132){
    const wrapped=(...args)=>{const out=priorRender(...args);queueMicrotask(bind);return out};
    wrapped.__omRadarStableParentV132=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const priorSet=window.setView;
  if(typeof priorSet==='function'&&!priorSet.__omRadarStableParentV132){
    const wrapped=(v,...args)=>{const out=priorSet(v,...args);if(v==='dashboard')queueMicrotask(bind);return out};
    wrapped.__omRadarStableParentV132=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrapped(b.dataset.v)});
  }

  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',()=>{bind();schedule()});
  window.addEventListener('opportunity:cloudsynced',schedule);
  window.addEventListener('opportunity:verifiedfeedchange',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))queueMicrotask(bind)},true);
  window.addEventListener('load',bind,{once:true});
  queueMicrotask(bind);
  window.OpportunityActionRadarDirectMount={refresh:()=>{bind();schedule()}};
})();
