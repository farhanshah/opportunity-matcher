(()=>{
  const ACTIVE_PRE=new Set(['Saved','Researching','Preparing documents','Drafting','Ready to submit']);
  const POST=new Set(['Submitted','Interview','Offer received','Unsuccessful']);
  let scheduled=false,observer=null;

  function store(){try{return (typeof tracks==='object'&&tracks)||window.tracks||{}}catch{return window.tracks||{}}}
  function oppsStore(){try{return Array.isArray(opps)?opps:[]}catch{return[]}}
  function track(id){return store()?.[id]||null}
  function studio(t){try{return window.OpportunityStudioTruth?.getState?.(t)||null}catch{return null}}
  function meta(id,t){
    const o=oppsStore().find(x=>String(x?.Opportunity_ID)===String(id))||null;
    const x=t?.exactVacancy||{};
    let d=null;
    try{const n=o&&typeof days==='function'?Number(days(o)):NaN;if(Number.isFinite(n))d=n}catch{}
    return{
      id,
      o,
      title:x.title||x.Opportunity_Name||o?.Opportunity_Name||t?.opportunityName||t?.title||t?.name||'Tracked application',
      provider:x.provider||x.Provider||o?.Provider||t?.provider||t?.Provider||'Tracked application',
      days:d,
      exact:Boolean(x?.url),
      url:x?.url||o?.Application_URL||o?.Official_Source_URL||''
    };
  }
  function dueText(d){return d==null?'No fixed provider deadline':d<0?`${Math.abs(d)} day${Math.abs(d)===1?'':'s'} overdue`:d===0?'Due today':d===1?'Due tomorrow':`Due in ${d} days`}

  function focusTracker(id){
    if(typeof window.setView==='function')window.setView('tracker');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const t=track(id),m=t?meta(id,t):null;
      const cards=[...document.querySelectorAll('#tracker .focusCard,#tracker [data-exact-track-id],#tracker [data-track-id],#tracker .boardCardV11')];
      const card=cards.find(el=>String(el.dataset?.exactTrackId||el.dataset?.trackId||'')===String(id))||(m?cards.find(el=>String(el.textContent||'').includes(m.title)):null);
      if(card){
        try{card.scrollIntoView({behavior:'smooth',block:'center'})}catch{card.scrollIntoView()}
        card.classList.add('omJourneyFocusV206');
        setTimeout(()=>card.classList.remove('omJourneyFocusV206'),1800);
      }
    }));
  }

  function open(id){
    const t=track(id);if(!t){focusTracker(id);return}
    const stage=String(t.stage||'Saved'),m=meta(id,t),s=studio(t);

    if(POST.has(stage)){
      if(typeof window.setView==='function')window.setView('tracker');
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        try{window.OpportunityPostSubmission?.open?.(id)}catch{}
        focusTracker(id);
      }));
      return;
    }

    const ready=stage==='Ready to submit'||Boolean(s?.finalReady)||(Number(s?.progress||0)>=100&&s?.sourceMode==='dedicatedPrepare');
    if(ready){
      if(typeof window.setView==='function')window.setView('tracker');
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        try{window.OpportunitySubmissionStage?.open?.(id)}catch{}
        focusTracker(id);
      }));
      return;
    }

    if(m.exact&&ACTIVE_PRE.has(stage)){
      location.assign(`/prepare?id=${encodeURIComponent(id)}`);
      return;
    }

    focusTracker(id);
  }

  function repair(){
    let changed=false;
    for(const t of Object.values(store())){
      if(!t||typeof t!=='object')continue;
      if(!t.stage){t.stage='Saved';changed=true}
      if(!t.checklist||typeof t.checklist!=='object'){
        t.checklist={documents:false,statement:false,references:false};changed=true;
      }else{
        for(const k of ['documents','statement','references'])if(typeof t.checklist[k]!=='boolean'){t.checklist[k]=Boolean(t.checklist[k]);changed=true}
      }
    }
    if(changed){try{persist?.()}catch{};window.dispatchEvent(new CustomEvent('opportunity:statechange',{detail:{source:'journey-v206-repair'}}))}
  }

  function copyFor(id){
    const t=track(id);if(!t)return null;
    const stage=String(t.stage||'Saved'),m=meta(id,t),s=studio(t),due=dueText(m.days);
    if(stage==='Offer received')return{action:'Review offer',body:'Review the offer conditions, response deadline and decision notes in the application timeline.'};
    if(stage==='Interview')return{action:'Prepare interview',body:'Open the application timeline to review interview logistics and continue preparation.'};
    if(stage==='Submitted')return{action:'Open follow-up',body:'Open the application timeline to review the submission record and any follow-up date.'};
    if(stage==='Unsuccessful')return{action:'Review outcome',body:'Open the application timeline to capture feedback and anything worth reusing next time.'};
    const ready=stage==='Ready to submit'||Boolean(s?.finalReady)||(Number(s?.progress||0)>=100&&s?.sourceMode==='dedicatedPrepare');
    if(ready)return{action:'Open submission step',body:'Your application pack is ready. Complete the official provider submission, then record the confirmation in Opportunity.'};
    if(m.exact&&ACTIVE_PRE.has(stage)){
      if(stage==='Saved'||stage==='Researching')return{action:'Continue application',body:`${due}. Open Application Studio and complete the next required preparation step.`};
      return{action:'Continue application',body:`${due}. Continue the guided application workspace from where you left off.`};
    }
    return{action:'Open tracker',body:`${due}. Continue this tracked application from the Tracker.`};
  }

  function refresh(){
    scheduled=false;
    const hub=document.querySelector('#dashboard .omDecisionHubV205');
    const btn=hub?.querySelector('.omDecisionActionV205[data-v205-cmd="track"]');
    if(!hub||!btn)return;
    const id=btn.getAttribute('data-v205-id')||'';if(!id)return;
    const c=copyFor(id);if(!c)return;
    if(btn.textContent.trim()!==`${c.action} ↗`)btn.textContent=`${c.action} ↗`;
    btn.dataset.v206Journey='true';
    const p=hub.querySelector('.omDecisionHeroV205 p');
    if(p&&p.textContent!==c.body)p.textContent=c.body;
    document.documentElement.dataset.omJourney='v206';
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>requestAnimationFrame(refresh))}

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.omDecisionActionV205[data-v205-cmd="track"]');
    if(!btn)return;
    const id=btn.getAttribute('data-v205-id')||'';if(!id)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    open(id);
  },true);

  const style=document.createElement('style');
  style.textContent='#tracker .omJourneyFocusV206{box-shadow:0 0 0 2px rgba(216,255,105,.55),0 0 0 7px rgba(216,255,105,.08)!important;transition:box-shadow .2s ease}';
  document.head.appendChild(style);

  const dash=document.getElementById('dashboard');
  if(dash){
    observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length||r.removedNodes.length))schedule()});
    observer.observe(dash,{childList:true,subtree:true});
  }
  ['opportunity:statechange','opportunity:hydrated','opportunity:cloudsynced'].forEach(name=>window.addEventListener(name,()=>{repair();schedule()}));
  window.addEventListener('focus',schedule);
  repair();schedule();
  setTimeout(schedule,250);setTimeout(schedule,900);

  window.OpportunityJourneyV206={open,refresh:schedule,repair,status:id=>{const t=track(id);return t?{stage:t.stage,studio:studio(t),meta:meta(id,t)}:null}};
})();
