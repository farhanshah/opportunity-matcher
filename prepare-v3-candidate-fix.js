(()=>{
  const MASTER_KEY='oppMasterCvSourceV1';
  const TRACK_KEYS=['oppTracksV6','oppExactTracksV1','oppExactJournalV1'];
  const MIN_SOURCE=300;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean=v=>String(v||'').replace(/\*\*/g,'').replace(/^#+\s*/gm,'').replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1').replace(/[ \t]+$/gm,'').replace(/\n{3,}/g,'\n\n').trim();
  const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  const activeId=()=>new URLSearchParams(location.search).get('id')||'';

  function currentTrack(){
    const id=activeId();
    if(!id)return null;
    for(const key of TRACK_KEYS){
      const t=read(key)[id];
      if(t)return t;
    }
    return null;
  }

  function roleProfile(source,title){
    const src=String(source||'').toLowerCase();
    const role=String(title||'this opportunity').trim();
    const strengths=[];
    if(/project management|project delivery|stakeholder|requirements gathering/.test(src))strengths.push('project delivery and stakeholder coordination');
    if(/business systems|workflow|process improvement|system implementation|uat|troubleshooting/.test(src))strengths.push('business systems and process improvement');
    if(/amazon|ebay|walmart|e-?commerce|marketplace|linnworks|digital/.test(src))strengths.push('digital and e-commerce operations');
    if(/analysis|data|report|research|evaluation|business intelligence/.test(src))strengths.push('analysis, research and reporting');
    const joined=[...new Set(strengths)].slice(0,4).join(', ')||'project delivery, business systems and analytical problem-solving';

    let focus='evidence-based project and operational improvement';
    if(/digital|\bai\b|innovation|technology|data/.test(role.toLowerCase()))focus='digital, technology and innovation-focused work';
    else if(/finance|investment|private sector|commercial/.test(role.toLowerCase()))focus='research-oriented finance and private-sector development work';
    else if(/research|analysis|monitoring|evaluation/.test(role.toLowerCase()))focus='research, analysis and evidence-based programme work';

    return `IT Project Management professional with an MSc in IT Project Management and BSc in Computer Science, bringing experience across ${joined}. Skilled in requirements gathering, stakeholder communication, UAT, workflow improvement and structured analysis, with experience translating operational and technical information into practical recommendations. Seeking to apply these transferable strengths to ${focus} in the ${role} while keeping all role claims evidence-based.`;
  }

  function replaceProfile(source,newProfile){
    const lines=clean(source).split(/\n/);
    const start=lines.findIndex(x=>/^\s*(professional|personal)\s+profile\s*$/i.test(x));
    if(start<0){
      let insertAt=Math.min(lines.length,6);
      for(let i=0;i<Math.min(lines.length,10);i++){
        if(/^\s*(core skills|skills|professional experience|work experience|experience)\s*$/i.test(lines[i])){insertAt=i;break}
      }
      lines.splice(insertAt,0,'','PROFESSIONAL PROFILE',newProfile,'');
      return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim();
    }
    let end=lines.length;
    for(let i=start+1;i<lines.length;i++){
      const line=String(lines[i]||'').trim();
      if(i>start+1&&(/^[A-Z][A-Z &/\-]{3,}$/.test(line)||/^(core skills|skills|professional experience|work experience|experience|education|certifications)/i.test(line))){end=i;break}
    }
    return [...lines.slice(0,start+1),newProfile,'',...lines.slice(end)].join('\n').replace(/\n{3,}/g,'\n\n').trim();
  }

  function buildCandidate(source){
    const track=currentTrack();
    const title=track?.exactVacancy?.title||document.querySelector('#roleTitle')?.textContent||'this opportunity';
    return replaceProfile(source,roleProfile(source,title));
  }

  function saveMaster(source){
    const text=String(source||'').trim();
    if(text.length<MIN_SOURCE)return false;
    try{localStorage.setItem(MASTER_KEY,text)}catch{return false}
    return true;
  }

  function persist(source,candidate){
    const id=activeId();
    if(!id)return;
    TRACK_KEYS.forEach(key=>{
      const store=read(key),t=store[id];
      if(!t)return;
      t.preparation=t.preparation||{};
      t.preparation.rolePack=t.preparation.rolePack||{};
      const f=t.preparation.rolePack.finalApplication||(t.preparation.rolePack.finalApplication={});
      if(source)f.cvSourceText=source;
      if(candidate){
        f.cvFinalDraft=candidate;
        f.cvCandidateGeneratedAt=new Date().toISOString();
        f.cvCandidateGeneratedFrom='master-cv-source';
        t.preparation.cvReady=false;
      }
      t.preparation.updatedAt=new Date().toISOString();
      store[id]=t;
      write(key,store);
    });
  }

  function seedCandidate(force=false){
    const source=document.querySelector('#cvSource');
    const draft=document.querySelector('#cvDraft');
    if(!source||!draft)return false;
    const sourceText=String(source.value||'').trim();
    const draftText=String(draft.value||'').trim();
    if(sourceText.length<MIN_SOURCE)return false;
    saveMaster(sourceText);
    persist(sourceText,'');
    if(!force&&draftText.length>=MIN_SOURCE)return true;
    const candidate=buildCandidate(sourceText);
    if(candidate.length<MIN_SOURCE)return false;
    draft.value=candidate;
    draft.dispatchEvent(new Event('input',{bubbles:true}));
    persist(sourceText,candidate);
    setTimeout(()=>window.OpportunityCvHydration?.refresh?.(),0);
    return true;
  }

  function ensureWorkspace(){
    const source=document.querySelector('#cvSource');
    const draft=document.querySelector('#cvDraft');
    if(!source||!draft)return;

    let sourceText=String(source.value||'').trim();
    if(sourceText.length<MIN_SOURCE){
      const master=String(localStorage.getItem(MASTER_KEY)||'').trim();
      if(master.length>=MIN_SOURCE){
        source.value=master;
        source.dispatchEvent(new Event('input',{bubbles:true}));
        sourceText=master;
      }
    }

    if(sourceText.length>=MIN_SOURCE&&String(draft.value||'').trim().length<MIN_SOURCE){
      seedCandidate(false);
    }

    const draftCard=draft.closest('.editorCard');
    if(draftCard&&!draftCard.querySelector('.cvCandidateFixBtn')){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='cvCandidateFixBtn';
      btn.textContent='Regenerate role-tailored candidate';
      btn.onclick=()=>{
        btn.disabled=true;
        const ok=seedCandidate(true);
        btn.textContent=ok?'Candidate regenerated ✓':'Add the master CV first';
        setTimeout(()=>{btn.disabled=false;btn.textContent='Regenerate role-tailored candidate'},900);
      };
      draftCard.appendChild(btn);
    }
  }

  const style=document.createElement('style');
  style.textContent=`.cvCandidateFixBtn{margin-top:8px;border:1px solid rgba(216,255,105,.28);border-radius:8px;background:rgba(216,255,105,.08);color:#d8ff69;padding:8px 10px;font-size:10px;font-weight:850;cursor:pointer}.cvCandidateFixBtn:hover{background:rgba(216,255,105,.13)}.cvCandidateFixBtn:disabled{opacity:.55;cursor:wait}`;
  document.head.appendChild(style);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-doc-action="cv"]'))setTimeout(ensureWorkspace,30);
  },true);

  document.addEventListener('input',e=>{
    if(e.target?.id==='cvSource'){
      const text=String(e.target.value||'').trim();
      if(text.length>=MIN_SOURCE){
        saveMaster(text);
        setTimeout(()=>seedCandidate(false),0);
      }
    }
  },true);

  window.addEventListener('DOMContentLoaded',()=>setTimeout(ensureWorkspace,80));
  window.OpportunityPrepareCandidateFix={refresh:ensureWorkspace,generate:seedCandidate};
})();