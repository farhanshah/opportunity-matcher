'use strict';
/* Shared public-content dropdown. Does not interact with accounts or application data. */
(()=>{
 const nav=document.querySelector('header.blogNav')||
   document.querySelector('html.omSecondary[data-page="privacy"] header.nav');
 if(!nav)return;
 const links=nav.querySelector('.blogNavLinks,.navlinks');
 if(!links||nav.querySelector('.omAuxMenu'))return;
 const menu=document.createElement('button');
 menu.type='button';menu.className='omAuxMenu';menu.textContent='Explore ▾';
 menu.setAttribute('aria-label','Explore site pages');
 menu.setAttribute('aria-expanded','false');
 links.id=links.id||'omAuxNavLinks';
 menu.setAttribute('aria-controls',links.id);
 nav.insertBefore(menu,links);
 const close=()=>{nav.classList.remove('omAuxOpen');menu.textContent='Explore ▾';menu.setAttribute('aria-expanded','false');};
 menu.addEventListener('click',()=>{
   const next=nav.classList.toggle('omAuxOpen');
   menu.textContent=next?'Explore ▴':'Explore ▾';
   menu.setAttribute('aria-expanded',String(next));
 });
 links.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
 document.addEventListener('click',e=>{if(!nav.contains(e.target))close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
})();
