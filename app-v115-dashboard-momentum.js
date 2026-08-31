(()=>{
  let scheduled=false;
  const beyond=new Set(['Submitted','Interview','Offer received','Unsuccessful']);
  const readyStages=new Set(['Ready to submit','Submitted','Interview','Offer received','Unsuccessful']);
  const stagePct={Saved:0,Researching:12,'Preparing documents':28,Drafting:46,'Ready to submit':100,Submitted:100,Interview:100,'Offer received':100,Unsuccessful:100};

  function source(){return (typeof tracks==='object'&&tracks)||window.tracks||{}}
  function studioState(t){try{return window.OpportunityStudioTruth?.getState?.(t)||null}catch{return null}}
  function legacyChecks(t){return ['documents','statement','references'].filter(k=>t?.checklist?.[k]).length}

  function appProgress(t){
    const stage=String(t?.stage||'Saved');
    if(beyond.has(stage))return 100;
    const s=studioState(t);
    if(s?.sourceMode==='dedicatedPrepare'){
      if(stage==='Ready to submit'||s.finalReady)return 100;
      return Math.max(0,Math.min(100,Number(s.progress||0)));
    }
    const checks=legacyChecks(t);
    return Math.max(stagePct[stage]??0,Math.round((checks/3)*68));
  }

  function metrics(){
    const rows=Object.values(source());
    const tracked=rows.length;
    if(!tracked)return{tracked:0,momentum:0,ready:0,submitted:0,checks:0};
    let total=0,ready=0,submitted=0,checks=0;
    for(const t of rows){
      total+=appProgress(t);
      const stage=String(t?.stage||'Saved');
      const s=studioState(t);
      if(readyStages.has(stage)||s?.finalReady)ready++;
      if(beyond.has(stage))submitted++;
      checks+=s?.sourceMode==='dedicatedPrepare'?Number(s.verifyDone||0):legacyChecks(t);
    }
    return{tracked,momentum:Math.round(total/tracked),ready,submitted,checks};
  }

  function statusCopy(m){
    if(!m.tracked)return'Track an opportunity to start building application momentum.';
    if(m.submitted>0)return`Pipeline active — ${m.submitted} application${m.submitted===1?'':'s'} submitted or beyond.`;
    if(m.ready>0)return`Momentum building — ${m.ready} application pack${m.ready===1?'':'s'} ready to submit.`;
    if(m.momentum>0)return'In progress — keep completing preparation tasks to build momentum.';
    return'Not started yet — complete one preparation task to build momentum.';
  }

  function patch(){
    scheduled=false;
    const box=document.querySelector('#dashboard .momentum');
    if(!box)return;
    const m=metrics();
    const value=box.querySelector('.momentumTop b');
    const trackedLabel=box.querySelector('.momentumTop > span');
    const rail=box.querySelector('.momentumRail i');
    const note=box.querySelector('small');
    if(value)value.textContent=`${m.momentum}%`;
    if(trackedLabel)trackedLabel.textContent=`${m.tracked} tracked`;
    if(rail)rail.style.width=`${m.momentum}%`;
    if(note){
      note.textContent=m.tracked
        ?`${m.ready}/${m.tracked} application packs ready or beyond · ${m.checks} official/preparation checks complete · ${m.submitted} submitted or beyond`
        :'Track an opportunity and this becomes your preparation pulse.';
    }
    const legacy=[...box.querySelectorAll('*')].find(el=>{
      if(el.children.length)return false;
      const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
      return /Not started yet|complete one preparation task|Momentum building|Pipeline active|In progress/i.test(text);
    });
    if(legacy)legacy.textContent=statusCopy(m);
  }

  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(patch)}

  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'&&!oldRender.__omMomentumV115){
    const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};
    wrapped.__omMomentumV115=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const oldSet=window.setView;
  if(typeof oldSet==='function'&&!oldSet.__omMomentumV115){
    const wrapped=(v,...args)=>{const out=oldSet(v,...args);if(v==='dashboard')schedule();return out};
    wrapped.__omMomentumV115=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrapped(b.dataset.v)});
  }

  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))schedule()},true);
  schedule();

  window.OpportunityDashboardMomentum={refresh:schedule,metrics};
})();
