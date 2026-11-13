const BOARDS=[
  'https://jobs.unicef.org/en-us/Search/?pay-scale=internship&subscribe=true',
  'https://jobs.unicef.org/en-us/search/?work-type=internship',
  // Official internship-filtered PageUp route, separate from legacy Search.
  'https://jobs.unicef.org/en-us/filter/?work-type=internship'
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
    const url=absolute(base,a[1]),parts=jobParts(url);if(!parts||seen.has(parts.id))continue;
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
async function collectCandidates(){
  const results=await Promise.allSettled(BOARDS.map(url=>fetchHtml(url,18000).then(f=>({url,html:f.html,final_url:f.url}))));
  const merged=[],seen=new Set(),fetches=[];
  for(const r of results){
    if(r.status==='rejected'){fetches.push({ok:false,error:r.reason?.message||String(r.reason)});continue}
    const rows=boardCandidates(r.value.html,r.value.final_url||r.value.url);fetches.push({ok:true,url:r.value.url,candidates:rows.length});
    for(const c of rows)if(!seen.has(c.id)){seen.add(c.id);merged.push(c)}
  }
  if(!fetches.some(x=>x.ok))throw new Error('All UNICEF internship boards were unreadable');
  return{candidates:merged,fetches};
}
async function fetchExact(c){const parts=jobParts(c.url);if(!parts)return null;const slug=parts.slug?`/${parts.slug}`:'';const urls=[c.url,`https://jobs.unicef.org/cw/en-us/job/${parts.id}${slug}`,`https://jobs.unicef.org/mob/cw/en-us/job/${parts.id}${slug}`];let lastErr=null;for(const url of [...new Set(urls)]){for(let attempt=0;attempt<2;attempt++){try{const f=await fetchHtml(url,attempt?18000:12000),returned=jobParts(f.url);if(returned?.id===c.id)return f}catch(e){lastErr=e}}}if(lastErr)throw lastErr;return null}
async function verify(c){const exactParts=jobParts(c.url);if(!exactParts)return null;try{const f=await fetchExact(c);if(f){const returned=jobParts(f.url);if(!returned||returned.id!==c.id)return null;const plain=text(f.html),deadline=deadlineFrom(plain)||c.deadline,title=titleFrom(f.html,c.title),contract=(plain.match(/Contract type\s*:?\s*(.{2,50}?)(?=Duty Station|Level|Location|Categories|$)/i)||[])[1]?.trim()||'';const explicit=/applications? (?:are|is) (?:now )?closed|no longer accepting applications|vacancy is closed|position has been filled/i.test(plain);const internEvidence=/\bintern(?:ship)?\b/i.test(`${title} ${contract}`)||/\bInternship\b/i.test(plain.slice(0,5000));if(explicit||!deadline||deadline<today()||!internEvidence)return null;return{title,url:f.url,location:locationFrom(plain)||c.location||'',deadline,source:'UNICEF',provider:'UNICEF',quality:'status-verified-vacancy',evidence_scope:'unicef-exact-job-page',status_verified:true,status_source:'unicef-exact-job-page',verification_level:'exact',detail_text:plain.slice(0,18000),detail_evidence_quality:'high',detail_scope:'unicef-exact-job-page'}}}catch{}
  if(c.deadline&&c.deadline>=today()&&jobParts(c.url)?.id===c.id&&/\bintern|young professionals|practica profesional/i.test(`${c.title} ${c.board_context}`)){return{title:c.title,url:c.url,location:c.location||'',deadline:c.deadline,source:'UNICEF',provider:'UNICEF',quality:'status-verified-vacancy',evidence_scope:'unicef-official-internship-filtered-board-row',status_verified:true,status_source:'unicef-official-internship-filtered-board-row',verification_level:'exact',detail_text:c.board_context||'',detail_evidence_quality:'medium',detail_scope:'unicef-official-internship-filtered-board-row'}}
  return null}
export default async function handler(req,res){if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});res.setHeader('Cache-Control','no-store');try{const {candidates,fetches}=await collectCandidates(),checked=await Promise.all(candidates.map(verify)),openings=checked.filter(Boolean);const verification_health=openings.length?'healthy':(candidates.length?'degraded':'empty');return res.status(200).json({ok:true,provider:'UNICEF',board_url:BOARDS[0],board_urls:BOARDS,fetched_at:new Date().toISOString(),candidate_count:candidates.length,exact_verified_count:openings.length,openings,adapter_state:'dedicated-exact-multiboard-v2',withheld_unverifiable:openings.length<candidates.length,verification_health,board_fetches:fetches})}catch(e){return res.status(200).json({ok:true,provider:'UNICEF',board_url:BOARDS[0],board_urls:BOARDS,fetched_at:new Date().toISOString(),candidate_count:0,exact_verified_count:0,openings:[],adapter_state:'dedicated-exact-multiboard-v2',verification_health:'degraded',fetch_error:e.message})}}
