(()=>{
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const style=document.createElement('style');
  style.textContent=`
    .prepTabsMode .prepBody{position:relative}.prepTabs{grid-column:1/-1;position:sticky;top:0;z-index:20;display:flex;gap:6px;align-items:center;padding:7px;background:rgba(246,247,249,.96);backdrop-filter:blur(12px);border:1px solid #e1e5ea;border-radius:13px;box-shadow:0 8px 20px rgba(20,28,45,.05)}
    .prepTab{flex:1;display:flex;justify-content:center;align-items:center;gap:7px;border:0;border-radius:9px;background:transparent;color:#717986;padding:10px 12px;font-size:8px;font-weight:950;cursor:pointer}.prepTab:hover{background:#fff}.prepTab.active{background:#171c26;color:#fff;box-shadow:0 5px 14px rgba(17,21,30,.12)}.prepTabBadge{display:inline-flex;min-width:22px;height:18px;padding:0 6px;align-items:center;justify-content:center;border-radius:999px;background:#eceff3;color:#6e7580;font-size:6.5px;font-weight:950}.prepTab.active .prepTabBadge{background:rgba(216,255,105,.16);color:#e7ff9e}
    .prepTabHidden{display:none!important}.prepTabsMode .prepActions{position:sticky;bottom:0;z-index:18;padding:10px 12px;margin-top:2px;border:1px solid #e0e4e8;border-radius:12px;background:rgba(246,247,249,.96);backdrop-filter:blur(12px);box-shadow:0 -8px 22px rgba(20,28,45,.06)}.prepTabsMode .rolePackActions{display:none!important}.prepTabsMode .rolePackFooter{justify-content:flex-start}.prepTabsHint{grid-column:1/-1;margin:-4px 2px 0;font-size:7px;color:#858c97}
    @media(max-width:780px){.prepTabs{gap:4px;padding:5px}.prepTab{padding:9px 7px;font-size:7.5px}.prepTabsMode .prepActions{position:static}}
  `;
  document.head.appendChild(style);

  function rowFromShell(shell=document.getElementById('prepShell')){
    const href=shell?.querySelector('a.prepBtn.official')?.href;if(!href||typeof tracks!=='object'||!tracks)return null;
    const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);
    return entry?{id:entry[0],t:entry[1]}:null;
  }
  function flushTransient(shell=document.getElementById('prepShell')){
    const row=rowFromShell(shell);if(!row||!shell)return;
    row.t.preparation={...(row.t.preparation||{})};
    const notes=shell.querySelector('#prepNotes');if(notes)row.t.preparation.notes=String(notes.value||'');
    row.t.preparation.rolePack={cvNotes:'',evidenceBank:'',motivationDraftText:'',gapsQuestions:'',...(row.t.preparation.rolePack||{})};
    shell.querySelectorAll('[data-role-pack]').forEach(el=>{row.t.preparation.rolePack[el.dataset.rolePack]=String(el.value||'')});
  }
  function eligibilityStats(shell){
    const els=[...shell.querySelectorAll('[data-prep-key]')].filter(x=>/eligibility|language|nationality|educationChecked|fieldChecked/.test(x.dataset.prepKey||''));
    return{done:els.filter(x=>x.checked).length,total:els.length};
  }
  function packStats(shell){
    const els=[...shell.querySelectorAll('[data-role-pack]')];return{done:els.filter(x=>String(x.value||'').trim().length>0).length,total:els.length||4};
  }
  function apply(shell,body,tab,scroll=false){
    const cmd=body.querySelector('.prepCommand'),panels=[...body.children].filter(x=>x.classList?.contains('prepPanel')),stage=body.querySelector('.prepStageBar'),pack=body.querySelector('.rolePack');
    const checks=[cmd,...panels,stage].filter(Boolean);
    checks.forEach(el=>el.classList.toggle('prepTabHidden',tab!=='checks'));
    if(pack)pack.classList.toggle('prepTabHidden',tab!=='pack');
    body.querySelectorAll('.prepTab').forEach(btn=>{const on=btn.dataset.prepTab===tab;btn.classList.toggle('active',on);btn.setAttribute('aria-selected',on?'true':'false')});
    shell.dataset.prepTab=tab;
    if(tab==='pack')setTimeout(()=>window.OpportunityRoleApplicationPack?.refresh?.(),0);
    if(scroll){const tabs=body.querySelector('.prepTabs');if(tabs)shell.scrollTo({top:Math.max(0,tabs.offsetTop-8),behavior:'smooth'})}
  }
  function mount(){
    const modal=document.getElementById('prepModal'),shell=document.getElementById('prepShell');if(!modal||modal.classList.contains('hide')||!shell)return;
    const body=shell.querySelector('.prepBody'),pack=body?.querySelector('.rolePack');if(!body||!pack)return;
    shell.classList.add('prepTabsMode');
    let tabs=body.querySelector('.prepTabs');
    if(!tabs){
      tabs=document.createElement('div');tabs.className='prepTabs';tabs.setAttribute('role','tablist');
      tabs.innerHTML='<button type="button" class="prepTab" data-prep-tab="checks">Checks & readiness <span class="prepTabBadge" data-tab-checks>0/0</span></button><button type="button" class="prepTab" data-prep-tab="pack">Draft workspace <span class="prepTabBadge" data-tab-pack>0/4</span></button>';
      body.insertBefore(tabs,body.firstChild);
      const hint=document.createElement('div');hint.className='prepTabsHint';hint.textContent='Complete official-source checks first, then build the tailored CV, evidence and motivation drafts.';body.insertBefore(hint,tabs.nextSibling);
      tabs.querySelectorAll('.prepTab').forEach(btn=>btn.onclick=()=>{flushTransient(shell);apply(shell,body,btn.dataset.prepTab,true)});
    }
    const e=eligibilityStats(shell),p=packStats(shell),eb=tabs.querySelector('[data-tab-checks]'),pb=tabs.querySelector('[data-tab-pack]');
    const et=`${e.done}/${e.total||0}`,pt=`${p.done}/${p.total||4}`;if(eb&&eb.textContent!==et)eb.textContent=et;if(pb&&pb.textContent!==pt)pb.textContent=pt;
    let tab=shell.dataset.prepTab;if(tab!=='checks'&&tab!=='pack')tab=e.total&&e.done===e.total?'pack':'checks';
    apply(shell,body,tab,false);
  }

  document.addEventListener('change',e=>{if(e.target?.matches?.('#prepShell [data-prep-key]'))flushTransient(document.getElementById('prepShell'))},true);
  document.addEventListener('click',e=>{if(e.target?.closest?.('#prepShell [data-prep-save],#prepShell [data-prep-close]'))flushTransient(document.getElementById('prepShell'))},true);
  document.addEventListener('input',e=>{if(e.target?.matches?.('#prepShell [data-role-pack]'))setTimeout(mount,0)},true);
  const obs=new MutationObserver(()=>setTimeout(mount,30));obs.observe(document.body,{subtree:true,childList:true});
  setInterval(mount,1000);setTimeout(mount,600);
  window.OpportunityPreparationTabs={refresh:mount,flush:flushTransient};
})();