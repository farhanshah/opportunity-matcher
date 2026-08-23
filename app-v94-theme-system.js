(()=>{
  const MODE_KEY='oppThemeModeV1';
  const MODES=['auto','light','dark'];
  const root=document.documentElement;
  let mode=(()=>{try{const v=localStorage.getItem(MODE_KEY);return MODES.includes(v)?v:'auto'}catch{return'auto'}})();

  function addFont(){
    if(document.querySelector('link[data-om-font]'))return;
    const p1=document.createElement('link');p1.rel='preconnect';p1.href='https://fonts.googleapis.com';p1.dataset.omFont='preconnect';document.head.appendChild(p1);
    const p2=document.createElement('link');p2.rel='preconnect';p2.href='https://fonts.gstatic.com';p2.crossOrigin='anonymous';p2.dataset.omFont='preconnect';document.head.appendChild(p2);
    const font=document.createElement('link');font.rel='stylesheet';font.href='https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';font.dataset.omFont='true';document.head.appendChild(font);
  }

  function addThemeCss(){
    if(document.querySelector('link[data-om-theme-css]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='/theme-v2.css';link.dataset.omThemeCss='true';document.head.appendChild(link);
  }

  function autoTheme(){
    const hour=new Date().getHours();
    return hour>=7&&hour<19?'light':'dark';
  }
  function resolved(){return mode==='auto'?autoTheme():mode}
  function icon(){if(mode==='auto')return resolved()==='dark'?'◐':'◑';return mode==='dark'?'☾':'☀'}
  function label(){return mode==='auto'?'Auto':mode==='dark'?'Dark':'Light'}
  function apply(){
    const theme=resolved();
    root.dataset.omTheme=theme;root.dataset.omThemeMode=mode;
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='dark'?'#0b1017':'#f5f3ee';
    document.querySelectorAll('.omThemeToggle').forEach(btn=>{
      btn.setAttribute('aria-label',`Theme: ${label()}. Click to change.`);
      btn.title=`Theme: ${label()} · ${theme==='dark'?'night':'day'} appearance`;
      const i=btn.querySelector('.omThemeIcon'),t=btn.querySelector('.omThemeMode');if(i)i.textContent=icon();if(t)t.textContent=label();
    });
  }
  function setMode(next){
    mode=MODES.includes(next)?next:'auto';
    try{localStorage.setItem(MODE_KEY,mode)}catch{}
    apply();
    window.dispatchEvent(new CustomEvent('opportunity:themechange',{detail:{mode,theme:resolved()}}));
  }
  function cycle(){setMode(MODES[(MODES.indexOf(mode)+1)%MODES.length])}
  function button(){const b=document.createElement('button');b.type='button';b.className='omThemeToggle';b.innerHTML='<span class="omThemeIcon" aria-hidden="true"></span><span class="omThemeMode"></span>';b.addEventListener('click',cycle);return b}
  function mountButtons(){
    const nav=document.querySelector('#landing .nav');
    if(nav&&!nav.querySelector('.omThemeToggle')){const primary=[...nav.children].find(x=>x.matches?.('button.btnPrimary'));const b=button();primary?nav.insertBefore(b,primary):nav.appendChild(b)}
    const top=document.querySelector('#app .topRight')||document.querySelector('#app .appTop');
    if(top&&!top.querySelector('.omThemeToggle'))top.insertBefore(button(),top.firstChild||null);
    apply();
  }

  const revealSelector='.section.reveal,.feature,.liveCard,.step,.oppCard.upgraded,.savedTile,.focusCard,.boardCard,.dashPanel,.deepV2Card';
  let io=null;
  function setupMotion(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    if(!io)io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('omRevealed');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -30px 0px'});
    document.querySelectorAll(revealSelector).forEach(el=>{if(el.dataset.omRevealBound)return;el.dataset.omRevealBound='1';el.classList.add('omRevealTarget');io.observe(el)});
    document.querySelectorAll('.featureGrid,.liveGrid,.steps,.deepV2Grid').forEach(group=>{group.classList.add('omStagger');[...group.children].forEach((child,i)=>child.style.setProperty('--om-i',Math.min(i,8)))})
  }

  function refresh(){mountButtons();setupMotion()}
  addFont();addThemeCss();apply();
  const observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(refresh,70)});observer.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('focus',()=>{if(mode==='auto')apply();refresh()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mode==='auto')apply()});
  setInterval(()=>{if(mode==='auto')apply()},300000);
  setTimeout(refresh,40);setTimeout(refresh,700);setTimeout(refresh,1800);
  window.OpportunityTheme={getMode:()=>mode,getTheme:resolved,setMode,refresh};
})();
