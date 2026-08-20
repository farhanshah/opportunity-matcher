(()=>{
  const IDS=['FEL-015','INT-012','INT-016','INT-011'];
  const extra={at:0,items:[],loading:false};
  const original=window.OpportunityBestLive;
  if(!original?.status)return;
  const baseStatus=original.status.bind(original);
  const baseRefresh=typeof original.refresh==='function'?original.refresh.bind(original):null;
  async function fetchOne(id){
    try{
      const r=await fetch(`/api/specific-openings?opportunity_id=${encodeURIComponent(id)}&ts=${Date.now()}`,{cache:'no-store'}),d=await r.json();
      if(!r.ok)return[];
      const provider=d.provider||id;
      return (Array.isArray(d.openings)?d.openings:[]).filter(x=>x?.status_verified===true&&x?.verification_level==='exact').map(x=>({...x,programmeId:id,provider,_score:0,_hits:[]}));
    }catch{return[]}
  }
  async function load(force=false){
    if(extra.loading)return;
    if(!force&&extra.at&&Date.now()-extra.at<300000)return;
    extra.loading=true;
    try{
      const rows=(await Promise.all(IDS.map(fetchOne))).flat();
      const seen=new Set();
      extra.items=rows.filter(x=>{const k=`${x.programmeId}|${x.url}`;if(seen.has(k))return false;seen.add(k);return true});
      extra.at=Date.now();
      window.dispatchEvent(new CustomEvent('opportunity:verifiedfeedchange',{detail:{specific_exact:extra.items.length}}));
    }finally{extra.loading=false}
  }
  function status(){
    const base=baseStatus()||{},baseItems=Array.isArray(base.items)?base.items:[],merged=[],seen=new Set();
    for(const x of [...baseItems,...extra.items]){const k=`${x?.programmeId||''}|${x?.url||''}`;if(!x?.url||seen.has(k))continue;seen.add(k);merged.push(x)}
    return{...base,items:merged,specific_exact_items:extra.items.length,specific_bridge_at:extra.at};
  }
  function refresh(){
    baseRefresh?.();
    extra.at=0;extra.items=[];
    setTimeout(()=>load(true),120);
  }
  window.OpportunityBestLive={...original,status,refresh};
  window.OpportunitySpecificFeedBridge={refresh:()=>load(true),status:()=>({at:extra.at,items:[...extra.items]})};
  setTimeout(()=>load(true),650);
  window.addEventListener('focus',()=>load(false));
})();
