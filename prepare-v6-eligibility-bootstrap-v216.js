(()=>{
  const VERSION='v216';
  const KEYS=['oppTracksV6','oppExactTracksV1','oppExactJournalV1'];
  const activeId=new URLSearchParams(location.search).get('id')||'';
  if(!activeId)return;

  const read=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};

  function facts(){
    for(const k of KEYS){
      const f=read(k)?.[activeId]?.exactVacancy?.officialFacts;
      if(f&&typeof f==='object'&&Object.keys(f).length)return f;
    }
    return{};
  }

  // Seed the academic-field signal synchronously before prepare-v1 initializes.
  const f=facts();
  if(f.field_of_study){
    for(const k of KEYS){
      const map=read(k),t=map[activeId];
      if(!t?.exactVacancy)continue;
      const signals=Array.isArray(t.exactVacancy.signals)?t.exactVacancy.signals:[];
      if(!signals.some(s=>/\bfield\b|discipline/i.test(String(s?.label||s||'')))){
        t.exactVacancy.signals=[...signals,{label:'field · official academic discipline requirement',source:'official-v216'}];
        map[activeId]=t;write(k,map);
      }
    }
  }

  function setText(selector,text){
    if(!text)return;
    const input=document.querySelector(selector);
    const node=input?.closest('.checkRow')?.querySelector('span');
    if(node&&node.textContent!==text)node.textContent=text;
  }

  function decorate(){
    const x=facts();
    setText('[data-verify-key="languageChecked"]',x.required_languages?`Official requirement: ${x.required_languages}`:'');
    setText('[data-verify-key="educationChecked"]',x.education_rule?`Official rule: ${x.education_rule}`:'');
    setText('[data-verify-key="fieldChecked"]',x.field_of_study?`Official accepted fields: ${x.field_of_study}`:'');
    document.documentElement.dataset.omEligibilityEvidence=VERSION;
  }

  // No MutationObserver. Re-decorate only after known user actions that can rebuild the Verify list.
  setTimeout(decorate,0);
  setTimeout(decorate,250);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-stage="verify"],[data-jump="verify"]'))setTimeout(decorate,0);
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.matches?.('[data-verify-key]'))setTimeout(decorate,0);
  },true);
})();
