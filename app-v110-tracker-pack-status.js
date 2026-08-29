(()=>{
  function findStatus(card){
    const direct=card.querySelector('[class*="exactPackStatus"]');
    if(direct)return direct;
    const candidates=[...card.querySelectorAll('div,span,p')].filter(el=>/^Application pack:/i.test(String(el.textContent||'').trim()));
    return candidates.sort((a,b)=>String(a.textContent||'').length-String(b.textContent||'').length)[0]||null;
  }

  function refresh(){
    if(typeof tracks!=='object'||!tracks)return;
    document.querySelectorAll('#tracker .focusCard.exactTracked[data-exact-track-id]').forEach(card=>{
      const id=card.dataset.exactTrackId,t=tracks[id];if(!t)return;
      const s=window.OpportunityStudioTruth?.getState?.(t);if(!s||s.sourceMode!=='dedicatedPrepare')return;
      const status=findStatus(card);if(!status)return;
      const docsDone=[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length;
      status.classList.add('exactPackStatusV133');
      status.innerHTML=`<b>Application pack:</b> ${docsDone===4?'Documents ready':`${docsDone}/4 document gates ready`} · ${s.providerReady?'Final provider check confirmed':'Provider re-check pending'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
    });
  }

  const mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(refresh,80)});
  mo.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:statechange',()=>setTimeout(refresh,60));
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle,.prepOpen'))setTimeout(refresh,100)},true);
  setInterval(refresh,700);
  setTimeout(refresh,200);
  window.OpportunityTrackerPackStatus={refresh};
})();