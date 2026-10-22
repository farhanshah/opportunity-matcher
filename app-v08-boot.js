function publicActive(o){if(String(o?.Status||'').toLowerCase()==='closed')return false;const d=Number(days(o));return !Number.isFinite(d)||d>=0}
function featuredNominationGate(o){
  const notes=String(o.Eligibility_Notes||'');
  const m=notes.match(/\b(?:school|university|institution)\s+nomination\s+deadline\s+(?:is|:)\s+(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i);
  if(!m)return null;
  const date=new Date(m[1]+' 00:00:00');
  if(Number.isNaN(date.getTime()))return null;
  const today=new Date();today.setHours(0,0,0,0);
  return {date:m[1],passed:date<today};
}
function featuredHighlights(notes){
  const parts=String(notes||'').split('|').map(s=>s.trim()).filter(Boolean);
  const usable=parts.filter(s=>!(/^(no universal age rule|not gpa.based|english is working language|closing date|open date|deadline )/i).test(s));
  const focused=usable.filter(s=>/\b(expected|required|must|at least|prototype|mvp|internship period|research fit|placement)\b/i.test(s));
  return (focused.length?focused:usable).slice(0,2).join('. ').replace(/\.\./g,'.').replace(/[. ]+$/,'');
}
function featuredReason(o){
  if(o?.Verification_Stale!==false)return 'Historical programme information. Confirm this cycle’s funding, eligibility and application instructions directly with the provider.';
  const notes=String(o.Eligibility_Notes||'');
  const gate=featuredNominationGate(o);
  if(gate)return gate.passed
    ? 'School nomination closed on '+gate.date+'. Later deadlines apply to already nominated students.'
    : 'School nomination deadline: '+gate.date+'. Check this prerequisite first.';
  const highlights=featuredHighlights(notes);
  const closingUnconfirmed=!o.Close_Date&&/closing date to capture|closing date.*needs|exact.*closing date.*capture/i.test(notes);
  if(closingUnconfirmed)return 'Closing date needs verification.'+(highlights?' '+highlights+'.':' Check the official call.');
  const benefits=Array.isArray(o.Benefits)?o.Benefits.filter(s=>typeof s==='string'&&s.trim()):[];
  if(benefits.length){
    const preferred=benefits.filter(s=>/tuition|residence|stipend|housing|accommodation|airfare|travel/i.test(s));
    const extras=benefits.filter(s=>!preferred.includes(s));
    return 'Support listed: '+[...preferred,...extras].slice(0,2).map(s=>s.trim().replace(/[.;]+$/,'')).join('; ')+'.';
  }
  if(highlights)return highlights.slice(0,165).replace(/[.; ]+$/,'')+'.';
  const levels=Array.isArray(o.Education_Levels)?o.Education_Levels.filter(v=>typeof v==='string'&&v.trim()):[];
  if(levels.length)return 'Education requirements: '+levels.slice(0,2).join('; ')+'. Verify the official conditions.';
  return 'Check the provider requirements, funding terms and application route before applying.';
}
function featuredDeadline(o){
  if(o?.Verification_Stale!==false)return deadline(o);
  const notes=String(o.Eligibility_Notes||'');
  const precise=notes.match(/\bDeadline\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}),?\s+(\d{1,2}:\d{2})\s+(JST|UTC|GMT|BST|EST|EDT|PST|PDT)\b/i);
  if(precise)return 'Closes '+precise[1]+' at '+precise[2]+' '+precise[3].toUpperCase();
  if(!o.Close_Date&&/closing date to capture|closing date.*needs|exact.*closing date.*capture/i.test(notes))return 'Deadline unconfirmed';
  return deadline(o);
}
function renderFeatured(){
  let candidates=[...opps].filter(o=>publicActive(o)&&String(o.Status||'').toLowerCase()==='open').sort((a,b)=>{
    const da=Number(days(a)),db=Number(days(b));
    return (Number.isFinite(da)?da:99999)-(Number.isFinite(db)?db:99999);
  });
  if(candidates.length<3)candidates=[...opps].filter(publicActive).sort((a,b)=>{
    const da=Number(days(a)),db=Number(days(b));
    return (Number.isFinite(da)?da:99999)-(Number.isFinite(db)?db:99999);
  });
  candidates=candidates.slice(0,3);
  $('featuredGrid').innerHTML=candidates.map(o=>{
    const gate=featuredNominationGate(o);
    const label=o.Verification_Stale!==false?'Needs source recheck':gate&&gate.passed?'Nominees only':(o.Status||'Explore');
    const url=String(o.Official_Source_URL||'').trim();
    const safeUrl=/^https?:\/\//i.test(url);
    return '<article class="liveCard">'
      +'<div class="liveTop"><div class="providerMark">'+esc(logoLetter(o))+'</div><span class="statusPill'+(o.Verification_Stale!==false||gate&&gate.passed?' needsCheck':'')+'">'+esc(label)+'</span></div>'
      +'<h3>'+esc(o.Opportunity_Name)+'</h3><div class="provider">'+esc(o.Provider)+'</div>'
      +'<div class="tagRow"><span class="tag">'+esc(o.Type)+'</span><span class="tag">'+esc(o.Destination||'Global')+'</span><span class="tag">'+esc(o.Funding||'Funding varies')+'</span></div>'
      +'<div class="liveReason"><b>Worth knowing</b><br>'+esc(featuredReason(o))+'</div>'
      +'<div class="liveBottom"><span>'+esc(featuredDeadline(o))+'</span>'
      +(safeUrl?'<a class="textBtn" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Open official source ↗</a>':'<span>Official link unavailable</span>')
      +'</div></article>';
  }).join('')||'<div class="empty" style="grid-column:1/-1">Current routes are temporarily unavailable.</div>';
}

