(()=>{
  const ROUTES=[
    {id:'FEL-015',name:'WIPO Fellowship',mode:'specific'},
    {id:'INT-005',name:'UNICEF Internship',mode:'live'},
    {id:'INT-006',name:'UNDP Internships',mode:'live'},
    {id:'INT-011',name:'WTO Internship',mode:'specific'},
    {id:'INT-012',name:'FAO Internship',mode:'specific'},
    {id:'INT-013',name:'WFP Internship',mode:'live'},
    {id:'INT-016',name:'ADB Internship',mode:'specific'},
    {id:'INT-019',name:'UNOPS Internships',mode:'live'}
  ];
  const state={at:0,loading:false,rows:[]};
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const css=document.createElement('style');css.textContent=`
    .specificWorkbench{margin:12px 0;border:1px solid rgba(20,28,45,.08);border-radius:18px;background:#fff;padding:18px}
    .specificWorkbenchHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.specificWorkbenchHead h3{font-size:17px;margin:4px 0;color:#171b24;letter-spacing:-.025em}.specificWorkbenchHead p{font-size:9px;line-height:1.5;color:#858c99;margin:0;max-width:720px}.specificWorkbenchMeta{font-size:8px;color:#6f58ee;font-weight:800;white-space:nowrap}
    .specificWorkbenchGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:13px}.specificRoute{border:1px solid #e9ebf0;border-radius:12px;background:#fbfcfd;padding:11px;min-height:118px;display:flex;flex-direction:column}.specificRoute.exact{background:#f8fff0;border-color:#dcefb9}.specificRoute.roster{background:#faf8ff;border-color:#e4def9}.specificRoute h4{font-size:10px;margin:6px 0 4px;color:#20252e;line-height:1.3}.specificRoute p{font-size:7.5px;color:#8a919d;margin:0;line-height:1.45}.specificBadge{font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;font-weight:850;color:#6f58ee}.specificRoute.exact .specificBadge{color:#56730a}.specificRoute a{margin-top:auto;padding-top:8px;font-size:7.5px;font-weight:800;color:#171b24;text-decoration:none}.specificWorkFoot{margin-top:10px;padding-top:9px;border-top:1px solid #eceef2;font-size:8px;color:#858c99;line-height:1.45}
    @media(max-width:1050px){.specificWorkbenchGrid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.specificWorkbenchGrid{grid-template-columns:1fr}.specificWorkbenchHead{display:grid}}
  `;document.head.appendChild(css);
  async function fetchRoute(r){
    const endpoint=r.mode==='specific'?'/api/specific-openings':'/api/live-openings';
    try{const x=await fetch(`${endpoint}?opportunity_id=${encodeURIComponent(r.id)}&ts=${Date.now()}`,{cache:'no-store'}),d=await x.json();if(!x.ok)throw new Error(d?.error||String(x.status));const openings=Array.isArray(d.openings)?d.openings:[],exact=openings.filter(o=>o?.status_verified===true&&o?.verification_level==='exact');return{...r,ok:true,data:d,exact,first:exact[0]||null}}catch(e){return{...r,ok:false,error:e?.message||'unreadable',data:null,exact:[],first:null}}
  }
  function authoritative(){
    try{
      const s=window.OpportunityBestLive?.status?.();if(!s?.at||!Array.isArray(s.items))return null;
      const byId={};for(const item of s.items){const id=String(item?.programmeId||'');if(!id||item?.status_verified!==true||item?.verification_level!=='exact')continue;(byId[id]??=[]).push(item)}
      return byId;
    }catch{return null}
  }
  function effective(r,auth){
    if(r.mode!=='live'||!auth)return r;
    const exact=Array.isArray(auth[r.id])?auth[r.id]:[];
    return{...r,ok:true,exact,first:exact[0]||null,authoritative:true};
  }
  async function load(force=false){if(state.loading)return;if(!force&&state.at&&Date.now()-state.at<300000)return render();state.loading=true;try{const rows=[];let i=0;async function worker(){while(i<ROUTES.length){rows.push(await fetchRoute(ROUTES[i++]))}}await Promise.all(Array.from({length:4},worker));rows.sort((a,b)=>ROUTES.findIndex(x=>x.id===a.id)-ROUTES.findIndex(x=>x.id===b.id));state.rows=rows;state.at=Date.now();render()}finally{state.loading=false}}
  function status(r){if(!r.ok)return{cls:'',badge:'Unreadable',copy:'Official source could not be read safely; nothing is promoted.'};if(r.exact.length)return{cls:'exact',badge:`${r.exact.length} exact live`,copy:r.authoritative?'Exact vacancies currently survive the authoritative live-vacancy feed and are safe to evaluate next.':'An individual official posting survived exact status verification.'};if(r.data?.adapter_state==='roster')return{cls:'roster',badge:'Roster route',copy:'Ongoing roster; specific notices are promoted only when an individual vacancy exists.'};const candidates=Number(r.data?.candidate_count||0);if(candidates)return{cls:'',badge:`${candidates} candidate${candidates===1?'':'s'}`,copy:'Board candidates exist, but none currently survive exact verification.'};return{cls:'',badge:'No exact opening',copy:r.authoritative?'No vacancy from this route currently survives the authoritative exact-provider feed.':'Official route is connected; no individual opening is safe to rank right now.'}}
  function card(r){const s=status(r),link=r.first?.url||r.data?.board_url||'';return`<article class="specificRoute ${s.cls}" data-route-id="${esc(r.id)}"><span class="specificBadge">${esc(s.badge)}</span><h4>${esc(r.name)}</h4><p>${esc(s.copy)}</p>${link?`<a href="${esc(link)}" target="_blank" rel="noopener">${r.first?'Open exact posting':'Open official route'} ↗</a>`:''}</article>`}
  function render(){const dash=document.querySelector('#dashboard .dashPremium');if(!dash)return;dash.querySelectorAll('.specificWorkbench').forEach(x=>x.remove());const auth=authoritative(),rows=state.rows.map(r=>effective(r,auth));const exact=rows.reduce((n,r)=>n+r.exact.length,0),connected=rows.filter(r=>r.ok).length;const html=`<section class="specificWorkbench"><div class="specificWorkbenchHead"><div><div class="matchIntelEy" style="color:#6c54ee">Specific opening coverage</div><h3>Turn 8 umbrella programmes into vacancy-level routes.</h3><p>Each provider is checked separately. Exact individual postings can move into live ranking; board-only, roster-only and unreadable results remain fail-closed.</p></div><div class="specificWorkbenchMeta">${connected}/8 routes connected · ${exact} exact live</div></div><div class="specificWorkbenchGrid">${rows.map(card).join('')}</div><div class="specificWorkFoot">This layer does not mark an umbrella programme as eligible. It only tells Opportunity whether a real, current provider posting exists to evaluate next.</div></section>`;const live=dash.querySelector('.deepLive')||dash.querySelector('.bestLiveFeed')||dash.querySelector('.exactFeedAuthorityEmpty');if(live)live.insertAdjacentHTML('beforebegin',html);else{const rw=dash.querySelector('.routeWorkQueue');if(rw)rw.insertAdjacentHTML('afterend',html)}}
  const timer=setInterval(()=>{if(!document.getElementById('dashboard')?.classList.contains('hide'))render()},1500);
  window.addEventListener('focus',()=>load(false));window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(render,50));setTimeout(()=>load(true),450);
  window.OpportunitySpecificOpeningCoverage={refresh:()=>load(true),status:()=>({at:state.at,rows:state.rows.map(r=>({id:r.id,exact:r.exact.length,ok:r.ok,adapter:r.data?.adapter_state||''}))}),stop:()=>clearInterval(timer)};
})();
