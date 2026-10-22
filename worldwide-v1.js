(()=>{'use strict';
 const grid=document.getElementById('worldGrid'),status=document.getElementById('worldStatus'),count=document.getElementById('worldCount');
 const themeButton=document.getElementById('themeBtn'),modes=['auto','light','dark'];
 let mode='auto';try{const stored=localStorage.getItem('oppThemeModeV1');if(modes.includes(stored))mode=stored}catch{}
 const darkPreference=window.matchMedia('(prefers-color-scheme: dark)');
 function applyTheme(){
   const resolved=mode==='auto'?(darkPreference.matches?'dark':'light'):mode;
   document.documentElement.dataset.omTheme=resolved;
   if(themeButton){
     themeButton.textContent=mode==='auto'?'◐ Auto':mode==='dark'?'☾ Dark':'☀ Light';
     themeButton.setAttribute('aria-label','Appearance: '+mode+'. Click to change');
   }
 }
 themeButton?.addEventListener('click',()=>{mode=modes[(modes.indexOf(mode)+1)%modes.length];
   try{localStorage.setItem('oppThemeModeV1',mode)}catch{}
   applyTheme()
 });
 darkPreference.addEventListener('change',()=>{if(mode==='auto')applyTheme()});
 applyTheme();
 function text(tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value;return el}
 function card(item){
   const el=document.createElement('article');el.className='card';
   const federalGrant=item.opportunity_kind==='US federal grant';
   el.append(text('span','level',federalGrant?'Official U.S. grant record':'Official page confirmed'));

   el.append(text('h3','',item.title||'Programme page'));
   el.append(text('div','provider',item.provider||'Official provider'));
   el.append(text('p','unknown',federalGrant?'A U.S. federal funding notice. Many are for organisations, not individual students. Applicant type, deadline and eligibility must be checked on Grants.gov.':'Opening status, deadline, funding and eligibility are not yet verified. Check this cycle’s official instructions.'));

   try{const url=new URL(item.official_url);if(url.protocol==='https:'){
     const a=document.createElement('a');a.className='source';a.href=url.href;
     a.target='_blank';a.rel='noopener noreferrer';a.textContent='View official provider page ↗';el.append(a)
   }}catch{}
   if(item.source_confirmed_at){const d=new Date(item.source_confirmed_at);if(!Number.isNaN(d.getTime()))el.append(text('div','time','Source checked: '+d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})))}
   return el
 }
 async function load(){
   try{
    const response=await fetch('/api/source-listings?limit=60',{cache:'no-store'});
    if(!response.ok)throw new Error('Service unavailable');
    const data=await response.json();const items=Array.isArray(data.listings)?data.listings:[];
    grid.replaceChildren(...items.map(card));count.textContent=items.length+' confirmed pages';
    status.textContent=items.length?'':'No source-confirmed listings are available yet. Official-provider checks run automatically.';
   }catch{status.textContent='Source-confirmed listings cannot be loaded right now. Please try again later.';count.textContent='Unavailable'}
 }

 async function loadOpenCalls(){
  const wrap=document.getElementById('official-open-calls'),
        cards=document.getElementById('openCallGrid'),
        counter=document.getElementById('openCallCount'),
        info=document.getElementById('openCallStatus');
  if(!wrap||!cards||!counter||!info)return;
  try{
    const res=await fetch('/api/open-calls',{cache:'no-store'});
    if(!res.ok)throw Error('Open calls service unavailable');
    const data=await res.json();
    const calls=Array.isArray(data.calls)?data.calls:[];
    const now=Date.now();
    const active=calls.filter(x=>Date.parse(x.closes_at)>now);
    cards.replaceChildren();
    for(const item of active){
      const el=document.createElement('article');
      el.className='card';
      el.append(text('span','level','Official page lists applications open'));
      el.append(text('h3','',item.title));
      el.append(text('div','provider',item.provider));
      const countries=Array.isArray(item.eligible_countries)?item.eligible_countries.join(' · '):'See provider';
      el.append(text('p','unknown',Array.isArray(item.eligible_countries)&&item.eligible_countries.length?'Citizenship restricted to: '+countries+'. Further conditions apply.':'Eligibility restrictions apply. Check provider-specific location, career stage, and qualification rules.'));
      if(item.requirements_note)el.append(text('p','unknown',item.requirements_note));
      const cutoff=new Date(item.closes_at);
      if(!Number.isNaN(cutoff.getTime()))el.append(text('p','time',
       'Advertised deadline: '+cutoff.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})+(item.deadline_time_confirmed?' · '+cutoff.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC':' · confirm exact closing time with provider')));
      const link=document.createElement('a');
      try{
        const official=new URL(item.official_url);
        if(official.protocol==='https:'){
          link.href=official.href;link.className='source';link.target='_blank';
          link.rel='noopener noreferrer';link.textContent='Check official requirements and apply ↗';
          el.append(link);
        }
      }catch{}
      cards.append(el);
    }
    counter.textContent=active.length+' official open calls';
    info.textContent=active.length?'':'No calls currently pass the explicit open-status and deadline checks. Browse official programme pages below.';
  }catch{
    counter.textContent='Unavailable';
    info.textContent='Current open-call status cannot be confirmed. Check official programme links below.';
  }
 }
 loadOpenCalls();

 load();
})();