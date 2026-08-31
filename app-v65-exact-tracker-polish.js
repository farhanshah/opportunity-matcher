(()=>{
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));

  const style=document.createElement('style');
  style.textContent=`
    .focusCard.exactTracked{border-color:#dce7b8;box-shadow:0 12px 30px rgba(64,78,25,.055)}
    .focusCard.exactTracked:before{background:linear-gradient(180deg,#d8ff69,#65d8b9)}
    .exactTrackBadge{display:inline-flex;align-items:center;gap:5px;margin-bottom:6px;padding:4px 7px;border-radius:999px;background:#f2f8df;border:1px solid #dce9b9;color:#587013;font-size:6.5px;font-weight:950;text-transform:uppercase;letter-spacing:.09em}
    .exactTrackContext{margin-top:9px;display:grid;gap:5px}
    .exactTrackLine{padding:7px 8px;border-radius:9px;background:#f8f9f5;border:1px solid #e7ebdd;font-size:7.5px;line-height:1.45;color:#69715f}
    .exactTrackLine b{color:#293117}
    .exactTrackActions{display:flex;gap:6px;align-items:center}
    .exactOfficial{border:1px solid #d7e4ad;background:#f4f9e6;color:#344414;border-radius:10px;padding:9px 11px;font-size:8px;font-weight:900;text-decoration:none;white-space:nowrap}
    .focusAction.exactAction{background:#151923;color:#fff;border-color:#151923}
    .focusAction.exactAction span,.focusAction.exactAction small{color:#aab1bd}
    .focusAction.exactAction b{color:#fff}
    @media(max-width:760px){.exactTrackActions{grid-column:1/-1}.exactOfficial{width:100%;justify-content:center;display:flex}}
  `;
  document.head.appendChild(style);

  function exactByTitle(){
    const map=new Map();
    for(const [id,t] of Object.entries(tracks||{})){
      const m=t?.exactVacancy;if(!m?.url)continue;
      map.set(norm(m.title),{id,t,m});
    }
    return map;
  }

  function nextExactAction(m,t){
    const r=norm(m?.readiness),b=norm(m?.badge);
    if(/check language/.test(r)||/check language/.test(b))return'Confirm the language requirement on the official vacancy.';
    if(/check nationality|check residence/.test(r)||/check nationality|check residence/.test(b))return'Confirm the nationality or residence rule on the official vacancy.';
    if(/check education|enrol/.test(r)||/check education|enrol/.test(b))return'Confirm the education or enrolment requirement on the official vacancy.';
    if(/check field/.test(r)||/check field/.test(b))return'Confirm the accepted academic disciplines on the official vacancy.';
    if(/key checks clear/.test(r)||/key checks clear/.test(b))return'Review the required documents and start application preparation.';
    const c=t?.checklist||{};
    if(!c.documents)return'Confirm required documents and start gathering evidence.';
    if(!c.statement)return'Draft or refine your statement / motivation response.';
    if(!c.references)return'Confirm referee and reference requirements.';
    return'Move this application to the next stage when ready.';
  }

  function packStatusTarget(card){
    const matches=[...card.querySelectorAll('*')].filter(el=>{
      if(el.closest('.focusAction,.focusTasks,.exactTrackActions'))return false;
      const txt=String(el.textContent||'').replace(/\s+/g,' ').trim();
      return /^Application pack:/i.test(txt)&&txt.length<320;
    });
    return matches.find(el=>![...el.children].some(ch=>/^Application pack:/i.test(String(ch.textContent||'').replace(/\s+/g,' ').trim())))||matches[0]||null;
  }

  function syncPackStatus(card,studio){
    if(!studio||studio.sourceMode!=='dedicatedPrepare')return;
    const status=packStatusTarget(card);if(!status)return;
    const docsDone=[studio.cvReady,studio.motReady,studio.writingReady,studio.pdfReady].filter(Boolean).length;
    const html=`<b>Application pack:</b> ${docsDone===4?'Documents ready':`${docsDone}/4 document gates ready`} · ${studio.providerReady?'Final provider check confirmed':'Provider re-check pending'}<br>${studio.verifyDone}/${studio.verifyTotal} official checks recorded`;
    if(status.innerHTML!==html)status.innerHTML=html;
    status.classList.remove('exactPackStatusV132');
    status.classList.add('exactPackStatusV133');
  }

  function decorate(){
    const map=exactByTitle();
    document.querySelectorAll('#tracker .focusCard').forEach(card=>{
      const title=norm(card.querySelector('.focusTitle')?.textContent||'');
      const row=map.get(title);if(!row)return;
      const {id,t,m}=row;card.classList.add('exactTracked');card.dataset.exactTrackId=id;
      const studio=window.OpportunityStudioTruth?.getState?.(t);

      const identity=card.querySelector('.focusIdentity > div:last-child');
      if(identity){
        let badge=identity.querySelector('.exactTrackBadge');
        if(!badge){badge=document.createElement('div');badge.className='exactTrackBadge';identity.insertBefore(badge,identity.firstChild)}
        if(badge.textContent!=='Exact live vacancy · tracked')badge.textContent='Exact live vacancy · tracked';
        let context=identity.querySelector('.exactTrackContext');
        if(!context){context=document.createElement('div');context.className='exactTrackContext';identity.appendChild(context)}
        if(!studio&&!context.children.length)context.innerHTML=`${m.why?`<div class="exactTrackLine"><b>Why it fits:</b> ${safe(m.why)}</div>`:''}${m.readiness?`<div class="exactTrackLine"><b>Before applying:</b> ${safe(m.readiness)}</div>`:''}`;
      }

      const action=card.querySelector('.focusAction');
      if(action){
        action.classList.add('exactAction');
        if(!studio){
          const b=action.querySelector('b'),s=action.querySelector('span'),copy=nextExactAction(m,t);
          if(b&&b.textContent!==copy)b.textContent=copy;
          if(s&&s.textContent!=='Do next · exact vacancy')s.textContent='Do next · exact vacancy';
        }
      }

      syncPackStatus(card,studio);

      const tasks=card.querySelector('.focusTasks');
      if(tasks){
        let wrap=tasks.querySelector('.exactTrackActions');
        const openAnalysis=tasks.querySelector('.focusOpen');
        if(!wrap){wrap=document.createElement('div');wrap.className='exactTrackActions';if(openAnalysis)openAnalysis.replaceWith(wrap);tasks.appendChild(wrap)}
        if(openAnalysis&&!wrap.contains(openAnalysis))wrap.appendChild(openAnalysis);
        if(!wrap.querySelector('.focusOpen')){const btn=document.createElement('button');btn.className='focusOpen';btn.textContent='Open analysis ↗';btn.onclick=()=>window.openDetail?.(id);wrap.appendChild(btn)}
        let link=wrap.querySelector('.exactOfficial');
        if(!link){link=document.createElement('a');link.className='exactOfficial';link.target='_blank';link.rel='noopener';wrap.appendChild(link)}
        if(link.href!==m.url)link.href=m.url;
        if(link.textContent!=='Official vacancy ↗')link.textContent='Official vacancy ↗';
      }
    });
  }

  const oldRender=window.renderTracker;
  if(typeof oldRender==='function'){
    const wrapped=()=>{const out=oldRender();setTimeout(decorate,0);return out};
    try{renderTracker=wrapped}catch{}window.renderTracker=wrapped;
  }
  const obs=new MutationObserver(()=>{clearTimeout(obs._t);obs._t=setTimeout(decorate,60)});
  obs.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:statechange',()=>setTimeout(decorate,30));
  setTimeout(decorate,180);
  window.OpportunityExactTrackerPolish={refresh:decorate};
})();