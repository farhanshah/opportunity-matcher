(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  let scheduled=false;

  const style=document.createElement('style');
  style.textContent=`
    .focusTask.studioSynced{cursor:default}
    .focusTask.studioSynced input{pointer-events:none}
    .focusTask.studioSynced.done{border-color:rgba(216,255,105,.28);background:rgba(216,255,105,.06)}
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

  function setTask(label,text,done){
    if(!label)return;
    label.classList.add('studioSynced');
    label.classList.toggle('done',Boolean(done));
    const input=label.querySelector('input');
    if(input){
      input.checked=Boolean(done);
      input.disabled=true;
      input.removeAttribute('onchange');
    }
    const clean=text+(done?' ✓':'');
    const current=[...label.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
    if(current!==clean){
      [...label.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.remove());
      label.appendChild(document.createTextNode(' '+clean));
    }
    label.title='Synced from Application Studio';
  }

  function decorateCards(){
    document.querySelectorAll('#tracker .focusCard').forEach(card=>{
      const row=rowForCard(card);if(!row?.t?.exactVacancy)return;
      const s=studioState(row.t);if(!s||s.sourceMode!=='dedicatedPrepare')return;
      const labels=[...card.querySelectorAll('.focusTasks .focusTask')];
      if(labels.length<3)return;
      setTask(labels[0],'CV',s.cvReady);
      setTask(labels[1],'Cover',s.motReady);
      setTask(labels[2],'Writing sample',s.writingReady);
    });
  }

  function completedChecks(){
    let total=0;
    for(const t of Object.values(source())){
      const s=studioState(t);
      if(s?.sourceMode==='dedicatedPrepare'){
        total+=Number(s.verifyDone||0);
      }else{
        total+=['documents','statement','references'].filter(k=>t?.checklist?.[k]).length;
      }
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

  const oldRender=window.renderTracker;
  if(typeof oldRender==='function'&&!oldRender.__omPrepSummaryV113){
    const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};
    wrapped.__omPrepSummaryV113=true;
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
  }

  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle'))schedule();
  },true);

  schedule();
  window.OpportunityTrackerPrepSummary={refresh:schedule};
})();
