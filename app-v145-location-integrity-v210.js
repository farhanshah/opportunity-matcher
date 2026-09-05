(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/[^a-z0-9]+/g,' ').trim();

  function titleOfficeHint(item){
    const title=String(item?.title||'').trim();
    const provider=norm(item?.provider||item?.source||'');
    if(provider!=='undp'&&!/\bundp\b/i.test(title))return'';

    // UNDP vacancy titles often name the country office explicitly, e.g.
    // "HR Intern, UNDP Tunisia CO". This is safer than a neighbouring
    // board-row location when the legacy board scraper has overrun a row.
    const m=title.match(/\bUNDP\s+([A-Z][A-Za-zÀ-ÿ.'’ -]{1,45}?)\s+CO\b/i);
    return m?m[1].replace(/\s+/g,' ').trim():'';
  }

  function normalizeItem(item){
    if(!item||typeof item!=='object')return item;
    const hint=titleOfficeHint(item);
    if(!hint)return item;
    const current=String(item.location||'').trim();
    const h=norm(hint),c=norm(current);
    if(c&&c.includes(h))return item;
    return {...item,location:hint,_location_integrity:'title-office-hint',_location_original:current||''};
  }

  function wrapStatus(){
    const api=window.OpportunityBestLive;
    if(!api||typeof api.status!=='function'||api.status.__omLocationV210)return false;
    const original=api.status.bind(api);
    const wrapped=()=>{
      const state=original()||{};
      if(!Array.isArray(state.items))return state;
      return {...state,items:state.items.map(normalizeItem),location_integrity:'v210'};
    };
    wrapped.__omLocationV210=true;
    api.status=wrapped;
    return true;
  }

  function repairRenderedCards(){
    document.querySelectorAll('#dashboard .deepLiveCard,#dashboard .deepV2Card').forEach(card=>{
      const title=card.querySelector('h4')?.textContent||'';
      const hint=titleOfficeHint({title,provider:card.querySelector('.deepLiveProvider,.deepV2Provider')?.textContent||''});
      if(!hint)return;
      const meta=card.querySelector('p');
      if(!meta)return;
      const parts=String(meta.textContent||'').split(' · ');
      if(!parts.length)return;
      const first=norm(parts[0]);
      if(first&&first.includes(norm(hint)))return;
      parts[0]=hint;
      meta.textContent=parts.join(' · ');
      card.dataset.locationIntegrity='v210';
    });
  }

  function refresh(){
    const wrapped=wrapStatus();
    if(wrapped){
      try{window.OpportunityDeepVacancyRanking?.refresh?.()}catch{}
    }
    repairRenderedCards();
  }

  window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(refresh,0));
  window.addEventListener('load',()=>setTimeout(refresh,0),{once:true});
  setTimeout(refresh,0);
  setTimeout(refresh,250);
  setTimeout(refresh,900);

  window.OpportunityLocationIntegrity={normalize:normalizeItem,refresh};
})();
