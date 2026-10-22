import {canonicalUrl,officialHostMatches} from './auto-discovery.js';
const OPPORTUNITY_PATH=/\b(scholarships?|fellowships?|internships?|studentships?|opportunit(?:y|ies)|grants?|awards?|funding|program(?:me)?s?|students?|careers?|recruitment|apply|applications?)\b/i;
const NON_PROGRAMME=/\/(?:about|news|articles?|blogs?|privacy|terms|contact|faq|events?|press|login|signup|sitemap)(?:\/|$)/i;
export const WORLD_VERIFICATION_BATCH_SIZE=12;
// Allow a dated official call-for-applications article, not arbitrary
// news. Such a call is still only a lead; provider evidence must be fetched.
export function isNamedOpportunityCall(title,url,now=new Date()){
 let path;
 try{path=new URL(url).pathname.toLowerCase()}catch{return false}
 const yearMatch=path.match(/\/news\/(20\d{2})\//i);
 if(!yearMatch)return false;
 const year=Number(yearMatch[1]),current=now.getUTCFullYear();
 if(year<current-1||year>current+1)return false;
 const named=/\b(scholarships?|fellowships?|internships?|studentships?|traineeships?)\b/i.test(String(title||''));
 const announcing=/\b(?:open call|call for applications?|applications? open|deadline extension|extended application deadline)\b/i.test(String(title||''));
 const slug=/(?:call-for|open-call|applications-open|application-deadline|deadline-extension|extended-application)/i.test(path);
 return named&&announcing&&slug;
}

// Prevent URLs with scraper placeholders or obvious corruption from reaching providers.
export function malformedProgrammeUrl(url){
  try{
    const path=new URL(url).pathname;
    return path.length>2048 || /\${4,}/.test(path) ||
      /%24(?:%24){3,}/i.test(path) ||
      /%7b[a-z][a-z0-9_-]*%7d/i.test(path) ||
      /\{[a-z][a-z0-9_-]*\}/i.test(path);
  }catch{return true}
}
export function trustedSourceForLead(lead,sources){
  const url=canonicalUrl(lead?.canonical_url);
  if(!url)return {status:'invalid_url',reason:'Link fails HTTPS/host validation'};
  if(malformedProgrammeUrl(url))return {status:'invalid_url',reason:'Malformed or unexpanded programme URL'};
  const matches=(sources||[]).filter(x=>x&&x.is_active!==false&&officialHostMatches(url,x.source_url||''));
  if(!matches.length)return {status:'source_review',reason:'Provider hostname is not in the official-source registry'};
  const path=new URL(url).pathname;
  if((NON_PROGRAMME.test(path)&&!isNamedOpportunityCall(lead.title,url))||
    (!OPPORTUNITY_PATH.test(path)&&!isNamedOpportunityCall(lead.title,url)))
    return {status:'source_review',reason:'URL is not clearly a programme-specific official page'};
  const providers=new Set(matches.map(x=>String(x.provider||'').trim().toLowerCase()).filter(Boolean));
  if(providers.size!==1)return {status:'source_review',reason:'Ambiguous official provider identity'};
  const source=matches.sort((a,b)=>new URL(b.source_url).pathname.length-new URL(a.source_url).pathname.length)[0];
  if(!source.id||!source.provider)return {status:'source_review',reason:'Provider registry entry is incomplete'};
  return {status:'trusted',source,url};
}
