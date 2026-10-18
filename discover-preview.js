'use strict';

/* OppMatcher Discover design concept: read-only public catalogue, zero account writes. */
const PreviewFilters=(()=>{
  const value=v=>String(v??'').trim();
  const low=v=>value(v).toLowerCase();
  const normalType=x=>{
    const s=low(x?.Type||x);
    if(/scholarship|studentship|grant/.test(s))return 'scholarship';
    if(/internship|trainee|graduate placement/.test(s))return 'internship';
    if(/fellowship|research fellow/.test(s))return 'fellowship';
    return 'other';
  };
  const isoDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(value(s))?value(s):'';
  const today=()=>new Date().toISOString().slice(0,10);
  const statusOf=(o,day=today())=>{
    const close=isoDate(o?.Close_Date);
    const s=low(o?.Status);
    if(close&&close<day)return 'closed';
    if(s==='closed')return 'closed';
    if(s==='open')return 'open';
    if(s==='opening soon'||s==='upcoming')return 'upcoming';
    return 'varies';
  };
  const sourceCurrent=o=>o?.Verification_Stale===false;
  const safeHttps=raw=>{
    try{
      const u=new URL(String(raw||''));
      if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.'))return '';
      const host=u.hostname.toLowerCase();
      if(/^(?:localhost|.*\.localhost|.*\.local|.*\.internal|.*\.test|.*\.invalid)$/.test(host))return '';
      if(/^\d+\.\d+\.\d+\.\d+$/.test(host)||host.startsWith('['))return '';
      return u.href;
    }catch{return ''}
  };
  const escapeHtml=v=>value(v).replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
  const filter=(all,opts={},day=today())=>{
    const keyword=low(opts.keyword),category=opts.category||'all',destination=opts.destination||'all',
      funding=opts.funding||'all',status=opts.status||'current',source=opts.source||'all';
    const order=opts.sort||'deadline';
    const subset=(Array.isArray(all)?all:[]).filter(o=>{
      const text=[o.Opportunity_Name,o.Provider,o.Destination,o.Type,o.Funding].map(low).join(' ');
      const kind=normalType(o),bucket=statusOf(o,day);
      if(keyword&&!text.includes(keyword))return false;
      if(category!=='all'&&kind!==category)return false;
      if(destination!=='all'&&value(o.Destination)!==destination)return false;
      if(funding!=='all'&&value(o.Funding)!==funding)return false;
      if(status==='current'&&bucket!=='open'&&bucket!=='upcoming')return false;
      if(status==='open'&&bucket!=='open')return false;
      if(status==='upcoming'&&bucket!=='upcoming')return false;
      if(status==='varies'&&bucket!=='varies')return false;
      if(status==='closed'&&bucket!=='closed')return false;
      if(source==='current'&&!sourceCurrent(o))return false;
      if(source==='stale'&&sourceCurrent(o))return false;
      return true;
    });
    const deadlineRank=o=>{
      const v=isoDate(o.Close_Date);
      return !v?Number.MAX_SAFE_INTEGER:Date.parse(v+'T12:00:00Z');
    };
    subset.sort((a,b)=>{
      if(order==='title')return value(a.Opportunity_Name).localeCompare(value(b.Opportunity_Name));
      if(order==='provider')return value(a.Provider).localeCompare(value(b.Provider))||value(a.Opportunity_Name).localeCompare(value(b.Opportunity_Name));
      if(order==='recent')return (value(b.Last_Verified)||'').localeCompare(value(a.Last_Verified)||'');
      return deadlineRank(a)-deadlineRank(b)||value(a.Opportunity_Name).localeCompare(value(b.Opportunity_Name));
    });
    return subset;
  };
  return {value,low,normalType,isoDate,statusOf,sourceCurrent,safeHttps,escapeHtml,filter};
})();

