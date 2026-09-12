(()=>{
  const VERSION='v226';
  if(!document.getElementById('om-expired-stage-v226-style')){
    const s=document.createElement('style');
    s.id='om-expired-stage-v226-style';
    s.textContent=`
      #tracker .focusCard.omExpiredTrackV224 .focusStage select{
        display:none!important;
        visibility:hidden!important;
        pointer-events:none!important;
      }
    `;
    document.head.appendChild(s);
  }
  const refresh=()=>{
    try{window.OpportunityExpiredTracker?.refresh?.()}catch{}
    try{window.OpportunityExpiredTrackerPolish?.refresh?.()}catch{}
    document.documentElement.dataset.omExpiredStage=VERSION;
  };
  setTimeout(refresh,40);
  window.addEventListener('opportunity:statechange',()=>setTimeout(refresh,40));
  window.OpportunityExpiredStagePolish={refresh,version:VERSION};
})();
