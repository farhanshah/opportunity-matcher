(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
  const exactId=url=>`exact_${hash(url)}`;
  const canonical=raw=>{try{const u=new URL(raw,location.origin);u.hash='';['utm_source','utm_medium','utm_campaign','utm_term','utm_content','source','ref'].forEach(k=>u.searchParams.delete(k));u.searchParams.sort();return `${u.origin}${u.pathname.replace(/\/+$/,'')}${u.search}`.toLowerCase()}catch{return String(raw||'').toLowerCase()}};
  let queued=false;

  const style=document.createElement('style');
  style.textContent=`
    #dashboard .deepV2Actions .omTrackPrepareV212,#dashboard .deepLiveActions .omTrackPrepareV212{background:rgba(216,255,105,.11);border:1px solid rgba(216,255,105,.24);color:#eaffab}
    #dashboard .deepV2Actions .omTrackPrepareV212:hover,#dashboard .deepLiveActions .omTrackPrepareV212:hover{border-color:rgba(216,255,105,.48);transform:translateY(-1px)}
    #dashboard .deepV2Actions .omTrackPrepareV212.tracked,#dashboard .deepLiveActions .omTrackPrepareV212.tracked{background:rgba(98,216,185,.11);border-color:rgba(98,216,185,.28);color:#cafff1}
  `;
  document.head.appendChild(style);

  function feed(){try{const s=window.OpportunityBestLive?.status?.();return Array.isArray(s?.items)?s.items:[]}catch{return[]}}
  function store(){try{return typeof tracks==='object'&&tracks?tracks:(window.tracks||{})}catch{return window.tracks||{}}}
  function maps(){
    const byUrl=new Map(),byName=new Map();
    for(const x of feed()){
      if(x?.url)byUrl.set(canonical(x.url),x);
      byName.set(`${norm(x?.provider||x?.source)}|${norm(x?.title)}`,x);
    }
    return{byUrl,byName};
  }
  function selectors(card){
    const v2=card.classList.contains('deepV2Card');
    return v2?{actions:'.deepV2Actions',provider:'.deepV2Provider',signal:'.deepV2Signal',verdict:'.deepV2Verdict'}:{actions:'.deepLiveActions',provider:'.deepLiveProvider',signal:'.deepSignal',verdict:'.deepLiveVerdict'};
  }
  function itemFor(card,m){
    const s=selectors(card),href=card.querySelector(`${s.actions} a[href]`)?.href||'';
    if(href&&m.byUrl.has(canonical(href)))return m.byUrl.get(canonical(href));
    const provider=norm(card.querySelector(s.provider)?.textContent||''),title=norm(card.querySelector('h4')?.textContent||'');
    return m.byName.get(`${provider}|${title}`)||null;
  }
  function trackedFor(url){
    const wanted=canonical(url),st=store();
    for(const [id,t] of Object.entries(st||{}))if(t?.exactVacancy?.url&&canonical(t.exactVacancy.url)===wanted)return{id,t};
    const id=exactId(url);return st?.[id]?{id,t:st[id]}:null;
  }
  function meta(card,item){
    const s=selectors(card),signals=[...card.querySelectorAll(s.signal)].map(el=>({name:String(el.querySelector('span')?.textContent||'').trim(),label:String(el.querySelector('b')?.textContent||'').trim()}));
    const provider=String(card.querySelector(s.provider)?.textContent||item?.provider||item?.source||'').trim();
    const title=String(card.querySelector('h4')?.textContent||item?.title||'Verified vacancy').trim();
    const href=card.querySelector(`${s.actions} a[href]`)?.href||'';
    return{title,provider,programmeId:item?.programmeId||'',url:item?.url||href,deadline:item?.deadline||'',location:item?.location||'',why:'Exact vacancy ranked from the verified live pool.',readiness:'Track this vacancy to keep preparation and submission status in one place.',badge:String(card.querySelector(s.verdict)?.textContent||'').replace(/^#\d+\s*·?\s*/,'').trim(),signals,addedAt:new Date().toISOString()};
  }
  function focusTrack(id,title){
    setTimeout(()=>{
      const cards=[...document.querySelectorAll('#tracker .focusCard,#tracker [data-exact-track-id],#tracker [data-track-id]')];
      const card=cards.find(el=>String(el.dataset?.exactTrackId||el.dataset?.trackId||'')===String(id))||cards.find(el=>String(el.textContent||'').includes(title));
      if(!card)return;
      try{card.scrollIntoView({behavior:'smooth',block:'center'})}catch{card.scrollIntoView()}
      card.classList.add('omRadarFocus');setTimeout(()=>card.classList.remove('omRadarFocus'),1800);
    },120);
  }
  function openTracked(id,title){
    try{setView('tracker')}catch{}
    try{window.renderTracker?.()}catch{}
    focusTrack(id,title);
  }
  function start(card,item){
    const m=meta(card,item);if(!m.url)return;
    if(window.OpportunityActionWorkflow?.start){window.OpportunityActionWorkflow.start(m);focusTrack(exactId(m.url),m.title);return}
    const st=store(),id=exactId(m.url);
    st[id]??={stage:'Researching',notes:'',checklist:{documents:false,statement:false,references:false},exactVacancy:m};
    st[id].exactVacancy={...(st[id].exactVacancy||{}),...m};
    try{persist?.()}catch{}
    openTracked(id,m.title);
  }
  function decorate(){
    queued=false;const m=maps();
    document.querySelectorAll('#dashboard .deepV2Card,#dashboard .deepLiveCard').forEach(card=>{
      const item=itemFor(card,m);if(!item?.url)return;
      const s=selectors(card),actions=card.querySelector(s.actions);if(!actions)return;
      let btn=actions.querySelector('.omTrackPrepareV212');
      if(!btn){
        btn=[...actions.querySelectorAll('button')].find(b=>!b.classList.contains('omTrackPrepareV212'))||document.createElement('button');
        if(!btn.parentElement)actions.appendChild(btn);
        btn.classList.add('omTrackPrepareV212');
      }
      const tracked=trackedFor(item.url),title=String(card.querySelector('h4')?.textContent||item.title||'');
      btn.classList.toggle('tracked',!!tracked);
      btn.textContent=tracked?'In tracker ✓':'Track & prepare →';
      btn.title=tracked?'Open this exact vacancy in Tracker':'Track this exact verified vacancy and start preparing';
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();tracked?openTracked(tracked.id,title):start(card,item)};
      card.dataset.omLiveAction='v212';
    });
  }
  function schedule(delay=0){if(queued)return;queued=true;setTimeout(()=>requestAnimationFrame(decorate),delay)}
  const observer=new MutationObserver(records=>{
    const hit=records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.deepV2Card,.deepLiveCard')||n.querySelector?.('.deepV2Card,.deepLiveCard'))));
    if(hit)schedule(0);
  });
  observer.observe(document.getElementById('dashboard')||document.body,{childList:true,subtree:true});
  ['opportunity:verifiedfeedchange','opportunity:statechange','opportunity:hydrated','opportunity:cloudsynced'].forEach(ev=>window.addEventListener(ev,()=>schedule(30)));
  setTimeout(()=>schedule(0),100);setTimeout(()=>schedule(0),500);setTimeout(()=>schedule(0),1500);
  window.OpportunityLiveActionBridge={refresh:()=>schedule(0)};
})();
