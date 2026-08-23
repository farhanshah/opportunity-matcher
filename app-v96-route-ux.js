(()=>{
  function resetScroll(){
    try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch{window.scrollTo(0,0)}
    const body=document.querySelector('#app .appBody');
    if(body&&body.scrollTop)body.scrollTop=0;
  }

  function wrapSetView(){
    const prior=window.setView;
    if(typeof prior!=='function'||prior.__omScrollResetV128)return false;
    const wrapped=function(view,...args){
      const result=prior(view,...args);
      resetScroll();
      requestAnimationFrame(resetScroll);
      setTimeout(resetScroll,40);
      return result;
    };
    wrapped.__omScrollResetV128=true;
    wrapped.__omPrior=prior;
    try{setView=wrapped}catch{}
    window.setView=wrapped;
    document.querySelectorAll('.navbtn[data-v]').forEach(btn=>{btn.onclick=()=>wrapped(btn.dataset.v)});
    return true;
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.navbtn[data-v]'))requestAnimationFrame(resetScroll);
  },true);

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(wrapSetView()||tries>30)clearInterval(timer);
  },100);
  setTimeout(wrapSetView,0);
  setTimeout(wrapSetView,900);
})();
