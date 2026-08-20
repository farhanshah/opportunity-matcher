const PROVIDERS={
  'FEL-015':{name:'WIPO',board:'https://wipo.taleo.net/careersection/wp_2_fel/jobsearch.ftl?lang=en&portal=50305027338',host:'wipo.taleo.net',kind:'fellowship',terms:['fellow','fellowship']},
  'INT-012':{
    name:'FAO',
    board:'https://jobs.fao.org/careersection/fao_external/moresearch.ftl?lang=en',
    host:'jobs.fao.org',
    kind:'internship',
    terms:['intern','internship'],
    seeds:[
      'https://jobs.fao.org/careersection/fao_external/jobdetail.ftl?job=2600026&lang=en',
      'https://jobs.fao.org/careersection/fao_external/jobdetail.ftl?job=2600030&lang=en',
      'https://jobs.fao.org/careersection/fao_external/jobdetail.ftl?job=2600032&lang=en',
      'https://jobs.fao.org/careersection/fao_external/jobdetail.ftl?job=2600034&lang=en'
    ],
    verified_jobs:{
      '2600026':{title:'Call for Expression of Interest – Internship Programme for FAO headquarters (HQ)',deadline:'2026-08-25',location:'Italy-Rome'},
      '2600030':{title:'Call for Expression of Interest – Internship Programme for Africa (RAF)',deadline:'2026-08-25',location:'Various Locations'},
      '2600032':{title:'Call for Expression of Interest – Internship Programme for Europe and Central Asia (REU)',deadline:'2026-08-25',location:'Various Locations'},
      '2600034':{title:'Call for Expression of Interest – Internship Programme for Latin America and the Caribbean (RLC)',deadline:'2026-08-26',location:'Various Locations'}
    }
  },
  'INT-016':{name:'ADB',board:'https://adb.taleo.net/careersection/2/moresearch.ftl',host:'adb.taleo.net',kind:'internship',terms:['intern','internship']},
  'INT-011':{name:'WTO',board:'https://www.wto.org/english/thewto_e/vacan_e/iypp_e.htm',host:'wto.org',kind:'roster',terms:['intern','internship']}
};

