(()=>{
  const OPEN_KEY='oppAdvancedDiagnosticsV129';
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const isActive=o=>String(o?.Status||'').toLowerCase()!=='closed';
  const beyond=new Set(['Submitted','Interview','Offer received','Unsuccessful']);
  const readyStages=new Set(['Ready to submit','Submitted','Interview','Offer received','Unsuccessful']);

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
    let hub=premium.querySelector(':scope > .omActionHub');
    if(!hub){
      hub=document.createElement('div');
      hub.innerHTML=hubMarkup(s);
      hub=hub.firstElementChild;
      intel.insertAdjacentElement('afterend',hub);
    }else if(hub.dataset.sig!==sig){
      hub.outerHTML=hubMarkup(s);
      hub=premium.querySelector(':scope > .omActionHub');
    }
    if(hub)hub.dataset.sig=sig;
    setDiagnostics(diagnosticsOpen());
    simplifyLiveCopy();
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(refresh)}

  document.addEventListener('click',e=>{
    const action=e.target.closest?.('[data-om-action]');if(action){go(action.dataset.omAction);return}
    if(e.target.closest?.('.omDiagnosticsToggle'))setDiagnostics(!document.getElementById('dashboard')?.classList.contains('omDiagnosticsOpen'));
  });

  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'&&!oldRender.__omProductUXV173){
    const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};
    wrapped.__omProductUXV173=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const oldSet=window.setView;
  if(typeof oldSet==='function'&&!oldSet.__omProductUXV173){
    const wrapped=(v,...args)=>{const out=oldSet(v,...args);if(v==='dashboard')schedule();return out};
    wrapped.__omProductUXV173=true;
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
  window.OpportunityProductUX={refresh:schedule,setDiagnostics,countState};
})();
