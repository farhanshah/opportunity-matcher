(()=>{
  const PANEL_SELECTOR='.applicationActionRadar[data-om-action-radar="v202"]';
  const STYLE_ID='om-action-radar-style-v202';
  let observer=null;
  let queued=false;

  const escV=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const todayKey=()=>{const d=new Date(),off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10)};
  const dayDiff=date=>{if(!date)return null;const a=new Date(`${todayKey()}T12:00:00`),b=new Date(`${date}T12:00:00`);return Number.isFinite(b.getTime())?Math.round((b-a)/864e5):null};
  const pretty=date=>{if(!date)return'';const d=new Date(`${date}T12:00:00`);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):date};
  const relative=n=>n==null?'':n<0?`${Math.abs(n)}d overdue`:n===0?'Due today':n===1?'Due tomorrow':`In ${n} days`;

  function trackStore(){
    try{if(typeof tracks==='object'&&tracks)return tracks}catch{}
    return window.tracks||window.OpportunityState?.getTracks?.()||{};
  }
  function oppStore(){try{return Array.isArray(opps)?opps:[]}catch{return[]}}
  function oppFor(id){return oppStore().find(o=>String(o?.Opportunity_ID)===String(id))||null}
  function titleFor(id,t,o){
    const x=t?.exactVacancy||{};
    return x.title||x.Opportunity_Name||o?.Opportunity_Name||t?.opportunityName||t?.title||t?.name||'Tracked application';
  }
  function providerFor(t,o){
    const x=t?.exactVacancy||{};
    return x.provider||x.Provider||o?.Provider||t?.provider||t?.Provider||'Tracked application';
  }
  function providerDays(o){
    if(!o)return null;
    try{const n=typeof days==='function'?Number(days(o)):NaN;return Number.isFinite(n)?n:null}catch{return null}
  }
  function providerDeadlineLabel(o,d){
    if(!o&&d==null)return'';
    try{
      const raw=typeof deadline==='function'&&o?String(deadline(o)||''):'';
      if(raw&&!/^\d+\s+days?\s+left$/i.test(raw))return raw;
    }catch{}
    if(d==null)return'';
    if(d<0)return`Provider deadline passed ${Math.abs(d)}d ago`;
    if(d===0)return'Provider deadline today';
    return`Provider deadline in ${d}d`;
  }
  function urgency(n,kind='dated'){
    if(kind==='missing')return{cls:'attention',rank:1.5,label:'Needs details'};
    if(n==null)return{cls:'open',rank:3,label:'Open action'};
    if(n<0)return{cls:'overdue',rank:0,label:'Overdue'};
    if(n===0)return{cls:'today',rank:.2,label:'Today'};
    if(n<=7)return{cls:'soon',rank:1,label:'Next 7 days'};
    return{cls:'open',rank:2,label:'Upcoming'};
  }
  function item(base){const u=urgency(base.days,base.kind);return{...base,urgency:u.cls,urgencyLabel:u.label,sortRank:u.rank}}

  function actions(){
    const out=[];
    const activePre=new Set(['Saved','Researching','Preparing documents','Drafting','Ready to submit']);
    Object.entries(trackStore()).forEach(([id,t])=>{
      const stage=String(t?.stage||'Saved');
      const o=oppFor(id),title=titleFor(id,t,o),provider=providerFor(t,o),life=t?.checklist?.lifecycle||{};

      if(stage==='Submitted'){
        const date=life.followUp?.date||'';
        if(date){const n=dayDiff(date);out.push(item({id,title,provider,stage,type:'followup',icon:'↻',eyebrow:'Follow-up',headline:n!=null&&n<0?'Follow-up is overdue':'Provider follow-up',detail:`Planned ${pretty(date)}${life.followUp?.contact?` · ${life.followUp.contact}`:''}`,days:n,kind:'dated'}))}
        return;
      }
      if(stage==='Interview'){
        const date=life.interview?.date||'';
        if(date){const n=dayDiff(date);out.push(item({id,title,provider,stage,type:'interview',icon:'◫',eyebrow:'Interview',headline:n===0?'Interview is today':'Interview scheduled',detail:`${pretty(date)}${life.interview?.time?` · ${life.interview.time}`:''}${life.interview?.format?` · ${life.interview.format}`:''}`,days:n,kind:'dated'}))}
        else out.push(item({id,title,provider,stage,type:'interview',icon:'◫',eyebrow:'Interview',headline:'Add interview logistics',detail:'Interview stage is active but no interview date is recorded yet.',days:null,kind:'missing'}));
        return;
      }
      if(stage==='Offer received'){
        const date=life.offer?.responseDeadline||'';
        if(date){const n=dayDiff(date);out.push(item({id,title,provider,stage,type:'offer',icon:'◇',eyebrow:'Offer decision',headline:n!=null&&n<0?'Offer response is overdue':'Offer response deadline',detail:`Respond by ${pretty(date)}`,days:n,kind:'dated'}))}
        else out.push(item({id,title,provider,stage,type:'offer',icon:'◇',eyebrow:'Offer decision',headline:'Add the response deadline',detail:'An offer is recorded but no response deadline is saved.',days:null,kind:'missing'}));
        return;
      }
      if(stage==='Unsuccessful'||!activePre.has(stage))return;

      const d=providerDays(o);
      let ready=stage==='Ready to submit';
      try{ready=ready||Boolean(window.OpportunityStudioTruth?.getState?.(t)?.finalReady)}catch{}
      if(d!=null&&d<=45){
        out.push(item({id,title,provider,stage,type:'deadline',icon:ready?'↗':'◷',eyebrow:ready?'Ready to submit':'Provider deadline',headline:ready?'Application pack is ready':stage==='Saved'?'Preparation has not started':'Finish preparation before the deadline',detail:providerDeadlineLabel(o,d),days:d,kind:'dated'}));
      }else if(ready){
        out.push(item({id,title,provider,stage,type:'ready',icon:'↗',eyebrow:'Ready to submit',headline:'Application pack is ready',detail:providerDeadlineLabel(o,d)||'Open the provider site when you are ready to submit.',days:d,kind:d==null?'open':'dated'}));
      }
    });
    return out.sort((a,b)=>a.sortRank-b.sortRank||((a.days??99999)-(b.days??99999))||String(a.title).localeCompare(String(b.title)));
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #dashboard .applicationActionRadar[data-om-action-radar="v202"]{margin-top:18px;width:100%;max-width:none;box-sizing:border-box;border:1px solid rgba(151,164,190,.16);border-radius:22px;background:linear-gradient(135deg,#121c2b,#171a38 72%,#25204a);padding:22px;color:#f7f9fd;overflow:hidden;position:relative;grid-column:1/-1;justify-self:stretch}
      #dashboard .applicationActionRadar[data-om-action-radar="v202"]:after{content:"";position:absolute;width:260px;height:260px;border:28px solid rgba(125,93,255,.12);border-radius:50%;right:-145px;top:-155px;pointer-events:none}
      #dashboard .applicationActionRadar .actionRadarHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;position:relative;z-index:1}
      #dashboard .applicationActionRadar .actionRadarEy{font-size:8px;letter-spacing:.15em;text-transform:uppercase;font-weight:900;color:#ad96ff}
      #dashboard .applicationActionRadar .actionRadarHead h3{margin:5px 0 4px;font-size:20px;line-height:1.12}
      #dashboard .applicationActionRadar .actionRadarHead p{margin:0;color:#98a4b7;font-size:10px;line-height:1.5}
      #dashboard .applicationActionRadar .actionRadarStats{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      #dashboard .applicationActionRadar .actionRadarStat{min-width:76px;border:1px solid rgba(157,171,198,.2);background:rgba(8,15,27,.28);border-radius:12px;padding:9px 11px}
      #dashboard .applicationActionRadar .actionRadarStat b{display:block;font-size:17px}
      #dashboard .applicationActionRadar .actionRadarStat span{font-size:7px;text-transform:uppercase;letter-spacing:.08em;color:#8e9bb0;font-weight:800}
      #dashboard .applicationActionRadar .actionRadarList{display:grid;gap:9px;margin-top:16px;position:relative;z-index:1}
      #dashboard .applicationActionRadar .actionRadarRow{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;gap:11px;align-items:center;border:1px solid rgba(157,171,198,.16);background:rgba(8,15,27,.34);border-radius:14px;padding:11px 12px}
      #dashboard .applicationActionRadar .actionRadarIcon{width:32px;height:32px;border-radius:10px;border:1px solid rgba(151,164,190,.2);display:grid;place-items:center;font-weight:900;color:#c9ff55;background:rgba(200,255,80,.045)}
      #dashboard .applicationActionRadar .actionRadarCopy{min-width:0}
      #dashboard .applicationActionRadar .actionRadarCopy span{display:block;font-size:7px;letter-spacing:.09em;text-transform:uppercase;font-weight:900;color:#8794a8}
      #dashboard .applicationActionRadar .actionRadarCopy b{display:block;font-size:11px;line-height:1.3;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #dashboard .applicationActionRadar .actionRadarCopy small{display:block;margin-top:3px;color:#8f9caf;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #dashboard .applicationActionRadar .actionRadarDue{font-size:8px;font-weight:900;border-radius:999px;padding:7px 9px;white-space:nowrap;border:1px solid rgba(151,164,190,.2);color:#b7c1d0}
      #dashboard .applicationActionRadar .actionRadarDue.overdue{color:#ff8f9a;border-color:rgba(255,104,120,.36);background:rgba(255,104,120,.07)}
      #dashboard .applicationActionRadar .actionRadarDue.today,#dashboard .applicationActionRadar .actionRadarDue.soon{color:#ffd36d;border-color:rgba(255,190,72,.34);background:rgba(255,190,72,.07)}
      #dashboard .applicationActionRadar .actionRadarDue.attention{color:#d1bcff;border-color:rgba(140,108,255,.35);background:rgba(140,108,255,.08)}
      #dashboard .applicationActionRadar .actionRadarOpen{border:1px solid rgba(151,164,190,.25);background:#0b121d;color:#f7f9fd;border-radius:10px;padding:8px 10px;font-size:8px;font-weight:900;cursor:pointer;white-space:nowrap}
      #dashboard .applicationActionRadar .actionRadarOpen:hover{transform:translateY(-1px);border-color:rgba(200,255,80,.42)}
      #dashboard .applicationActionRadar .actionRadarEmpty{border:1px dashed rgba(151,164,190,.24);border-radius:14px;padding:18px;text-align:center;color:#8f9caf;font-size:10px}
      html[data-om-theme="light"] #dashboard .applicationActionRadar[data-om-action-radar="v202"]{background:linear-gradient(135deg,#fff,#f7f5ff 72%,#f0edff);color:#111827;border-color:#dedfe6;box-shadow:0 12px 32px rgba(20,25,38,.06)}
      html[data-om-theme="light"] #dashboard .applicationActionRadar .actionRadarHead p{color:#697386}
      html[data-om-theme="light"] #dashboard .applicationActionRadar .actionRadarStat{background:rgba(255,255,255,.72);border-color:#dedfe6}
      html[data-om-theme="light"] #dashboard .applicationActionRadar .actionRadarRow{background:rgba(255,255,255,.76);border-color:#e0e2e8}
      html[data-om-theme="light"] #dashboard .applicationActionRadar .actionRadarOpen{background:#111827;color:#fff;border-color:#111827}
      #tracker .omRadarFocus{box-shadow:0 0 0 2px rgba(200,255,80,.58),0 0 0 7px rgba(200,255,80,.08)!important;transition:box-shadow .25s ease}
      @media(max-width:820px){#dashboard .applicationActionRadar .actionRadarHead{display:grid}#dashboard .applicationActionRadar .actionRadarStats{justify-content:flex-start}#dashboard .applicationActionRadar .actionRadarRow{grid-template-columns:34px minmax(0,1fr) auto}#dashboard .applicationActionRadar .actionRadarOpen{grid-column:2/-1;width:max-content}}
    `;
    document.head.appendChild(style);
  }

  function markup(rows){
    const overdue=rows.filter(x=>x.days!=null&&Number(x.days)<0).length;
    const next7=rows.filter(x=>x.days!=null&&Number(x.days)>=0&&Number(x.days)<=7).length;
    const attention=rows.filter(x=>x.kind==='missing').length;
    const body=rows.length?rows.slice(0,6).map(x=>`<div class="actionRadarRow" data-radar-track-id="${escV(x.id)}"><div class="actionRadarIcon">${escV(x.icon||'•')}</div><div class="actionRadarCopy"><span>${escV(x.eyebrow||'Application action')} · ${escV(x.provider||'Tracked application')}</span><b>${escV(x.title||'Tracked application')}</b><small>${escV(x.headline||'Needs attention')}${x.detail?` · ${escV(x.detail)}`:''}</small></div><div class="actionRadarDue ${escV(x.urgency||'open')}">${escV(x.days!=null?relative(Number(x.days)):(x.urgencyLabel||'Open action'))}</div><button type="button" class="actionRadarOpen" data-radar-open="${escV(x.id)}">Open tracker ↗</button></div>`).join(''):'<div class="actionRadarEmpty">When a tracked application has a deadline, follow-up, interview or offer decision to act on, it will appear here automatically.</div>';
    return `<section class="applicationActionRadar" data-om-action-radar="v202"><div class="actionRadarHead"><div><div class="actionRadarEy">Application action radar</div><h3>${rows.length?`${rows.length} application action${rows.length===1?'':'s'} worth attention.`:'No scheduled application actions right now.'}</h3><p>Tracked deadlines and post-submission dates, ranked by what needs your attention first.</p></div><div class="actionRadarStats"><div class="actionRadarStat"><b>${overdue}</b><span>overdue</span></div><div class="actionRadarStat"><b>${next7}</b><span>next 7 days</span></div><div class="actionRadarStat"><b>${attention}</b><span>needs details</span></div></div></div><div class="actionRadarList">${body}</div></section>`;
  }

  function mount(){
    queued=false;
    const dashboard=document.getElementById('dashboard');
    const anchor=dashboard?.querySelector('.matchIntel');
    if(!dashboard||!anchor||!anchor.parentElement)return false;
    ensureStyle();

    const rows=actions();
    const sig=rows.map(x=>[x.id,x.type,x.days,x.headline,x.detail,x.title,x.provider].join(':')).join('|');
    let panel=dashboard.querySelector(PANEL_SELECTOR);

    dashboard.querySelectorAll('.applicationActionRadar').forEach(el=>{if(el!==panel)el.remove()});

    if(!panel){
      const holder=document.createElement('div');
      holder.innerHTML=markup(rows);
      panel=holder.firstElementChild;
      if(panel)anchor.insertAdjacentElement('afterend',panel);
    }else if(panel.dataset.radarSig!==sig){
      const holder=document.createElement('div');
      holder.innerHTML=markup(rows);
      const replacement=holder.firstElementChild;
      if(replacement){panel.replaceWith(replacement);panel=replacement}
    }

    if(!panel)return false;
    if(panel.parentElement!==anchor.parentElement||panel.previousElementSibling!==anchor){
      anchor.insertAdjacentElement('afterend',panel);
    }
    panel.dataset.radarSig=sig;
    document.documentElement.dataset.omRadarMounted='v202';
    document.documentElement.dataset.omRadarOwner='single-owner';
    return true;
  }

  function schedule(){
    if(queued)return;
    queued=true;
    queueMicrotask(()=>requestAnimationFrame(()=>{
      if(!mount())requestAnimationFrame(mount);
    }));
  }

  function bindObserver(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard||observer)return;
    observer=new MutationObserver(records=>{
      const meaningful=records.some(r=>{
        if(r.type!=='childList'||(!r.addedNodes.length&&!r.removedNodes.length))return false;
        const nodes=[...r.addedNodes,...r.removedNodes].filter(n=>n.nodeType===1);
        if(!nodes.length)return false;
        return nodes.some(n=>!n.matches?.('.applicationActionRadar')&&!n.closest?.('.applicationActionRadar'));
      });
      if(meaningful)schedule();
    });
    observer.observe(dashboard,{childList:true,subtree:true});
  }

  function openTrack(id){
    try{setView('tracker')}catch{}
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const t=trackStore()?.[id],o=oppFor(id),title=titleFor(id,t,o);
      const cards=[...document.querySelectorAll('#tracker .focusCard,#tracker [data-exact-track-id],#tracker [data-track-id]')];
      const card=cards.find(el=>String(el.dataset?.exactTrackId||el.dataset?.trackId||'')===String(id))||cards.find(el=>String(el.textContent||'').includes(title));
      if(!card)return;
      try{card.scrollIntoView({behavior:'smooth',block:'center'})}catch{card.scrollIntoView()}
      card.classList.add('omRadarFocus');
      setTimeout(()=>card.classList.remove('omRadarFocus'),2200);
    }));
  }

  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'&&!oldRender.__omRadarV202){
    const wrapped=(...args)=>{const out=oldRender(...args);queueMicrotask(schedule);return out};
    wrapped.__omRadarV202=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const oldSet=window.setView;
  if(typeof oldSet==='function'&&!oldSet.__omRadarV202){
    const wrapped=(v,...args)=>{const out=oldSet(v,...args);if(v==='dashboard')queueMicrotask(schedule);return out};
    wrapped.__omRadarV202=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
  }

  document.addEventListener('click',e=>{
    const open=e.target.closest?.('[data-radar-open]');
    if(open){e.preventDefault();openTrack(open.getAttribute('data-radar-open'));return}
    if(e.target.closest?.('.navbtn[data-v="dashboard"]'))queueMicrotask(schedule);
  },true);

  ['opportunity:statechange','opportunity:hydrated','opportunity:cloudsynced','opportunity:verifiedfeedchange'].forEach(name=>window.addEventListener(name,schedule));
  window.addEventListener('load',schedule,{once:true});

  bindObserver();
  queueMicrotask(schedule);
  setTimeout(schedule,100);
  setTimeout(schedule,500);
  setTimeout(schedule,1500);

  const api={refresh:schedule,actions,open:openTrack};
  window.OpportunityActionRadar=api;
  window.OpportunityActionRadarInline={refresh:schedule};
  window.OpportunityActionRadarRescue={refresh:schedule,actions};
  window.OpportunityRadarOrder={refresh:schedule};
  window.OpportunityRadarHostGuard={refresh:schedule};
})();
