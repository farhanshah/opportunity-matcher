import crypto from 'node:crypto';
import {canonicalUrl,officialHostMatches} from './auto-discovery.js';
import {parseOfficialFactSheet,parseApplicationTiming} from './official-facts.js';
import {isNamedOpportunityCall} from './world-verification.js';

const opportunity=/\b(scholarships?|fellowships?|internships?|studentships?|traineeships?|grants?|research awards?|doctoral (?:research )?positions?|phd studentships?|exchange programmes?)\b/i;
const generic=/^(?:home|about|jobs|careers|apply|programmes?|opportunities|scholarships|fellowships|internships|search|eligibility|study in korea|page not found)$/i;

const editorialHeading=/^(?:frequently asked questions(?: on| about)?|faqs?(?: on| about)?|key facts (?:about|on)|important information for|information for scholarship applicants|alumni and lifelong fellowship|eligibility requirements?|how to apply(?: for)?|criteria\s*(?:&|and)\s*scholarship programs?|full[- ]time scholarships?|.*?\bfellowships?\s*[–—-]\s*information for candidates|.*?\bscholarships?\s+at a glance)/i;
const editorialPath=/(?:^|\/)(?:faqs?|frequently-asked-questions|key-facts(?:-about)?|information-for-scholarship-applicants|alumni-and-lifelong-fellowship|fulltimeprograms|scholarshipsprograms|commonwealth-fellowships-information-for-candidates|swiss-government-excellence-scholarships-at-a-glance)(?:\/|$)/i;
export function isProgrammePage(title,url){
 try{
   const pathname=decodeURIComponent(new URL(url).pathname);
   const heading=String(title||'').trim();
   // Provider search pages and explicitly closed schemes cannot become
   // discoverable programme listings. Preserve historical DB evidence.
   if(/^(?:search results?|results for|search listings?)\b/i.test(heading)||
      /\(\s*(?:closed|archived|expired|discontinued)\s*\)/i.test(heading)||
      /(?:^|[-/])(?:closed|archived|expired|discontinued)(?:[-/]|$)/i.test(pathname))return false;
   // Reject guides, broad directories and help content even when their
   // heading contains "scholarship", "grant" or "internship".
   if(editorialHeading.test(heading)||editorialPath.test(pathname))return false;
   if(/\b(?:frequently asked questions|an overview|a step.by.step (?:application )?guide)\b/i.test(heading))return false;
   if(/^discover [^:]+:\s/i.test(heading)||
      /^(?:grants at the|advantages of|applying for jobs? and internships? at)\b/i.test(heading))return false;
   if(/\/(?:student-story\d*|applying-jobs-and-internships-[^/]*frequently-asked-questions)(?:[-/]|$)/i.test(pathname))return false;
   if(/\/(?:scholar-community|alumni|blog|help|faq|resources)(?:\/|$)/i.test(pathname))return false;
 if(/\/news(?:\/|$)/i.test(pathname)&&!isNamedOpportunityCall(title,url))return false;
   return true;
 }catch{return false}
}

