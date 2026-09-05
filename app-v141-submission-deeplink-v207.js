(()=>{
  const params=new URLSearchParams(location.search);
  const submissionId=params.get('submission')||'';
  const focusId=params.get('focus')||'';
  if(!submissionId&&!focusId)return;

  const tracksStore=()=>{try{return (typeof tracks==='object'&&tracks)||window.tracks||{}}catch{return window.tracks||{}}};
  const clean=()=>{
    try{
      const u=new URL(location.href);
      u.searchParams.delete('submission');
      u.searchParams.delete('focus');
      history.replaceState(history.state,'',`${u.pathname}${u.search}${u.hash}`);
    }catch{}
  };
  const focusCard=id=>{
    const t=tracksStore()?.[id];
    if(!t)return false;
    try{if(typeof window.setView==='function')window.setView('tracker')}catch{}
    try{window.renderTracker?.()}catch{}
    const title=t?.exactVacancy?.title||t?.opportunityName||t?.title||t?.name||'';
    const cards=[...document.querySelectorAll('#tracker .focusCard,#tracker [data-exact-track-id],#tracker [data-track-id],#tracker .boardCardV11')];
    const card=cards.find(el=>String(el.dataset?.exactTrackId||el.dataset?.trackId||'')===String(id))||(title?cards.find(el=>String(el.textContent||'').includes(title)):null);
    if(card){
      try{card.scrollIntoView({behavior:'smooth',block:'center'})}catch{card.scrollIntoView()}
      card.classList.add('omJourneyFocusV207');
      setTimeout(()=>card.classList.remove('omJourneyFocusV207'),2200);
    }
    return true;
  };

  const style=document.createElement('style');
  style.textContent='#tracker .omJourneyFocusV207{box-shadow:0 0 0 2px rgba(216,255,105,.55),0 0 0 8px rgba(216,255,105,.07)!important;transition:box-shadow .2s ease}';
  document.head.appendChild(style);

  let attempts=0;
  function run(){
    attempts++;
    const id=submissionId||focusId;
    const t=tracksStore()?.[id];
    if(!t){if(attempts<24)return setTimeout(run,100);clean();return}

    focusCard(id);
    if(submissionId){
      const stage=String(t.stage||'');
      const open=window.OpportunitySubmissionStage?.open;
      if(stage==='Ready to submit'&&typeof open==='function'){
        open(id);
        clean();
        return;
      }
      if(attempts<24&&typeof open!=='function')return setTimeout(run,100);
    }
    clean();
  }

  setTimeout(run,40);
})();
