// Fills the public hero figures without booting the full workspace.
// Same sources and rules as the workspace (app-v08-boot.js); it simply
// overwrites these nodes with identical values if it starts later.
(()=>{'use strict';
 // Scroll-reveal sections (.reveal) stay at opacity 0 until they get .in.
 // The workspace sets it only after boot, which waits for a tap or key, so
 // visitors who just scroll (and crawlers/reviewers) saw blank sections.
 const reveal=()=>{const els=document.querySelectorAll('.reveal:not(.in)');if(!els.length)return;
  if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}
  const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.01,rootMargin:'0px 0px 120px 0px'});
  els.forEach(e=>io.observe(e))};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reveal);else reveal();
 const $=id=>document.getElementById(id);
 const set=(ids,text)=>ids.forEach(id=>{const n=$(id);if(n)n.textContent=text});
 const json=async url=>{const r=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});if(!r.ok)throw Error(url+' HTTP '+r.status);return r.json()};
 json('/api/health').then(d=>{
  const opps=Number(d.opportunities),sources=Number(d.monitored_sources);
  if(!d.ok)throw Error('health');
  set(['statOpps','engOpps'],Number.isSafeInteger(opps)&&opps>=0?String(opps):'—');
  set(['statSources','engSources'],Number.isSafeInteger(sources)&&sources>=0?String(sources):'—');
 }).catch(()=>set(['statOpps','engOpps','statSources','engSources'],'—'));
 json('/api/source-listings?limit=72').then(d=>{
  const n=Number(d.count);
  if(!Number.isSafeInteger(n)||n<0||!Array.isArray(d.listings)||d.listings.length!==n)throw Error('count');
  const total=Number(d.total_source_confirmed);
  set(['statOpen'],String(Number.isSafeInteger(total)&&total>=n?total:n));
 }).catch(()=>set(['statOpen'],'—'));
 json('/api/open-calls').then(d=>{
  if(!Array.isArray(d.calls)||!Number.isSafeInteger(Number(d.count)))throw Error('calls');
  const count=d.calls.filter(c=>Date.parse(c.closes_at)>Date.now()).length;
  set(['heroOpenCallsLabel'],count>0?(count===1?'1 call':count+' calls')+' advertised open on official sites · Check eligibility ↗':'Browse official programmes and upcoming calls ↗');
 }).catch(()=>set(['heroOpenCallsLabel'],'Explore official provider opportunities ↗'));
})();
