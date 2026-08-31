(()=>{
  let scheduled=false,activeId='';
  const BEYOND=new Set(['Submitted','Interview','Offer received','Unsuccessful']);
  const html=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const localDate=()=>{const d=new Date(),off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10)};
  const prettyDate=v=>{if(!v)return'';const d=new Date(`${v}T12:00:00`);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):v};

  const style=document.createElement('style');
  style.textContent=`
    #tracker .markSubmitted,#tracker .submissionRecord{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(101,216,185,.34);background:rgba(101,216,185,.08);color:#86e4c8;border-radius:10px;padding:9px 11px;font-size:8px;font-weight:900;line-height:1;white-space:nowrap;cursor:pointer}
    #tracker .markSubmitted:hover,#tracker .submissionRecord:hover{background:rgba(101,216,185,.13);transform:translateY(-1px)}
    #submissionIntelModal{position:fixed;inset:0;z-index:10080;background:rgba(2,8,18,.72);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px}
    #submissionIntelModal.hide{display:none}
    .submissionIntelCard{width:min(680px,100%);max-height:min(820px,92vh);overflow:auto;background:#101927;color:#f7f9fd;border:1px solid rgba(153,168,195,.22);border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,.42);padding:26px}
    .submissionIntelTop{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.submissionIntelEy{font-size:9px;letter-spacing:.15em;text-transform:uppercase;font-weight:900;color:#bfa8ff}.submissionIntelCard h2{font-size:24px;line-height:1.08;margin:7px 0 7px}.submissionIntelLead{margin:0;color:#9ca9bc;font-size:12px;line-height:1.55}.submissionIntelClose{width:34px;height:34px;border-radius:10px;border:1px solid #334158;background:#172235;color:#fff;font-size:19px;cursor:pointer}
    .submissionIntelChecklist{display:grid;gap:8px;margin:20px 0;padding:14px;border:1px solid rgba(190,255,74,.18);background:rgba(190,255,74,.04);border-radius:14px}.submissionIntelChecklist div{display:flex;gap:9px;align-items:flex-start;font-size:11px;line-height:1.35;color:#cbd4e2}.submissionIntelChecklist i{font-style:normal;color:#c8ff50;font-weight:900}.submissionIntelOfficial{display:inline-flex;width:max-content;text-decoration:none;border:1px solid rgba(190,255,74,.28);background:#c8ff50;color:#07101b;padding:9px 12px;border-radius:10px;font-size:9px;font-weight:900}
    .submissionIntelGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.submissionIntelField{display:grid;gap:7px}.submissionIntelField.full{grid-column:1/-1}.submissionIntelField label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#9aa8bc}.submissionIntelField input,.submissionIntelField textarea{width:100%;box-sizing:border-box;border:1px solid #334158;background:#0b1421;color:#f7f9fd;border-radius:11px;padding:11px 12px;font:inherit;font-size:12px;outline:none}.submissionIntelField textarea{min-height:94px;resize:vertical}.submissionIntelField input:focus,.submissionIntelField textarea:focus{border-color:#8c6cff;box-shadow:0 0 0 3px rgba(140,108,255,.12)}
    .submissionIntelConfirm{margin-top:14px;padding:12px 13px;border:1px solid #334158;border-radius:12px;display:flex;align-items:flex-start;gap:10px;color:#cbd4e2;font-size:11px;line-height:1.4}.submissionIntelConfirm input{margin-top:2px}.submissionIntelError{margin-top:10px;color:#ff9d9d;font-size:11px;font-weight:800}.submissionIntelActions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.submissionIntelActions button{border-radius:11px;padding:10px 14px;font-size:10px;font-weight:900;cursor:pointer}.submissionIntelCancel{border:1px solid #334158;background:#172235;color:#eef3fb}.submissionIntelSave{border:1px solid #c8ff50;background:#c8ff50;color:#07101b}.submissionIntelSave:disabled{opacity:.55;cursor:not-allowed}
    html[data-om-theme="light"] .submissionIntelCard{background:#fff;color:#111827;border-color:#d9dce3;box-shadow:0 30px 90px rgba(18,24,38,.2)}html[data-om-theme="light"] .submissionIntelLead,html[data-om-theme="light"] .submissionIntelChecklist div,html[data-om-theme="light"] .submissionIntelConfirm{color:#667085}html[data-om-theme="light"] .submissionIntelClose,html[data-om-theme="light"] .submissionIntelCancel{background:#f3f4f6;color:#111827;border-color:#d8dce3}html[data-om-theme="light"] .submissionIntelField input,html[data-om-theme="light"] .submissionIntelField textarea{background:#fff;color:#111827;border-color:#d8dce3}html[data-om-theme="light"] .submissionIntelChecklist{background:#f7faef}
    @media(max-width:760px){#tracker .markSubmitted,#tracker .submissionRecord{width:100%}.submissionIntelGrid{grid-template-columns:1fr}.submissionIntelField.full{grid-column:auto}.submissionIntelCard{padding:20px;border-radius:18px}}
  `;
  document.head.appendChild(style);

  function source(){return (typeof tracks==='object'&&tracks)||window.tracks||{}}
  function record(t){return t?.checklist?.submission||null}
  function officialUrl(id,t){
    if(t?.exactVacancy?.url)return t.exactVacancy.url;
    const o=Array.isArray(window.opps)?window.opps.find(x=>x.Opportunity_ID===id):(typeof opps!=='undefined'&&Array.isArray(opps)?opps.find(x=>x.Opportunity_ID===id):null);
    return o?.Application_URL||o?.Official_Source_URL||'';
  }
  function providerName(id,t){
    if(t?.exactVacancy?.provider)return t.exactVacancy.provider;
    const o=typeof opps!=='undefined'&&Array.isArray(opps)?opps.find(x=>x.Opportunity_ID===id):null;
    return o?.Provider||'the provider';
  }

  function ensureModal(){
    if(document.getElementById('submissionIntelModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div id="submissionIntelModal" class="hide" role="dialog" aria-modal="true" aria-labelledby="submissionIntelTitle"><div class="submissionIntelCard"><div class="submissionIntelTop"><div><div class="submissionIntelEy">Submission intelligence</div><h2 id="submissionIntelTitle">Record provider submission</h2><p class="submissionIntelLead" id="submissionIntelLead"></p></div><button type="button" class="submissionIntelClose" aria-label="Close">×</button></div><div id="submissionIntelChecklist" class="submissionIntelChecklist"></div><a id="submissionIntelOfficial" class="submissionIntelOfficial" target="_blank" rel="noopener">Open official vacancy ↗</a><div class="submissionIntelGrid"><div class="submissionIntelField"><label for="submissionIntelDate">Submission date *</label><input id="submissionIntelDate" type="date"></div><div class="submissionIntelField"><label for="submissionIntelRef">Confirmation / reference</label><input id="submissionIntelRef" maxlength="160" placeholder="Optional provider reference"></div><div class="submissionIntelField full"><label for="submissionIntelNote">Submission note</label><textarea id="submissionIntelNote" maxlength="1600" placeholder="Optional: portal used, extra form completed, anything you may need later"></textarea></div></div><label class="submissionIntelConfirm"><input id="submissionIntelConfirmed" type="checkbox"><span>I have actually submitted this application on the provider site. Opportunity records the submission; it does not submit externally.</span></label><div id="submissionIntelError" class="submissionIntelError hide"></div><div class="submissionIntelActions"><button type="button" class="submissionIntelCancel">Cancel</button><button type="button" class="submissionIntelSave">Save submission</button></div></div></div>`);
    const modal=document.getElementById('submissionIntelModal');
    modal.querySelector('.submissionIntelClose').onclick=closeModal;
    modal.querySelector('.submissionIntelCancel').onclick=closeModal;
    modal.querySelector('.submissionIntelSave').onclick=saveRecord;
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hide'))closeModal()});
  }

  function openRecord(id){
    ensureModal();
    const t=source()[id];if(!t)return;activeId=id;
    const r=record(t)||{},beyond=BEYOND.has(String(t.stage||'')),provider=providerName(id,t),url=officialUrl(id,t);
    const modal=document.getElementById('submissionIntelModal');
    modal.querySelector('#submissionIntelTitle').textContent=beyond?'Submission record':'Record provider submission';
    modal.querySelector('#submissionIntelLead').textContent=beyond?`Review or update the submission details saved for ${provider}.`:`Finish the real provider-side submission for ${provider}, then save the confirmation here.`;
    modal.querySelector('#submissionIntelChecklist').innerHTML=`<div><i>1</i><span>Submit the finished application on the official provider page.</span></div><div><i>2</i><span>Complete any provider-only form, upload or acknowledgement shown there.</span></div><div><i>3</i><span>Save the confirmation/reference if the provider issues one.</span></div>`;
    const official=modal.querySelector('#submissionIntelOfficial');
    if(url){official.href=url;official.style.display='inline-flex'}else{official.removeAttribute('href');official.style.display='none'}
    modal.querySelector('#submissionIntelDate').value=r.submissionDate||localDate();
    modal.querySelector('#submissionIntelRef').value=r.confirmationRef||'';
    modal.querySelector('#submissionIntelNote').value=r.note||'';
    const confirmed=modal.querySelector('#submissionIntelConfirmed');confirmed.checked=beyond||Boolean(r.providerConfirmed);confirmed.disabled=beyond;
    modal.querySelector('.submissionIntelSave').textContent=beyond?'Save record changes':'Save submission';
    modal.querySelector('#submissionIntelError').classList.add('hide');
    modal.classList.remove('hide');
    setTimeout(()=>modal.querySelector('#submissionIntelDate')?.focus(),30);
  }
  function closeModal(){document.getElementById('submissionIntelModal')?.classList.add('hide');activeId=''}

  function saveRecord(){
    const modal=document.getElementById('submissionIntelModal'),t=source()[activeId];if(!modal||!t)return;
    const date=modal.querySelector('#submissionIntelDate').value,ref=modal.querySelector('#submissionIntelRef').value.trim(),note=modal.querySelector('#submissionIntelNote').value.trim(),confirmed=modal.querySelector('#submissionIntelConfirmed').checked,beyond=BEYOND.has(String(t.stage||''));
    const err=modal.querySelector('#submissionIntelError');
    if(!date){err.textContent='Add the date you submitted the application.';err.classList.remove('hide');return}
    if(!beyond&&!confirmed){err.textContent='Confirm that the application was actually submitted on the provider site before recording it.';err.classList.remove('hide');return}
    t.checklist??={documents:false,statement:false,references:false};
    const previous=t.checklist.submission||{},now=new Date().toISOString();
    t.checklist.submission={submissionDate:date,confirmationRef:ref,note,providerConfirmed:true,recordedAt:previous.recordedAt||now,updatedAt:now};
    if(!t.submittedAt)t.submittedAt=now;
    const id=activeId;closeModal();
    if(!beyond){
      if(typeof trackStage==='function')trackStage(id,'Submitted');
      else{t.stage='Submitted';try{persist?.()}catch{};try{renderTracker?.()}catch{};try{renderDashboard?.()}catch{};window.dispatchEvent(new CustomEvent('opportunity:statechange'))}
    }else{
      try{persist?.()}catch{}
      try{renderTracker?.()}catch{}
      try{renderDashboard?.()}catch{}
      window.dispatchEvent(new CustomEvent('opportunity:statechange'));
    }
  }

  function stageCopy(stage){
    if(stage==='Submitted')return'Application submitted — keep the confirmation record and monitor the provider source for updates.';
    if(stage==='Interview')return'Prepare interview examples, role-specific questions and the provider’s latest context.';
    if(stage==='Offer received')return'Review the offer, conditions and response deadline before deciding.';
    if(stage==='Unsuccessful')return'Close the application cleanly and capture any useful learning for the next one.';
    return'';
  }

  function addSubmissionActions(card,id,t){
    const wrap=card.querySelector('.exactTrackActions');if(!wrap)return;
    let mark=wrap.querySelector('.markSubmitted'),recBtn=wrap.querySelector('.submissionRecord');
    let s=null;try{s=window.OpportunityStudioTruth?.getState?.(t)||null}catch{}
    const canMark=t.stage==='Ready to submit'&&s?.sourceMode==='dedicatedPrepare'&&(s.progress>=100||s.finalReady);
    const beyond=BEYOND.has(String(t.stage||''));
    if(canMark){
      recBtn?.remove();
      if(!mark){mark=document.createElement('button');mark.type='button';mark.className='markSubmitted';const official=wrap.querySelector('.exactOfficial');if(official)wrap.insertBefore(mark,official);else wrap.appendChild(mark)}
      mark.dataset.exactTrackId=id;mark.textContent='Record submission';mark.title='Use after you have actually submitted on the provider site';
    }else mark?.remove();
    if(beyond){
      mark?.remove();
      if(!recBtn){recBtn=document.createElement('button');recBtn.type='button';recBtn.className='submissionRecord';const official=wrap.querySelector('.exactOfficial');if(official)wrap.insertBefore(recBtn,official);else wrap.appendChild(recBtn)}
      recBtn.dataset.exactTrackId=id;recBtn.textContent='Submission record';recBtn.title='Review or update the saved provider submission record';
    }else recBtn?.remove();
  }

  function updateBeyondCopy(card,t){
    const copy=stageCopy(String(t?.stage||''));if(!copy)return;
    const action=card.querySelector('.focusAction');if(!action)return;
    const label=action.querySelector('span'),body=action.querySelector('b'),small=action.querySelector('small'),r=record(t);
    if(label&&label.textContent!=='Do next · Tracker')label.textContent='Do next · Tracker';
    if(body&&body.textContent!==copy)body.textContent=copy;
    if(small){const ref=r?.confirmationRef?` · Ref ${r.confirmationRef}`:'';const text=r?.submissionDate?`Submitted ${prettyDate(r.submissionDate)}${ref}`:`Application Studio complete · Stage: ${t.stage}`;if(small.textContent!==text)small.textContent=text}
  }

  function decorate(){
    scheduled=false;
    const all=source();
    document.querySelectorAll('#tracker .focusCard.exactTracked[data-exact-track-id]').forEach(card=>{
      const id=card.dataset.exactTrackId,t=all[id];if(!t)return;
      addSubmissionActions(card,id,t);updateBeyondCopy(card,t);
    });
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(decorate)}

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.markSubmitted,.submissionRecord');if(!btn)return;
    const id=btn.dataset.exactTrackId||btn.closest('.focusCard')?.dataset?.exactTrackId;if(!id||!source()[id])return;
    e.preventDefault();e.stopPropagation();openRecord(id);
  },true);

  const oldRender=window.renderTracker;
  if(typeof oldRender==='function'&&!oldRender.__omSubmissionStageV114){
    const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};wrapped.__omSubmissionStageV114=true;try{renderTracker=wrapped}catch{}window.renderTracker=wrapped;
  }
  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle'))schedule()},true);
  ensureModal();schedule();

  window.OpportunitySubmissionStage={refresh:schedule,open:openRecord};
})();