const clean=value=>String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
 .replace(/<[^>]+>/g,' ').replace(/&(?:amp|#38);/gi,'&')
 .replace(/&nbsp;|&#160;/gi,' ').replace(/&#39;|&apos;/gi,"'")
 .replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim();

export function sourceListingEvidence({html,url,source,checkedAt=new Date()}){
 const link=canonicalUrl(url);
 if(!link||!officialHostMatches(link,source?.source_url||''))
  return {ok:false,reason:'Not a registered official provider hostname'};
 const rawHtml=String(html||'').slice(0,400000);
 const main=rawHtml.match(/<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i);
 // Official microsites without <main> need exactly one unambiguous H1.
 const singleH1=!main&&[...rawHtml.matchAll(/<h1\b[^>]*>/gi)].length===1;
 if(!main&&!singleH1)return {ok:false,reason:'No unambiguous programme page'};
 const body=(main?main[2]:rawHtml)
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
 const heading=body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
 if(!heading)return {ok:false,reason:'No official programme heading'};
 const title=clean(heading[1]);
 if(title.length<14||title.length>180||generic.test(title)||!opportunity.test(title)||!isProgrammePage(title,link))
  return {ok:false,reason:'Heading is not a specific opportunity'};
 if(/\b(?:page not found|access denied|error 404|captcha)\b/i.test(title))
  return {ok:false,reason:'Provider page unavailable'};
 if(clean(body).length<180)return {ok:false,reason:'Insufficient official programme body'};
 const partial=parseOfficialFactSheet(rawHtml);
 const timing=parseApplicationTiming(rawHtml);
 // An official internship candidate pool is not an individual placement.
 // Detect an explicit statement inside this programme's main/article body,
 // never inferred from a title, search result or surrounding site navigation.
 const programmeText=clean(body);
 const applicationScope=/\b(?:not (?:for|to) a specific internship opening|part of (?:the|an?) (?:pool of intern(?:ship)? candidates|intern talent pool)|intern talent pool)\b/i.test(programmeText)
   ?'candidate_pool_not_individual_placement':null;
 // Keep exact, programme-scoped provider statements for future extraction
 // work. None of them authorises 'open', 'eligible' or 'fully verified'.
 const labelled=partial.evidence||{};
 const declared={
   closing_date:partial.deadline||null,
   opening_date:partial.openDate||null,
   funding_text:labelled.funding||null,
   nationality_text:labelled.nationality||null,
   education_text:labelled.education||null,
   subject_text:labelled.fields||null,
   destination_text:labelled.destination||null,
   incomplete_reasons:partial.reasons||[],
   application_timing:timing,
   matching_approved:false
 };
 const checked=new Date(checkedAt);
 if(!Number.isFinite(checked.getTime()))return {ok:false,reason:'Invalid check timestamp'};
 return {ok:true,title,provider:source.provider,canonical_url:link,
  checked_at:checked.toISOString(),
  evidence_hash:crypto.createHash('sha256').update(rawHtml).digest('hex'),
  evidence:{scope:'official_named_programme_page',
   official_host:new URL(link).hostname,provider_registry_id:String(source.id||''),
   checked_at:checked.toISOString(),
   application_scope:applicationScope,
   declared_facts:declared,
   guarantees:['official_page_exists','named_programme_page'],
   unverified:['application_status','deadline','funding','nationalities','education','subjects',
     ...(applicationScope?['individual_placement']:[])]}};
}

export async function storeSourceListing(sql,lead,source,page){
 const record=sourceListingEvidence({
  html:page.html,url:page.url,source,checkedAt:page.checkedAt||new Date()
 });
 if(!record.ok)return {stored:false,reason:record.reason};
 // Existing catalogue records are not automatically verified from page existence.
 const existing=await sql`
  SELECT id,last_verified_at FROM opportunities
  WHERE regexp_replace(official_source_url,'/+$','')=
   ${record.canonical_url.replace(/\/+$/,'')}
  LIMIT 1
 `;
 if(existing.length&&existing[0].last_verified_at&&
   Date.now()-new Date(existing[0].last_verified_at).getTime()<30*86400000)
  return {stored:false,reason:'Programme already recently fully verified'};
 const linkedId=existing[0]?.id||null;
 const inserted=await sql`
   INSERT INTO worldwide_source_listings(
    canonical_url,provider,title,evidence_hash,source_status,
    verified_page_at,last_checked_at,evidence,linked_opportunity_id)
   VALUES (
    ${record.canonical_url},${record.provider},${record.title},${record.evidence_hash},
    'source_confirmed',${record.checked_at},now(),
    ${JSON.stringify(record.evidence)}::jsonb,${linkedId})
   ON CONFLICT(canonical_url) DO UPDATE SET
    title=EXCLUDED.title,provider=EXCLUDED.provider,
    evidence_hash=EXCLUDED.evidence_hash,source_status='source_confirmed',
    verified_page_at=EXCLUDED.verified_page_at,last_checked_at=now(),
    evidence=EXCLUDED.evidence,
    linked_opportunity_id=EXCLUDED.linked_opportunity_id,updated_at=now()
   WHERE worldwide_source_listings.verified_page_at<=EXCLUDED.verified_page_at
     AND worldwide_source_listings.source_status<>'superseded'
   RETURNING id,(xmax=0) AS newly_inserted
 `;
 return {stored:Boolean(inserted.length),isNew:Boolean(inserted[0]?.newly_inserted),id:inserted[0]?.id||null,title:record.title};
}
