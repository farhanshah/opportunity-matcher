(()=>{'use strict';
 const grid=document.getElementById('worldGrid'),status=document.getElementById('worldStatus'),count=document.getElementById('worldCount');
 function text(tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value;return el}
 function card(item){
   const el=document.createElement('article');el.className='card';
   el.append(text('span','level','Official page confirmed'));
   el.append(text('h3','',item.title||'Programme page'));
   el.append(text('div','provider',item.provider||'Official provider'));
   el.append(text('p','unknown','Opening status, deadline, funding and eligibility are not yet verified. Check this cycle’s official instructions.'));
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
 load();
})();