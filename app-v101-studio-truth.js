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
    const m=t?.exactVacancy||{},raw=norm(JSON.stringify(m.signals||[])+' '+String(m.readiness||'')+' '+String(m.badge||''));
    const keys=['eligibilityReviewed'];
    if(/language|english|french|arabic/.test(raw))keys.push('languageChecked');
    if(/nationality|residence|citizen/.test(raw))keys.push('nationalityChecked');
    if(/education|degree|enrol|student|graduate/.test(raw))keys.push('educationChecked');
    if(/field|discipline|academic field|study area/.test(raw))keys.push('fieldChecked');
    return [...new Set(keys)];
  }

  function getState(t){
    const p=t?.preparation||{},role=p.rolePack||{},req=role.requirementEvidence||{};
    const verifyKeys=relevantVerifyKeys(t),verifyDone=verifyKeys.filter(k=>Boolean(p[k])).length,verifyTotal=verifyKeys.length,verified=verifyDone===verifyTotal;
    const items=Object.values(req),evidenceTotal=items.length,evidenceMapped=items.filter(x=>meaningful(x?.evidence)).length,drafted=items.filter(x=>meaningful(x?.cvBullet)&&meaningful(x?.motivation)).length;
    const evidenceReady=evidenceTotal>0&&evidenceMapped===evidenceTotal;
    const assembled=Boolean(role.assembledAt)||(String(role.assembledCv||'').trim().length>80&&String(role.assembledMotivation||'').trim().length>80);
    const cvReady=Boolean(p.cvReady),motReady=Boolean(p.motivationDraft),stage=String(t?.stage||'Saved'),finalReady=/ready to submit|submitted|interview|offer/i.test(stage);
    let progress=0;progress+=Math.round((verifyDone/verifyTotal)*20);progress+=evidenceTotal?Math.round((evidenceMapped/evidenceTotal)*25):0;progress+=assembled?10:0;progress+=cvReady?15:0;progress+=motReady?15:0;progress+=finalReady?15:0;progress=Math.min(100,progress);
    return{p,role,verifyKeys,verifyDone,verifyTotal,verified,evidenceTotal,evidenceMapped,drafted,evidenceReady,assembled,cvReady,motReady,stage,finalReady,progress};
  }

  function next(s){
    if(!s.verified){
      const labels={eligibilityReviewed:'Review the exact eligibility section on the official vacancy.',languageChecked:'Confirm the language requirement on the official vacancy.',nationalityChecked:'Confirm the nationality or residence rule.',educationChecked:'Confirm the education or recent-graduate rule.',fieldChecked:'Confirm the accepted academic fields.'};
      return labels[s.verifyKeys.find(k=>!s.p[k])]||'Complete the remaining official-source check.';
    }
    if(!s.evidenceReady)return'Map one real, supportable example to every role requirement.';
    if(!s.assembled)return'Assemble your drafted proof into the role-specific application pack.';
    if(!s.cvReady)return'Review and mark the tailored CV ready.';
    if(!s.motReady)return'Review and mark the motivation / cover response ready.';
    if(!s.finalReady)return'Run the final provider check, then mark the application ready to submit.';
    return'Core preparation is ready — submit on the official provider site and update the tracker.';
  }

  function steps(s){
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
    if(checks){const badge=checks.querySelector('.prepTabBadge');checks.innerHTML=`Verify & readiness <span class="prepTabBadge" data-tab-checks>${s.verifyDone}/${s.verifyTotal}</span>`;checks.onclick=()=>window.OpportunityPreparationTabs?.refresh?.()}
    if(pack){const badgeText=s.evidenceTotal?`${s.drafted}/${s.evidenceTotal}`:`${[s.cvReady,s.motReady].filter(Boolean).length}/2`;pack.innerHTML=`Evidence & documents <span class="prepTabBadge" data-tab-pack>${badgeText}</span>`;}
    const hint=shell.querySelector('.prepTabsHint');if(hint)hint.textContent='Verify the exact rules, map real evidence, assemble the pack, then complete the final provider check.';
  }

  function activateTab(shell,tab){
    const btn=shell.querySelector(`.prepTab[data-prep-tab="${tab}"]`);if(btn){btn.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true}return false;
  }
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
      const action=card.querySelector('.focusAction');if(action){const label=action.querySelector('span'),b=action.querySelector('b'),small=action.querySelector('small');if(label)label.textContent='Do next · Application Studio';if(b)b.textContent=copy;if(small)small.textContent=`${s.verifyDone}/${s.verifyTotal} official checks · ${s.evidenceMapped}/${s.evidenceTotal||0} proof areas mapped`}
      const ring=card.querySelector('.focusRing');if(ring){ring.style.setProperty('--p',s.progress);ring.classList.add('exactStudioProgressV133');const b=ring.querySelector('b');if(b)b.textContent=`${s.progress}%`}
      const context=[...card.querySelectorAll('.exactTrackLine')];if(context[1])context[1].innerHTML=s.verified?`<b>Before applying:</b> Official checks recorded. ${copy}`:context[1].innerHTML;
      const status=[...card.querySelectorAll('div,span,p')].find(el=>/^Application pack:/i.test(String(el.textContent||'').trim())&&el.children.length<3);if(status){status.classList.add('exactPackStatusV133');status.innerHTML=`<b>Application pack:</b> ${s.evidenceTotal?`${s.drafted}/${s.evidenceTotal} proof areas drafted`:'Evidence mapping in progress'} · ${s.assembled?'Pack assembled':'Pack not assembled'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`}
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