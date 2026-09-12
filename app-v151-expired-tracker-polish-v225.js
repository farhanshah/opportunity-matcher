(()=>{
  const VERSION='v225';
  function polish(){
    const tracker=document.getElementById('tracker');if(!tracker)return;
    tracker.querySelectorAll('.focusCard.omExpiredTrackV224').forEach(card=>{
      const action=card.querySelector('.focusAction');
      const small=action?.querySelector('small');
      if(small)small.textContent='Keep this closed record for reference.';
      const select=card.querySelector('.focusStage select');
      if(select){
        select.disabled=true;
        select.style.display='none';
        select.setAttribute('aria-hidden','true');
      }
    });
    document.documentElement.dataset.omExpiredTrackerPolish=VERSION;
  }
  let scheduled=false;
  function schedule(delay=90){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;polish()},delay)}
  const prior=window.OpportunityExpiredTracker?.refresh;
  if(typeof prior==='function'&&!window.OpportunityExpiredTracker.__v225Wrapped){
    window.OpportunityExpiredTracker.refresh=(...args)=>{const out=prior(...args);schedule(20);return out};
    window.OpportunityExpiredTracker.__v225Wrapped=true;
  }
  window.addEventListener('opportunity:statechange',()=>schedule(120));
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="tracker"],[data-v="tracker"],button[onclick*="setTrackerMode"]'))schedule(140)},true);
  schedule(100);
  window.OpportunityExpiredTrackerPolish={refresh:polish,version:VERSION};
})();