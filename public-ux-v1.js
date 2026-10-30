/* Public homepage copy and visual disclosure only. No publication or eligibility logic. */
(()=>{
 'use strict';
 const heroLabel=document.getElementById('heroOpenCallsLabel');
 const catalogueLabel=document.getElementById('liveCopy');
 const grid=document.getElementById('featuredGrid');
 function sync(){
   if(heroLabel){
     const current=heroLabel.textContent||'';
     const next=current.replace(/\b1\s+calls\b/gi,'1 call');
     if(next!==current)heroLabel.textContent=next;
   }
   if(catalogueLabel){
     const current=catalogueLabel.textContent||'';
     const next=current.replace(/recently verified active\/upcoming routes/gi,
        'programme catalogue routes currently verified');
     if(next!==current)catalogueLabel.textContent=next;
   }
   if(grid)for(const card of grid.querySelectorAll('.liveCard')){
     if(card.querySelector('.omHistoricalNotice'))continue;
     if(!/needs source recheck|source re-?verification|unverified/i.test(card.textContent||''))continue;
     const notice=document.createElement('p');
     notice.className='omHistoricalNotice';
     notice.textContent='Historical programme information. Confirm current funding, deadlines and eligibility with the provider.';
     const target=card.querySelector('.tagRow,.liveTags,.liveReason');
     if(target)target.insertAdjacentElement('afterend',notice);else card.appendChild(notice);
   }
 }
 let scheduled=false;
 const observer=new MutationObserver(()=>{
   if(scheduled)return;
   scheduled=true;
   requestAnimationFrame(()=>{scheduled=false;sync()});
 });
 for(const node of [heroLabel,catalogueLabel,grid])if(node){
   observer.observe(node,{subtree:true,childList:true,characterData:true});
 }
 sync();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
})();