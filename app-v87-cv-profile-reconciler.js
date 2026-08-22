(()=>{
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const style=document.createElement('style');style.textContent=`
    .cvReconcileActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:2px}.cvReconcileBtn{border:1px solid #d7c487;border-radius:9px;background:#fff4c9;color:#5f4c18;padding:8px 10px;font-size:7px;font-weight:900;cursor:pointer}.cvReconcileBtn:hover{background:#ffefad}.cvReconcileNote{font-size:6.8px;line-height:1.45;color:#806c36}.cvReconcileDone{padding:8px 9px;border-radius:9px;background:#eef8e6;border:1px solid #d6e7c5;color:#4d6d31;font-size:7px;line-height:1.45}
  `;document.head.appendChild(style);
  function rowFromShell(shell=document.getElementById('prepShell')){const href=shell?.querySelector('a.prepBtn.official')?.href;if(!href||typeof tracks!=='object'||!tracks)return null;const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);return entry?{id:entry[0],t:entry[1],m:entry[1].exactVacancy}:null}
  function persist(row){row.t.preparation.updatedAt=new Date().toISOString();try{window.persist?.()}catch{};try{window.OpportunityExactTrackDurability?.save?.()}catch{};try{window.dispatchEvent(new CustomEvent('opportunity:statechange'))}catch{}}
  function sourceLooksLikeFarhan(cv){const s=String(cv||'').toLowerCase();return s.includes('farhan shah')&&s.includes('msc')&&s.includes('it project management')&&s.includes('bsc')&&s.includes('computer science')}
  function reconcile(){const shell=document.getElementById('prepShell'),row=rowFromShell(shell),cv=shell?.querySelector('[data-cv-build="source"]')?.value||'';if(!row||!sourceLooksLikeFarhan(cv))return false;
    const state=window.OpportunityState,p=state?.getProfile?.()||{};
    const next={...p,edu:"Master's degree",field:'Computer Science, AI & Data',degreeStatus:'Completed',degreeName:'MSc IT Project Management'};
    try{state?.setProfile?.(next)}catch{}
    try{currentProfile={...currentProfile,...next};saveProfileState?.()}catch{}
    const prep=row.t.preparation||(row.t.preparation={}),role=prep.rolePack||(prep.rolePack={}),final=role.finalApplication||(role.finalApplication={});
    const keepCv=String(final.cvSourceText||cv||'');
    role.requirementEvidence={};role.assembledCv='';role.assembledMotivation='';role.cvNotes='';role.evidenceBank='';role.motivationDraftText='';
    role.gapsQuestions='Profile reconciled to the confirmed CV education: MSc IT Project Management and BSc Computer Science. Rebuild role evidence using only Farhan’s verified CV, projects and examples.';
    final.cvSourceText=keepCv;final.cvFinalDraft='';final.writingSampleNote='';final.writingSampleReady=false;final.singlePdfReady=false;
    prep.cvReady=false;prep.motivationDraft=false;
    prep.profileReconciledAt=new Date().toISOString();prep.profileReconciledFrom='cv-confirmed';
    persist(row);try{window.OpportunityState?.render?.()}catch{};setTimeout(()=>{try{window.OpportunityRoleApplicationPack?.refresh?.();window.OpportunityProofToDraft?.refresh?.();window.OpportunityApplicationAssembler?.refresh?.();window.OpportunityTailoredCvWorkspace?.refresh?.();window.OpportunityCvConsistencyGuard?.refresh?.()}catch{}},120);return true
  }
  function mount(){const shell=document.getElementById('prepShell'),cv=shell?.querySelector('.cvBuild'),box=cv?.querySelector('.cvConsistency');if(!shell||!cv||!box)return;const row=rowFromShell(shell),src=cv.querySelector('[data-cv-build="source"]')?.value||'';if(!row||!sourceLooksLikeFarhan(src))return;
    if(row.t.preparation?.profileReconciledFrom==='cv-confirmed'){if(!box.querySelector('.cvReconcileDone'))box.insertAdjacentHTML('beforeend','<div class="cvReconcileDone">Confirmed CV education has been applied to the Opportunity Passport for this workspace. Previous Business & Management-based proof drafts were cleared so they cannot leak into the application.</div>');return}
    if(box.querySelector('[data-cv-reconcile]'))return;
    box.insertAdjacentHTML('beforeend','<div class="cvReconcileActions"><button type="button" class="cvReconcileBtn" data-cv-reconcile>Use confirmed CV education</button><span class="cvReconcileNote">Sets Passport education to Master\'s degree · Computer Science, AI & Data · MSc IT Project Management, then clears incompatible proof drafts while keeping the pasted CV source.</span></div>');
    box.querySelector('[data-cv-reconcile]').onclick=()=>{const btn=box.querySelector('[data-cv-reconcile]');btn.disabled=true;btn.textContent='Reconciling…';if(reconcile()){btn.textContent='Reconciled ✓'}else{btn.disabled=false;btn.textContent='Try again'}}
  }
  const obs=new MutationObserver(()=>setTimeout(mount,60));obs.observe(document.body,{subtree:true,childList:true});setInterval(mount,1500);setTimeout(mount,700);window.OpportunityCvProfileReconciler={refresh:mount,reconcile};
})();