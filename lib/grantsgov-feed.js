import crypto from 'node:crypto';
const RELEVANT=/\b(?:fellowships?|scholarships?|internships?|studentships?|research training)\b/i;
export function grantSearchKeyword(day=new Date()){
 const keywords=['fellowship','scholarship','internship','research training'];
 const utc=Date.UTC(day.getUTCFullYear(),day.getUTCMonth(),day.getUTCDate());
 return keywords[Math.floor(utc/86400000)%keywords.length];
}
export function validGrantLead(hit,detail){
 const id=Number(hit?.id);
 if(!Number.isSafeInteger(id)||id<=0||id>999999999)return null;
 if(String(hit?.oppStatus||'').toLowerCase()!=='posted')return null;
 const title=String(hit?.title||'').trim().replace(/\s+/g,' ');
 const number=String(hit?.number||'').trim();
 if(title.length<15||title.length>230||!RELEVANT.test(title)||!number)return null;
 if(!detail||Number(detail.id)!==id||
    String(detail.opportunityNumber||'').trim()!==number||
    String(detail.opportunityTitle||'').trim().replace(/\s+/g,' ')!==title)return null;
 const agency=String(detail.synopsis?.agencyName||hit.agencyName||'US federal agency').trim();
 const url='https://www.grants.gov/search-results-detail/'+id;
 return {id,title,number,agency,url,
  hash:crypto.createHash('sha256').update(JSON.stringify({
   id,number,title,agency,revision:detail.revision,
   applicantTypes:detail.synopsis?.applicantTypes||[],
   opportunityCategory:detail.opportunityCategory||{}
  })).digest('hex'),
  evidence:{source:'Grants.gov official search2 and fetchOpportunity APIs',
   federal_opportunity_id:id,official_number:number,
   agency,status_seen_in_search:'posted',search_keyword:hit.search_keyword||null,
   applicant_types:(Array.isArray(detail.synopsis?.applicantTypes)?
      detail.synopsis.applicantTypes.map(x=>String(x.description||'').slice(0,90)):[]),
   publication_level:'source_confirmed',matching_approved:false,
   guarantees:['official_federal_grant_record_exists'],
   unverified:['current_application_status','deadline','funding','nationality','education','fields']}
 };
}
export async function officialGrantPost(endpoint,payload,fetcher=fetch){
 const response=await fetcher(endpoint,{method:'POST',redirect:'error',
  signal:AbortSignal.timeout(9000),
  headers:{'Content-Type':'application/json','Accept':'application/json'},
  body:JSON.stringify(payload)});
 if(!response.ok)throw Error('Official API HTTP '+response.status);
 if(Number(response.headers.get('content-length')||0)>1800000)
   throw Error('Official API response too large');
 const raw=(await response.text()).slice(0,1800000);
 const result=JSON.parse(raw);
 if(result.errorcode!==0||!result.data)throw Error('Official API did not return a success record');
 return result.data;
}
