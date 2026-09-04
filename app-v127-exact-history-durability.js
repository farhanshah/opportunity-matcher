(()=>{
  let scheduled=false,root=null,observer=null;
  const source=()=>((typeof tracks==='object'&&tracks)||window.tracks||{});
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();

  function resolveId(card){
    const all=source();
    const direct=card?.dataset?.exactTrackId||card?.dataset?.trackId;
    if(direct&&all[direct])return direct;
    const title=norm(card?.querySelector('.focusTitle,.boardTitle')?.textContent||'');
    const provider=norm(card?.querySelector('.focusProvider,.boardProvider')?.textContent||'');
    if(!title)return'';
    const rows=(typeof opps!=='undefined'&&Array.isArray(opps)?opps:[]).filter(o=>norm(o?.Opportunity_Name)===title&&(!provider||norm(o?.Provider)===provider));
    const hit=rows.find(o=>all[o.Opportunity_ID]);
    return hit?.Opportunity_ID||'';
  }

  function ensureButton(card,id,t){
    if(!card||!id||!t)return false;
    const wrap=card.querySelector('.exactTrackActions');
    if(!wrap)return false;
    let btn=card.querySelector('.applicationHistoryBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='applicationHistoryBtn';
      const official=wrap.querySelector('.exactOfficial');
      official?wrap.insertBefore(btn,official):wrap.appendChild(btn);
    }else if(btn.parentElement!==wrap){
      const official=wrap.querySelector('.exactOfficial');
      official?wrap.insertBefore(btn,official):wrap.appendChild(btn);
    }
    btn.dataset.trackId=id;
    const count=Array.isArray(t?.checklist?.history)?t.checklist.history.length:0;
    const label=`History · ${count}`;
    if(btn.textContent!==label)btn.textContent=label;
    return true;
  }

  function ensure(){
    scheduled=false;
    bindObserver();
    const all=source();
    document.querySelectorAll('#tracker .focusCard.exactTracked,#tracker .focusCard[data-exact-track-id],#tracker .boardCard[data-exact-track-id]').forEach(card=>{
      const id=resolveId(card),t=all[id];
      if(id&&t)ensureButton(card,id,t);
    });
  }

  function schedule(delay=18){
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>requestAnimationFrame(ensure),delay);
  }

  function bindObserver(){
    const next=document.getElementById('tracker');
    if(next===root)return;
    observer?.disconnect?.();root=next;
    if(!root)return;
    observer=new MutationObserver(mutations=>{
      let relevant=false;
      for(const m of mutations){
        if(m.type!=='childList')continue;
        const target=m.target;
        if(target?.closest?.('.focusCard.exactTracked,.focusCard[data-exact-track-id],.exactTrackActions')||
           [...m.addedNodes].some(n=>n?.nodeType===1&&(n.matches?.('.focusCard.exactTracked,.focusCard[data-exact-track-id],.exactTrackActions')||n.querySelector?.('.focusCard.exactTracked,.focusCard[data-exact-track-id],.exactTrackActions')))){
          relevant=true;break;
        }
      }
      if(relevant)schedule(0);
    });
    observer.observe(root,{childList:true,subtree:true});
  }

  const priorRender=window.renderTracker;
  if(typeof priorRender==='function'&&!priorRender.__omExactHistoryDurability){
    const wrapped=function(...args){
      const out=priorRender.apply(this,args);
      schedule();
      return out;
    };
    wrapped.__omExactHistoryDurability=true;
    wrapped.__omPrior=priorRender;
    try{renderTracker=wrapped}catch{}
    window.renderTracker=wrapped;
  }

  window.addEventListener('opportunity:statechange',()=>schedule());
  window.addEventListener('opportunity:hydrated',()=>schedule());
  setTimeout(()=>schedule(0),120);
  window.OpportunityExactHistoryDurability={refresh:()=>schedule(0)};
})();
