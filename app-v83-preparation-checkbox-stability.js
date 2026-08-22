(()=>{
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  function rowFromShell(shell=document.getElementById('prepShell')){
    const href=shell?.querySelector('a.prepBtn.official')?.href;
    if(!href||typeof tracks!=='object'||!tracks)return null;
    const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);
    return entry?{id:entry[0],t:entry[1]}:null;
  }
  function saveRow(row,shell){
    if(!row)return;
    row.t.preparation={...(row.t.preparation||{})};
    const notes=shell?.querySelector('#prepNotes');
    if(notes)row.t.preparation.notes=String(notes.value||'');
    row.t.preparation.updatedAt=new Date().toISOString();
    try{window.persist?.()}catch{}
    try{window.OpportunityExactTrackDurability?.save?.()}catch{}
    try{window.dispatchEvent(new CustomEvent('opportunity:statechange'))}catch{}
  }
  function wireInput(inp,shell){
    if(inp.dataset.stablePrepCheck==='1')return;
    // app-v67 used a full modal re-render on each checkbox change. Remove that handler;
    // it caused the visible flash and could race with cloud/local hydration.
    inp.onchange=null;
    inp.dataset.stablePrepCheck='1';
    inp.addEventListener('change',()=>{
      const row=rowFromShell(shell);if(!row)return;
      row.t.preparation={...(row.t.preparation||{})};
      const key=inp.dataset.prepKey;if(!key)return;
      row.t.preparation[key]=Boolean(inp.checked);
      inp.closest('.prepCheck')?.classList.toggle('done',Boolean(inp.checked));
      saveRow(row,shell);
      const status=shell.querySelector('.prepStatus');if(status)status.textContent='Saved ✓';
      setTimeout(()=>{
        try{window.OpportunityPreparationCommand?.refresh?.()}catch{}
        try{window.OpportunityPreparationTabs?.refresh?.()}catch{}
        try{window.OpportunityPreparationSaveUX?.refresh?.()}catch{}
      },0);
    });
  }
  function wire(){
    const modal=document.getElementById('prepModal'),shell=document.getElementById('prepShell');
    if(!modal||modal.classList.contains('hide')||!shell)return;
    shell.querySelectorAll('[data-prep-key]').forEach(inp=>wireInput(inp,shell));
  }
  const obs=new MutationObserver(()=>queueMicrotask(wire));
  obs.observe(document.body,{subtree:true,childList:true});
  setInterval(wire,700);setTimeout(wire,250);
  window.OpportunityPreparationCheckboxStability={refresh:wire};
})();