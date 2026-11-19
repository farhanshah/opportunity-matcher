import {canonicalUrl,officialHostMatches} from './auto-discovery.js';
const OPPORTUNITY_PATH=/\b(scholarships?|fellowships?|internships?|studentships?|opportunit(?:y|ies)|grants?|awards?|funding|program(?:me)?s?|students?|careers?|recruitment|apply|applications?)\b/i;
const NON_PROGRAMME=/\/(?:about|news|articles?|blogs?|privacy|terms|contact|faq|events?|press|login|signup|sitemap)(?:\/|$)/i;
export const WORLD_VERIFICATION_BATCH_SIZE=16;

// Official-by-domain trust for leads whose host is not in the registry.
// Aggregators, blogs and look-alike domains (".com" copies of real bodies)
// never match. A trusted domain only permits fetching the official page; the
// page itself must still pass verification before anything is published.
export const OFFICIAL_DOMAIN_PATTERNS=[
 ['government',/(?:^|\.)(?:gov|gouv|gob|go|govt|gv)\.[a-z]{2}$|\.gov$|(?:^|\.)(?:gc\.ca|europa\.eu|admin\.ch|bund\.de|government\.nl|regjeringen\.no)$/],
 ['academic',/\.edu$|\.(?:edu|ac)\.[a-z]{2}$/],
 ['intergovernmental',/\.int$|(?:^|\.)(?:un\.org|unicef\.org|undp\.org|unfpa\.org|unhcr\.org|unesco\.org|wfp\.org|unops\.org|unido\.org|ilo\.org|fao\.org|worldbank\.org|imf\.org|oecd\.org|adb\.org|afdb\.org|iaea\.org|unep\.org|unwomen\.org)$/]
];
// Staging, test, CMS, newsletter and utility hosts are never programme evidence.
export const NON_PUBLIC_HOST=/(?:^|[.-])(?:uat|cmsuat|stage|staging|dev|test|qa|preview|sandbox|cms|newsletter|salarycalculator|intranet|webmail|mail)(?:[.-]|$)/i;
// Multi-tenant platforms: a registered page there must not lend trust to other tenants.
export const SHARED_PLATFORM=/(?:^|\.)(?:smartrecruiters\.com|myworkdayjobs\.com|workday\.com|greenhouse\.io|lever\.co|google\.com|wordpress\.com|blogspot\.com|github\.io|medium\.com|wixsite\.com|squarespace\.com|notion\.site)$/i;
export function officialDomainClass(host,registeredHosts=[]){
 const h=String(host||'').toLowerCase().replace(/^www\d?\./,'');
 if(!h||NON_PUBLIC_HOST.test(h))return '';
 for(const [name,re] of OFFICIAL_DOMAIN_PATTERNS)if(re.test(h))return name;
 if(registeredHosts.some(r=>r&&!SHARED_PLATFORM.test(r)&&(h===r||h.endsWith('.'+r))))return 'subdomain_of_registered';
 return '';
}
const hostOf=u=>{try{return new URL(u).hostname.toLowerCase().replace(/^www\d?\./,'')}catch{return ''}};
// Organisation name for a provider that is trusted by domain rather than by
// registry entry: the page's own og:site_name / application-name, else host.
export function siteNameFromPage(html,url){
 const pick=re=>(String(html||'').match(re)||[])[1]||'';
 const name=pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{2,80})["']/i)||
  pick(/<meta[^>]+content=["']([^"']{2,80})["'][^>]+property=["']og:site_name["']/i)||
  pick(/<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']{2,80})["']/i);
 return name.replace(/&amp;/g,'&').trim()||hostOf(url);
}
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
 const slug=/(?:call-for|call-applications|open-call|applications-open|application-deadline|deadline-extension|extended-application)/i.test(path)
  || (/(?:^|[-/])(?:scholarship|fellowship|internship|studentship)[a-z0-9-]*20\d{2}/i.test(path)&&announcing);
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
  let matches=(sources||[]).filter(x=>x&&x.is_active!==false&&officialHostMatches(url,x.source_url||''));
  let derived=null;
  if(!matches.length){
    const registered=[...new Set((sources||[]).filter(x=>x&&x.is_active!==false).map(x=>hostOf(x.source_url)).filter(Boolean))];
    const cls=officialDomainClass(new URL(url).hostname,registered);
    if(!cls)return {status:'source_review',reason:'Provider hostname is not in the official-source registry'};
    const parent=cls==='subdomain_of_registered'
      ?(sources||[]).find(x=>x&&x.is_active!==false&&!SHARED_PLATFORM.test(hostOf(x.source_url))&&((h,r)=>h===r||h.endsWith('.'+r))(new URL(url).hostname.toLowerCase().replace(/^www\d?\./,''),hostOf(x.source_url)))
      :null;
    derived={id:parent?.id||null,provider:parent?.provider||'',source_url:new URL(url).origin+'/',
      derived:true,trust_basis:cls};
    matches=[derived];
  }
  const path=new URL(url).pathname;
  // Only this independently verified UNOPS recruitment host may use
  // its exact JobDetail numeric vacancy route as a candidate. A valid
  // route is not evidence that a vacancy is open.
  const host=new URL(url).hostname.toLowerCase().replace(/^www\./,'');
  const providerIs=name=>matches.some(x=>String(x.provider||'').trim().toLowerCase()===name);
  const unopsJob=host==='careers.unops.org' &&
    /^\/careersmarketplace\/JobDetail\/[^/]+\/\d+\/?$/i.test(path) &&
    providerIs('unops');
  // Official ATS requisitions often use /job/<title>/<numeric-id> without
  // the word "internship" in the path. Trust this exact UNIDO route only
  // when an active UNIDO source on the same host is registered. This only
  // permits an official detail fetch, never automatic open status.
  const unidoIntern=host==='careers.unido.org'&&providerIs('unido')&&
    /^\/job\/[^/]{6,220}\/\d{9,12}\/?$/i.test(path)&&
    /\bintern(?:ships?)?\b/i.test(String(lead.title||''));
  // Campus China uses numeric content detail routes for named scholarships.
  // A programme detail is a lead until cycle-specific evidence is checked.
  const campusScholarship=host==='campuschina.org'&&
    providerIs('china scholarship council / campus china')&&
    /^\/content\/details3_\d{4,9}\.html$/i.test(path)&&
    /\bscholarships?\b/i.test(String(lead.title||''));
  const namedCall=isNamedOpportunityCall(lead.title,url);
  if((NON_PROGRAMME.test(path)&&!namedCall)||
    (!OPPORTUNITY_PATH.test(path)&&!namedCall&&!unopsJob&&!unidoIntern&&!campusScholarship))
    return {status:'source_review',reason:'URL is not clearly a programme-specific official page'};
  if(derived)return {status:'trusted',source:derived,url};
  const providers=new Set(matches.map(x=>String(x.provider||'').trim().toLowerCase()).filter(Boolean));
  if(providers.size!==1)return {status:'source_review',reason:'Ambiguous official provider identity'};
  const source=matches.sort((a,b)=>new URL(b.source_url).pathname.length-new URL(a.source_url).pathname.length)[0];
  if(!source.id||!source.provider)return {status:'source_review',reason:'Provider registry entry is incomplete'};
  return {status:'trusted',source,url};
}
