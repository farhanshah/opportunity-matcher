(()=>{
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const meaningful=v=>String(v||'').trim().length>=40;

  function rowFromShell(shell=document.getElementById('prepShell')){
    const href=shell?.querySelector('a.prepBtn.official')?.href;if(!href||typeof tracks!=='object'||!tracks)return null;
    const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);
    return entry?{id:entry[0],t:entry[1],m:entry[1].exactVacancy}:null;
  }

  function state(shell,row){
    const p=row.t.preparation||(row.t.preparation={}),role=p.rolePack||(p.rolePack={}),req=role.requirementEvidence||{},final=role.finalApplication||{};
    const checks=[...shell.querySelectorAll('[data-prep-key]')];
    const verifyEls=checks.filter(x=>/eligibilityReviewed|languageChecked|nationalityChecked|educationChecked|fieldChecked/.test(x.dataset.prepKey||''));
    const verifyDone=verifyEls.filter(x=>x.checked).length,verifyTotal=verifyEls.length;
    const reqItems=Object.values(req),evidenceDone=reqItems.filter(x=>meaningful(x?.evidence)).length,evidenceTotal=Math.max(reqItems.length,shell.querySelectorAll('.proofReq[data-proof-req]').length);
    const cv=Boolean(p.cvReady),mot=Boolean(p.motivationDraft),writing=Boolean(final.writingSampleReady),pdf=Boolean(final.singlePdfReady);
    const docsExtra=(writing||pdf)?[writing,pdf]:[];
    const docStates=[cv,mot,...docsExtra],docsDone=docStates.filter(Boolean).length,docsTotal=docStates.length||2;
    const verified=verifyTotal?verifyDone===verifyTotal:Boolean(p.eligibilityReviewed);
    const evidenceReady=evidenceTotal?evidenceDone>=Math.min(2,evidenceTotal):meaningful(role.evidenceBank)||meaningful(role.cvNotes);
    const docsReady=cv&&mot;
    const stage=String(row.t.stage||'Saved');
    const ready=verified&&docsReady;
    return{p,role,final,verifyDone,verifyTotal,verified,evidenceDone,evidenceTotal,evidenceReady,docsDone,docsTotal,docsReady,stage,ready};
  }

  function persist(row){
    row.t.preparation.updatedAt=new Date().toISOString();
    try{window.persist?.()}catch{}
    try{window.OpportunityExactTrackDurability?.save?.()}catch{}
    try{window.dispatchEvent(new CustomEvent('opportunity:statechange'))}catch{}
  }

  function chooseTab(shell,name){
    const btn=shell.querySelector(`.prepTab[data-prep-tab="${name}"]`);
    if(btn){btn.click();return true}
    return false;
  }

  function scrollTarget(shell,kind){
    if(kind==='verify'){
      chooseTab(shell,'checks');
      setTimeout(()=>shell.querySelector('.prepCommand,.prepPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
      return;
    }
    chooseTab(shell,'pack');
    const selector=kind==='evidence'?'.appIntel,.proofFlow,.rolePackGrid':kind==='documents'?'.appAssembler,.cvBuild,.coverBuild,.finalPack,.rolePackGrid':'.appStudioFinal,.finalPack,.prepActions';
    setTimeout(()=>shell.querySelector(selector)?.scrollIntoView({behavior:'smooth',block:'start'}),90);
  }

  function stepData(s){
    return[
      {key:'verify',label:'Verify',meta:s.verifyTotal?`${s.verifyDone}/${s.verifyTotal} official checks`:s.verified?'Official check recorded':'Official check needed',done:s.verified,current:!s.verified},
      {key:'evidence',label:'Evidence',meta:s.evidenceTotal?`${s.evidenceDone}/${s.evidenceTotal} proof areas mapped`:s.evidenceReady?'Evidence captured':'Map role evidence',done:s.evidenceReady,current:s.verified&&!s.evidenceReady},
      {key:'documents',label:'Documents',meta:`${s.docsDone}/${s.docsTotal} core documents ready`,done:s.docsReady,current:s.verified&&s.evidenceReady&&!s.docsReady},
      {key:'submit',label:'Final review',meta:s.ready?'Ready for final provider check':`Stage: ${s.stage}`,done:/submitted|interview|offer/i.test(s.stage),current:s.verified&&s.docsReady}
    ];
  }

  function nextCopy(s){
    if(!s.verified)return['Verify the official rules first','Confirm the exact eligibility, language and vacancy-specific requirements before investing more time.','verify'];
    if(!s.evidenceReady)return['Map proof to the role','Connect the vacancy demands to real examples you can substantiate before drafting application language.','evidence'];
    if(!s.docsReady)return['Finish the application documents','Turn the evidence into the actual CV and motivation/cover material, then mark them ready only after review.','documents'];
    return['Run the final provider check','Your core preparation is ready. Re-open the official vacancy, verify the form requirements and move the tracker when you genuinely submit.','submit'];
  }

  function roadmap(shell,row,s){
    let wrap=shell.querySelector('.appStudioRoadmap');
    if(!wrap){wrap=document.createElement('div');wrap.className='appStudioRoadmap';const body=shell.querySelector('.prepBody');body?.insertAdjacentElement('beforebegin',wrap)}
    const [title,copy]=nextCopy(s),steps=stepData(s);
    const sig=JSON.stringify({id:row.id,steps:steps.map(x=>[x.key,x.meta,x.done,x.current]),title});
    if(wrap.dataset.sig===sig)return;wrap.dataset.sig=sig;
    wrap.innerHTML=`<div class="appStudioRoadmapInner"><div class="appStudioIntro"><span>Application Studio</span><b>${safe(title)}</b><small>${safe(copy)}</small></div><div class="appStudioSteps">${steps.map((x,i)=>`<button type="button" class="appStudioStep ${x.done?'done':''} ${x.current?'current':''}" data-studio-step="${x.key}"><span class="n">${x.done?'✓':i+1}</span><b>${safe(x.label)}</b><small>${safe(x.meta)}</small></button>`).join('')}</div></div>`;
    wrap.querySelectorAll('[data-studio-step]').forEach(btn=>btn.onclick=()=>scrollTarget(shell,btn.dataset.studioStep));
  }

  function finalPanel(shell,row,s){
    const role=shell.querySelector('.rolePack');if(!role)return;
    let panel=role.querySelector('.appStudioFinal');
    if(!panel){panel=document.createElement('section');panel.className='appStudioFinal';const footer=role.querySelector('.rolePackFooter');footer?footer.insertAdjacentElement('beforebegin',panel):role.appendChild(panel)}
    const items=[
      ['Official rules',s.verified,s.verified?'Verified in this workspace':'Complete the official-source checks'],
      ['Role evidence',s.evidenceReady,s.evidenceReady?'Proof mapped to the role':'Add real evidence you can substantiate'],
      ['CV / résumé',Boolean(s.p.cvReady),s.p.cvReady?'Marked ready after review':'Tailor and review the CV'],
      ['Motivation / cover',Boolean(s.p.motivationDraft),s.p.motivationDraft?'Marked ready after review':'Draft and review the role-specific response']
    ];
    const readyCount=items.filter(x=>x[1]).length,sig=JSON.stringify({id:row.id,readyCount,stage:s.stage});
    if(panel.dataset.sig===sig)return;panel.dataset.sig=sig;
    panel.innerHTML=`<div class="appStudioFinalHead"><div><span>Final application review</span><b>${s.ready?'Core preparation is ready for the provider check.':'Keep the final decision tied to evidence, not a progress percentage.'}</b><p>OppMatcher can organise preparation, but only the official vacancy can confirm what the employer requires and only you should mark a document complete after reviewing the real file or response.</p></div><div class="appStudioFinalScore">${readyCount}/4 core gates ready</div></div><div class="appStudioFinalGrid">${items.map(([label,ok,meta])=>`<div class="appStudioFinalItem ${ok?'ok':''}"><span>${safe(label)}</span><b>${ok?'Ready ✓':safe(meta)}</b></div>`).join('')}</div><div class="appStudioFinalActions"><button type="button" data-studio-final="tracker">Back to tracker</button><a href="${safe(row.m.url||'#')}" target="_blank" rel="noopener">Open official vacancy ↗</a><button type="button" class="primary" data-studio-final="ready" ${s.ready?'':'disabled'}>${/ready to submit/i.test(s.stage)?'Ready to submit ✓':'Mark ready to submit'}</button></div>`;
    panel.querySelector('[data-studio-final="tracker"]').onclick=()=>{window.OpportunityPreparationWorkspace?.close?.();setTimeout(()=>window.setView?.('tracker'),30)};
    const ready=panel.querySelector('[data-studio-final="ready"]');if(ready&&!ready.disabled)ready.onclick=()=>{
      const next='Ready to submit';
      try{if(typeof trackStage==='function')trackStage(row.id,next);else{row.t.stage=next;persist(row)}}catch{row.t.stage=next;persist(row)}
      setTimeout(()=>{try{window.renderTracker?.()}catch{};refresh()},80);
    };
  }

  function relabelTabs(shell){
    const checks=shell.querySelector('.prepTab[data-prep-tab="checks"]');if(checks){const text=checks.childNodes[0];if(text&&text.nodeType===3&&text.nodeValue.trim()!=='Verify & readiness')text.nodeValue='Verify & readiness '}
    const pack=shell.querySelector('.prepTab[data-prep-tab="pack"]');if(pack){const text=pack.childNodes[0];if(text&&text.nodeType===3&&text.nodeValue.trim()!=='Evidence & documents')text.nodeValue='Evidence & documents '}
    const hint=shell.querySelector('.prepTabsHint');const copy='Verify official requirements first, map real evidence second, then finish the documents and final provider check.';if(hint&&hint.textContent!==copy)hint.textContent=copy;
  }

  function refresh(){
    const modal=document.getElementById('prepModal'),shell=document.getElementById('prepShell');if(!modal||modal.classList.contains('hide')||!shell)return;
    const row=rowFromShell(shell);if(!row)return;
    const s=state(shell,row);
    roadmap(shell,row,s);
    relabelTabs(shell);
    finalPanel(shell,row,s);
  }

  const obs=new MutationObserver(muts=>{
    if(!muts.some(m=>m.addedNodes?.length||m.removedNodes?.length))return;
    clearTimeout(obs._t);obs._t=setTimeout(refresh,70);
  });
  obs.observe(document.body,{subtree:true,childList:true});
  document.addEventListener('change',e=>{if(e.target?.matches?.('#prepShell [data-prep-key],#prepShell [data-final-ready]'))setTimeout(refresh,60)},true);
  document.addEventListener('input',e=>{if(e.target?.matches?.('#prepShell [data-proof-field],#prepShell [data-role-pack],#prepShell [data-cv-build],#prepShell [data-cover-candidate]'))setTimeout(refresh,140)},true);
  window.addEventListener('opportunity:statechange',()=>setTimeout(refresh,90));
  setTimeout(refresh,500);setInterval(refresh,1400);
  window.OpportunityApplicationStudio={refresh,go:kind=>{const shell=document.getElementById('prepShell');if(shell)scrollTarget(shell,kind)}};
})();