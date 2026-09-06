(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
  const exactId=url=>`exact_${hash(url)}`;
  let queued=false;

  const style=document.createElement('style');
  style.textContent=`
    #dashboard .deepLiveActions .omTrackPrepare{background:rgba(216,255,105,.11);border:1px solid rgba(216,255,105,.24);color:#eaffab}
    #dashboard .deepLiveActions .omTrackPrepare:hover{border-color:rgba(216,255,105,.48);transform:translateY(-1px)}
    #dashboard .deepLiveActions .omTrackPrepare.tracked{background:rgba(98,216,185,.11);border-color:rgba(98,216,185,.28);color:#cafff1}
  `;
  document.head.appendChild(style);

  function feed(){
    try{const s=window.OpportunityBestLive?.status?.();return Array.isArray(s?.items)?s.items:[]}catch{return[]}
  }
  function trackStore(){try{return typeof tracks==='object'&&tracks?tracks:(window.tracks||{})}catch{return window.tracks||{}}}
  function canonical(raw){try{const u=new URL(raw,location.origin);u.hash='';return `${u.origin}${u.pathname.replace(/\/+$/,'')}${u.search}`.toLowerCase()}catch{return String(raw||'').toLowerCase()}}
  function maps(){
    const byUrl=new Map(),byName=new Map();
    for(const x of feed()){
      if(x?.url)byUrl.set(canonical(x.url),x);
      byName.set(`${norm(x?.provider||x?.source)}|${norm(x?.title)}`,x);
    }
    return{byUrl,byName};
  }
  function itemFor(card,m){
    const href=card.querySelector('.deepLiveActions a[href]')?.href||'';
    if(href&&m.byUrl.has(canonical(href)))return m.byUrl.get(canonical(href));
    const provider=norm(card.querySelector('.deepLiveProvider')?.textContent||'');
    const title=norm(card.querySelector('h4')?.textContent||'');
    return m.byName.get(`${provider}|${title}`)||null;
  }
  function meta(card,item){
    const signals=[...card.querySelectorAll('.deepSignal')].map(el=>({name:String(el.querySelector('span')?.textContent||'').trim(),label:String(el.querySelector('b')?.textContent||'').trim()}));
    const provider=String(card.querySelector('.deepLiveProvider')?.textContent||item?.provider||item?.source||'').trim();
    const title=String(card.querySelector('h4')?.textContent||item?.title||'Verified vacancy').trim();
    const cardText=String(card.textContent||'');
    const why=(cardText.match(/Why ranked:\s*([^\n]+)/i)||[])[1]?.trim()||'';
    const readiness=(cardText.match(/Readiness:\s*([^\n]+)/i)||[])[1]?.trim()||'';
    return{title,provider,programmeId:item?.programmeId||'',url:item?.url||card.querySelector('.deepLiveActions a[href]')?.href||'',deadline:item?.deadline||'',location:item?.location||'',why,readiness,badge:String(card.querySelector('.deepLiveVerdict')?.textContent||'').replace(/^#\d+\s*·?\s*/,'').trim(),signals,addedAt:new Date().toISOString()};
  }
  function focusTrack(id,title){
    setTimeout(()=>{
      const cards=[...document.querySelectorAll('#tracker .focusCard,#tracker [data-exact-track-id],#tracker [data-track-id]')];
      const card=cards.find(el=>String(el.dataset?.exactTrackId||el.dataset?.trackId||'')===String(id))||cards.find(el=>String(el.textContent||'').includes(title));
      if(!card)return;
      try{card.scrollIntoView({behavior:'smooth',block:'center'})}catch{card.scrollIntoView()}
      card.classList.add('omRadarFocus');setTimeout(()=>card.classList.remove('omRadarFocus'),1800);
    },90);
  }
  function openTracked(id,title){
    try{setView('tracker')}catch{}
    try{window.renderTracker?.()}catch{}
    focusTrack(id,title);
  }
  function start(card,item){
    const m=meta(card,item);if(!m.url)return;
    const id=exactId(m.url);
    if(window.OpportunityActionWorkflow?.start){
      window.OpportunityActionWorkflow.start(m);
      focusTrack(id,m.title);
      return;
    }
    const store=trackStore();
    store[id]??={stage:'Researching',notes:'',checklist:{documents:false,statement:false,references:false},exactVacancy:m};
    store[id].exactVacancy={...(store[id].exactVacancy||{}),...m};
    try{persist?.()}catch{}
    openTracked(id,m.title);
  }
  function decorate(){
    queued=false;
    const m=maps(),store=trackStore();
    document.querySelectorAll('#dashboard .deepLiveCard').forEach(card=>{
      const item=itemFor(card,m);if(!item?.url)return;
      const actions=card.querySelector('.deepLiveActions');if(!actions)return;
      const original=[...actions.querySelectorAll('button')].find(b=>!b.classList.contains('omTrackPrepare'));
      let btn=actions.querySelector('.omTrackPrepare');
      if(!btn){
        btn=original||document.createElement('button');
        if(!original)actions.appendChild(btn);
        btn.classList.add('omTrackPrepare');
      }
      const id=exactId(item.url),tracked=Boolean(store?.[id]);
      btn.classList.toggle('tracked',tracked);
      btn.textContent=tracked?'In tracker ✓':'Track & prepare →';
      btn.title=tracked?'Open this exact vacancy in Tracker':'Track this exact verified vacancy and start preparing';
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();tracked?openTracked(id,String(card.querySelector('h4')?.textContent||item.title||'')):start(card,item)};
      card.dataset.omLiveAction='v211';
    });
  }
  function schedule(delay=0){if(queued)return;queued=true;setTimeout(()=>requestAnimationFrame(decorate),delay)}

  const observer=new MutationObserver(records=>{
    if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.deepLiveCard')||n.querySelector?.('.deepLiveCard')))))schedule(0);
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('opportunity:verifiedfeedchange',()=>schedule(40));
  window.addEventListener('opportunity:statechange',()=>schedule(30));
  window.addEventListener('opportunity:hydrated',()=>schedule(30));
  setTimeout(()=>schedule(0),250);
  setTimeout(()=>schedule(0),1000);

  window.OpportunityLiveActionBridge={refresh:()=>schedule(0)};
})();
