(()=>{
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const bool=v=>Boolean(v);
  let saveTimer=null,lastShell=null;

  const style=document.createElement('style');
  style.textContent=`
    .prepCommand{grid-column:1/-1;display:grid;grid-template-columns:1.25fr .75fr;gap:12px;padding:14px 16px;border-radius:15px;background:linear-gradient(135deg,#151a24,#22283a);color:#fff;border:1px solid #2d3548}
    .prepCommandEy{font-size:7px;font-weight:950;text-transform:uppercase;letter-spacing:.13em;color:#d8ff69}.prepCommand h3{font-size:15px;line-height:1.25;margin:5px 0 4px;color:#fff}.prepCommand p{font-size:8px;line-height:1.5;margin:0;color:#aeb6c5}
    .prepCommandStats{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.prepCommandStat{padding:9px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045)}.prepCommandStat span{display:block;font-size:6.5px;text-transform:uppercase;letter-spacing:.09em;color:#969fb1}.prepCommandStat b{display:block;margin-top:3px;font-size:11px;color:#fff}
    .prepSignalBar{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}.prepSignalChip{display:inline-flex;padding:5px 7px;border-radius:999px;border:1px solid rgba(216,255,105,.18);background:rgba(216,255,105,.08);color:#dcff83;font-size:6.8px;font-weight:850}.prepSignalChip.muted{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#aab2c1}
    .prepStageBar{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border:1px solid #e1e5ea;border-radius:12px;background:#fff}.prepStageBar div b{display:block;font-size:9px;color:#1a202b}.prepStageBar div span{display:block;margin-top:2px;font-size:7.5px;line-height:1.35;color:#858c97}.prepStageBtn{border:0;border-radius:9px;padding:9px 11px;background:#171c26;color:#fff;font-size:7.5px;font-weight:900;white-space:nowrap;cursor:pointer}.prepStageBtn.ready{background:#d8ff69;color:#1a210a}.prepStageBtn:disabled{opacity:.45;cursor:not-allowed}
    .prepSaveState{font-weight:850}.prepSaveState.saving{color:#8b6b18}.prepSaveState.saved{color:#408066}
    @media(max-width:780px){.prepCommand{grid-template-columns:1fr}.prepStageBar{align-items:stretch;flex-direction:column}.prepStageBtn{width:100%}}
  `;
  document.head.appendChild(style);

  function trackFromShell(shell=document.getElementById('prepShell')){
    const href=shell?.querySelector('a.prepBtn.official')?.href;if(!href||typeof tracks!=='object'||!tracks)return null;
    const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);
    return entry?{id:entry[0],t:entry[1],m:entry[1].exactVacancy}:null;
  }
  function liveItem(url){
    const target=canon(url);try{return (window.OpportunityBestLive?.status?.()?.items||[]).find(x=>canon(x?.url)===target)||null}catch{return null}
  }
  function enrich(row){
    if(!row)return row;const live=liveItem(row.m?.url);if(!live)return row;
    row.t.exactVacancy={...live,...row.t.exactVacancy,title:row.t.exactVacancy.title||live.title,url:row.t.exactVacancy.url||live.url};row.m=row.t.exactVacancy;return row;
  }
  function visibleKeys(shell){return [...shell.querySelectorAll('[data-prep-key]')].map(x=>x.dataset.prepKey).filter(Boolean)}
  function completion(shell,p){const keys=visibleKeys(shell),done=keys.filter(k=>bool(p?.[k])).length;return{done,total:keys.length,pct:keys.length?Math.round(done/keys.length*100):0}}
  function eligibilityKeys(shell){return [...shell.querySelectorAll('[data-prep-key]')].filter(x=>/eligibility|language|nationality|educationChecked|fieldChecked/.test(x.dataset.prepKey||'')).map(x=>x.dataset.prepKey)}
  function packKeys(shell){return [...shell.querySelectorAll('[data-prep-key]')].filter(x=>/cvReady|educationEvidence|idReady|motivationDraft|referencesChecked/.test(x.dataset.prepKey||'')).map(x=>x.dataset.prepKey)}
  function count(keys,p){return{done:keys.filter(k=>bool(p?.[k])).length,total:keys.length}}
  function daysLeft(d){if(!d)return null;const x=new Date(`${d}T23:59:59`);if(Number.isNaN(x.getTime()))return null;return Math.ceil((x-Date.now())/86400000)}
  function nextAction(row,shell){
    const p=row.t.preparation||{},e=count(eligibilityKeys(shell),p),a=count(packKeys(shell),p),d=daysLeft(row.m?.deadline);
    if(d!=null&&d<0)return'This vacancy appears expired. Re-check the official posting before doing more work.';
    if(e.done<e.total)return'Finish the remaining eligibility checks on the official posting before investing further.';
    if(!p.cvReady)return'Tailor the CV to the role and mark the CV / résumé task complete.';
    if(!p.motivationDraft)return'Draft the motivation or cover response using the vacancy language and your strongest evidence.';
    if(a.done<a.total)return'Finish the remaining application-pack checks, then run one final official-source review.';
    return'Application pack is prepared. Run a final eligibility check and move the application toward submission.';
  }
  function evidenceChips(row){
    const text=String(liveItem(row.m?.url)?.detail_text||row.m?.detail_text||'').toLowerCase();
    if(!text)return['Official posting linked'];
    const hits=[];
    if(/\bcv\b|curriculum vitae|résumé|resume/.test(text))hits.push('CV / résumé mentioned');
    if(/cover letter|motivation|personal statement|statement of interest/.test(text))hits.push('Motivation / cover response mentioned');
    if(/transcript|degree certificate|diploma|enrolment|enrollment/.test(text))hits.push('Education evidence mentioned');
    if(/reference|referee|recommendation/.test(text))hits.push('Reference requirement mentioned');
    if(/passport|identity document|identification/.test(text))hits.push('ID / passport mentioned');
    return hits.length?hits.slice(0,5):['Official posting linked'];
  }
  function persistNow(row,shell){
    if(!row)return;const notes=shell?.querySelector('#prepNotes');row.t.preparation={...(row.t.preparation||{}),notes:String(notes?.value??row.t.preparation?.notes??'')};row.t.preparation.updatedAt=new Date().toISOString();
    try{persist?.()}catch{};try{window.OpportunityExactTrackDurability?.save?.()}catch{};window.dispatchEvent(new CustomEvent('opportunity:statechange'));
  }
  function scheduleSave(row,shell,status){
    clearTimeout(saveTimer);status?.classList.add('saving');status?.classList.remove('saved');if(status)status.textContent='Saving…';
    saveTimer=setTimeout(()=>{persistNow(row,shell);if(status){status.textContent='Autosaved';status.classList.remove('saving');status.classList.add('saved')}},450);
  }
  function stageAction(row,shell){
    const p=row.t.preparation||{},e=count(eligibilityKeys(shell),p),a=count(packKeys(shell),p);
    if(e.total&&e.done<e.total)return{label:'Finish eligibility checks first',disabled:true,next:row.t.stage};
    if(a.total&&a.done===a.total)return{label:'Mark ready to submit',disabled:false,next:'Ready to submit',ready:true};
    if(row.t.stage==='Saved'||row.t.stage==='Researching')return{label:'Move to preparing documents',disabled:false,next:'Preparing documents'};
    if(row.t.stage==='Preparing documents')return{label:'Move to drafting',disabled:false,next:'Drafting'};
    return{label:`Stage: ${row.t.stage||'Researching'}`,disabled:true,next:row.t.stage};
  }
  function enhance(){
    const modal=document.getElementById('prepModal'),shell=document.getElementById('prepShell');if(!modal||modal.classList.contains('hide')||!shell)return;
    let row=enrich(trackFromShell(shell));if(!row)return;row.t.preparation={...(row.t.preparation||{})};
    const p=row.t.preparation,all=completion(shell,p),e=count(eligibilityKeys(shell),p),a=count(packKeys(shell),p),d=daysLeft(row.m?.deadline);
    const body=shell.querySelector('.prepBody');if(!body)return;
    let cmd=body.querySelector('.prepCommand');if(!cmd){cmd=document.createElement('section');cmd.className='prepCommand';body.insertBefore(cmd,body.firstChild)}
    const due=d==null?'Check posting':d<0?'Expired':d===0?'Closes today':`${d} day${d===1?'':'s'} left`;
    const chips=evidenceChips(row).map((x,i)=>`<span class="prepSignalChip ${i?'muted':''}">${safe(x)}</span>`).join('');
    cmd.innerHTML=`<div><div class="prepCommandEy">Application command view</div><h3>${safe(nextAction(row,shell))}</h3><p>Readiness here measures preparation progress only. It does not replace the provider's official eligibility decision.</p></div><div class="prepCommandStats"><div class="prepCommandStat"><span>Eligibility checks</span><b>${e.done}/${e.total||0}</b></div><div class="prepCommandStat"><span>Application pack</span><b>${a.done}/${a.total||0}</b></div><div class="prepCommandStat"><span>Overall preparation</span><b>${all.pct}%</b></div><div class="prepCommandStat"><span>Deadline pressure</span><b>${safe(due)}</b></div></div><div class="prepSignalBar">${chips}</div>`;
    let stage=body.querySelector('.prepStageBar');if(!stage){stage=document.createElement('div');stage.className='prepStageBar';const actions=body.querySelector('.prepActions');body.insertBefore(stage,actions||null)}
    const act=stageAction(row,shell);stage.innerHTML=`<div><b>Pipeline stage: ${safe(row.t.stage||'Researching')}</b><span>Move stages only when the preparation evidence supports it.</span></div><button class="prepStageBtn ${act.ready?'ready':''}" ${act.disabled?'disabled':''}>${safe(act.label)}</button>`;
    const btn=stage.querySelector('button');if(btn&&!act.disabled)btn.onclick=()=>{try{if(typeof trackStage==='function')trackStage(row.id,act.next);else{row.t.stage=act.next;persistNow(row,shell)}}catch{row.t.stage=act.next;persistNow(row,shell)};setTimeout(()=>{try{window.renderTracker?.()}catch{};enhance()},50)};
    const prepFact=[...shell.querySelectorAll('.prepFact')].find(x=>x.querySelector('span')?.textContent?.trim()==='Preparation')?.querySelector('b');if(prepFact)prepFact.textContent=`${all.pct}% complete`;
    const bar=shell.querySelector('.prepProgress i');if(bar)bar.style.width=`${all.pct}%`;
    const status=shell.querySelector('.prepStatus');if(status){status.classList.add('prepSaveState');if(!status.classList.contains('saving'))status.textContent=p.updatedAt?'Autosaved':'Changes autosave as you work'}
    if(lastShell!==shell){lastShell=shell;shell.addEventListener('input',ev=>{if(ev.target?.id==='prepNotes'){const r=trackFromShell(shell);if(r)scheduleSave(r,shell,shell.querySelector('.prepStatus'))}},true)}
  }

  document.addEventListener('change',e=>{if(e.target?.matches?.('#prepShell [data-prep-key]'))setTimeout(enhance,30)},true);
  const obs=new MutationObserver(()=>setTimeout(enhance,20));obs.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(enhance,80));
  setInterval(enhance,1200);setTimeout(enhance,500);
  window.OpportunityPreparationCommand={refresh:enhance};
})();
