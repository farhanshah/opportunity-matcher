(()=>{
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  function rowFromShell(shell=document.getElementById('prepShell')){
    const href=shell?.querySelector('a.prepBtn.official')?.href;
    if(!href||typeof tracks!=='object'||!tracks)return null;
    const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);
    return entry?{id:entry[0],t:entry[1]}:null;
  }
  function syncLiveProofs(){
    const shell=document.getElementById('prepShell'),row=rowFromShell(shell);if(!shell||!row)return false;
    row.t.preparation=row.t.preparation||{};
    const pack=row.t.preparation.rolePack||(row.t.preparation.rolePack={});
    const items=pack.requirementEvidence||(pack.requirementEvidence={});
    let changed=false;
    shell.querySelectorAll('.proofReq[data-proof-req]').forEach(req=>{
      const id=req.dataset.proofReq;if(!id)return;
      const next={...(items[id]||{})};
      for(const key of ['evidence','cvBullet','motivation']){
        const el=req.querySelector(`[data-proof-field="${key}"]`);if(!el)continue;
        const value=String(el.value||'');
        if(next[key]!==value){next[key]=value;changed=true}
      }
      next.updatedAt=new Date().toISOString();items[id]=next;
    });
    if(changed){
      row.t.preparation.updatedAt=new Date().toISOString();
      try{window.OpportunityExactTrackDurability?.save?.()}catch{}
    }
    return changed;
  }
  document.addEventListener('pointerdown',e=>{
    const btn=e.target?.closest?.('[data-assembler-action="assemble"]');if(!btn)return;
    syncLiveProofs();
  },true);
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('[data-assembler-action="assemble"]');if(!btn)return;
    syncLiveProofs();
  },true);
  window.OpportunityAssemblerLiveDraftSync={sync:syncLiveProofs};
})();