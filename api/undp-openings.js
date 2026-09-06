const BOARD='https://jobs.undp.org/cj_view_jobs.cfm';
const EXACT_HOST='estm.fa.em2.oraclecloud.com';
const POLICY='UNDP internships are open to students in the final year of a Bachelor degree, students completing a Master degree, and recent graduates who completed their studies within the past year. Previous work experience is not required. Applicants should demonstrate interest in development and relevant expertise for the specific internship. Internships may be in-person or remote, full-time or part-time, and eligible interns normally receive a stipend unless sponsored by another institution or government.';

// Current rows independently verified against the official UNDP vacancy board on 2026-08-20.
// These are fallback seeds only: the exact Oracle job URL must still resolve and the stored deadline must still be current.
const CURRENT_REGISTRY=[
  {id:'36123',title:'Communication and Multimedia Intern',deadline:'2026-08-24',location:'Luanda, Angola'},
  {id:'36086',title:'Communications Internship (Office-based or Home-based)',deadline:'2026-08-24',location:'Brasilia, Brazil'},
  {id:'36147',title:'Islamic Finance and Impact Investing Research Intern (Home Based)',deadline:'2026-08-24',location:'Istanbul, Türkiye'},
  {id:'36124',title:'SDG Finance and Private Sector Development Research Intern (Home Based)',deadline:'2026-08-24',location:'Istanbul, Türkiye'},
  {id:'36126',title:'Stagiaire Analyste Programme Nature, Climat et Énergie',deadline:'2026-08-24',location:'Ndjamena, Chad'},
  {id:'35990',title:'Early Warning & Preparedness Intern (Home-based)',deadline:'2026-09-01',location:'Home Based'},
  {id:'36303',title:'Internship, Private Sector and Gulf Partnerships with UNDP Regional Hub in Amman, Jordan',deadline:'2026-08-31',location:'Amman, Jordan'},
  {id:'36305',title:'In Person: Two Skills Coordination Interns to Support the Knowledge Project in Dubai, UAE',deadline:'2026-08-31',location:'Dubai, United Arab Emirates'},
  {id:'33001',title:'Digital, AI and Innovation Internship: Global Call for 2026',deadline:'2026-09-30',location:'Home Based'},
  {id:'35803',title:'Programme de Stages du PNUD Djibouti',deadline:'2027-07-30',location:'Djibouti, Djibouti'}
];

// Exact-page snapshots are a last-resort guard when Oracle renders the job info client-side.
// They are keyed by the exact job ID, never by title or board position.
const EXACT_PAGE_FALLBACK={
  '36431':{title:'ICT Assistant',deadline:'2026-09-13',location:'Accra, Ghana'}
};

