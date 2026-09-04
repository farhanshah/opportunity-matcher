(()=>{
  const escV=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const source=()=>((typeof tracks==='object'&&tracks)||window.tracks||{});
  const activePre=new Set(['Saved','Researching','Preparing documents','Drafting','Ready to submit']);
  const todayKey=()=>{const d=new Date(),off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10)};
  const dayDiff=date=>{if(!date)return null;const a=new Date(`${todayKey()}T12:00:00`),b=new Date(`${date}T12:00:00`);return Number.isFinite(b.getTime())?Math.round((b-a)/864e5):null};
  const pretty=date=>{if(!date)return'';const d=new Date(`${date}T12:00:00`);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):date};
  const trackTitle=(id,t,o)=>o?.Opportunity_Name||t?.opportunityName||t?.title||t?.name||id;
  const trackProvider=(t,o)=>o?.Provider||t?.provider||t?.Provider||'Tracked application';
  const lifecycle=t=>t?.checklist?.lifecycle||{};
  const oppFor=id=>{try{return (opps||[]).find(o=>String(o?.Opportunity_ID)===String(id))||null}catch{return null}};

  function providerDays(o){
    if(!o)return null;
    try{const n=typeof days==='function'?Number(days(o)):NaN;return Number.isFinite(n)?n:null}catch{return null}
  }
  function providerDeadlineLabel(o,d){
    if(!o)return'';
    try{
      const raw=typeof deadline==='function'?String(deadline(o)||''):'';
      if(raw&&!/^\d+\s+days?\s+left$/i.test(raw))return raw;
    }catch{}
    if(d===null)return'';
    if(d<0)return`Provider deadline passed ${Math.abs(d)}d ago`;
    if(d===0)return'Provider deadline today';
    return`Provider deadline in ${d}d`;
  }
  function relative(n){
    if(n===null)return'';
    if(n<0)return`${Math.abs(n)}d overdue`;
    if(n===0)return'Due today';
    if(n===1)return'Due tomorrow';
    return`In ${n} days`;
  }
  function urgency(n,kind='dated'){
    if(kind==='missing')return{cls:'attention',label:'Needs details',rank:1.5};
    if(n===null)return{cls:'open',label:'Open action',rank:3};
    if(n<0)return{cls:'overdue',label:'Overdue',rank:0};
    if(n===0)return{cls:'today',label:'Today',rank:.2};
    if(n<=7)return{cls:'soon',label:'Next 7 days',rank:1};
    return{cls:'open',label:'Upcoming',rank:2};
  }
  function item(base){
    const u=urgency(base.days,base.kind);
    return{...base,urgency:u.cls,urgencyLabel:u.label,sortRank:u.rank};
  }

  function actions(){
    const out=[];
    Object.entries(source()).forEach(([id,t])=>{
      const stage=String(t?.stage||'Saved'),o=oppFor(id),title=trackTitle(id,t,o),provider=trackProvider(t,o),r=lifecycle(t);
      if(stage==='Submitted'){
        const date=r.followUp?.date||'';
        if(date){const n=dayDiff(date);out.push(item({id,title,provider,stage,type:'followup',icon:'↻',eyebrow:'Follow-up',headline:n!==null&&n<0?'Follow-up is overdue':'Provider follow-up',detail:`Planned ${pretty(date)}${r.followUp?.contact?` · ${r.followUp.contact}`:''}`,days:n,date,kind:'dated'}))}
        return;
      }
      if(stage==='Interview'){
        const date=r.interview?.date||'';
        if(date){const n=dayDiff(date);out.push(item({id,title,provider,stage,type:'interview',icon:'◫',eyebrow:'Interview',headline:n===0?'Interview is today':'Interview scheduled',detail:`${pretty(date)}${r.interview?.time?` · ${r.interview.time}`:''}${r.interview?.format?` · ${r.interview.format}`:''}`,days:n,date,kind:'dated'}))}
        else out.push(item({id,title,provider,stage,type:'interview',icon:'◫',eyebrow:'Interview',headline:'Add interview logistics',detail:'Interview stage is active but no interview date is recorded yet.',days:null,date:'',kind:'missing'}));
        return;
      }
      if(stage==='Offer received'){
        const date=r.offer?.responseDeadline||'';
        if(date){const n=dayDiff(date);out.push(item({id,title,provider,stage,type:'offer',icon:'◇',eyebrow:'Offer decision',headline:n!==null&&n<0?'Offer response is overdue':'Offer response deadline',detail:`Respond by ${pretty(date)}`,days:n,date,kind:'dated'}))}
        else out.push(item({id,title,provider,stage,type:'offer',icon:'◇',eyebrow:'Offer decision',headline:'Add the response deadline',detail:'An offer is recorded but no response deadline is saved.',days:null,date:'',kind:'missing'}));
        return;
      }
      if(stage==='Unsuccessful')return;
      if(activePre.has(stage)){
        const d=providerDays(o);
        const ready=stage==='Ready to submit'||Boolean(window.OpportunityStudioTruth?.getState?.(t)?.finalReady);
        if(d!==null&&d<=45){
          out.push(item({id,title,provider,stage,type:'deadline',icon:ready?'↗':'◷',eyebrow:ready?'Ready to submit':'Provider deadline',headline:ready?'Application pack is ready':stage==='Saved'?'Preparation has not started':'Finish preparation before the deadline',detail:providerDeadlineLabel(o,d),days:d,date:'',kind:'dated'}));
        }else if(ready){
          out.push(item({id,title,provider,stage,type:'ready',icon:'↗',eyebrow:'Ready to submit',headline:'Application pack is ready',detail:providerDeadlineLabel(o,d)||'Open the provider site when you are ready to submit.',days:d,date:'',kind:d===null?'open':'dated'}));
        }
      }
    });
    return out.sort((a,b)=>a.sortRank-b.sortRank||((a.days??99999)-(b.days??99999))||a.title.localeCompare(b.title));
  }

  const style=document.createElement('style');
  style.textContent=`
    #dashboard .applicationActionRadar{margin-top:18px;border:1px solid rgba(151,164,190,.16);border-radius:22px;background:linear-gradient(135deg,#121c2b,#171a38 72%,#25204a);padding:22px;color:#f7f9fd;overflow:hidden;position:relative}
    #dashboard .applicationActionRadar:after{content:"";position:absolute;width:260px;height:260px;border:28px solid rgba(125,93,255,.12);border-radius:50%;right:-145px;top:-155px;pointer-events:none}
    #dashboard .actionRadarHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;position:relative;z-index:1}.actionRadarEy{font-size:8px;letter-spacing:.15em;text-transform:uppercase;font-weight:900;color:#ad96ff}.actionRadarHead h3{margin:5px 0 4px;font-size:20px;line-height:1.12}.actionRadarHead p{margin:0;color:#98a4b7;font-size:10px;line-height:1.5}.actionRadarStats{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.actionRadarStat{min-width:76px;border:1px solid rgba(157,171,198,.2);background:rgba(8,15,27,.28);border-radius:12px;padding:9px 11px}.actionRadarStat b{display:block;font-size:17px}.actionRadarStat span{font-size:7px;text-transform:uppercase;letter-spacing:.08em;color:#8e9bb0;font-weight:800}
    #dashboard .actionRadarList{display:grid;gap:9px;margin-top:16px;position:relative;z-index:1}.actionRadarRow{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;gap:11px;align-items:center;border:1px solid rgba(157,171,198,.16);background:rgba(8,15,27,.34);border-radius:14px;padding:11px 12px}.actionRadarIcon{width:32px;height:32px;border-radius:10px;border:1px solid rgba(151,164,190,.2);display:grid;place-items:center;font-weight:900;color:#c9ff55;background:rgba(200,255,80,.045)}.actionRadarCopy{min-width:0}.actionRadarCopy span{display:block;font-size:7px;letter-spacing:.09em;text-transform:uppercase;font-weight:900;color:#8794a8}.actionRadarCopy b{display:block;font-size:11px;line-height:1.3;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.actionRadarCopy small{display:block;margin-top:3px;color:#8f9caf;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.actionRadarDue{font-size:8px;font-weight:900;border-radius:999px;padding:7px 9px;white-space:nowrap;border:1px solid rgba(151,164,190,.2);color:#b7c1d0}.actionRadarDue.overdue{color:#ff8f9a;border-color:rgba(255,104,120,.36);background:rgba(255,104,120,.07)}.actionRadarDue.today,.actionRadarDue.soon{color:#ffd36d;border-color:rgba(255,190,72,.34);background:rgba(255,190,72,.07)}.actionRadarDue.attention{color:#d1bcff;border-color:rgba(140,108,255,.35);background:rgba(140,108,255,.08)}.actionRadarOpen{border:1px solid rgba(151,164,190,.25);background:#0b121d;color:#f7f9fd;border-radius:10px;padding:8px 10px;font-size:8px;font-weight:900;cursor:pointer;white-space:nowrap}.actionRadarOpen:hover{transform:translateY(-1px);border-color:rgba(200,255,80,.42)}.actionRadarEmpty{border:1px dashed rgba(151,164,190,.24);border-radius:14px;padding:18px;text-align:center;color:#8f9caf;font-size:10px}
    html[data-om-theme="light"] #dashboard .applicationActionRadar{background:linear-gradient(135deg,#fff,#f7f5ff 72%,#f0edff);color:#111827;border-color:#dedfe6;box-shadow:0 12px 32px rgba(20,25,38,.06)}html[data-om-theme="light"] #dashboard .actionRadarHead p{color:#697386}html[data-om-theme="light"] #dashboard .actionRadarStat{background:rgba(255,255,255,.72);border-color:#dedfe6}html[data-om-theme="light"] #dashboard .actionRadarStat span{color:#727b8b}html[data-om-theme="light"] #dashboard .actionRadarRow{background:rgba(255,255,255,.76);border-color:#e0e2e8}html[data-om-theme="light"] #dashboard .actionRadarIcon{border-color:#d9dce3;color:#315c32;background:#f4fae8}html[data-om-theme="light"] #dashboard .actionRadarCopy span,html[data-om-theme="light"] #dashboard .actionRadarCopy small{color:#737d8e}html[data-om-theme="light"] #dashboard .actionRadarOpen{background:#111827;color:#fff;border-color:#111827}
    #tracker .omRadarFocus{box-shadow:0 0 0 2px rgba(200,255,80,.58),0 0 0 7px rgba(200,255,80,.08)!important;transition:box-shadow .25s ease}
    @media(max-width:820px){#dashboard .actionRadarHead{display:grid}.actionRadarStats{justify-content:flex-start}.actionRadarRow{grid-template-columns:34px minmax(0,1fr) auto}.actionRadarOpen{grid-column:2/-1;width:max-content}.actionRadarDue{align-self:start}}
  `;
  document.head.appendChild(style);

  function markup(rows){
    const overdue=rows.filter(x=>x.days!==null&&x.days<0).length;
    const next7=rows.filter(x=>x.days!==null&&x.days>=0&&x.days<=7).length;
    const attention=rows.filter(x=>x.kind==='missing').length;
    return `<section class="applicationActionRadar" data-om-action-radar="1"><div class="actionRadarHead"><div><div class="actionRadarEy">Application action radar</div><h3>${rows.length?`${rows.length} application action${rows.length===1?'':'s'} worth attention.`:'No scheduled application actions right now.'}</h3><p>Tracked deadlines and post-submission dates, ranked by what needs your attention first.</p></div><div class="actionRadarStats"><div class="actionRadarStat"><b>${overdue}</b><span>overdue</span></div><div class="actionRadarStat"><b>${next7}</b><span>next 7 days</span></div><div class="actionRadarStat"><b>${attention}</b><span>needs details</span></div></div></div><div class="actionRadarList">${rows.length?rows.slice(0,6).map(x=>`<div class="actionRadarRow" data-radar-track-id="${escV(x.id)}"><div class="actionRadarIcon">${escV(x.icon)}</div><div class="actionRadarCopy"><span>${escV(x.eyebrow)} · ${escV(x.provider)}</span><b>${escV(x.title)}</b><small>${escV(x.headline)}${x.detail?` · ${escV(x.detail)}`:''}</small></div><div class="actionRadarDue ${escV(x.urgency)}">${escV(x.days!==null?relative(x.days):x.urgencyLabel)}</div><button type="button" class="actionRadarOpen" data-radar-open="${escV(x.id)}">Open tracker ↗</button></div>`).join(''):'<div class="actionRadarEmpty">When a tracked application has a deadline, follow-up, interview or offer decision to act on, it will appear here automatically.</div>'}</div></section>`;
  }

  function mount(){
    const dash=document.querySelector('#dashboard .dashPremium');
    if(!dash)return;
    const rows=actions();
    const sig=rows.map(x=>[x.id,x.type,x.days,x.headline,x.detail].join(':')).join('|');
    let panel=dash.querySelector('.applicationActionRadar');
    if(panel?.dataset?.radarSig===sig)return;
    const html=markup(rows);
    if(panel){panel.outerHTML=html;panel=dash.querySelector('.applicationActionRadar')}
    else{
      const intel=dash.querySelector('.matchIntel');
      const hero=dash.querySelector('.dashHero');
      if(intel)intel.insertAdjacentHTML('afterend',html);
      else if(hero)hero.insertAdjacentHTML('afterend',html);
      else dash.insertAdjacentHTML('afterbegin',html);
      panel=dash.querySelector('.applicationActionRadar');
    }
    if(panel)panel.dataset.radarSig=sig;
  }

  function openTrack(id){
    try{setView('tracker')}catch{}
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const cards=[...document.querySelectorAll('#tracker .focusCard,#tracker [data-exact-track-id],#tracker [data-track-id]')];
      const t=source()[id],o=oppFor(id),title=trackTitle(id,t,o);
      const card=cards.find(el=>String(el.dataset?.exactTrackId||el.dataset?.trackId||'')===String(id))||cards.find(el=>String(el.textContent||'').includes(title));
      if(!card)return;
      try{card.scrollIntoView({behavior:'smooth',block:'center'})}catch{card.scrollIntoView()}
      card.classList.add('omRadarFocus');setTimeout(()=>card.classList.remove('omRadarFocus'),2200);
    }));
  }

  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;mount()})}
  const priorRender=window.renderDashboard;
  if(typeof priorRender==='function'&&!priorRender.__omActionRadarV129){
    const wrapped=(...args)=>{const out=priorRender(...args);schedule();return out};wrapped.__omActionRadarV129=true;
    try{renderDashboard=wrapped}catch{}window.renderDashboard=wrapped;
  }
  const priorSet=window.setView;
  if(typeof priorSet==='function'&&!priorSet.__omActionRadarV129){
    const wrapped=(v,...args)=>{const out=priorSet(v,...args);if(v==='dashboard')schedule();return out};wrapped.__omActionRadarV129=true;
    try{setView=wrapped}catch{}window.setView=wrapped;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrapped(b.dataset.v)});
  }
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-radar-open]');if(!b)return;e.preventDefault();openTrack(b.dataset.radarOpen)},true);
  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  window.addEventListener('opportunity:cloudsynced',schedule);
  queueMicrotask(schedule);
  window.OpportunityActionRadar={refresh:schedule,actions,open:openTrack};
})();