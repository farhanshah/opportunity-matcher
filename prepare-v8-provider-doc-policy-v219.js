(()=>{
  const VERSION='v220';
  const TRACK_KEYS=['oppTracksV6','oppExactTracksV1','oppExactJournalV1'];
  const activeId=new URLSearchParams(location.search).get('id')||'';
  const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  const jobId=url=>{const m=String(url||'').match(/\/job\/(\d+)/i);return m?m[1]:''};

  // These statuses mean “not requested in the published vacancy”, not a permanent
  // eligibility verdict. The final provider-page check remains authoritative.
  const PUBLISHED_VACANCY_POLICIES={
    '36431':{
      writingSample:'not_requested',
      combinedPdf:'not_requested',
      sourceLabel:'Official UNDP vacancy 36431'
    }
  };

  function currentPolicy(){
    if(!activeId)return null;
    for(const key of TRACK_KEYS){
      const t=read(key)[activeId];
      const p=PUBLISHED_VACANCY_POLICIES[jobId(t?.exactVacancy?.url)];
      if(p)return p;
    }
    return null;
  }

  function seedPolicy(){
    const policy=currentPolicy();
    if(!policy||!activeId)return;
    TRACK_KEYS.forEach(key=>{
      const store=read(key),t=store[activeId];
      if(!t)return;
      t.preparation=t.preparation||{};
      t.preparation.rolePack=t.preparation.rolePack||{};
      const f=t.preparation.rolePack.finalApplication||(t.preparation.rolePack.finalApplication={});
      f.providerDocumentPolicy={
        version:VERSION,
        source:policy.sourceLabel,
        writingSample:policy.writingSample,
        combinedPdf:policy.combinedPdf,
        note:'Published-vacancy evidence only; re-check the live provider form before submission.'
      };
      if(policy.writingSample==='not_requested'){
        f.writingSampleNotRequested=true;
        f.writingSampleReady=true;
      }
      if(policy.combinedPdf==='not_requested'){
        f.singlePdfNotRequested=true;
        f.singlePdfReady=true;
      }
      t.preparation.updatedAt=new Date().toISOString();
      store[activeId]=t;
      write(key,store);
    });
  }

  function patchCard(card,status,description,buttonLabel,disableButton=false){
    if(!card)return;
    card.classList.add('ready','docNotRequested');
    const state=card.querySelector('.docState');
    if(state)state.textContent=status;
    const p=card.querySelector('p');
    if(p)p.textContent=description;
    const btn=card.querySelector('.docButton');
    if(btn){
      btn.textContent=buttonLabel;
      if(disableButton){btn.disabled=true;btn.setAttribute('aria-disabled','true')}
    }
  }

  function patchVisibleLabels(){
    const policy=currentPolicy();
    if(!policy)return;
    const cards=[...document.querySelectorAll('.docCard')];
    cards.forEach(card=>{
      const title=String(card.querySelector('h3')?.textContent||'').trim();
      if(title==='Writing sample'&&policy.writingSample==='not_requested'){
        patchCard(card,'Not requested','No writing-sample requirement appears in the published official vacancy. Re-check the provider form before submission.','Optional note');
      }
      if(title==='Combined PDF'&&policy.combinedPdf==='not_requested'){
        patchCard(card,'Not requested','No combined-PDF requirement appears in the published official vacancy. The final provider check remains authoritative.','No action needed',true);
      }
    });

    [...document.querySelectorAll('#finalGates .gate')].forEach(gate=>{
      const label=String(gate.querySelector('span')?.textContent||'').trim();
      if(label==='Writing sample'&&policy.writingSample==='not_requested'){
        const b=gate.querySelector('b'); if(b)b.textContent='Not requested ✓';
      }
      if(label==='Combined PDF'&&policy.combinedPdf==='not_requested'){
        const b=gate.querySelector('b'); if(b)b.textContent='Not requested ✓';
      }
    });

    const finalPanel=document.querySelector('#stage-final');
    if(finalPanel){
      const heading=finalPanel.querySelector('.surfaceCard h2');
      if(heading)heading.textContent='Confirm the required files, then re-check the provider page.';
      const notice=finalPanel.querySelector('.notice');
      if(notice)notice.textContent='Document requirements are vacancy-aware. Items marked Not requested are based on the published vacancy; re-check the live provider form before submission in case it asks for additional files.';
    }

    const lazy=document.querySelector('#lazyWorkspace');
    if(lazy&&!lazy.classList.contains('hide')&&/WRITING SAMPLE/i.test(lazy.textContent||'')&&policy.writingSample==='not_requested'){
      const head=lazy.querySelector('.lazyHead p');
      if(head)head.textContent='The published vacancy does not request a writing sample. You can keep an optional private note, but it is not a submission gate.';
      const readyBtn=[...lazy.querySelectorAll('button')].find(b=>/writing sample ready/i.test(b.textContent||''));
      if(readyBtn){readyBtn.textContent='Not requested in vacancy ✓';readyBtn.disabled=true}
    }
  }

  const style=document.createElement('style');
  style.textContent=`.docCard.docNotRequested{border-color:rgba(119,230,207,.28)!important;background:linear-gradient(180deg,rgba(119,230,207,.035),rgba(255,255,255,.012))}.docCard.docNotRequested .docState{color:#77e6cf;background:rgba(119,230,207,.10)}.docCard .docButton:disabled{opacity:.58;cursor:default}`;
  document.head.appendChild(style);

  seedPolicy();
  window.addEventListener('DOMContentLoaded',()=>setTimeout(patchVisibleLabels,70));
  document.addEventListener('click',()=>setTimeout(patchVisibleLabels,70),true);
  document.addEventListener('change',()=>setTimeout(patchVisibleLabels,70),true);
  window.OpportunityProviderDocumentPolicy={version:VERSION,refresh:()=>{seedPolicy();patchVisibleLabels()}};
})();