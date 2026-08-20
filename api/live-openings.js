const PROVIDERS={
  'INT-005':{name:'UNICEF',board:'https://jobs.unicef.org/en-us/search/?work-type=internship',host:'jobs.unicef.org',terms:['intern','internship'],adapter:'unicef'},
  'INT-006':{name:'UNDP',board:'https://jobs.undp.org/cj_view_jobs.cfm',host:'jobs.undp.org',terms:['intern','internship'],adapter:'generic'},
  'INT-013':{name:'WFP',board:'https://www.wfp.org/careers',host:'wfp.org',terms:['intern','internship'],adapter:'generic'},
  'INT-014':{name:'ILO',board:'https://jobs.ilo.org/go/Internships/9589701/',host:'jobs.ilo.org',terms:['intern','internship'],adapter:'generic'},
  'INT-018':{name:'EBRD',board:'https://jobs.ebrd.com/go/Early-career-opportunities/1111501/?q=intern&sortColumn=referencedate&sortDirection=desc',host:'jobs.ebrd.com',terms:['intern','internship','trainee'],adapter:'ebrd'},
  'INT-019':{name:'UNOPS',board:'https://jobs.unops.org/',host:'jobs.unops.org',terms:['intern','internship'],adapter:'generic'},
  'FEL-015':{name:'WIPO',board:'https://www.wipo.int/en/web/working-at-wipo/fellowship-program',host:'wipo.int',terms:['fellow','fellowship','intern'],adapter:'generic'},
  'INT-004':{name:'OECD',board:'https://www.oecd.org/en/about/careers/internships.html',host:'oecd.org',terms:['intern','internship'],adapter:'generic'},
  'INT-021':{name:'IFAD',board:'https://www.ifad.org/en/work-with-us/internship-programmes',host:'ifad.org',terms:['intern','internship'],adapter:'generic'},
  'INT-022':{name:'IOM',board:'https://www.iom.int/careers',host:'iom.int',terms:['intern','internship'],adapter:'generic'}
};

