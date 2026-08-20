(()=>{
  const ID='INT-005',CACHE='oppUnicefExactFeedV2',TTL=15*60*1000;
  const now=()=>Date.now(),today=()=>new Date().toISOString().slice(0,10);
  const validItems=items=>(Array.isArray(items)?items:[]).filter(x=>x?.url&&x?.status_verified===true&&x?.verification_level==='exact'&&(!x.deadline||x.deadline>=today()));
  function readCache(){try{const c=JSON.parse(localStorage.getItem(CACHE)||'null');if(!c||now()-Number(c.at||0)>TTL)return[];return validItems(c.items)}catch{return[]}}
  function writeCache(items){try{localStorage.setItem(CACHE,JSON.stringify({at:now(),items:validItems(items)}))}catch{}}
  const state={at:0,items:readCache(),loading:false,degraded:false};
  const original=window.OpportunityBestLive;if(!original?.status)return;
  const baseStatus=original.status.bind(original),baseRefresh=typeof original.refresh==='function'?original.refresh.bind(original):null;
  async function load(force=false){
    if(state.loading)return;if(!force&&state.at&&now()-state.at<180000)return;state.loading=true;
    try{
      const r=await fetch(`/api/unicef-openings?ts=${now()}`,{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d?.error||String(r.status));
      const rows=validItems(Array.isArray(d.openings)?d.openings:[]).map(x=>({...x,programmeId:ID,provider:'UNICEF',_score:0,_hits:[]}));
      const seen=new Set(),fresh=rows.filter(x=>{const k=`${ID}|${x.url}`;if(seen.has(k))return false;seen.add(k);return true});
      if(fresh.length){state.items=fresh;writeCache(fresh);state.degraded=false}
      else{
        const cached=readCache();
        if(cached.length&&(d?.verification_health==='degraded'||d?.fetch_error||Number(d?.candidate_count||0)>0)){state.items=cached.map(x=>({...x,programmeId:ID,provider:'UNICEF',_score:0,_hits:[]}));state.degraded=true}
        else{state.items=[];state.degraded=false;writeCache([])}
      }
      state.at=now();window.dispatchEvent(new CustomEvent('opportunity:verifiedfeedchange',{detail:{unicef_exact:state.items.length,unicef_degraded:state.degraded}}));
    }catch(e){const cached=readCache();if(cached.length){state.items=cached.map(x=>({...x,programmeId:ID,provider:'UNICEF',_score:0,_hits:[]}));state.degraded=true}else state.items=[];state.at=now();console.warn('UNICEF exact bridge used resilience path',e)}finally{state.loading=false}
  }
  function status(){const base=baseStatus()||{},baseItems=(Array.isArray(base.items)?base.items:[]).filter(x=>String(x?.programmeId||'')!==ID),merged=[],seen=new Set();for(const x of [...baseItems,...state.items]){const k=`${x?.programmeId||''}|${x?.url||''}`;if(!x?.url||seen.has(k))continue;seen.add(k);merged.push(x)}return{...base,items:merged,unicef_exact_items:state.items.length,unicef_bridge_at:state.at,unicef_authority:'dedicated-exact-resilient-adapter',unicef_degraded:state.degraded}}
  function refresh(){baseRefresh?.();state.at=0;setTimeout(()=>load(true),160)}
  window.OpportunityBestLive={...original,status,refresh};window.OpportunityUnicefExactBridge={refresh:()=>load(true),status:()=>({at:state.at,items:[...state.items],authority:'dedicated-exact-resilient-adapter',degraded:state.degraded})};
  if(state.items.length)setTimeout(()=>window.dispatchEvent(new CustomEvent('opportunity:verifiedfeedchange',{detail:{unicef_exact:state.items.length,cache:true}})),250);
  setTimeout(()=>load(true),650);window.addEventListener('focus',()=>load(false));
})();
