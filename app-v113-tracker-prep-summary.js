(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  let scheduled=false;

  const style=document.createElement('style');
  style.textContent=`
    .focusTask.studioSynced{cursor:default}
    .focusTask.studioSynced input{pointer-events:none}
    .focusTask.studioSynced.done{border-color:rgba(216,255,105,.28);background:rgba(216,255,105,.06)}
    .focusTask.studioSynced.notRequested{border-color:rgba(119,230,207,.24);background:rgba(119,230,207,.045);color:#a8e9dc}
    .focusTask.studioSynced.notRequested input{opacity:.45}
    .focusTask.studioSynced span{display:inline-flex;align-items:center;gap:5px}
  `;
  document.head.appendChild(style);

  function source(){return (typeof tracks==='object'&&tracks)||window.tracks||{}}

  function rowForCard(card){
    const all=source();
    const id=card.dataset.exactTrackId;
    if(id&&all[id])return{id,t:all[id]};
    const title=norm(card.querySelector('.focusTitle')?.textContent||'');
    if(!title)return null;
    const entry=Object.entries(all).find(([,t])=>norm(t?.exactVacancy?.title)===title);
    return entry?{id:entry[0],t:entry[1]}:null;
  }

  function studioState(t){
    try{return window.OpportunityStudioTruth?.getState?.(t)||null}catch{return null}
  }

  function documentPolicy(t){
    const f=t?.preparation?.rolePack?.finalApplication||{};
    const policy=f.providerDocumentPolicy||{};
    const writingNotRequested=Boolean(f.writingSampleNotRequested)||policy.writingSample==='not_requested';
    const pdfNotRequested=Boolean(f.singlePdfNotRequested)||policy.combinedPdf==='not_requested';
    return{writingNotRequested,pdfNotRequested,notRequestedCount:Number(writingNotRequested)+Number(pdfNotRequested)};
  }

  function replaceLabelText(label,clean){
    const current=[...label.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
    if(current!==clean){
      [...label.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.remove());
      label.appendChild(document.createTextNode(' '+clean));
    }
  }

  function setTask(label,text,done){
    if(!label)return;
    label.classList.add('studioSynced');
    label.classList.remove('notRequested');
    label.classList.toggle('done',Boolean(done));
    const input=label.querySelector('input');
    if(input){
      input.checked=Boolean(done);
      input.disabled=true;
      input.removeAttribute('onchange');
    }
    replaceLabelText(label,text+(done?' ✓':''));
    label.title='Synced from Application Studio';
  }

  function setNotRequested(label,text){
    if(!label)return;
    label.classList.add('studioSynced','notRequested');
    label.classList.remove('done');
    const input=label.querySelector('input');
    if(input){
      input.checked=false;
      input.disabled=true;
      input.removeAttribute('onchange');
    }
    replaceLabelText(label,`${text} · Not requested`);
    label.title='Not requested in the published vacancy; the final provider form re-check remains authoritative.';
  }

  function decorateCards(){
    document.querySelectorAll('#tracker .focusCard').forEach(card=>{
      const row=rowForCard(card);if(!row?.t?.exactVacancy)return;
      const s=studioState(row.t);if(!s||s.sourceMode!=='dedicatedPrepare')return;
      const policy=documentPolicy(row.t);
      const labels=[...card.querySelectorAll('.focusTasks .focusTask')];
      if(labels.length>=3){
        setTask(labels[0],'CV',s.cvReady);
        setTask(labels[1],'Cover',s.motReady);
        if(policy.writingNotRequested)setNotRequested(labels[2],'Writing sample');
        else setTask(labels[2],'Writing sample',s.writingReady);
      }

      const required=[
        {ready:s.cvReady,notRequested:false},
        {ready:s.motReady,notRequested:false},
        {ready:s.writingReady,notRequested:policy.writingNotRequested},
        {ready:s.pdfReady,notRequested:policy.pdfNotRequested}
      ].filter(x=>!x.notRequested);
      const requiredDone=required.filter(x=>x.ready).length;
      const small=card.querySelector('.focusAction small');
      if(small&&policy.notRequestedCount){
        const docMeta=requiredDone===required.length?'all required document gates resolved':`${requiredDone}/${required.length} required documents ready`;
        small.textContent=`${s.verifyDone}/${s.verifyTotal} official checks · ${docMeta}`;
      }
    });
  }

  function completedChecks(){
    let total=0;
    const cards=[...document.querySelectorAll('#tracker .focusCard:not(.omExpiredTrackV224)')];
    for(const card of cards){
      const row=rowForCard(card);if(!row?.t)continue;
      const s=studioState(row.t);
      if(s?.sourceMode==='dedicatedPrepare')total+=Number(s.verifyDone||0);
      else total+=['documents','statement','references'].filter(k=>row.t?.checklist?.[k]).length;
    }
    return total;
  }

  function decorateSummary(){
    const stats=[...document.querySelectorAll('#tracker .focusSummaryStat')];
    if(stats.length<3)return;
    const middle=stats[1];
    const value=middle.querySelector('b'),label=middle.querySelector('span');
    const n=completedChecks();
    if(value&&value.textContent!==String(n))value.textContent=String(n);
    if(label&&label.textContent!=='Checks complete')label.textContent='Checks complete';
  }

  function refresh(){scheduled=false;decorateCards();decorateSummary()}
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(refresh)}
  function settle(){
    schedule();
    setTimeout(schedule,120);
    setTimeout(schedule,260);
  }

  const oldRender=window.renderTracker;
  if(typeof oldRender==='function'&&!oldRender.__omPrepSummaryV113){
    const wrapped=(...args)=>{const out=oldRender(...args);settle();return out};
    wrapped.__omPrepSummaryV113=true;
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
  }

  window.addEventListener('opportunity:statechange',settle);
  window.addEventListener('opportunity:hydrated',settle);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle,.prepOpen'))settle();
  },true);

  settle();
  window.OpportunityTrackerPrepSummary={refresh:settle};
})();
