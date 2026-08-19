(()=>{
  let timer=null;
  const q=s=>document.querySelector(s);
  const signedIn=()=>{
    const entry=document.getElementById('cloudAccountEntry');
    return Boolean(entry&&entry.classList.contains('cloudAccountBtn')&&!entry.classList.contains('signedOut'));
  };
  const tracksCount=()=>{
    try{return Object.keys(window.OpportunityState?.getTracks?.()||{}).length}catch{}
    try{return Object.keys(JSON.parse(localStorage.getItem('oppTracksV6')||'{}')).length}catch{return 0}
  };
  const savedCount=()=>{
    try{return (window.OpportunityState?.getSaved?.()||[]).length}catch{}
    try{return JSON.parse(localStorage.getItem('oppSavedV6')||'[]').length}catch{return 0}
  };
  function openWorkspace(view){
    try{window.showApp?.();window.setView?.(view||((tracksCount()>0)?'tracker':'discover'))}catch(e){console.warn('Public CTA workspace route failed',e)}
  }
  function wire(btn,label,handler){if(!btn)return;btn.innerHTML=label;btn.onclick=handler}
  function apply(){
    const authed=signedIn();
    const tracks=tracksCount();
    const saved=savedCount();

    const navCta=q('.heroWrap .nav > .btnPrimary');
    const heroPrimary=q('.hero .heroActions .btnPrimary');
    const heroSecondary=q('.hero .heroActions .btnGhost');
    const engineCta=q('.engine .heroActions .btnPrimary');
    const finalCopy=q('.cta .ctaContent > p');
    const finalPrimary=q('.cta .heroActions .btnPrimary');
    const finalSecondary=q('.cta .heroActions .btnGhost');
    const footerTag=q('.footer .brandword small');
    const footerCopy=q('.footer > div:last-child');

    if(finalCopy)finalCopy.textContent='Discover live opportunities, check eligibility against official sources, and keep your shortlist and applications together in one workspace.';
    if(footerTag)footerTag.textContent='global matcher';
    if(footerCopy)footerCopy.innerHTML='Official-source links remain the source of truth for applications and eligibility.<br>© 2026 Opportunity.';

    if(authed){
      wire(navCta,'Open workspace <span>↗</span>',()=>openWorkspace());
      wire(heroPrimary,'Open my workspace <span>↗</span>',()=>openWorkspace());
      wire(heroSecondary,tracks?'Open tracker':'Review my matches',()=>openWorkspace(tracks?'tracker':'discover'));
      wire(engineCta,'Open live matcher',()=>openWorkspace('discover'));
      wire(finalPrimary,'Open my workspace <span>↗</span>',()=>openWorkspace());
      wire(finalSecondary,tracks?`Open tracker · ${tracks}`:saved?`Review shortlist · ${saved}`:'Review my matches',()=>openWorkspace(tracks?'tracker':saved?'saved':'discover'));
    }else{
      wire(navCta,'Build my Passport <span>↗</span>',()=>window.openOnboard?.());
      wire(heroPrimary,'Create my Opportunity Passport <span>↗</span>',()=>window.openOnboard?.());
      wire(heroSecondary,'Explore a sample profile',()=>window.sample?.());
      wire(engineCta,'Use the live matcher',()=>window.openOnboard?.());
      wire(finalPrimary,'Create my Opportunity Passport <span>↗</span>',()=>window.openOnboard?.());
      wire(finalSecondary,'Preview workspace',()=>window.sample?.());
    }
  }

  const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,60)};
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('opportunity:statechange',schedule);
  apply();setTimeout(apply,400);setTimeout(apply,1200);setTimeout(apply,2600);
})();