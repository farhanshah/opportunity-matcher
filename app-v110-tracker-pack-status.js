(()=>{
  const packText=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
  const isPackStatus=el=>/^Application pack:/i.test(packText(el))||/proof areas drafted|pack not assembled|document gates ready|provider re-check/i.test(packText(el));

  function findStatuses(card){
    const all=[...card.querySelectorAll('div,span,p')].filter(isPackStatus);
    const leaf=all.filter(el=>![...el.querySelectorAll('div,span,p')].some(ch=>ch!==el&&isPackStatus(ch)));
    return leaf.length?leaf:all.sort((a,b)=>packText(a).length-packText(b).length).slice(0,1);
  }

  function refresh(){
    if(typeof tracks!=='object'||!tracks)return;
    document.querySelectorAll('#tracker .focusCard.exactTracked[data-exact-track-id]').forEach(card=>{
      const id=card.dataset.exactTrackId,t=tracks[id];if(!t)return;
      const s=window.OpportunityStudioTruth?.getState?.(t);if(!s||s.sourceMode!=='dedicatedPrepare')return;
      const statuses=findStatuses(card);if(!statuses.length)return;
      const docsDone=[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length;
      const html=`<b>Application pack:</b> ${docsDone===4?'Documents ready':`${docsDone}/4 document gates ready`} · ${s.providerReady?'Final provider check confirmed':'Provider re-check pending'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
      statuses.forEach(status=>{
        status.classList.add('exactPackStatusV133','exactPackStatusCanonical');
        if(status.innerHTML!==html)status.innerHTML=html;
      });
    });
  }

  const mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(refresh,60)});
  mo.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:statechange',()=>setTimeout(refresh,40));
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle,.prepOpen'))setTimeout(refresh,80)},true);
  setInterval(refresh,500);
  setTimeout(refresh,120);
  window.OpportunityTrackerPackStatus={refresh};
})();