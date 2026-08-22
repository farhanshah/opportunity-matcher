(()=>{
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const style=document.createElement('style');style.textContent=`
    .oppIntelToast{position:fixed;left:50%;bottom:34px;z-index:12050;transform:translateX(-50%);padding:10px 14px;border-radius:10px;background:#171c26;color:#fff;box-shadow:0 12px 35px rgba(0,0,0,.24);font-size:8px;font-weight:900;opacity:0;pointer-events:none;transition:opacity .15s ease,transform .15s ease}.oppIntelToast.show{opacity:1;transform:translateX(-50%) translateY(-4px)}
    .appIntelAdd.added{color:#4f7b32}.appIntelAdd.added::before{content:'✓ ';}
  `;document.head.appendChild(style);
  let toastTimer=null;
  function toast(msg){let el=document.querySelector('.oppIntelToast');if(!el){el=document.createElement('div');el.className='oppIntelToast';document.body.appendChild(el)}el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800)}
  function rowFromShell(shell=document.getElementById('prepShell')){const href=shell?.querySelector('a.prepBtn.official')?.href;if(!href||typeof tracks!=='object'||!tracks)return null;const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);return entry?{id:entry[0],t:entry[1]}:null}
  function save(row,shell,label){
    row.t.preparation={...(row.t.preparation||{})};row.t.preparation.rolePack={cvNotes:'',evidenceBank:'',motivationDraftText:'',gapsQuestions:'',...(row.t.preparation.rolePack||{})};
    const pack=row.t.preparation.rolePack,current=String(pack.evidenceBank||'').trim();
    const line=`• ${label}: add one concrete example — situation/project, what you did, method/tool, and result.`;
    const existed=current.includes(line);if(!existed)pack.evidenceBank=[current,line].filter(Boolean).join('\n');row.t.preparation.updatedAt=new Date().toISOString();
    try{window.persist?.()}catch{}try{window.OpportunityExactTrackDurability?.save?.()}catch{}window.dispatchEvent(new CustomEvent('opportunity:statechange'));
    const field=shell.querySelector('[data-role-pack="evidenceBank"]');if(field){field.value=pack.evidenceBank;field.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(()=>{try{field.scrollIntoView({behavior:'smooth',block:'center'});field.focus();const n=field.value.length;field.setSelectionRange(n,n)}catch{}},80)}
    toast(existed?'Prompt is already in the Evidence bank.':'Evidence prompt added ✓');
    setTimeout(()=>{try{window.OpportunityApplicationIntelligence?.refresh?.();window.OpportunityPreparationTabs?.refresh?.()}catch{}},120);
  }
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#prepShell [data-intel-add]');if(!btn)return;
    e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
    const shell=document.getElementById('prepShell'),row=rowFromShell(shell);if(!shell||!row){toast('Could not link this prompt to the tracked vacancy.');return}
    const card=btn.closest('.appIntelTarget'),label=card?.querySelector('b')?.textContent?.trim()||'Role evidence';
    btn.classList.add('added');btn.textContent='Added to Evidence bank';save(row,shell,label);
  },true);
})();