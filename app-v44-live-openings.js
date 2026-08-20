(()=>{
  const SUPPORTED=new Set(['INT-004','INT-005','INT-006','INT-013','INT-014','INT-018','INT-019','INT-021','INT-022','FEL-015']);
  const cache=new Map();
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v||'').toLowerCase();
  const css=document.createElement('style');
  css.textContent=`
    .liveOpenings{margin-top:14px;border:1px solid rgba(116,88,255,.16);border-radius:16px;background:linear-gradient(145deg,#f8f7ff,#fff);padding:15px}.liveOpeningsHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.liveOpeningsHead h3{margin:4px 0 4px;font-size:16px;letter-spacing:-.025em;color:#171b24}.liveOpeningsHead p{margin:0;color:#858d9a;font-size:9px;line-height:1.5;max-width:580px}.liveBadge{white-space:nowrap;border:1px solid #e3ddff;background:#f7f4ff;color:#6f55ef;border-radius:999px;padding:6px 9px;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.liveBadge.ok{border-color:#d7f1df;background:#f2fbf5;color:#1c8b4a}.liveOpeningList{display:grid;gap:8px;margin-top:12px}.liveOpeningCard{border:1px solid #e7e9ef;border-radius:13px;background:#fff;padding:12px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}.liveOpeningCard b{display:block;color:#1c2129;font-size:10px;line-height:1.35}.liveOpeningCard small{display:block;color:#9097a3;font-size:8px;margin-top:5px;line-height:1.45}.liveOpeningCard a,.liveBoardBtn{display:inline-flex;align-items:center;justify-content:center;height:31px;border-radius:9px;text-decoration:none;font-size:8px;font-weight:820;white-space:nowrap}.liveOpeningCard a{padding:0 10px;border:1px solid #e1e4ea;color:#222832;background:#fafbfc}.liveOpeningCard a:hover{border-color:#cfc8ff;color:#674bea}.liveBoardFallback{margin-top:12px;border:1px dashed #dfe2e9;border-radius:12px;padding:12px}.liveBoardFallback b{font-size:10px;color:#222832}.liveBoardFallback p{margin:4px 0 10px;color:#8a919d;font-size:8px;line-height:1.5}.liveBoardBtn{width:max-content;padding:0 12px;background:#181d27;color:#fff}.liveOpeningsFoot{margin-top:10px;padding-top:9px;border-top:1px solid #eaecf1;color:#969ca6;font-size:8px;line-height:1.45}.liveLoading{margin-top:12px;height:70px;border:1px solid #eceef2;border-radius:12px;background:linear-gradient(90deg,#f8f9fb,#f1f3f7,#f8f9fb);background-size:220% 100%;animation:livePulse 1.4s linear infinite}@keyframes livePulse{to{background-position:-220% 0}}@media(max-width:700px){.liveOpeningsHead,.liveOpeningCard{grid-template-columns:1fr;display:grid}.liveOpeningCard a{width:max-content}}
  `;
  document.head.appendChild(css);

  function needsOpening(o){
    if(!o?.Opportunity_ID||!SUPPORTED.has(o.Opportunity_ID))return false;
    if(/vacancy-specific|rolling/.test(norm(o.Status)))return true;
    return (o.Eligibility_Rules||[]).some(r=>/vacancy_specific|vacancy-specific|specific opening|assignment/.test(norm(`${r.code} ${r.label} ${r.source_note} ${JSON.stringify(r.value||{})}`)));
  }
  function fieldTerms(){
    const f=norm(window.OpportunityState?.getProfile?.().field||currentProfile?.field||'');
    if(/business|management/.test(f))return['business','management','operations','programme','program','project','partnership','finance','strategy','procurement','communications','marketing','administration','research','policy'];
    if(/computer|software|data|information technology|technology/.test(f))return['software','data','digital','technology','it ','ict','engineering','analytics','ai','cyber'];
    if(/econom/.test(f))return['econom','finance','policy','research','development','statistics'];
    if(/law|legal/.test(f))return['legal','law','policy','governance','compliance'];
    if(/communication|media|marketing/.test(f))return['communication','media','marketing','advocacy','content','digital','partnership'];
    return[];
  }
  function rank(openings){
    const terms=fieldTerms();return [...openings].map((x,i)=>({...x,_score:terms.reduce((n,t)=>n+(norm(x.title).includes(t)?1:0),0),_i:i})).sort((a,b)=>b._score-a._score||a._i-b._i);
  }
  function hostFor(o){
    const host=document.getElementById('detailInner');if(!host)return null;host.querySelectorAll('.liveOpenings').forEach(x=>x.remove());
    const section=document.createElement('section');section.className='liveOpenings';section.dataset.opp=o.Opportunity_ID;
    const evidence=host.querySelector('.adaptiveEvidence');if(evidence)evidence.insertAdjacentElement('afterend',section);else{const left=host.querySelector('.detailColumns>div:first-child');const first=left?.querySelector('.detailSection');if(first)first.insertAdjacentElement('afterend',section);else (left||host).appendChild(section)}
    return section;
  }
  function skeleton(section){section.innerHTML=`<div class="liveOpeningsHead"><div><div class="eyebrow" style="color:#6c54ee">Live openings · official source</div><h3>Move from programme-level to a real vacancy.</h3><p>Opportunity checks the provider’s official vacancy board and surfaces specific openings where they can be extracted safely.</p></div><span class="liveBadge">checking</span></div><div class="liveLoading"></div>`}
  function render(section,o,data){
    if(!document.body.contains(section)||section.dataset.opp!==o.Opportunity_ID)return;
    const openings=rank(Array.isArray(data?.openings)?data.openings:[]);const provider=data?.provider||o.Provider||'Provider';
    const list=openings.slice(0,6).map(x=>{const meta=[x.location,x.deadline?`deadline ${x.deadline}`:'',x._score>0?'profile-relevant title signal':''].filter(Boolean).join(' · ');return`<article class="liveOpeningCard"><div><b>${esc(x.title)}</b><small>${esc(meta||provider)}</small></div><a href="${esc(x.url)}" target="_blank" rel="noopener">Open vacancy ↗</a></article>`}).join('');
    const fallback=`<div class="liveBoardFallback"><b>${openings.length?'Want to inspect every opening?':'No opening could be safely extracted right now.'}</b><p>${esc(data?.notice||'The provider’s official vacancy board remains the source of truth.')}</p><a class="liveBoardBtn" href="${esc(data?.board_url||o.Application_URL||o.Official_Source_URL||'#')}" target="_blank" rel="noopener">Open ${esc(provider)} vacancies ↗</a></div>`;
    section.innerHTML=`<div class="liveOpeningsHead"><div><div class="eyebrow" style="color:#6c54ee">Live openings · official source</div><h3>${openings.length?`${openings.length} specific opening${openings.length===1?'':'s'} found.`:'Specific-opening check complete.'}</h3><p>These are vacancy-level leads, not automatic eligibility decisions. Open the posting before relying on nationality, field, language or location requirements.</p></div><span class="liveBadge ${openings.length?'ok':''}">${openings.length?`${openings.length} found`:'official board'}</span></div>${openings.length?`<div class="liveOpeningList">${list}</div>`:''}${fallback}<div class="liveOpeningsFoot">Checked ${data?.fetched_at?new Date(data.fetched_at).toLocaleString():'just now'} · Vacancy-level matching stays conservative until the individual posting’s requirements are captured.</div>`;
  }
  async function load(o,section){
    const cached=cache.get(o.Opportunity_ID);if(cached&&Date.now()-cached.at<300000){render(section,o,cached.data);return}
    try{const r=await fetch(`/api/live-openings?opportunity_id=${encodeURIComponent(o.Opportunity_ID)}&ts=${Date.now()}`,{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data?.error||`Opening check returned ${r.status}`);cache.set(o.Opportunity_ID,{at:Date.now(),data});render(section,o,data)}catch(e){render(section,o,{provider:o.Provider,board_url:o.Application_URL||o.Official_Source_URL,openings:[],notice:`Live extraction is unavailable right now (${e.message}). Use the official provider board.`})}
  }
  function mount(id){const o=(opps||[]).find(x=>x.Opportunity_ID===id);if(!o||!needsOpening(o))return;const section=hostFor(o);if(!section)return;skeleton(section);load(o,section)}
  const previous=window.openDetail;if(typeof previous==='function'){
    const wrapped=function(id){const r=previous.apply(this,arguments);setTimeout(()=>mount(id),0);return r};wrapped.__liveOpeningsV44=true;window.openDetail=wrapped;try{openDetail=wrapped}catch{}
  }
  window.OpportunityLiveOpenings={supported:[...SUPPORTED],refresh:id=>{cache.delete(id);mount(id)}};
})();