const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const text=s=>decode(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
function absolute(base,href){try{return new URL(href,base).toString()}catch{return''}}
function parseDate(raw){const d=new Date(String(raw||'').replace(/\s+/g,' ').trim());return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)}
function parseDmy(raw){const m=String(raw||'').match(/(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})/);if(!m)return'';const d=String(m[1]).padStart(2,'0'),mo=String(m[2]).padStart(2,'0');return `${m[3]}-${mo}-${d}`}
function dateFrom(raw){
  const s=String(raw||'').replace(/\s+/g,' ').trim();
  const patterns=[
    /Posting End Date\s*[:|]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})/i,
    /Deadline\s*:?\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i,
    /Deadline\s*:?\s*([A-Za-z]{3,9}\s+[0-9]{1,2},?\s+20\d{2})/i,
    /Apply by\s*:?\s*([A-Za-z]{3,9}[-\s]+\d{1,2}[-,\s]+20\d{2})/i,
    /Application period\s+[0-9]{1,2}-[A-Za-z]{3}-20\d{2}\s+to\s+([0-9]{1,2}-[A-Za-z]{3}-20\d{2})/i,
    /Closing date\s*:?\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i,
    /Closes?\s*:?\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i,
    /关闭申请\s*[:：-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2}\s+20\d{2})/i,
    /截止日期\s*[:：-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2}\s+20\d{2})/i,
    /Cl[oô]ture\s*[:：-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2}\s+20\d{2})/i,
    /Cl[oô]ture\s+des\s+candidatures\s*[:：-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2}\s+20\d{2})/i,
    /Date\s+limite\s*[:：-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2}\s+20\d{2})/i
  ];
  for(const p of patterns){const m=s.match(p);if(!m)continue;const d=/Posting End Date/i.test(String(p))?parseDmy(m[1]):parseDate(m[1]);if(d)return d}
  return'';
}
function locationFrom(raw){
  const s=String(raw||'').replace(/\s+/g,' ');
  const patterns=[/Location\s*:?\s*(.{2,90}?)(?=Deadline|Apply by|Job Title|Post level|Company|Requisition|$)/i,/Duty station\s*:?\s*(.{2,90}?)(?=Contract|Application period|Deadline|$)/i];
  for(const p of patterns){const m=s.match(p);if(m)return m[1].trim().replace(/[|•]+$/,'').trim()}
  return'';
}
function canonical(raw){try{const u=new URL(raw);u.hash='';u.search='';return `${u.origin}${u.pathname.replace(/\/+$/,'')}`.toLowerCase()}catch{return String(raw||'').toLowerCase()}}
function hasOpportunityTerm(title,terms){
  const t=String(title||'').toLowerCase();
  return terms.some(term=>{
    if(term==='intern'||term==='internship')return /\bintern(?:ship|ships)?\b/i.test(t);
    if(term==='fellow'||term==='fellowship')return /\bfellow(?:ship|ships)?\b/i.test(t);
    if(term==='trainee')return /\btrainee(?:ship|ships)?\b/i.test(t);
    return new RegExp(`\\b${String(term).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(t);
  });
}
function genericTitle(title){
  const t=String(title||'').trim();
  return /^(internships?|fellowships?|early career opportunities|careers?|current vacancies|search jobs?|international)$/i.test(t)
    || /what'?s new.*(?:internship|fellowship)/i.test(t)
    || /\b(?:internship|fellowship)\s+program(?:me)?s?\b/i.test(t)
    || /\b(?:about|learn about|our)\s+(?:internships?|fellowships?)\b/i.test(t)
    || /\bhow to apply\b/i.test(t);
}
function jobLikeUrl(url){try{const u=new URL(url);return /\/(?:job|jobs|vacancy|vacancies|position|positions|requisition|requisitions)(?:\/|$)/i.test(u.pathname)||/(?:jobid|job_id|jobreq|requisition|reqid|vacancyid|positionid)=/i.test(u.search)}catch{return false}}
function looksLikeOpening(title,url,cfg,chunk,deadline){
  if(!hasOpportunityTerm(title,cfg.terms))return false;
  if(genericTitle(title))return false;
  if(canonical(url)===canonical(cfg.board))return false;
  if(deadline||jobLikeUrl(url))return true;
  return /\b(?:deadline|closing date|apply by|duty station|job id|requisition|vacancy number|req(?:uisition)?\.?\s*(?:no|number))\b/i.test(String(chunk||''));
}
function localCard(html,index,anchorLength){const start=Math.max(0,index-120),end=Math.min(html.length,index+anchorLength+1100);return text(html.slice(start,end))}
function extract(html,cfg){
  const anchors=[...String(html||'').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{1,900}?)<\/a>/gi)],out=[],seen=new Set(),today=new Date().toISOString().slice(0,10);
  for(const a of anchors){
    const title=text(a[2]);if(!title||title.length<4||title.length>220)continue;
    const url=absolute(cfg.board,a[1]);if(!url||seen.has(url))continue;
    let host='';try{host=new URL(url).hostname.replace(/^www\./,'')}catch{}
    if(!host.endsWith(cfg.host))continue;
    const idx=a.index||0,chunk=localCard(html,idx,a[0].length);
    if(/this vacancy is closed|applications? (?:are|is) closed/i.test(chunk))continue;
    const deadline=dateFrom(chunk);if(deadline&&deadline<today)continue;
    if(!looksLikeOpening(title,url,cfg,chunk,deadline))continue;
    seen.add(url);out.push({title,url,location:locationFrom(chunk),deadline,source:cfg.name,quality:'vacancy-candidate',evidence_scope:'local-card',status_verified:false,verification_level:'board-only'});
    if(out.length>=12)break;
  }
  return out;
}
async function fetchHtml(url,timeout=12000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const r=await fetch(url,{signal:controller.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36 OpportunityMatcher/1.0','Accept':'text/html,application/xhtml+xml','Accept-Language':'en-GB,en;q=0.9','Cache-Control':'no-cache'}});
    if(!r.ok)throw new Error(`Official page returned HTTP ${r.status}`);
    const html=await r.text();if(html.length<300)throw new Error('Official page returned too little content');
    return{html,status:r.status,url:r.url||url};
  }finally{clearTimeout(timer)}
}
function unicefJobParts(raw){try{const u=new URL(raw),m=u.pathname.match(/\/job\/(\d{5,})(?:\/([^?#]*))?/i);return m?{id:m[1],slug:(m[2]||'').replace(/\/+$/,'')}:null}catch{return null}}
async function verifyUnicefOpening(opening){
  const parts=unicefJobParts(opening.url);if(!parts)return null;
  const slug=parts.slug||String(opening.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),today=new Date().toISOString().slice(0,10);
  for(const url of [`https://jobs.unicef.org/mob/cw/zh-s/job/${parts.id}/${slug}`,`https://jobs.unicef.org/mob/fr/job/${parts.id}/${slug}`]){
    try{
      const f=await fetchHtml(url,10000),returned=unicefJobParts(f.url);if(!returned||returned.id!==parts.id)continue;
      const plain=text(f.html),deadline=dateFrom(plain),explicit=/申请已关闭|applications? (?:are|is) (?:now )?closed|no longer accepting applications|candidatures? (?:sont )?closes?/i.test(plain),closed=!!((deadline&&deadline<today)||explicit);
      if(deadline||explicit)return closed?null:{...opening,deadline:deadline||opening.deadline,status_verified:true,status_source:'unicef-exact-job-page',verification_level:'exact',quality:'status-verified-vacancy'};
    }catch{}
  }
  return null;
}
function ebrdTitle(html){const m=String(html||'').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);return m?text(m[1]):''}
async function verifyEbrdOpening(opening){
  try{
    const target=new URL(opening.url);if(target.hostname.replace(/^www\./,'')!=='jobs.ebrd.com'||!/\/job\//i.test(target.pathname))return null;
    const f=await fetchHtml(opening.url,12000),final=new URL(f.url);if(final.hostname.replace(/^www\./,'')!=='jobs.ebrd.com'||!/\/job\//i.test(final.pathname))return null;
    const plain=text(f.html),title=ebrdTitle(f.html)||opening.title,deadline=dateFrom(plain),today=new Date().toISOString().slice(0,10);
    const contract=(plain.match(/Contract Type\s*[:|]?\s*([A-Za-z ]{2,40}?)(?=Contract Length|Posting End Date|Purpose of the Job|$)/i)||[])[1]?.trim()||'';
    if(!/\bintern\b/i.test(`${title} ${contract}`))return null;
    if(!deadline||deadline<today)return null;
    const location=locationFrom(plain)||opening.location;
    return{...opening,title,location,deadline,status_verified:true,status_source:'ebrd-exact-job-page',verification_level:'exact',quality:'status-verified-vacancy'};
  }catch{return null}
}
async function verifyProviderOpenings(openings,cfg){
  if(cfg.adapter==='unicef'){
    const checked=await Promise.all(openings.slice(0,10).map(verifyUnicefOpening));
    return{openings:checked.filter(Boolean),adapter_state:'exact',withheld:checked.filter(Boolean).length<openings.slice(0,10).length};
  }
  if(cfg.adapter==='ebrd'){
    const checked=await Promise.all(openings.slice(0,10).map(verifyEbrdOpening));
    return{openings:checked.filter(Boolean),adapter_state:'exact',withheld:checked.filter(Boolean).length<openings.slice(0,10).length};
  }
  return{openings:openings.map(x=>({...x,status_verified:false,verification_level:'board-only'})),adapter_state:'board-only',withheld:false};
}
async function fetchBoard(cfg){
  const result=await fetchHtml(cfg.board,18000),candidates=extract(result.html,cfg),verified=await verifyProviderOpenings(candidates,cfg);
  return{...verified,http_status:result.status,candidate_count:candidates.length};
}
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const id=String(req.query?.opportunity_id||'').toUpperCase(),cfg=PROVIDERS[id];
  if(!cfg)return res.status(404).json({ok:false,error:'No live-opening connector is configured for this programme.'});
  res.setHeader('Cache-Control','no-store');
  try{
    const result=await fetchBoard(cfg),exact=result.openings.filter(x=>x.status_verified===true).length;
    return res.status(200).json({ok:true,opportunity_id:id,provider:cfg.name,board_url:cfg.board,source_url:cfg.board,fetched_at:new Date().toISOString(),mode:result.openings.length?'openings':'board',openings:result.openings,http_status:result.http_status,candidate_count:result.candidate_count,adapter_state:result.adapter_state,exact_verified_count:exact,withheld_unverifiable:!!result.withheld,notice:result.adapter_state==='exact'?(result.openings.length?'Vacancies passed the provider-specific exact-job verification adapter. Vacancy-level eligibility still needs to be checked against the individual posting.':'No candidate currently passes exact-job verification for this provider. Use the official board for source-of-truth browsing.'):'This provider is currently board-discovery only. Candidates may appear in programme analysis but are withheld from the verified Dashboard ranking until an exact-job adapter is available.'});
  }catch(e){
    return res.status(200).json({ok:true,opportunity_id:id,provider:cfg.name,board_url:cfg.board,source_url:cfg.board,fetched_at:new Date().toISOString(),mode:'board',openings:[],adapter_state:cfg.adapter==='generic'?'board-only':'exact',exact_verified_count:0,notice:'The official vacancy board could not be parsed or verified safely right now. Open it directly for the source of truth.',fetch_error:e.message});
  }
}
