(()=>{
  const STORE_KEYS=['oppTracksV6','oppExactTracksV1','oppExactJournalV1'];
  const MASTER_KEY='oppMasterCvSourceV1';
  const MIN_SOURCE=300;
  const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  const clean=v=>String(v||'').replace(/\*\*/g,'').replace(/^#+\s*/gm,'').replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1').replace(/[ \t]+$/gm,'').replace(/\n{3,}/g,'\n\n').trim();
  const merged=()=>Object.assign({},...STORE_KEYS.map(read));
  const finalState=t=>{
    if(!t||typeof t!=='object')return null;
    t.preparation=t.preparation||{};
    const p=t.preparation;
    p.rolePack=p.rolePack||{};
    p.rolePack.finalApplication=p.rolePack.finalApplication||{};
    return{p,role:p.rolePack,f:p.rolePack.finalApplication};
  };
  const sourceFromTrack=t=>String(finalState(t)?.f?.cvSourceText||'').trim();
  const activeId=()=>new URLSearchParams(location.search).get('id')||'';

  function cvScore(text){
    const s=String(text||'').trim();
    if(s.length<MIN_SOURCE||s.length>50000)return 0;
    const l=s.toLowerCase();
    let score=0;
    if(/farhan\s+shah/.test(l))score+=5;
    if(/farhanshah893@|@gmail\.com/.test(l))score+=2;
    if(/professional\s+profile|personal\s+profile|profile\b/.test(l))score+=2;
    if(/professional\s+experience|work\s+experience|employment/.test(l))score+=3;
    if(/education|academic/.test(l))score+=2;
    if(/msc|master'?s|it project management/.test(l))score+=3;
    if(/bsc|computer science/.test(l))score+=3;
    if(/skills|core skills|competenc/.test(l))score+=2;
    if(/teesside university/.test(l))score+=2;
    if(/amazon|ebay|walmart|linnworks|rdx/.test(l))score+=2;
    if(/dear .*hiring|yours sincerely|cover letter/.test(l))score-=5;
    return score;
  }

  function legacyCandidates(){
    const found=[];
    const seen=new Set();
    const add=(value,origin)=>{
      const text=String(value||'').trim();
      if(!text||seen.has(text))return;
      seen.add(text);
      const score=cvScore(text);
      if(score>=8)found.push({text,score,origin});
    };
    const walk=(value,origin,depth=0)=>{
      if(depth>6||value==null)return;
      if(typeof value==='string'){add(value,origin);return}
      if(Array.isArray(value)){value.slice(0,300).forEach((v,i)=>walk(v,`${origin}[${i}]`,depth+1));return}
      if(typeof value==='object'){
        Object.entries(value).slice(0,400).forEach(([k,v])=>walk(v,`${origin}.${k}`,depth+1));
      }
    };
    const stores=[['localStorage',localStorage],['sessionStorage',sessionStorage]];
    for(const [storeName,store] of stores){
      try{
        const count=Math.min(store.length,250);
        for(let i=0;i<count;i++){
          const key=store.key(i);if(!key)continue;
          const raw=store.getItem(key);if(!raw)continue;
          add(raw,`${storeName}.${key}:raw`);
          try{walk(JSON.parse(raw),`${storeName}.${key}`,0)}catch{}
        }
      }catch{}
    }
    return found.sort((a,b)=>b.score-a.score||b.text.length-a.text.length);
  }

  function bestSavedSource(all){
    const direct=String(localStorage.getItem(MASTER_KEY)||'').trim();
    const candidates=[];
    if(direct.length>=MIN_SOURCE)candidates.push({text:direct,score:100,origin:MASTER_KEY});
    Object.entries(all||{}).forEach(([id,t])=>{
      const src=sourceFromTrack(t);
      if(src.length>=MIN_SOURCE)candidates.push({text:src,score:60+cvScore(src),origin:`tracked:${id}`});
    });
    candidates.push(...legacyCandidates());
    candidates.sort((a,b)=>b.score-a.score||b.text.length-a.text.length);
    return candidates[0]||{text:'',score:0,origin:''};
  }

  function persistActive(id,track){
    if(!id||!track)return;
    STORE_KEYS.forEach(k=>{
      const obj=read(k);
      obj[id]=track;
      write(k,obj);
    });
  }

  function hydrateBeforeStudio(){
    const id=activeId();
    if(!id)return;
    const all=merged();
    const target=all[id];
    if(!target)return;
    const st=finalState(target);
    let source=String(st.f.cvSourceText||'').trim();
    const recovered=bestSavedSource(all);
    const master=String(recovered.text||'').trim();

    if(source.length>=MIN_SOURCE){
      try{localStorage.setItem(MASTER_KEY,source)}catch{}
      st.f.cvSourceHydratedFrom=st.f.cvSourceHydratedFrom||'active-application';
    }else if(master){
      source=master;
      st.f.cvSourceText=master;
      st.f.cvSourceHydratedAt=new Date().toISOString();
      st.f.cvSourceHydratedFrom=recovered.origin||'legacy-browser-storage';
      try{localStorage.setItem(MASTER_KEY,master)}catch{}
    }

    if(source.length>=MIN_SOURCE&&!String(st.f.cvFinalDraft||'').trim()){
      st.f.cvFinalDraft=clean(source);
      st.f.cvDraftSeededFromSourceAt=new Date().toISOString();
      st.p.cvReady=false;
    }

    persistActive(id,target);
  }

  hydrateBeforeStudio();

  const style=document.createElement('style');
  style.textContent=`
    .cvHydrateBadge{display:inline-flex;align-items:center;gap:5px;margin-left:7px;padding:4px 7px;border-radius:999px;border:1px solid rgba(216,255,105,.28);background:rgba(216,255,105,.08);color:#d8ff69;font-size:10px;font-weight:800;vertical-align:middle}
    .cvHydrateBadge.warn{border-color:rgba(255,188,74,.35);background:rgba(255,188,74,.09);color:#ffc56a}
    .cvHydrateNote{margin-top:8px;padding:9px 10px;border-radius:9px;border:1px solid rgba(216,255,105,.16);background:rgba(216,255,105,.05);color:#9eaa9b;font-size:11px;line-height:1.45}
    .cvHydrateNote.warn{border-color:rgba(255,188,74,.24);background:rgba(255,188,74,.06);color:#c8aa77}
    .cvHydrateReplace{margin-top:8px;border:1px solid #364355;border-radius:8px;background:#101821;color:#d9e1ec;padding:7px 9px;font-size:10px;font-weight:800;cursor:pointer}
    .cvHydrateReplace:hover{border-color:#58687d}
    .editorText{color:#e7ecf2!important;-webkit-text-fill-color:#e7ecf2!important;caret-color:#fff!important}
    #toggleCv:disabled,#downloadCv:disabled{opacity:.45;cursor:not-allowed}
  `;
  document.head.appendChild(style);

  function syncMasterFromSource(value){
    const text=String(value||'').trim();
    if(text.length<MIN_SOURCE)return;
    try{localStorage.setItem(MASTER_KEY,text)}catch{}
  }

  function patchCvWorkspace(){
    const source=document.querySelector('#cvSource');
    const draft=document.querySelector('#cvDraft');
    if(!source||!draft)return;

    const sourceCard=source.closest('.editorCard');
    const draftCard=draft.closest('.editorCard');
    const sourceTitle=sourceCard?.querySelector('h3');
    const draftTitle=draftCard?.querySelector('h3');
    const sourceText=String(source.value||'').trim();
    const draftText=String(draft.value||'').trim();
    const sourceReady=sourceText.length>=MIN_SOURCE;
    const draftReady=draftText.length>=MIN_SOURCE;
    const isSeeded=sourceReady&&draftText===clean(sourceText);

    if(sourceTitle){
      let badge=sourceTitle.querySelector('.cvHydrateBadge');
      if(!badge){badge=document.createElement('span');badge.className='cvHydrateBadge';sourceTitle.appendChild(badge)}
      badge.classList.toggle('warn',!sourceReady);
      badge.textContent=sourceReady?`Master source · ${sourceText.length.toLocaleString()} chars`:'Master CV not recovered';
    }
    if(sourceReady){
      source.readOnly=true;
      source.setAttribute('aria-readonly','true');
      if(sourceCard&&!sourceCard.querySelector('.cvHydrateReplace')){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='cvHydrateReplace';
        btn.textContent='Replace master CV source';
        btn.onclick=()=>{
          source.readOnly=false;
          source.removeAttribute('aria-readonly');
          btn.textContent='Editing master source…';
          source.focus();
        };
        sourceCard.appendChild(btn);
      }
    }

    if(draftTitle){
      draftTitle.childNodes[0].nodeValue=isSeeded?'Source-based CV candidate':draftReady?'Role-tailored CV draft':'Role-tailored CV draft';
      let badge=draftTitle.querySelector('.cvHydrateBadge');
      if(!badge){badge=document.createElement('span');badge.className='cvHydrateBadge';draftTitle.appendChild(badge)}
      badge.classList.toggle('warn',!draftReady);
      badge.textContent=!draftReady?'No candidate yet':isSeeded?'Needs tailoring':`Candidate · ${draftText.length.toLocaleString()} chars`;
    }
    let note=draftCard?.querySelector('.cvHydrateNote');
    if(!note&&draftCard){note=document.createElement('div');note.className='cvHydrateNote';draftCard.appendChild(note)}
    if(note){
      note.classList.toggle('warn',!sourceReady||!draftReady);
      note.textContent=!sourceReady?'No master CV was found in the current or legacy browser workspace. Use “Replace master CV source” after pasting/importing the master CV once.':!draftReady?'The master CV is available, but no candidate has been created yet.':isSeeded?'Your saved master CV has been restored here so the workspace never starts blank. Tailor the candidate to this exact vacancy before marking it ready.':'This candidate differs from the master source. Review every date, employer, qualification and claim before marking it ready.';
    }

    if(!sourceReady&&sourceCard&&!sourceCard.querySelector('.cvHydrateReplace')){
      const btn=document.createElement('button');btn.type='button';btn.className='cvHydrateReplace';btn.textContent='Paste master CV source';btn.onclick=()=>{source.readOnly=false;source.focus()};sourceCard.appendChild(btn);
    }

    const download=document.querySelector('#downloadCv');
    const ready=document.querySelector('#toggleCv');
    if(download){download.disabled=!draftReady;download.title=draftReady?'Download the current CV candidate':'A CV candidate is required before download'}
    if(ready){ready.disabled=!sourceReady||!draftReady||isSeeded;ready.title=!sourceReady?'A master CV source is required':!draftReady?'A complete CV candidate is required':isSeeded?'Tailor the candidate before marking it ready':'Review the candidate before marking it ready'}
  }

  document.addEventListener('click',e=>{if(e.target.closest?.('[data-doc-action="cv"]'))setTimeout(patchCvWorkspace,0)},true);
  document.addEventListener('input',e=>{
    if(e.target?.id==='cvSource'){syncMasterFromSource(e.target.value);setTimeout(patchCvWorkspace,0)}
    if(e.target?.id==='cvDraft')setTimeout(patchCvWorkspace,0);
  },true);
  window.addEventListener('DOMContentLoaded',()=>setTimeout(patchCvWorkspace,0));
  window.OpportunityCvHydration={refresh:patchCvWorkspace,masterKey:MASTER_KEY};
})();