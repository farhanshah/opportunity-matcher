(()=>{
  const original=window.OpportunityBestLive;
  if(!original?.status||original.__eligibilityAwareRanking)return;

  const baseStatus=original.status.bind(original);
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const profile=()=>{try{return window.OpportunityState?.getProfile?.()||currentProfile||{}}catch{return{}}};
  const monthsSince=date=>{if(!date)return null;const d=new Date(String(date).slice(0,10)+'T12:00:00');if(Number.isNaN(d.getTime()))return null;const now=new Date();return Math.max(0,(now-d)/(86400000*30.4375))};
  const providerName=x=>String(x?.provider||x?.source||'').toUpperCase();

  function graduationWindow(text){
    const t=norm(text);
    if(/within (?:the )?past year|within (?:the )?last year|within one year/.test(t))return 12;
    if(/within six months|within 6 months/.test(t))return 6;
    if(/within (?:the )?past two years|within two years|within 2 years/.test(t))return 24;
    if(/within (?:the )?past three years|within three years|within 3 years/.test(t))return 36;
    return null;
  }

  function roleFit(title,field){
    const t=norm(title),f=norm(field);let score=0;const reasons=[];
    const add=(rx,pts,label)=>{if(rx.test(t)){score+=pts;reasons.push(label)}};
    if(/business|management/.test(f)){
      add(/\bfinance|financial|investment|private sector\b/,5,'finance/business fit');
      add(/\bpartnership|partnerships|stakeholder|external relations\b/,4,'partnership fit');
      add(/\bproject|programme|program|coordination|operations\b/,4,'project/operations fit');
      add(/\bcommunication|communications|marketing|media|content\b/,3,'communications fit');
      add(/\bresearch|policy|strategy|planning|administration|procurement|logistics\b/,3,'strategy/research fit');
      add(/\bmanagement|business\b/,4,'direct degree fit');
    }else if(/communication|media|marketing/.test(f)){
      add(/\bcommunication|communications|media|marketing|content|advocacy|digital\b/,6,'direct field fit');
      add(/\bpartnership|external relations\b/,3,'related field fit');
    }else if(/computer|software|data|technology/.test(f)){
      add(/\bdata|digital|technology|software|ict|analytics|artificial intelligence|\bai\b|cyber\b/,6,'direct field fit');
    }else if(/econom/.test(f)){
      add(/\beconom|finance|financial|investment|policy|statistics|research\b/,6,'direct field fit');
    }else if(/law|legal/.test(f)){
      add(/\blegal|law|governance|compliance|policy\b/,6,'direct field fit');
    }
    return{score:Math.min(score,12),reasons:[...new Set(reasons)].slice(0,2)};
  }

  function academicFit(item,p){
    const status=norm(p?.degreeStatus),edu=norm(p?.edu),text=norm(item?.detail_text),completed=/completed/.test(status)||/bachelor's degree|master's degree|phd degree/.test(edu);
    if(!completed)return{score:0,reasons:[]};
    const months=monthsSince(p?.graduationDate),window=graduationWindow(text);
    if(window!=null&&months!=null){
      if(months<=window+0.2)return{score:5,reasons:[`recent-graduate route (${window}m)`]};
      return{score:-16,reasons:['graduate window needs review']};
    }
    if(/recent graduate|recent graduates|graduated recently/.test(text))return{score:2,reasons:['graduate route available']};
    return{score:0,reasons:[]};
  }

  function locationFit(item,p){
    const loc=norm(item?.location),res=norm(p?.residence),reasons=[];let score=0;
    if(/home based|home-based|remote/.test(`${loc} ${norm(item?.title)}`)){score+=2;reasons.push('remote/home-based')}
    if(res&&loc&&loc.includes(res)){score+=2;reasons.push('location aligned')}
    return{score,reasons};
  }

  function annotate(item,p){
    const role=roleFit(item?.title,p?.field),academic=academicFit(item,p),location=locationFit(item,p),base=Number(item?._score||0);
    const reasons=[...role.reasons,...academic.reasons,...location.reasons].filter(Boolean).slice(0,3);
    return{...item,_score:base+role.score+academic.score+location.score,_passport_rank_reasons:reasons,_passport_rank_delta:role.score+academic.score+location.score};
  }

  function status(){
    const s=baseStatus()||{},p=profile(),items=(Array.isArray(s.items)?s.items:[]).map(x=>annotate(x,p));
    return{...s,items,eligibility_aware_ranking:true};
  }
  function refresh(){try{original.refresh?.()}catch{};setTimeout(()=>window.OpportunityDeepRankingV2?.refresh?.(),120)}
  window.OpportunityBestLive={...original,status,refresh,__eligibilityAwareRanking:true};

  const style=document.createElement('style');
  style.textContent='.deepV2RankWhy{margin-top:7px;padding:6px 8px;border-radius:8px;background:rgba(216,255,105,.055);border:1px solid rgba(216,255,105,.09);font-size:7px;line-height:1.45;color:#b9c3a2}.deepV2RankWhy b{color:#d9ff67;font-weight:800}';
  document.head.appendChild(style);

  function decorate(){
    const s=status(),items=Array.isArray(s.items)?s.items:[],byTitle=new Map();
    for(const x of items){const key=`${providerName(x)}|${norm(x.title)}`;if(!byTitle.has(key))byTitle.set(key,x)}
    document.querySelectorAll('#dashboard .deepLiveV2Card').forEach(card=>{
      if(card.querySelector('.deepV2RankWhy'))return;
      const provider=String(card.querySelector('.deepV2Provider')?.textContent||'').toUpperCase(),title=norm(card.querySelector('h4')?.textContent||''),item=byTitle.get(`${provider}|${title}`);
      if(!item?._passport_rank_reasons?.length)return;
      const p=card.querySelector('p');if(!p)return;
      const div=document.createElement('div');div.className='deepV2RankWhy';div.innerHTML=`<b>Why ranked:</b> ${item._passport_rank_reasons.join(' · ')}`;p.insertAdjacentElement('afterend',div);
    });
    const head=document.querySelector('#dashboard .deepLiveV2 .deepV2Head p');
    if(head&&!head.dataset.eligibilityAware){head.dataset.eligibilityAware='1';head.textContent='Every exact opening is checked first, then ranked using vacancy evidence plus Passport-aware role relevance, academic recency and location signals. Exact status and final eligibility remain separate checks.'}
  }

  const obs=new MutationObserver(()=>setTimeout(decorate,20));obs.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('opportunity:statechange',()=>setTimeout(()=>window.OpportunityDeepRankingV2?.refresh?.(),180));
  window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(decorate,120));
  setTimeout(()=>{window.OpportunityDeepRankingV2?.refresh?.();decorate()},700);
  setInterval(decorate,1800);
  window.OpportunityEligibilityAwareRanking={refresh:()=>{window.OpportunityDeepRankingV2?.refresh?.();setTimeout(decorate,100)},status:()=>status()};
})();