(()=>{
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  function rowFromShell(shell=document.getElementById('prepShell')){
    const href=shell?.querySelector('a.prepBtn.official')?.href;
    if(!href||typeof tracks!=='object'||!tracks)return null;
    const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);
    return entry?{id:entry[0],t:entry[1]}:null;
  }
  function flash(msg){
    document.querySelector('.assemblerActionFlash')?.remove();
    const el=document.createElement('div');el.className='assemblerActionFlash';el.textContent=msg;
    Object.assign(el.style,{position:'fixed',left:'50%',bottom:'42px',zIndex:'13050',transform:'translateX(-50%)',padding:'10px 14px',borderRadius:'10px',background:'#171c26',color:'#fff',fontSize:'8px',fontWeight:'900',boxShadow:'0 12px 32px rgba(0,0,0,.22)'});
    document.body.appendChild(el);setTimeout(()=>el.remove(),1900);
  }
  function commitVisibleAssembler(section){
    const shell=document.getElementById('prepShell'),row=rowFromShell(shell);if(!shell||!row||!section)return false;
    row.t.preparation=row.t.preparation||{};
    const pack=row.t.preparation.rolePack||(row.t.preparation.rolePack={});
    const cv=String(section.querySelector('[data-assembler="cv"]')?.value||'').trim();
    const mot=String(section.querySelector('[data-assembler="motivation"]')?.value||'').trim();
    if(!cv&&!mot)return false;
    pack.assembledCv=cv;pack.assembledMotivation=mot;pack.assembledAt=new Date().toISOString();
    row.t.preparation.updatedAt=pack.assembledAt;
    try{if(typeof persist==='function')persist()}catch{}
    try{window.OpportunityExactTrackDurability?.save?.()}catch{}
    return true;
  }
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('[data-assembler-action="assemble"]');if(!btn)return;
    const section=btn.closest('.appAssembler');if(!section)return;
    const beforeCv=String(section.querySelector('[data-assembler="cv"]')?.value||'');
    const beforeMot=String(section.querySelector('[data-assembler="motivation"]')?.value||'');
    setTimeout(()=>{
      const afterCv=String(section.querySelector('[data-assembler="cv"]')?.value||'');
      const afterMot=String(section.querySelector('[data-assembler="motivation"]')?.value||'');
      const ok=commitVisibleAssembler(section);if(!ok){flash('Complete drafted evidence before assembling.');return}
      const changed=beforeCv!==afterCv||beforeMot!==afterMot;
      btn.textContent='Assembled ✓';btn.dataset.assembled='true';
      btn.style.background='#273321';btn.style.borderColor='#273321';
      flash(changed?'Pack assembled from latest drafts ✓':'Pack already up to date — saved ✓');
    },40);
  },true);
})();