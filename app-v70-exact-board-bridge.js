(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const style=document.createElement('style');
  style.textContent=`
    #tracker .boardCardV11.exactBoardTracked{border-color:#dce7b8;box-shadow:0 10px 26px rgba(64,78,25,.05)}
    .exactBoardBadge{display:inline-flex;align-items:center;margin-bottom:5px;padding:3px 6px;border-radius:999px;background:#f2f8df;border:1px solid #dce9b9;color:#587013;font-size:6px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}
    .boardBottomV11 .prepOpenBoard,.boardBottomV11 .exactOfficialBoard{border-radius:8px;padding:7px 9px;font-size:7px;font-weight:900;text-decoration:none;white-space:nowrap}
    .boardBottomV11 .prepOpenBoard{border:0;background:#d8ff69;color:#1a210a;cursor:pointer}
    .boardBottomV11 .exactOfficialBoard{border:1px solid #d7e4ad;background:#f4f9e6;color:#344414}
    .boardBottomV11.exactBoardActions{display:flex;gap:5px;align-items:center;flex-wrap:wrap}
    .boardBottomV11.exactBoardActions small{margin-left:auto}
  `;
  document.head.appendChild(style);

  function exactMap(){
    const map=new Map();
    for(const [id,t] of Object.entries(tracks||{})){
      const m=t?.exactVacancy;if(!m?.url||!m?.title)continue;
      map.set(norm(m.title),{id,t,m});
    }
    return map;
  }

  function decorate(){
    const map=exactMap();
    document.querySelectorAll('#tracker .boardCardV11').forEach(card=>{
      const title=norm(card.querySelector('.boardTitleV11')?.textContent||'');
      const row=map.get(title);if(!row)return;
      const {id,m}=row;card.classList.add('exactBoardTracked');card.dataset.exactTrackId=id;
      const identity=card.querySelector('.boardTitleV11')?.parentElement;
      if(identity&&!identity.querySelector('.exactBoardBadge')){
        const badge=document.createElement('div');badge.className='exactBoardBadge';badge.textContent='Exact live vacancy · tracked';identity.insertBefore(badge,identity.firstChild);
      }
      const bottom=card.querySelector('.boardBottomV11');if(!bottom)return;
      bottom.classList.add('exactBoardActions');
      if(!bottom.querySelector('.prepOpenBoard')){
        const prep=document.createElement('button');prep.type='button';prep.className='prepOpenBoard';prep.textContent='Prepare application';prep.onclick=()=>window.OpportunityPreparationWorkspace?.open?.(id);bottom.insertBefore(prep,bottom.firstChild);
      }
      if(!bottom.querySelector('.exactOfficialBoard')){
        const link=document.createElement('a');link.className='exactOfficialBoard';link.href=m.url;link.target='_blank';link.rel='noopener';link.textContent='Official vacancy ↗';const small=bottom.querySelector('small');small?bottom.insertBefore(link,small):bottom.appendChild(link);
      }
    });
  }

  const obs=new MutationObserver(()=>setTimeout(decorate,20));
  obs.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:statechange',()=>setTimeout(decorate,40));
  setInterval(decorate,1000);setTimeout(decorate,500);
  window.OpportunityExactBoardBridge={refresh:decorate};
})();