(()=>{
  const clean=v=>String(v||'').replace(/\*\*/g,'').replace(/^#+\s*/gm,'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().replace(/&/g,'and');
  const style=document.createElement('style');style.textContent=`
    .cvConsistency{border:1px solid #ead7a4;border-radius:12px;background:#fffaf0;padding:10px 11px;display:grid;gap:7px}.cvConsistency.ok{border-color:#d8e6c0;background:#f7fbea}.cvConsistency b{font-size:8.4px;color:#262d37}.cvConsistency p{margin:0;font-size:7px;line-height:1.5;color:#777f8b}.cvConsistencyGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cvConsistencyFact{background:#fff;border:1px solid #e5e8ec;border-radius:9px;padding:8px}.cvConsistencyFact span{display:block;font-size:6.4px;text-transform:uppercase;letter-spacing:.1em;color:#939aa4;font-weight:900;margin-bottom:3px}.cvConsistencyFact strong{display:block;font-size:7.4px;line-height:1.4;color:#2a3039}@media(max-width:780px){.cvConsistencyGrid{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
  function passportLine(shell){const role=shell.querySelector('.rolePack');if(!role)return'';const lines=String(role.innerText||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);const i=lines.findIndex(x=>/passport evidence available/i.test(x));return i>=0?lines.slice(i+1,i+3).join(' · '):''}
  function sourceFacts(src){return String(src||'').split(/\n+/).map(x=>clean(x)).filter(x=>/(msc|bsc|master|bachelor|degree)/i.test(x)).slice(0,4).join(' · ')}
  function strongMismatch(passport,src){const p=norm(passport),s=norm(src);if(!p||!s)return false;const pBusiness=/business( and |\s*&\s*)?management/.test(p)||/business management/.test(p);const sTech=/computer science|it project management|information technology/.test(s);const sBusiness=/business( and |\s*&\s*)?management|business management/.test(s);return pBusiness&&sTech&&!sBusiness}
  function manageReady(cv,mismatch){const ready=cv.querySelector('[data-cv-action="ready"]');if(!ready)return;if(mismatch){if(!ready.disabled)ready.dataset.consistencyBlocked='1';ready.disabled=true;ready.title='Resolve the CV / Passport education mismatch before marking this CV final.'}else if(ready.dataset.consistencyBlocked==='1'){ready.disabled=false;delete ready.dataset.consistencyBlocked;ready.removeAttribute('title')}}
  function mount(){
    const shell=document.getElementById('prepShell');if(!shell)return;
    const cv=shell.querySelector('.cvBuild');if(!cv)return;
    const src=cv.querySelector('[data-cv-build="source"]')?.value||'';if(src.trim().length<120)return;
    const passport=passportLine(shell),facts=sourceFacts(src),mismatch=strongMismatch(passport,src);
    let box=cv.querySelector('.cvConsistency');if(!box){box=document.createElement('div');box.className='cvConsistency';cv.querySelector('.cvBuildNotice')?.insertAdjacentElement('afterend',box)}
    const sig=JSON.stringify({mismatch,passport,facts});
    box.className='cvConsistency'+(mismatch?'':' ok');
    manageReady(cv,mismatch);
    if(box.dataset.cvConsistencySig===sig)return;
    box.dataset.cvConsistencySig=sig;
    box.innerHTML=`<b>${mismatch?'Profile consistency check needs review':'Profile consistency check'}</b><p>${mismatch?'The pasted CV and the Opportunity Passport appear to describe different education backgrounds. Do not mark the CV final until this is reconciled.':'Compare the source CV with the Opportunity Passport before finalising. This guard does not change your data automatically.'}</p><div class="cvConsistencyGrid"><div class="cvConsistencyFact"><span>CV education detected</span><strong>${facts||'No degree line detected from pasted CV'}</strong></div><div class="cvConsistencyFact"><span>Passport evidence detected</span><strong>${passport||'Passport education signal not found on this screen'}</strong></div></div>`;
    setTimeout(()=>window.OpportunityCvProfileReconciler?.refresh?.(),0);
  }
  document.addEventListener('input',e=>{if(e.target?.matches?.('[data-cv-build="source"]'))setTimeout(mount,120)},true);
  const obs=new MutationObserver(()=>setTimeout(mount,80));obs.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:statechange',()=>setTimeout(mount,120));
  setInterval(mount,1600);setTimeout(mount,800);window.OpportunityCvConsistencyGuard={refresh:mount};
})();