(()=>{
  const KEY='oppExactFeedLastVisitV1';
  const sessionStarted=new Date().toISOString();
  const previousVisit=(()=>{try{return localStorage.getItem(KEY)||''}catch{return''}})();
  const state={at:0,rows:[],newCount:0,loading:false,error:''};

  const style=document.createElement('style');
  style.textContent=`
    .persistedExactNotice{margin:12px 0;padding:13px 14px;border:1px solid rgba(90,126,40,.18);border-radius:14px;background:linear-gradient(135deg,#f7ffe8,#f2f7ff);display:flex;align-items:center;justify-content:space-between;gap:14px}
    .persistedExactNotice b{display:block;font-size:14px;color:#171d27}.persistedExactNotice p{margin:3px 0 0;font-size:12px;line-height:1.5;color:#69717e}.persistedExactNotice span{flex:0 0 auto;border-radius:999px;padding:7px 9px;background:#d9ff67;color:#202710;font-size:11px;font-weight:900;white-space:nowrap}
    @media(max-width:650px){.persistedExactNotice{align-items:flex-start;flex-direction:column}.persistedExactNotice b{font-size:15px}.persistedExactNotice p{font-size:13px}}
  `;
  document.head.appendChild(style);

  function mount(){
    const dash=document.querySelector('#dashboard .dashPremium');
    if(!dash)return;
    dash.querySelectorAll('.persistedExactNotice').forEach(el=>el.remove());
    if(!state.at||state.newCount<=0)return;
    const n=state.newCount;
    const html=`<section class="persistedExactNotice" data-exact-awareness="true"><div><b>${n} new verified vacanc${n===1?'y':'ies'} since your last visit</b><p>These are newly persisted exact postings from official provider feeds. Your Dashboard still ranks the live verified pool against your Opportunity Passport before recommending anything.</p></div><span>New source activity</span></section>`;
    const hero=dash.querySelector('.dashHero');
    if(hero)hero.insertAdjacentHTML('afterend',html);else dash.insertAdjacentHTML('afterbegin',html);
  }

  async function load(force=false){
    if(state.loading)return;
    if(!force&&state.at&&Date.now()-state.at<300000)return;
    state.loading=true;
    try{
      const query=previousVisit?`?since=${encodeURIComponent(previousVisit)}`:'';
      const response=await fetch(`/api/exact-vacancies${query}`,{cache:'no-store'});
      const data=await response.json();
      if(!response.ok||data?.ok!==true)throw new Error(data?.detail||data?.error||String(response.status));
      state.rows=Array.isArray(data.vacancies)?data.vacancies:[];
      state.newCount=previousVisit?state.rows.filter(row=>row?.is_new===true).length:0;
      state.at=Date.now();state.error='';
      try{localStorage.setItem(KEY,sessionStarted)}catch{}
      mount();
      window.dispatchEvent(new CustomEvent('opportunity:persistedexactchange',{detail:{count:state.rows.length,newCount:state.newCount}}));
    }catch(error){state.error=String(error?.message||error);state.at=Date.now();}
    finally{state.loading=false}
  }

  const observer=new MutationObserver(()=>setTimeout(mount,50));
  observer.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('focus',()=>load(false));
  window.addEventListener('opportunity:statechange',()=>setTimeout(mount,80));
  setInterval(mount,2500);
  setTimeout(()=>load(true),1200);
  window.OpportunityPersistedExactFeed={
    refresh:()=>load(true),
    status:()=>({at:state.at,count:state.rows.length,newCount:state.newCount,error:state.error,previousVisit})
  };
})();
