(()=>{
  const OPEN_KEY='oppAdvancedDiagnosticsV129';
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const isActive=o=>String(o?.Status||'').toLowerCase()!=='closed';

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

  function countState(){
    let active=[],strong=0,review=0;
    try{active=(opps||[]).filter(isActive)}catch{}
    try{
      for(const o of active){const e=evaluate(o);if(e?.cls==='eligible')strong++;if(['review','possible'].includes(e?.cls))review++}
    }catch{}
    let tracked=0,due=0,incomplete=0;
    try{
      const byId=new Map((opps||[]).map(o=>[o.Opportunity_ID,o]));
      const entries=Object.entries(tracks||{});tracked=entries.length;
      for(const [id,t] of entries){
        const o=byId.get(id),d=o&&typeof days==='function'?days(o):99999;
        if(d>=0&&d<=14)due++;
        const c=t?.checklist||{},done=['documents','statement','references'].filter(k=>c[k]).length;
        if(done<3&&!['Submitted','Interview','Offer received','Unsuccessful'].includes(t?.stage||''))incomplete++;
      }
    }catch{}
    let live=0;
    try{live=document.querySelectorAll('#dashboard .deepV2Card').length||window.OpportunityBestLive?.status?.()?.items?.filter?.(x=>x?.status_verified===true&&x?.verification_level==='exact')?.length||0}catch{}
    return{active:active.length,strong,review,tracked,due,incomplete,live};
  }

  function actionCopy(s){
    const first=s.due?{
      label:'Deadline attention',title:`${s.due} tracked application${s.due===1?'':'s'} need attention soon.`,body:'Move the nearest deadline forward before researching anything new.',action:'Open tracker',cmd:'tracker'
    }:s.incomplete?{
      label:'Application momentum',title:'Move one application forward today.',body:`${s.incomplete} tracked route${s.incomplete===1?'':'s'} still have preparation work outstanding.`,action:'Open tracker',cmd:'tracker'
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

  function refresh(){
    const dash=document.getElementById('dashboard');
    const premium=dash?.querySelector('.dashPremium');
    const intel=premium?.querySelector('.matchIntel');
    if(!dash||!premium||!intel)return;
    const s=countState();const sig=[s.strong,s.review,s.tracked,s.due,s.incomplete,s.live].join('|');
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

  document.addEventListener('click',e=>{
    const action=e.target.closest?.('[data-om-action]');if(action){go(action.dataset.omAction);return}
    if(e.target.closest?.('.omDiagnosticsToggle'))setDiagnostics(!document.getElementById('dashboard')?.classList.contains('omDiagnosticsOpen'));
  });

  const observer=new MutationObserver(muts=>{
    if(!muts.some(m=>m.addedNodes?.length||m.removedNodes?.length))return;
    clearTimeout(observer._t);observer._t=setTimeout(refresh,90);
  });
  observer.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(refresh,80));
  window.addEventListener('focus',()=>setTimeout(refresh,80));
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))setTimeout(refresh,120)},true);
  setTimeout(refresh,250);setTimeout(refresh,900);setTimeout(refresh,1800);
  window.OpportunityProductUX={refresh,setDiagnostics};
})();
