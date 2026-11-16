/* Optional Orbital 2.0 Workspace command deck. Uses existing navigation handlers. */
(()=>{
 'use strict';
 const body=document.querySelector('#app .appBody');
 if(!body||document.getElementById('ovMissionDeck'))return;
 const deck=document.createElement('section');
 deck.className='ovMissionDeck';
 deck.id='ovMissionDeck';
 deck.setAttribute('aria-label','Opportunity Workspace navigation');
 deck.innerHTML=[
 '<div class="ovDeckCopy">',
 '<span class="ovDeckEyebrow"><span class="ovDeckPulse" aria-hidden="true"></span> YOUR OPPORTUNITY WORKSPACE</span>',
 '<h2>Make your next move <em>count.</em></h2>',
 '<p>Discover source-backed opportunities, keep your shortlist and move applications forward without losing the original provider link.</p>',
 '<div class="ovDeckActions" aria-label="Workspace sections">',
 '<button type="button" data-ov-route="discover">Discover <span aria-hidden="true">↗</span></button>',
 '<button type="button" data-ov-route="saved">Saved <span aria-hidden="true">↗</span></button>',
 '<button type="button" data-ov-route="tracker">Tracker <span aria-hidden="true">↗</span></button>',
 '<button type="button" data-ov-route="dashboard">Dashboard <span aria-hidden="true">↗</span></button>',
 '</div></div>',
 '<div class="ovDeckVisual" aria-hidden="true">',
 '<div class="ovDeckDisc ovDeckDisc1"></div><div class="ovDeckDisc ovDeckDisc2"></div>',
 '<div class="ovDeckDisc ovDeckDisc3"></div><div class="ovDeckCore">OM<span>↗</span></div>',
 '<span class="ovDeckSatellite ovDeckSatellite1"></span><span class="ovDeckSatellite ovDeckSatellite2"></span>',
 '</div>'
 ].join('');
 body.insertBefore(deck,body.firstChild);
 const buttons=[...deck.querySelectorAll('[data-ov-route]')];
 function sync(){
   const active=document.querySelector('#app .side .navbtn.active[data-v]')?.dataset.v||'discover';
   buttons.forEach(b=>{const isActive=b.dataset.ovRoute===active;b.classList.toggle('active',isActive);b.setAttribute('aria-pressed',String(isActive))});
 }
 deck.addEventListener('click',event=>{
   const b=event.target.closest('[data-ov-route]');if(!b)return;
   const route=b.dataset.ovRoute;
   const native=document.querySelector('#app .side .navbtn[data-v="'+route+'"]');
   if(!native)return;
   native.click();sync();
 });
 const nav=document.querySelector('#app .side');
 if(nav)new MutationObserver(sync).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
 deck.addEventListener('pointermove',event=>{
   if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   const rect=deck.getBoundingClientRect();
   deck.style.setProperty('--ov-dx',((event.clientX-rect.left)/rect.width-.5).toFixed(2));
   deck.style.setProperty('--ov-dy',((event.clientY-rect.top)/rect.height-.5).toFixed(2));
 },{passive:true});
 deck.addEventListener('pointerleave',()=>{deck.style.setProperty('--ov-dx','0');deck.style.setProperty('--ov-dy','0')});
 sync();
})();
