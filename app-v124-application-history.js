(()=>{
  const HISTORY_KEY='history';
  const MAX_EVENTS=60;
  const source=()=>((typeof tracks==='object'&&tracks)||window.tracks||{});
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const now=()=>new Date().toISOString();
  const prettyDateTime=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):String(v||'')};
  const prettyDate=v=>{if(!v)return'';const d=new Date(`${v}T12:00:00`);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):String(v)};
  let baselineReady=false,scheduled=false,writing=false,activeId='';
  const snapshots=new Map();

  const style=document.createElement('style');
  style.textContent=`
    #tracker .applicationHistoryBtn{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid rgba(140,108,255,.34);background:rgba(140,108,255,.08);color:#c8baff;border-radius:10px;padding:9px 11px;font-size:8px;font-weight:900;line-height:1;white-space:nowrap;cursor:pointer}
    #tracker .applicationHistoryBtn:hover{background:rgba(140,108,255,.14);transform:translateY(-1px)}
    #tracker .boardCard .applicationHistoryBtn{width:100%;margin-top:7px}
    #applicationHistoryModal{position:fixed;inset:0;z-index:10120;background:rgba(2,8,18,.72);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px}
    #applicationHistoryModal.hide{display:none}.historyCard{width:min(720px,100%);max-height:min(820px,92vh);overflow:auto;background:#101927;color:#f7f9fd;border:1px solid rgba(153,168,195,.22);border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,.42);padding:26px}.historyTop{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.historyEy{font-size:9px;letter-spacing:.15em;text-transform:uppercase;font-weight:900;color:#bfa8ff}.historyCard h2{font-size:24px;line-height:1.08;margin:7px 0}.historyLead{margin:0;color:#9ca9bc;font-size:12px;line-height:1.5}.historyClose{width:34px;height:34px;border-radius:10px;border:1px solid #334158;background:#172235;color:#fff;font-size:19px;cursor:pointer}.historySnapshot{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.historySnap{border:1px solid #2d3a4e;background:#0d1623;border-radius:13px;padding:12px}.historySnap span{display:block;font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#8492a7;font-weight:900}.historySnap b{display:block;margin-top:5px;font-size:12px;line-height:1.3}.historyList{display:grid;gap:0;margin-top:8px}.historyEvent{display:grid;grid-template-columns:24px 1fr;gap:11px;position:relative;padding:0 0 18px}.historyEvent:not(:last-child):before{content:"";position:absolute;left:11px;top:24px;bottom:0;width:1px;background:#2d3a4e}.historyDot{width:22px;height:22px;border-radius:999px;border:1px solid #3b4960;background:#172235;display:grid;place-items:center;font-size:10px;font-weight:950;color:#c8ff50;z-index:1}.historyEvent.stage .historyDot{color:#c8ff50}.historyEvent.milestone .historyDot{color:#72ddc0}.historyEvent.system .historyDot{color:#bfa8ff}.historyBody{padding-top:1px}.historyBody b{display:block;font-size:12px}.historyBody p{margin:4px 0 0;color:#9aa8ba;font-size:10px;line-height:1.45}.historyBody time{display:block;margin-top:5px;color:#6f7d92;font-size:8px;font-weight:800;letter-spacing:.03em}.historyEmpty{border:1px dashed #334158;border-radius:14px;padding:18px;color:#8997aa;font-size:11px;text-align:center}.historyNote{margin-top:14px;padding:10px 12px;border-radius:11px;background:rgba(140,108,255,.07);border:1px solid rgba(140,108,255,.2);color:#aeb9ca;font-size:9px;line-height:1.45}
    html[data-om-theme="light"] #tracker .applicationHistoryBtn{background:#f3f0ff;border-color:#aa96eb;color:#4f3c9b}html[data-om-theme="light"] #tracker .applicationHistoryBtn:hover{background:#ebe6ff}html[data-om-theme="light"] .historyCard{background:#fff;color:#111827;border-color:#d9dce3;box-shadow:0 30px 90px rgba(18,24,38,.2)}html[data-om-theme="light"] .historyLead,html[data-om-theme="light"] .historyBody p,html[data-om-theme="light"] .historyNote{color:#667085}html[data-om-theme="light"] .historyClose{background:#f3f4f6;color:#111827;border-color:#d8dce3}html[data-om-theme="light"] .historySnap,html[data-om-theme="light"] .historyDot{background:#fafafa;border-color:#e0e3e8}html[data-om-theme="light"] .historyEvent:not(:last-child):before{background:#e0e3e8}html[data-om-theme="light"] .historyNote{background:#f7f5ff;border-color:#ddd4ff}
    @media(max-width:760px){#tracker .applicationHistoryBtn{width:100%}.historyCard{padding:20px;border-radius:18px}.historySnapshot{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function ensureStore(t){
    t.checklist??={documents:false,statement:false,references:false};
    if(!Array.isArray(t.checklist[HISTORY_KEY]))t.checklist[HISTORY_KEY]=[];
    return t.checklist[HISTORY_KEY];
  }
  function eventId(prefix='evt'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
  function pushEvent(t,event,{onceKey=''}={}){
    const list=ensureStore(t);
    if(onceKey&&list.some(x=>x?.onceKey===onceKey))return false;
    list.push({id:eventId(event.type||'evt'),at:now(),type:'system',label:'Application update',detail:'',...event,onceKey:onceKey||event.onceKey||''});
    if(list.length>MAX_EVENTS)list.splice(0,list.length-MAX_EVENTS);
    return true;
  }
  function seedExisting(id,t){
    const list=ensureStore(t);if(list.length)return false;
    return pushEvent(t,{type:'system',label:'History tracking started',detail:`Existing application adopted at the current stage: ${t.stage||'Saved'}. Earlier timestamps were not reconstructed.`},{onceKey:'history-started'});
  }
  function seedNew(t){
    const list=ensureStore(t);if(list.length)return false;
    return pushEvent(t,{type:'stage',label:'Added to tracker',detail:`Application entered the tracker at stage: ${t.stage||'Saved'}.`},{onceKey:'tracked'});
  }
  function stageCopy(value,t,old){
    const s=String(value||'Saved'),submission=t?.checklist?.submission;
    const map={
      Saved:['Saved to tracker','Application is in the shortlist.'],
      Researching:['Research started','Provider and eligibility details are being reviewed.'],
      'Preparing documents':['Preparation started','Application documents and evidence are being prepared.'],
      Drafting:['Drafting started','Application responses are being drafted or refined.'],
      'Ready to submit':['Application pack ready','Preparation is complete enough to move to the provider submission step.'],
      Submitted:['Submission recorded',submission?.submissionDate?`Provider submission recorded for ${prettyDate(submission.submissionDate)}${submission.confirmationRef?` · Reference ${submission.confirmationRef}`:''}.`:'Application moved to Submitted.'],
      Interview:['Moved to interview','The provider has progressed this application to interview.'],
      'Offer received':['Offer received','An offer has been recorded for this application.'],
      Unsuccessful:['Application closed','The provider outcome has been recorded as unsuccessful.']
    };
    const [label,detail]=map[s]||[`Stage changed to ${s}`,`Previous stage: ${old||'Unknown'}.`];
    return{type:'stage',label,detail,stage:s,fromStage:old||''};
  }
  function studioSnapshot(t){
    const truth=window.OpportunityStudioTruth;
    if(typeof truth?.getState!=='function')return null;
    const s=truth.getState(t);if(!s)return null;
    return{verified:Boolean(s.verified),documentsReady:s.sourceMode==='dedicatedPrepare'?Boolean(s.cvReady&&s.motReady&&s.writingReady&&s.pdfReady):Boolean(s.assembled&&s.cvReady&&s.motReady),providerReady:Boolean(s.providerReady),progress:Number(s.progress||0)};
  }
  function snapshot(t){const studio=studioSnapshot(t);return{stage:String(t?.stage||'Saved'),studio}}
  function recordMilestones(t,prev,next){
    if(!prev?.studio||!next?.studio)return false;let changed=false;
    if(!prev.studio.verified&&next.studio.verified)changed=pushEvent(t,{type:'milestone',label:'Official checks complete',detail:'The required official-source checks are recorded as complete.'},{onceKey:'milestone-verified'})||changed;
    if(!prev.studio.documentsReady&&next.studio.documentsReady)changed=pushEvent(t,{type:'milestone',label:'Application documents ready',detail:'The required application document gates are complete.'},{onceKey:'milestone-documents-ready'})||changed;
    if(!prev.studio.providerReady&&next.studio.providerReady)changed=pushEvent(t,{type:'milestone',label:'Final provider check confirmed',detail:'The final provider-side upload requirements were re-checked.'},{onceKey:'milestone-provider-ready'})||changed;
    return changed;
  }
  function persistHistory(){
    if(writing)return;writing=true;
    try{typeof persist==='function'&&persist()}catch(e){console.warn('Application history persist failed',e)}finally{writing=false}
  }

  function resolveId(card){
    const direct=card?.dataset?.exactTrackId||card?.dataset?.trackId;if(direct&&source()[direct])return direct;
    const title=norm(card?.querySelector('.focusTitle,.boardTitle')?.textContent||'');
    const provider=norm(card?.querySelector('.focusProvider,.boardProvider')?.textContent||'');
    if(!title)return'';
    const rows=(typeof opps!=='undefined'&&Array.isArray(opps)?opps:[]).filter(o=>norm(o?.Opportunity_Name)===title&&(!provider||norm(o?.Provider)===provider));
    const hit=rows.find(o=>source()[o.Opportunity_ID]);return hit?.Opportunity_ID||'';
  }
  function currentName(id,t){
    if(t?.exactVacancy?.title)return t.exactVacancy.title;
    const o=(typeof opps!=='undefined'&&Array.isArray(opps)?opps:[]).find(x=>x.Opportunity_ID===id);return o?.Opportunity_Name||'Tracked application';
  }
  function currentProvider(id,t){
    if(t?.exactVacancy?.provider)return t.exactVacancy.provider;
    const o=(typeof opps!=='undefined'&&Array.isArray(opps)?opps:[]).find(x=>x.Opportunity_ID===id);return o?.Provider||'';
  }

  function ensureModal(){
    if(document.getElementById('applicationHistoryModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div id="applicationHistoryModal" class="hide" role="dialog" aria-modal="true" aria-labelledby="applicationHistoryTitle"><div class="historyCard"><div class="historyTop"><div><div class="historyEy">Application history</div><h2 id="applicationHistoryTitle">Application timeline</h2><p id="applicationHistoryLead" class="historyLead"></p></div><button type="button" class="historyClose" aria-label="Close">×</button></div><div id="applicationHistorySnapshot" class="historySnapshot"></div><div id="applicationHistoryList" class="historyList"></div><div class="historyNote">History records actions inside Opportunity. Provider emails, portal updates and external submissions remain authoritative and should be recorded only when they actually happen.</div></div></div>`);
    const modal=document.getElementById('applicationHistoryModal');
    modal.querySelector('.historyClose').onclick=closeHistory;
    modal.addEventListener('click',e=>{if(e.target===modal)closeHistory()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hide'))closeHistory()});
  }
  function iconFor(e){if(e.type==='stage')return'↗';if(e.type==='milestone')return'✓';return'•'}
  function openHistory(id){
    ensureModal();const t=source()[id];if(!t)return;activeId=id;
    const list=ensureStore(t),modal=document.getElementById('applicationHistoryModal'),studio=studioSnapshot(t),submission=t.checklist?.submission;
    modal.querySelector('#applicationHistoryTitle').textContent=currentName(id,t);
    modal.querySelector('#applicationHistoryLead').textContent=`${currentProvider(id,t)||'Application'} · ${list.length} recorded ${list.length===1?'event':'events'}`;
    modal.querySelector('#applicationHistorySnapshot').innerHTML=`<div class="historySnap"><span>Current stage</span><b>${safe(t.stage||'Saved')}</b></div><div class="historySnap"><span>Current record</span><b>${submission?.submissionDate?`Submitted ${safe(prettyDate(submission.submissionDate))}`:studio?`${Math.round(studio.progress)}% preparation evidenced`:'Tracked application'}</b></div>`;
    const rows=[...list].sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
    modal.querySelector('#applicationHistoryList').innerHTML=rows.length?rows.map(e=>`<div class="historyEvent ${safe(e.type||'system')}"><div class="historyDot">${iconFor(e)}</div><div class="historyBody"><b>${safe(e.label||'Application update')}</b>${e.detail?`<p>${safe(e.detail)}</p>`:''}<time>${safe(prettyDateTime(e.at))}</time></div></div>`).join(''):'<div class="historyEmpty">No application events have been recorded yet.</div>';
    modal.classList.remove('hide');
  }
  function closeHistory(){document.getElementById('applicationHistoryModal')?.classList.add('hide');activeId=''}

  function decorateCards(){
    const all=source();
    document.querySelectorAll('#tracker .focusCard,#tracker .boardCard').forEach(card=>{
      const id=resolveId(card),t=all[id];if(!id||!t)return;
      card.dataset.trackId=id;
      const count=ensureStore(t).length;
      let btn=card.querySelector('.applicationHistoryBtn');
      if(!btn){btn=document.createElement('button');btn.type='button';btn.className='applicationHistoryBtn';
        const exactWrap=card.querySelector('.exactTrackActions'),tasks=card.querySelector('.focusTasks'),boardOpen=card.querySelector('.boardOpen');
        if(exactWrap){const official=exactWrap.querySelector('.exactOfficial');official?exactWrap.insertBefore(btn,official):exactWrap.appendChild(btn)}
        else if(tasks){const open=tasks.querySelector('.focusOpen');open?tasks.insertBefore(btn,open):tasks.appendChild(btn)}
        else if(boardOpen)boardOpen.insertAdjacentElement('afterend',btn);
        else card.appendChild(btn);
      }
      btn.dataset.trackId=id;btn.textContent=`History · ${count}`;
    });
  }

  function refresh(){
    scheduled=false;if(writing)return;
    const all=source();let changed=false;
    for(const [id,t] of Object.entries(all)){
      if(!snapshots.has(id)){
        changed=(baselineReady?seedNew(t):seedExisting(id,t))||changed;
        snapshots.set(id,snapshot(t));
        continue;
      }
      const prev=snapshots.get(id),next=snapshot(t);
      changed=recordMilestones(t,prev,next)||changed;
      snapshots.set(id,next);
    }
    for(const id of [...snapshots.keys()])if(!all[id])snapshots.delete(id);
    if(changed)persistHistory();
    baselineReady=true;decorateCards();
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(refresh)}

  const priorStage=window.trackStage;
  if(typeof priorStage==='function'&&!priorStage.__omApplicationHistory){
    const wrapped=function(id,value){
      const t=source()[id],old=String(t?.stage||'Saved');
      if(t&&old!==String(value||'')){pushEvent(t,stageCopy(value,t,old));}
      const out=priorStage.apply(this,arguments);
      snapshots.set(id,snapshot(source()[id]||t));schedule();return out;
    };
    wrapped.__omApplicationHistory=true;wrapped.__omPrior=priorStage;
    try{trackStage=wrapped}catch{}window.trackStage=wrapped;
  }

  const priorRender=window.renderTracker;
  if(typeof priorRender==='function'&&!priorRender.__omApplicationHistory){
    const wrapped=function(...args){const out=priorRender.apply(this,args);schedule();return out};
    wrapped.__omApplicationHistory=true;wrapped.__omPrior=priorRender;
    try{renderTracker=wrapped}catch{}window.renderTracker=wrapped;
  }

  document.addEventListener('click',e=>{const btn=e.target.closest?.('.applicationHistoryBtn');if(!btn)return;e.preventDefault();e.stopPropagation();openHistory(btn.dataset.trackId||resolveId(btn.closest('.focusCard,.boardCard')))},true);
  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  setTimeout(schedule,80);
  window.OpportunityApplicationHistory={refresh:schedule,open:openHistory};
})();