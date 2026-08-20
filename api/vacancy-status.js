const PROVIDERS={
  'INT-004':{name:'OECD',hosts:['oecd.org']},
  'INT-005':{name:'UNICEF',hosts:['jobs.unicef.org','careers.pageuppeople.com']},
  'INT-006':{name:'UNDP',hosts:['jobs.undp.org','undp.org']},
  'INT-013':{name:'WFP',hosts:['wfp.org']},
  'INT-014':{name:'ILO',hosts:['jobs.ilo.org','ilo.org']},
  'INT-018':{name:'EBRD',hosts:['jobs.ebrd.com','ebrd.com']},
  'INT-019':{name:'UNOPS',hosts:['jobs.unops.org','unops.org']},
  'INT-021':{name:'IFAD',hosts:['ifad.org']},
  'INT-022':{name:'IOM',hosts:['iom.int']},
  'FEL-015':{name:'WIPO',hosts:['wipo.int']}
};

const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const clean=s=>decode(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
const norm=s=>clean(s).toLowerCase().replace(/[‐‑–—]/g,'-').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
function allowed(raw,cfg){try{const u=new URL(raw);if(u.protocol!=='https:')return null;const h=u.hostname.toLowerCase().replace(/^www\./,'');return cfg.hosts.some(x=>h===x||h.endsWith('.'+x))?u:null}catch{return null}}
function parseDate(raw){const d=new Date(String(raw||'').replace(/\s+/g,' ').trim());return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)}
function pageTitle(html){const h1=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);if(h1){const t=clean(h1[1]);if(t)return t.slice(0,240)}const t=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);return t?clean(t[1]).slice(0,240):''}
function titleContext(full,title){const f=String(full||''),t=String(title||'').trim();if(!t)return'';const probes=[t,t.slice(0,150),t.split(',').slice(0,2).join(',').trim()].filter(x=>x.length>12);for(const p of probes){const i=f.toLowerCase().indexOf(p.toLowerCase());if(i>=0)return f.slice(Math.max(0,i-900),Math.min(f.length,i+p.length+3200))}return''}
function recursiveJobPosting(v){if(!v)return null;if(Array.isArray(v)){for(const x of v){const j=recursiveJobPosting(x);if(j)return j}return null}if(typeof v!=='object')return null;const t=v['@type'];if(t==='JobPosting'||(Array.isArray(t)&&t.includes('JobPosting')))return v;for(const x of Object.values(v)){const j=recursiveJobPosting(x);if(j)return j}return null}
function jobPosting(html){for(const m of String(html||'').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const j=recursiveJobPosting(JSON.parse(decode(m[1]).trim()));if(j)return j}catch{}}return null}
function deadlineFromText(text){
  const s=String(text||'');
  const date='([0-9]{1,2}\\s+[A-Za-z]{3,9}\\s+20\\d{2}|[A-Za-z]{3,9}\\s+[0-9]{1,2},?\\s+20\\d{2})';
  const labels=['deadline','closing\\s+date','closes?','apply\\s+by','applications?\\s+(?:close|closes|closing)','closing\\s+applications?','applications?\\s+closing','application\\s+deadline','关闭申请','截止日期','cl[oô]ture','cl[oô]ture\\s+des\\s+candidatures','date\\s+limite'];
  for(const label of labels){const re=new RegExp(label+'\\s*[:：-]?\\s*'+date,'i');const m=s.match(re);if(m){const d=parseDate(m[1]);if(d)return d}}
  return'';
}
function explicitClosed(text){return /applications? (?:are|is) (?:now )?closed|this vacancy is closed|no longer accepting applications|applications? (?:are|is) no longer being accepted|application period (?:has )?closed|position has been filled|applications? closed|申请已关闭|candidatures? (?:sont )?closes?/.test(String(text||'').toLowerCase())}
async function fetchPage(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36 OpportunityMatcher/1.0','Accept':'text/html,application/xhtml+xml','Accept-Language':'en-GB,en;q=0.9','Cache-Control':'no-cache'}});if(!r.ok)throw new Error(`Official vacancy returned HTTP ${r.status}`);const html=(await r.text()).slice(0,900000);if(html.length<300)throw new Error('Official vacancy returned too little content');return{html,url:r.url||url,status:r.status}}finally{clearTimeout(timer)}}
function jobParts(raw){try{const u=new URL(raw),m=u.pathname.match(/\/job\/(\d{5,})(?:\/([^?#]*))?/i);return m?{id:m[1],slug:(m[2]||'').replace(/\/+$/,'')}:null}catch{return null}}
function jobIdFromUrl(raw){return jobParts(raw)?.id||''}
function titleScore(a,b){const A=norm(a),B=norm(b);if(!A||!B)return 0;if(A===B)return 1;if(A.includes(B)||B.includes(A))return .94;const as=new Set(A.split(' ').filter(x=>x.length>2)),bs=new Set(B.split(' ').filter(x=>x.length>2));if(!as.size||!bs.size)return 0;let hit=0;for(const x of as)if(bs.has(x))hit++;return hit/Math.min(as.size,bs.size)}
function unicefExactCard(html,jobId,titleHint){
  const src=String(html||''),anchors=[...src.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{1,1200}?)<\/a>/gi)];
  let best=null,bestScore=0;
  for(const a of anchors){const href=a[1]||'',label=clean(a[2]);if(!label)continue;const idMatch=jobId&&new RegExp(`\\/job\\/${jobId}(?:\\/|$|[?#])`,'i').test(href);const score=idMatch?2:titleScore(label,titleHint);if(score>bestScore){bestScore=score;best={a,label}}}
  if(!best||bestScore<.72)return null;
  const start=best.a.index||0,after=start+best.a[0].length,tail=src.slice(after),next=tail.search(/<a\b[^>]*href=["'][^"']*\/job\/\d{5,}/i),end=next>=0?after+next:Math.min(src.length,start+8500),context=clean(src.slice(start,end));
  return{context,label:best.label,score:bestScore};
}
async function unicefMobileStatus(target,titleHint){
  const parts=jobParts(target.toString());if(!parts)return null;
  const slug=parts.slug||String(titleHint||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const urls=[
    `https://jobs.unicef.org/mob/cw/zh-s/job/${parts.id}/${slug}`,
    `https://jobs.unicef.org/mob/fr/job/${parts.id}/${slug}`
  ];
  for(const url of urls){try{
    const f=await fetchPage(url),returned=jobParts(f.url);if(!returned||returned.id!==parts.id)continue;const full=clean(f.html);
    const deadline=deadlineFromText(full),today=new Date().toISOString().slice(0,10),closed=!!((deadline&&deadline<today)||explicitClosed(full));
    if(deadline||closed)return{jobId:parts.id,deadline,closed,reason:deadline&&deadline<today?'deadline_passed':closed?'explicitly_closed':'',source:'unicef-mobile-job-detail'};
  }catch{}}
  return null;
}
async function unicefBoardStatus(target,titleHint){
  const jobId=jobIdFromUrl(target.toString()),q=(titleHint||'').slice(0,120),urls=[];
  if(jobId)urls.push(`https://jobs.unicef.org/en-us/search/?search-keyword=${encodeURIComponent(jobId)}`);
  if(q)urls.push(`https://jobs.unicef.org/en-us/search/?search-keyword=${encodeURIComponent(q)}`);
  urls.push('https://jobs.unicef.org/en-us/search/?work-type=internship');
  for(const url of urls){try{const f=await fetchPage(url),card=unicefExactCard(f.html,jobId,titleHint);if(!card)continue;const deadline=deadlineFromText(card.context),today=new Date().toISOString().slice(0,10),closed=!!((deadline&&deadline<today)||explicitClosed(card.context));return{jobId,deadline,closed,reason:deadline&&deadline<today?'deadline_passed':closed?'explicitly_closed':'',source:'unicef-exact-official-card',matched_title:card.label,match_score:card.score}}catch{}}
  return null;
}

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const id=String(req.query?.opportunity_id||'').toUpperCase(),cfg=PROVIDERS[id];if(!cfg)return res.status(404).json({ok:false,error:'Vacancy status verification is not configured for this programme.'});
  const target=allowed(String(req.query?.url||''),cfg);if(!target)return res.status(400).json({ok:false,error:'Only approved official provider URLs can be verified.'});
  res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
  try{
    const f=await fetchPage(target.toString()),final=allowed(f.url,cfg);if(!final)throw new Error('Official vacancy redirected outside the approved provider domain');
    const full=clean(f.html),job=jobPosting(f.html),title=clean(job?.title)||pageTitle(f.html),context=titleContext(full,title),valid=job?.validThrough?parseDate(job.validThrough):'';
    let deadline=valid||deadlineFromText(context)||deadlineFromText(full),today=new Date().toISOString().slice(0,10),closed=!!((deadline&&deadline<today)||explicitClosed(context)),reason=deadline&&deadline<today?'deadline_passed':closed?'explicitly_closed':'',status_source=valid?'jobposting-validThrough':'detail-page';
    if(id==='INT-005'){
      const mobile=await unicefMobileStatus(target,title);
      const board=mobile||await unicefBoardStatus(target,title);
      if(board){if(board.deadline)deadline=board.deadline;closed=board.closed;reason=board.reason;status_source=board.source}
    }
    return res.status(200).json({ok:true,opportunity_id:id,provider:cfg.name,url:final.toString(),title,deadline,closed,reason,status_source,fetched_at:new Date().toISOString(),http_status:f.status});
  }catch(e){return res.status(200).json({ok:true,opportunity_id:id,provider:cfg.name,url:target.toString(),deadline:'',closed:false,reason:'unreadable',status_source:'unreadable',fetch_error:e.message,fetched_at:new Date().toISOString()})}
}
