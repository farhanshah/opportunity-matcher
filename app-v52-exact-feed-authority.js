(()=>{
  let lastKey='';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function dashboard(){return document.querySelector('#dashboard .dashPremium')}
  function exactStatus(){try{return window.OpportunityBestLive?.status?.()||null}catch{return null}}
  function legacyFeeds(){return [...document.querySelectorAll('#dashboard .bestLiveFeed,#dashboard .bestLiveGuard')]}
  function hideLegacy(){legacyFeeds().forEach(x=>{x.classList.add('deepHidden');x.style.display='none'})}
  function anchor(){const d=dashboard();if(!d)return null;return d.querySelector('.bestLiveFeed')||d.querySelector('.bestLiveGuard')||d.querySelector('.matchIntelMount')||d.querySelector('.matchIntel')}
  function clearAuthority(){document.querySelectorAll('#dashboard .exactFeedAuthorityEmpty').forEach(x=>x.remove())}

  function renderEmpty(s){
    const d=dashboard(),a=anchor();if(!d||!a)return;
    hideLegacy();
    const existing=d.querySelector('.deepLive:not(.exactFeedAuthorityEmpty)');
    if(existing){
      const h=(existing.querySelector('h3')?.textContent||'').toLowerCase();
      if(h.includes('no vacancy currently survives exact provider verification'))return;
      existing.remove();
    }
    clearAuthority();
    const withheld=Number(s?.withheld_unverified||0);
    const candidates=Number(s?.candidate_items||0);
    const html=`<section class="deepLive exactFeedAuthorityEmpty"><div class="deepLiveHead"><div><div class="matchIntelEy" style="color:#d9ff67">Verified live vacancy intelligence</div><h3>No vacancy currently survives exact provider verification.</h3><p>Opportunity only promotes a vacancy here after a provider-specific exact-job check succeeds. Board-only candidates stay available through programme analysis, but they are not ranked as verified live openings.</p></div><div class="deepLiveMeta"><span>0 ranked</span><span>exact adapters only</span>${candidates?`<span>${candidates} board candidate${candidates===1?'':'s'}</span>`:''}${withheld?`<span>${withheld} withheld</span>`:''}</div></div><div class="deepLiveEmpty"><b>No verified live recommendation is safe to rank right now.</b><p>This is an intentional fail-closed result. A provider-board listing is not enough; the exact vacancy page must confirm the posting before Opportunity promotes it.</p></div><div class="deepLiveFoot">Exact-provider policy is authoritative for this Dashboard slot. Unverified board results cannot fall back into the ranked feed.</div></section>`;
    a.insertAdjacentHTML('afterend',html);
  }

  function run(){
    const d=dashboard();if(!d||document.getElementById('dashboard')?.classList.contains('hide'))return;
    const s=exactStatus();if(!s||s.provider_policy!=='exact-adapters-only')return;
    hideLegacy();
    const items=Array.isArray(s.items)?s.items:[];
    if(!s.at){return}
    if(!items.length){lastKey='';renderEmpty(s);return}
    clearAuthority();
    const key=items.map(x=>`${x.programmeId||''}|${x.url||''}`).join('||');
    if(key!==lastKey||!d.querySelector('.deepLive')){
      lastKey=key;
      try{window.OpportunityDeepVacancyRanking?.refresh?.()}catch{}
    }
  }

  const obs=new MutationObserver(()=>setTimeout(run,60));
  obs.observe(document.body,{childList:true,subtree:true});
  setInterval(run,900);
  setTimeout(run,80);
  window.OpportunityExactFeedAuthority={refresh:run,mode:'exact-only-authoritative'};
})();
