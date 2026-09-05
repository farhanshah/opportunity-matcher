(()=>{
  const OPEN_KEY='oppAdvancedDiagnosticsV129';
  const RADAR_STYLE_ID='om-product-radar-v203-style';
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const isActive=o=>String(o?.Status||'').toLowerCase()!=='closed';
  const beyond=new Set(['Submitted','Interview','Offer received','Unsuccessful']);
  const readyStages=new Set(['Ready to submit','Submitted','Interview','Offer received','Unsuccessful']);
  const activePre=new Set(['Saved','Researching','Preparing documents','Drafting','Ready to submit']);

  function diagnosticsOpen(){try{return localStorage.getItem(OPEN_KEY)==='1'}catch{return false}}
  function setDiagnostics(open){
    const dash=document.getElementById('dashboard');if(!dash)return;
    dash.classList.toggle('omDiagnosticsOpen',!!open);
    try{localStorage.setItem(OPEN_KEY,open?'1':'0')}catch{}
    const btn=dash.querySelector('.omDiagnosticsToggle');
    if(btn){
      const text=open?'Hide advanced diagnostics':'Show advanced diagnostics';
      const expanded=open?'true':'false';
      if(btn.textContent!==text)btn.textContent=text;
      if(btn.getAttribute('aria-expanded')!==expanded)btn.setAttribute('aria-expanded',expanded);
    }
  }

  function studioState(t){try{return window.OpportunityStudioTruth?.getState?.(t)||null}catch{return null}}
  function legacyChecks(t){return ['documents','statement','references'].filter(k=>t?.checklist?.[k]).length}
  function needsPreparation(t){
    const stage=String(t?.stage||'Saved');
    if(readyStages.has(stage))return false;
    const s=studioState(t);
    if(s?.sourceMode==='dedicatedPrepare')return !s.finalReady;
    return legacyChecks(t)<3;
  }
  function trackStore(){try{return (typeof tracks==='object'&&tracks)||window.tracks||{}}catch{return window.tracks||{}}}
  function oppStore(){try{return Array.isArray(opps)?opps:[]}catch{return[]}}
  function todayKey(){const d=new Date(),off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10)}
  function dayDiff(date){if(!date)return null;const a=new Date(`${todayKey()}T12:00:00`),b=new Date(`${date}T12:00:00`);return Number.isFinite(b.getTime())?Math.round((b-a)/864e5):null}
  function pretty(date){if(!date)return'';const d=new Date(`${date}T12:00:00`);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):date}
  function relative(n){return n==null?'Open action':n<0?`${Math.abs(n)}d overdue`:n===0?'Due today':n===1?'Due tomorrow':`In ${n} days`}

  function countState(){
    let active=[],strong=0,review=0;
    try{active=(opps||[]).filter(isActive)}catch{}
    try{
      for(const o of active){const e=evaluate(o);if(e?.cls==='eligible')strong++;if(['review','possible'].includes(e?.cls))review++}
    }catch{}
    let tracked=0,due=0,incomplete=0,ready=0,submitted=0;
    try{
      const byId=new Map((opps||[]).map(o=>[o.Opportunity_ID,o]));
      const entries=Object.entries(tracks||{});tracked=entries.length;
      for(const [id,t] of entries){
        const o=byId.get(id),d=o&&typeof days==='function'?days(o):99999;
        if(d>=0&&d<=14)due++;
        const stage=String(t?.stage||'Saved');
        const s=studioState(t);
        if(readyStages.has(stage)||s?.finalReady)ready++;
        if(beyond.has(stage))submitted++;
        if(needsPreparation(t))incomplete++;
      }
    }catch{}
    let live=0;
    try{live=document.querySelectorAll('#dashboard .deepV2Card').length||window.OpportunityBestLive?.status?.()?.items?.filter?.(x=>x?.status_verified===true&&x?.verification_level==='exact')?.length||0}catch{}
    return{active:active.length,strong,review,tracked,due,incomplete,ready,submitted,live};
  }

  function actionCopy(s){
    const first=s.due?{
      label:'Deadline attention',title:`${s.due} tracked application${s.due===1?'':'s'} need attention soon.`,body:'Move the nearest deadline forward before researching anything new.',action:'Open tracker',cmd:'tracker'
    }:s.incomplete?{
      label:'Application momentum',title:'Move one application forward today.',body:`${s.incomplete} tracked route${s.incomplete===1?'':'s'} still have preparation work outstanding.`,action:'Open tracker',cmd:'tracker'
    }:s.ready&&!s.submitted?{
      label:'Ready to submit',title:`${s.ready} application pack${s.ready===1?' is':'s are'} ready for the provider site.`,body:'Your preparation is complete. Submit on the official provider site, then update the Tracker.',action:'Open tracker',cmd:'tracker'
    }:{
      label:'Start here',title:'Turn one strong match into an application.',body:'Your tracker has room for a deliberate next move instead of more browsing.',action:'Review matches',cmd:'discover'
    };
    const second={label:'Best fit',title:`${s.strong} strongest known route${s.strong===1?'':'s'} clear your current rules.`,body:'These are the cleanest places to spend attention before broader possible matches.',action:'See best matches',cmd:'discover'};
    const liveLabel=s.live?`${s.live} verified opening${s.live===1?'':'s'} ranked right now.`:'Verified live openings are being ranked.';
    const third={label:'Live opportunities',title:liveLabel,body:'Current provider vacancies are checked separately from umbrella programme eligibility.',action:'See live openings',cmd:'live'};
    return[first,second,third];
  }

  function go(cmd){
    if(cmd==='tracker'||cmd==='discover'){
      if(typeof window.setView==='function')window.setView(cmd);
      return;
    }
    if(cmd==='live'){
      const target=document.querySelector('#dashboard .deepLiveV2');
      if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }

  function hubMarkup(s){
    const actions=actionCopy(s);
    return `<section class="omActionHub" aria-label="Recommended next actions"><div class="omActionHubHead"><div><div class="omActionHubEy">What to do next</div><h3>Turn the dashboard into a decision, not a report.</h3></div><p>Opportunity keeps the matcher conservative in the background. Your default view should make the next useful action obvious.</p></div><div class="omActionGrid">${actions.map(a=>`<article class="omActionCard"><span>${safe(a.label)}</span><b>${safe(a.title)}</b><p>${safe(a.body)}</p><button type="button" data-om-action="${safe(a.cmd)}">${safe(a.action)} ↗</button></article>`).join('')}</div><div class="omDiagnosticsBar"><span>Provider-route, cycle and evidence diagnostics are still available when you want to inspect how the matcher reached its conclusions.</span><button type="button" class="omDiagnosticsToggle" aria-expanded="false">Show advanced diagnostics</button></div></section>`;
  }

  function radarRows(){
    const out=[];
    const byId=new Map(oppStore().map(o=>[String(o?.Opportunity_ID),o]));
    for(const [id,t] of Object.entries(trackStore())){
      const o=byId.get(String(id))||null;
      const exact=t?.exactVacancy||{};
      const title=exact.title||exact.Opportunity_Name||o?.Opportunity_Name||t?.opportunityName||t?.title||t?.name||'Tracked application';
      const provider=exact.provider||exact.Provider||o?.Provider||t?.provider||t?.Provider||'Tracked application';
      const stage=String(t?.stage||'Saved');
      const life=t?.checklist?.lifecycle||{};
      const push=(x)=>out.push({...x,id,title,provider,stage});

      if(stage==='Submitted'){
        const date=life.followUp?.date||'';
        if(date){const n=dayDiff(date);push({type:'followup',icon:'↻',eyebrow:'Follow-up',headline:n!=null&&n<0?'Follow-up is overdue':'Provider follow-up',detail:`Planned ${pretty(date)}${life.followUp?.contact?` · ${life.followUp.contact}`:''}`,days:n,kind:'dated'})}
        continue;
      }
      if(stage==='Interview'){
        const date=life.interview?.date||'';
        if(date){const n=dayDiff(date);push({type:'interview',icon:'◫',eyebrow:'Interview',headline:n===0?'Interview is today':'Interview scheduled',detail:`${pretty(date)}${life.interview?.time?` · ${life.interview.time}`:''}${life.interview?.format?` · ${life.interview.format}`:''}`,days:n,kind:'dated'})}
        else push({type:'interview',icon:'◫',eyebrow:'Interview',headline:'Add interview logistics',detail:'Interview stage is active but no interview date is recorded yet.',days:null,kind:'missing'});
        continue;
      }
      if(stage==='Offer received'){
        const date=life.offer?.responseDeadline||'';
        if(date){const n=dayDiff(date);push({type:'offer',icon:'◇',eyebrow:'Offer decision',headline:n!=null&&n<0?'Offer response is overdue':'Offer response deadline',detail:`Respond by ${pretty(date)}`,days:n,kind:'dated'})}
        else push({type:'offer',icon:'◇',eyebrow:'Offer decision',headline:'Add the response deadline',detail:'An offer is recorded but no response deadline is saved.',days:null,kind:'missing'});
        continue;
      }
      if(stage==='Unsuccessful'||!activePre.has(stage))continue;

      let d=null;
      try{const n=o&&typeof days==='function'?Number(days(o)):NaN;d=Number.isFinite(n)?n:null}catch{}
      const ready=stage==='Ready to submit'||Boolean(studioState(t)?.finalReady);
      if(d!=null&&d<=45){
        push({type:'deadline',icon:ready?'↗':'◷',eyebrow:ready?'Ready to submit':'Provider deadline',headline:ready?'Application pack is ready':stage==='Saved'?'Preparation has not started':'Finish preparation before the deadline',detail:d<0?`Provider deadline passed ${Math.abs(d)}d ago`:d===0?'Provider deadline today':`Provider deadline in ${d}d`,days:d,kind:'dated'});
      }else if(ready){
        push({type:'ready',icon:'↗',eyebrow:'Ready to submit',headline:'Application pack is ready',detail:'Open the provider site when you are ready to submit.',days:d,kind:d==null?'open':'dated'});
      }
    }
    const rank=x=>x.kind==='missing'?1.5:x.days==null?3:x.days<0?0:x.days===0?.2:x.days<=7?1:2;
    return out.sort((a,b)=>rank(a)-rank(b)||((a.days??99999)-(b.days??99999))||String(a.title).localeCompare(String(b.title)));
  }

  function ensureRadarStyle(){
    if(document.getElementById(RADAR_STYLE_ID))return;
    const style=document.createElement('style');
    style.id=RADAR_STYLE_ID;
    style.textContent=`
      #dashboard .omApplicationRadarV203{margin-top:18px;width:100%;max-width:none;box-sizing:border-box;border:1px solid rgba(151,164,190,.16);border-radius:22px;background:linear-gradient(135deg,#121c2b,#171a38 72%,#25204a);padding:22px;color:#f7f9fd;overflow:hidden;position:relative;grid-column:1/-1;justify-self:stretch}
      #dashboard .omApplicationRadarV203:after{content:"";position:absolute;width:260px;height:260px;border:28px solid rgba(125,93,255,.12);border-radius:50%;right:-145px;top:-155px;pointer-events:none}
      #dashboard .omRadarHeadV203{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;position:relative;z-index:1}
      #dashboard .omRadarEyV203{font-size:8px;letter-spacing:.15em;text-transform:uppercase;font-weight:900;color:#ad96ff}
      #dashboard .omRadarHeadV203 h3{margin:5px 0 4px;font-size:20px;line-height:1.12}
      #dashboard .omRadarHeadV203 p{margin:0;color:#98a4b7;font-size:10px;line-height:1.5}
      #dashboard .omRadarStatsV203{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      #dashboard .omRadarStatV203{min-width:76px;border:1px solid rgba(157,171,198,.2);background:rgba(8,15,27,.28);border-radius:12px;padding:9px 11px}
      #dashboard .omRadarStatV203 b{display:block;font-size:17px}
      #dashboard .omRadarStatV203 span{font-size:7px;text-transform:uppercase;letter-spacing:.08em;color:#8e9bb0;font-weight:800}
      #dashboard .omRadarListV203{display:grid;gap:9px;margin-top:16px;position:relative;z-index:1}
      #dashboard .omRadarRowV203{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;gap:11px;align-items:center;border:1px solid rgba(157,171,198,.16);background:rgba(8,15,27,.34);border-radius:14px;padding:11px 12px}
      #dashboard .omRadarIconV203{width:32px;height:32px;border-radius:10px;border:1px solid rgba(151,164,190,.2);display:grid;place-items:center;font-weight:900;color:#c9ff55;background:rgba(200,255,80,.045)}
      #dashboard .omRadarCopyV203{min-width:0}
      #dashboard .omRadarCopyV203 span{display:block;font-size:7px;letter-spacing:.09em;text-transform:uppercase;font-weight:900;color:#8794a8}
      #dashboard .omRadarCopyV203 b{display:block;font-size:11px;line-height:1.3;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #dashboard .omRadarCopyV203 small{display:block;margin-top:3px;color:#8f9caf;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #dashboard .omRadarDueV203{font-size:8px;font-weight:900;border-radius:999px;padding:7px 9px;white-space:nowrap;border:1px solid rgba(151,164,190,.2);color:#b7c1d0}
      #dashboard .omRadarDueV203.overdue{color:#ff8f9a;border-color:rgba(255,104,120,.36);background:rgba(255,104,120,.07)}
      #dashboard .omRadarDueV203.today,#dashboard .omRadarDueV203.soon{color:#ffd36d;border-color:rgba(255,190,72,.34);background:rgba(255,190,72,.07)}
      #dashboard .omRadarDueV203.attention{color:#d1bcff;border-color:rgba(140,108,255,.35);background:rgba(140,108,255,.08)}
      #dashboard .omRadarOpenV203{border:1px solid rgba(151,164,190,.25);background:#0b121d;color:#f7f9fd;border-radius:10px;padding:8px 10px;font-size:8px;font-weight:900;cursor:pointer;white-space:nowrap}
      #dashboard .omRadarEmptyV203{border:1px dashed rgba(151,164,190,.24);border-radius:14px;padding:18px;text-align:center;color:#8f9caf;font-size:10px}
      html[data-om-theme="light"] #dashboard .omApplicationRadarV203{background:linear-gradient(135deg,#fff,#f7f5ff 72%,#f0edff);color:#111827;border-color:#dedfe6;box-shadow:0 12px 32px rgba(20,25,38,.06)}
      html[data-om-theme="light"] #dashboard .omRadarHeadV203 p{color:#697386}
      html[data-om-theme="light"] #dashboard .omRadarRowV203{background:rgba(255,255,255,.76);border-color:#e0e2e8}
      html[data-om-theme="light"] #dashboard .omRadarOpenV203{background:#111827;color:#fff;border-color:#111827}
      @media(max-width:820px){#dashboard .omRadarHeadV203{display:grid}#dashboard .omRadarStatsV203{justify-content:flex-start}#dashboard .omRadarRowV203{grid-template-columns:34px minmax(0,1fr) auto}#dashboard .omRadarOpenV203{grid-column:2/-1;width:max-content}}
    `;
    document.head.appendChild(style);
  }

  function radarMarkup(rows){
    const overdue=rows.filter(x=>x.days!=null&&Number(x.days)<0).length;
    const next7=rows.filter(x=>x.days!=null&&Number(x.days)>=0&&Number(x.days)<=7).length;
    const attention=rows.filter(x=>x.kind==='missing').length;
    const urgency=x=>x.kind==='missing'?'attention':x.days==null?'open':x.days<0?'overdue':x.days===0?'today':x.days<=7?'soon':'open';
    const body=rows.length?rows.slice(0,6).map(x=>`<div class="omRadarRowV203"><div class="omRadarIconV203">${safe(x.icon||'•')}</div><div class="omRadarCopyV203"><span>${safe(x.eyebrow||'Application action')} · ${safe(x.provider)}</span><b>${safe(x.title)}</b><small>${safe(x.headline)}${x.detail?` · ${safe(x.detail)}`:''}</small></div><div class="omRadarDueV203 ${urgency(x)}">${safe(relative(x.days))}</div><button type="button" class="omRadarOpenV203" data-om-radar-track="${safe(x.id)}">Open tracker ↗</button></div>`).join(''):'<div class="omRadarEmptyV203">When a tracked application has a deadline, follow-up, interview or offer decision to act on, it will appear here automatically.</div>';
    return `<section class="omApplicationRadarV203" data-om-radar-owner="product-v203"><div class="omRadarHeadV203"><div><div class="omRadarEyV203">Application action radar</div><h3>${rows.length?`${rows.length} application action${rows.length===1?'':'s'} worth attention.`:'No scheduled application actions right now.'}</h3><p>Tracked deadlines and post-submission dates, ranked by what needs your attention first.</p></div><div class="omRadarStatsV203"><div class="omRadarStatV203"><b>${overdue}</b><span>overdue</span></div><div class="omRadarStatV203"><b>${next7}</b><span>next 7 days</span></div><div class="omRadarStatV203"><b>${attention}</b><span>needs details</span></div></div></div><div class="omRadarListV203">${body}</div></section>`;
  }

  function ensureRadar(premium,intel){
    ensureRadarStyle();
    const rows=radarRows();
    const sig=rows.map(x=>[x.id,x.type,x.days,x.headline,x.detail,x.title,x.provider].join(':')).join('|');
    let radar=premium.querySelector(':scope > .omApplicationRadarV203');
    if(!radar){
      const holder=document.createElement('div');holder.innerHTML=radarMarkup(rows);radar=holder.firstElementChild;
      if(radar)intel.insertAdjacentElement('afterend',radar);
    }else if(radar.dataset.sig!==sig){
      const holder=document.createElement('div');holder.innerHTML=radarMarkup(rows);const replacement=holder.firstElementChild;
      if(replacement){radar.replaceWith(replacement);radar=replacement}
    }
    if(radar&&radar.previousElementSibling!==intel)intel.insertAdjacentElement('afterend',radar);
    if(radar)radar.dataset.sig=sig;
    document.documentElement.dataset.omRadarMounted='product-v203';
    return radar;
  }

  function simplifyLiveCopy(){
    const section=document.querySelector('#dashboard .deepLiveV2');if(!section)return;
    const ey=section.querySelector('.matchIntelEy');
    const eyebrow='Live opportunities for you';
    if(ey&&ey.textContent!==eyebrow)ey.textContent=eyebrow;
    const p=section.querySelector('.deepV2Head p');
    const copy='Verified current openings are ranked using your Passport, vacancy evidence, deadlines and explicit blockers. Open the official vacancy before applying.';
    if(p&&p.textContent!==copy)p.textContent=copy;
  }

  let scheduled=false;
  function refresh(){
    scheduled=false;
    const dash=document.getElementById('dashboard');
    const premium=dash?.querySelector('.dashPremium');
    const intel=premium?.querySelector('.matchIntel');
    if(!dash||!premium||!intel)return;
    const s=countState();const sig=[s.strong,s.review,s.tracked,s.due,s.incomplete,s.ready,s.submitted,s.live].join('|');
    const radar=ensureRadar(premium,intel);
    let hub=premium.querySelector(':scope > .omActionHub');
    if(!hub){
      hub=document.createElement('div');
      hub.innerHTML=hubMarkup(s);
      hub=hub.firstElementChild;
      (radar||intel).insertAdjacentElement('afterend',hub);
    }else if(hub.dataset.sig!==sig){
      hub.outerHTML=hubMarkup(s);
      hub=premium.querySelector(':scope > .omActionHub');
    }
    if(hub){
      hub.dataset.sig=sig;
      const desired=radar||intel;
      if(hub.previousElementSibling!==desired)desired.insertAdjacentElement('afterend',hub);
    }
    setDiagnostics(diagnosticsOpen());
    simplifyLiveCopy();
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(refresh)}

  document.addEventListener('click',e=>{
    const radarOpen=e.target.closest?.('[data-om-radar-track]');
    if(radarOpen){
      const id=radarOpen.getAttribute('data-om-radar-track');
      if(typeof window.setView==='function')window.setView('tracker');
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const cards=[...document.querySelectorAll('#tracker .focusCard,#tracker [data-exact-track-id],#tracker [data-track-id]')];
        const card=cards.find(el=>String(el.dataset?.exactTrackId||el.dataset?.trackId||'')===String(id));
        if(card){try{card.scrollIntoView({behavior:'smooth',block:'center'})}catch{card.scrollIntoView()}}
      }));
      return;
    }
    const action=e.target.closest?.('[data-om-action]');if(action){go(action.dataset.omAction);return}
    if(e.target.closest?.('.omDiagnosticsToggle'))setDiagnostics(!document.getElementById('dashboard')?.classList.contains('omDiagnosticsOpen'));
  });

  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'&&!oldRender.__omProductUXV203){
    const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};
    wrapped.__omProductUXV203=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const oldSet=window.setView;
  if(typeof oldSet==='function'&&!oldSet.__omProductUXV203){
    const wrapped=(v,...args)=>{const out=oldSet(v,...args);if(v==='dashboard')schedule();return out};
    wrapped.__omProductUXV203=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrapped(b.dataset.v)});
  }

  window.addEventListener('opportunity:verifiedfeedchange',schedule);
  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  window.addEventListener('focus',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))schedule()},true);
  schedule();
  window.OpportunityProductUX={refresh:schedule,setDiagnostics,countState,radarRows};
})();
