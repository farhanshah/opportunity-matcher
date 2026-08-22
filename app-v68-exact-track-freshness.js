(()=>{
  const ARCHIVE='oppExactArchiveV1';
  const canon=u=>{try{const x=new URL(u);x.hash='';return `${x.origin}${x.pathname.replace(/\/+$/,'')}`.toLowerCase()}catch{return String(u||'').toLowerCase()}};
  const readArchive=()=>{try{return JSON.parse(localStorage.getItem(ARCHIVE)||'{}')||{}}catch{return{}}};
  const saveArchive=a=>{try{localStorage.setItem(ARCHIVE,JSON.stringify(a))}catch{}};
  function persistAll(){try{persist?.()}catch{};try{window.OpportunityExactTrackDurability?.save?.()}catch{};try{window.renderTracker?.()}catch{};try{window.renderDashboard?.()}catch{}}
  function reconcileUnicef(){
    const bridge=window.OpportunityUnicefExactBridge;if(!bridge?.status||!window.tracks)return;
    const s=bridge.status()||{};if(!s.at||s.degraded)return;
    const live=new Set((Array.isArray(s.items)?s.items:[]).map(x=>canon(x.url)));
    const archive=readArchive();let changed=false;
    for(const [id,t] of Object.entries(tracks||{})){
      const m=t?.exactVacancy;if(!m?.url||String(m.programmeId||'')!=='INT-005')continue;
      if(live.has(canon(m.url)))continue;
      archive[id]={...t,archivedAt:new Date().toISOString(),archiveReason:'No longer present in UNICEF current exact vacancy feed'};
      try{window.OpportunityExactTrackDurability?.remove?.(id)}catch{}
      delete tracks[id];changed=true;
    }
    if(changed){saveArchive(archive);persistAll();window.dispatchEvent(new CustomEvent('opportunity:exacttrackarchived',{detail:{provider:'UNICEF'}}));}
  }
  window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(reconcileUnicef,80));
  setTimeout(reconcileUnicef,1600);setInterval(reconcileUnicef,5000);
  window.OpportunityExactTrackFreshness={reconcile:reconcileUnicef,archiveKey:ARCHIVE};
})();