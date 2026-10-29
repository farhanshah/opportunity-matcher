const SEARCH_ROOTS=[
  'https://wd3.myworkdaysite.com/wday/cxs/wfp/job_openings/jobs',
  // WFP's tenant-prefixed public board is another legitimate Workday entry.
  'https://wfp.wd3.myworkdayjobs.com/wday/cxs/wfp/job_openings/jobs'
];
const POLICY='WFP internships are for students or recent graduates. Applicants should normally be enrolled in a recognised undergraduate or graduate programme and have attended classes in the past 12 months, or be a recent graduate within six months; have completed at least two years of undergraduate studies; be fluent in English; and meet the requirements of the individual assignment. Internships are offered across headquarters, regional bureaux and country offices.';
const clean=s=>String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim();
const isoDate=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)};

const MONTHS={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
function applicationDeadlineFromDescription(value){
 const text=clean(value).slice(0,30000);
 // Require an exact application-deadline label and a fully named calendar month.
 // Never treat posting/start dates or vague windows as closing dates.
 const m=text.match(/\bDEADLINE FOR APPLICATIONS\s*[:\-–]?\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/i);
 if(!m)return '';
 const month=Object.entries(MONTHS).find(([name])=>name===m[2].toLowerCase()||name.startsWith(m[2].toLowerCase()));
 if(!month)return '';
 const yyyy=Number(m[3]),mm=Number(month[1]),dd=Number(m[1]);
 const d=new Date(Date.UTC(yyyy,mm-1,dd));
 return d.getUTCFullYear()===yyyy&&d.getUTCMonth()===mm-1&&d.getUTCDate()===dd?
    d.toISOString().slice(0,10):'';
}

const internLike=(title,description='')=>/\bintern(?:ship|ships)?\b/i.test(`${title||''} ${clean(description).slice(0,6000)}`);
async function fetchJson(url,options={},timeout=16000){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{...options,signal:c.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 OpportunityMatcher/1.0','Accept':'application/json, text/plain, */*','Accept-Language':'en-GB,en;q=0.9','Cache-Control':'no-cache',...(options.headers||{})}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const type=String(r.headers.get('content-type')||'');const body=await r.text();if(!body||body.length<2)throw new Error('Empty Workday response');let json;try{json=JSON.parse(body)}catch{throw new Error(`Non-JSON Workday response${type?` (${type})`:''}`)}return{json,url:r.url||url,status:r.status}}finally{clearTimeout(timer)}}
async function searchWorkday(){
  // Workday exposes multiple deployment hosts. An empty result from one
  // host is not proof the other host has no vacancies.
  const request={method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({appliedFacets:{},limit:20,offset:0,searchText:'intern'})};
  const checks=await Promise.allSettled(SEARCH_ROOTS.map(root=>fetchJson(root,request,10500)));
  const results=[];const errors=[];
  for(let i=0;i<checks.length;i++){
    const result=checks[i];
    if(result.status!=='fulfilled'){errors.push(SEARCH_ROOTS[i].split('/')[2]+': '+String(result.reason?.message||result.reason).slice(0,55));continue}
    const data=result.value.json;
    if(!Array.isArray(data?.jobPostings)&&!Array.isArray(data?.items)){
      errors.push(SEARCH_ROOTS[i].split('/')[2]+': unexpected official API response');
      continue;
    }
    const rows=Array.isArray(data.jobPostings)?data.jobPostings:data.items;
    results.push({root:SEARCH_ROOTS[i],rows,total:Number(data?.total||rows.length||0)});
  }
  if(!results.length)throw new Error('WFP Workday search unreadable across configured official hosts: '+errors.join('; '));
  results.sort((a,b)=>b.rows.length-a.rows.length);
  const best=results[0];
  // Different official Workday hosts can have different result windows.
  // Merge distinct vacancy paths rather than discarding valid secondary hits.
  const seen=new Set(),entries=[];
  for(const group of results){
    for(const row of group.rows){
      const key=externalPath(row).replace(/[?#].*$/,'');
      if(!/^\/(?:job|details)\//i.test(key)||seen.has(key))continue;
      seen.add(key);
      entries.push({row,root:group.root});
    }
  }
  return {...best,entries,successful_hosts:results.map(x=>new URL(x.root).hostname),
    empty_hosts:results.filter(x=>!x.rows.length).map(x=>new URL(x.root).hostname),
    host_errors:errors};
}
function publicRoot(searchRoot){const host=new URL(searchRoot);return host.hostname==='wfp.wd3.myworkdayjobs.com'?`${host.origin}/en-US/job_openings`:`${host.origin}/recruiting/wfp/job_openings`}
function detailRoot(searchRoot){return searchRoot.replace(/\/jobs\/?$/,'')}
function externalPath(row){return String(row?.externalPath||row?.externalUrl||row?.path||'').trim()}
async function verifyRow(row,searchRoot){const path=externalPath(row);if(!path||!path.startsWith('/'))return null;const detailUrl=`${detailRoot(searchRoot)}${path}`;let d;try{d=(await fetchJson(detailUrl,{method:'GET'},8500)).json}catch{return null}const info=d?.jobPostingInfo||d?.jobPosting||d?.data?.jobPostingInfo||d||{};const title=String(info?.title||row?.title||'').trim();const description=info?.jobDescription||info?.description||info?.jobDescriptionText||'';if(!/\bintern(?:ship|ships)?\b|\btrainee\b|\bstagiaire\b/i.test(title))return null;const structuredDeadline=isoDate(info?.endDate||info?.jobPostingEndDate||info?.externalEndDate);
 const statedDeadline=applicationDeadlineFromDescription(description);
 if(structuredDeadline&&statedDeadline&&structuredDeadline!==statedDeadline)return null;
 const deadline=statedDeadline||structuredDeadline;const today=new Date().toISOString().slice(0,10);if(!deadline||deadline<today)return null;const location=String(info?.location||info?.locationText||info?.primaryLocation||row?.locationsText||row?.location||'').trim();const req=String(info?.jobReqId||info?.jobPostingId||row?.jobReqId||'').trim();const url=`${publicRoot(searchRoot)}${path}`;const body=clean(description).slice(0,65000);return{title:title||'WFP Internship',url,location,deadline,source:'WFP',job_id:req,status_verified:true,verification_level:'exact',status_source:'wfp-workday-exact-job-json',quality:'status-verified-vacancy',verification_basis:'current WFP Workday exact-job record with a current end date',detail_text:`${title}. ${location?`Location ${location}. `:''}Application deadline ${deadline}. ${body} ${POLICY}`.trim(),detail_evidence_quality:body.length>=700?'high':'medium',detail_scope:'wfp-workday-exact-job-json'} }
export default async function handler(req,res){if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});res.setHeader('Cache-Control','no-store');try{const search=await searchWorkday(),rows=search.entries.filter(({row:r})=>internLike(r?.title||'',r?.bulletFields?.join?.(' ')||''));const checked=[];let i=0;async function worker(){while(i<rows.length&&i<18){const entry=rows[i++],x=await verifyRow(entry.row,entry.root);if(x)checked.push(x)}}await Promise.all(Array.from({length:Math.min(8,Math.max(1,rows.length))},worker));const seen=new Set(),openings=checked.filter(x=>{const k=x.url;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>(a.deadline||'9999').localeCompare(b.deadline||'9999'));return res.status(200).json({ok:true,provider:'WFP',board_url:'https://www.wfp.org/careers',workday_root:search.root,successful_hosts:search.successful_hosts,empty_hosts:search.empty_hosts,host_errors:search.host_errors,fetched_at:new Date().toISOString(),adapter_state:'exact-workday',candidate_count:rows.length,exact_verified_count:openings.length,openings,notice:'Only exact WFP Workday postings whose detail JSON identifies an internship and supplies a current closing date are promoted.'})}catch(e){return res.status(200).json({ok:true,provider:'WFP',board_url:'https://www.wfp.org/careers',fetched_at:new Date().toISOString(),adapter_state:'unreadable',candidate_count:0,exact_verified_count:0,openings:[],fetch_error:e.message,notice:'WFP recruitment could not be verified safely right now, so no opening was promoted.'})}}
