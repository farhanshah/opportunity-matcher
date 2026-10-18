'use strict';
/**
 * Candidate-only visual shell. Moves no application data or controls.
 * Mounts one presentation header and responsive navigation controls,
 * following existing setView()/route changes via active navigation classes.
 * Does not send requests, persist state, or alter API / domain logic.
 */
(()=>{
 const root=document.documentElement;
 if(!root.classList.contains('omTurquoisePreview'))return;
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

 // SPA routes normally push /tracker, /saved etc. In the isolated preview those
 // paths reload production index.html and lose the approved theme. Retain this
 // preview document URL and express the route as a hash, without touching live routing.
 const previewFile='/integration-preview-v2.html';
 const views=new Set(Object.keys(route));
 for(const method of ['pushState','replaceState']){
   const original=history[method];
   history[method]=function(state,title,nextUrl){
     if(nextUrl!==undefined&&nextUrl!==null){
       try{
         const requested=new URL(String(nextUrl),location.href);
         const path=requested.pathname.replace(/^\/+|\/+$/g,'').toLowerCase();
         if(requested.origin===location.origin&&views.has(path)){
           return original.call(this,state,title,previewFile+location.search+'#'+path);
         }
       }catch{}
     }
     return original.apply(this,arguments);
   };
 }
 // Recover the selected view after refreshing /integration-preview-v2.html#tracker.
 // This restores presentation only. No account data, save or sync is performed.
 const initialView=location.hash.slice(1).toLowerCase();
 if(views.has(initialView)){
   let attempts=0;
   const restoration=setInterval(()=>{
     attempts++;
     if(typeof window.showApp==='function'&&typeof window.setView==='function'){
       clearInterval(restoration);
       window.showApp();
       window.setView(initialView,{replace:true});
     }else if(attempts>=300){clearInterval(restoration);}
   },100);
 }

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
 const stylesheet=document.querySelector('link[href^="/integration-turquoise-v2.css"]');
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
