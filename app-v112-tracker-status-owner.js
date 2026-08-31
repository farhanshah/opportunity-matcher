(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();

  function rowFor(card){
    if(typeof tracks!=='object'||!tracks)return null;
    const id=card.dataset.exactTrackId;
    if(id&&tracks[id])return{id,t:tracks[id]};
    const title=norm(card.querySelector('.focusTitle')?.textContent||'');
    if(!title)return null;
    const entry=Object.entries(tracks).find(([,t])=>norm(t?.exactVacancy?.title)===title);
    return entry?{id:entry[0],t:entry[1]}:null;
  }

  function canonicalHTML(s){
    const docsDone=[s.cvReady,s.motReady,s.writingReady,s.pdfReady].filter(Boolean).length;
    return `<b>Application pack:</b> ${docsDone===4?'Documents ready':`${docsDone}/4 document gates ready`} · ${s.providerReady?'Final provider check confirmed':'Provider re-check pending'}<br>${s.verifyDone}/${s.verifyTotal} official checks recorded`;
  }

  function statusContainer(card){
    const marked=[...card.querySelectorAll('.exactPackStatusV132,.exactPackStatusV133,.exactPackStatusCanonical')];
    if(marked.length){
      return marked.find(el=>!el.parentElement?.closest('.exactPackStatusV132,.exactPackStatusV133,.exactPackStatusCanonical'))||marked[0];
    }
    return [...card.querySelectorAll('div')].find(el=>{
      if(el.closest('.focusAction,.focusTasks,.exactTrackActions'))return false;
      const txt=String(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!/^Application pack:/i.test(txt)||txt.length>260)return false;
      return ![...el.children].some(ch=>/^Application pack:/i.test(String(ch.textContent||'').replace(/\s+/g,' ').trim()));
    })||null;
  }

  function refreshCard(card){
    const truth=window.OpportunityStudioTruth;
    if(!truth?.getState)return;
    const row=rowFor(card);
    if(!row?.t?.exactVacancy)return;
    const s=truth.getState(row.t);
    if(!s||s.sourceMode!=='dedicatedPrepare')return;

    const status=statusContainer(card);
    if(!status)return;

    const html=canonicalHTML(s);
    const duplicates=[...card.querySelectorAll('.exactPackStatusV132,.exactPackStatusV133,.exactPackStatusCanonical')]
      .filter(el=>el!==status&&(status.contains(el)||el.parentElement===status.parentElement));
    duplicates.forEach(el=>el.remove());

    status.classList.remove('exactPackStatusV132');
    status.classList.add('exactPackStatusV133','exactPackStatusCanonical');
    if(status.dataset.canonicalPackSig!==html){
      status.innerHTML=html;
      status.dataset.canonicalPackSig=html;
    }
  }

  function refresh(){
    document.querySelectorAll('#tracker .focusCard.exactTracked').forEach(refreshCard);
  }

  const oldRender=window.renderTracker;
  if(typeof oldRender==='function'){
    const wrapped=(...args)=>{
      const out=oldRender(...args);
      queueMicrotask(refresh);
      return out;
    };
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
  }

  window.addEventListener('opportunity:statechange',()=>setTimeout(refresh,0));
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.navbtn[data-v="tracker"],.viewToggle'))setTimeout(refresh,0);
  },true);

  const observer=new MutationObserver(records=>{
    const relevant=records.some(r=>[...r.addedNodes].some(n=>
      n.nodeType===1&&(n.matches?.('#tracker,.focusCard')||n.querySelector?.('.focusCard'))
    ));
    if(relevant)requestAnimationFrame(refresh);
  });
  observer.observe(document.body,{subtree:true,childList:true});

  setTimeout(refresh,0);
  window.OpportunityTrackerStatusOwner={refresh};
})();
