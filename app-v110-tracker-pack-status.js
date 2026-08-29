(()=>{
  const packText=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
  const isLegacyPack=el=>/^Application pack:/i.test(packText(el))||/0\/\d+ proof areas drafted|proof areas drafted|pack not assembled/i.test(packText(el));

  function findVisibleStatuses(card){
    const all=[...card.querySelectorAll('*')].filter(el=>{
      if(!isLegacyPack(el))return false;
      if(el.closest('.focusAction'))return false;
      const text=packText(el);if(!text||text.length>220)return false;
      const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden')return false;
      return true;
    });
    const leaf=all.filter(el=>![...el.children].some(ch=>isLegacyPack(ch)));
    return (leaf.length?leaf:all).sort((a,b)=>packText(a).length-packText(b).length);
  }

  function refresh(){
    if(typeof tracks!=='object'||!tracks)return;
    document.querySelectorAll('#tracker .focusCard.exactTracked[data-exact-track-id]').forEach(card=>{
      const id=card.dataset.exactTrackId,t=tracks[id];if(!t)return;
      const s=window.OpportunityStudioTruth?.getState?.(t);if(!s||s.sourceMode!=='dedicatedPrepare')return;
      const statuses=findVisibleStatuses(card);if(!statuses.length)return;
      const docsDone=[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length;
      const html=`<b>Application pack:</b> ${docsDone===4?'Documents ready':`${docsDone}/4 document gates ready`} · ${s.providerReady?'Final provider check confirmed':'Provider re-check pending'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
      statuses.forEach(status=>{
        status.classList.add('exactPackStatusV133','exactPackStatusCanonical');
        if(status.innerHTML!==html)status.innerHTML=html;
      });
    });
  }

  const mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(refresh,40)});
  mo.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('opportunity:statechange',()=>setTimeout(refresh,30));
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle,.prepOpen'))setTimeout(refresh,60)},true);
  setInterval(refresh,350);
  setTimeout(refresh,80);
  window.OpportunityTrackerPackStatus={refresh};
})();