const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const text=s=>decode(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
const absolute=(base,href)=>{try{return new URL(href,base).toString()}catch{return''}};
const sameHost=(url,host)=>{try{return new URL(url).hostname.replace(/^www\./,'')===host}catch{return false}};
const jobId=url=>{try{return new URL(url).searchParams.get('job')||''}catch{return''}};
function parseDate(raw){const s=String(raw||'').trim().replace(/\//g,' ');const d=new Date(s);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)}
function dateFrom(raw){
  const s=String(raw||'').replace(/\s+/g,' ');
  const pats=[
    /(?:Closure Date|Closing Date|Application Deadline|Deadline|Apply by)\s*[:|]?\s*(\d{1,2}[\/-][A-Za-z]{3,9}[\/-]20\d{2})/i,
    /(?:Closure Date|Closing Date|Application Deadline|Deadline|Apply by)\s*[:|]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i,
    /(?:Closure Date|Closing Date|Application Deadline|Deadline|Apply by)\s*[:|]?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2})/i
  ];
  for(const p of pats){const m=s.match(p);if(m){const d=parseDate(m[1]);if(d)return d}}
  return'';
}
function locationFrom(raw){const s=String(raw||'').replace(/\s+/g,' ');for(const p of [/Work Locations?\s*:?\s*(.{2,90}?)(?=Job Posting|Closure Date|Apply|$)/i,/Primary Location\s*:?\s*(.{2,90}?)(?=Duration|Post Number|Job Type|$)/i,/Location\s*:?\s*(.{2,90}?)(?=Closing Date|Deadline|Department|$)/i]){const m=s.match(p);if(m)return m[1].trim()}return''}
function titleFrom(html){const h=String(html||'').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);if(h){const t=text(h[1]);if(t)return t}const t=String(html||'').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);return t?text(t[1]).replace(/^Job Description\s*-\s*/i,''):''}
function isRelevant(title,plain,cfg){const hay=`${title} ${plain}`.toLowerCase();if(cfg.kind==='fellowship')return /\bfellow(?:ship)?\b/.test(hay)||/wp_2_fel/i.test(cfg.board);return /\bintern(?:ship)?\b/.test(hay)||/job type\s*:?\s*internship/i.test(hay)||/type of requisition\s*:?\s*internship/i.test(hay)}
function jobLike(url){try{const u=new URL(url);return /jobdetail\.ftl/i.test(u.pathname)&&/(?:^|&)job=\d+/i.test(u.search.replace(/^\?/,''))}catch{return false}}
async function fetchHtml(url,timeout=14000){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 OpportunityMatcher/1.0','Accept':'text/html,application/xhtml+xml','Accept-Language':'en-GB,en;q=0.9','Cache-Control':'no-cache'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const html=await r.text();if(html.length<250)throw new Error('Official page returned too little content');return{html,url:r.url||url,status:r.status}}finally{clearTimeout(timer)}}
function extractCandidates(html,cfg){const out=[],seen=new Set(),today=new Date().toISOString().slice(0,10);for(const a of String(html||'').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{1,1000}?)<\/a>/gi)){const title=text(a[2]);if(!title||title.length<4||title.length>240)continue;const url=absolute(cfg.board,a[1]);if(!sameHost(url,cfg.host)||!jobLike(url)||seen.has(url))continue;const lc=title.toLowerCase();if(!cfg.terms.some(t=>lc.includes(t)))continue;const start=Math.max(0,(a.index||0)-250),end=Math.min(String(html).length,(a.index||0)+a[0].length+1500),chunk=text(String(html).slice(start,end)),deadline=dateFrom(chunk);if(deadline&&deadline<today)continue;seen.add(url);out.push({title,url,location:locationFrom(chunk),deadline,source:cfg.name});if(out.length>=10)break}return out}
function mergeCandidates(boardCandidates,cfg){const out=[],seen=new Set();for(const x of [...boardCandidates,...(cfg.seeds||[]).map(url=>({title:'',url,location:'',deadline:'',source:cfg.name}))]){if(!x?.url||seen.has(x.url))continue;seen.add(x.url);out.push(x)}return out.slice(0,12)}
async function verifyOpening(opening,cfg){
  try{
    const f=await fetchHtml(opening.url),final=f.url;
    if(!sameHost(final,cfg.host)||!jobLike(final))return null;
    const plain=text(f.html),known=cfg.verified_jobs?.[jobId(final)]||cfg.verified_jobs?.[jobId(opening.url)]||null;
    if(/applications? (?:are|is) (?:now )?closed|this vacancy is closed|no longer accepting applications|position has been filled/i.test(plain))return null;
    const renderedTitle=titleFrom(f.html),renderedDeadline=dateFrom(plain),today=new Date().toISOString().slice(0,10);
    const title=(renderedTitle&&!/^job search$/i.test(renderedTitle)?renderedTitle:'')||opening.title||known?.title||'';
    const deadline=renderedDeadline||opening.deadline||known?.deadline||'';
    const location=locationFrom(plain)||opening.location||known?.location||'';
    if(!deadline||deadline<today)return null;
    const renderedEvidence=isRelevant(renderedTitle,plain,cfg)&&Boolean(renderedDeadline);
    const registryEvidence=Boolean(known&&known.deadline===deadline&&isRelevant(known.title,'',cfg));
    if(!renderedEvidence&&!registryEvidence)return null;
    return{title,url:final,location,deadline,source:cfg.name,status_verified:true,verification_level:'exact',quality:'status-verified-vacancy',status_source:renderedEvidence?`${cfg.name.toLowerCase()}-taleo-exact-job-page`:`${cfg.name.toLowerCase()}-exact-job-shell+verified-cycle-registry`,verification_basis:renderedEvidence?'rendered exact vacancy page':'exact official job URL + pre-verified current-cycle metadata'};
  }catch{return null}
}

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const id=String(req.query?.opportunity_id||'').toUpperCase(),cfg=PROVIDERS[id];if(!cfg)return res.status(404).json({ok:false,error:'No specific-opening adapter is configured for this programme.'});
  res.setHeader('Cache-Control','no-store');
  if(cfg.kind==='roster')return res.status(200).json({ok:true,opportunity_id:id,provider:cfg.name,board_url:cfg.board,adapter_state:'roster',candidate_count:0,exact_verified_count:0,openings:[],notice:'WTO operates an ongoing internship roster and may publish specific internship notices separately; no exact vacancy is promoted without an individual posting.'});
  try{
    let boardCandidates=[];
    try{const board=await fetchHtml(cfg.board,18000);boardCandidates=extractCandidates(board.html,cfg)}catch{}
    const candidates=mergeCandidates(boardCandidates,cfg);
    const checked=await Promise.all(candidates.slice(0,12).map(x=>verifyOpening(x,cfg))),openings=checked.filter(Boolean);
    return res.status(200).json({ok:true,opportunity_id:id,provider:cfg.name,board_url:cfg.board,fetched_at:new Date().toISOString(),adapter_state:'exact',candidate_count:candidates.length,exact_verified_count:openings.length,openings,withheld_unverifiable:candidates.length>openings.length,seeded_fallback_used:Boolean((cfg.seeds||[]).length),notice:'Only individual official postings with a current exact deadline are promoted. For providers whose Taleo detail page renders vacancy values client-side, a still-live exact job URL may be paired with pre-verified current-cycle metadata and automatically expires at the verified deadline.'})
  }catch(e){return res.status(200).json({ok:true,opportunity_id:id,provider:cfg.name,board_url:cfg.board,fetched_at:new Date().toISOString(),adapter_state:'unreadable',candidate_count:0,exact_verified_count:0,openings:[],fetch_error:e.message,notice:'The official source could not be read safely, so no vacancy was promoted.'})}
}
