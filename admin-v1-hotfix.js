(()=>{
  function correctHealth(){
    const successText=document.getElementById('monitorSuccess')?.textContent||'';
    const match=successText.match(/(\d+)\s*\/\s*(\d+)/);
    if(!match)return;
    const successful=Number(match[1]),total=Number(match[2])||1;
    const rows=[...document.querySelectorAll('#healthBars .healthRow')];
    const healthy=rows.find(r=>r.querySelector('span')?.textContent.trim()==='Healthy');
    if(healthy){
      const count=healthy.querySelector('b');
      const bar=healthy.querySelector('.healthTrack i');
      if(count)count.textContent=String(successful);
      if(bar)bar.style.width=`${Math.min(100,(successful/total)*100)}%`;
    }
    document.querySelectorAll('#sourceIssuePreview .issueLine div span').forEach(s=>{
      if(s.textContent&&!s.textContent.trim().startsWith('·'))s.textContent=' · '+s.textContent.trim();
    });
  }
  const target=document.getElementById('console')||document.body;
  new MutationObserver(correctHealth).observe(target,{subtree:true,childList:true,characterData:true});
  correctHealth();
})();
