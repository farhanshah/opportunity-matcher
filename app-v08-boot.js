function publicActive(o){if(String(o?.Status||'').toLowerCase()==='closed')return false;const d=Number(days(o));return !Number.isFinite(d)||d>=0}
function renderFeatured(){
  let candidates=[...opps].filter(o=>publicActive(o)&&String(o.Status||'').toLowerCase()==='open').sort((a,b)=>{const da=Number(days(a)),db=Number(days(b));return (Number.isFinite(da)?da:99999)-(Number.isFinite(db)?db:99999)});
  if(candidates.length<3)candidates=[...opps].filter(publicActive).sort((a,b)=>{const da=Number(days(a)),db=Number(days(b));return (Number.isFinite(da)?da:99999)-(Number.isFinite(db)?db:99999)});
  candidates=candidates.slice(0,3);
  $('featuredGrid').innerHTML=candidates.map(o=>{let reason=o.Funding?`${o.Funding} route in ${o.Destination||'an international destination'}.`:`${o.Type||'Opportunity'} with an official source attached.`;return `<article class="liveCard"><div class="liveTop"><div class="providerMark">${esc(logoLetter(o))}</div><span class="statusPill">${esc(o.Status||'Explore')}</span></div><h3>${esc(o.Opportunity_Name)}</h3><div class="provider">${esc(o.Provider)}</div><div class="tagRow"><span class="tag">${esc(o.Type)}</span><span class="tag">${esc(o.Destination||'Global')}</span><span class="tag">${esc(o.Funding||'Funding varies')}</span></div><div class="liveReason"><b>Why open it</b><br>${esc(reason)}</div><div class="liveBottom"><span>${esc(deadline(o))}</span><a class="textBtn" href="${esc(o.Official_Source_URL||'#')}" ${o.Official_Source_URL?'target="_blank" rel="noopener"':''}>Open official source ↗</a></div></article>`}).join('')||'<div class="empty" style="grid-column:1/-1">Current routes are temporarily unavailable.</div>'
}
async function loadData(){
  try{
    let r=await fetch('/api/opportunities',{headers:{Accept:'application/json'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    let j=await r.json();opps=j.opportunities||[];
    $('apiStatus').textContent='Live database';
    const active=opps.filter(publicActive).length;
    $('liveCopy').textContent=`${active} active or upcoming routes · ${opps.length} monitored records · official source links`;
    updateStats();renderFeatured();renderAll()
  }catch(err){
    $('apiStatus').textContent='Database unavailable';
    $('liveCopy').textContent='Live API unavailable';
    console.error(err)
  }
}
function updateStats(){
  const activeOpen=opps.filter(o=>publicActive(o)&&String(o.Status||'').toLowerCase()==='open').length;
  $('statOpps').textContent=opps.length||'0';
  $('statOpen').textContent=activeOpen||'0';
  $('engOpps').textContent=opps.length||'0'
}
document.querySelectorAll('.navbtn[data-v]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.v)));let slideIndex=0;setInterval(()=>{let slides=[...document.querySelectorAll('.slide')];if(!slides.length)return;slides[slideIndex].classList.remove('active');slideIndex=(slideIndex+1)%slides.length;slides[slideIndex].classList.add('active')},5000);let io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting)x.target.classList.add('in')}),{threshold:.12});document.querySelectorAll('.reveal').forEach(x=>io.observe(x));loadProfileState();buildOnboarding();buildWorkspaceShell();persist();loadData();