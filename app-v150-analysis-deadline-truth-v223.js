(()=>{
  const VERSION='v231';
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
  const trackMaps=()=>{
    const out=[];
    try{if(typeof tracks==='object'&&tracks)out.push(tracks)}catch{}
    if(window.tracks&&typeof window.tracks==='object')out.push(window.tracks);
    ['oppTracksV6','oppExactTracksV1'].forEach(k=>out.push(read(k)));
    return out;
  };
  const oppList=()=>{try{return Array.isArray(opps)?opps:[]}catch{return[]}};
  const detailEl=()=>document.getElementById('detail');
  const leafByText=(root,re)=>[...root.querySelectorAll('button,a,span,div,b,strong,small')].find(el=>!el.children.length&&re.test(String(el.textContent||'').trim()));
  function currentOpp(root){
    const all=oppList(), text=norm(root?.innerText||root?.textContent||'');
    const matches=all.filter(o=>{const name=norm(o?.Opportunity_Name);return name&&text.includes(name)});
    if(matches.length)return matches.sort((a,b)=>String(b?.Opportunity_Name||'').length-String(a?.Opportunity_Name||'').length)[0];
    const hs=[...root.querySelectorAll('h1,h2,h3')].map(x=>norm(x.textContent)).filter(Boolean);
    return all.find(o=>hs.includes(norm(o?.Opportunity_Name)))||null;
  }
  const currentTitle=root=>{
    const opp=currentOpp(root);if(opp?.Opportunity_Name)return String(opp.Opportunity_Name);
    const hs=[...root.querySelectorAll('h1,h2,h3')].map(x=>String(x.textContent||'').trim()).filter(Boolean);
    return hs[0]||'';
  };
  const currentProvider=root=>{
    const opp=currentOpp(root);if(opp?.Provider)return String(opp.Provider);
    const title=currentTitle(root), titleEl=[...root.querySelectorAll('h1,h2,h3')].find(x=>String(x.textContent||'').trim()===title);
    let n=titleEl?.nextElementSibling;
    for(let i=0;i<3&&n;i++,n=n.nextElementSibling){const t=String(n.textContent||'').trim();if(t&&t.length<120)return t}
    return '';
  };
  const titleOf=t=>t?.exactVacancy?.title||t?.exactVacancy?.Opportunity_Name||t?.opportunityName||t?.Opportunity_Name||t?.title||t?.name||'';
  const providerOf=t=>t?.exactVacancy?.provider||t?.exactVacancy?.Provider||t?.provider||t?.Provider||'';
  function trackerDomHas(title){
    const nt=norm(title);if(!nt)return false;
    const tracker=document.getElementById('tracker');if(!tracker)return false;
    return [...tracker.querySelectorAll('.focusTitle,h3,h4')].some(el=>norm(el.textContent)===nt);
  }
  function trackedMatch(title,provider,opp){
    const nt=norm(title),np=norm(provider),oid=String(opp?.Opportunity_ID||'');
    if(trackerDomHas(title))return{yes:true,id:oid};
    for(const map of trackMaps()){
      if(oid&&map?.[oid])return{yes:true,id:oid};
      for(const [id,t] of Object.entries(map||{})){
        const tt=norm(titleOf(t)),pp=norm(providerOf(t));
        if(tt&&nt&&tt===nt&&(!np||!pp||pp===np||pp.includes(np)||np.includes(pp)))return{yes:true,id};
      }
    }
    return{yes:false,id:''};
  }
  const isoFromText=s=>{const m=String(s||'').match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);return m?`${m[1]}-${m[2]}-${m[3]}`:''};
  function visibleDeadline(root){
    const nodes=[...root.querySelectorAll('*')];
    for(const el of nodes){
      if(el.children.length)continue;
      const txt=String(el.textContent||'').trim();
      if(!/^deadline$/i.test(txt))continue;
      const p=el.parentElement;if(!p)continue;
      const val=[...p.querySelectorAll('*')].filter(x=>!x.children.length).map(x=>String(x.textContent||'').trim()).find(x=>isoFromText(x));
      if(val)return isoFromText(val);
    }
    return '';
  }
  function pastDeadline(root,opp){
    const iso=visibleDeadline(root)||isoFromText(opp?.Close_Date||opp?.Deadline||'');
    if(!iso)return false;
    const end=new Date(`${iso}T23:59:59`),now=new Date();
    return Number.isFinite(end.getTime())&&end.getTime()<now.getTime();
  }
  function trackerCardFor(title){
    const tracker=document.getElementById('tracker'),nt=norm(title);if(!tracker||!nt)return null;
    const labels=[...tracker.querySelectorAll('.focusTitle,h2,h3,h4,strong,b')];
    const label=labels.find(el=>norm(el.textContent)===nt);if(!label)return null;
    return label.closest('article,.focusCard,.trackerCard,.applicationCard')||label.parentElement?.parentElement?.parentElement||label;
  }
  function focusTrackerCard(title){
    const run=()=>{
      const card=trackerCardFor(title);if(!card)return false;
      try{card.scrollIntoView({behavior:'smooth',block:'center'})}catch{card.scrollIntoView()}
      const oldOutline=card.style.outline,oldShadow=card.style.boxShadow,oldTransition=card.style.transition;
      card.style.transition='box-shadow .2s ease, outline-color .2s ease';
      card.style.outline='2px solid rgba(196,255,74,.9)';
      card.style.boxShadow='0 0 0 6px rgba(196,255,74,.12)';
      setTimeout(()=>{card.style.outline=oldOutline;card.style.boxShadow=oldShadow;card.style.transition=oldTransition},2200);
      return true;
    };
    if(!run()){setTimeout(run,70);setTimeout(run,220)}
  }
  function openTracker(title){
    const refreshEligibility=()=>{
      try{window.OpportunityEligibilityFirstTracker?.refresh?.()}catch{}
    };
    try{window.closeDetail?.()}catch{}
    try{window.setView?.('tracker')}catch{}
    requestAnimationFrame(()=>{focusTrackerCard(title);refreshEligibility()});
    setTimeout(()=>{focusTrackerCard(title);refreshEligibility()},100);
    setTimeout(refreshEligibility,260);
    setTimeout(refreshEligibility,520);
  }
  function disableAction(el,label){
    if(!el)return;
    el.textContent=label;
    el.removeAttribute('href');el.removeAttribute('onclick');
    el.setAttribute('aria-disabled','true');el.setAttribute('title','This opportunity deadline has passed');
    if('disabled' in el)el.disabled=true;
    el.style.pointerEvents='none';el.style.opacity='.62';
  }
  function sync(){
    const root=detailEl();if(!root||root.classList.contains('hide'))return;
    const opp=currentOpp(root),title=opp?.Opportunity_Name||currentTitle(root),provider=opp?.Provider||currentProvider(root),tracked=trackedMatch(title,provider,opp),past=pastDeadline(root,opp);
    const actions=[...root.querySelectorAll('button,a')];
    const add=actions.find(x=>/add to tracker/i.test(String(x.textContent||''))||/addTrack\(/.test(x.getAttribute('onclick')||''));
    const openTrackerBtn=actions.find(x=>/^open tracker$/i.test(String(x.textContent||'').trim()));
    const apply=actions.find(x=>/^apply\b/i.test(String(x.textContent||'').trim()));
    const trackBtn=add||openTrackerBtn;
    if(tracked.yes&&trackBtn){
      trackBtn.textContent='Open tracker';trackBtn.removeAttribute('onclick');trackBtn.removeAttribute('href');trackBtn.removeAttribute('disabled');trackBtn.style.pointerEvents='';trackBtn.style.opacity='';trackBtn.setAttribute('aria-disabled','false');trackBtn.title='Already in your application tracker';
      trackBtn.onclick=e=>{e.preventDefault();openTracker(title)};
    }else if(past&&trackBtn){disableAction(trackBtn,'Deadline passed')}
    if(past){
      disableAction(apply,'Deadline passed');
      const open=leafByText(root,/^OPEN$/i);if(open)open.textContent='CLOSED';
      const strong=leafByText(root,/^Strong match$/i);if(strong)strong.textContent='Previously strong match';
    }
    document.documentElement.dataset.omAnalysisTruth=VERSION;
  }
  const prior=window.openDetail;
  if(typeof prior==='function'&&!prior.__omAnalysisTruthV231){
    const wrapped=function(...args){const out=prior.apply(this,args);setTimeout(sync,0);setTimeout(sync,60);setTimeout(sync,180);return out};
    wrapped.__omAnalysisTruthV231=true;
    try{openDetail=wrapped}catch{}
    window.openDetail=wrapped;
  }
  document.addEventListener('click',e=>{if(e.target.closest?.('[onclick*="openDetail"],.priorityCard,.focusCard')){setTimeout(sync,40);setTimeout(sync,160)}},true);
  setTimeout(sync,250);
  window.OpportunityAnalysisDeadlineTruth={refresh:sync,version:VERSION};
})();