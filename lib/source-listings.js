import crypto from 'node:crypto';
import {canonicalUrl,officialHostMatches} from './auto-discovery.js';

const opportunity=/\b(scholarships?|fellowships?|internships?|studentships?|traineeships?|grants?|research awards?)\b/i;
const generic=/^(?:home|about|jobs|careers|apply|programmes?|opportunities|scholarships|fellowships|internships|search|eligibility|study in korea|page not found)$/i;
const clean=s=>String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ').replace(/&(?:amp|#38);/gi,'&')
  .replace(/&nbsp;|&#160;/gi,' ').replace(/&#39;|&apos;/gi,"'")
  .replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim();
export function sourceListingEvidence({html,url,source,checkedAt=new Date()}){
 const link=canonicalUrl(url);
 if(!link||!officialHostMatches(link,source?.source_url||''))return {ok:false,reason:'Not a trusted official hostname'};
 const htmlText=String(html||'').slice(0,400000);
 const main=htmlText.match(/<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i);
 // Some official microsites omit <main>; only accept that fallback if the
 // document contains one unambiguous H1 and a programme-specific URL.
 const fallback=!main && [...htmlText.matchAll(/<h1\b[^>]*>/gi)].length===1;
 if(!main&&!fallback)return {ok:false,reason:'No unambiguous programme content'};
 const raw=(main?main[2]:htmlText).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
 const heading=raw.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
 if(!heading)return {ok:false,reason:'No official programme heading'};
 const title=clean(heading[1]);
 if(title.length<14||title.length>180||generic.test(title)||!opportunity.test(title))
   return {ok:false,reason:'Heading does not identify a specific opportunity'};
 if(/\b(?:page not found|access denied|error 404|captcha)\b/i.test(title))
   return {ok:false,reason:'Provider page is unavailable'};
 const content=clean(raw);
 if(content.length<180)return {ok:false,reason:'Official programme page has insufficient content'};
 const date=new Date(checkedAt);
 if(!Number.isFinite(date.getTime()))return {ok:false,reason:'Invalid evidence timestamp'};
 return {ok:true,title,provider:source.provider,canonical_url:link,
  checked_at:date.toISOString(),
  evidence_hash:crypto.createHash('sha256').update(htmlText).digest('hex'),
  evidence:{scope:'official_main_article_heading',host:new URL(link).hostname,
   provider_registry_id:String(source.id||''),checked_at:date.toISOString(),
   guarantees:['official_page_exists','named_programme_page'],
   unverified:['application_status','deadline','funding','nationalities','education','subjects']}};
}
export async function storeSourceListing(sql,lead,source,page){
 const record=sourceListingEvidence({html:page.html,url:page.url,source});
 if(!record.ok)return {stored:false,reason:record.reason};
 // This catalogue is *never* eligible for matchmaking. Fully verified rows
 // are managed exclusively through the existing strict opportunities publisher.
 const existing=await sql`SELECT id FROM opportunities
   WHERE regexp_replace(official_source_url,'/+$','')=${record.canonical_url.replace(/\/+$/,'')}
   LIMIT 1`;
 if(existing.length)return {stored:false,reason:'Already present in main opportunity catalogue'};
 const inserted=await sql`INSERT INTO worldwide_source_listings
 (canonical_url,provider,title,evidence_hash,source_status,verified_page_at,last_checked_at,evidence)
 VALUES (${record.canonical_url},${record.provider},${record.title},${record.evidence_hash},
 'source_confirmed',${record.checked_at},now(),${JSON.stringify(record.evidence)}::jsonb)
 ON CONFLICT(canonical_url) DO UPDATE SET
 title=EXCLUDED.title,provider=EXCLUDED.provider,
 evidence_hash=EXCLUDED.evidence_hash,source_status='source_confirmed',
 verified_page_at=EXCLUDED.verified_page_at,last_checked_at=now(),
 evidence=EXCLUDED.evidence,updated_at=now()
 RETURNING id`;
 return {stored:Boolean(inserted.length),id:inserted[0]?.id||null,title:record.title};
}
