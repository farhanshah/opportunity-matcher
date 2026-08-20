(()=>{
  let lastStateKey='';

  const style=document.createElement('style');
  style.textContent='#dashboard .bestLiveFeed,#dashboard .bestLiveGuard{display:none!important}';
  document.head.appendChild(style);

  const dashboard=()=>document.querySelector('#dashboard .dashPremium');
  const visible=()=>{const d=document.getElementById('dashboard');return !!d&&!d.classList.contains('hide')};
  const status=()=>{try{return window.OpportunityBestLive?.status?.()||null}catch{return null}};
  function anchor(){const d=dashboard();return d&&(d.querySelector('.bestLiveFeed')||d.querySelector('.bestLiveGuard')||d.querySelector('.matchIntelMount')||d.querySelector('.matchIntel')||d.querySelector('.dashHero'))}
  function authorityEmpty(){return dashboard()?.querySelector('.exactFeedAuthorityEmpty')||null}

  function renderEmpty(s){
    const d=dashboard(),a=anchor();if(!d||!a)return;
    if(authorityEmpty())return;
    d.querySelectorAll('.deepLive').forEach(x=>x.remove());
    const candidates=Number(s?.candidate_items||0),withheld=Number(s?.withheld_unverified||0);
    a.insertAdjacentHTML('afterend',`<section class="deepLive exactFeedAuthorityEmpty"><div class="deepLiveHead"><div><div class="matchIntelEy" style="color:#d9ff67">Verified live vacancy intelligence</div><h3>No vacancy currently survives exact provider verification.</h3><p>Opportunity only promotes a vacancy after a provider-specific exact-job check succeeds. Board-only candidates remain available through programme analysis but are not ranked here.</p></div><div class="deepLiveMeta"><span>0 ranked</span><span>exact adapters only</span>${candidates?`<span>${candidates} board candidate${candidates===1?'':'s'}</span>`:''}${withheld?`<span>${withheld} withheld</span>`:''}</div></div><div class="deepLiveEmpty"><b>No verified live recommendation is safe to rank right now.</b><p>This is an intentional fail-closed result. A provider-board listing is not enough; the exact vacancy page must confirm the posting before Opportunity promotes it.</p></div><div class="deepLiveFoot">Exact-provider policy is authoritative for this Dashboard slot. Unverified board results cannot fall back into the ranked feed.</div></section>`);
  }

  function sync(){
    if(!visible())return;
    const d=dashboard(),s=status();if(!d||!s||s.provider_policy!=='exact-adapters-only'||!s.at)return;
    const items=Array.isArray(s.items)?s.items:[];
    const key=items.length?`items|${items.map(x=>`${x.programmeId||''}|${x.url||''}`).join('||')}`:`empty|${Number(s.candidate_items||0)}|${Number(s.withheld_unverified||0)}`;

    if(!items.length){
      if(key!==lastStateKey||!authorityEmpty()){lastStateKey=key;renderEmpty(s)}
      return;
    }

    authorityEmpty()?.remove();
    const hasVerifiedCards=!!d.querySelector('.deepLive .deepLiveCard');
    if(key!==lastStateKey||!hasVerifiedCards){
      lastStateKey=key;
      try{window.OpportunityDeepVacancyRanking?.refresh?.()}catch{}
    }
  }

  const timer=setInterval(sync,1000);
  window.addEventListener('focus',sync);
  window.addEventListener('popstate',()=>setTimeout(sync,50));
  window.addEventListener('opportunity:statechange',()=>setTimeout(sync,50));
  setTimeout(sync,180);

  window.OpportunityExactFeedAuthority={
    mode:'exact-only-authoritative',
    refresh:()=>{lastStateKey='';sync()},
    stop:()=>clearInterval(timer)
  };
})();
