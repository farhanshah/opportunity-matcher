/* Orbital Command v1: presentation only; no changes to matching, auth, tracking or theme state. */
(function(){
  'use strict';
  var shell=document.getElementById('slideShell');
  var root=document.documentElement;
  var progress=document.createElement('div');
  progress.className='orbital-progress';
  progress.setAttribute('aria-hidden','true');
  document.body.appendChild(progress);
  var pending=false;
  function updateScroll(){
    pending=false;
    var range=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    progress.style.transform='scaleX('+Math.min(1,Math.max(0,scrollY/range))+')';
  }
  addEventListener('scroll',function(){if(!pending){pending=true;requestAnimationFrame(updateScroll)}},{passive:true});
  addEventListener('resize',updateScroll,{passive:true});
  updateScroll();
  if(!shell)return;
  var slides=[].slice.call(shell.querySelectorAll('.slide'));
  if(slides.length<2)return;
  slides.forEach(function(s,i){
    s.setAttribute('role','group');
    s.setAttribute('aria-roledescription','slide');
    s.setAttribute('aria-label','Slide '+(i+1)+' of '+slides.length);
    s.setAttribute('aria-hidden',i===0?'false':'true');
    var dots=s.querySelector('.slideCounter');
    if(dots){
      dots.innerHTML='';
      for(var n=0;n<slides.length;n++){
        var dot=document.createElement('span');
        dot.className='dot'+(n===i?' active':'');
        dot.setAttribute('aria-hidden','true');
        dot.appendChild(document.createElement('i'));
        dots.appendChild(dot);
      }
    }
  });
  var controls=document.createElement('div');
  controls.className='orbital-slide-controls';
  controls.setAttribute('aria-label','Featured opportunity photograph controls');
  controls.innerHTML='<button type="button" data-step="-1" aria-label="Previous photograph">‹</button><button type="button" data-step="1" aria-label="Next photograph">›</button><span class="orbital-slide-count" aria-live="polite">01 / '+String(slides.length).padStart(2,'0')+'</span>';
  shell.parentElement.appendChild(controls);
  var count=controls.querySelector('.orbital-slide-count');
  function activeIndex(){
    var x=slides.findIndex(function(s){return s.classList.contains('active')});
    return x===-1?0:x;
  }
  function sync(){
    var x=activeIndex();
    slides.forEach(function(s,i){
      s.setAttribute('aria-hidden',i===x?'false':'true');
      var ds=s.querySelectorAll('.slideCounter .dot');
      ds.forEach(function(d,n){d.classList.toggle('active',n===x)});
    });
    if(count)count.textContent=String(x+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
  }
  var observer=new MutationObserver(sync);
  slides.forEach(function(s){observer.observe(s,{attributes:true,attributeFilter:['class']})});
  controls.addEventListener('click',function(e){
    var btn=e.target.closest('button[data-step]');
    if(!btn)return;
    var next=(activeIndex()+Number(btn.dataset.step)+slides.length)%slides.length;
    if(window.OpportunityCarousel&&typeof window.OpportunityCarousel.go==='function'){
      window.OpportunityCarousel.go(next);
    }else{
      slides.forEach(function(s,i){s.classList.toggle('active',i===next)});
    }
    sync();
  });
  sync();
  root.classList.add('omOrbitalCommand');
})();
