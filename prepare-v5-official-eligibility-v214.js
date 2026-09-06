(()=>{
  const VERSION='v215';
  const KEYS=['oppTracksV6','oppExactTracksV1','oppExactJournalV1'];
  const activeId=new URLSearchParams(location.search).get('id')||'';
  if(!activeId)return;

  const read=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const jobId=url=>{try{return(new URL(url,location.origin).pathname.match(/\/(?:requisitions\/)?job\/(\d+)/i)||[])[1]||''}catch{return''}};

  function mergedTrack(){
    let out=null;
    for(const k of [...KEYS].reverse()){
      const t=read(k)[activeId];
      if(t)out={...(out||{}),...t,exactVacancy:{...(out?.exactVacancy||{}),...(t.exactVacancy||{})},preparation:{...(out?.preparation||{}),...(t.preparation||{})}};
    }
    return out;
  }

  function persistTrack(mutator){
    let changed=false;
    for(const k of KEYS){
      const map=read(k),t=map[activeId];
      if(!t?.exactVacancy)continue;
      const before=JSON.stringify(t);
      mutator(t);
      if(JSON.stringify(t)!==before){map[activeId]=t;write(k,map);changed=true}
    }
    return changed;
  }

  async function hydrateFacts(){
    let t=mergedTrack(),facts=t?.exactVacancy?.officialFacts||{};
    if(facts.field_of_study)return facts;
    const job=jobId(t?.exactVacancy?.url);if(!job)return facts;
    try{
      const r=await fetch(`/api/undp-vacancy-facts?job=${encodeURIComponent(job)}&ts=${Date.now()}`,{cache:'no-store',credentials:'same-origin'});
      const d=await r.json();
      if(r.ok&&d?.ok&&d?.facts&&Object.keys(d.facts).length){
        persistTrack(x=>{
          x.exactVacancy.officialFacts={...(x.exactVacancy.officialFacts||{}),...d.facts};
          x.exactVacancy.officialFactsQuality=d.source_quality||'official';
          x.exactVacancy.officialFactsCheckedAt=d.fetched_at||new Date().toISOString();
        });
        facts=d.facts;
      }
    }catch{}
    return facts;
  }

  function addFieldSignal(facts){
    if(!facts?.field_of_study)return false;
    return persistTrack(t=>{
      const signals=Array.isArray(t.exactVacancy.signals)?t.exactVacancy.signals:[];
      const has=signals.some(s=>/\bfield\b|discipline/i.test(String(s?.label||s||'')));
      if(!has){
        signals.push({label:'field · official academic discipline requirement',source:'official-v214'});
        t.exactVacancy.signals=signals;
      }
    });
  }

  function setTextIfChanged(node,text){
    if(node&&text&&node.textContent!==text)node.textContent=text;
  }

  function decorate(facts){
    if(!facts)return;
    const field=document.querySelector('[data-verify-key="fieldChecked"]');
    if(field){
      const desc=field.closest('.checkRow')?.querySelector('span');
      if(facts.field_of_study)setTextIfChanged(desc,`Official accepted fields: ${facts.field_of_study}`);
    }
    const edu=document.querySelector('[data-verify-key="educationChecked"]');
    if(edu){
      const desc=edu.closest('.checkRow')?.querySelector('span');
      if(facts.education_rule)setTextIfChanged(desc,`Official rule: ${facts.education_rule}`);
    }
    const lang=document.querySelector('[data-verify-key="languageChecked"]');
    if(lang){
      const desc=lang.closest('.checkRow')?.querySelector('span');
      if(facts.required_languages)setTextIfChanged(desc,`Official requirement: ${facts.required_languages}`);
    }
    document.documentElement.dataset.omEligibilityEvidence=VERSION;
  }

  async function run(){
    const facts=await hydrateFacts();
    const changed=addFieldSignal(facts);
    if(changed){
      const key=`omEligibilityReload:${VERSION}:${activeId}`;
      if(sessionStorage.getItem(key)!=='1'){
        sessionStorage.setItem(key,'1');
        location.reload();
        return;
      }
    }
    decorate(facts);
    const host=document.getElementById('verifyList');
    if(host){
      let queued=false;
      const obs=new MutationObserver(()=>{
        if(queued)return;
        queued=true;
        setTimeout(()=>{
          queued=false;
          decorate(mergedTrack()?.exactVacancy?.officialFacts||facts);
        },0);
      });
      // Only observe the list itself being rebuilt. Do not observe descendant text mutations,
      // otherwise decorating a row can recursively trigger the observer.
      obs.observe(host,{childList:true});
    }
  }

  setTimeout(run,220);
  setTimeout(()=>decorate(mergedTrack()?.exactVacancy?.officialFacts||{}),1000);
})();
