(()=>{
  const meaningful=v=>String(v||'').trim().length>=40;

  function addCss(){
    if(document.querySelector('link[data-om-hotfix-v132]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='/hotfix-v132.css';link.dataset.omHotfixV132='true';
    document.head.appendChild(link);
  }

  function stateFromTrack(t,shell=null){
    const p=t?.preparation||{},role=p.rolePack||{},req=role.requirementEvidence||{},final=role.finalApplication||{};
    const rendered=shell?[...shell.querySelectorAll('[data-prep-key]')]:[];
    const verifyKeys=['eligibilityReviewed','languageChecked','nationalityChecked','educationChecked','fieldChecked'];
    const activeKeys=rendered.length
      ? [...new Set(rendered.map(x=>x.dataset.prepKey).filter(k=>verifyKeys.includes(k)))]
      : verifyKeys.filter(k=>Object.prototype.hasOwnProperty.call(p,k));
    const verifyTotal=activeKeys.length||1;
    const verifyDone=activeKeys.length?activeKeys.filter(k=>Boolean(p[k])).length:(p.eligibilityReviewed?1:0);
    const verified=verifyDone===verifyTotal;

    const items=Object.values(req);
    const evidenceTotal=Math.max(items.length,shell?.querySelectorAll('.proofReq[data-proof-req]')?.length||0);
    const evidenceMapped=items.filter(x=>meaningful(x?.evidence)).length;
    const drafted=items.filter(x=>meaningful(x?.cvBullet)&&meaningful(x?.motivation)).length;
    const evidenceReady=evidenceTotal?evidenceMapped>=evidenceTotal:Boolean(String(role.evidenceBank||'').trim());

    const cvReady=Boolean(p.cvReady),motReady=Boolean(p.motivationDraft),docsDone=[cvReady,motReady].filter(Boolean).length;
    const assembled=Boolean(role.assembledAt)||(String(role.assembledCv||'').trim().length>80&&String(role.assembledMotivation||'').trim().length>80);
    const stage=String(t?.stage||'Saved');
    const finalReady=/ready to submit|submitted|interview|offer/i.test(stage);

    let progress=0;
    progress+=verified?25:Math.round((verifyDone/verifyTotal)*25);
    progress+=evidenceReady?25:(evidenceTotal?Math.round((evidenceMapped/evidenceTotal)*25):0);
    progress+=cvReady?18:0;
    progress+=motReady?17:0;
    progress+=finalReady?15:0;
    progress=Math.min(100,progress);

    return{p,role,final,verifyKeys:activeKeys,verifyDone,verifyTotal,verified,evidenceTotal,evidenceMapped,drafted,evidenceReady,cvReady,motReady,docsDone,assembled,stage,finalReady,progress};
  }

  function nextAction(s){
    if(!s.verified){
      const label={eligibilityReviewed:'Review the official eligibility section.',languageChecked:'Confirm the language requirement on the official vacancy.',nationalityChecked:'Confirm nationality / residence eligibility on the official vacancy.',educationChecked:'Confirm the education or enrolment requirement.',fieldChecked:'Confirm the accepted academic fields.'};
      const missing=s.verifyKeys.find(k=>!s.p[k]);
      return label[missing]||'Complete the remaining official-source checks.';
    }
    if(!s.evidenceReady)return'Map real evidence to each role requirement.';
    if(!s.assembled)return'Assemble the drafted proof into a role-specific application pack.';
    if(!s.cvReady)return'Build and review the tailored CV.';
    if(!s.motReady)return'Finish and review the motivation / cover response.';
    if(!s.finalReady)return'Run the final provider check, then mark ready to submit.';
    return'Preparation is ready — complete the official submission and update the tracker.';
  }

  function stepData(s){
    return[
      {key:'verify',label:'Verify',meta:`${s.verifyDone}/${s.verifyTotal} official checks`,done:s.verified,current:!s.verified},
      {key:'evidence',label:'Evidence',meta:s.evidenceTotal?`${s.evidenceMapped}/${s.evidenceTotal} proof areas mapped`:'Map role evidence',done:s.evidenceReady,current:s.verified&&!s.evidenceReady},
      {key:'documents',label:'Documents',meta:`${s.docsDone}/2 core documents ready`,done:s.cvReady&&s.motReady,current:s.verified&&s.evidenceReady&&!(s.cvReady&&s.motReady)},
      {key:'submit',label:'Final review',meta:s.finalReady?'Ready / beyond':`Stage: ${s.stage}`,done:s.finalReady,current:s.verified&&s.cvReady&&s.motReady&&!s.finalReady}
    ];
  }

  function chooseTab(shell,name){const btn=shell.querySelector(`.prepTab[data-prep-tab="${name}"]`);if(btn)btn.click()}
  function go(shell,key){
    if(key==='verify'){
      chooseTab(shell,'checks');
      setTimeout(()=>shell.querySelector('.prepCommand,.prepPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
      return;
    }
    chooseTab(shell,'pack');
    const selector=key==='evidence'?'.appIntel,.proofFlow,.rolePackGrid':key==='documents'?'.appAssembler,.cvBuild,.coverBuild,.finalPack,.rolePackGrid':'.appStudioFinal,.finalPack,.prepActions';
    setTimeout(()=>shell.querySelector(selector)?.scrollIntoView({behavior:'smooth',block:'start'}),90);
  }

  function mountStudio(){
    const modal=document.getElementById('prepModal'),shell=document.getElementById('prepShell');
    if(!modal||modal.classList.contains('hide')||!shell)return;
    const href=shell.querySelector('a.prepBtn.official')?.href;if(!href||typeof tracks!=='object'||!tracks)return;
    const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
    const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);if(!entry)return;
    const [id,t]=entry,s=stateFromTrack(t,shell),steps=stepData(s);

    const tabs=shell.querySelector('.prepTabs');
    const checks=tabs?.querySelector('[data-prep-tab="checks"]');if(checks){const badge=checks.querySelector('.prepTabBadge');checks.childNodes[0].nodeValue='Verify & readiness ';if(badge)badge.textContent=`${s.verifyDone}/${s.verifyTotal}`}
    const pack=tabs?.querySelector('[data-prep-tab="pack"]');if(pack){const badge=pack.querySelector('.prepTabBadge');pack.childNodes[0].nodeValue='Evidence & documents ';if(badge)badge.textContent=s.evidenceTotal?`${s.drafted}/${s.evidenceTotal}`:`${s.docsDone}/2`}
    const hint=shell.querySelector('.prepTabsHint');if(hint)hint.textContent='Verify official requirements first, map real evidence second, then finish the documents and final provider check.';

    let wrap=shell.querySelector('.appStudioRoadmapV132');
    if(!wrap){wrap=document.createElement('div');wrap.className='appStudioRoadmapV132';const body=shell.querySelector('.prepBody');body?.insertAdjacentElement('beforebegin',wrap)}
    if(!wrap)return;
    const title=nextAction(s);
    const sig=JSON.stringify({id,title,progress:s.progress,steps:steps.map(x=>[x.key,x.meta,x.done,x.current])});if(wrap.dataset.sig===sig)return;wrap.dataset.sig=sig;
    wrap.innerHTML=`<div class="appStudioRoadmapV132Inner"><div class="appStudioNextV132"><span class="ey">Application Studio · next best action</span><b>${title}</b><p>${s.progress}% of the core preparation journey is currently evidenced. Progress never replaces the official provider requirements.</p></div><div class="appStudioStepsV132">${steps.map((x,i)=>`<button type="button" class="appStudioStepV132 ${x.done?'done':''} ${x.current?'current':''}" data-studio-v132="${x.key}"><span class="num">${x.done?'✓':i+1}</span><b>${x.label}</b><small>${x.meta}</small></button>`).join('')}</div></div>`;
    wrap.querySelectorAll('[data-studio-v132]').forEach(btn=>btn.onclick=()=>go(shell,btn.dataset.studioV132));
  }

  function findPackStatus(card){
    const candidates=[...card.querySelectorAll('div,span,p')].filter(el=>/^Application pack:/i.test(String(el.textContent||'').trim()));
    return candidates.sort((a,b)=>a.children.length-b.children.length)[0]||null;
  }

  function decorateTracker(){
    if(typeof tracks!=='object'||!tracks)return;
    document.querySelectorAll('#tracker .focusCard.exactTracked[data-exact-track-id]').forEach(card=>{
      const id=card.dataset.exactTrackId,t=tracks[id];if(!t)return;const s=stateFromTrack(t);
      const action=card.querySelector('.focusAction');if(action){const span=action.querySelector('span'),b=action.querySelector('b'),small=action.querySelector('small');if(span)span.textContent='Do next · Application Studio';if(b)b.textContent=nextAction(s);if(small)small.textContent=`${s.verifyDone}/${s.verifyTotal} official checks · ${s.evidenceMapped}/${s.evidenceTotal||0} proof areas mapped`}
      const ring=card.querySelector('.focusRing');if(ring){ring.classList.add('exactStudioProgress');ring.style.setProperty('--p',s.progress);const b=ring.querySelector('b');if(b)b.textContent=`${s.progress}%`}
      const stage=card.querySelector('.focusStage span');if(stage)stage.textContent=s.finalReady?'Ready / beyond':'Application Studio progress';
      const status=findPackStatus(card);if(status){status.classList.add('exactPackStatusV132');const draftedText=s.evidenceTotal?`${s.drafted}/${s.evidenceTotal} proof areas drafted`:'Evidence mapping in progress';const packText=s.assembled?'Pack assembled':'Next: assemble application pack';status.innerHTML=`<b>Application pack:</b> ${draftedText} · ${packText}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`}
    });
  }

  function refresh(){addCss();mountStudio();decorateTracker()}
  addCss();
  document.addEventListener('click',e=>{if(e.target.closest?.('.prepOpen'))setTimeout(mountStudio,100);if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle'))setTimeout(decorateTracker,120)},true);
  document.addEventListener('change',e=>{if(e.target.matches?.('#prepShell [data-prep-key],#prepShell [data-final-ready]'))setTimeout(refresh,80)},true);
  window.addEventListener('opportunity:statechange',()=>setTimeout(refresh,100));
  const obs=new MutationObserver(()=>{clearTimeout(obs._t);obs._t=setTimeout(refresh,80)});obs.observe(document.body,{subtree:true,childList:true});
  setInterval(refresh,1300);setTimeout(refresh,500);
  window.OpportunityStudioConsistency={refresh,stateFromTrack};
})();
