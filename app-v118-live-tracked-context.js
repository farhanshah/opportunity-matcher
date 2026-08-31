(()=>{
  const progressed=new Set(['Ready to submit','Submitted','Interview','Offer received','Unsuccessful']);
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const urlKey=v=>{
    try{
      const u=new URL(String(v||''),location.origin);
      return `${u.origin}${u.pathname}`.replace(/\/+$/,'').toLowerCase();
    }catch{
      return String(v||'').split('#')[0].split('?')[0].replace(/\/+$/,'').toLowerCase();
    }
  };

  const style=document.createElement('style');
  style.textContent=`
    #dashboard .omLiveTrackedBadge{display:inline-flex;align-items:center;width:max-content;margin:5px 0 0;padding:4px 7px;border-radius:999px;border:1px solid rgba(101,216,185,.22);background:rgba(101,216,185,.08);color:#86e6cf;font-size:6.5px;font-weight:850;letter-spacing:.055em;text-transform:uppercase}
    #dashboard .deepV2Card.omLiveProgressed{border-color:rgba(101,216,185,.18);background:rgba(101,216,185,.035)}
  `;
  document.head.appendChild(style);

  function trackedMaps(){
    const byUrl=new Map(),byTitle=new Map();
    const source=(typeof tracks==='object'&&tracks)||window.tracks||{};
    for(const [id,t] of Object.entries(source)){
      const m=t?.exactVacancy;if(!m)continue;
      const row={id,t,m,stage:String(t?.stage||'Saved')};
      if(m.url)byUrl.set(urlKey(m.url),row);
      if(m.title)byTitle.set(norm(m.title),row);
    }
    return{byUrl,byTitle};
  }

  function fixActionGrammar(){
    document.querySelectorAll('#dashboard .omActionCard').forEach(card=>{
      const label=norm(card.querySelector('span')?.textContent);
      const title=card.querySelector('b');
      if(label==='deadline attention'&&title&&/^1 tracked application need attention soon\.?$/i.test(title.textContent.trim())){
        title.textContent='1 tracked application needs attention soon.';
      }
    });
  }

  function decorateLive(){
    const grid=document.querySelector('#dashboard .deepLiveV2 .deepV2Grid');
    if(!grid)return false;
    const {byUrl,byTitle}=trackedMaps();
    const cards=[...grid.querySelectorAll(':scope > .deepV2Card')];
    if(!cards.length)return false;

    const progressedCards=[];
    for(const card of cards){
      const title=String(card.querySelector('h4')?.textContent||'').trim();
      const href=card.querySelector('.deepV2Actions a')?.href||'';
      const row=byUrl.get(urlKey(href))||byTitle.get(norm(title));
      card.querySelector('.omLiveTrackedBadge')?.remove();
      card.classList.remove('omLiveTracked','omLiveProgressed');
      if(!row)continue;

      card.classList.add('omLiveTracked');
      const badge=document.createElement('div');
      badge.className='omLiveTrackedBadge';
      badge.textContent=`Tracked · ${row.stage}`;
      const h4=card.querySelector('h4');
      if(h4)h4.insertAdjacentElement('beforebegin',badge);
      if(progressed.has(row.stage)){
        card.classList.add('omLiveProgressed');
        progressedCards.push(card);
      }
    }

    // Keep the live pool visible, but put applications already ready/submitted
    // behind genuinely new opportunities so discovery slots stay useful.
    progressedCards.forEach(card=>grid.appendChild(card));

    [...grid.querySelectorAll(':scope > .deepV2Card')].forEach((card,index)=>{
      const verdict=card.querySelector('.deepV2Verdict');
      if(!verdict)return;
      const label=String(verdict.textContent||'').replace(/^#\d+\s*·\s*/,'');
      verdict.textContent=`#${index+1} · ${label}`;
    });
    return true;
  }

  function apply(){
    fixActionGrammar();
    decorateLive();
  }

  function schedule(){
    [0,350,1100,2400,4800].forEach(ms=>setTimeout(apply,ms));
  }

  window.addEventListener('opportunity:statechange',schedule);
  window.addEventListener('opportunity:hydrated',schedule);
  window.addEventListener('opportunity:verifiedfeedchange',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="dashboard"]'))schedule()},true);
  schedule();

  window.OpportunityLiveTrackedContext={refresh:schedule};
})();
