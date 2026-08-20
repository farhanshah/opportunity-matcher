(()=>{
  const PROGRAMMES=['INT-004','INT-005','INT-006','INT-013','INT-014','INT-018','INT-019','INT-021','INT-022','FEL-015'];
  const cache={at:0,items:[],boards:0,failed:0,excluded:0};
  let loading=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-');
  const profile=()=>{try{return window.OpportunityState?.getProfile?.()||currentProfile||{}}catch{return{}}};
  const css=document.createElement('style');
  css.textContent=`
    .bestLiveFeed{margin-top:12px;border:1px solid rgba(20,28,45,.08);border-radius:18px;background:linear-gradient(145deg,#101622,#191b31 64%,#242044);color:#fff;padding:19px;overflow:hidden;position:relative}
    .bestLiveFeed:after{content:"";position:absolute;width:310px;height:310px;border-radius:50%;right:-135px;top:-165px;border:28px solid rgba(123,93,255,.13);box-shadow:0 0 0 28px rgba(216,255,103,.035);pointer-events:none}
    .bestLiveHead{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;position:relative;z-index:1}.bestLiveHead h3{font-size:22px;letter-spacing:-.035em;margin:5px 0 5px}.bestLiveHead p{margin:0;color:#9da5b5;font-size:9px;line-height:1.55;max-width:650px}.bestLiveMeta{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.bestLiveMeta span{border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:6px 9px;color:#bcc3d0;background:rgba(255,255,255,.035);font-size:8px;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap}.bestLiveGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px;position:relative;z-index:1}.bestLiveCard{border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.055);padding:13px;display:flex;flex-direction:column;min-height:164px}.bestLiveTop{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.bestLiveProvider{font-size:8px;color:#d7ff69;text-transform:uppercase;letter-spacing:.09em;font-weight:850}.bestLiveRank{font-size:8px;border:1px solid rgba(216,255,105,.2);background:rgba(216,255,105,.075);color:#dfff87;border-radius:999px;padding:4px 7px;white-space:nowrap}.bestLiveCard h4{font-size:11px;line-height:1.38;margin:10px 0 6px;color:#fff}.bestLiveCard p{font-size:8px;line-height:1.5;color:#9da5b5;margin:0}.bestLiveTags{display:flex;gap:5px;flex-wrap:wrap;margin:9px 0}.bestLiveTags span{font-size:7px;border-radius:999px;padding:4px 6px;background:rgba(255,255,255,.055);color:#c7ccd6;border:1px solid rgba(255,255,255,.06)}.bestLiveActions{display:flex;gap:6px;margin-top:auto;padding-top:10px}.bestLiveActions a,.bestLiveActions button{height:31px;border-radius:9px;padding:0 9px;font-size:8px;font-weight:830;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer}.bestLiveActions a{background:#d9ff67;color:#11150a;border:0}.bestLiveActions button{background:rgba(255,255,255,.07);color:#fff;border:1px solid rgba(255,255,255,.11)}.bestLiveActions button:hover{background:rgba(255,255,255,.12)}.bestLiveFoot{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:12px;padding-top:11px;border-top:1px solid rgba(255,255,255,.08);position:relative;z-index:1}.bestLiveFoot p{margin:0;color:#7f8797;font-size:8px;line-height:1.45}.bestLiveRefresh{border:0;background:none;color:#cfd4dd;font-size:8px;cursor:pointer}.bestLiveEmpty{margin-top:15px;border:1px dashed rgba(255,255,255,.12);border-radius:13px;padding:18px;position:relative;z-index:1}.bestLiveEmpty b{font-size:11px}.bestLiveEmpty p{font-size:8px;color:#929aaa;line-height:1.5;margin:5px 0 0}.bestLiveLoading{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}.bestLiveSkeleton{height:164px;border-radius:14px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.085),rgba(255,255,255,.04));background-size:220% 100%;animation:bestLivePulse 1.4s linear infinite}@keyframes bestLivePulse{to{background-position:-220% 0}}@media(max-width:1050px){.bestLiveGrid,.bestLiveLoading{grid-template-columns:1fr 1fr}}@media(max-width:650px){.bestLiveHead,.bestLiveFoot{display:grid}.bestLiveMeta{justify-content:flex-start}.bestLiveGrid,.bestLiveLoading{grid-template-columns:1fr}}
  `;document.head.appendChild(css);

  function terms(field){const f=norm(field);
    if(/business|management/.test(f))return['business','management','operations','programme','program','project','partnership','finance','strategy','procurement','communications','communication','marketing','administration','logistics','policy','research','planning'];
    if(/computer|software|data|information technology|technology/.test(f))return['software','data','digital','technology','ict','engineering','analytics','artificial intelligence','cyber'];
    if(/econom/.test(f))return['econom','finance','policy','research','development','statistics'];
    if(/law|legal/.test(f))return['legal','law','policy','governance','compliance'];
    if(/communication|media|marketing/.test(f))return['communication','media','marketing','advocacy','content','digital','partnership'];
    if(/international relations|development/.test(f))return['development','programme','program','policy','partnership','international','humanitarian','research'];
    return f?[f.split('&')[0].trim()]:[];
  }
  function obviousRestriction(x,p){
    const t=norm(`${x.title||''} ${x.location||''}`),nat=norm(p.nat),res=norm(p.residence);
    const national=/\bnational(?:s|ity)?\b|\blocal\s+(?:intern|candidate|applicant)|citizens?\s+only|nationals?\s+only/.test(t);
    if(!national)return false;
    if(nat&&t.includes(nat))return false;if(res&&t.includes(res))return false;
    return true;
  }
  function score(x,p){
    const hay=norm(`${x.title||''} ${x.location||''}`),ts=terms(p.field);let n=0;const hits=[];
    for(const t of ts){if(t&&hay.includes(t)){n+=3;hits.push(t)}}
    if(/intern|fellow/.test(hay))n+=1;
    if(/project|programme|program|operations|logistics|procurement|communication|marketing|finance|strategy|policy|research/.test(hay))n+=1;
    if(norm(p.nat)&&hay.includes(norm(p.nat)))n+=8;if(norm(p.residence)&&hay.includes(norm(p.residence)))n+=4;
    if(x.deadline){const days=Math.ceil((new Date(x.deadline+'T23:59:59')-Date.now())/86400000);if(days>=2&&days<=45)n+=2;if(days<2)n-=2}
    return{score:n,hits:[...new Set(hits)].slice(0,4)};
  }
  async function fetchOne(id){
    try{const r=await fetch(`/api/live-openings?opportunity_id=${encodeURIComponent(id)}&ts=${Date.now()}`,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d?.error||String(r.status));return{id,data:d,error:null}}catch(e){return{id,data:null,error:e}}
  }
  async function pool(ids,limit=4){
    const out=[];let i=0;async function worker(){while(i<ids.length){const id=ids[i++];out.push(await fetchOne(id))}}await Promise.all(Array.from({length:Math.min(limit,ids.length)},worker));return out;
  }
  async function load(force=false){
    if(loading)return;if(!force&&cache.items.length&&Date.now()-cache.at<300000){render();return}loading=true;renderLoading();
    const p=profile();try{
      const results=await pool(PROGRAMMES,4);let rows=[],boards=0,failed=0,excluded=0;
      for(const r of results){if(r.error||!r.data){failed++;continue}boards++;const provider=r.data.provider||r.id;for(const x of (r.data.openings||[])){if(obviousRestriction(x,p)){excluded++;continue}const s=score(x,p);rows.push({...x,programmeId:r.id,provider,_score:s.score,_hits:s.hits})}}
      rows.sort((a,b)=>b._score-a._score||(a.deadline||'9999').localeCompare(b.deadline||'9999'));
      cache.at=Date.now();cache.items=rows.slice(0,9);cache.boards=boards;cache.failed=failed;cache.excluded=excluded;render();
    }finally{loading=false}
  }
  function programmeName(id){const o=(opps||[]).find(x=>x.Opportunity_ID===id);return o?.Opportunity_Name||id}
  function card(x,i){
    const meta=[x.location||'',x.deadline?`Deadline ${x.deadline}`:''].filter(Boolean).join(' · ');const tags=[];
    if(x._hits?.length)tags.push(`Matches ${x._hits.slice(0,2).join(' + ')}`);if(x.deadline)tags.push('Live deadline');tags.push('Official source');
    return `<article class="bestLiveCard"><div class="bestLiveTop"><span class="bestLiveProvider">${esc(x.provider)}</span><span class="bestLiveRank">#${i+1} lead</span></div><h4>${esc(x.title)}</h4><p>${esc(meta||programmeName(x.programmeId))}</p><div class="bestLiveTags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="bestLiveActions"><a href="${esc(x.url)}" target="_blank" rel="noopener">Open vacancy ↗</a><button type="button" onclick="openDetail('${esc(x.programmeId)}')">Programme analysis</button></div></article>`;
  }
  function markup(){
    const items=cache.items.slice(0,6);const excluded=cache.excluded?`${cache.excluded} obvious local/national mismatch${cache.excluded===1?'':'es'} filtered`:'';
    return `<section class="bestLiveFeed"><div class="bestLiveHead"><div><div class="matchIntelEy" style="color:#d9ff67">Live vacancy intelligence</div><h3>Best live openings for your Passport.</h3><p>Opportunity scans supported official provider boards, removes obvious national/local mismatches, then ranks the remaining vacancy leads by your saved field and deadline signals. This is prioritisation, not an eligibility verdict.</p></div><div class="bestLiveMeta"><span>${cache.boards} boards checked</span><span>${items.length} shown</span>${excluded?`<span>${esc(excluded)}</span>`:''}</div></div>${items.length?`<div class="bestLiveGrid">${items.map(card).join('')}</div>`:`<div class="bestLiveEmpty"><b>No unblocked live vacancy lead surfaced from the supported boards right now.</b><p>This does not mean there are no openings. Some official boards may be dynamic or temporarily unreadable; programme analysis still links to each provider’s source-of-truth vacancy page.</p></div>`}<div class="bestLiveFoot"><p>Ranked from official-board extraction only. Use each vacancy’s Check fit analysis before treating it as suitable.</p><button class="bestLiveRefresh" onclick="window.OpportunityBestLive.refresh()">Refresh live boards ↻</button></div></section>`;
  }
  function render(){const dash=document.querySelector('#dashboard .dashPremium');if(!dash)return;dash.querySelectorAll('.bestLiveFeed').forEach(x=>x.remove());const anchor=dash.querySelector('.matchIntelMount')||dash.querySelector('.matchIntel');if(anchor)anchor.insertAdjacentHTML('afterend',markup());else dash.insertAdjacentHTML('afterbegin',markup())}
  function renderLoading(){const dash=document.querySelector('#dashboard .dashPremium');if(!dash)return;dash.querySelectorAll('.bestLiveFeed').forEach(x=>x.remove());const html=`<section class="bestLiveFeed"><div class="bestLiveHead"><div><div class="matchIntelEy" style="color:#d9ff67">Live vacancy intelligence</div><h3>Finding the best current openings…</h3><p>Checking official provider boards in parallel and filtering obvious local-only vacancies before ranking.</p></div><div class="bestLiveMeta"><span>live scan</span></div></div><div class="bestLiveLoading"><div class="bestLiveSkeleton"></div><div class="bestLiveSkeleton"></div><div class="bestLiveSkeleton"></div></div></section>`;const anchor=dash.querySelector('.matchIntelMount')||dash.querySelector('.matchIntel');if(anchor)anchor.insertAdjacentHTML('afterend',html);else dash.insertAdjacentHTML('afterbegin',html)}
  function mount(){const dash=document.querySelector('#dashboard .dashPremium');if(!dash)return;load(false)}
  const prev=window.renderDashboard||renderDashboard;if(typeof prev==='function'){const wrapped=function(){const r=prev.apply(this,arguments);setTimeout(mount,0);return r};window.renderDashboard=wrapped;try{renderDashboard=wrapped}catch{}}
  const oldSet=window.setView;if(typeof oldSet==='function'){const wrapped=function(v,...args){const r=oldSet(v,...args);if(v==='dashboard')setTimeout(mount,0);return r};window.setView=wrapped;try{setView=wrapped}catch{}document.querySelectorAll('.navbtn[data-v]').forEach(btn=>{btn.onclick=()=>wrapped(btn.dataset.v)})}
  window.OpportunityBestLive={refresh:()=>{cache.at=0;cache.items=[];load(true)},status:()=>({...cache,items:[...cache.items]})};
  try{if(!document.getElementById('dashboard')?.classList.contains('hide'))mount()}catch(e){console.warn('Best live openings mount skipped',e)}
})();
