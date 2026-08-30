(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();

  function rowForCard(card){
    if(typeof tracks!=='object'||!tracks)return null;
    const title=norm(card.querySelector('.focusTitle')?.textContent||'');
    if(!title)return null;
    const entry=Object.entries(tracks).find(([,t])=>norm(t?.exactVacancy?.title)===title);
    return entry?{id:entry[0],t:entry[1]}:null;
  }

  function staleNodes(card){
    const matches=[...card.querySelectorAll('*')].filter(el=>{
      if(el.closest('.focusAction,.focusTasks,.exactTrackActions'))return false;
      const v=text(el);
      if(!v||v.length>240)return false;
      return /^Application pack:/i.test(v)||/\bproof areas drafted\b/i.test(v)||/\bPack not assembled\b/i.test(v);
    });
    const leaves=matches.filter(el=>![...el.children].some(ch=>matches.includes(ch)));
    return leaves.length?leaves:matches;
  }

  function canonical(s){
    const docsDone=[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length;
    return `<b>Application pack:</b> ${docsDone===4?'Documents ready':`${docsDone}/4 document gates ready`} · ${s.providerReady?'Final provider check confirmed':'Provider re-check pending'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
  }

  function refresh(){
    const truth=window.OpportunityStudioTruth;if(!truth?.getState)return;
    document.querySelectorAll('#tracker .focusCard').forEach(card=>{
      const row=rowForCard(card);if(!row?.t?.exactVacancy)return;
      const s=truth.getState(row.t);if(!s||s.sourceMode!=='dedicatedPrepare')return;
      const nodes=staleNodes(card);if(!nodes.length)return;
      const html=canonical(s);
      nodes.forEach(el=>{
        el.classList.add('exactPackStatusV133','exactPackStatusCanonical','exactPackStatusHardfix');
        if(el.innerHTML!==html)el.innerHTML=html;
      });
    });
  }

  const mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(refresh,25)});
  mo.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('opportunity:statechange',()=>setTimeout(refresh,20));
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle,.prepOpen'))setTimeout(refresh,35)},true);
  setInterval(refresh,250);
  setTimeout(refresh,40);
  window.OpportunityTrackerStatusHardfix={refresh};
})();