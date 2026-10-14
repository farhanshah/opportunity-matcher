(()=>{
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const stageOf=t=>String(t?.stage||'Saved');
  const studioState=t=>{try{return window.OpportunityStudioTruth?.getState?.(t)||null}catch{return null}};
  const postSubmission=new Set(['Submitted','Interview','Offer received','Unsuccessful']);
  function activeEntries(){
    const os=Array.isArray(window.opps)?window.opps:(typeof opps!=='undefined'&&Array.isArray(opps)?opps:[]);
    const byId=new Map(os.map(o=>[String(o.Opportunity_ID),o]));
    return Object.entries((typeof tracks==='object'&&tracks)||window.tracks||{}).filter(([id,t])=>{
      const stage=stageOf(t);
      if(postSubmission.has(stage))return true;
      const o=byId.get(String(id));
      if(!o)return true;
      if(String(o.Status||'').toLowerCase()==='closed')return false;
      try{if(typeof days==='function'&&Number(days(o))<0)return false}catch{}
      return true;
    });
  }

  function counts(){
    const g={Shortlist:0,Preparing:0,Ready:0,'Submitted +':0,Outcome:0};
    try{
      activeEntries().forEach(([,t])=>{
        const stage=stageOf(t),s=studioState(t);
        if(['Offer received','Unsuccessful'].includes(stage)){g.Outcome++;return}
        if(['Submitted','Interview'].includes(stage)){g['Submitted +']++;return}
        if(stage==='Ready to submit'){g.Ready++;return}
        if(['Preparing documents','Drafting'].includes(stage)||(stage==='Researching'&&s?.sourceMode==='dedicatedPrepare'&&Number(s?.progress||0)>0)){g.Preparing++;return}
        g.Shortlist++;
      });
    }catch{}
    return g;
  }

  function refresh(){
    const panel=document.querySelector('#dashboard .pipelinePanel');
    if(!panel)return;
    const g=counts();
    const sig=Object.values(g).join('|');
    if(panel.dataset.truthSig===sig&&panel.dataset.pipelineTruth==='1')return;
    panel.dataset.truthSig=sig;
    panel.dataset.pipelineTruth='1';
    panel.style.gridTemplateColumns='repeat(5,minmax(0,1fr))';
    panel.innerHTML=Object.entries(g).map(([label,n])=>`<div class="pipeStage"><b>${n}</b><span>${safe(label)}</span></div>`).join('');
  }

  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;refresh()})}

  const oldRender=window.renderDashboard;
  if(typeof oldRender==='function'&&!oldRender.__omPipelineTruth){
    const wrapped=(...args)=>{const out=oldRender(...args);queueMicrotask(schedule);return out};
    wrapped.__omPipelineTruth=true;
    try{renderDashboard=wrapped}catch{}
    window.renderDashboard=wrapped;
  }

  const oldSet=window.setView;
  if(typeof oldSet==='function'&&!oldSet.__omPipelineTruth){
    const wrapped=(v,...args)=>{const out=oldSet(v,...args);if(v==='dashboard')queueMicrotask(schedule);return out};
    wrapped.__omPipelineTruth=true;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrapped(b.dataset.v)});
  }

  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))queueMicrotask(schedule)},true);
  queueMicrotask(schedule);
  window.OpportunityDashboardPipelineTruth={refresh:schedule,counts};
})();