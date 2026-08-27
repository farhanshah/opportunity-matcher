(()=>{
  function go(id){
    if(!id)return;
    location.href=`/prepare?id=${encodeURIComponent(id)}`;
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.prepOpen');
    if(!btn)return;
    const card=btn.closest('.focusCard');
    const id=card?.dataset?.exactTrackId||btn.dataset?.exactTrackId;
    if(!id)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    go(id);
  },true);
  const existing=window.OpportunityPreparationWorkspace;
  if(existing&&typeof existing==='object')existing.open=go;
  window.OpportunityPrepareRoute={open:go};
})();