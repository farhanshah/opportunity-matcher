(()=>{
  const ID='INT-005',CACHE='oppUnicefExactFeedV2',TTL=15*60*1000;
  const now=()=>Date.now(),today=()=>new Date().toISOString().slice(0,10);
  const genericTitle=t=>/^(?:current vacancies|current vacancy|job search|careers?|vacancies|internships?|job opportunities)$/i.test(String(t||'').trim());
  function titleFromUrl(url){
    try{
      const u=new URL(url),m=u.pathname.match(/\/job\/\d{5,}\/([^/?#]+)/i);if(!m)return'';
      let s=decodeURIComponent(m[1]).replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
      if(!s)return'';
      s=s.replace(/\breq(?:uest)?\s*no\s*\d+\b/ig,'').replace(/\s+/g,' ').trim();
      return s.charAt(0).toUpperCase()+s.slice(1);
    }catch{return''}
  }
  const normalizeItem=x=>{const t=String(x?.title||'').trim();return genericTitle(t)?{...x,title:titleFromUrl(x?.url)||t}:x};
  const validItems=items=>(Array.isArray(items)?items:[]).map(normalizeItem).filter(x=>x?.url&&x?.status_verified===true&&x?.verification_level==='exact'&&(!x.deadline||x.deadline>=today()));
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
      const degraded=Boolean(d?.verification_health==='degraded'||d?.fetch_error);
      if(fresh.length){state.items=fresh;writeCache(fresh);state.degraded=false}
      else{
        const cached=readCache();
        if(degraded){
          state.items=cached.map(x=>({...x,programmeId:ID,provider:'UNICEF',_score:0,_hits:[]}));
          state.degraded=true;
        }else{
          state.items=[];state.degraded=false;writeCache([]);
        }
      }
      state.at=now();window.dispatchEvent(new CustomEvent('opportunity:verifiedfeedchange',{detail:{unicef_exact:state.items.length,unicef_degraded:state.degraded}}));
    }catch(e){
      const cached=readCache();state.items=cached.map(x=>({...x,programmeId:ID,provider:'UNICEF',_score:0,_hits:[]}));state.degraded=true;state.at=now();
      window.dispatchEvent(new CustomEvent('opportunity:verifiedfeedchange',{detail:{unicef_exact:state.items.length,unicef_degraded:true}}));
      console.warn('UNICEF exact bridge used resilience path',e);
    }finally{state.loading=false}
  }
  function status(){const base=baseStatus()||{},baseItems=(Array.isArray(base.items)?base.items:[]).filter(x=>String(x?.programmeId||'')!==ID),merged=[],seen=new Set();for(const x of [...baseItems,...state.items]){const k=`${x?.programmeId||''}|${x?.url||''}`;if(!x?.url||seen.has(k))continue;seen.add(k);merged.push(normalizeItem(x))}return{...base,items:merged,unicef_exact_items:state.items.length,unicef_bridge_at:state.at,unicef_authority:'dedicated-exact-resilient-adapter',unicef_degraded:state.degraded}}
  function refresh(){baseRefresh?.();state.at=0;setTimeout(()=>load(true),160)}
  window.OpportunityBestLive={...original,status,refresh};window.OpportunityUnicefExactBridge={refresh:()=>load(true),status:()=>({at:state.at,items:[...state.items],authority:'dedicated-exact-resilient-adapter',degraded:state.degraded})};
  if(state.items.length)setTimeout(()=>window.dispatchEvent(new CustomEvent('opportunity:verifiedfeedchange',{detail:{unicef_exact:state.items.length,cache:true}})),250);
  setTimeout(()=>load(true),650);window.addEventListener('focus',()=>load(false));
})();