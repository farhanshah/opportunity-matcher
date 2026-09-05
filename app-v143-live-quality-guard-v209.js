(()=>{
  const BUILD='v209';
  let attempts=0;

  const localToday=()=>{
    const d=new Date(),off=d.getTimezoneOffset();
    return new Date(d.getTime()-off*60000).toISOString().slice(0,10);
  };
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const cleanDeadline=v=>/^20\d{2}-\d{2}-\d{2}$/.test(String(v||''))?String(v):'';
  const qualityRank=v=>({high:5,medium:4,'status-verified-vacancy':4,'provider-verified-fallback':3,low:2,none:1}[String(v||'').toLowerCase()]||0);

  function canonicalUrl(raw){
    try{
      const u=new URL(String(raw||''));
      u.hash='';
      ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','source','ref','referrer','tracking','trk'].forEach(k=>u.searchParams.delete(k));
      const pairs=[...u.searchParams.entries()].sort(([a,av],[b,bv])=>a.localeCompare(b)||av.localeCompare(bv));
      u.search='';
      for(const [k,v] of pairs)u.searchParams.append(k,v);
      const host=u.hostname.replace(/^www\./,'').toLowerCase();
      const path=u.pathname.replace(/\/+$/,'').replace(/\/+/g,'/').toLowerCase();
      const qs=u.searchParams.toString();
      return `${host}${path}${qs?`?${qs.toLowerCase()}`:''}`;
    }catch{return norm(raw)}
  }

  function fallbackKey(x){
    return [norm(x?.provider||x?.source||x?.programmeId),norm(x?.title),cleanDeadline(x?.deadline),norm(x?.location)].join('|');
  }

  function strength(x){
    let n=0;
    if(cleanDeadline(x?.deadline))n+=10;
    if(String(x?.detail_text||'').length>200)n+=5;
    if(String(x?.board_context||'').length>100)n+=2;
    n+=qualityRank(x?.detail_evidence_quality||x?.evidence_quality||x?.quality);
    n+=Math.max(-20,Math.min(20,Number(x?._score||0)))/20;
    return n;
  }

  function sanitize(raw){
    const src=raw&&typeof raw==='object'?raw:{};
    const incoming=Array.isArray(src.items)?src.items:[];
    const today=localToday();
    const winners=new Map();
    let invalidExact=0,expired=0,duplicates=0,malformed=0;

    for(const item of incoming){
      if(!item||typeof item!=='object'){malformed++;continue}
      if(item.status_verified!==true||item.verification_level!=='exact'){invalidExact++;continue}
      if(!item.url){malformed++;continue}
      const deadline=cleanDeadline(item.deadline);
      if(deadline&&deadline<today){expired++;continue}

      const canonical=canonicalUrl(item.url);
      const key=canonical||fallbackKey(item);
      const candidate={...item,_quality_guard:BUILD,_canonical_key:key,_freshness_checked_on:today};
      const prev=winners.get(key);
      if(!prev){winners.set(key,candidate);continue}
      duplicates++;
      if(strength(candidate)>strength(prev))winners.set(key,candidate);
    }

    // A second identity pass catches providers that expose the same vacancy through
    // multiple language or tracking URLs while keeping genuinely different roles.
    const identity=new Map();
    for(const item of winners.values()){
      const idKey=fallbackKey(item);
      const prev=identity.get(idKey);
      if(!prev){identity.set(idKey,item);continue}
      duplicates++;
      if(strength(item)>strength(prev))identity.set(idKey,item);
    }

    const items=[...identity.values()];
    return {
      ...src,
      items,
      quality_guard:{
        build:BUILD,
        checked_on:today,
        incoming:incoming.length,
        surviving:items.length,
        removed_expired:expired,
        removed_duplicates:duplicates,
        removed_invalid_exact:invalidExact,
        removed_malformed:malformed,
        policy:'exact-only + current-deadline + canonical-dedupe'
      }
    };
  }

  function install(){
    const api=window.OpportunityBestLive;
    if(!api||typeof api.status!=='function'){
      if(++attempts<30)setTimeout(install,50);
      return;
    }
    if(api.__qualityGuardV209)return;

    const rawStatus=api.status.bind(api);
    const rawRefresh=typeof api.refresh==='function'?api.refresh.bind(api):null;
    api.status=()=>sanitize(rawStatus());
    if(rawRefresh){
      api.refresh=(...args)=>{
        const out=rawRefresh(...args);
        setTimeout(()=>window.dispatchEvent(new CustomEvent('opportunity:livequalitychange',{detail:api.status().quality_guard})),50);
        return out;
      };
    }
    api.__qualityGuardV209=true;

    window.OpportunityLiveQualityGuard={
      audit:()=>api.status().quality_guard,
      items:()=>[...(api.status().items||[])],
      sanitize
    };

    document.documentElement.dataset.omLiveQuality=BUILD;
    try{window.dispatchEvent(new CustomEvent('opportunity:livequalitychange',{detail:api.status().quality_guard}))}catch{}
  }

  install();
})();
