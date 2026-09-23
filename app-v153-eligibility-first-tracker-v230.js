(()=>{
  const VERSION='v237';
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const oppList=()=>{try{return Array.isArray(opps)?opps:[]}catch{return[]}};
  const activeStages=new Set(['Saved','Researching']);

  function titleOfCard(card){return String(card.querySelector('.focusTitle')?.textContent||'').trim()}
  function oppForCard(card){const nt=norm(titleOfCard(card));if(!nt)return null;return oppList().find(o=>norm(o?.Opportunity_Name)===nt)||null}
  function stageOf(card){return String(card.querySelector('.focusStage b')?.textContent||'').trim()||'Saved'}
  function checkedPrep(card){return [...card.querySelectorAll('.focusTasks input[type="checkbox"]')].some(i=>i.checked)}
  function blockingChecks(o){
    if(!o||typeof evaluate!=='function')return[];
    try{return (evaluate(o)?.checks||[]).filter(c=>c?.hard!==false&&(c?.status==='review'||c?.status==='fail'))}catch{return[]}
  }
  function isPast(o){
    if(!o)return false;
    try{const d=Number(days(o));return Number.isFinite(d)&&d<0}catch{return false}
  }
  function lockCard(card,o,blocks){
    if(!card||!o||!blocks.length)return;
    const stage=stageOf(card);
    if(!activeStages.has(stage)||checkedPrep(card)||isPast(o))return;
    const action=card.querySelector('.focusAction b');
    const small=card.querySelector('.focusAction small');
    const failures=blocks.filter(c=>c.status==='fail');
    const primary=(failures[0]||blocks[0]);
    const first=String(primary?.label||'eligibility').trim();
    const primaryRule=String(primary?.rule_code||'');
    if(failures.length){
      if(action)action.textContent=`Eligibility blocker: ${first.toLowerCase()}. Review before preparing documents.`;
      if(small)small.textContent=`${failures.length} hard eligibility blocker${failures.length===1?'':'s'}`;
    }else{
      if(action)action.textContent=`Resolve ${first.toLowerCase()} before preparing documents.`;
      if(small)small.textContent=`${blocks.length} eligibility check${blocks.length===1?'':'s'} unresolved`;
    }
    const inputs=[...card.querySelectorAll('.focusTasks input[type="checkbox"]')];
    inputs.forEach(input=>{
      input.disabled=true;
      input.setAttribute('aria-disabled','true');
      input.title='Resolve the eligibility check in analysis first';
      const label=input.closest('label');
      if(label)label.classList.add('omEligibilityLockedV237');
    });
    const open=card.querySelector('.focusOpen');
    if(open){
      if(primaryRule==='work_hours_min'){
        open.textContent='Add work hours to Passport ↗';
        open.title='Add the exact post-degree work-hours total needed for this rule';
      }else{
        open.textContent=failures.length?'Review eligibility blocker ↗':'Resolve eligibility check ↗';
        open.title=failures.length?'Open analysis and review the hard eligibility blocker':'Open analysis and resolve the provider-specific eligibility check first';
      }
    }
    card.classList.add('omEligibilityFirstV237');
    card.dataset.omEligibilityReviews=String(blocks.length);
    card.dataset.omEligibilityRule=primaryRule;
  }
  function unlockOwned(card){
    if(!card?.classList.contains('omEligibilityFirstV237'))return;
    card.classList.remove('omEligibilityFirstV237');
    delete card.dataset.omEligibilityReviews;
    delete card.dataset.omEligibilityRule;
    card.querySelectorAll('.omEligibilityLockedV237').forEach(label=>label.classList.remove('omEligibilityLockedV237'));
    card.querySelectorAll('.focusTasks input[type="checkbox"]').forEach(input=>{
      input.disabled=false;input.removeAttribute('aria-disabled');input.removeAttribute('title');
    });
    const open=card.querySelector('.focusOpen');if(open){open.textContent='Open analysis ↗';open.removeAttribute('title')}
  }
  function sync(){
    const root=document.getElementById('tracker');if(!root||root.classList.contains('hide'))return;
    const cards=[...root.querySelectorAll('.focusCard')];
    cards.forEach(card=>{
      const o=oppForCard(card),blocks=blockingChecks(o);
      if(blocks.length)lockCard(card,o,blocks);else unlockOwned(card);
    });
    document.documentElement.dataset.omEligibilityFirst=VERSION;
  }
  if(!document.getElementById('om-eligibility-first-v230-style')){
    const s=document.createElement('style');s.id='om-eligibility-first-v230-style';
    s.textContent=`
      #tracker .focusCard.omEligibilityFirstV237 .focusAction{border-color:rgba(255,190,92,.28)!important;background:rgba(255,190,92,.035)!important}
      #tracker .focusCard.omEligibilityFirstV237 .focusAction span{color:#f4b65a!important}
      #tracker .focusCard.omEligibilityFirstV237 .omEligibilityLockedV237{opacity:.48!important;cursor:not-allowed!important}
      #tracker .focusCard.omEligibilityFirstV237 .omEligibilityLockedV237 input{cursor:not-allowed!important}
    `;
    document.head.appendChild(s);
  }
  const prior=window.renderTracker;
  if(typeof prior==='function'&&!prior.__omEligibilityFirstV237){
    const wrapped=function(...args){const out=prior.apply(this,args);requestAnimationFrame(()=>sync());setTimeout(sync,80);return out};
    wrapped.__omEligibilityFirstV237=true;
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
  }
  document.addEventListener('click',e=>{
    const lockedOpen=e.target.closest?.('.focusCard.omEligibilityFirstV237 .focusOpen');
    if(lockedOpen){
      const card=lockedOpen.closest('.focusCard');
      if(card?.dataset?.omEligibilityRule==='work_hours_min'){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        try{window.openOnboard?.(true)}catch{}
        const focusHours=()=>{
          const input=document.getElementById('obWorkHours');
          if(!input)return false;
          try{input.scrollIntoView({behavior:'smooth',block:'center'})}catch{input.scrollIntoView()}
          input.focus();
          const field=input.closest('.field');
          if(field){
            const old=field.style.outline,oldShadow=field.style.boxShadow;
            field.style.outline='2px solid rgba(244,182,90,.9)';
            field.style.boxShadow='0 0 0 6px rgba(244,182,90,.12)';
            setTimeout(()=>{field.style.outline=old;field.style.boxShadow=oldShadow},2200);
          }
          return true;
        };
        setTimeout(focusHours,30);setTimeout(focusHours,100);setTimeout(focusHours,220);
        return;
      }
      const focusEvidence=()=>{
        const section=document.querySelector('#detail .adaptiveEvidence');
        if(!section)return false;
        try{section.scrollIntoView({behavior:'smooth',block:'start'})}catch{section.scrollIntoView()}
        const oldOutline=section.style.outline,oldShadow=section.style.boxShadow,oldTransition=section.style.transition;
        section.style.transition='box-shadow .2s ease, outline-color .2s ease';
        section.style.outline='2px solid rgba(244,182,90,.9)';
        section.style.boxShadow='0 0 0 6px rgba(244,182,90,.12)';
        setTimeout(()=>{section.style.outline=oldOutline;section.style.boxShadow=oldShadow;section.style.transition=oldTransition},2200);
        const q=section.querySelector('.evidenceQuestion');
        if(q){q.setAttribute('tabindex','-1');try{q.focus({preventScroll:true})}catch{}}
        return true;
      };
      setTimeout(focusEvidence,60);setTimeout(focusEvidence,180);setTimeout(focusEvidence,380);
    }
    if(e.target.closest?.('.navbtn[data-v="tracker"],.focusOpen'))setTimeout(sync,120);
  },true);
  window.addEventListener('opportunity:statechange',()=>setTimeout(sync,80));
  setTimeout(sync,100);
  window.OpportunityEligibilityFirstTracker={refresh:sync,version:VERSION};
})();
