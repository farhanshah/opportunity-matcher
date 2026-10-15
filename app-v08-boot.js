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
    const label=gate&&gate.passed?'Nominees only':(o.Status||'Explore');
    const url=String(o.Official_Source_URL||'').trim();
    const safeUrl=/^https?:\/\//i.test(url);
    return '<article class="liveCard">'
      +'<div class="liveTop"><div class="providerMark">'+esc(logoLetter(o))+'</div><span class="statusPill">'+esc(label)+'</span></div>'
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