(()=>{
  const VERSION='v213';
  const TRACK_KEYS=['oppTracksV6','oppExactTracksV1','oppExactJournalV1'];
  const inflight=new Map();
  let running=false;

  const read=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const norm=v=>String(v||'').trim();
  const jobId=url=>{try{return(new URL(url,location.origin).pathname.match(/\/(?:requisitions\/)?job\/(\d+)/i)||[])[1]||''}catch{return''}};
  const isUndp=t=>/\bUNDP\b/i.test(String(t?.exactVacancy?.provider||t?.exactVacancy?.source||t?.provider||''))&&Boolean(jobId(t?.exactVacancy?.url));
  const isoDate=raw=>{
    const s=String(raw||'').trim();
    let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(m)return`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
    m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:'';
  };
  const same=(a,b)=>norm(a).toLowerCase()===norm(b).toLowerCase();

  async function factsFor(job){
    if(inflight.has(job))return inflight.get(job);
    const p=(async()=>{
      try{
        const r=await fetch(`/api/undp-vacancy-facts?job=${encodeURIComponent(job)}&ts=${Date.now()}`,{cache:'no-store',credentials:'same-origin'});
        const d=await r.json();
        if(!r.ok||!d?.ok||!d?.facts||!Object.keys(d.facts).length)return null;
        return d;
      }catch{return null}
    })();
    inflight.set(job,p);return p;
  }

  function canonicalPatch(t,data){
    const f=data?.facts||{},v=t?.exactVacancy||{};
    const location=norm(f.locations),deadline=isoDate(f.apply_before),language=norm(f.required_languages),education=norm(f.education_work_experience);
    const patch={};
    if(location&&!same(location,v.location))patch.location=location;
    if(deadline&&deadline!==String(v.deadline||''))patch.deadline=deadline;
    if(language&&!same(language,v.required_language||v.requiredLanguage))patch.required_language=language;
    if(education&&!same(education,v.minimum_education||v.minimumEducation))patch.minimum_education=education;
    if(data?.url&&norm(data.url)!==norm(v.url))patch.url=data.url;
    return patch;
  }

  function applyTrack(t,data){
    if(!t?.exactVacancy)return{changed:false,canonicalChanged:false};
    const patch=canonicalPatch(t,data),canonicalChanged=Object.keys(patch).length>0;
    if(canonicalChanged)Object.assign(t.exactVacancy,patch);
    t.exactVacancy.officialFacts={...(t.exactVacancy.officialFacts||{}),...(data.facts||{})};
    t.exactVacancy.officialFactsQuality=data.source_quality||'official';
    t.exactVacancy.officialFactsJob=String(data.job||jobId(t.exactVacancy.url)||'');
    t.exactVacancy.officialFactsCheckedAt=data.fetched_at||new Date().toISOString();
    return{changed:true,canonicalChanged};
  }

  function allMaps(){
    const maps=TRACK_KEYS.map(k=>[k,read(k)]);
    let active=null;
    try{active=typeof tracks==='object'&&tracks?tracks:window.tracks}catch{active=window.tracks}
    if(active&&typeof active==='object')maps.unshift(['__active__',active]);
    return maps;
  }

  async function reconcile(){
    if(running)return;running=true;
    try{
      const maps=allMaps(),jobs=new Map();
      for(const [,map] of maps)for(const [id,t] of Object.entries(map||{})){
        if(!isUndp(t))continue;
        const job=jobId(t.exactVacancy.url);if(!jobs.has(job))jobs.set(job,[]);
        jobs.get(job).push({id,t});
      }
      if(!jobs.size)return;

      let canonicalChanged=false,currentChanged=false;
      const currentId=new URLSearchParams(location.search).get('id')||'';
      for(const [job,refs] of jobs){
        const data=await factsFor(job);if(!data)continue;
        for(const {id,t} of refs){
          const out=applyTrack(t,data);canonicalChanged=canonicalChanged||out.canonicalChanged;
          if(id===currentId&&out.canonicalChanged)currentChanged=true;
        }
        // Correct the live exact feed in memory as well, so Dashboard re-ranks from official facts.
        try{
          const items=window.OpportunityBestLive?.status?.()?.items||[];
          for(const x of items){
            if(jobId(x?.url)!==job)continue;
            const loc=norm(data.facts?.locations),dl=isoDate(data.facts?.apply_before);
            if(loc)x.location=loc;if(dl)x.deadline=dl;
          }
        }catch{}
      }

      for(const [key,map] of maps)if(key!=='__active__')write(key,map);
      if(canonicalChanged){
        try{localStorage.setItem('oppTracksV6',JSON.stringify((typeof tracks==='object'&&tracks)||window.tracks||read('oppTracksV6')))}catch{}
        try{persist?.()}catch{}
        try{window.OpportunityExactTrackDurability?.save?.()}catch{}
      }

      document.documentElement.dataset.omSourceTruth=VERSION;

      if(location.pathname.startsWith('/prepare')&&currentChanged){
        const key=`omSourceTruthReload:${VERSION}:${currentId}`;
        if(sessionStorage.getItem(key)!=='1'){
          sessionStorage.setItem(key,'1');
          location.reload();
          return;
        }
      }
      if(canonicalChanged&&!location.pathname.startsWith('/prepare')){
        try{window.renderTracker?.()}catch{}
        try{window.renderDashboard?.()}catch{}
        setTimeout(()=>{
          try{window.OpportunityLiveActionBridgeV2?.refresh?.()}catch{}
          try{window.OpportunityLiveActionBridge?.refresh?.()}catch{}
          try{window.OpportunityExactTrackDurability?.hydrate?.()}catch{}
        },40);
      }
    }finally{running=false}
  }

  window.OpportunityOfficialSourceTruth={refresh:reconcile,jobId,version:VERSION};
  queueMicrotask(reconcile);
  setTimeout(reconcile,450);
  setTimeout(reconcile,1600);
  window.addEventListener('opportunity:hydrated',()=>setTimeout(reconcile,60));
})();
