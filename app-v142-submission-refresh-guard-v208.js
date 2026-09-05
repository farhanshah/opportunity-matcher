(()=>{
  // A submission modal may be opened only by an explicit submission deeplink
  // on this page load or by the user clicking Record submission afterwards.
  const params=new URLSearchParams(location.search);
  const explicitSubmission=params.has('submission');
  let userOpened=false;

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.markSubmitted,.submissionRecord'))userOpened=true;
  },true);

  function closeRestoredModal(){
    if(explicitSubmission||userOpened)return;
    const modal=document.getElementById('submissionIntelModal');
    if(!modal)return;
    modal.classList.add('hide');
    modal.setAttribute('aria-hidden','true');
  }

  // Browsers can restore form/dialog presentation during reload. Reset only
  // the initial presentation; later user actions are left untouched.
  closeRestoredModal();
  requestAnimationFrame(closeRestoredModal);
  window.addEventListener('pageshow',closeRestoredModal,{once:true});
  setTimeout(closeRestoredModal,80);

  window.OpportunitySubmissionRefreshGuard={reset:closeRestoredModal};
})();
