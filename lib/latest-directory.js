import {restrictionFromTitle} from './public-opportunity-seo.js';
// Public directory facts: only an exact, recently verified posting is described as open.
export const sourceUrl=(raw)=>{
 try {
  const u=new URL(String(raw||''));
  if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||!u.hostname.includes('.')||
     /^(?:localhost|.*\.local|.*\.internal)$/i.test(u.hostname)||/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname))return '';
  u.hash='';return u.href;
 }catch{return ''}
};
export const categoryOf=(title='',kind='')=>{
 const precise=String(kind).trim().toLowerCase();
 if(precise==='job'||precise==='employment'||precise==='job roster')return 'other';
 if(precise==='internship')return 'internships';
 if(precise==='fellowship')return 'fellowships';
 if(precise==='scholarship')return 'scholarships';
 if(precise==='us federal grant'||precise==='grant')return 'grants';
 const s=String(title);
 if(/\b(internships?|interns?|traineeships?|studentships? placements?)\b/i.test(s))return 'internships';
 if(/\b(fellowships?|research fellows?)\b/i.test(s))return 'fellowships';
 if(/\b(scholarships?|studentships?|bursaries)\b/i.test(s))return 'scholarships';
 if(/\b(grants?|research awards?|funding)\b/i.test(s))return 'grants';
 return 'other';
};
const normalized=url=>{try{const u=new URL(url);return u.hostname.replace(/^www\./,'').toLowerCase()+u.pathname.replace(/\/+$/,'').toLowerCase()}catch{return ''}};
export function preparedListings({vacancies=[],calls=[],sources=[]},now=new Date()){
 const date=now.getTime(),entries=[];
 for(const v of vacancies){
  const url=sourceUrl(v.source_url),checked=Date.parse(v.last_verified_at),deadline=Date.parse(v.deadline_at);
  if(!url||!Number.isFinite(checked)||!Number.isFinite(deadline)||checked>date+300000||
   checked<date-7*86400000||deadline<=date||v.status!=='open'||v.status_verified!==true||
   v.verification_level!=='exact'||!/^\d{3,15}$/.test(String(v.provider_job_id||'')))continue;
  entries.push({level:3,type:'Verified live vacancy',title:v.title,provider:v.provider,url,
   checked_at:v.last_verified_at,first_seen_at:v.first_seen_at,deadline_at:v.deadline_at,
   detail_url:'/opportunities/'+String(v.provider||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+v.provider_job_id,
   category:categoryOf(v.title,v.opportunity_type),location:v.location||null,restriction:restrictionFromTitle(v.title)});
 }
 for(const c of calls){
  const url=sourceUrl(c.source_url),checked=Date.parse(c.last_checked_at),deadline=Date.parse(c.closing_at);
  if(!url||c.status!=='open'||!Number.isFinite(checked)||checked>date+300000||
    checked<date-48*3600000||!Number.isFinite(deadline)||deadline<=date)continue;
  entries.push({level:2,type:'Official call advertised open',title:c.title,provider:c.provider,url,
   checked_at:c.last_checked_at,first_seen_at:c.created_at,deadline_at:c.closing_at,
   category:categoryOf(c.title),location:null});
 }
 for(const s of sources){
  // Historical source-only records remain in the database for audit, but
  // search results and explicitly closed schemes should not attract applicants.
  if(/^(?:search results?|results for|search listings?)\b/i.test(String(s.title||'').trim())||
     /\(\s*(?:closed|archived|expired|discontinued)\s*\)/i.test(String(s.title||'')))continue;
  const url=sourceUrl(s.canonical_url),checked=Date.parse(s.verified_page_at);
  if(!url||s.source_status!=='source_confirmed'||!Number.isFinite(checked)||
    checked>date+300000||checked<date-30*86400000)continue;
  if(s.opportunity_kind==='official internship vacancy'){
    const end=Date.parse(String(s.application_deadline||'')+'T23:59:59Z');
    if(!Number.isFinite(end)||end<=date||checked<date-36*3600000)continue;
  }
  entries.push({level:1,type:'Official programme page',title:s.title,provider:s.provider,url,
   checked_at:s.verified_page_at,first_seen_at:s.created_at,deadline_at:null,
   category:categoryOf(s.title,s.opportunity_kind),location:null});
 }
 // Give the stronger form of evidence precedence if an official URL appears in two feeds.
 entries.sort((a,b)=>b.level-a.level||Date.parse(b.checked_at)-Date.parse(a.checked_at));
 const seen=new Set();
 return entries.filter(x=>{
  // An open record with a whitespace-only title or provider is not a usable
  // public vacancy. Keep it in storage for re-ingestion and audit instead.
  // Minimum title length matches the live-vacancy publishing rule.
  if(String(x.title??'').trim().length < (x.level===3?8:3)||
     !String(x.provider??'').trim()||!x.url)return false;
  const key=normalized(x.url);if(!key||seen.has(key))return false;seen.add(key);return true;
 }).sort((a,b)=>Date.parse(b.checked_at)-Date.parse(a.checked_at)||b.level-a.level);
}
