(()=>{
  const STYLE_ID='om-radar-order-v204';
  function ensure(){
    if(!document.getElementById(STYLE_ID)){
      const style=document.createElement('style');
      style.id=STYLE_ID;
      style.textContent=`
        #dashboard .omApplicationRadarV203{order:3!important}
      `;
      document.head.appendChild(style);
    }
    try{window.OpportunityProductUX?.refresh?.()}catch(e){console.warn('Radar order refresh skipped',e)}
  }
  ensure();
  window.addEventListener('opportunity:hydrated',ensure);
  window.addEventListener('opportunity:statechange',ensure);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))queueMicrotask(ensure)},true);
  window.OpportunityRadarOrderV204={refresh:ensure};
})();
