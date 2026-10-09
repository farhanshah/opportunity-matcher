(()=>{
  const KEYS=['oppTracksV6','oppExactTracksV1','oppExactJournalV1'];
  const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
  const merged=()=>Object.assign({},...KEYS.map(read));
  const id=new URLSearchParams(location.search).get('id')||'';
  let queued=false;

  function current(){return merged()?.[id]||null}
  function readyState(){
    const t=current();
    const stage=String(t?.stage||'');
    const pct=Number(String(document.querySelector('#progressPct')?.textContent||'').replace(/[^0-9.]/g,''));
    const closed=document.querySelector('#deadlinePill')?.dataset?.expired==='1';
    return{t,stage,pct:Number.isFinite(pct)?pct:0,closed,ready:stage==='Ready to submit'&&pct>=100,beyond:['Submitted','Interview','Offer received','Unsuccessful'].includes(stage)};
  }

  function cleanUrl(kind){
    const q=new URLSearchParams();
    q.set(kind,id);
    return `/tracker?${q.toString()}`;
  }

  function apply(){
    queued=false;
    if(!id)return;
    const card=document.querySelector('#stage-overview .actionCard');
    const btn=card?.querySelector('[data-jump],.darkBtn');
    const headline=document.querySelector('#overviewNext');
    if(!card||!btn||!headline)return;

    const s=readyState();
    if(s.ready){
      card.dataset.finalAction='record-submission';
      headline.textContent=s.closed?'Saved preparation pack. The provider deadline has passed. Record a prior submission only if you submitted before the deadline.':'Preparation complete. Submit on the provider site, then record the submission in Tracker.';
      btn.textContent=s.closed?'Record prior submission →':'Record submission →';
      btn.removeAttribute('data-jump');
      btn.onclick=e=>{e.preventDefault();location.assign(cleanUrl('submission'))};
      btn.setAttribute('aria-label',s.closed?'Return to Tracker and record a prior provider submission':'Return to Tracker and record the provider submission');
      return;
    }

    if(s.beyond){
      card.dataset.finalAction='return-tracker';
      headline.textContent=s.stage==='Submitted'?'Submission recorded. Continue from your application timeline in Tracker.':`Application is at ${s.stage}. Continue from Tracker.`;
      btn.textContent='Return to tracker →';
      btn.removeAttribute('data-jump');
      btn.onclick=e=>{e.preventDefault();location.assign(cleanUrl('focus'))};
      return;
    }

    card.removeAttribute('data-final-action');
    btn.onclick=null;
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(apply);
  }

  window.addEventListener('load',schedule,{once:true});
  document.addEventListener('change',()=>setTimeout(schedule,0));
  document.addEventListener('click',e=>{if(e.target.closest?.('#readyBtn,[data-verify-key],#providerConfirm,[data-doc-action]'))setTimeout(schedule,20)},true);
  setTimeout(schedule,50);
  setTimeout(schedule,350);

  window.OpportunityPrepareFinalAction={refresh:schedule};
})();
