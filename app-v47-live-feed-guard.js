(()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let started=false;
  const css=document.createElement('style');
  css.textContent=`
    .bestLiveGuard{margin-top:12px;border:1px solid rgba(20,28,45,.08);border-radius:18px;background:linear-gradient(145deg,#101622,#191b31 64%,#242044);color:#fff;padding:19px;overflow:hidden;position:relative}
    .bestLiveGuard h3{margin:5px 0 5px;font-size:22px;letter-spacing:-.035em}.bestLiveGuard p{margin:0;color:#9da5b5;font-size:9px;line-height:1.55}.bestLiveGuardMeta{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.bestLiveGuardMeta span{border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:6px 9px;color:#bcc3d0;background:rgba(255,255,255,.035);font-size:8px;text-transform:uppercase;letter-spacing:.07em}.bestLiveGuardGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:15px}.bestLiveGuardCard{border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.055);padding:12px}.bestLiveGuardCard b{display:block;font-size:10px;line-height:1.4}.bestLiveGuardCard small{display:block;color:#98a0af;font-size:8px;line-height:1.45;margin:6px 0}.bestLiveGuardCard a{display:inline-flex;height:29px;align-items:center;border-radius:8px;padding:0 9px;background:#d9ff67;color:#11150a;text-decoration:none;font-size:8px;font-weight:850}.bestLiveGuardPulse{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:15px}.bestLiveGuardPulse i{height:128px;border-radius:14px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.085),rgba(255,255,255,.04));background-size:220% 100%;animation:guardPulse 1.4s linear infinite}@keyframes guardPulse{to{background-position:-220% 0}}@media(max-width:900px){.bestLiveGuardGrid,.bestLiveGuardPulse{grid-template-columns:1fr 1fr}}@media(max-width:620px){.bestLiveGuardGrid,.bestLiveGuardPulse{grid-template-columns:1fr}}
  `;document.head.appendChild(css);
  const dash=()=>document.querySelector('#dashboard .dashPremium');
  const visible=()=>{const d=document.getElementById('dashboard');return !!d&&!d.classList.contains('hide')};
  function anchor(){const d=dash();return d&&(d.querySelector('.matchIntelMount')||d.querySelector('.matchIntel')||d.querySelector('.dashHero'))}
  function remove(){dash()?.querySelectorAll('.bestLiveGuard').forEach(x=>x.remove())}
  function status(){try{return window.OpportunityBestLive?.status?.()||null}catch{return null}}
  function cards(items){return items.slice(0,6).map((x,i)=>`<article class="bestLiveGuardCard"><b>#${i+1} · ${esc(x.provider||'Provider')} — ${esc(x.title||'Live opening')}</b><small>${esc([x.location,x.deadline?`Deadline ${x.deadline}`:''].filter(Boolean).join(' · ')||'Official vacancy lead')}</small><a href="${esc(x.url||'#')}" target="_blank" rel="noopener">Open vacancy ↗</a></article>`).join('')}
  function render(){
    const d=dash();if(!d||!visible()){remove();return}
    if(d.querySelector('.bestLiveFeed')){remove();return}
    const a=anchor();if(!a)return;
    let g=d.querySelector('.bestLiveGuard');if(!g){g=document.createElement('section');g.className='bestLiveGuard';a.insertAdjacentElement('afterend',g)}
    const s=status();
    if(s?.at){const items=Array.isArray(s.items)?s.items:[];g.innerHTML=`<div class="matchIntelEy" style="color:#d9ff67">Live vacancy intelligence</div><h3>Best live openings for your Passport.</h3><p>The live-board scan finished. This fallback keeps results visible even if another Dashboard refresh happens while the main feed is mounting.</p><div class="bestLiveGuardMeta"><span>${Number(s.boards||0)} boards checked</span><span>${items.length} leads cached</span>${Number(s.excluded||0)?`<span>${Number(s.excluded)} local/national mismatches filtered</span>`:''}</div>${items.length?`<div class="bestLiveGuardGrid">${cards(items)}</div>`:`<p style="margin-top:14px">No unblocked lead was safely extracted in this scan. Programme analysis still links to each official provider board.</p>`}`;return}
    g.innerHTML=`<div class="matchIntelEy" style="color:#d9ff67">Live vacancy intelligence</div><h3>Finding the best current openings…</h3><p>Checking supported official provider boards. This can take a little longer because several boards are fetched in parallel and some providers respond slowly.</p><div class="bestLiveGuardMeta"><span>10 supported boards</span><span>official sources only</span></div><div class="bestLiveGuardPulse"><i></i><i></i><i></i></div>`;
    if(!started&&window.OpportunityBestLive?.refresh){started=true;setTimeout(()=>{try{window.OpportunityBestLive.refresh()}catch{}},100)}
  }
  let timer=null;const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,80)};
  const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('focus',schedule);window.addEventListener('opportunity:statechange',schedule);
  setInterval(render,1200);setTimeout(render,0);
})();