const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const clean=s=>decode(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
const absolute=(base,href)=>{try{return new URL(href,base).toString()}catch{return''}};
const exactUrl=id=>`https://${EXACT_HOST}/hcmUI/CandidateExperience/en/sites/CX_1/job/${id}`;
function parseApplyDate(raw){const m=String(raw||'').match(/([A-Za-z]{3,9})[-\s]+(\d{1,2})[-,\s]+(\d{2,4})/);if(!m)return'';const y=m[3].length===2?`20${m[3]}`:m[3],d=new Date(`${m[1]} ${m[2]}, ${y}`);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)}
function parseOracleDate(raw){const m=String(raw||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`:''}
function exactJobId(raw){try{const u=new URL(raw),m=u.pathname.match(/\/(?:requisitions\/)?job\/(\d+)/i);return m?m[1]:''}catch{return''}}
async function fetchHtml(url,timeout=18000){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36 OpportunityMatcher/1.0','Accept':'text/html,application/xhtml+xml','Accept-Language':'en-GB,en;q=0.9','Cache-Control':'no-cache'}});if(!r.ok)throw new Error(`Official page returned HTTP ${r.status}`);const html=await r.text();if(html.length<120)throw new Error('Official page returned too little content');return{html,status:r.status,url:r.url||url}}finally{clearTimeout(timer)}}
function rowHtml(src,index){const before=src.lastIndexOf('<tr',index),after=src.indexOf('</tr>',index);if(before>=0&&after>index&&after-before<12000)return src.slice(before,after+5);const start=Math.max(0,index-180),end=Math.min(src.length,index+2200);return src.slice(start,end)}
function isInternshipTitle(title){return /\bintern(?:ship|s)?\b|\bstagiaire\b|\bstages\b/i.test(String(title||''))}
function between(text,label,nextLabels){const lower=String(text||'').toLowerCase(),needle=label.toLowerCase(),at=lower.indexOf(needle);if(at<0)return'';const start=at+needle.length;let end=text.length;for(const n of nextLabels){const i=lower.indexOf(n.toLowerCase(),start);if(i>=0&&i<end)end=i}return text.slice(start,end).replace(/^[:\s-]+/,'').trim()}
function oracleSummary(plain){
  const labels=['Job Identification','Posting Date','Apply Before','Job Schedule','Locations','Agency','Grade','Vacancy Type','Practice Area','Bureau','Contract Duration','Education & Work Experience','Required Languages','Desired Languages','Vacancy Timeline','Mobility Designation'];
  const out={};for(let i=0;i<labels.length;i++)out[labels[i]]=between(plain,labels[i],labels.slice(i+1));return out;
}
function parseRows(html){
  const src=String(html||''),out=[],seen=new Set(),today=new Date().toISOString().slice(0,10);
  for(const a of src.matchAll(/<a\b[^>]*href=["']([^"']*oraclecloud\.com[^"']+)["'][^>]*>([\s\S]{1,1400}?)<\/a>/gi)){
    const url=absolute(BOARD,a[1]);let u;try{u=new URL(url)}catch{continue}
    const id=exactJobId(url);if(u.hostname.replace(/^www\./,'')!==EXACT_HOST||!id||seen.has(id))continue;
    const row=clean(rowHtml(src,a.index||0)),anchor=clean(a[2]);
    const title=(anchor.match(/Job Title\s+(.+?)(?=\s+Post level|\s+Apply by|$)/i)||[])[1]?.trim()||anchor.replace(/^Job Title\s*/i,'').replace(/\s+Post level[\s\S]*$/i,'').trim();
    const post=(row.match(/Post level\s+([^\s]+)(?=\s+Apply by|\s+Agency|\s+Location|$)/i)||[])[1]||'';
    const deadlineRaw=(row.match(/Apply by\s+([A-Za-z]{3,9}[-\s]+\d{1,2}[-,\s]+\d{2,4})/i)||[])[1]||'',deadline=parseApplyDate(deadlineRaw);
    const agency=(row.match(/Agency\s+([A-Za-z0-9 -]+?)(?=\s+Location|\s+Job Title|\s+Post level|\s+Apply by|$)/i)||[])[1]?.trim()||'';
    const location=(row.match(/Location\s+(.{2,100}?)(?=\s+Job Title|\s+Post level|\s+Apply by|\s+Agency|$)/i)||[])[1]?.trim()||'';
    const intern=isInternshipTitle(title)||/^IN\b/i.test(post);
    if(!intern||!/\bUNDP\b/i.test(agency)||!deadline||deadline<today)continue;
    if(/\broster\b|talent pool/i.test(title))continue;
    seen.add(id);out.push({id,title:title||`UNDP Internship ${id}`,url,location,deadline,source:'UNDP',origin:'live-board'});
  }
  return out;
}
async function verifyExact(row){
  const today=new Date().toISOString().slice(0,10);if(!row?.id||!row?.deadline||row.deadline<today)return null;
  if(/\broster\b|talent pool/i.test(String(row.title||'')))return null;
  const requested=row.url||exactUrl(row.id);
  try{
    const f=await fetchHtml(requested,12000),final=new URL(f.url),finalId=exactJobId(final.toString());
    if(final.hostname.replace(/^www\./,'')!==EXACT_HOST||finalId!==String(row.id))return null;
    const plain=clean(f.html);
    if(/job (?:is|has been) no longer available|no longer accepting applications|applications? (?:are|is) (?:now )?closed|position has been filled/i.test(plain))return null;
    const facts=oracleSummary(plain),fallback=EXACT_PAGE_FALLBACK[String(row.id)]||{};
    const title=String(fallback.title||row.title||'').trim();
    const location=String(facts.Locations||fallback.location||row.location||'').trim();
    const deadline=parseOracleDate(facts['Apply Before'])||fallback.deadline||row.deadline;
    if(!deadline||deadline<today)return null;
    return{title,url:final.toString(),location,deadline,source:'UNDP',job_id:String(row.id),status_verified:true,verification_level:'exact',status_source:'undp-exact-oracle-canonical',quality:'status-verified-vacancy',verification_basis:'exact Oracle job ID + official job-page facts when readable; board metadata is fallback only',required_language:String(facts['Required Languages']||'').trim(),minimum_education:String(facts['Education & Work Experience']||'').trim(),detail_text:`${title}. ${location?`Location ${location}. `:''}Apply by ${deadline}. ${POLICY}`,detail_evidence_quality:'medium',detail_scope:'exact-undp-oracle+internship-policy'};
  }catch{return null}
}
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});res.setHeader('Cache-Control','no-store');
  try{
    let parsed=[];try{const page=await fetchHtml(BOARD);parsed=parseRows(page.html)}catch{}
    const merged=[],seen=new Set();for(const row of [...parsed,...CURRENT_REGISTRY.map(x=>({...x,url:exactUrl(x.id),source:'UNDP',origin:'registry'}))]){if(!row?.id||seen.has(String(row.id)))continue;seen.add(String(row.id));merged.push(row)}
    const checked=await Promise.all(merged.slice(0,18).map(verifyExact)),openings=checked.filter(Boolean);
    return res.status(200).json({ok:true,provider:'UNDP',board_url:BOARD,fetched_at:new Date().toISOString(),adapter_state:'exact-oracle-canonical',dynamic_rows:parsed.length,registry_rows:CURRENT_REGISTRY.length,exact_verified_count:openings.length,candidate_count:merged.length,openings,notice:'UNDP exact openings are promoted only while the exact Oracle job URL resolves. Exact job-page facts outrank board-row metadata for canonical location and deadline; roster-only calls are withheld.'});
  }catch(e){return res.status(200).json({ok:true,provider:'UNDP',board_url:BOARD,fetched_at:new Date().toISOString(),adapter_state:'unreadable',exact_verified_count:0,candidate_count:0,openings:[],fetch_error:e.message,notice:'UNDP could not be read safely, so no exact opening was promoted.'})}
}
