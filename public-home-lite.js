/* Lightweight public-home statistics.
   Full eligibility and account code is loaded separately on user intent.
   Never guess dates, availability, publisher counts or eligibility. */
(()=>{
  'use strict';
  const get=id=>document.getElementById(id);
  const initial=(id,value)=>{
    const element=get(id);
    if(element&&['…','—',''].includes(element.textContent.trim()))element.textContent=value;
  };
  const count=v=>{
    if(!['string','number'].includes(typeof v)||String(v).trim()==='')return null;
    const n=Number(v);
    return Number.isSafeInteger(n)&&n>=0?String(n):null;
  };
  async function json(url){
    const response=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw Error('Public endpoint unavailable');
    return response.json();
  }
  async function health(){
    try{
      const data=await json('/api/health');
      if(data?.ok!==true)throw Error('Health unavailable');
      const opportunities=count(data.opportunities),sources=count(data.monitored_sources);
      if(opportunities!==null){initial('statOpps',opportunities);initial('engOpps',opportunities)}
      if(sources!==null){initial('statSources',sources);initial('engSources',sources)}
    }catch{
      for(const id of ['statOpps','statSources','engOpps','engSources'])initial(id,'—');
    }
  }
  async function worldwide(){
    try{
      const data=await json('/api/source-listings?limit=72');
      if(!Array.isArray(data.listings)||!Number.isSafeInteger(Number(data.count))||
        data.listings.length!==Number(data.count))throw Error('Invalid source listing count');
      const total=count(data.total_source_confirmed);
      const minimum=count(data.count);
      initial('statOpen',String(Math.max(Number(minimum),Number(total??minimum))));
    }catch{initial('statOpen','—')}
  }
  async function openCalls(){
    const label=get('heroOpenCallsLabel');
    if(!label)return;
    try{
      const data=await json('/api/open-calls');
      if(!Array.isArray(data.calls)||!Number.isSafeInteger(Number(data.count)))throw Error('Invalid open calls');
      const live=data.calls.filter(x=>Date.parse(x.closes_at)>Date.now()).length;
      label.textContent=live>0?
        (live===1?'1 call':live+' calls')+' advertised open on official sites · Check eligibility ↗':
        'Browse official programmes and upcoming calls ↗';
    }catch{label.textContent='Explore official provider opportunities ↗'}
  }
  void Promise.allSettled([health(),worldwide(),openCalls()]);
})();