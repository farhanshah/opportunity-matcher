(()=>{
  // Only write to the DOM when the displayed value actually changes.
  // A MutationObserver writing identical text on each callback can trigger
  // itself indefinitely and freeze the entire admin console.
  function correctHealth(){
    const successText=document.getElementById('monitorSuccess')?.textContent||'';
    const match=successText.match(/(\d+)\s*\/\s*(\d+)/);
    if(match){
      const successful=Number(match[1]),total=Number(match[2])||1;
      const rows=[...document.querySelectorAll('#healthBars .healthRow')];
      const healthy=rows.find(r=>r.querySelector('span')?.textContent.trim()==='Healthy');
      if(healthy){
        const count=healthy.querySelector('b');
        const bar=healthy.querySelector('.healthTrack i');
        const nextCount=String(successful);
        const nextWidth=`${Math.min(100,(successful/total)*100)}%`;
        if(count&&count.textContent!==nextCount)count.textContent=nextCount;
        if(bar&&bar.style.width!==nextWidth)bar.style.width=nextWidth;
      }
    }
    document.querySelectorAll('#sourceIssuePreview .issueLine div span').forEach(s=>{
      const current=s.textContent||'';
      if(current&&!current.trim().startsWith('·')){
        const next=' · '+current.trim();
        if(current!==next)s.textContent=next;
      }
    });
  }
  const target=document.getElementById('console')||document.body;
  const observer=new MutationObserver(()=>correctHealth());
  observer.observe(target,{subtree:true,childList:true,characterData:true});
  correctHealth();
})();
