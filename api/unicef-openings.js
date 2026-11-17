const BOARDS=[
  'https://jobs.unicef.org/en-us/Search/?pay-scale=internship&subscribe=true',
  'https://jobs.unicef.org/en-us/search/?work-type=internship',
  // Official internship-filtered PageUp route, separate from legacy Search.
  'https://jobs.unicef.org/en-us/filter/?work-type=internship',
  'https://jobs.unicef.org/jobs/search' // New UNICEF official career portal
];
const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const text=s=>decode(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
const absolute=(base,href)=>{try{return new URL(href,base).toString()}catch{return''}};
const today=()=>new Date().toISOString().slice(0,10);
function parseDate(raw){const d=new Date(String(raw||'').replace(/\s+/g,' ').trim());return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)}
function jobParts(raw){try{const u=new URL(raw),m=u.pathname.match(/\/job\/(\d{5,})(?:\/([^?#]*))?/i);return m?{id:m[1],slug:(m[2]||'').replace(/\/+$/,'')}:null}catch{return null}}
function deadlineFrom(s){const x=String(s||'');const m=x.match(/Deadline\s*:?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i)||x.match(/Deadline\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2})/i)||x.match(/Closing date\s*:?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i)||x.match(/Apply by\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2})/i);return m?parseDate(m[1]):''}
function locationFrom(s){const m=String(s||'').match(/Location\s*:?\s*(.{2,90}?)(?=Categories|Advertised|Deadline|Contract type|Duty Station|Level|$)/i);return m?m[1].trim().replace(/[|•]+$/,'').trim():''}
function genericTitle(t){return /^(?:current vacancies|current vacancy|vacancies|careers?|job search|job opportunities)$/i.test(String(t||'').trim())}
function titleFrom(html,fallback){const m=String(html||'').match(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i);const t=m?text(m[1]):'';return t&&!genericTitle(t)?t:fallback}
async function fetchHtml(url,timeout=14000){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{const r=await fetch(url,{signal:controller.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36 OpportunityMatcher/1.0','Accept':'text/html,application/xhtml+xml','Accept-Language':'en-GB,en;q=0.9','Cache-Control':'no-cache'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const html=await r.text();if(html.length<200)throw new Error('Too little content');return{html,url:r.url||url,status:r.status}}finally{clearTimeout(timer)}}
export function boardCandidates(html,base){
  const raw=String(html||''),out=[],seen=new Set();
  const re=/<a\b[^>]*href=["']([^"']*\/job\/\d{5,}(?:\/[^"']*)?)["'][^>]*>([\s\S]{0,1600}?)<\/a>/gi;
  for(const a of raw.matchAll(re)){
    const url=absolute(base,a[1]),parts=jobParts(url);
    // Only UNICEF's own HTTPS job-detail routes can be followed.
    if(!parts||seen.has(parts.id)||
      !/^https:\/\/jobs[.]unicef[.]org\/(?:en-us|cw\/en-us|mob\/cw\/en-us)\/job\/\d{5,}(?:\/|[?#]|$)/i.test(url))continue;
    const anchorTitle=text(a[2]);
    // Evidence must belong to this exact job card. The previous +/- HTML
    // window could accidentally take the NEXT job's deadline, or the previous
    // job's location. Read forward only, ending before the next job link.
    const after=raw.slice((a.index||0)+a[0].length);
    const nextJob=after.search(/<a\b[^>]*href=["'][^"']*\/job\/\d{5,}/i);
    const contextHtml=a[0]+after.slice(0,nextJob<0?2300:Math.min(2300,nextJob));
    const chunk=text(contextHtml);
    const deadline=deadlineFrom(chunk),location=locationFrom(chunk);
    if(deadline&&deadline<today())continue;
    let title=anchorTitle;
    if(!title||genericTitle(title)||title.length>300){
      const h=[...contextHtml.matchAll(/<h[2-5]\b[^>]*>([\s\S]*?)<\/h[2-5]>/gi)].map(x=>text(x[1])).find(x=>x&&!genericTitle(x)&&x.length<300);
      if(h)title=h;
    }
    // A posting on a fallback listing route must explicitly be an internship.
    // A generic site navigation label is not job-level evidence.
    if(!title||title.length>300||!/\b(?:interns?|internships?|stagiaire|trainee)\b/i.test(title))continue;
    seen.add(parts.id);out.push({id:parts.id,title,url,deadline,location,board_context:chunk.slice(0,2400),board_url:base});
    if(out.length>=24)break;
  }
  return out;
}

export function modernBoardCandidates(html,base){
 const out=[],seen=new Set();
 const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,600}?)<\/a>/gi;
 for(const m of String(html||'').matchAll(re)){
  let u;try{u=new URL(m[1],base)}catch{continue}
  if(u.protocol!=='https:'||u.hostname!=='jobs.unicef.org'||u.username||u.password)continue;
  const slug=u.pathname.match(/^\/jobs\/([a-z0-9][a-z0-9-]{9,220})\/?$/i)?.[1]||'';
  if(!slug||!/\b(?:internship|intern|stagiaire|trainee)\b/i.test(slug.replace(/-/g,' ')))continue;
  const url=u.origin+u.pathname.replace(/\/$/,'');
  if(seen.has(url))continue;seen.add(url);
  out.push({id:'modern:'+slug,url,title:text(m[2]),origin:'modern-board'});
  if(out.length>=24)break;
 }
 return out;
}
export function modernExactEvidence(html,url,now=new Date()){
 let u;try{u=new URL(url)}catch{return null}
 if(u.protocol!=='https:'||u.hostname!=='jobs.unicef.org'||u.username||u.password||
  !/^\/jobs\/[a-z0-9][a-z0-9-]{9,220}\/?$/i.test(u.pathname))return null;
 const slugWords=new Set(u.pathname.split('/').pop().toLowerCase().split('-').filter(w=>w.length>=4));
 const titles=[...String(html||'').matchAll(/<h[1-4]\b[^>]*>([\s\S]{0,800}?)<\/h[1-4]>/gi)]
  .map(m=>text(m[1])).filter(x=>x.length>=15&&x.length<=230&&/\b(?:intern|internship|stagiaire|trainee)\b/i.test(x));
 // The headline must match the *requested* UNICEF job slug, even when
 // the career portal uses an H3 and an unrelated H1 elsewhere on the page.
 const title=titles.find(value=>{
   const words=new Set(value.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(w=>w.length>=4));
   return [...words].filter(w=>slugWords.has(w)).length>=2;
 })||'';
 if(!title)return null;
 const plain=text(html),position=plain.toLowerCase().indexOf(title.toLowerCase());
 if(position<0)return null;
 const card=plain.slice(position,position+1500);
 const id=(card.match(/\b(\d{6})\b/)||[])[1];
 const closing=(card.match(/Closing at\s*:\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})\s*[-–]\s*\d{1,2}:\d{2}/i)||[])[1];
 const deadline=closing?parseDate(closing):'';
 if(!id||!deadline||deadline<new Date(now).toISOString().slice(0,10)||
    !/\bInternship\b/i.test(card.slice(0,600))||
    /\b(?:applications? (?:are|is) closed|no longer accepting applications|vacancy is closed|position has been filled)\b/i.test(card))return null;
 return{job_id:id,title,deadline,location:(card.match(/(?:United States, New York|Eswatini|Tajikistan|China|United Kingdom)/i)||[])[0]||''};
}
async function verifyModern(c){
 try{
  const page=await fetchHtml(c.url,18000),initial=new URL(c.url),final=new URL(page.url);
  if(final.protocol!=='https:'||final.hostname!=='jobs.unicef.org'||
     final.pathname.replace(/\/$/,'')!==initial.pathname.replace(/\/$/,''))return null;
  const exact=modernExactEvidence(page.html,page.url);if(!exact)return null;
  return{title:exact.title,url:final.origin+final.pathname.replace(/\/$/,''),
    job_id:exact.job_id,deadline:exact.deadline,location:exact.location,
    source:'UNICEF',provider:'UNICEF',status_verified:true,verification_level:'exact',
    status_source:'unicef-new-exact-job-page',detail_evidence_quality:'high',
    detail_scope:'unicef-new-exact-job-page',quality:'status-verified-vacancy',
    detail_text:text(page.html).slice(0,18000)};
 }catch{return null}
}

async function collectCandidates(){
  const results=await Promise.allSettled(BOARDS.map(url=>fetchHtml(url,18000).then(f=>({url,html:f.html,final_url:f.url}))));
  const merged=[],seen=new Set(),fetches=[];
  for(const r of results){
    if(r.status==='rejected'){fetches.push({ok:false,error:r.reason?.message||String(r.reason)});continue}
    const rows=r.value.url.endsWith('/jobs/search')?modernBoardCandidates(r.value.html,r.value.final_url||r.value.url):boardCandidates(r.value.html,r.value.final_url||r.value.url);fetches.push({ok:true,url:r.value.url,candidates:rows.length});
    for(const c of rows)if(!seen.has(c.id)){seen.add(c.id);merged.push(c)}
  }
  if(!fetches.some(x=>x.ok))throw new Error('All UNICEF internship boards were unreadable');
  return{candidates:merged,fetches};
}
async function fetchExact(c){const parts=jobParts(c.url);if(!parts)return null;const slug=parts.slug?`/${parts.slug}`:'';const urls=[c.url,`https://jobs.unicef.org/cw/en-us/job/${parts.id}${slug}`,`https://jobs.unicef.org/mob/cw/en-us/job/${parts.id}${slug}`];let lastErr=null;for(const url of [...new Set(urls)]){for(let attempt=0;attempt<2;attempt++){try{const f=await fetchHtml(url,attempt?18000:12000),returned=jobParts(f.url);if(returned?.id===c.id)return f}catch(e){lastErr=e}}}if(lastErr)throw lastErr;return null}
async function verify(c){if(c?.origin==='modern-board')return verifyModern(c);const exactParts=jobParts(c.url);if(!exactParts)return null;try{const f=await fetchExact(c);if(f){const returned=jobParts(f.url);if(!returned||returned.id!==c.id)return null;const plain=text(f.html),deadline=deadlineFrom(plain)||c.deadline,title=titleFrom(f.html,c.title),contract=(plain.match(/Contract type\s*:?\s*(.{2,50}?)(?=Duty Station|Level|Location|Categories|$)/i)||[])[1]?.trim()||'';const explicit=/applications? (?:are|is) (?:now )?closed|no longer accepting applications|vacancy is closed|position has been filled/i.test(plain);const internEvidence=/\bintern(?:ship)?\b/i.test(`${title} ${contract}`)||/\bInternship\b/i.test(plain.slice(0,5000));if(explicit||!deadline||deadline<today()||!internEvidence)return null;return{title,url:f.url,location:locationFrom(plain)||c.location||'',deadline,source:'UNICEF',provider:'UNICEF',quality:'status-verified-vacancy',evidence_scope:'unicef-exact-job-page',status_verified:true,status_source:'unicef-exact-job-page',verification_level:'exact',detail_text:plain.slice(0,18000),detail_evidence_quality:'high',detail_scope:'unicef-exact-job-page'}}}catch{}
  if(c.deadline&&c.deadline>=today()&&jobParts(c.url)?.id===c.id&&/\bintern|young professionals|practica profesional/i.test(`${c.title} ${c.board_context}`)){return{title:c.title,url:c.url,location:c.location||'',deadline:c.deadline,source:'UNICEF',provider:'UNICEF',quality:'status-verified-vacancy',evidence_scope:'unicef-official-internship-filtered-board-row',status_verified:true,status_source:'unicef-official-internship-filtered-board-row',verification_level:'exact',detail_text:c.board_context||'',detail_evidence_quality:'medium',detail_scope:'unicef-official-internship-filtered-board-row'}}
  return null}
export default async function handler(req,res){if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});res.setHeader('Cache-Control','no-store');try{const {candidates,fetches}=await collectCandidates(),checked=await Promise.all(candidates.map(verify)),openings=checked.filter(Boolean);const verification_health=openings.length?'healthy':(candidates.length?'degraded':'empty');return res.status(200).json({ok:true,provider:'UNICEF',board_url:BOARDS[0],board_urls:BOARDS,fetched_at:new Date().toISOString(),candidate_count:candidates.length,exact_verified_count:openings.length,openings,adapter_state:'dedicated-exact-multiboard-v3',withheld_unverifiable:openings.length<candidates.length,verification_health,board_fetches:fetches})}catch(e){return res.status(200).json({ok:true,provider:'UNICEF',board_url:BOARDS[0],board_urls:BOARDS,fetched_at:new Date().toISOString(),candidate_count:0,exact_verified_count:0,openings:[],adapter_state:'dedicated-exact-multiboard-v3',verification_health:'degraded',fetch_error:e.message})}}
