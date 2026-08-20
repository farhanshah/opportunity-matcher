const PROVIDERS={
  'INT-005':{name:'UNICEF',board:'https://jobs.unicef.org/en-us/search/?work-type=internship',host:'jobs.unicef.org',terms:['intern','internship'],adapter:'unicef'},
  'INT-006':{name:'UNDP',board:'https://jobs.undp.org/cj_view_jobs.cfm',host:'jobs.undp.org',terms:['intern','internship','stagiaire'],adapter:'undp',exactHost:'estm.fa.em2.oraclecloud.com'},
  'INT-013':{name:'WFP',board:'https://www.wfp.org/careers',host:'wfp.org',terms:['intern','internship'],adapter:'generic'},
  'INT-014':{name:'ILO',board:'https://jobs.ilo.org/go/Internships/9589701/',host:'jobs.ilo.org',terms:['intern','internship'],adapter:'generic'},
  'INT-018':{name:'EBRD',board:'https://jobs.ebrd.com/go/Early-career-opportunities/1111501/?q=intern&sortColumn=referencedate&sortDirection=desc',host:'jobs.ebrd.com',terms:['intern','internship','trainee'],adapter:'ebrd'},
  'INT-019':{name:'UNOPS',board:'https://jobs.unops.org/',host:'jobs.unops.org',terms:['intern','internship'],adapter:'generic'},
  'FEL-015':{name:'WIPO',board:'https://www.wipo.int/en/web/working-at-wipo/fellowship-program',host:'wipo.int',terms:['fellow','fellowship','intern'],adapter:'generic'},
  'INT-004':{name:'OECD',board:'https://www.oecd.org/en/about/careers/internships.html',host:'oecd.org',terms:['intern','internship'],adapter:'generic'},
  'INT-021':{name:'IFAD',board:'https://www.ifad.org/en/work-with-us/internship-programmes',host:'ifad.org',terms:['intern','internship'],adapter:'generic'},
  'INT-022':{name:'IOM',board:'https://www.iom.int/careers',host:'iom.int',terms:['intern','internship'],adapter:'generic'}
};

