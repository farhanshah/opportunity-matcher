(()=>{
  let observer=null,host=null,queued=false;

  function pin(){
    queued=false;
    const dash=document.querySelector('#dashboard .dashPremium');
    if(!dash)return false;
    const intel=dash.querySelector('.matchIntel');
    const radar=dash.querySelector('.applicationActionRadar[data-om-action-radar="inline-v133"]');
    if(!intel||!radar)return false;
    if(radar.parentElement!==intel.parentElement||radar.previousElementSibling!==intel){
      intel.insertAdjacentElement('afterend',radar);
    }
    document.documentElement.dataset.omRadarOrder='profile-radar-live';
    return true;
  }

  function schedule(){
    if(queued)return;
    queued=true;
    queueMicrotask(()=>requestAnimationFrame(()=>{
      pin();
      requestAnimationFrame(pin);
    }));
  }

  function bind(){
    const dash=document.querySelector('#dashboard .dashPremium');
    if(!dash)return;
    if(dash!==host){
      observer?.disconnect();
      host=dash;
      observer=new MutationObserver(records=>{
        if(records.some(r=>r.type==='childList'&&(r.addedNodes.length||r.removedNodes.length)))schedule();
      });
      observer.observe(dash,{childList:true});
    }
    schedule();
  }

  window.addEventListener('opportunity:verifiedfeedchange',schedule);
  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',()=>{bind();schedule()});
  window.addEventListener('opportunity:cloudsynced',schedule);
  window.addEventListener('load',bind,{once:true});
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.navbtn[data-v="dashboard"]'))queueMicrotask(bind);
  },true);

  queueMicrotask(bind);
  window.OpportunityRadarOrder={refresh:()=>{bind();schedule()}};
})();