(()=>{
  let running=false,lastKey='';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function programmeId(card){const b=[...card.querySelectorAll('button')].find(x=>/Programme analysis/i.test(x.textContent||''));const raw=b?.getAttribute('onclick')||'';return raw.match(/openDetail\(['"]([^'"]+)['"]\)/)?.[1]||''}
  async function status(card){const a=card.querySelector('a[href]'),id=programmeId(card);if(!a||!id)return null;try{const r=await fetch(`/api/vacancy-status?opportunity_id=${encodeURIComponent(id)}&url=${encodeURIComponent(a.href)}&ts=${Date.now()}`,{cache:'no-store'});const d=await r.json();return r.ok?d:null}catch{return null}}
  function renumber(section){const cards=[...section.querySelectorAll('.deepLiveCard')].filter(x=>x.style.display!=='none');cards.forEach((c,i)=>{const badge=c.querySelector('.deepLiveVerdict');if(badge)badge.textContent=badge.textContent.replace(/^#\d+\s*·\s*/,`#${i+1} · `)});const ranked=[...section.querySelectorAll('.deepLiveMeta span')].find(x=>/ranked/i.test(x.textContent||''));if(ranked)ranked.textContent=`${cards.length} ranked`;return cards.length}
  async function run(){
    if(running)return;const section=document.querySelector('#dashboard .deepLive');if(!section||document.getElementById('dashboard')?.classList.contains('hide'))return;
    const cards=[...section.querySelectorAll('.deepLiveCard')];if(!cards.length)return;const key=cards.map(c=>c.querySelector('a[href]')?.href||'').join('|');if(key===lastKey&&section.dataset.statusVerified==='1')return;
    lastKey=key;running=true;let removed=0,verified=0;
    try{
      const results=await Promise.all(cards.map(async card=>({card,data:await status(card)})));
      for(const {card,data} of results){if(!data)continue;verified++;card.dataset.statusVerified='1';if(data.deadline){const p=card.querySelector(':scope > p');if(p){let txt=p.textContent||'';if(/Deadline\s+\d{4}-\d{2}-\d{2}/i.test(txt))txt=txt.replace(/Deadline\s+\d{4}-\d{2}-\d{2}/i,`Deadline ${data.deadline}`);else txt=[txt,`Deadline ${data.deadline}`].filter(Boolean).join(' · ');p.textContent=txt}}
        if(data.closed){card.style.display='none';card.dataset.closedRemoved='1';removed++}
      }
      const visible=renumber(section);const meta=section.querySelector('.deepLiveMeta');if(meta){meta.querySelectorAll('.statusGuardMeta').forEach(x=>x.remove());if(removed)meta.insertAdjacentHTML('beforeend',`<span class="statusGuardMeta">${removed} closed removed</span>`);if(verified)meta.insertAdjacentHTML('beforeend',`<span class="statusGuardMeta">status verified ${verified}</span>`)}
      if(!visible){let empty=section.querySelector('.deepLiveEmpty');if(!empty){empty=document.createElement('div');empty.className='deepLiveEmpty';empty.innerHTML='<b>No currently open vacancy survived final status verification.</b><p>Opportunity removed postings whose official page shows a passed deadline or closed application state.</p>';section.querySelector('.deepLiveGrid')?.replaceWith(empty)}}
      section.dataset.statusVerified='1';
    }finally{running=false}
  }
  const obs=new MutationObserver(()=>setTimeout(run,150));obs.observe(document.body,{childList:true,subtree:true});setInterval(run,1800);setTimeout(run,500);window.OpportunityVacancyStatusGuard={refresh:()=>{lastKey='';document.querySelector('#dashboard .deepLive')?.removeAttribute('data-status-verified');run()}};
})();
