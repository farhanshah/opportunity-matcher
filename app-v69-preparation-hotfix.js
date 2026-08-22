(()=>{
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  function activeTrack(){
    const shell=document.getElementById('prepShell');
    const href=shell?.querySelector('a.prepBtn.official')?.href;
    if(!href||typeof tracks!=='object'||!tracks)return null;
    const target=canon(href);
    const entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);
    return entry?entry[1]:null;
  }
  function preserveNotes(){
    const shell=document.getElementById('prepShell');
    const notes=shell?.querySelector('#prepNotes');
    const t=activeTrack();
    if(!notes||!t)return;
    t.preparation={...(t.preparation||{}),notes:String(notes.value||'')};
  }
  function markExpired(){
    const shell=document.getElementById('prepShell');
    const t=activeTrack();
    const d=t?.exactVacancy?.deadline;
    if(!shell||!d)return;
    const end=new Date(`${d}T23:59:59`);
    if(Number.isNaN(end.getTime())||end.getTime()>=Date.now())return;
    const fact=[...shell.querySelectorAll('.prepFact')].find(x=>x.querySelector('span')?.textContent?.trim()==='Time left');
    const value=fact?.querySelector('b');
    if(value)value.textContent='Expired';
  }
  document.addEventListener('change',e=>{if(e.target?.matches?.('#prepShell [data-prep-key]'))preserveNotes()},true);
  const obs=new MutationObserver(()=>queueMicrotask(markExpired));
  obs.observe(document.body,{subtree:true,childList:true});
  setInterval(markExpired,2000);
  window.OpportunityPreparationHotfix={preserveNotes,markExpired};
})();