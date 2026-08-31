(()=>{
  let scheduled=false;

  const style=document.createElement('style');
  style.textContent=`
    #tracker .markSubmitted{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(101,216,185,.34);background:rgba(101,216,185,.08);color:#86e4c8;border-radius:10px;padding:9px 11px;font-size:8px;font-weight:900;line-height:1;white-space:nowrap;cursor:pointer}
    #tracker .markSubmitted:hover{background:rgba(101,216,185,.13);transform:translateY(-1px)}
    @media(max-width:760px){#tracker .markSubmitted{width:100%}}
  `;
  document.head.appendChild(style);

  function source(){return (typeof tracks==='object'&&tracks)||window.tracks||{}}

  function stageCopy(stage){
    if(stage==='Submitted')return'Application submitted — monitor your inbox and the official provider source for updates.';
    if(stage==='Interview')return'Prepare interview examples, role-specific questions and the provider’s latest context.';
    if(stage==='Offer received')return'Review the offer, conditions and response deadline before deciding.';
    if(stage==='Unsuccessful')return'Close the application cleanly and capture any useful learning for the next one.';
    return'';
  }

  function addSubmittedAction(card,id,t){
    const wrap=card.querySelector('.exactTrackActions');if(!wrap)return;
    let btn=wrap.querySelector('.markSubmitted');
    let s=null;try{s=window.OpportunityStudioTruth?.getState?.(t)||null}catch{}
    const canMark=t.stage==='Ready to submit'&&s?.sourceMode==='dedicatedPrepare'&&(s.progress>=100||s.finalReady);
    if(!canMark){btn?.remove();return}
    if(!btn){
      btn=document.createElement('button');btn.type='button';btn.className='markSubmitted';
      const official=wrap.querySelector('.exactOfficial');
      if(official)wrap.insertBefore(btn,official);else wrap.appendChild(btn);
    }
    btn.dataset.exactTrackId=id;
    btn.textContent='Mark submitted ✓';
    btn.title='Use only after you have actually submitted on the provider site';
  }

  function updateBeyondCopy(card,t){
    const copy=stageCopy(String(t?.stage||''));if(!copy)return;
    const action=card.querySelector('.focusAction');if(!action)return;
    const label=action.querySelector('span'),body=action.querySelector('b'),small=action.querySelector('small');
    if(label&&label.textContent!=='Do next · Tracker')label.textContent='Do next · Tracker';
    if(body&&body.textContent!==copy)body.textContent=copy;
    if(small){const text=`Application Studio complete · Stage: ${t.stage}`;if(small.textContent!==text)small.textContent=text}
  }

  function decorate(){
    scheduled=false;
    const all=source();
    document.querySelectorAll('#tracker .focusCard.exactTracked[data-exact-track-id]').forEach(card=>{
      const id=card.dataset.exactTrackId,t=all[id];if(!t)return;
      addSubmittedAction(card,id,t);
      updateBeyondCopy(card,t);
    });
  }

  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(decorate)}

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.markSubmitted');if(!btn)return;
    const id=btn.dataset.exactTrackId||btn.closest('.focusCard')?.dataset?.exactTrackId;
    const t=source()[id];if(!id||!t)return;
    e.preventDefault();e.stopPropagation();
    const ok=window.confirm('Mark this application as submitted?\n\nOnly confirm after you have actually submitted it on the provider site.');
    if(!ok)return;
    t.submittedAt=t.submittedAt||new Date().toISOString();
    if(typeof trackStage==='function')trackStage(id,'Submitted');
    else{t.stage='Submitted';try{persist?.()}catch{};try{renderTracker?.()}catch{};try{renderDashboard?.()}catch{}}
  },true);

  const oldRender=window.renderTracker;
  if(typeof oldRender==='function'&&!oldRender.__omSubmissionStageV114){
    const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};
    wrapped.__omSubmissionStageV114=true;
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
  }

  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle'))schedule()},true);
  schedule();

  window.OpportunitySubmissionStage={refresh:schedule};
})();
