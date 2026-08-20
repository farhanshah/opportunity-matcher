(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const providerName=x=>String(x?.provider||x?.source||'').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const style=document.createElement('style');
  style.textContent=`
    .deepV2RankWhy{margin-top:7px;padding:7px 8px;border-radius:8px;background:rgba(216,255,105,.055);border:1px solid rgba(216,255,105,.09);font-size:7px;line-height:1.45;color:#b9c3a2}.deepV2RankWhy b{color:#d9ff67;font-weight:800}.deepV2Readiness{margin-top:6px;font-size:7px;line-height:1.4;color:#9da5b5}.deepV2Readiness b{color:#fff}.deepV2Verdict.ready{color:#e9ffad;background:rgba(216,255,105,.14)}.deepV2Verdict.verify{color:#dfff87;background:rgba(216,255,105,.085)}
  `;
  document.head.appendChild(style);

  function currentItems(){
    try{const s=window.OpportunityBestLive?.status?.();return Array.isArray(s?.items)?s.items:[]}catch{return[]}
  }
  function mapItems(){
    const map=new Map();
    for(const x of currentItems()){
      const key=`${providerName(x)}|${norm(x.title)}`;
      if(!map.has(key))map.set(key,x);
    }
    return map;
  }
  function normalizeNeutralSignals(card){
    card.querySelectorAll('.deepV2Signal').forEach(el=>{
      const label=el.querySelector('b');
      const name=el.querySelector('span');
      if(norm(label?.textContent)==='no explicit block'){
        if(label)label.textContent='No explicit restriction found';
        if(name&&name.textContent.includes('?'))name.textContent=name.textContent.replace('?', '•');
      }
    });
  }
  function signalState(card){
    const rows=[...card.querySelectorAll('.deepV2Signal')].map(el=>({name:norm(el.querySelector('span')?.textContent||''),label:norm(el.querySelector('b')?.textContent||'')}));
    const passes=rows.filter(r=>r.name.includes('✓')).length;
    const blocks=rows.filter(r=>r.name.includes('×')).length;
    const keyReviews=rows.filter(r=>r.name.includes('?')&&/(check|verify|review|restriction|residence|evidence|enrol|no clear|wording|needed|matter)/.test(r.label));
    return{passes,blocks,keyReviews:keyReviews.slice(0,9)};
  }
  function reviewAction(state){
    const labels=state.keyReviews.map(r=>r.label);
    if(labels.length!==1)return labels.length?`verify ${labels.length}`:'key checks clear';
    const only=labels[0];
    if(/language/.test(only))return'check language';
    if(/national|citizen|residen/.test(only))return'check nationality';
    if(/education|degree|academic|enrol/.test(only))return'check education';
    if(/field|discipline|study/.test(only))return'check field';
    if(/location|country|relocat/.test(only))return'check location';
    return'verify 1';
  }
  function readiness(state,item){
    if(state.blocks)return{label:'Blocked signal',cls:'low',detail:'An explicit blocker was detected; open the vacancy before taking action.'};
    const reasons=Array.isArray(item?._passport_rank_reasons)?item._passport_rank_reasons:[];
    const delta=Number(item?._passport_rank_delta||0);
    const reviews=state.keyReviews.length;
    const action=reviewAction(state);
    if(state.passes>=3&&reviews===0&&delta>=5)return{label:'High fit · key checks clear',cls:'ready',detail:'Strong Passport alignment; no unresolved key checks are flagged on this screen.'};
    if(state.passes>=2&&reviews<=1&&delta>=5)return{label:`Strong fit · ${action}`,cls:'verify',detail:reviews===1?`Strong role fit; ${action} on the exact posting before applying.`:'Strong role fit; open the exact posting for a final confirmation before applying.'};
    if(state.passes>=2&&delta>=3)return{label:`Good fit · ${action}`,cls:'verify',detail:'Relevant match, but one or more eligibility details still need confirmation.'};
    if(reasons.length)return{label:'Worth checking',cls:'good',detail:'Role relevance is positive, but evidence is not strong enough for a higher readiness label.'};
    return{label:'Worth checking',cls:'good',detail:'Open the exact posting and verify the remaining requirements.'};
  }
  function decorate(){
    const byTitle=mapItems();
    document.querySelectorAll('#dashboard .deepV2Card').forEach(card=>{
      const provider=String(card.querySelector('.deepV2Provider')?.textContent||'').toUpperCase();
      const title=norm(card.querySelector('h4')?.textContent||'');
      const item=byTitle.get(`${provider}|${title}`);
      if(!item)return;

      const reasons=Array.isArray(item._passport_rank_reasons)?item._passport_rank_reasons.filter(Boolean).slice(0,3):[];
      let why=card.querySelector('.deepV2RankWhy');
      if(reasons.length){
        if(!why){why=document.createElement('div');why.className='deepV2RankWhy';const p=card.querySelector('p');p?.insertAdjacentElement('afterend',why)}
        if(why)why.innerHTML=`<b>Why ranked:</b> ${reasons.map(esc).join(' · ')}`;
      }else if(why)why.remove();

      normalizeNeutralSignals(card);
      const state=signalState(card),r=readiness(state,item),badge=card.querySelector('.deepV2Verdict');
      if(badge){
        const rank=(badge.textContent.match(/^#\d+/)||[''])[0];
        badge.classList.remove('good','low','ready','verify');badge.classList.add(r.cls);
        badge.textContent=`${rank}${rank?' · ':''}${r.label}`;
      }
      let note=card.querySelector('.deepV2Readiness');
      if(!note){note=document.createElement('div');note.className='deepV2Readiness';const signals=card.querySelector('.deepV2Signals');signals?.insertAdjacentElement('afterend',note)}
      if(note)note.innerHTML=`<b>Readiness:</b> ${esc(r.detail)}`;
    });

    const head=document.querySelector('#dashboard .deepLiveV2 .deepV2Head p');
    if(head)head.textContent='Every exact opening is checked first, then ranked using vacancy evidence plus Passport-aware role relevance, academic recency and location signals. Readiness labels separate strong fit from conditions that still need verification.';
  }

  const obs=new MutationObserver(()=>setTimeout(decorate,20));
  obs.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:statechange',()=>setTimeout(decorate,180));
  window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(decorate,160));
  setInterval(decorate,1400);setTimeout(decorate,650);
  window.OpportunityReadinessLabels={refresh:decorate};
})();
