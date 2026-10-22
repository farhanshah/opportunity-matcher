'use strict';
/**
 * Production visual shell. Moves no application data or controls.
 * Mounts one presentation header and responsive navigation controls,
 * following existing view/navigation changes without modifying live routing.
 * Does not send requests, persist state, or alter API / domain logic.
 */
(()=>{
 const root=document.documentElement;
 if(!root.classList.contains('omTurquoisePreview'))return;
 // The original public nav hides links on mobile with no replacement.
 // Reuse the existing real navigation links in a reachable dropdown.
 const landingNav=document.querySelector('#landing .heroWrap>.nav');
 const landingLinks=landingNav?.querySelector('.navlinks');
 if(landingNav&&landingLinks&&!landingNav.querySelector('.omLandingMenu')){
   landingLinks.id='omLandingLinks';
   const menu=document.createElement('button');
   menu.type='button';menu.className='omLandingMenu';menu.textContent='☰ Menu';
   menu.setAttribute('aria-controls','omLandingLinks');
   menu.setAttribute('aria-expanded','false');
   menu.setAttribute('aria-label','Open site navigation');
   landingNav.insertBefore(menu,landingLinks);
   const closeLanding=()=>{
     landingNav.classList.remove('omLandingMenuOpen');
     menu.setAttribute('aria-expanded','false');
     menu.setAttribute('aria-label','Open site navigation');
     menu.textContent='☰ Menu';
   };
   menu.addEventListener('click',()=>{
     const opened=landingNav.classList.toggle('omLandingMenuOpen');
     menu.setAttribute('aria-expanded',String(opened));
     menu.setAttribute('aria-label',opened?'Close site navigation':'Open site navigation');
     menu.textContent=opened?'× Close':'☰ Menu';
   });
   landingLinks.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeLanding));
   document.addEventListener('keydown',event=>{if(event.key==='Escape')closeLanding();});
   document.addEventListener('click',event=>{
     if(!landingNav.contains(event.target))closeLanding();
   });
   window.matchMedia('(min-width:901px)').addEventListener('change',event=>{if(event.matches)closeLanding();});
 }

 const app=document.getElementById('app');
 if(!app)return;
 const workspace=app.querySelector('.workspace');
 const appBody=workspace?.querySelector('.appBody');
 const appTop=workspace?.querySelector('.appTop');
 const side=app.querySelector('.side');
 if(!workspace||!appBody||!appTop||!side)return;
 const route={
   discover:{eyebrow:'01 / DISCOVER',title:'Explore beyond<br>the <em>expected.</em>',
     copy:'Find opportunities that deserve a closer look. Your profile, official source links and eligibility signals stay connected.'},
   saved:{eyebrow:'02 / SAVED OPPORTUNITIES',title:'Keep what<br><em>matters close.</em>',
     copy:'All the real opportunities you have shortlisted, organized for your next steps.'},
   tracker:{eyebrow:'03 / APPLICATION TRACKER',title:'Every step.<br><em>Forward.</em>',
     copy:'Research, prepare and track real applications, with official source checks and your preparation progress visible.'},
   dashboard:{eyebrow:'04 / DASHBOARD',title:'A clearer view of<br><em>what is next.</em>',
     copy:'Your real shortlist, application progress and matching signals in one connected workspace.'}
 };

 // Live routes remain canonical /discover, /saved, /tracker, /dashboard.
 // Do not intercept history.pushState or replaceState on the real website.

 const hero=document.createElement('section');
 hero.className='omBridgeHero';
 hero.setAttribute('aria-label','Opportunity workspace introduction');
 hero.innerHTML='<div><span class="omBridgeEyebrow"></span>'+
   '<h2 class="omBridgeTitle"></h2><p class="omBridgeCopy"></p></div>'+
   '<div class="omBridgeArt" aria-hidden="true"><span>↗</span></div>';
 workspace.insertBefore(hero,appBody);
 const eyebrow=hero.querySelector('.omBridgeEyebrow');
 const heading=hero.querySelector('.omBridgeTitle');
 const copy=hero.querySelector('.omBridgeCopy');
 let active=null;
 const validView=()=> {
   const current=side.querySelector('.navbtn.active[data-v]')?.dataset.v||'';
   if(route[current])return current;
   const path=location.pathname.replace(/^\/+/,'').split('/')[0];
   return route[path]?path:'discover';
 };
 function sync(){
   const view=validView();
   if(view===active)return;
   active=view;
   const data=route[view];
   eyebrow.textContent=data.eyebrow;
   heading.innerHTML=data.title;
   copy.textContent=data.copy;
 }
 const navObserver=new MutationObserver(sync);
 navObserver.observe(side,{subtree:true,attributes:true,attributeFilter:['class']});
 const title=appTop.querySelector('h1');
 if(title){const titleObserver=new MutationObserver(sync);titleObserver.observe(title,{childList:true,subtree:true,characterData:true});}
 window.addEventListener('popstate',sync);
 window.addEventListener('hashchange',sync);
 sync();

 // Lightweight responsive menu; uses the real existing sidebar/navigation.
 const toggle=document.createElement('button');
 toggle.type='button';
 toggle.className='omMobileMenu';
 toggle.textContent='☰';
 toggle.setAttribute('aria-label','Open workspace navigation');
 toggle.setAttribute('aria-expanded','false');
 toggle.setAttribute('aria-controls','appNavSide');
 side.id='appNavSide';
 const close=document.createElement('button');
 close.type='button';close.className='omMobileClose';close.textContent='×';
 close.setAttribute('aria-label','Close workspace navigation');
 const scrim=document.createElement('div');
 scrim.className='omMobileScrim';scrim.hidden=true;
 appTop.insertBefore(toggle,appTop.firstChild);
 side.insertBefore(close,side.firstChild);
 app.appendChild(scrim);
 const shut=()=>{
   side.classList.remove('omMobileOpen');
   toggle.setAttribute('aria-expanded','false');
   scrim.hidden=true;
 };
 const open=()=>{
   side.classList.add('omMobileOpen');
   toggle.setAttribute('aria-expanded','true');
   scrim.hidden=false;
 };
 toggle.addEventListener('click',()=>side.classList.contains('omMobileOpen')?shut():open());
 close.addEventListener('click',shut);
 scrim.addEventListener('click',shut);
 side.querySelectorAll('button.navbtn').forEach(btn=>btn.addEventListener('click',shut));
 document.addEventListener('keydown',event=>{if(event.key==='Escape')shut()});
 window.matchMedia('(min-width:901px)').addEventListener('change',e=>{if(e.matches)shut()});

 // Late runtime-loaded module styles (theme, tracker, cloud) must not supersede
 // the isolated candidate visual layer. Keep candidate CSS as the final head sheet.
 const stylesheet=document.querySelector('link[href^="/integration-turquoise-v3.css"]');
 if(stylesheet){
   const head=document.head;
   let moving=false;
   const lastSheet=()=>{
     if(moving||head.lastElementChild===stylesheet)return;
     moving=true;
     head.appendChild(stylesheet);
     queueMicrotask(()=>{moving=false;});
   };
   const styleObserver=new MutationObserver(lastSheet);
   styleObserver.observe(head,{childList:true});
   lastSheet();
 }
})();
