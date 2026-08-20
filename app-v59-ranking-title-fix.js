(()=>{
  const generic=t=>/^(?:current vacancies|current vacancy|job search|careers?|vacancies|internships?)$/i.test(String(t||'').trim());
  function fix(){
    const s=window.OpportunityBestLive?.status?.();if(!s||!Array.isArray(s.items))return;
    const byUrl=new Map(s.items.filter(x=>x?.url&&x?.title&&!generic(x.title)).map(x=>[String(x.url),String(x.title)]));
    document.querySelectorAll('#dashboard .deepLiveV2Card').forEach(card=>{
      const a=card.querySelector('.deepV2Actions a[href]'),h=card.querySelector('h4');if(!a||!h||!generic(h.textContent))return;
      const title=byUrl.get(a.href)||byUrl.get(a.getAttribute('href'));if(title)h.textContent=title;
    });
  }
  const obs=new MutationObserver(()=>setTimeout(fix,20));obs.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(fix,60));setInterval(fix,1500);setTimeout(fix,600);
  window.OpportunityRankingTitleFix={refresh:fix};
})();
