(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const meaningful=v=>String(v||'').trim().length>=40;

  function addCss(){
    if(document.querySelector('link[data-om-hotfix-v133]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='/hotfix-v133.css';link.dataset.omHotfixV133='true';document.head.appendChild(link);
  }

  function currentRow(shell=document.getElementById('prepShell')){
    if(!shell||typeof tracks!=='object'||!tracks)return null;
    const stored=shell.dataset?.exactTrackId;if(stored&&tracks[stored]?.exactVacancy)return{id:stored,t:tracks[stored],m:tracks[stored].exactVacancy};
    const href=shell.querySelector('a.prepBtn.official,a[href][target="_blank"]')?.href;
    if(href){const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);if(entry){shell.dataset.exactTrackId=entry[0];return{id:entry[0],t:entry[1],m:entry[1].exactVacancy}}}
    const title=norm(shell.querySelector('.prepHead h2')?.textContent||'');
    if(title){const entry=Object.entries(tracks).find(([,t])=>norm(t?.exactVacancy?.title)===title);if(entry){shell.dataset.exactTrackId=entry[0];return{id:entry[0],t:entry[1],m:entry[1].exactVacancy}}}
    return null;
  }

  function relevantVerifyKeys(t){
    const p=t?.preparation||{},m=t?.exactVacancy||{};
    const labels=(Array.isArray(m.signals)?m.signals:[]).map(s=>norm(s?.label||s?.text||s)).filter(Boolean);
    const readiness=norm(String(m.readiness||'')+' '+String(m.badge||''));
    const unresolved=[...labels,readiness].join(' | ');
    const keys=['eligibilityReviewed'];
    if(p.languageChecked||m.required_language||/check language|language requirement|verify language/.test(unresolved))keys.push('languageChecked');
    if(p.nationalityChecked||/check nationality|check residence|nationality requirement|residence rule/.test(unresolved))keys.push('nationalityChecked');
    if(p.educationChecked||m.minimum_education||/check education|check enrol|education requirement|enrolment requirement/.test(unresolved))keys.push('educationChecked');
    if(p.fieldChecked||/check field|check discipline|accepted academic fields|accepted field/.test(unresolved))keys.push('fieldChecked');
    return [...new Set(keys)];
  }

  function hasDedicatedPrepareState(p,role,f){
    return Boolean(f&&(String(f.cvSourceText||f.cvFinalDraft||f.writingSampleNote||'').trim()||f.writingSampleReady||f.singlePdfReady||f.providerCheckedAt||f.providerCheckedSignature||p?.cvReady||p?.motivationDraft));
  }

  function getState(t){
    const p=t?.preparation||{},role=p.rolePack||{},f=role.finalApplication||{};
    const verifyKeys=relevantVerifyKeys(t),verifyDone=verifyKeys.filter(k=>Boolean(p[k])).length,verifyTotal=verifyKeys.length,verified=verifyTotal>0&&verifyDone===verifyTotal;
    const stage=String(t?.stage||'Saved'),finalReady=/ready to submit|submitted|interview|offer/i.test(stage);

    if(hasDedicatedPrepareState(p,role,f)){
      const cvText=String(f.cvFinalDraft||f.cvSourceText||'').trim();
      const coverText=String(role.coverLetterCandidate||role.motivationDraftText||'').trim();
      const cvReady=Boolean(p.cvReady)&&cvText.length>300;
      const motReady=Boolean(p.motivationDraft)&&coverText.length>200;
      const writingReady=Boolean(f.writingSampleReady);
      const pdfReady=Boolean(f.singlePdfReady);
      const sig=[verified,cvReady,motReady,writingReady,pdfReady,cvText.length,coverText.length,String(f.writingSampleNote||'').trim().length].join('|');
      const providerReady=Boolean(f.providerCheckedAt)&&f.providerCheckedSignature===sig;
      let progress=0;progress+=verified?25:0;progress+=cvReady?20:0;progress+=motReady?20:0;progress+=writingReady?10:0;progress+=pdfReady?10:0;progress+=providerReady?15:0;progress=Math.min(100,progress);
      return{sourceMode:'dedicatedPrepare',p,role,f,verifyKeys,verifyDone,verifyTotal,verified,cvReady,motReady,writingReady,pdfReady,providerReady,stage,finalReady,progress,evidenceTotal:0,evidenceMapped:0,drafted:0,evidenceReady:false,assembled:false};
    }

    const req=role.requirementEvidence||{},items=Object.values(req),evidenceTotal=items.length,evidenceMapped=items.filter(x=>meaningful(x?.evidence)).length,drafted=items.filter(x=>meaningful(x?.cvBullet)&&meaningful(x?.motivation)).length;
    const evidenceReady=evidenceTotal>0&&evidenceMapped===evidenceTotal;
    const assembled=Boolean(role.assembledAt)||(String(role.assembledCv||'').trim().length>80&&String(role.assembledMotivation||'').trim().length>80);
    const cvReady=Boolean(p.cvReady),motReady=Boolean(p.motivationDraft);
    let progress=0;progress+=Math.round((verifyDone/verifyTotal)*20);progress+=evidenceTotal?Math.round((evidenceMapped/evidenceTotal)*25):0;progress+=assembled?10:0;progress+=cvReady?15:0;progress+=motReady?15:0;progress+=finalReady?15:0;progress=Math.min(100,progress);
    return{sourceMode:'legacy',p,role,f,verifyKeys,verifyDone,verifyTotal,verified,evidenceTotal,evidenceMapped,drafted,evidenceReady,assembled,cvReady,motReady,writingReady:false,pdfReady:false,providerReady:false,stage,finalReady,progress};
  }

  function missingVerifyCopy(s){
    const labels={eligibilityReviewed:'Review the exact eligibility section on the official vacancy.',languageChecked:'Confirm the language requirement on the official vacancy.',nationalityChecked:'Confirm the nationality or residence rule.',educationChecked:'Confirm the education or recent-graduate rule.',fieldChecked:'Confirm the accepted academic fields.'};
    return labels[s.verifyKeys.find(k=>!s.p[k])]||'Complete the remaining official-source check.';
  }

  function next(s){
    if(!s.verified)return missingVerifyCopy(s);
    if(s.sourceMode==='dedicatedPrepare'){
      if(!s.cvReady)return'Review the role-tailored CV and mark it ready.';
      if(!s.motReady)return'Review the cover / motivation response and mark it ready.';
      if(!s.writingReady)return'Choose and record the writing sample you will submit.';
      if(!s.pdfReady)return'Assemble the final provider-required PDF manually for now.';
      if(!s.providerReady)return'Re-open the official vacancy and confirm the final upload requirements.';
      if(!s.finalReady)return'Final provider check complete. Mark the application ready to submit.';
      return'Application pack complete — submit on the provider site when ready.';
    }
    if(!s.evidenceReady)return'Map one real, supportable example to every role requirement.';
    if(!s.assembled)return'Assemble your drafted proof into the role-specific application pack.';
    if(!s.cvReady)return'Review and mark the tailored CV ready.';
    if(!s.motReady)return'Review and mark the motivation / cover response ready.';
    if(!s.finalReady)return'Run the final provider check, then mark the application ready to submit.';
    return'Core preparation is ready — submit on the official provider site and update the tracker.';
  }

  function steps(s){
    if(s.sourceMode==='dedicatedPrepare'){
      const docsDone=[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length;
      return[
        {key:'checks',label:'Verify',meta:`${s.verifyDone}/${s.verifyTotal} official checks`,done:s.verified,current:!s.verified},
        {key:'documents',label:'Documents',meta:`${docsDone}/4 document gates ready`,done:docsDone===4,current:s.verified&&docsDone<4},
        {key:'final',label:'Final review',meta:s.providerReady?'Provider re-check confirmed':'Provider check needed',done:s.providerReady,current:docsDone===4&&!s.providerReady},
        {key:'ready',label:'Ready',meta:s.finalReady?'Ready / beyond':`Stage: ${s.stage}`,done:s.finalReady,current:s.providerReady&&!s.finalReady}
      ];
    }
    const docsReady=s.assembled&&s.cvReady&&s.motReady;
    const docsMeta=!s.assembled?'Pack assembly needed':`${[s.cvReady,s.motReady].filter(Boolean).length}/2 core documents ready`;
    return[
      {key:'checks',label:'Verify',meta:`${s.verifyDone}/${s.verifyTotal} official checks`,done:s.verified,current:!s.verified},
      {key:'evidence',label:'Evidence',meta:s.evidenceTotal?`${s.evidenceMapped}/${s.evidenceTotal} proof areas mapped`:'Map role evidence',done:s.evidenceReady,current:s.verified&&!s.evidenceReady},
      {key:'documents',label:'Documents',meta:docsMeta,done:docsReady,current:s.verified&&s.evidenceReady&&!docsReady},
      {key:'final',label:'Final review',meta:s.finalReady?'Ready / beyond':`Stage: ${s.stage}`,done:s.finalReady,current:docsReady&&!s.finalReady}
    ];
  }

  function setTabLabels(shell,s){
    const tabs=shell.querySelector('.prepTabs');if(!tabs)return;
    const checks=tabs.querySelector('[data-prep-tab="checks"]'),pack=tabs.querySelector('[data-prep-tab="pack"]');
    if(checks)checks.innerHTML=`Verify & readiness <span class="prepTabBadge" data-tab-checks>${s.verifyDone}/${s.verifyTotal}</span>`;
    if(pack){const badgeText=s.sourceMode==='dedicatedPrepare'?`${[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length}/4`:(s.evidenceTotal?`${s.drafted}/${s.evidenceTotal}`:`${[s.cvReady,s.motReady].filter(Boolean).length}/2`);pack.innerHTML=`Evidence & documents <span class="prepTabBadge" data-tab-pack>${badgeText}</span>`}
    const hint=shell.querySelector('.prepTabsHint');if(hint)hint.textContent=s.sourceMode==='dedicatedPrepare'?'Complete the official checks, finish the application files, then run the final provider check.':'Verify the exact rules, map real evidence, assemble the pack, then complete the final provider check.';
  }

  function activateTab(shell,tab){const btn=shell.querySelector(`.prepTab[data-prep-tab="${tab}"]`);if(btn){btn.click();return true}return false}
  function jump(shell,key){
    if(key==='checks'){activateTab(shell,'checks');setTimeout(()=>shell.querySelector('.prepCommand,.prepPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80);return}
    activateTab(shell,'pack');
    const sel=key==='evidence'?'.appIntel,.proofFlow,.rolePack':key==='documents'?'.appAssembler,.cvBuild,.coverBuild,.finalPack,.rolePack':'.appStudioFinal,.finalPack,.prepActions';
    setTimeout(()=>shell.querySelector(sel)?.scrollIntoView({behavior:'smooth',block:'start'}),90);
  }

  function mountRoadmap(){
    const modal=document.getElementById('prepModal'),shell=document.getElementById('prepShell');if(!modal||modal.classList.contains('hide')||!shell)return;
    const row=currentRow(shell);if(!row)return;const s=getState(row.t),list=steps(s);
    setTabLabels(shell,s);
    let wrap=shell.querySelector('.appStudioRoadmapV133');
    if(!wrap){wrap=document.createElement('section');wrap.className='appStudioRoadmapV133';const head=shell.querySelector('.prepHead');head?.insertAdjacentElement('afterend',wrap)}
    if(!wrap)return;
    const title=next(s),sig=JSON.stringify({id:row.id,title,p:s.progress,steps:list.map(x=>[x.key,x.meta,x.done,x.current])});if(wrap.dataset.sig===sig)return;wrap.dataset.sig=sig;
    wrap.innerHTML=`<div class="appStudioV133Lead"><span>Application Studio · next best action</span><b>${title}</b><p>${s.progress}% of the core preparation journey is evidenced. This is preparation progress, not an employer eligibility decision.</p></div><div class="appStudioV133Steps">${list.map((x,i)=>`<button type="button" class="appStudioV133Step ${x.done?'done':''} ${x.current?'current':''}" data-v133-step="${x.key}"><i>${x.done?'✓':i+1}</i><b>${x.label}</b><small>${x.meta}</small></button>`).join('')}</div>`;
    wrap.querySelectorAll('[data-v133-step]').forEach(btn=>btn.onclick=()=>jump(shell,btn.dataset.v133Step));
  }

  function decorateTracker(){
    if(typeof tracks!=='object'||!tracks)return;
    document.querySelectorAll('#tracker .focusCard.exactTracked[data-exact-track-id]').forEach(card=>{
      const id=card.dataset.exactTrackId,t=tracks[id];if(!t)return;const s=getState(t),copy=next(s);
      const action=card.querySelector('.focusAction');if(action){const label=action.querySelector('span'),b=action.querySelector('b'),small=action.querySelector('small');if(label)label.textContent='Do next · Application Studio';if(b)b.textContent=copy;if(small)small.textContent=s.sourceMode==='dedicatedPrepare'?`${s.verifyDone}/${s.verifyTotal} official checks · ${[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length}/4 document gates ready`:`${s.verifyDone}/${s.verifyTotal} official checks · ${s.evidenceMapped}/${s.evidenceTotal||0} proof areas mapped`}
      const ring=card.querySelector('.focusRing');if(ring){ring.style.setProperty('--p',s.progress);ring.classList.add('exactStudioProgressV133');const b=ring.querySelector('b');if(b)b.textContent=`${s.progress}%`}
      const context=[...card.querySelectorAll('.exactTrackLine')];if(context[1]&&s.verified)context[1].innerHTML=`<b>Before applying:</b> Official checks recorded. ${copy}`;
      const status=[...card.querySelectorAll('div,span,p')].find(el=>/^Application pack:/i.test(String(el.textContent||'').trim())&&el.children.length<3);
      if(status){
        status.classList.add('exactPackStatusV133');
        if(s.sourceMode==='dedicatedPrepare'){
          const docsDone=[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length;
          status.innerHTML=`<b>Application pack:</b> ${docsDone===4?'Documents ready':`${docsDone}/4 document gates ready`} · ${s.providerReady?'Final provider check confirmed':'Provider re-check pending'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
        }else status.innerHTML=`<b>Application pack:</b> ${s.evidenceTotal?`${s.drafted}/${s.evidenceTotal} proof areas drafted`:'Evidence mapping in progress'} · ${s.assembled?'Pack assembled':'Pack not assembled'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
      }
      const stage=card.querySelector('.focusStage span');if(stage)stage.textContent=s.finalReady?'Ready / beyond':'Application Studio progress';
    });
  }

  function refresh(){addCss();mountRoadmap();decorateTracker()}
  addCss();
  document.addEventListener('click',e=>{if(e.target.closest?.('.prepOpen'))setTimeout(mountRoadmap,120);if(e.target.closest?.('.viewToggle,.navbtn[data-v="tracker"]'))setTimeout(decorateTracker,120)},true);
  document.addEventListener('change',e=>{if(e.target.matches?.('#prepShell [data-prep-key],#prepShell [data-final-ready]'))setTimeout(refresh,80)},true);
  window.addEventListener('opportunity:statechange',()=>setTimeout(refresh,90));
  const mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(refresh,100)});mo.observe(document.body,{subtree:true,childList:true});
  setInterval(refresh,900);setTimeout(refresh,350);
  window.OpportunityStudioTruth={refresh,getState,relevantVerifyKeys};
})();