async function loadData(){
  try{
    let r=await fetch('/api/opportunities',{headers:{Accept:'application/json'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    let j=await r.json();opps=j.opportunities||[];
    $('apiStatus').textContent='Live database';
    const active=opps.filter(o=>o.Verification_Stale===false&&publicActive(o)).length;
    $('liveCopy').textContent=`${active} recently verified active/upcoming routes · ${opps.length} monitored records · official source links`;
    updateStats();renderFeatured();renderAll()
  }catch(err){
    $('apiStatus').textContent='Database unavailable';
    $('liveCopy').textContent='Live API unavailable';
    console.error(err)
  }
}
function updateStats(){
  // Do not advertise historical 2026 programme records as currently open.
  // The hero's third figure is now independently sourced from the safe
  // worldwide discovery API rather than the stale full-verification count.
  $('statOpps').textContent=opps.length||'0';
  $('engOpps').textContent=opps.length||'0'
}
async function updateWorldwideCount(){
  const node=$('statOpen');
  if(!node)return;
  try{
    const r=await fetch('/api/source-listings?limit=72',{headers:{Accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw Error('Official programme count unavailable');
    const d=await r.json();
    const n=Number(d.count);
    if(!Number.isSafeInteger(n)||n<0||!Array.isArray(d.listings)||d.listings.length!==n)throw Error('Invalid source count');
    node.textContent=String(n);
  }catch{node.textContent='—'}
}
async function updateOfficialOpenCallCount(){
  const el=$('heroOpenCallsLabel');
  if(!el)return;
  try{
    const response=await fetch('/api/open-calls',{headers:{Accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw Error('Official open call endpoint unavailable');
    const data=await response.json();
    if(!Array.isArray(data.calls)||!Number.isSafeInteger(Number(data.count)))throw Error('Invalid official open call response');
    const count=data.calls.filter(call=>Date.parse(call.closes_at)>Date.now()).length;
    el.textContent=count>0
      ?count+' calls advertised open on official sites · Check eligibility ↗'
      :'Browse official programmes and upcoming calls ↗';
  }catch{el.textContent='Explore official provider opportunities ↗'}
}
async function updateSourceStats(){
  const ids=['statSources','engSources'];
  try{
    const res=await fetch('/api/health',{headers:{Accept:'application/json'},cache:'no-store'});
    if(!res.ok)throw new Error('Health endpoint HTTP '+res.status);
    const data=await res.json();
    const count=Number(data.monitored_sources);
    if(!data.ok||!Number.isSafeInteger(count)||count<0)throw new Error('No valid active source count');
    ids.forEach(id=>{const node=$(id);if(node)node.textContent=String(count)});
  }catch(err){
    console.warn('Live source count unavailable',err);
    ids.forEach(id=>{const node=$(id);if(node)node.textContent='—'});
  }
}
document.querySelectorAll('.navbtn[data-v]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.v)));let slideIndex=0;setInterval(()=>{let slides=[...document.querySelectorAll('.slide')];if(!slides.length)return;slides[slideIndex].classList.remove('active');slideIndex=(slideIndex+1)%slides.length;slides[slideIndex].classList.add('active')},5000);let io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting)x.target.classList.add('in')}),{threshold:.12});document.querySelectorAll('.reveal').forEach(x=>io.observe(x));loadProfileState();buildOnboarding();buildWorkspaceShell();persist();loadData();updateSourceStats();updateWorldwideCount();updateOfficialOpenCallCount();