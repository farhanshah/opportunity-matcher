(()=>{
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  let saveTimer=null,lastBoundShell=null;

  const style=document.createElement('style');
  style.textContent=`
    .rolePack{grid-column:1/-1;background:#fff;border:1px solid #e1e5ea;border-radius:16px;padding:16px;display:grid;gap:12px}
    .rolePackHead{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.rolePackEy{font-size:7px;font-weight:950;text-transform:uppercase;letter-spacing:.13em;color:#7559ef}.rolePackHead h3{margin:4px 0 3px;font-size:14px;color:#191f29}.rolePackHead p{margin:0;font-size:8px;line-height:1.45;color:#858c97;max-width:650px}.rolePackSaved{font-size:7px;font-weight:900;color:#5f7c34;white-space:nowrap;padding:6px 8px;border-radius:999px;background:#f1f7e5;border:1px solid #dfe9c4}
    .rolePackSignals{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rolePackSignal{padding:10px 11px;border-radius:11px;border:1px solid #e5e8ed;background:#fafbfc}.rolePackSignal span{display:block;font-size:6.5px;text-transform:uppercase;letter-spacing:.09em;color:#9097a3}.rolePackSignal b{display:block;margin-top:3px;font-size:8.5px;line-height:1.45;color:#252b36}
    .rolePackGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rolePackCard{border:1px solid #e3e7ec;border-radius:13px;background:#fbfbfc;padding:12px}.rolePackCard h4{margin:0 0 3px;font-size:10px;color:#1d2430}.rolePackCard>p{margin:0 0 8px;font-size:7.5px;line-height:1.45;color:#858c97}.rolePackPrompt{margin:0 0 8px;padding:8px 9px;border-radius:9px;border:1px solid #e5eccf;background:#f6f9eb;font-size:7px;line-height:1.45;color:#58633d}.rolePackPrompt b{color:#29320e}
    .rolePackText{display:block;width:100%;min-height:105px;resize:vertical;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:10px;background:#fff;padding:9px 10px;font:inherit;font-size:8.5px;line-height:1.45;color:#252b36}.rolePackText:focus{outline:2px solid rgba(117,89,239,.13);border-color:#b9aae9}.rolePackMeta{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:6px;font-size:6.8px;color:#9197a2}.rolePackMeta button{border:0;background:transparent;padding:0;color:#6c56d9;font-size:6.8px;font-weight:900;cursor:pointer}
    .rolePackFooter{display:flex;justify-content:space-between;gap:10px;align-items:center;padding-top:2px}.rolePackFooter span{font-size:7px;color:#858c97}.rolePackActions{display:flex;gap:7px}.rolePackAction{border:1px solid #dfe3e8;border-radius:9px;background:#fff;color:#222;padding:8px 10px;font-size:7px;font-weight:900;cursor:pointer}.rolePackAction.primary{background:#171c26;color:#fff;border-color:#171c26}
    @media(max-width:780px){.rolePackSignals,.rolePackGrid{grid-template-columns:1fr}.rolePackHead,.rolePackFooter{flex-direction:column}.rolePackActions{width:100%;display:grid;grid-template-columns:1fr 1fr}.rolePackAction{width:100%}}
  `;
  document.head.appendChild(style);

  function trackFromShell(shell=document.getElementById('prepShell')){
    const href=shell?.querySelector('a.prepBtn.official')?.href;if(!href||typeof tracks!=='object'||!tracks)return null;
    const target=canon(href);const entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);
    return entry?{id:entry[0],t:entry[1],m:entry[1].exactVacancy}:null;
  }
  function liveItem(url){const target=canon(url);try{return (window.OpportunityBestLive?.status?.()?.items||[]).find(x=>canon(x?.url)===target)||null}catch{return null}}
  function roleData(t){
    t.preparation={...(t.preparation||{})};
    t.preparation.rolePack={cvNotes:'',evidenceBank:'',motivationDraftText:'',gapsQuestions:'',...(t.preparation.rolePack||{})};
    return t.preparation.rolePack;
  }
  function persist(row,shell,status){
    if(!row)return;const pack=roleData(row.t);
    shell.querySelectorAll('[data-role-pack]').forEach(el=>{pack[el.dataset.rolePack]=String(el.value||'')});
    row.t.preparation.updatedAt=new Date().toISOString();
    try{window.persist?.()}catch{};try{window.OpportunityExactTrackDurability?.save?.()}catch{};window.dispatchEvent(new CustomEvent('opportunity:statechange'));
    if(status){status.textContent='Saved';status.classList.add('saved')}
  }
  function scheduleSave(row,shell,status){
    clearTimeout(saveTimer);if(status){status.textContent='Saving…';status.classList.remove('saved')}
    saveTimer=setTimeout(()=>persist(row,shell,status),400);
  }
  function keywords(row){
    const text=norm([row.m?.title,row.m?.why,row.m?.readiness,liveItem(row.m?.url)?.detail_text].filter(Boolean).join(' '));
    const map=[['finance','finance'],['private sector','private-sector development'],['research','research & analysis'],['partnership','partnerships'],['communication','communications'],['project','project delivery'],['data','data / evidence'],['policy','policy'],['strategy','strategy'],['investment','investment'],['stakeholder','stakeholder engagement'],['monitoring','monitoring & evaluation']];
    const hits=map.filter(([needle])=>text.includes(needle)).map(([,label])=>label);return [...new Set(hits)].slice(0,5);
  }
  function passportSummary(){
    try{const p=window.OpportunityState?.getProfile?.()||{};const bits=[p.edu,p.field,p.expMonths?`${Math.round(Number(p.expMonths))} months experience`:null,p.english&&p.english!=='Not specified'?p.english:null].filter(Boolean);return bits.length?bits.join(' · '):'Add more Passport evidence to strengthen role tailoring.'}catch{return'Passport evidence unavailable.'}
  }
  function promptFor(key,row){
    const focus=keywords(row).join(', ')||'the vacancy requirements';
    if(key==='cvNotes')return `Identify the 3–5 CV bullets that best prove ${focus}. Keep only evidence you can substantiate.`;
    if(key==='evidenceBank')return `List concrete evidence you can reuse: projects, quantified outcomes, coursework, tools, responsibilities or examples relevant to ${focus}.`;
    if(key==='motivationDraftText')return `Draft the core argument: why this role, why this organisation, and what evidence shows you can contribute. Do not claim experience you do not have.`;
    return `Record unresolved eligibility, language, document or application-form questions to verify on the official posting before submission.`;
  }
  function chars(v){return String(v||'').length}
  function mount(){
    const modal=document.getElementById('prepModal'),shell=document.getElementById('prepShell');if(!modal||modal.classList.contains('hide')||!shell)return;
    const row=trackFromShell(shell);if(!row)return;const body=shell.querySelector('.prepBody');if(!body)return;const pack=roleData(row.t);
    let section=body.querySelector('.rolePack');if(!section){section=document.createElement('section');section.className='rolePack';const actions=body.querySelector('.prepActions');body.insertBefore(section,actions||null)}
    const focus=keywords(row);const signalText=focus.length?focus.join(' · '):'Use the official posting to define the role-specific evidence.';
    section.innerHTML=`<div class="rolePackHead"><div><div class="rolePackEy">Role-specific application pack</div><h3>Turn this vacancy into tailored application evidence.</h3><p>This workspace stores your role-specific material with the tracked vacancy. It gives you structure without inventing achievements or treating preparation as an eligibility decision.</p></div><span class="rolePackSaved" data-role-pack-status>${row.t.preparation?.updatedAt?'Saved workspace':'Autosaves as you type'}</span></div><div class="rolePackSignals"><div class="rolePackSignal"><span>Role themes detected</span><b>${safe(signalText)}</b></div><div class="rolePackSignal"><span>Passport evidence available</span><b>${safe(passportSummary())}</b></div></div><div class="rolePackGrid">${[
      ['cvNotes','CV tailoring notes','Choose what to emphasise, reorder or rewrite in the CV.'],
      ['evidenceBank','Evidence bank','Collect proof points before writing application answers.'],
      ['motivationDraftText','Motivation / cover draft','Build the actual role-specific argument in your own words.'],
      ['gapsQuestions','Questions & gaps','Keep unresolved requirements visible until checked.']
    ].map(([key,title,desc])=>`<div class="rolePackCard"><h4>${safe(title)}</h4><p>${safe(desc)}</p><div class="rolePackPrompt"><b>Prompt:</b> ${safe(promptFor(key,row))}</div><textarea class="rolePackText" data-role-pack="${key}" placeholder="Write role-specific notes here…">${safe(pack[key]||'')}</textarea><div class="rolePackMeta"><span data-role-count="${key}">${chars(pack[key])} characters</span><button type="button" data-role-clear="${key}">Clear</button></div></div>`).join('')}</div><div class="rolePackFooter"><span>Nothing here is submitted automatically. The official vacancy remains the source of truth.</span><div class="rolePackActions"><button type="button" class="rolePackAction" data-role-pack-save>Save now</button><button type="button" class="rolePackAction primary" data-role-pack-review>Review official posting ↗</button></div></div>`;
    const status=section.querySelector('[data-role-pack-status]');
    section.querySelectorAll('[data-role-pack]').forEach(el=>el.addEventListener('input',()=>{const c=section.querySelector(`[data-role-count="${el.dataset.rolePack}"]`);if(c)c.textContent=`${chars(el.value)} characters`;scheduleSave(row,shell,status)}));
    section.querySelectorAll('[data-role-clear]').forEach(btn=>btn.onclick=()=>{const el=section.querySelector(`[data-role-pack="${btn.dataset.roleClear}"]`);if(el){el.value='';el.dispatchEvent(new Event('input',{bubbles:true}))}});
    section.querySelector('[data-role-pack-save]').onclick=()=>persist(row,shell,status);
    section.querySelector('[data-role-pack-review]').onclick=()=>window.open(row.m.url,'_blank','noopener');
    if(lastBoundShell!==shell){lastBoundShell=shell;shell.addEventListener('change',()=>setTimeout(mount,50),true)}
  }

  const obs=new MutationObserver(()=>setTimeout(mount,25));obs.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(mount,80));
  setInterval(mount,1200);setTimeout(mount,500);
  window.OpportunityRoleApplicationPack={refresh:mount};
})();