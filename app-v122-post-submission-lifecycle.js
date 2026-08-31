(()=>{
  const ACTIVE=new Set(['Submitted','Interview','Offer received','Unsuccessful']);
  const html=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const localDate=()=>{const d=new Date(),off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10)};
  const pretty=v=>{if(!v)return'';const d=new Date(`${v}T12:00:00`);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):v};
  const daysUntil=v=>{if(!v)return null;const t=new Date(`${v}T23:59:59`).getTime();return Number.isFinite(t)?Math.ceil((t-Date.now())/864e5):null};
  const source=()=>((typeof tracks==='object'&&tracks)||window.tracks||{});
  const submission=t=>t?.checklist?.submission||null;
  const lifecycle=t=>t?.checklist?.lifecycle||{};
  let activeId='',scheduled=false;

  const style=document.createElement('style');
  style.textContent=`
    #tracker .applicationTimeline{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(140,108,255,.38);background:rgba(140,108,255,.09);color:#c7b8ff;border-radius:10px;padding:9px 11px;font-size:8px;font-weight:900;line-height:1;white-space:nowrap;cursor:pointer}
    #tracker .applicationTimeline:hover{background:rgba(140,108,255,.14);transform:translateY(-1px)}
    #postSubmissionModal{position:fixed;inset:0;z-index:10090;background:rgba(2,8,18,.72);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px}
    #postSubmissionModal.hide{display:none}.postLifeCard{width:min(760px,100%);max-height:min(860px,92vh);overflow:auto;background:#101927;color:#f7f9fd;border:1px solid rgba(153,168,195,.22);border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,.42);padding:26px}
    .postLifeTop{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.postLifeEy{font-size:9px;letter-spacing:.15em;text-transform:uppercase;font-weight:900;color:#bfa8ff}.postLifeCard h2{font-size:24px;line-height:1.08;margin:7px 0}.postLifeLead{margin:0;color:#9ca9bc;font-size:12px;line-height:1.5}.postLifeClose{width:34px;height:34px;border-radius:10px;border:1px solid #334158;background:#172235;color:#fff;font-size:19px;cursor:pointer}
    .postLifeTimeline{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:20px 0}.postLifeStep{border:1px solid #2d3a4e;background:#0d1623;border-radius:13px;padding:11px;min-height:60px}.postLifeStep span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#8492a7;font-weight:900}.postLifeStep b{display:block;margin-top:5px;font-size:11px;line-height:1.25}.postLifeStep.done{border-color:rgba(101,216,185,.3);background:rgba(101,216,185,.055)}.postLifeStep.done span{color:#72ddc0}.postLifeStep.current{border-color:rgba(200,255,80,.34);background:rgba(200,255,80,.055)}.postLifeStep.current span{color:#c8ff50}
    .postLifeStageBar{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end;padding:14px;border:1px solid #2d3a4e;border-radius:14px;background:#0d1623}.postLifeField{display:grid;gap:7px}.postLifeField label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#9aa8bc}.postLifeField input,.postLifeField select,.postLifeField textarea{width:100%;box-sizing:border-box;border:1px solid #334158;background:#0b1421;color:#f7f9fd;border-radius:11px;padding:11px 12px;font:inherit;font-size:12px;outline:none}.postLifeField textarea{min-height:90px;resize:vertical}.postLifeField input:focus,.postLifeField select:focus,.postLifeField textarea:focus{border-color:#8c6cff;box-shadow:0 0 0 3px rgba(140,108,255,.12)}
    .postLifeSection{margin-top:16px;padding:16px;border:1px solid #2d3a4e;border-radius:15px}.postLifeSectionHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:13px}.postLifeSectionHead b{font-size:13px}.postLifeSectionHead span{font-size:9px;color:#8492a7}.postLifeGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.postLifeField.full{grid-column:1/-1}.postLifeHint{margin-top:9px;font-size:9px;color:#8492a7;line-height:1.45}.postLifeError{margin-top:10px;color:#ff9d9d;font-size:11px;font-weight:800}.postLifeActions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.postLifeActions button{border-radius:11px;padding:10px 14px;font-size:10px;font-weight:900;cursor:pointer}.postLifeCancel{border:1px solid #334158;background:#172235;color:#eef3fb}.postLifeSave{border:1px solid #c8ff50;background:#c8ff50;color:#07101b}
    html[data-om-theme="light"] .postLifeCard{background:#fff;color:#111827;border-color:#d9dce3;box-shadow:0 30px 90px rgba(18,24,38,.2)}html[data-om-theme="light"] .postLifeLead,html[data-om-theme="light"] .postLifeHint{color:#667085}html[data-om-theme="light"] .postLifeClose,html[data-om-theme="light"] .postLifeCancel{background:#f3f4f6;color:#111827;border-color:#d8dce3}html[data-om-theme="light"] .postLifeStep,html[data-om-theme="light"] .postLifeStageBar,html[data-om-theme="light"] .postLifeSection{background:#fafafa;border-color:#e0e3e8}html[data-om-theme="light"] .postLifeStep.done{background:#f3faf7}html[data-om-theme="light"] .postLifeStep.current{background:#f8fbe9}html[data-om-theme="light"] .postLifeField input,html[data-om-theme="light"] .postLifeField select,html[data-om-theme="light"] .postLifeField textarea{background:#fff;color:#111827;border-color:#d8dce3}
    @media(max-width:760px){#tracker .applicationTimeline{width:100%}.postLifeTimeline{grid-template-columns:1fr 1fr}.postLifeGrid{grid-template-columns:1fr}.postLifeField.full{grid-column:auto}.postLifeStageBar{grid-template-columns:1fr}.postLifeCard{padding:20px;border-radius:18px}}
  `;
  document.head.appendChild(style);

  function ensureModal(){
    if(document.getElementById('postSubmissionModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div id="postSubmissionModal" class="hide" role="dialog" aria-modal="true" aria-labelledby="postLifeTitle"><div class="postLifeCard"><div class="postLifeTop"><div><div class="postLifeEy">Application timeline</div><h2 id="postLifeTitle">Post-submission record</h2><p id="postLifeLead" class="postLifeLead"></p></div><button type="button" class="postLifeClose" aria-label="Close">×</button></div><div id="postLifeTimeline" class="postLifeTimeline"></div><div class="postLifeStageBar"><div class="postLifeField"><label for="postLifeStage">Current application stage</label><select id="postLifeStage"><option>Submitted</option><option>Interview</option><option>Offer received</option><option>Unsuccessful</option></select></div><div class="postLifeHint">Changing this uses the same Tracker stage — no parallel status is created.</div></div><div id="postLifeDynamic"></div><div id="postLifeError" class="postLifeError hide"></div><div class="postLifeActions"><button type="button" class="postLifeCancel">Cancel</button><button type="button" class="postLifeSave">Save timeline</button></div></div></div>`);
    const modal=document.getElementById('postSubmissionModal');
    modal.querySelector('.postLifeClose').onclick=closeModal;
    modal.querySelector('.postLifeCancel').onclick=closeModal;
    modal.querySelector('.postLifeSave').onclick=saveTimeline;
    modal.querySelector('#postLifeStage').addEventListener('change',renderDynamic);
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hide'))closeModal()});
  }

  function timelineMarkup(t){
    const r=lifecycle(t),s=submission(t),stage=String(t.stage||'Submitted');
    const interviewDate=r.interview?.date||'',offerDate=r.offer?.date||'',decisionDate=r.unsuccessful?.date||'';
    const submittedLabel=s?.submissionDate?pretty(s.submissionDate):'Recorded';
    const steps=[
      ['Submitted',submittedLabel,true,stage==='Submitted'],
      ['Interview',interviewDate?pretty(interviewDate):(stage==='Interview'?'Current':'—'),Boolean(interviewDate)||['Interview','Offer received','Unsuccessful'].includes(stage),stage==='Interview'],
      ['Offer',offerDate?pretty(offerDate):(stage==='Offer received'?'Current':'—'),Boolean(offerDate)||stage==='Offer received',stage==='Offer received'],
      ['Decision',decisionDate?pretty(decisionDate):(stage==='Unsuccessful'?'Closed':'—'),Boolean(decisionDate)||stage==='Unsuccessful',stage==='Unsuccessful']
    ];
    return steps.map(([name,value,done,current])=>`<div class="postLifeStep ${done?'done':''} ${current?'current':''}"><span>${html(name)}</span><b>${html(value)}</b></div>`).join('');
  }

  function field(label,id,type='text',value='',extra=''){
    if(type==='textarea')return `<div class="postLifeField ${extra}"><label for="${id}">${label}</label><textarea id="${id}">${html(value)}</textarea></div>`;
    return `<div class="postLifeField ${extra}"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${html(value)}"></div>`;
  }

  function renderDynamic(){
    const t=source()[activeId];if(!t)return;
    const r=lifecycle(t),stage=document.getElementById('postLifeStage')?.value||t.stage;
    const host=document.getElementById('postLifeDynamic');if(!host)return;
    let out='';
    if(stage==='Submitted'){
      const f=r.followUp||{};
      out=`<section class="postLifeSection"><div class="postLifeSectionHead"><div><b>Waiting & follow-up</b><span>Keep the next provider-side action visible.</span></div></div><div class="postLifeGrid">${field('Follow-up date','postLifeFollowDate','date',f.date||'')}${field('Provider contact / channel','postLifeFollowContact','text',f.contact||'')}${field('Follow-up note','postLifeFollowNote','textarea',f.note||'','full')}</div><div class="postLifeHint">Leave the follow-up date blank when the provider explicitly asks applicants not to contact them.</div></section>`;
    }else if(stage==='Interview'){
      const x=r.interview||{};
      out=`<section class="postLifeSection"><div class="postLifeSectionHead"><div><b>Interview details</b><span>Store logistics and preparation context in one place.</span></div></div><div class="postLifeGrid">${field('Interview date','postLifeInterviewDate','date',x.date||'')}${field('Interview time','postLifeInterviewTime','time',x.time||'')}<div class="postLifeField"><label for="postLifeInterviewFormat">Format</label><select id="postLifeInterviewFormat">${['','Online','In person','Phone','Assessment centre','Other'].map(v=>`<option value="${v}" ${x.format===v?'selected':''}>${v||'Select format'}</option>`).join('')}</select></div>${field('Link / location','postLifeInterviewLocation','text',x.location||'')}${field('Contact / interviewer','postLifeInterviewContact','text',x.contact||'')}${field('Preparation notes','postLifeInterviewNotes','textarea',x.notes||'','full')}</div></section>`;
    }else if(stage==='Offer received'){
      const x=r.offer||{};
      out=`<section class="postLifeSection"><div class="postLifeSectionHead"><div><b>Offer record</b><span>Capture the decision window without storing sensitive documents.</span></div></div><div class="postLifeGrid">${field('Offer received date','postLifeOfferDate','date',x.date||localDate())}${field('Response deadline','postLifeOfferDeadline','date',x.responseDeadline||'')}${field('Offer / decision notes','postLifeOfferNotes','textarea',x.notes||'','full')}</div></section>`;
    }else{
      const x=r.unsuccessful||{};
      out=`<section class="postLifeSection"><div class="postLifeSectionHead"><div><b>Outcome & learning</b><span>Close the loop and keep anything useful for the next application.</span></div></div><div class="postLifeGrid">${field('Decision date','postLifeDecisionDate','date',x.date||localDate())}${field('Provider feedback','postLifeFeedback','textarea',x.feedback||'','full')}${field('What to reuse next time','postLifeLearning','textarea',x.learning||'','full')}</div></section>`;
    }
    host.innerHTML=out;
  }

  function openTimeline(id){
    ensureModal();const t=source()[id];if(!t||!ACTIVE.has(String(t.stage||'')))return;activeId=id;
    const s=submission(t),modal=document.getElementById('postSubmissionModal');
    modal.querySelector('#postLifeLead').textContent=s?.submissionDate?`Submitted ${pretty(s.submissionDate)}${s.confirmationRef?` · Reference ${s.confirmationRef}`:''}. Keep every later milestone attached to this application.`:'Keep follow-up, interview and outcome details attached to this tracked application.';
    modal.querySelector('#postLifeStage').value=t.stage;
    modal.querySelector('#postLifeTimeline').innerHTML=timelineMarkup(t);
    modal.querySelector('#postLifeError').classList.add('hide');
    renderDynamic();modal.classList.remove('hide');
  }
  function closeModal(){document.getElementById('postSubmissionModal')?.classList.add('hide');activeId=''}
  const value=id=>document.getElementById(id)?.value?.trim?.()||'';

  function saveTimeline(){
    const t=source()[activeId],modal=document.getElementById('postSubmissionModal');if(!t||!modal)return;
    const stage=value('postLifeStage'),previous=lifecycle(t),now=new Date().toISOString();
    const next={...previous,updatedAt:now};
    if(stage==='Submitted')next.followUp={date:value('postLifeFollowDate'),contact:value('postLifeFollowContact'),note:value('postLifeFollowNote')};
    if(stage==='Interview')next.interview={date:value('postLifeInterviewDate'),time:value('postLifeInterviewTime'),format:value('postLifeInterviewFormat'),location:value('postLifeInterviewLocation'),contact:value('postLifeInterviewContact'),notes:value('postLifeInterviewNotes')};
    if(stage==='Offer received')next.offer={date:value('postLifeOfferDate'),responseDeadline:value('postLifeOfferDeadline'),notes:value('postLifeOfferNotes')};
    if(stage==='Unsuccessful')next.unsuccessful={date:value('postLifeDecisionDate'),feedback:value('postLifeFeedback'),learning:value('postLifeLearning')};
    t.checklist??={documents:false,statement:false,references:false};t.checklist.lifecycle=next;
    const id=activeId,changed=String(t.stage||'')!==stage;closeModal();
    if(changed&&typeof trackStage==='function')trackStage(id,stage);
    else{
      try{persist?.()}catch{}
      try{renderTracker?.()}catch{}
      try{renderDashboard?.()}catch{}
      window.dispatchEvent(new CustomEvent('opportunity:statechange'));
    }
  }

  function nextCopy(t){
    const stage=String(t.stage||''),r=lifecycle(t);
    if(stage==='Submitted'){
      const d=r.followUp?.date,delta=daysUntil(d);
      if(d&&delta!==null){if(delta<0)return`Follow-up was due ${Math.abs(delta)} ${Math.abs(delta)===1?'day':'days'} ago — review the provider guidance before contacting them.`;if(delta===0)return'Follow-up is due today — review the provider guidance before contacting them.';return`Monitor for a response. Follow-up planned for ${pretty(d)}.`}
      return'Wait for the provider response and record a follow-up date only if the provider allows contact.';
    }
    if(stage==='Interview'){
      const d=r.interview?.date,delta=daysUntil(d);
      if(d&&delta!==null){if(delta===0)return'Interview is today — review your examples, questions and logistics.';if(delta>0)return`Interview on ${pretty(d)} — prepare examples, questions and logistics.`;return`Interview date was ${pretty(d)} — record the next provider update.`}
      return'Add the interview date, format and preparation notes to your application timeline.';
    }
    if(stage==='Offer received'){
      const d=r.offer?.responseDeadline,delta=daysUntil(d);
      if(d&&delta!==null){if(delta<0)return`Offer response deadline passed ${Math.abs(delta)} ${Math.abs(delta)===1?'day':'days'} ago — verify the provider status.`;if(delta===0)return'Offer response is due today — review all conditions before deciding.';return`Offer response due ${pretty(d)} — review the conditions before deciding.`}
      return'Record the response deadline and review the offer conditions before deciding.';
    }
    if(stage==='Unsuccessful')return r.unsuccessful?.learning?'Application closed — your learning notes are saved for the next application.':'Application closed — capture feedback and what you want to reuse next time.';
    return'';
  }

  function decorate(){
    scheduled=false;const all=source();
    document.querySelectorAll('#tracker .focusCard.exactTracked[data-exact-track-id]').forEach(card=>{
      const id=card.dataset.exactTrackId,t=all[id];if(!t)return;const wrap=card.querySelector('.exactTrackActions');
      let btn=wrap?.querySelector('.applicationTimeline');
      if(ACTIVE.has(String(t.stage||''))&&wrap){
        if(!btn){btn=document.createElement('button');btn.type='button';btn.className='applicationTimeline';const official=wrap.querySelector('.exactOfficial');if(official)wrap.insertBefore(btn,official);else wrap.appendChild(btn)}
        btn.dataset.exactTrackId=id;btn.textContent='Application timeline';
        const action=card.querySelector('.focusAction'),copy=nextCopy(t);
        if(action&&copy){const label=action.querySelector('span'),body=action.querySelector('b'),small=action.querySelector('small'),s=submission(t);if(label)label.textContent='Do next · application timeline';if(body)body.textContent=copy;if(small&&s?.submissionDate)small.textContent=`Submitted ${pretty(s.submissionDate)}${s.confirmationRef?` · Ref ${s.confirmationRef}`:''}`}
      }else btn?.remove();
    });
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(decorate)}

  document.addEventListener('click',e=>{const btn=e.target.closest?.('.applicationTimeline');if(!btn)return;const id=btn.dataset.exactTrackId||btn.closest('.focusCard')?.dataset?.exactTrackId;if(!id)return;e.preventDefault();e.stopPropagation();openTimeline(id)},true);
  const oldRender=window.renderTracker;
  if(typeof oldRender==='function'&&!oldRender.__omPostSubmissionV122){const wrapped=(...args)=>{const out=oldRender(...args);schedule();return out};wrapped.__omPostSubmissionV122=true;try{renderTracker=wrapped}catch{}window.renderTracker=wrapped}
  window.addEventListener('opportunity:statechange',schedule);
  schedule();
  window.OpportunityPostSubmission={refresh:schedule,open:openTimeline};
})();