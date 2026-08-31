(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const providerName=x=>String(x?.provider||x?.source||'').toUpperCase();
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
  const exactId=url=>`exact_${hash(url)}`;
  let decorateScheduled=false;

  const style=document.createElement('style');
  style.textContent=`
    .deepV2Actions button.exactPrepare{background:rgba(216,255,105,.1);border-color:rgba(216,255,105,.22);color:#e9ffad}.deepV2Actions button.exactPrepare.tracked{background:rgba(98,216,185,.11);border-color:rgba(98,216,185,.22);color:#c9fff1}.exactDetailNote{margin-top:10px;padding:11px;border-radius:11px;background:rgba(123,93,255,.06);border:1px solid rgba(123,93,255,.1);font-size:12px;line-height:1.55;color:#5f6673}.exactDetailNote b{color:#1a2030}.exactSignalList{display:grid;gap:7px;margin-top:10px}.exactSignalRow{padding:9px 10px;border:1px solid rgba(20,28,45,.08);border-radius:10px;background:#fff}.exactSignalRow span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8a91a0}.exactSignalRow b{display:block;margin-top:2px;font-size:12px;color:#1a2030}
  `;
  document.head.appendChild(style);

  function currentItems(){try{const s=window.OpportunityBestLive?.status?.();return Array.isArray(s?.items)?s.items:[]}catch{return[]}}
  function itemMap(){const map=new Map();for(const x of currentItems()){const key=`${providerName(x)}|${norm(x.title)}`;if(!map.has(key))map.set(key,x)}return map}
  function cardMeta(card,item){
    const signals=[...card.querySelectorAll('.deepV2Signal')].map(el=>({name:String(el.querySelector('span')?.textContent||'').trim(),label:String(el.querySelector('b')?.textContent||'').trim()}));
    const why=String(card.querySelector('.deepV2RankWhy')?.textContent||'').replace(/^Why ranked:\s*/i,'').trim();
    const readiness=String(card.querySelector('.deepV2Readiness')?.textContent||'').replace(/^Readiness:\s*/i,'').trim();
    const badge=String(card.querySelector('.deepV2Verdict')?.textContent||'').replace(/^#\d+\s*·?\s*/,'').trim();
    return{title:String(card.querySelector('h4')?.textContent||item.title||'Verified vacancy').trim(),provider:String(card.querySelector('.deepV2Provider')?.textContent||item.provider||item.source||'').trim(),programmeId:item.programmeId||'',url:item.url||'',deadline:item.deadline||'',location:item.location||'',why,readiness,badge,signals,addedAt:new Date().toISOString()};
  }
  function synthetic(id,m){
    const base=Array.isArray(opps)?opps.find(o=>o.Opportunity_ID===m.programmeId):null;
    return{Opportunity_ID:id,Opportunity_Name:m.title||'Verified vacancy',Provider:m.provider||base?.Provider||'Official provider',Type:base?.Type||'Internship',Destination:m.location||base?.Destination||'See vacancy',Funding:base?.Funding||'Varies',Status:'Open',Close_Date:m.deadline||'',Application_URL:m.url||'',Official_Source_URL:m.url||'',Last_Verified:(m.addedAt||'').slice(0,10),Benefits:Array.isArray(base?.Benefits)?base.Benefits:[],Eligibility_Notes:'Tracked from a verified exact vacancy. Re-check the official posting before submission.'};
  }
  function exactEntries(){return Object.entries(tracks||{}).filter(([,t])=>t?.exactVacancy?.url)}
  function withExactOpps(fn){
    if(!Array.isArray(opps))return fn();
    const added=[];
    for(const [id,t] of exactEntries())if(!opps.some(o=>o.Opportunity_ID===id)){opps.push(synthetic(id,t.exactVacancy));added.push(id)}
    try{return fn()}finally{for(let i=opps.length-1;i>=0;i--)if(added.includes(opps[i]?.Opportunity_ID))opps.splice(i,1)}
  }
  function start(meta){
    if(!meta?.url)return;
    const id=exactId(meta.url);
    tracks[id]??={stage:'Researching',notes:'',checklist:{documents:false,statement:false,references:false},exactVacancy:meta};
    tracks[id].exactVacancy={...(tracks[id].exactVacancy||{}),...meta};
    if(typeof persist==='function')persist();
    if(typeof renderDashboard==='function')renderDashboard();
    decorate();
    if(typeof setView==='function')setView('tracker');
    setTimeout(()=>window.renderTracker?.(),20);
  }
  function decorate(){
    decorateScheduled=false;
    const byTitle=itemMap();
    document.querySelectorAll('#dashboard .deepV2Card').forEach(card=>{
      const provider=String(card.querySelector('.deepV2Provider')?.textContent||'').toUpperCase();
      const title=norm(card.querySelector('h4')?.textContent||'');
      const item=byTitle.get(`${provider}|${title}`);if(!item?.url)return;
      const actions=card.querySelector('.deepV2Actions');if(!actions)return;
      let btn=actions.querySelector('button.exactPrepare')||actions.querySelector('button');if(!btn)return;
      btn.classList.add('exactPrepare');
      const id=exactId(item.url),tracked=Boolean(tracks?.[id]);
      btn.classList.toggle('tracked',tracked);
      btn.textContent=tracked?'In tracker ✓':'Prepare →';
      btn.onclick=()=>tracked?(typeof setView==='function'&&setView('tracker')):start(cardMeta(card,item));
    });
  }
  function scheduleDecorate(delay=0){if(decorateScheduled)return;decorateScheduled=true;setTimeout(decorate,delay)}

  const previousRenderTracker=window.renderTracker;
  if(typeof previousRenderTracker==='function'&&!previousRenderTracker.__omExactWorkflow){
    const wrapped=(...args)=>withExactOpps(()=>previousRenderTracker(...args));
    wrapped.__omExactWorkflow=true;
    try{renderTracker=wrapped}catch{}window.renderTracker=wrapped;
  }

  const previousRenderDashboard=window.renderDashboard;
  if(typeof previousRenderDashboard==='function'&&!previousRenderDashboard.__omExactWorkflow){
    const wrappedDashboard=function(...args){const out=previousRenderDashboard.apply(this,args);scheduleDecorate(0);return out};
    wrappedDashboard.__omExactWorkflow=true;
    try{renderDashboard=wrappedDashboard}catch{}window.renderDashboard=wrappedDashboard;
  }

  const previousSetView=window.setView;
  if(typeof previousSetView==='function'&&!previousSetView.__omExactWorkflow){
    const wrappedSet=v=>{const out=previousSetView(v);if(v==='tracker')setTimeout(()=>window.renderTracker?.(),0);if(v==='dashboard')scheduleDecorate(0);return out};
    wrappedSet.__omExactWorkflow=true;
    try{setView=wrappedSet}catch{}window.setView=wrappedSet;
    document.querySelectorAll('.navbtn[data-v]').forEach(b=>{b.onclick=()=>wrappedSet(b.dataset.v)});
  }

  const previousOpenDetail=window.openDetail||openDetail;
  function openExactDetail(id){
    const t=tracks?.[id],m=t?.exactVacancy;if(!m)return false;
    const o=synthetic(id,m),signals=Array.isArray(m.signals)?m.signals:[];
    const deadlineText=typeof deadline==='function'?deadline(o):(m.deadline||'Check posting');
    const detail=document.getElementById('detail'),inner=document.getElementById('detailInner');if(!detail||!inner)return false;
    detail.classList.add('detailDrawer');
    inner.innerHTML=`<div class="detailHero"><div><span class="matchBadge eligible">Exact live vacancy</span><div class="eyebrow">${safe(m.badge||'Verified route')}</div><h2>${safe(m.title)}</h2><p>${safe(m.provider)}</p></div><div class="detailDeadline"><span>Official posting</span><b>${safe(deadlineText)}</b></div></div><div class="detailColumns"><div><section class="detailSection"><div class="detailSectionTitle">Why this route made the cut</div><div class="exactDetailNote"><b>Why ranked:</b> ${safe(m.why||'This exact opening ranked strongly against your Passport and the current vacancy evidence.')}</div><div class="exactDetailNote"><b>Readiness:</b> ${safe(m.readiness||'Open the official vacancy and confirm the remaining conditions before applying.')}</div>${signals.length?`<div class="exactSignalList">${signals.map(s=>`<div class="exactSignalRow"><span>${safe(s.name)}</span><b>${safe(s.label)}</b></div>`).join('')}</div>`:''}</section></div><div><section class="factCard"><div class="detailSectionTitle">Vacancy facts</div><div class="factGrid"><div><span>Location</span><b>${safe(m.location||'See posting')}</b></div><div><span>Deadline</span><b>${safe(m.deadline||'Check posting')}</b></div><div><span>Stage</span><b>${safe(t.stage||'Researching')}</b></div><div><span>Source</span><b>Exact verified feed</b></div></div><div class="sourceNotice">The official vacancy remains the source of truth. This workspace stores the route so you can prepare and track it without losing the exact posting.</div></section><div class="detailActions"><button class="btn btnLight" onclick="setView('tracker');closeDetail()">Back to tracker</button>${m.url?`<a class="btn applicationBtn" target="_blank" rel="noopener" href="${safe(m.url)}">Open official vacancy ↗</a>`:''}</div></div></div>`;
    detail.classList.remove('hide');return true;
  }
  const wrappedOpen=id=>openExactDetail(id)||previousOpenDetail(id);
  try{openDetail=wrappedOpen}catch{}window.openDetail=wrappedOpen;

  window.addEventListener('opportunity:statechange',()=>scheduleDecorate(20));
  window.addEventListener('opportunity:verifiedfeedchange',()=>scheduleDecorate(40));
  window.addEventListener('opportunity:hydrated',()=>scheduleDecorate(20));
  setTimeout(()=>scheduleDecorate(0),300);

  window.OpportunityActionWorkflow={refresh:decorate,start};
})();
