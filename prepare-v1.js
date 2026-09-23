(()=>{
  const KEYS={tracks:'oppTracksV6',exact:'oppExactTracksV1',journal:'oppExactJournalV1'};
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const clean=v=>String(v||'').replace(/\*\*/g,'').replace(/^#+\s*/gm,'').replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1').trim();
  const merged=()=>({...read(KEYS.journal),...read(KEYS.exact),...read(KEYS.tracks)});
  const routeMeta=t=>t?.exactVacancy?.url?t.exactVacancy:(t?.prepareMeta?.url?t.prepareMeta:null);
  const validTracks=()=>Object.entries(merged()).filter(([,t])=>routeMeta(t)?.url);
  const isProgramme=()=>vac?.sourceKind==='programme';
  let entries=validTracks();
  let activeId=null,track=null,vac=null,saveTimer=null;

  try{
    const mode=localStorage.getItem('oppThemeModeV1')||'auto';
    const hour=new Date().getHours();
    const theme=mode==='auto'?(hour>=7&&hour<19?'light':'dark'):mode;
    document.documentElement.dataset.theme=theme;
  }catch{}

  function pickInitial(){
    const q=new URLSearchParams(location.search).get('id');
    if(q&&entries.some(([id])=>id===q))return q;
    return entries[0]?.[0]||null;
  }
  function ensureState(){
    track.preparation=track.preparation||{};
    const p=track.preparation;
    p.rolePack=p.rolePack||{};
    p.rolePack.finalApplication=p.rolePack.finalApplication||{};
    return{p,role:p.rolePack,f:p.rolePack.finalApplication};
  }
  function save({quiet=false}={}){
    if(!activeId||!track)return;
    const {p}=ensureState();p.updatedAt=new Date().toISOString();
    const targets=[KEYS.tracks];
    for(const k of [KEYS.exact,KEYS.journal])if(read(k)[activeId])targets.push(k);
    for(const k of targets){
      const obj=read(k);obj[activeId]=track;try{localStorage.setItem(k,JSON.stringify(obj))}catch{}
    }
    const state=$('#saveState');if(state){state.textContent=quiet?'Saving…':'Saved on this device';if(quiet)setTimeout(()=>{state.textContent='Saved on this device'},450)}
  }
  function debounceSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>save({quiet:true}),280)}
  function daysLeft(d){if(!d)return null;const x=new Date(`${d}T23:59:59`);if(Number.isNaN(x.getTime()))return null;return Math.ceil((x-Date.now())/86400000)}
  function signals(){return(vac?.signals||[]).map(s=>norm(s?.label||s)).filter(Boolean)}
  function verifyRows(){
    const {p}=ensureState(),s=signals(),context=norm([vac?.why,vac?.readiness].filter(Boolean).join(' ')),has=x=>s.some(v=>v.includes(x))||context.includes(x),programme=isProgramme();
    const isChevening=/chevening/.test(norm([vac?.title,vac?.provider].filter(Boolean).join(' ')));
    if(isChevening){
      return [
        ['eligibilityReviewed','Review the official Chevening eligibility criteria','Confirm the current 2027/28 eligibility guidance and application cycle are still open.'],
        ['residenceChecked','Confirm the UK residence restriction','Chevening states that applicants resident in the UK at the time of application are not eligible. Check the current residence stored in your Passport.'],
        ['workExperienceChecked','Confirm post-degree work-experience rule','Confirm at least 2,800 eligible hours were acquired after completing the undergraduate degree and over the required period.'],
        ['educationChecked','Confirm undergraduate-degree timing','Confirm the undergraduate degree qualifies you for UK master’s study and was completed within Chevening’s required timing.'],
        ['returnHomeChecked','Confirm the two-year return-home commitment','Confirm you can commit to returning to your country of award for at least two years after the scholarship ends.'],
        ['courseChoicesChecked','Confirm three eligible UK master’s course choices','Choose three eligible UK master’s courses and track the later unconditional-offer deadline separately.'],
        ['priorFundingChecked','Confirm prior UK-government funding / employment restrictions','Check the current rules on prior UK-government-funded study and restricted employment or close-family relationships.'],
        ['languageChecked','Check your chosen universities’ English requirements','Chevening itself has no universal English-language test requirement, but your selected universities may have admission requirements.']
      ];
    }
    const rows=[['eligibilityReviewed',programme?'Review the official programme eligibility':'Review the official eligibility section',programme?'Read the current provider eligibility guidance and confirm this programme cycle is still open and actionable.':'Read the detailed provider eligibility section and confirm the vacancy is still actionable.']];
    if(p.workExperienceChecked||has('work')||has('experience')||has('hours'))rows.push(['workExperienceChecked','Confirm post-degree work-experience rule',programme?'Confirm the required eligible hours, what periods count, and that your recorded total still meets the current programme rule.':'Confirm the provider work-experience requirement and the evidence requested.']);
    if(p.languageChecked||vac?.required_language||has('language'))rows.push(['languageChecked',programme?'Confirm language / English requirement':'Confirm required language','Verify the exact language requirement and whether evidence or certification is requested.']);
    if(p.nationalityChecked||has('nationality')||has('residence'))rows.push(['nationalityChecked','Confirm nationality / residence rule',programme?'Check that your nationality or residence matches the current programme route and cycle.':'Check whether your nationality or residence meets this exact vacancy rule.']);
    if(p.educationChecked||vac?.minimum_education||has('education')||has('enrol'))rows.push(['educationChecked',programme?'Confirm degree / education rule':'Confirm education / enrolment rule',programme?'Check the provider degree level, completion timing and any course-entry conditions that apply to this programme.':'Check degree level, student/recent-graduate status and timing.']);
    if(p.fieldChecked||has('field')||has('discipline'))rows.push(['fieldChecked',programme?'Confirm field-of-study rule':'Confirm accepted academic fields',programme?'Check whether the programme restricts academic disciplines or accepts applicants from any field.':'Verify your exact degree discipline is accepted or relevant.']);
    return rows;
  }
  function verifyComplete(){const {p}=ensureState(),rows=verifyRows();return rows.length>0&&rows.every(([k])=>!!p[k])}
  function state(){
    const {p,role,f}=ensureState();
    if(isProgramme()){
      const verify=verifyComplete();
      const documents=Boolean(p.programmeDocumentsReady);
      const statement=Boolean(p.programmeStatementReady);
      const references=Boolean(p.programmeReferencesReady);
      const sig=[verify,documents,statement,references,String(p.programmeDocumentsNote||'').length,String(p.programmeStatementNote||'').length,String(p.programmeReferencesNote||'').length].join('|');
      const provider=!!f.providerCheckedAt&&f.providerCheckedSignature===sig;
      let progress=0;progress+=verify?25:0;progress+=documents?20:0;progress+=statement?20:0;progress+=references?20:0;progress+=provider?15:0;
      return{p,role,f,verify,documents,statement,references,provider,sig,progress:Math.min(100,progress),programme:true};
    }
    const cvText=String(f.cvFinalDraft||f.cvSourceText||'').trim();
    const coverText=String(role.coverLetterCandidate||role.motivationDraftText||'').trim();
    const verify=verifyComplete(),cv=!!p.cvReady&&cvText.length>300,cover=!!p.motivationDraft&&coverText.length>200,writing=!!f.writingSampleReady,pdf=!!f.singlePdfReady;
    const sig=[verify,cv,cover,writing,pdf,cvText.length,coverText.length,String(f.writingSampleNote||'').trim().length].join('|');
    const provider=!!f.providerCheckedAt&&f.providerCheckedSignature===sig;
    let progress=0;progress+=verify?25:0;progress+=cv?20:0;progress+=cover?20:0;progress+=writing?10:0;progress+=pdf?10:0;progress+=provider?15:0;
    return{p,role,f,verify,cv,cover,writing,pdf,provider,sig,cvText,coverText,progress:Math.min(100,progress),programme:false};
  }
  function nextAction(s=state()){
    if(!s.verify)return'Complete the official-source checks first.';
    if(s.programme){
      if(!s.documents)return'Confirm the required application documents.';
      if(!s.statement)return'Review the statement or essay requirements and prepare your response.';
      if(!s.references)return'Confirm the referee and reference requirements.';
      if(!s.provider)return'Re-open the official source and confirm the final submission requirements.';
      if(!/ready to submit|submitted|interview|offer/i.test(String(track.stage||'')))return'Final provider check complete. Mark the application ready to submit.';
      return'Preparation complete. Submit on the provider site and keep Tracker updated.';
    }
    if(!s.cv)return'Review the role-tailored CV and mark it ready.';
    if(!s.cover)return'Review the cover / motivation response and mark it ready.';
    if(!s.writing)return'Choose and record the writing sample you will submit.';
    if(!s.pdf)return'Assemble the final provider-required PDF manually for now.';
    if(!s.provider)return'Re-open the official vacancy and confirm the final upload requirements.';
    if(!/ready to submit|submitted|interview|offer/i.test(String(track.stage||'')))return'Final provider check complete. Mark the application ready to submit.';
    return'Preparation complete. Submit on the provider site and keep Tracker updated.';
  }
  function invalidateProvider(){const {f}=ensureState();f.providerCheckedAt='';f.providerCheckedSignature=''}
  function fact(label,value){return`<div class="fact"><span>${esc(label)}</span><b>${esc(value||'Check provider')}</b></div>`}
  function renderHeader(){
    const programme=isProgramme();
    $('#roleTitle').textContent=vac.title||'Tracked application';
    const overviewCopy=$('#overviewStageCopy');if(overviewCopy)overviewCopy.textContent=programme?'Programme & next move':'Vacancy & next move';
    const docsCopy=$('#documentsStageCopy');if(docsCopy)docsCopy.textContent=programme?'Documents, essays & references':'CV, cover & sample';
    const snapshot=$('#snapshotEy');if(snapshot)snapshot.textContent=programme?'PROGRAMME SNAPSHOT':'VACANCY SNAPSHOT';
    const notesTitle=$('#notesTitle');if(notesTitle)notesTitle.textContent=programme?'Keep application-specific evidence and questions in one place.':'Keep role-specific evidence and questions in one place.';
    const finalCopy=$('#finalProviderCopy');if(finalCopy)finalCopy.textContent=programme?'Open the current provider guidance and compare its form, essay, document and reference requirements with what you are about to submit.':'Open the current vacancy and compare its upload/form requirements with the files you are about to submit.';
    $('#roleMeta').textContent=[vac.provider||vac.organization||'Official provider',vac.location||vac.work_mode||'',track.stage||'Researching'].filter(Boolean).join(' · ');
    $('#officialLink').href=vac.officialUrl||vac.url;$('#verifyOfficial').href=vac.officialUrl||vac.url;$('#finalOfficial').href=vac.officialUrl||vac.url;
    $('#officialLink').textContent=isProgramme()?'Open official source ↗':'Open official vacancy ↗';
    $('#finalOfficial').textContent=isProgramme()?'Open official source ↗':'Open official vacancy ↗';
    const left=daysLeft(vac.deadline),pill=$('#deadlinePill');pill.textContent=left==null?'Check deadline':left<0?'Deadline passed':left===0?'Closes today':`${left} day${left===1?'':'s'} left`;pill.dataset.expired=left<0?'1':'0';
    const picker=$('#trackPicker');picker.innerHTML=entries.map(([id,t])=>{const m=routeMeta(t);return `<option value="${esc(id)}" ${id===activeId?'selected':''}>${esc(m?.title||id)}</option>`}).join('');
    picker.onchange=()=>{location.href=`/prepare?id=${encodeURIComponent(picker.value)}`};
  }
  function renderOverview(){
    const left=daysLeft(vac.deadline);$('#factsGrid').innerHTML=[fact('Provider',vac.provider||vac.organization),fact(isProgramme()?'Destination / study location':'Location / work mode',vac.location||vac.work_mode),fact('Deadline',vac.deadline||'Check posting'),fact('Time left',left==null?'Check posting':left<0?'Expired':`${left} day${left===1?'':'s'}`),fact('Pipeline stage',track.stage||'Researching'),fact('Preparation saved',track.preparation?.updatedAt?new Date(track.preparation.updatedAt).toLocaleString():'Not yet')].join('');
    $('#overviewWhy').textContent=vac.why||vac.readiness||(isProgramme()?'Use the official programme guidance as the source of truth and keep every application claim evidence-based.':'Use the official vacancy as the source of truth and keep every application claim evidence-based.');
    const s=state();$('#overviewNext').textContent=nextAction(s);$('#notesField').value=s.p.notes||'';
  }
  function renderVerify(){const {p}=ensureState();$('#verifyList').innerHTML=verifyRows().map(([key,title,desc])=>`<label class="checkRow ${p[key]?'done':''}"><input type="checkbox" data-verify-key="${key}" ${p[key]?'checked':''}><div><b>${esc(title)}</b><span>${esc(desc)}</span></div></label>`).join('');$$('[data-verify-key]').forEach(inp=>inp.onchange=()=>{p[inp.dataset.verifyKey]=inp.checked;invalidateProvider();save();renderAll()})}
  function docCard(icon,title,desc,ready,action,label){return`<article class="docCard ${ready?'ready':''}"><span class="docIcon">${esc(icon)}</span><span class="docState">${ready?'Ready':'Needs work'}</span><h3>${esc(title)}</h3><p>${esc(desc)}</p><button class="docButton" data-doc-action="${action}">${esc(label)}</button></article>`}
  function renderDocuments(){
    const s=state();
    if(s.programme){
      $('#documentCards').innerHTML=[
        docCard('DOC','Application documents','Confirm the provider-required documents and record what you will submit.',s.documents,'documents','Open documents workspace'),
        docCard('ST','Statement / essays','Work from the exact provider prompts and keep your response evidence-based.',s.statement,'statement','Open statement workspace'),
        docCard('RF','References','Confirm referee count, format, deadlines and any provider-specific instructions.',s.references,'references','Open references workspace')
      ].join('');
    }else{
      $('#documentCards').innerHTML=[
        docCard('CV','Tailored CV','Review the complete source CV and role-tailored candidate without changing verified chronology.',s.cv,'cv','Open CV workspace'),
        docCard('CL','Cover / motivation','Keep the employer-facing letter concise and grounded in verified CV evidence.',s.cover,'cover','Open cover workspace'),
        docCard('WS','Writing sample','Record the exact sample you will submit and why it demonstrates relevant analytical writing.',s.writing,'writing','Open writing-sample choice'),
        docCard('PDF','Combined PDF','Manual confirmation only while the lightweight PDF assembler is rebuilt.',s.pdf,'pdf','Review PDF gate')
      ].join('');
    }
    $$('[data-doc-action]').forEach(b=>b.onclick=()=>openLazy(b.dataset.docAction))
  }
  function renderFinal(){
    const s=state();
    const gates=s.programme
      ?[['Official checks',s.verify],['Documents',s.documents],['Statement / essays',s.statement],['References',s.references],['Provider re-check',s.provider]]
      :[['Official checks',s.verify],['Tailored CV',s.cv],['Cover / motivation',s.cover],['Writing sample',s.writing],['Combined PDF',s.pdf],['Provider re-check',s.provider]];
    $('#finalGates').innerHTML=gates.map(([n,ok])=>`<div class="gate ${ok?'ok':''}"><span>${esc(n)}</span><b>${ok?'Ready ✓':'Not complete'}</b></div>`).join('');
    const notice=$('#stage-final .notice');
    if(notice)notice.textContent=s.programme?'Use the official scholarship or programme guidance as the final authority. Re-check the live form before submission because document, essay and reference instructions can change by cycle.':'The combined-PDF checkbox remains manual in this lightweight rebuild. The browser-heavy PDF assembler is intentionally disabled until it is rebuilt off the main UI thread.';
    const c=$('#providerConfirm');c.checked=s.provider;c.onchange=()=>{const current=state();if(c.checked){current.f.providerCheckedAt=new Date().toISOString();current.f.providerCheckedSignature=current.sig}else{current.f.providerCheckedAt='';current.f.providerCheckedSignature=''}save();renderAll()};
    const btn=$('#readyBtn');
    const core=s.programme?(s.verify&&s.documents&&s.statement&&s.references&&s.provider):(s.verify&&s.cv&&s.cover&&s.writing&&s.pdf&&s.provider);
    btn.disabled=!core;btn.textContent=/ready to submit/i.test(String(track.stage||''))?'Ready to submit ✓':'Mark ready to submit';
    btn.onclick=()=>{if(!core)return;track.stage='Ready to submit';save();renderAll()};
    $('#providerTitle').textContent=s.provider?'Final provider check confirmed.':'Provider check required.';
  }
  function renderProgress(){const s=state();$('#progressPct').textContent=`${s.progress}%`;$('#progressBar').style.width=`${s.progress}%`;$('#nextAction').textContent=nextAction(s);$('#overviewNext').textContent=nextAction(s)}
  function renderAll(){renderHeader();renderOverview();renderVerify();renderDocuments();renderFinal();renderProgress()}

  function closeLazy(){const host=$('#lazyWorkspace');host.classList.add('hide');host.innerHTML=''}
  function wordDownload(name,text,type){
    const lines=clean(text).split(/\n+/).map(x=>x.trim()).filter(Boolean);let body='';
    if(type==='cover'){body=lines.map(x=>`<p>${esc(x)}</p>`).join('')}else{body=lines.map(x=>{if(/^[A-Z][A-Z &\/–—-]{3,}$/.test(x))return`<h2>${esc(x)}</h2>`;if(/^[*•-]\s*/.test(x))return`<p class="bullet">• ${esc(x.replace(/^[*•-]\s*/,''))}</p>`;return`<p>${esc(x)}</p>`}).join('')}
    const html=`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:15mm 16mm}body{font-family:Arial,sans-serif;color:#111;font-size:10pt;line-height:1.35;margin:0}h2{font-size:10pt;letter-spacing:.08em;border-bottom:1px solid #cfd5dc;padding-bottom:3px;margin:12px 0 6px}p{margin:0 0 6px}.bullet{margin:0 0 4px 10px}</style></head><body>${body}</body></html>`;
    const blob=new Blob(['\ufeff',html],{type:'application/msword'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)
  }
  function fileBase(){return String(vac.title||'application').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,72)||'application'}
  function openLazy(kind){
    const host=$('#lazyWorkspace'),s=state();host.classList.remove('hide');
    if(s.programme){
      const cfg={
        documents:{ey:'APPLICATION DOCUMENTS',title:'Record the documents you will actually submit.',copy:'Use the current provider guidance. List the required files, what you already have, and anything still missing.',field:'programmeDocumentsNote',ready:'programmeDocumentsReady',check:'documents',placeholder:'Required documents, status, file names, certification or translation notes…',button:'Mark documents ready'},
        statement:{ey:'STATEMENT / ESSAYS',title:'Work from the exact provider prompts.',copy:'Keep the prompt wording and your evidence in one place before finalising any response.',field:'programmeStatementNote',ready:'programmeStatementReady',check:'statement',placeholder:'Paste or summarise the exact prompt, then add your evidence, examples and draft notes…',button:'Mark statement ready'},
        references:{ey:'REFERENCES',title:'Confirm the referee requirements before submission.',copy:'Record the required number of referees, format, deadlines and any provider-specific instructions.',field:'programmeReferencesNote',ready:'programmeReferencesReady',check:'references',placeholder:'Referee requirements, names/status, deadlines and instructions…',button:'Mark references ready'}
      }[kind];
      if(!cfg){host.classList.add('hide');host.innerHTML='';return}
      host.innerHTML=`<div class="lazyHead"><div><div class="sectionEy">${cfg.ey}</div><h2>${cfg.title}</h2><p>${cfg.copy}</p></div><button class="closeEditor">Close</button></div><div class="writingBox"><textarea class="largeText" id="programmeNote" placeholder="${cfg.placeholder}">${esc(s.p[cfg.field]||'')}</textarea><div class="editorActions"><button class="smallBtn primary" id="programmeReady">${s.p[cfg.ready]?cfg.button.replace('Mark ','')+' ✓':cfg.button}</button></div></div>`;
      host.querySelector('.closeEditor').onclick=closeLazy;
      $('#programmeNote').oninput=e=>{s.p[cfg.field]=e.target.value;s.p[cfg.ready]=false;track.checklist=track.checklist||{};track.checklist[cfg.check]=false;invalidateProvider();debounceSave()};
      $('#programmeReady').onclick=()=>{const x=state();x.p[cfg.ready]=!x.p[cfg.ready];track.checklist=track.checklist||{};track.checklist[cfg.check]=x.p[cfg.ready];invalidateProvider();save();renderAll();openLazy(kind)};
      host.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    if(kind==='cv'){
      host.innerHTML=`<div class="lazyHead"><div><div class="sectionEy">TAILORED CV WORKSPACE</div><h2>Work only from the verified CV source.</h2><p>The draft stays lightweight here: no observers, no background rebuilds.</p></div><button class="closeEditor">Close</button></div><div class="editorGrid"><div class="editorCard"><h3>Current CV source</h3><p>The complete CV you would otherwise submit.</p><textarea class="editorText" id="cvSource">${esc(s.f.cvSourceText||'')}</textarea></div><div class="editorCard"><h3>Role-tailored CV draft</h3><p>Edit the complete candidate while keeping dates, employers and qualifications accurate.</p><textarea class="editorText" id="cvDraft">${esc(s.f.cvFinalDraft||'')}</textarea></div></div><div class="editorActions"><button class="smallBtn" id="downloadCv">Download CV (.doc)</button><button class="smallBtn primary" id="toggleCv">${s.p.cvReady?'CV ready ✓':'Mark CV ready'}</button></div>`;
      host.querySelector('.closeEditor').onclick=closeLazy;$('#cvSource').oninput=e=>{s.f.cvSourceText=e.target.value;s.p.cvReady=false;invalidateProvider();debounceSave()};$('#cvDraft').oninput=e=>{s.f.cvFinalDraft=e.target.value;s.p.cvReady=false;invalidateProvider();debounceSave()};$('#downloadCv').onclick=()=>wordDownload(`${fileBase()}-tailored-CV.doc`,state().f.cvFinalDraft||state().f.cvSourceText,'cv');$('#toggleCv').onclick=()=>{const x=state();x.p.cvReady=!x.p.cvReady;invalidateProvider();save();renderAll();openLazy('cv')}
    }else if(kind==='cover'){
      host.innerHTML=`<div class="lazyHead"><div><div class="sectionEy">COVER / MOTIVATION WORKSPACE</div><h2>Keep the employer-facing argument concise and evidence-backed.</h2><p>This editor reuses the saved cover candidate; it does not invent experience.</p></div><button class="closeEditor">Close</button></div><div class="editorCard" style="margin-top:14px"><h3>Cover letter candidate</h3><textarea class="editorText" id="coverDraft">${esc(s.role.coverLetterCandidate||s.role.motivationDraftText||'')}</textarea></div><div class="editorActions"><button class="smallBtn" id="downloadCover">Download cover (.doc)</button><button class="smallBtn primary" id="toggleCover">${s.p.motivationDraft?'Cover ready ✓':'Mark cover ready'}</button></div>`;
      host.querySelector('.closeEditor').onclick=closeLazy;$('#coverDraft').oninput=e=>{s.role.coverLetterCandidate=e.target.value;s.role.motivationDraftText=e.target.value;s.p.motivationDraft=false;invalidateProvider();debounceSave()};$('#downloadCover').onclick=()=>wordDownload(`${fileBase()}-cover-letter.doc`,state().role.coverLetterCandidate||state().role.motivationDraftText,'cover');$('#toggleCover').onclick=()=>{const x=state();x.p.motivationDraft=!x.p.motivationDraft;invalidateProvider();save();renderAll();openLazy('cover')}
    }else if(kind==='writing'){
      host.innerHTML=`<div class="lazyHead"><div><div class="sectionEy">WRITING SAMPLE</div><h2>Record the exact sample you intend to submit.</h2><p>File upload stays disabled in this first lightweight rebuild; only the private evidence note is stored.</p></div><button class="closeEditor">Close</button></div><div class="writingBox"><textarea class="largeText" id="writingNote" placeholder="Sample title, what you personally authored, and why it is relevant…">${esc(s.f.writingSampleNote||'')}</textarea><div class="editorActions"><button class="smallBtn primary" id="toggleWriting">${s.f.writingSampleReady?'Writing sample ready ✓':'Mark writing sample ready'}</button></div></div>`;
      host.querySelector('.closeEditor').onclick=closeLazy;$('#writingNote').oninput=e=>{s.f.writingSampleNote=e.target.value;s.f.writingSampleReady=false;invalidateProvider();debounceSave()};$('#toggleWriting').onclick=()=>{const x=state();x.f.writingSampleReady=!x.f.writingSampleReady;invalidateProvider();save();renderAll();openLazy('writing')}
    }else{
      host.innerHTML=`<div class="lazyHead"><div><div class="sectionEy">COMBINED PDF GATE</div><h2>Manual confirmation only for now.</h2><p>The previous in-browser assembler was removed because it could freeze Chrome. Confirm this only after you manually combine and open the provider-ready PDF.</p></div><button class="closeEditor">Close</button></div><div class="notice">Recommended order: cover letter → CV → writing sample, unless the provider states otherwise.</div><div class="editorActions"><button class="smallBtn primary" id="togglePdf">${s.f.singlePdfReady?'Combined PDF ready ✓':'Mark combined PDF ready'}</button></div>`;
      host.querySelector('.closeEditor').onclick=closeLazy;$('#togglePdf').onclick=()=>{const x=state();x.f.singlePdfReady=!x.f.singlePdfReady;invalidateProvider();save();renderAll();openLazy('pdf')}
    }
    host.scrollIntoView({behavior:'smooth',block:'start'})
  
  }
  function switchStage(name){$$('.stageBtn').forEach(b=>b.classList.toggle('active',b.dataset.stage===name));$$('.stagePanel').forEach(p=>p.classList.toggle('active',p.id===`stage-${name}`));closeLazy();window.scrollTo({top:0,behavior:'smooth'})}
  function init(){
    activeId=pickInitial();if(!activeId){$('#emptyState').classList.remove('hide');return}
    track=merged()[activeId];vac=routeMeta(track);if(!track||!vac?.url){$('#emptyState').classList.remove('hide');return}$('#workspace').classList.remove('hide');
    $$('.stageBtn').forEach(b=>b.onclick=()=>switchStage(b.dataset.stage));$$('[data-jump]').forEach(b=>b.onclick=()=>switchStage(b.dataset.jump));
    $('#notesField').oninput=e=>{ensureState().p.notes=e.target.value;debounceSave()};
    renderAll();
  }
  window.addEventListener('beforeunload',()=>{if(track)save()});
  init();
})();