if(typeof document!=='undefined')(()=>{
  const $=id=>document.getElementById(id);
  const {value,normalType,statusOf,sourceCurrent,escapeHtml:esc,safeHttps,filter,isoDate}=PreviewFilters;
  const state={items:[],category:'all',page:1,loaded:false,error:null};
  const PAGE_SIZE=8;
  let requestTimer=null;
  const categoryName={scholarship:'Scholarship',internship:'Internship',
    fellowship:'Fellowship',other:'Global programme'};
  const categorySymbol={scholarship:'✦',internship:'↗',fellowship:'◎',other:'⌘'};
  const statusLabel={open:'Marked open',upcoming:'Opening soon',closed:'Closed',varies:'Varies / check source'};
  const formatDate=s=>{
    const d=isoDate(s);
    if(!d)return 'Provider-dependent';
    const parsed=new Date(d+'T12:00:00Z');
    return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(parsed);
  };
  const cut=(s,max)=>{const t=value(s);return t.length>max?t.slice(0,max-1).trim()+'…':t};
  const num=(v)=>Number(v||0).toLocaleString('en-GB');
  const selectOptions=(id,values)=>{
    const el=$(id);
    const sorted=[...new Set(values.map(value).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    for(const item of sorted){const o=document.createElement('option');o.value=item;o.textContent=item;el.appendChild(o)}
  };
  const snapshot=()=>({
    keyword:$('keyword').value.trim(),category:state.category,
    destination:$('countryFilter').value,funding:$('fundingFilter').value,
    status:$('statusFilter').value,source:$('sourceFilter').value,
    sort:$('sortOrder').value
  });
  const tag=(txt)=>'<span>'+esc(cut(txt,55))+'</span>';
  const renderCard=o=>{
    const kind=normalType(o),status=statusOf(o),fresh=sourceCurrent(o);
    const title=esc(cut(o.Opportunity_Name||'Programme details available',145));
    const provider=esc(cut(o.Provider||'Provider not specified',130));
    const destination=value(o.Destination)||'Destination varies';
    const close=value(o.Close_Date)?formatDate(o.Close_Date):'Depends on programme';
    const tags=[destination,value(o.Funding)].filter(Boolean).slice(0,2);
    const key=esc(value(o.Opportunity_ID));
    return '<article class="opCard" aria-label="'+title+'">'+
      '<div class="cardOverline"><span class="categoryPill">'+esc(categoryName[kind])+
      '</span><span class="cardMark" aria-hidden="true">'+esc(categorySymbol[kind])+'</span></div>'+
      '<h3>'+title+'</h3><p class="cardProvider">'+provider+'</p>'+
      '<div class="cardTags">'+tags.map(tag).join('')+'</div>'+
      '<div class="cardMeta"><div><small>Application status</small><strong>'+esc(statusLabel[status])+
      '</strong></div><div><small>Deadline</small><strong>'+esc(close)+'</strong></div></div>'+
      '<div class="cardBottom"><span class="freshness'+(fresh?' current':'')+'">'+
      (fresh?'Recently source-verified':'Source recheck needed')+'</span>'+
      '<button type="button" class="viewButton" data-detail="'+key+'" aria-label="View details for '+title+'">View details <span aria-hidden="true">↗</span></button></div></article>';
  };
  function results(){
    if(!state.loaded||state.error)return [];
    return filter(state.items,snapshot());
  }
  function render(){
    if(!state.loaded)return;
    const all=results(),visible=all.slice(0,state.page*PAGE_SIZE);
    $('cards').innerHTML=visible.map(renderCard).join('');
    $('cards').setAttribute('aria-busy','false');
    $('resultText').textContent=num(all.length)+' '+(all.length===1?'opportunity':'opportunities')+' match your search';
    $('resultMeta').textContent='From '+num(state.items.length)+' catalogue records · evidence status shown on every card';
    $('emptyState').hidden=all.length!==0;
    $('loadMore').hidden=visible.length>=all.length||all.length===0;
    $('loadMore').textContent='Show more opportunities ↓  ('+num(Math.min(all.length-visible.length,PAGE_SIZE))+' next)';
    if(!all.length){$('resultsNotice').textContent='No matching records. Broaden your search or choose “All including closed” to review historical programmes.'}
    else if(snapshot().status==='current'){
      $('resultsNotice').textContent='Showing programmes marked Open or Opening Soon. These labels are historical catalogue data, not live guarantees. Always check the official source and evidence freshness.';
    }else{
      $('resultsNotice').textContent='Showing the selected catalogue statuses, including records that may be closed, rolling, or country-specific. No eligibility is assumed.';
    }
  }
  function updateFilters(){
    state.page=1;
    render();
  }
  function reset(){
    $('keyword').value='';
    $('countryFilter').value='all';
    $('fundingFilter').value='all';
    $('statusFilter').value='current';
    $('sourceFilter').value='all';
    $('sortOrder').value='deadline';
    state.category='all';state.page=1;
    document.querySelectorAll('.category').forEach(b=>{
      const chosen=b.dataset.category==='all';
      b.classList.toggle('active',chosen);
      b.setAttribute('aria-pressed',String(chosen));
    });
    render();
  }
  const textRow=(label,text)=>'<div><small>'+esc(label)+'</small><strong>'+esc(text||'Not specified')+'</strong></div>';
  function showDetail(opportunityId){
    const o=state.items.find(x=>value(x.Opportunity_ID)===String(opportunityId));
    if(!o)return;
    const kind=normalType(o),bucket=statusOf(o);
    const fresh=sourceCurrent(o);
    const source=safeHttps(o.Official_Source_URL),apply=safeHttps(o.Application_URL);
    const eligibility=Array.isArray(o.Eligible_Nationalities)?o.Eligible_Nationalities.join(', '):'';
    const education=Array.isArray(o.Education_Levels)?o.Education_Levels.join(', '):'';
    const fields=Array.isArray(o.Fields_of_Study)?o.Fields_of_Study.join(', '):'';
    const notice=fresh
      ?'Recently rechecked at the programme level. This still does not guarantee your eligibility. Always confirm the latest programme and application conditions.'
      :'This programme does not have recent individual verification evidence. Funding, application dates, nationality rules and country-specific routes may have changed.';
    const details=[
      textRow('Provider',o.Provider),
      textRow('Type',o.Type||categoryName[kind]),
      textRow('Destination',o.Destination||'Varies'),
      textRow('Funding',o.Funding||'Not established'),
      textRow('Application status',statusLabel[bucket]),
      textRow('Application deadline',o.Close_Date?formatDate(o.Close_Date):'Varies / not recorded'),
      textRow('Last individual verification',o.Last_Verified?formatDate(o.Last_Verified):'Not recently verified'),
      textRow('Application route',o.Application_Route||'Consult official source'),
      textRow('Nationality noted in catalogue',eligibility||'Not established'),
      textRow('Education noted in catalogue',education||'Not established')
    ].join('');
    $('detailBody').innerHTML='<div class="dialogHeading"><span class="sectionLabel">OPPMATCHER / OPPORTUNITY DETAILS</span>'+
      '<h2 id="detailTitle">'+esc(o.Opportunity_Name)+'</h2><p>'+esc(o.Provider||'Provider not specified')+'</p></div>'+
      '<div class="dialogWarning'+(fresh?' good':'')+'">'+esc(notice)+'</div>'+
      '<div class="dialogFacts">'+details+'</div>'+
      (fields?'<div class="dialogCopy"><h3>Fields of study in catalogue</h3><p>'+esc(fields)+'</p></div>':'')+
      (o.Eligibility_Notes?'<div class="dialogCopy"><h3>Eligibility notes from catalogue</h3><p>'+esc(cut(o.Eligibility_Notes,750))+'</p></div>':'')+
      '<div class="dialogActions">'+
      (source?'<a class="action aqua" target="_blank" rel="noopener noreferrer" href="'+esc(source)+'">View official source ↗</a>':'<span class="dialogWarning">No safe official HTTPS link recorded.</span>')+
      (apply&&apply!==source?'<a class="action dark" href="'+esc(apply)+'" target="_blank" rel="noopener noreferrer">Application page ↗</a>':'')+
      '<a class="mutedLink" href="/discover">Open live OppMatcher app ↗</a></div>';
    const dlg=$('detailDialog');
    if(typeof dlg.showModal==='function')dlg.showModal();
    else dlg.setAttribute('open','');
  }
  function connect(){
    fetch('/api/opportunities',{headers:{Accept:'application/json'},cache:'no-store'})
      .then(async response=>{
        if(!response.ok)throw new Error('Catalogue endpoint returned HTTP '+response.status);
        const body=await response.json();
        if(!Array.isArray(body.opportunities))throw new Error('Catalogue returned an unexpected format');
        return body;
      }).then(body=>{
        state.items=body.opportunities.filter(x=>x&&value(x.Opportunity_ID)&&value(x.Opportunity_Name));
        state.loaded=true;state.error=null;
        $('loadDot').classList.remove('error');
        $('totalCount').textContent=num(state.items.length);
        const places=new Set(state.items.map(o=>value(o.Destination)).filter(Boolean));
        $('destinationCount').textContent=num(places.size);
        $('staleCount').textContent=num(state.items.filter(o=>!sourceCurrent(o)).length);
        selectOptions('countryFilter',state.items.map(o=>o.Destination));
        selectOptions('fundingFilter',state.items.map(o=>o.Funding));
        // A separate filter preserves rolling and country-dependent records without calling them open.
        const v=document.createElement('option');v.value='varies';v.textContent='Rolling / variable / not confirmed';
        $('statusFilter').appendChild(v);
        const closed=document.createElement('option');closed.value='closed';closed.textContent='Closed / past deadlines';
        $('statusFilter').appendChild(closed);
        render();
      }).catch(error=>{
        state.error=String(error?.message||error);
        state.loaded=false;
        $('loadDot').classList.add('error');
        $('resultText').textContent='Unable to load live catalogue';
        $('resultMeta').textContent='No demonstration listings have been substituted';
        $('resultsNotice').textContent='The live opportunity feed could not be loaded: '+state.error+'. You can open the current live Discover page and try again later.';
        $('cards').setAttribute('aria-busy','false');
        $('cards').innerHTML='<div class="emptyState" style="display:block;grid-column:1/-1"><h3>Catalogue currently unavailable.</h3><p>We will not display invented opportunities as live data.</p><button type="button" class="action dark" id="retryFeed">Try loading again ↗</button></div>';
        $('retryFeed').addEventListener('click',()=>{
          $('resultText').textContent='Connecting to OppMatcher catalogue…';
          $('resultsNotice').textContent='Retrying the live opportunity feed…';
          $('cards').innerHTML='';
          connect();
        });
      });
  }
  function init(){
    $('keyword').addEventListener('input',()=>{clearTimeout(requestTimer);requestTimer=setTimeout(updateFilters,130)});
    ['countryFilter','fundingFilter','statusFilter','sourceFilter','sortOrder'].forEach(id=>$(id).addEventListener('change',updateFilters));
    document.querySelectorAll('.category').forEach(button=>button.addEventListener('click',()=>{
      state.category=button.dataset.category||'all';
      document.querySelectorAll('.category').forEach(b=>{const selected=b===button;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});
      updateFilters();
    }));
    $('resetFilters').addEventListener('click',reset);
    $('emptyReset').addEventListener('click',reset);
    $('loadMore').addEventListener('click',()=>{state.page++;render()});
    $('cards').addEventListener('click',event=>{
      const button=event.target.closest('button[data-detail]');
      if(button)showDetail(button.dataset.detail);
    });
    $('closeDialog').addEventListener('click',()=>$('detailDialog').close());
    $('detailDialog').addEventListener('click',event=>{if(event.target===$('detailDialog'))$('detailDialog').close()});
    const nav=$('navLinks'),toggle=$('menuToggle');
    toggle.addEventListener('click',()=>{
      const opened=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(opened));
      toggle.setAttribute('aria-label',opened?'Close navigation':'Open navigation');toggle.textContent=opened?'×':'☰';
    });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.textContent='☰';
    }));
    const targets=document.querySelectorAll('[data-reveal]');
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if('IntersectionObserver'in window&&!motion){
      const observer=new IntersectionObserver(entries=>entries.forEach(e=>{
        if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}
      }),{threshold:.08});
      targets.forEach(x=>observer.observe(x));
    }else targets.forEach(x=>x.classList.add('visible'));
    connect();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
