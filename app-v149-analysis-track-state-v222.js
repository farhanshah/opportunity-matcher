(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/\s+/g,' ').trim();
  const store=()=>{try{return (typeof tracks==='object'&&tracks)||window.tracks||{}}catch{return window.tracks||{}};
  const oppStore=()=>{try{return Array.isArray(opps)?opps:[]}catch{return[]}};

  function trackedIdFromButton(btn){
    const raw=btn?.getAttribute?.('onclick')||'';
    const m=raw.match(/addTrack\(\s*['"]([^'"]+)['"]\s*\)/);
    if(m&&store()[m[1]])return m[1];
    return '';
  }

  function trackedIdFromDetail(detail){
    const headings=[...detail.querySelectorAll('h1,h2,h3')].map(x=>norm(x.textContent)).filter(Boolean);
    if(!headings.length)return '';
    const byId=new Map(oppStore().map(o=>[String(o?.Opportunity_ID),o]));
    for(const [id,t] of Object.entries(store())){
      const o=byId.get(String(id));
      const titles=[o?.Opportunity_Name,t?.exactVacancy?.title,t?.opportunityName,t?.title,t?.name].map(norm).filter(Boolean);
      if(titles.some(title=>headings.includes(title)))return id;
    }
    return '';
  }

  function sync(){
    const detail=document.getElementById('detail');
    if(!detail||detail.classList.contains('hide'))return;
    const buttons=[...detail.querySelectorAll('button')];
    const add=buttons.find(b=>/add to tracker/i.test(String(b.textContent||''))||/addTrack\(/.test(b.getAttribute('onclick')||''));
    if(!add)return;
    const id=trackedIdFromButton(add)||trackedIdFromDetail(detail);
    if(!id||!store()[id])return;
    add.textContent='Open tracker';
    add.classList.add('tracked');
    add.dataset.omTrackedAnalysis='true';
    add.removeAttribute('onclick');
    add.onclick=e=>{
      e.preventDefault();
      try{window.closeDetail?.()}catch{}
      try{window.setView?.('tracker')}catch{}
    };
    add.title='Already in your application tracker';
  }

  const prior=window.openDetail;
  if(typeof prior==='function'&&!prior.__omTrackedStateV222){
    const wrapped=function(...args){const out=prior.apply(this,args);setTimeout(sync,0);setTimeout(sync,80);return out};
    wrapped.__omTrackedStateV222=true;
    try{openDetail=wrapped}catch{}
    window.openDetail=wrapped;
  }
  document.addEventListener('click',e=>{if(e.target.closest?.('[onclick*="openDetail"],.focusCard button,.priorityCard'))setTimeout(sync,60)},true);
  window.addEventListener('opportunity:statechange',()=>setTimeout(sync,30));
  setTimeout(sync,250);
  window.OpportunityAnalysisTrackState={refresh:sync};
})();
