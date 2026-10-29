import crypto from 'node:crypto';
import {canonicalUrl} from './auto-discovery.js';
const PROVIDER_HOSTS={
 UNDP:['estm.fa.em2.oraclecloud.com'],
 WFP:['wd3.myworkdaysite.com','wfp.wd3.myworkdayjobs.com'],
 UNOPS:['careers.unops.org'],
 UNICEF:['jobs.unicef.org'],
 FAO:['jobs.fao.org']
};
export function verifiedInternship(record,provider,checkedAt=new Date()){
 if(!Object.hasOwn(PROVIDER_HOSTS,provider))return null;
 if(record?.status_verified!==true||record?.verification_level!=='exact')return null;
 if(String(record?.source||'').toUpperCase()!==provider)return null;
 const url=canonicalUrl(record?.url);
 if(!url)return null;
 const parsed=new URL(url);
 if(!PROVIDER_HOSTS[provider].includes(parsed.hostname.toLowerCase()))return null;
 const pathname=parsed.pathname;
 if(provider==='UNDP'&&!/\/hcmUI\/CandidateExperience\/en\/sites\/CX_1\/job\/\d+\/?$/i.test(pathname))return null;
 if(provider==='WFP'&&!((parsed.hostname==='wd3.myworkdaysite.com'&&/^\/recruiting\/wfp\/job_openings\/job\/[A-Za-z0-9_./-]+$/i.test(pathname))||(parsed.hostname==='wfp.wd3.myworkdayjobs.com'&&/^\/en-US\/job_openings\/job\/[A-Za-z0-9_./-]+$/i.test(pathname))))return null;
 if(provider==='UNOPS'&&!/\/careersmarketplace\/JobDetail\/[^/]+\/\d+\/?$/i.test(pathname))return null;
 // UNICEF job IDs are stable and the English-language listing path is public.
 if(provider==='UNICEF'&&!/^\/(?:en-us|cw\/en-us|mob\/cw\/en-us)\/job\/\d{5,}(?:\/[^/?]*)?$/i.test(pathname))return null;
 // FAO individual Taleo jobs have an exact, provider-issued requisition ID.
 // General searches, other job families and generic information pages are excluded.
 if(provider==='FAO'&&!(pathname.toLowerCase()==='/careersection/fao_external/jobdetail.ftl' &&
   /^\d{7,10}$/.test(parsed.searchParams.get('job')||'')))return null;
 const title=String(record?.title||'').replace(/\s+/g,' ').trim();
 if(title.length<15||title.length>230||
   /^(?:internship programme|internship|traineeship programme|intern programme)$/i.test(title)||
   !/\b(?:interns?|internships?|stagiaire|trainees?|traineeships?)\b/i.test(title))return null;
 const deadline=String(record?.deadline||'').trim();
 if(!/^20\d{2}-\d\d-\d\d$/.test(deadline))return null;
 const iso=new Date(deadline+'T12:00:00Z');
 if(Number.isNaN(iso.getTime())||iso.toISOString().slice(0,10)!==deadline)return null;
 const today=new Date(checkedAt).toISOString().slice(0,10);
 if(deadline<today)return null;
 const location=String(record?.location||'').replace(/\s+/g,' ').trim().slice(0,120);
 const evidence={source:'Official exact-job vacancy adapter',
   opportunity_kind:'official internship vacancy',
   source_provider:provider,source_detail_quality:String(record?.detail_evidence_quality||'unknown').slice(0,30),
   source_checked_at:new Date(checkedAt).toISOString(),
   official_host:parsed.hostname,official_job_id:String(record?.job_id||(
     provider==='UNICEF'?(pathname.match(/\/job\/(\d{5,})/i)||[])[1]:
     provider==='FAO'?(parsed.searchParams.get('job')||''):''
   )||'').slice(0,40),
   application_deadline:deadline,location,
   verified_page_status:'open',
   status_source:String(record?.status_source||'exact-official-adapter').slice(0,90),
   guarantees:['exact_job_record_exists','provider_reports_current_deadline'],
   unverified:['citizenship','education','field','work_authorisation'],
   matching_approved:false};
 return {title,provider,canonical_url:url,
  evidence_hash:crypto.createHash('sha256').update(JSON.stringify({url,title,deadline,provider,location})).digest('hex'),
  evidence,checked_at:new Date(checkedAt).toISOString()};
}
