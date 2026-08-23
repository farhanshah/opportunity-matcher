(()=>{
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const meaningful=v=>String(v||'').trim().length>=40;
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const style=document.createElement('style');
  style.textContent=`
    .docStudio{display:grid;gap:10px;margin:0 0 12px;padding:12px;border:1px solid var(--om-line);border-radius:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--om-surface-2) 92%,transparent),color-mix(in srgb,var(--om-violet) 6%,var(--om-surface)));color:var(--om-text)}
    .docStudioHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.docStudioEy{font-size:7px;text-transform:uppercase;letter-spacing:.13em;font-weight:950;color:var(--om-lime)}.docStudioHead h4{margin:4px 0 3px;font-size:13px;line-height:1.25;color:var(--om-heading)}.docStudioHead p{margin:0;max-width:720px;font-size:8px;line-height:1.5;color:var(--om-muted)}.docStudioProgress{white-space:nowrap;padding:6px 8px;border-radius:999px;border:1px solid var(--om-line);background:var(--om-surface);font-size:7px;font-weight:900;color:var(--om-text)}
    .docStudioGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.docStudioCard{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;text-align:left;border:1px solid var(--om-line);border-radius:11px;background:var(--om-surface);color:var(--om-text);padding:10px;cursor:pointer;transition:transform .2s ease,border-color .2s ease,background .2s ease}.docStudioCard:hover{transform:translateY(-2px);border-color:rgba(167,139,250,.28);background:var(--om-surface-2)}.docStudioCard .n{display:grid;place-items:center;width:25px;height:25px;border-radius:8px;background:var(--om-surface-2);color:var(--om-violet-2);font-size:8px;font-weight:950}.docStudioCard.done .n{background:rgba(216,255,105,.10);color:var(--om-lime)}.docStudioCard b{display:block;font-size:8.5px;color:var(--om-heading)}.docStudioCard small{display:block;margin-top:2px;font-size:7px;line-height:1.35;color:var(--om-muted)}.docStudioCard .state{font-size:6.8px;font-weight:900;color:var(--om-muted)}.docStudioCard.done .state{color:var(--om-lime)}
    .docStudioNotice{padding:8px 9px;border-radius:10px;border:1px solid rgba(99,230,210,.14);background:rgba(99,230,210,.055);font-size:7.2px;line-height:1.45;color:var(--om-muted)}.docStudioNotice b{color:var(--om-text)}
    .prepStageBar.studioTruth{background:var(--om-surface)!important;border-color:var(--om-line)!important}.prepStageBar.studioTruth div b{color:var(--om-heading)!important}.prepStageBar.studioTruth div span{color:var(--om-muted)!important}.prepStageBar.studioTruth .prepStageBtn{background:var(--om-lime)!important;color:#11170a!important}
    @media(max-width:900px){.docStudioGrid{grid-template-columns:1fr}.docStudioHead{flex-direction:column}}
  `;
  document.head.appendChild(style);

  function rowFromShell(shell=document.getElementById('prepShell')){
    if(!shell||typeof tracks!=='object'||!tracks)return null;
    const stored=shell.dataset?.exactTrackId;
    if(stored&&tracks[stored])return{id:stored,t:tracks[stored],m:tracks[stored].exactVacancy};
    const href=shell.querySelector('a.prepBtn.official')?.href;
    if(href){const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);if(entry)return{id:entry[0],t:entry[1],m:entry[1].exactVacancy}}
    const title=String(shell.querySelector('.prepHero h2,.prepHead h2,h2')?.textContent||'').toLowerCase().trim();
    if(title){const entry=Object.entries(tracks).find(([,t])=>String(t?.exactVacancy?.title||'').toLowerCase().trim()===title);if(entry)return{id:entry[0],t:entry[1],m:entry[1].exactVacancy}}
    return null;
  }

  function truth(shell,row){
    const p=row.t.preparation||(row.t.preparation={}),role=p.rolePack||(p.rolePack={}),req=role.requirementEvidence||{},final=role.finalApplication||(role.finalApplication={});
    const checkEls=[...shell.querySelectorAll('[data-prep-key]')].filter(x=>/eligibilityReviewed|languageChecked|nationalityChecked|educationChecked|fieldChecked/.test(x.dataset.prepKey||''));
    const verifyDone=checkEls.filter(x=>x.checked).length,verifyTotal=checkEls.length;
    const reqItems=Object.values(req),proofEls=[...shell.querySelectorAll('.proofReq[data-proof-req]')];
    const evidenceTotal=Math.max(reqItems.length,proofEls.length),evidenceDone=reqItems.filter(x=>meaningful(x?.evidence)).length;
    const verified=verifyTotal?verifyDone===verifyTotal:Boolean(p.eligibilityReviewed);
    const evidenceReady=evidenceTotal?evidenceDone>=Math.min(2,evidenceTotal):meaningful(role.evidenceBank)||meaningful(role.cvNotes);
    const cv=Boolean(p.cvReady),cover=Boolean(p.motivationDraft),docsReady=cv&&cover;
    const writing=Boolean(final.writingSampleReady),pdf=Boolean(final.singlePdfReady);
    const finalReady=verified&&evidenceReady&&docsReady&&writing&&pdf;
    const score=Math.round((Number(verified)*20)+(Number(evidenceReady)*20)+(Number(cv)*20)+(Number(cover)*15)+(Number(writing)*15)+(Number(pdf)*10));
    return{p,role,final,verifyDone,verifyTotal,verified,evidenceDone,evidenceTotal,evidenceReady,cv,cover,docsReady,writing,pdf,finalReady,score};
  }

  function scrollTo(shell,selector){
    const el=shell.querySelector(selector);if(!el)return;
    el.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function mountStudio(shell,row,s){
    const role=shell.querySelector('.rolePack');if(!role)return;
    let studio=role.querySelector('.docStudio');
    if(!studio){studio=document.createElement('section');studio.className='docStudio';role.insertBefore(studio,role.firstChild)}
    const parts=[
      {k:'cv',label:'Tailored CV',meta:s.cv?'Reviewed and marked ready':'Review the actual complete CV',done:s.cv,sel:'.cvBuild,[data-role-pack="cvNotes"]'},
      {k:'cover',label:'Cover / motivation',meta:s.cover?'Reviewed and marked ready':'Review the role-specific response',done:s.cover,sel:'.coverBuild,[data-role-pack="motivationDraftText"]'},
      {k:'pack',label:'Writing sample + final PDF',meta:s.pdf?'Combined pack ready':s.writing?'Writing sample chosen · PDF still needed':'Choose writing sample and assemble pack',done:s.writing&&s.pdf,sel:'.finalPack'}
    ];
    const sig=JSON.stringify({id:row.id,score:s.score,parts:parts.map(x=>[x.k,x.done,x.meta])});
    if(studio.dataset.sig===sig)return;studio.dataset.sig=sig;
    studio.innerHTML=`<div class="docStudioHead"><div><div class="docStudioEy">Document studio</div><h4>Finish the actual application files, not only the evidence notes.</h4><p>Your evidence mapping is already useful. From here, review the real CV and cover response, choose the writing sample, then build the final upload pack without inventing unsupported claims.</p></div><span class="docStudioProgress">${s.score}% preparation</span></div><div class="docStudioGrid">${parts.map((x,i)=>`<button type="button" class="docStudioCard ${x.done?'done':''}" data-doc-jump="${x.k}"><span class="n">${x.done?'✓':i+1}</span><span><b>${safe(x.label)}</b><small>${safe(x.meta)}</small></span><span class="state">${x.done?'Ready':'Open'}</span></button>`).join('')}</div><div class="docStudioNotice"><b>Next:</b> ${s.pdf?'Run the final official-provider check and submit only when the provider form matches your prepared files.':s.writing?'Combine the reviewed CV, cover letter and writing sample into the provider-ready upload package.':s.docsReady?'Choose one relevant writing sample you personally authored, then assemble the final package.':!s.cv?'Review the complete role-tailored CV first.':'Review the cover / motivation response next.'}</div>`;
    studio.querySelectorAll('[data-doc-jump]').forEach(btn=>btn.onclick=()=>{const item=parts.find(x=>x.k===btn.dataset.docJump);if(item)scrollTo(shell,item.sel)});
  }

  function overrideLegacy(shell,row,s){
    // Keep old preparation percentage and stage CTA aligned with Application Studio truth.
    const prepFact=[...shell.querySelectorAll('.prepFact')].find(x=>x.querySelector('span')?.textContent?.trim()==='Preparation')?.querySelector('b');
    if(prepFact)prepFact.textContent=`${s.score}% complete`;
    const bar=shell.querySelector('.prepProgress i');if(bar)bar.style.width=`${s.score}%`;
    const cmdPct=[...shell.querySelectorAll('.prepCommandStat')].find(x=>/overall preparation/i.test(x.querySelector('span')?.textContent||''))?.querySelector('b');if(cmdPct)cmdPct.textContent=`${s.score}%`;

    const stage=shell.querySelector('.prepStageBar');
    if(stage){
      stage.classList.add('studioTruth');
      const copy=stage.querySelector('div');const btn=stage.querySelector('button');
      if(copy)copy.innerHTML=`<b>Pipeline stage: ${safe(row.t.stage||'Researching')}</b><span>${s.finalReady?'Final application pack is ready for one last provider check.':s.docsReady?'Core documents are ready. Finish the writing sample / combined upload pack, then run the final provider check.':'Move stages only when the actual preparation evidence supports it.'}</span>`;
      if(btn){
        btn.disabled=false;
        if(s.finalReady){btn.textContent='Open official vacancy for final check ↗';btn.onclick=()=>window.open(row.m?.url,'_blank','noopener')}
        else if(s.docsReady){btn.textContent=s.writing?'Finish combined upload pack':'Choose writing sample';btn.onclick=()=>{const pack=shell.querySelector('.finalPack');if(pack)pack.scrollIntoView({behavior:'smooth',block:'start'});else window.OpportunityApplicationStudio?.go?.('documents')}}
        else{btn.textContent='Continue document preparation';btn.onclick=()=>window.OpportunityApplicationStudio?.go?.('documents')}
      }
    }

    // Evidence tab should report evidence mapping, not the count of arbitrary textareas.
    const badge=shell.querySelector('[data-tab-pack]');
    if(badge&&s.evidenceTotal)badge.textContent=`${s.evidenceDone}/${s.evidenceTotal}`;
  }

  function refresh(){
    const modal=document.getElementById('prepModal'),shell=document.getElementById('prepShell');
    if(!modal||modal.classList.contains('hide')||!shell)return;
    const row=rowFromShell(shell);if(!row)return;
    const s=truth(shell,row);
    mountStudio(shell,row,s);
    overrideLegacy(shell,row,s);
  }

  const obs=new MutationObserver(()=>{clearTimeout(obs._t);obs._t=setTimeout(refresh,70)});obs.observe(document.body,{subtree:true,childList:true});
  document.addEventListener('change',e=>{if(e.target?.closest?.('#prepShell'))setTimeout(refresh,60)},true);
  document.addEventListener('input',e=>{if(e.target?.closest?.('#prepShell'))setTimeout(refresh,140)},true);
  window.addEventListener('opportunity:statechange',()=>setTimeout(refresh,80));
  setInterval(refresh,1200);setTimeout(refresh,500);
  window.OpportunityDocumentStudio={refresh};
})();