(()=>{
  const STYLE_ID='om-smart-next-v205-style';
  let queued=false,observer=null;
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const activeStages=new Set(['Saved','Researching','Preparing documents','Drafting','Ready to submit']);

  function tracksStore(){try{return (typeof tracks==='object'&&tracks)||window.tracks||{}}catch{return window.tracks||{}}}
  function oppStore(){try{return Array.isArray(opps)?opps:[]}catch{return[]}}
  function trackDays(t,o){
    try{const n=o&&typeof days==='function'?Number(days(o)):NaN;if(Number.isFinite(n))return n}catch{}
    const raw=String(t?.exactVacancy?.deadline||'').trim();
    if(/^20\d{2}-\d{2}-\d{2}$/.test(raw)){
      const now=new Date(),off=now.getTimezoneOffset(),today=new Date(now.getTime()-off*60000).toISOString().slice(0,10);
      const a=new Date(`${today}T12:00:00`),b=new Date(`${raw}T12:00:00`);
      if(Number.isFinite(b.getTime()))return Math.round((b-a)/864e5);
    }
    return null;
  }
  function preSubmissionOpen(t,o){
    if(o&&String(o?.Status||'').toLowerCase()==='closed')return false;
    const d=trackDays(t,o);
    return d==null||d>=0;
  }
  function studioState(t){try{return window.OpportunityStudioTruth?.getState?.(t)||null}catch{return null}}
  function radarRows(){try{const r=window.OpportunityProductUX?.radarRows?.();return Array.isArray(r)?r:[]}catch{return[]}}
  function countState(){try{return window.OpportunityProductUX?.countState?.()||{}}catch{return{}}}
  function rel(n){return n==null?'No fixed date':n<0?`${Math.abs(n)} day${Math.abs(n)===1?'':'s'} overdue`:n===0?'Due today':n===1?'Due tomorrow':`Due in ${n} days`}
  function shortTitle(v,max=54){const s=String(v||'Application').trim();return s.length>max?`${s.slice(0,max-1).trim()}…`:s}

  function trackMeta(id,t){
    let o=null;
    try{o=oppStore().find(x=>String(x?.Opportunity_ID)===String(id))||null}catch{}
    const exact=t?.exactVacancy||{};
    return{
      id,
      title:exact.title||exact.Opportunity_Name||o?.Opportunity_Name||t?.opportunityName||t?.title||t?.name||'Tracked application',
      provider:exact.provider||exact.Provider||o?.Provider||t?.provider||t?.Provider||'Tracked application',
      o
    };
  }

  function rowPriority(x){
    const d=x?.days;
    if(d!=null&&Number(d)<0)return 0;
    if(x?.type==='offer')return d==null||d<=7?.35:1.35;
    if(x?.type==='interview')return d==null||d<=7?.45:1.45;
    if(d!=null&&d<=7)return .8;
    if(x?.type==='followup'&&d!=null&&d<=14)return 1.1;
    if(x?.type==='ready')return 1.25;
    if(d!=null&&d<=14)return 1.6;
    if(x?.kind==='missing')return 1.8;
    return 3;
  }

  function trackedDecision(row){
    const title=shortTitle(row.title,62),provider=row.provider||'Tracked application';
    const timing=rel(row.days);
    const base={id:row.id,title:row.title,provider,cmd:'track',timing,stage:row.stage||'',source:'Tracked application'};

    if(row.type==='offer')return{
      ...base,
      eyebrow:'Offer decision',
      headline:`Decide on ${title}.`,
      body:row.days==null?'An offer is recorded, but its response deadline is missing. Add the deadline before doing anything lower priority.':`${timing}. Review the offer conditions and response deadline before lower-priority application work.`,
      why:'An active offer has more immediate consequence than starting or browsing another application.',
      action:'Review offer'
    };
    if(row.type==='interview')return{
      ...base,
      eyebrow:'Interview priority',
      headline:`Prepare for ${title}.`,
      body:row.days==null?'The application is at interview stage, but the interview date is not recorded yet. Add the logistics and prepare your examples.':`${timing}. Use the remaining time for role-specific examples, provider research and likely interview questions.`,
      why:'Interview-stage work is already past application screening, so preparation takes priority over new browsing.',
      action:'Prepare interview'
    };
    if(row.type==='followup')return{
      ...base,
      eyebrow:'Follow-up',
      headline:`Follow up on ${title}.`,
      body:`${timing}. ${row.headline||'A provider follow-up is due.'}${row.detail?` ${row.detail}.`:''}`,
      why:'This application is already submitted; a timely follow-up protects momentum without creating another application.',
      action:'Open follow-up'
    };
    if(row.type==='ready'||row.headline==='Application pack is ready')return{
      ...base,
      eyebrow:'Ready to submit',
      headline:`Submit ${title}.`,
      body:row.days==null?'Your application pack is ready. Open the official provider site, submit it, then update the Tracker.':`${timing}. Your application pack is ready; submission is now more valuable than more preparation or browsing.`,
      why:'The work is already complete enough to convert into a real submission.',
      action:'Open submission step'
    };
    return{
      ...base,
      eyebrow:row.days!=null&&row.days<=7?'Deadline priority':'Application priority',
      headline:`Move ${title} forward today.`,
      body:`${timing}. ${row.headline||'This tracked application needs progress.'}${row.detail?` ${row.detail}.`:''}`,
      why:row.days!=null&&row.days<=7?'It is already tracked and time-sensitive, so it outranks researching a new route.':'It is already in your pipeline; moving existing work forward is more valuable than adding another tab.',
      action:'Continue application'
    };
  }

  function incompleteTracked(){
    const candidates=[];
    for(const [id,t] of Object.entries(tracksStore())){
      const stage=String(t?.stage||'Saved');
      if(!activeStages.has(stage))continue;
      const s=studioState(t);
      if(stage==='Ready to submit')continue;
      const m=trackMeta(id,t);
      if(!preSubmissionOpen(t,m.o))continue;
      const d=trackDays(t,m.o);
      candidates.push({...m,t,stage,days:d,progress:Number(s?.progress||0)});
    }
    candidates.sort((a,b)=>(a.days??99999)-(b.days??99999)||b.progress-a.progress||String(a.title).localeCompare(String(b.title)));
    return candidates[0]||null;
  }

  function strongestMatch(){
    const trackedIds=new Set(Object.keys(tracksStore()).map(String));
    const rows=[];
    try{
      for(const o of oppStore()){
        if(String(o?.Status||'').toLowerCase()==='closed'||trackedIds.has(String(o?.Opportunity_ID)))continue;
        try{const d=typeof days==='function'?Number(days(o)):NaN;if(Number.isFinite(d)&&d<0)continue}catch{}
        const ev=typeof evaluate==='function'?evaluate(o):null;
        if(!ev||ev.cls==='ineligible')continue;
        rows.push({o,ev});
      }
    }catch{}
    rows.sort((a,b)=>(b.ev?.rank||0)-(a.ev?.rank||0)||(b.ev?.relevance||0)-(a.ev?.relevance||0)||((typeof days==='function'?days(a.o):99999)-(typeof days==='function'?days(b.o):99999)));
    return rows.find(x=>x.ev?.cls==='eligible')||rows[0]||null;
  }

  function decide(){
    const radar=radarRows().slice().sort((a,b)=>rowPriority(a)-rowPriority(b)||((a.days??99999)-(b.days??99999)));
    if(radar[0]&&rowPriority(radar[0])<3)return trackedDecision(radar[0]);

    const incomplete=incompleteTracked();
    if(incomplete){
      return{
        id:incomplete.id,title:incomplete.title,provider:incomplete.provider,cmd:'track',timing:incomplete.days==null?'No fixed deadline':rel(incomplete.days),stage:incomplete.stage,source:'Tracked application',
        eyebrow:'Application momentum',headline:`Continue ${shortTitle(incomplete.title,62)}.`,
        body:incomplete.progress>0?`Your application is already ${Math.round(incomplete.progress)}% through its guided preparation. Complete the next unresolved step before opening another route.`:'This route is already tracked but preparation has not meaningfully started. Complete the first application step now.',
        why:'Finishing work already in your pipeline creates more value than expanding the shortlist.',action:'Continue application'
      };
    }

    if(radar[0])return trackedDecision(radar[0]);

    const best=strongestMatch();
    if(best){
      const o=best.o,ev=best.ev;
      return{
        id:o.Opportunity_ID,title:o.Opportunity_Name,provider:o.Provider||'Opportunity provider',cmd:'discover',timing:typeof deadline==='function'?deadline(o):'Open route',stage:'',source:'Best current match',
        eyebrow:'Best untracked fit',headline:`Review ${shortTitle(o.Opportunity_Name,62)}.`,
        body:`This is currently one of your strongest untracked routes${ev?.label?` (${ev.label})`:''}. Review the eligibility analysis before deciding whether it deserves a place in your Tracker.`,
        why:'There is no more urgent tracked action, so the next useful move is to evaluate the strongest available fit.',action:'Review best match'
      };
    }

    const s=countState();
    if(Number(s.live||0)>0)return{
      id:'',title:'Live opportunities',provider:'Verified vacancy feed',cmd:'live',timing:`${s.live} ranked now`,stage:'',source:'Verified live vacancies',
      eyebrow:'Explore live openings',headline:'Review the strongest verified live opening.',
      body:`${s.live} verified opening${Number(s.live)===1?' is':'s are'} ranked against your Passport right now. Open the highest-ranked vacancy and verify the official posting before applying.`,
      why:'There is no tracked application demanding action, so verified live vacancies are the best place to look next.',action:'See live openings'
    };

    return{
      id:'',title:'Discover opportunities',provider:'Opportunity matcher',cmd:'discover',timing:'No urgent tracked action',stage:'',source:'Opportunity discovery',
      eyebrow:'Start a focused search',headline:'Find one route worth acting on.',
      body:'Nothing in your current pipeline needs immediate action. Review your strongest matches and add only a route you would realistically pursue.',
      why:'A focused shortlist is more useful than collecting opportunities without a next step.',action:'Review matches'
    };
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');style.id=STYLE_ID;
    style.textContent=`
      #dashboard .omActionHub.omDecisionHubV205{padding:0!important;overflow:hidden!important;background:linear-gradient(145deg,var(--om-surface),color-mix(in srgb,var(--om-violet) 3%,var(--om-surface)))!important}
      #dashboard .omDecisionHeroV205{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;padding:22px 24px 18px;background:radial-gradient(circle at 90% -20%,rgba(124,92,255,.18),transparent 35%)}
      #dashboard .omDecisionEyV205{font-size:8px;text-transform:uppercase;letter-spacing:.14em;color:var(--om-violet-2);font-weight:900}
      #dashboard .omDecisionHeroV205 h3{margin:6px 0 7px!important;font-size:24px!important;line-height:1.1!important;letter-spacing:-.035em;color:var(--om-heading)!important;max-width:850px}
      #dashboard .omDecisionHeroV205 p{margin:0!important;max-width:840px;color:var(--om-muted)!important;font-size:10px!important;line-height:1.58!important}
      #dashboard .omDecisionMetaV205{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
      #dashboard .omDecisionMetaV205 span{border:1px solid var(--om-line);background:var(--om-surface-2);border-radius:999px;padding:6px 9px;font-size:7.5px;font-weight:800;color:var(--om-muted)}
      #dashboard .omDecisionMetaV205 span:first-child{color:var(--om-lime);border-color:rgba(216,255,105,.18);background:rgba(216,255,105,.05)}
      #dashboard .omDecisionActionV205{min-width:176px;border:0;border-radius:12px;background:var(--om-lime);color:#111709;padding:12px 15px;font-size:10px;font-weight:900;cursor:pointer;box-shadow:0 10px 28px rgba(216,255,105,.11)}
      #dashboard .omDecisionActionV205:hover{transform:translateY(-1px)}
      #dashboard .omDecisionWhyV205{display:flex;gap:10px;align-items:flex-start;margin:0 24px 16px;padding:11px 13px;border:1px solid var(--om-line);border-radius:12px;background:var(--om-surface-2)}
      #dashboard .omDecisionWhyV205 b{white-space:nowrap;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:var(--om-violet-2)}
      #dashboard .omDecisionWhyV205 span{font-size:8.5px;line-height:1.45;color:var(--om-muted)}
      #dashboard .omDecisionHubV205 .omDiagnosticsBar{margin:0!important;padding:13px 24px!important;background:color-mix(in srgb,var(--om-surface-2) 78%,transparent);border-top:1px solid var(--om-line)!important}
      @media(max-width:760px){#dashboard .omDecisionHeroV205{grid-template-columns:1fr;padding:18px}#dashboard .omDecisionActionV205{width:100%}#dashboard .omDecisionWhyV205{margin:0 18px 14px;display:block}#dashboard .omDecisionWhyV205 span{display:block;margin-top:5px}#dashboard .omDecisionHubV205 .omDiagnosticsBar{padding:12px 18px!important}}
    `;
    document.head.appendChild(style);
  }

  function stateSig(s,d){return [s.strong,s.review,s.tracked,s.due,s.incomplete,s.ready,s.submitted,s.live,d.cmd,d.id,d.headline,d.body,d.timing].join('|')}

  function markup(s,d){
    const meta=[d.eyebrow,d.provider,d.timing].filter(Boolean).map((x,i)=>`<span${i===0?' class="primary"':''}>${safe(x)}</span>`).join('');
    return `<section class="omActionHub omDecisionHubV205" aria-label="Recommended next action" data-v205="true" data-sig="${safe([s.strong,s.review,s.tracked,s.due,s.incomplete,s.ready,s.submitted,s.live].join('|'))}"><div class="omDecisionHeroV205"><div><div class="omDecisionEyV205">What to do next · priority #1</div><h3>${safe(d.headline)}</h3><p>${safe(d.body)}</p><div class="omDecisionMetaV205">${meta}</div></div><button type="button" class="omDecisionActionV205" data-v205-cmd="${safe(d.cmd)}" data-v205-id="${safe(d.id||'')}">${safe(d.action)} ↗</button></div><div class="omDecisionWhyV205"><b>Why this is first</b><span>${safe(d.why)}</span></div><div class="omDiagnosticsBar"><span>Provider-route, cycle and evidence diagnostics are still available when you want to inspect how the matcher reached its conclusions.</span><button type="button" class="omDiagnosticsToggle" aria-expanded="false">Show advanced diagnostics</button></div></section>`;
  }

  function openTrack(id){
    if(typeof window.setView==='function')window.setView('tracker');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const t=tracksStore()?.[id],m=t?trackMeta(id,t):null;
      const cards=[...document.querySelectorAll('#tracker .focusCard,#tracker [data-exact-track-id],#tracker [data-track-id],#tracker .boardCardV11')];
      const card=cards.find(el=>String(el.dataset?.exactTrackId||el.dataset?.trackId||'')===String(id))||(m?cards.find(el=>String(el.textContent||'').includes(m.title)):null);
      if(card){try{card.scrollIntoView({behavior:'smooth',block:'center'})}catch{card.scrollIntoView()}}
    }));
  }

  function act(cmd,id){
    if(cmd==='track'){openTrack(id);return}
    if(cmd==='discover'){
      if(typeof window.setView==='function')window.setView('discover');
      if(id&&typeof window.openDetail==='function')requestAnimationFrame(()=>window.openDetail(id));
      return;
    }
    if(cmd==='live'){
      const target=document.querySelector('#dashboard .deepLiveV2');
      if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }

  function patch(){
    queued=false;
    const dash=document.getElementById('dashboard'),premium=dash?.querySelector('.dashPremium');
    if(!dash||!premium||dash.classList.contains('hide'))return false;
    const hub=premium.querySelector(':scope > .omActionHub');
    if(!hub)return false;
    ensureStyle();
    const s=countState(),d=decide(),sig=stateSig(s,d);
    if(hub.dataset.v205Sig===sig&&hub.classList.contains('omDecisionHubV205'))return true;
    const holder=document.createElement('div');holder.innerHTML=markup(s,d);const next=holder.firstElementChild;
    if(!next)return false;
    next.dataset.v205Sig=sig;
    hub.replaceWith(next);
    document.documentElement.dataset.omNextAction='v205';
    return true;
  }

  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>requestAnimationFrame(()=>{if(!patch())requestAnimationFrame(patch)}))}

  function bindObserver(){
    const dash=document.getElementById('dashboard');if(!dash||observer)return;
    observer=new MutationObserver(records=>{
      const changed=records.some(r=>r.type==='childList'&&(r.addedNodes.length||r.removedNodes.length));
      if(changed){
        const hub=dash.querySelector('.omActionHub');
        if(hub&&!hub.classList.contains('omDecisionHubV205'))schedule();
      }
    });
    observer.observe(dash,{childList:true,subtree:true});
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-v205-cmd]');
    if(!btn)return;
    e.preventDefault();act(btn.getAttribute('data-v205-cmd'),btn.getAttribute('data-v205-id'));
  },true);

  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'&&!oldRender.__omSmartNextV205){
    const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};
    wrapped.__omSmartNextV205=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }
  const oldSet=window.setView;
  if(typeof oldSet==='function'&&!oldSet.__omSmartNextV205){
    const wrapped=(v,...args)=>{const out=oldSet(v,...args);if(v==='dashboard')schedule();return out};
    wrapped.__omSmartNextV205=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
  }

  ['opportunity:verifiedfeedchange','opportunity:statechange','opportunity:hydrated','opportunity:cloudsynced'].forEach(name=>window.addEventListener(name,schedule));
  window.addEventListener('focus',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))schedule()},true);
  bindObserver();
  schedule();setTimeout(schedule,250);setTimeout(schedule,900);
  window.OpportunitySmartNext={refresh:schedule,decide};
})();