const UNDP_INTERNSHIP_POLICY='UNDP internships are open to students in the final year of a Bachelor degree, students completing a Master degree, and recent graduates who completed their studies within the past year. Previous work experience is not required. Applicants should demonstrate interest in development and relevant expertise for the specific internship. Internships may be in-person or remote, full-time or part-time, and eligible interns normally receive a stipend unless sponsored by another institution or government.';
const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const text=s=>decode(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
function absolute(base,href){try{return new URL(href,base).toString()}catch{return''}}
function parseDate(raw){const d=new Date(String(raw||'').replace(/\s+/g,' ').trim());return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)}
function parseDmy(raw){const m=String(raw||'').match(/(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})/);if(!m)return'';const d=String(m[1]).padStart(2,'0'),mo=String(m[2]).padStart(2,'0');return `${m[3]}-${mo}-${d}`}
function parseUndpDate(raw){const m=String(raw||'').match(/([A-Za-z]{3,9})[-\s]+(\d{1,2})[-,\s]+(\d{2,4})/);if(!m)return'';const year=m[3].length===2?`20${m[3]}`:m[3];return parseDate(`${m[1]} ${m[2]}, ${year}`)}
function dateFrom(raw){
  const s=String(raw||'').replace(/\s+/g,' ').trim();
  const patterns=[
    /Posting End Date\s*[:|]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})/i,
    /Deadline\s*:?\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i,
    /Deadline\s*:?\s*([A-Za-z]{3,9}\s+[0-9]{1,2},?\s+20\d{2})/i,
    /Apply by\s*:?\s*([A-Za-z]{3,9}[-\s]+\d{1,2}[-,\s]+(?:20)?\d{2})/i,
    /Application period\s+[0-9]{1,2}-[A-Za-z]{3}-20\d{2}\s+to\s+([0-9]{1,2}-[A-Za-z]{3}-20\d{2})/i,
    /Closing date\s*:?\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i,
    /Closes?\s*:?\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i,
    /关闭申请\s*[:：-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2}\s+20\d{2})/i,
    /截止日期\s*[:：-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2}\s+20\d{2})/i,
    /Cl[oô]ture\s*[:：-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2}\s+20\d{2})/i,
    /Cl[oô]ture\s+des\s+candidatures\s*[:：-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2}\s+20\d{2})/i,
    /Date\s+limite\s*[:：-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2}\s+20\d{2})/i
  ];
  for(const p of patterns){const m=s.match(p);if(!m)continue;let d='';if(/Posting End Date/i.test(String(p)))d=parseDmy(m[1]);else if(/Apply by/i.test(String(p)))d=parseUndpDate(m[1]);else d=parseDate(m[1]);if(d)return d}
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
    if(term==='stagiaire')return /\bstagiaire\b/i.test(t);
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
function localCard(html,index,anchorLength){const start=Math.max(0,index-180),end=Math.min(html.length,index+anchorLength+1500);return text(html.slice(start,end))}
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
function undpJobId(raw){try{const u=new URL(raw),m=u.pathname.match(/\/(?:requisitions\/)?job\/(\d+)/i);return m?m[1]:''}catch{return''}}
function extractUndp(html,cfg){
  const anchors=[...String(html||'').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{1,1200}?)<\/a>/gi)],out=[],seen=new Set(),today=new Date().toISOString().slice(0,10);
  for(const a of anchors){
    const url=absolute(cfg.board,a[1]);let u;try{u=new URL(url)}catch{continue}
    if(u.hostname.replace(/^www\./,'')!==cfg.exactHost||!undpJobId(url)||seen.has(undpJobId(url)))continue;
    const chunk=localCard(html,a.index||0,a[0].length),anchorText=text(a[2]),title=anchorText.replace(/^Job Title\s*/i,'').trim();
    const isIntern=hasOpportunityTerm(title,cfg.terms)||/Post level\s+IN\b/i.test(chunk)||/\b(?:intern|internship|stagiaire)\b/i.test(chunk);
    if(!isIntern||!/Agency\s+UNDP\b/i.test(chunk))continue;
    const deadline=dateFrom(chunk);if(!deadline||deadline<today)continue;
    const location=locationFrom(chunk),id=undpJobId(url);seen.add(id);
    out.push({title:title||`UNDP Internship ${id}`,url,location,deadline,source:cfg.name,quality:'vacancy-candidate',evidence_scope:'official-undp-board-row',status_verified:false,verification_level:'board-only',board_context:chunk.slice(0,1800)});
    if(out.length>=12)break;
  }
  return out;
}
async function fetchHtml(url,timeout=12000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const r=await fetch(url,{signal:controller.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36 OpportunityMatcher/1.0','Accept':'text/html,application/xhtml+xml','Accept-Language':'en-GB,en;q=0.9','Cache-Control':'no-cache'}});
    if(!r.ok)throw new Error(`Official page returned HTTP ${r.status}`);
    const html=await r.text();if(html.length<150)throw new Error('Official page returned too little content');
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
async function verifyUndpOpening(opening,cfg){
  try{
    const target=new URL(opening.url),id=undpJobId(target.toString()),today=new Date().toISOString().slice(0,10);if(!id||target.hostname.replace(/^www\./,'')!==cfg.exactHost||!opening.deadline||opening.deadline<today)return null;
    const f=await fetchHtml(opening.url,12000),final=new URL(f.url),finalId=undpJobId(final.toString());if(final.hostname.replace(/^www\./,'')!==cfg.exactHost||finalId!==id)return null;
    const plain=text(f.html),explicit=/job (?:is|has been) no longer available|no longer accepting applications|applications? (?:are|is) (?:now )?closed|position has been filled/i.test(plain);if(explicit)return null;
    const detailText=`${opening.title}. ${opening.location?`Location ${opening.location}. `:''}Apply by ${opening.deadline}. ${UNDP_INTERNSHIP_POLICY}`;
    return{...opening,url:final.toString(),status_verified:true,status_source:'undp-current-board-plus-exact-oracle-job',verification_level:'exact',quality:'status-verified-vacancy',detail_text:detailText,detail_evidence_quality:'medium',detail_scope:'official-board+undp-internship-policy'};
  }catch{return null}
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
  if(cfg.adapter==='undp'){
    const checked=await Promise.all(openings.slice(0,12).map(x=>verifyUndpOpening(x,cfg)));
    return{openings:checked.filter(Boolean),adapter_state:'exact',withheld:checked.filter(Boolean).length<openings.slice(0,12).length};
  }
  if(cfg.adapter==='ebrd'){
    const checked=await Promise.all(openings.slice(0,10).map(verifyEbrdOpening));
    return{openings:checked.filter(Boolean),adapter_state:'exact',withheld:checked.filter(Boolean).length<openings.slice(0,10).length};
  }
  return{openings:openings.map(x=>({...x,status_verified:false,verification_level:'board-only'})),adapter_state:'board-only',withheld:false};
}
async function fetchBoard(cfg){
  const result=await fetchHtml(cfg.board,18000),candidates=cfg.adapter==='undp'?extractUndp(result.html,cfg):extract(result.html,cfg),verified=await verifyProviderOpenings(candidates,cfg);
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
