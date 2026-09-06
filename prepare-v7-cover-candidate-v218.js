(()=>{
  const VERSION='v218';
  const TRACK_KEYS=['oppTracksV6','oppExactTracksV1','oppExactJournalV1'];
  const MIN_COVER=200;
  const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  const activeId=()=>new URLSearchParams(location.search).get('id')||'';
  const norm=v=>String(v||'').replace(/\s+/g,' ').trim();

  function currentTrack(){
    const id=activeId();
    if(!id)return null;
    for(const key of TRACK_KEYS){
      const t=read(key)[id];
      if(t)return t;
    }
    return null;
  }

  function sourceText(t){
    const f=t?.preparation?.rolePack?.finalApplication||{};
    return String(f.cvSourceText||f.cvFinalDraft||'').trim();
  }

  function evidence(source){
    const s=String(source||'').toLowerCase();
    const out=[];
    const add=(rx,label)=>{if(rx.test(s)&&!out.includes(label))out.push(label)};
    add(/user support|supporting users|technical support|customer support|troubleshoot|troubleshooting/,'user support and troubleshooting');
    add(/microsoft 365|office 365|microsoft office|\bexcel\b|outlook|\bteams\b/,'Microsoft productivity tools');
    add(/business systems|system administration|systems administration|workflow|uat|system implementation/,'business systems and workflow improvement');
    add(/requirements gathering|stakeholder coordination|stakeholder communication|project coordination|project delivery/,'requirements gathering and stakeholder coordination');
    add(/documentation|reporting|data analysis|business intelligence|research/,'analysis and documentation');
    add(/e-?commerce|amazon|ebay|walmart|linnworks|digital operations/,'digital operations');
    add(/process improvement|operational improvement|continuous improvement/,'process improvement');
    return out.slice(0,5);
  }

  function educationLine(source){
    const s=String(source||'');
    const hasMsc=/msc|master'?s?\s+(?:degree\s+)?in\s+it project management/i.test(s);
    const hasBsc=/bsc|bachelor'?s?\s+(?:degree\s+)?in\s+computer science/i.test(s);
    if(hasMsc&&hasBsc)return'an MSc in IT Project Management and a BSc in Computer Science';
    if(hasBsc)return'a BSc in Computer Science';
    if(hasMsc)return'an MSc in IT Project Management';
    return'';
  }

  function buildCover(t){
    const v=t?.exactVacancy||{};
    const source=sourceText(t);
    const title=norm(v.title)||'this opportunity';
    const provider=norm(v.provider||v.organization)||'the organisation';
    const location=norm(v.location||v.work_mode);
    const strengths=evidence(source);
    const education=educationLine(source);
    const strengthText=strengths.length?strengths.join(', '):'project delivery, business systems and structured analysis';
    const locationText=location?` in ${location}`:'';
    const roleLower=title.toLowerCase();

    let fit='The role’s focus on dependable support, clear documentation and practical day-to-day technology operations strongly matches the direction of my experience.';
    if(/ict assistant|it support|technical support|helpdesk|service desk/.test(roleLower)){
      fit='The vacancy’s focus on user support, productivity tools, systems, documentation and practical ICT operations is closely aligned with the transferable strengths evidenced in my CV.';
    }

    const educationSentence=education?`My academic background includes ${education}, providing a strong foundation for working across technical, operational and project environments. `:'';

    return `Dear ${provider} Hiring Team,\n\nI am writing to apply for the ${title}${locationText}. ${educationSentence}My experience brings together ${strengthText}.\n\nAcross my work and project experience, I have developed a practical approach to understanding requirements, communicating with stakeholders, documenting issues and turning operational or technical information into clear next actions. I am comfortable working across structured processes while remaining responsive to users and changing priorities. ${fit}\n\nI would bring a combination of technical understanding, analytical thinking, organised delivery and a willingness to learn quickly. I am particularly interested in contributing these strengths in a role where reliable support and clear communication help colleagues work effectively, while continuing to develop my hands-on ICT capability in an international environment.\n\nThank you for considering my application. I would welcome the opportunity to discuss how my verified experience and academic background could contribute to the ${title} role.\n\nYours sincerely,\nFarhan Shah`;
  }

  function persist(candidate){
    const id=activeId();
    if(!id||!candidate)return;
    TRACK_KEYS.forEach(key=>{
      const store=read(key),t=store[id];
      if(!t)return;
      t.preparation=t.preparation||{};
      t.preparation.rolePack=t.preparation.rolePack||{};
      t.preparation.rolePack.coverLetterCandidate=candidate;
      t.preparation.rolePack.motivationDraftText=candidate;
      t.preparation.rolePack.coverCandidateGeneratedAt=new Date().toISOString();
      t.preparation.rolePack.coverCandidateGeneratedFrom=`verified-cv-source-${VERSION}`;
      t.preparation.rolePack.coverCandidateGeneratedForRole=t.exactVacancy?.title||'';
      t.preparation.motivationDraft=false;
      t.preparation.updatedAt=new Date().toISOString();
      store[id]=t;
      write(key,store);
    });
  }

  function addBadge(textarea){
    const card=textarea?.closest('.editorCard');
    const h3=card?.querySelector('h3');
    if(!h3)return;
    let badge=h3.querySelector('.coverGroundedBadge');
    if(!badge){badge=document.createElement('span');badge.className='coverGroundedBadge';h3.appendChild(badge)}
    badge.textContent='Generated from verified CV source';
  }

  function ensureCover(force=false){
    const textarea=document.querySelector('#coverDraft');
    if(!textarea)return false;
    const t=currentTrack();
    if(!t)return false;
    const existing=String(textarea.value||'').trim();
    const saved=String(t?.preparation?.rolePack?.coverLetterCandidate||t?.preparation?.rolePack?.motivationDraftText||'').trim();
    const generatedFor=String(t?.preparation?.rolePack?.coverCandidateGeneratedForRole||'');
    const role=String(t?.exactVacancy?.title||'');
    const untouched=!existing||existing===saved&&generatedFor!==role;

    if(force||untouched||existing.length<MIN_COVER){
      const candidate=buildCover(t);
      textarea.value=candidate;
      textarea.dispatchEvent(new Event('input',{bubbles:true}));
      persist(candidate);
    }

    addBadge(textarea);
    const card=textarea.closest('.editorCard');
    if(card&&!card.querySelector('.coverRegenerateBtn')){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='coverRegenerateBtn';
      btn.textContent='Regenerate evidence-backed cover';
      btn.onclick=()=>{
        btn.disabled=true;
        ensureCover(true);
        btn.textContent='Cover regenerated ✓';
        setTimeout(()=>{btn.disabled=false;btn.textContent='Regenerate evidence-backed cover'},900);
      };
      card.appendChild(btn);
    }
    const ready=document.querySelector('#toggleCover');
    if(ready){
      const ok=String(textarea.value||'').trim().length>=MIN_COVER;
      ready.disabled=!ok;
      ready.title=ok?'Review the cover before marking it ready':'A complete cover candidate is required';
    }
    return true;
  }

  const style=document.createElement('style');
  style.textContent=`.coverGroundedBadge{display:inline-flex;margin-left:8px;padding:3px 6px;border-radius:999px;border:1px solid rgba(216,255,105,.25);background:rgba(216,255,105,.07);color:#d8ff69;font-size:9px;font-weight:800;vertical-align:middle}.coverRegenerateBtn{margin-top:8px;border:1px solid rgba(216,255,105,.28);border-radius:8px;background:rgba(216,255,105,.08);color:#d8ff69;padding:8px 10px;font-size:10px;font-weight:850;cursor:pointer}.coverRegenerateBtn:disabled{opacity:.55;cursor:wait}#toggleCover:disabled{opacity:.45;cursor:not-allowed}`;
  document.head.appendChild(style);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-doc-action="cover"]'))setTimeout(()=>ensureCover(false),35);
  },true);
  document.addEventListener('input',e=>{
    if(e.target?.id==='coverDraft')setTimeout(()=>{
      const ready=document.querySelector('#toggleCover');
      if(ready)ready.disabled=String(e.target.value||'').trim().length<MIN_COVER;
    },0);
  },true);

  window.OpportunityCoverCandidate={refresh:ensureCover,generate:()=>ensureCover(true),version:VERSION};
})();