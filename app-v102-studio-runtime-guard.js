(()=>{
  function labelTabs(shell){
    const checks=shell?.querySelector('.prepTab[data-prep-tab="checks"]');
    const pack=shell?.querySelector('.prepTab[data-prep-tab="pack"]');
    const set=(btn,label)=>{if(!btn)return;const text=[...btn.childNodes].find(n=>n.nodeType===3);if(text)text.nodeValue=`${label} `};
    set(checks,'Verify & readiness');set(pack,'Evidence & documents');
    const hint=shell?.querySelector('.prepTabsHint');
    if(hint)hint.textContent='Verify the exact rules, map real evidence, assemble the pack, then complete the final provider check.';
  }
  function repair(){
    const modal=document.getElementById('prepModal'),shell=document.getElementById('prepShell');
    if(modal&&!modal.classList.contains('hide')&&shell){
      labelTabs(shell);
      if(!shell.querySelector('.appStudioRoadmapV133'))window.OpportunityStudioTruth?.refresh?.();
    }
    if(!document.getElementById('tracker')?.classList.contains('hide'))window.OpportunityStudioTruth?.refresh?.();
  }
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('#prepShell .prepTab[data-prep-tab]');
    if(tab){
      const shell=document.getElementById('prepShell'),body=shell?.querySelector('.prepBody');
      if(shell&&body&&window.OpportunityPreparationTabs?.apply){
        e.preventDefault();
        window.OpportunityPreparationTabs.flush?.(shell);
        window.OpportunityPreparationTabs.apply(shell,body,tab.dataset.prepTab,true);
      }
    }
    if(e.target.closest?.('.prepOpen,.viewToggle,.navbtn[data-v="tracker"]'))setTimeout(repair,80);
  },true);
  const mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(repair,90)});
  mo.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:statechange',()=>setTimeout(repair,80));
  setTimeout(repair,500);setInterval(repair,1200);
  window.OpportunityStudioRuntimeGuard={refresh:repair};
})();