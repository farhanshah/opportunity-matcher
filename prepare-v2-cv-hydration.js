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

  function bestSavedSource(all){
    const direct=String(localStorage.getItem(MASTER_KEY)||'').trim();
    const candidates=[];
    if(direct.length>=MIN_SOURCE)candidates.push(direct);
    Object.values(all||{}).forEach(t=>{
      const src=sourceFromTrack(t);
      if(src.length>=MIN_SOURCE)candidates.push(src);
    });
    candidates.sort((a,b)=>b.length-a.length);
    return candidates[0]||'';
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
    const master=bestSavedSource(all);

    if(source.length>=MIN_SOURCE){
      try{localStorage.setItem(MASTER_KEY,source)}catch{}
    }else if(master){
      source=master;
      st.f.cvSourceText=master;
      st.f.cvSourceHydratedAt=new Date().toISOString();
      st.f.cvSourceHydratedFrom='saved-master-cv';
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
    .cvHydrateNote{margin-top:8px;padding:9px 10px;border-radius:9px;border:1px solid rgba(216,255,105,.16);background:rgba(216,255,105,.05);color:#9eaa9b;font-size:11px;line-height:1.45}
    .cvHydrateReplace{margin-top:8px;border:1px solid #364355;border-radius:8px;background:#101821;color:#d9e1ec;padding:7px 9px;font-size:10px;font-weight:800;cursor:pointer}
    .cvHydrateReplace:hover{border-color:#58687d}
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
    const isSeeded=sourceText.length>=MIN_SOURCE&&draftText===clean(sourceText);

    if(sourceTitle&&!sourceTitle.querySelector('.cvHydrateBadge')){
      sourceTitle.insertAdjacentHTML('beforeend','<span class="cvHydrateBadge">Master source · locked</span>');
    }
    if(sourceText.length>=MIN_SOURCE){
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
      draftTitle.childNodes[0].nodeValue=isSeeded?'Source-based CV candidate':'Role-tailored CV draft';
      let badge=draftTitle.querySelector('.cvHydrateBadge');
      if(!badge){
        badge=document.createElement('span');
        badge.className='cvHydrateBadge';
        draftTitle.appendChild(badge);
      }
      badge.textContent=isSeeded?'Needs tailoring':'Tailored candidate';
    }
    let note=draftCard?.querySelector('.cvHydrateNote');
    if(!note&&draftCard){
      note=document.createElement('div');
      note.className='cvHydrateNote';
      draftCard.appendChild(note);
    }
    if(note)note.textContent=isSeeded?'Your saved master CV has been restored here so the workspace never starts blank. Tailor the candidate to this exact vacancy before marking it ready.':'This candidate differs from the master source. Review every date, employer, qualification and claim before marking it ready.';

    const download=document.querySelector('#downloadCv');
    const ready=document.querySelector('#toggleCv');
    const sourceReady=sourceText.length>=MIN_SOURCE;
    const draftReady=draftText.length>=MIN_SOURCE;
    if(download){
      download.disabled=!draftReady;
      download.title=draftReady?'Download the current CV candidate':'A CV candidate is required before download';
    }
    if(ready){
      ready.disabled=!sourceReady||!draftReady||isSeeded;
      ready.title=!sourceReady?'A master CV source is required':!draftReady?'A complete CV candidate is required':isSeeded?'Tailor the candidate before marking it ready':'Review the candidate before marking it ready';
    }
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-doc-action="cv"]'))setTimeout(patchCvWorkspace,0);
  },true);

  document.addEventListener('input',e=>{
    if(e.target?.id==='cvSource'){
      syncMasterFromSource(e.target.value);
      setTimeout(patchCvWorkspace,0);
    }
    if(e.target?.id==='cvDraft')setTimeout(patchCvWorkspace,0);
  },true);

  window.addEventListener('DOMContentLoaded',()=>setTimeout(patchCvWorkspace,0));
  window.OpportunityCvHydration={refresh:patchCvWorkspace,masterKey:MASTER_KEY};
})();