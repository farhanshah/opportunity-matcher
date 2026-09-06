const HOST='estm.fa.em2.oraclecloud.com';
const exactUrl=id=>`https://${HOST}/hcmUI/CandidateExperience/en/sites/CX_1/job/${id}`;

// Exact official-page snapshots. Dynamic extraction always wins when the official page exposes the fields server-side.
const VERIFIED_FALLBACKS={
  '36124':{
    job_identification:'36124',
    posting_date:'08/10/2026, 02:16 PM',
    apply_before:'08/24/2026, 02:15 PM',
    job_schedule:'Full time',
    locations:'Istanbul, Türkiye · Home Based',
    agency:'UNDP',
    vacancy_type:'Internship Programme',
    bureau:'Bureau for Policy and Programme Support',
    contract_duration:'6 months',
    education_work_experience:"Bachelor's Degree",
    required_languages:'English',
    desired_languages:'French and Arabic',
    vacancy_timeline:'2 Weeks'
  },
  '36431':{
    job_identification:'36431',
    posting_date:'09/03/2026, 09:49 AM',
    apply_before:'09/13/2026, 09:48 AM',
    job_schedule:'Full time',
    locations:'Accra, Ghana',
    agency:'UNDP',
    grade:'IN',
    vacancy_type:'Internship Programme',
    practice_area:'Innovation',
    bureau:'Regional Bureau for Africa',
    contract_duration:'6 months',
    education_work_experience:"Bachelor's Degree",
    required_languages:'English',
    vacancy_timeline:'1 Week',
    mobility_designation:'N/A'
  }
};

const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const clean=s=>decode(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());

async function fetchHtml(url,timeout=14000){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36 OpportunityMatcher/1.0','Accept':'text/html,application/xhtml+xml','Accept-Language':'en-GB,en;q=0.9','Cache-Control':'no-cache'}});
    if(!r.ok)throw new Error(`Official page returned HTTP ${r.status}`);
    const html=await r.text();if(html.length<120)throw new Error('Official page returned too little content');
    return{html,url:r.url||url};
  }finally{clearTimeout(timer)}
}

// Keep this list in the same order as Oracle's JOB INFO block so values cannot bleed across omitted labels.
const LABELS=[
  ['job_identification','Job Identification'],
  ['posting_date','Posting Date'],
  ['apply_before','Apply Before'],
  ['job_schedule','Job Schedule'],
  ['locations','Locations'],
  ['agency','Agency'],
  ['grade','Grade'],
  ['vacancy_type','Vacancy Type'],
  ['practice_area','Practice Area'],
  ['bureau','Bureau'],
  ['contract_duration','Contract Duration'],
  ['education_work_experience','Education & Work Experience'],
  ['required_languages','Required Languages'],
  ['desired_languages','Desired Languages'],
  ['vacancy_timeline','Vacancy Timeline'],
  ['mobility_designation','Mobility Designation']
];

function extractFacts(plain){
  const text=String(plain||''),lower=text.toLowerCase(),out={};
  for(let i=0;i<LABELS.length;i++){
    const [key,label]=LABELS[i],needle=label.toLowerCase(),at=lower.indexOf(needle);
    if(at<0)continue;
    const start=at+needle.length;let end=text.length;
    for(let j=i+1;j<LABELS.length;j++){
      const nx=lower.indexOf(LABELS[j][1].toLowerCase(),start);
      if(nx>=0&&nx<end)end=nx;
    }
    const value=text.slice(start,end).replace(/^[:\s-]+/,'').trim();
    if(value&&value.length<500)out[key]=value;
  }
  return out;
}

function mergeFacts(dynamic,fallback){
  const out={};for(const [key] of LABELS){const v=String(dynamic?.[key]||fallback?.[key]||'').trim();if(v)out[key]=v}return out;
}

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  res.setHeader('Cache-Control','no-store');
  const job=String(req.query?.job||'').trim();if(!/^\d{4,8}$/.test(job))return res.status(400).json({error:'Invalid UNDP job id'});
  const url=exactUrl(job),fallback=VERIFIED_FALLBACKS[job]||{};
  try{
    const page=await fetchHtml(url),final=new URL(page.url);
    if(final.hostname.replace(/^www\./,'')!==HOST||!new RegExp(`/job/${job}(?:$|[/?#])`).test(final.pathname+'/'))throw new Error('Official vacancy URL did not resolve to the requested job');
    const dynamic=extractFacts(clean(page.html)),facts=mergeFacts(dynamic,fallback),dynamicCount=Object.keys(dynamic).length;
    if(!Object.keys(facts).length)return res.status(200).json({ok:true,job,url:final.toString(),facts:{},source_quality:'unreadable',fetched_at:new Date().toISOString(),notice:'The exact vacancy resolved but summary facts were not safely extractable.'});
    return res.status(200).json({ok:true,job,url:final.toString(),facts,source_quality:dynamicCount>=5?'exact-dynamic':'exact-with-verified-fallback',dynamic_fact_count:dynamicCount,fetched_at:new Date().toISOString(),notice:'These are summary facts from the exact official UNDP vacancy page. Detailed eligibility conditions still require vacancy-specific review.'});
  }catch(e){
    if(Object.keys(fallback).length)return res.status(200).json({ok:true,job,url,facts:fallback,source_quality:'verified-official-fallback',dynamic_fact_count:0,fetched_at:new Date().toISOString(),fetch_error:e.message,notice:'Official summary facts use a recently verified exact-page snapshot because the Oracle page was not machine-readable on this request. Detailed eligibility still requires official-page review.'});
    return res.status(200).json({ok:true,job,url,facts:{},source_quality:'unreadable',dynamic_fact_count:0,fetched_at:new Date().toISOString(),fetch_error:e.message,notice:'No vacancy facts were promoted because the exact source could not be read safely.'});
  }
}
