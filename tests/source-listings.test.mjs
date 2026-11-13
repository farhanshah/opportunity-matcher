import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sourceListingEvidence,storeSourceListing} from '../lib/source-listings.js';

const source={id:'known-1',provider:'Official University',source_url:'https://uni.example/awards'};
const url='https://uni.example/awards/global-scholarship-2027';
const good='<html><main><h1>2027 Global Scholarship Programme</h1>'+
 '<p>Research scholarships at this university. Applicants should read the official conditions before applying. Details, deadlines, eligibility and funding can vary between participating courses. Contact the scholarships office for individual programme instructions.</p></main></html>';

test('real official programme page enters source-only tier, not fully verified matching',()=>{
 const result=sourceListingEvidence({html:good,url,source,checkedAt:new Date('2026-10-22T06:00:00Z')});
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.title,'2027 Global Scholarship Programme');
 assert.deepEqual(result.evidence.unverified,['application_status','deadline','funding','nationalities','education','subjects']);
 assert.match(result.evidence_hash,/^[0-9a-f]{64}$/);
});
test('navigation text, unrelated domains and errors cannot create source listings',()=>{
 for(const [html,target] of [
  ['<nav><h1>2027 Global Scholarship Programme</h1></nav>',url],
  ['<main><h1>Page not found</h1><p>'+('Missing '.repeat(30))+'</p></main>',url],
  [good,'https://uni.example.evil.com/awards/global-scholarship-2027']
 ]){
  assert.equal(sourceListingEvidence({html,url:target,source}).ok,false);
 }
});
test('single-H1 official microsite is allowed but multiple unscoped H1 headings are not',()=>{
 const micro=good.replace('<main>','').replace('</main>','');
 assert.equal(sourceListingEvidence({html:micro,url,source}).ok,true);
 assert.equal(sourceListingEvidence({html:micro+'<h1>Other scholarship</h1>',url,source}).ok,false);
});
test('partial publisher never creates an opportunity or verified eligibility rules',async()=>{
 const requests=[];
 async function sql(strings,...args){
  const statement=strings.join('?');requests.push(statement);
  if(statement.includes('SELECT id,last_verified_at FROM opportunities'))return [];
  if(statement.includes('INSERT INTO worldwide_source_listings'))return [{id:10}];
  throw Error('Unexpected write '+statement);
 }
 const result=await storeSourceListing(sql,{title:'Search lead'},source,{url,html:good});
 assert.equal(result.stored,true);
 assert.ok(requests.some(s=>s.includes('INSERT INTO worldwide_source_listings')));
 assert.ok(requests.every(s=>!s.includes('INSERT INTO opportunities')&&!s.includes('UPDATE opportunities')));
});
test('recently verified matching catalogue entry is not duplicated in source tier',async()=>{
 const requests=[];
 async function sql(strings,...args){
  const statement=strings.join('?');requests.push(statement);
  return [{id:'existing',last_verified_at:new Date()}];
 }
 const result=await storeSourceListing(sql,{},source,{url,html:good});
 assert.equal(result.stored,false);
 assert.equal(requests.length,1);
});
test('public listing API cannot represent source-only data as verified or open',()=>{
 const endpoint=readFileSync(new URL('../api/source-listings.js',import.meta.url),'utf8');
 assert.match(endpoint,/publication_level:'source_confirmed'/);
 assert.match(endpoint,/application_status:row\.opportunity_kind===/);
 assert.match(endpoint,/:'unknown'/);
 assert.match(endpoint,/personal_match:'not_assessed'/);
 assert.match(endpoint,/eligibility:'not_verified'/);
 assert.match(endpoint,/personal_match:'not_assessed'/);
 assert.doesNotMatch(endpoint,/INSERT INTO opportunities|UPDATE opportunities/);
 const html=readFileSync(new URL('../worldwide.html',import.meta.url),'utf8');
 assert.match(html,/official provider websites/i);
 assert.match(html,/not promises of an open application/i);
});

test('daily official snapshot promoter is secret protected and evidence-bound',()=>{
 const api=readFileSync(new URL('../api/promote-source-snapshots.js',import.meta.url),'utf8');
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(config.crons.find(x=>x.path==='/api/promote-source-snapshots').schedule,'40 5,6,12,18 * * *');
 assert.match(api,/req.headers.authorization/);
 assert.match(api,/s.http_status=200/);
 assert.match(api,/m.last_success_at>=now\(\)-interval '72 hours'/);
 assert.match(api,/m.last_error IS NULL/);
 assert.match(api,/checkedAt:s.checked_at/);
 assert.match(api,/storeSourceListing\(sql/);
 assert.doesNotMatch(api,/INSERT INTO opportunities|UPDATE opportunities/);
});


test('editorial FAQ, facts, alumni and applicant help pages never become opportunities',()=>{
 const base='<main><h1>REPLACE</h1><p>'+
   'Programme advice and information are available to students interested in applying. '+
   'The provider hosts several educational resources for prospective candidates. '+
   'Individual opportunity rules, deadlines, programme conditions and eligibility vary.'+
   '</p></main>';
 const examples=[
  ['Frequently Asked Questions on the Internship Program','https://uni.example/internship-program/faqs'],
  ['Key Facts about the Rhodes Scholarship','https://uni.example/scholarships/key-facts-about-the-rhodes-scholarship'],
  ['Important information for scholarship applicants','https://uni.example/information-for-scholarship-applicants'],
  ['Alumni and Lifelong Fellowship','https://uni.example/scholar-community/alumni-and-lifelong-fellowship'],
  ['2027 Scholarship Program','https://uni.example/awards/faq'],
  ['How to Apply for the Scholarship','https://uni.example/awards/how-to-apply'],
  ['Criteria & Scholarship Programs','https://uni.example/scholarshipsprograms'],
  ['Full-Time Scholarships','https://uni.example/fulltimeprograms'],
  ['Commonwealth Fellowships – information for candidates','https://uni.example/scholarships/commonwealth-fellowships-information-for-candidates'],
  ['Swiss Government Excellence Scholarships at a Glance','https://uni.example/en/swiss-government-excellence-scholarships-at-a-glance']
 ];
 for(const [title,pageUrl] of examples){
  const candidate=sourceListingEvidence({html:base.replace('REPLACE',title),url:pageUrl,source});
  assert.equal(candidate.ok,false,title+' must not be published as a programme');
 }
});


test('partial provider facts are retained as evidence but never grant eligibility',()=>{
 const html='<main><h1>2027 Global University Scholarship</h1>'+
  '<p>Closing date: 18 May 2027</p>'+
  '<p>Funding: Fully funded</p>'+
  '<p>Eligible applicants: Pakistani citizens</p>'+
  '<p>University programme applicants should consult official selection criteria. '+
  'Different programme pathways may require separate academic or institutional checks. '+
  'Please confirm application requirements directly with the programme office.</p></main>';
 const result=sourceListingEvidence({html,url,source});
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.evidence.declared_facts.closing_date,'2027-05-18');
 assert.equal(result.evidence.declared_facts.funding_text,'Fully funded');
 assert.equal(result.evidence.declared_facts.nationality_text,'Pakistani citizens');
 assert.equal(result.evidence.declared_facts.matching_approved,false);
 assert.ok(result.evidence.unverified.includes('nationalities'));
});

test('a search listing and explicitly closed provider awards are not named programmes',()=>{
 for(const [title,target] of [
  ['Search results for "internships".','https://uni.example/search?q=internships'],
  ['Sir Henry Wellcome Postdoctoral Fellowships (Closed)','https://uni.example/grants/closed'],
  ['Senior Research Fellowships (Archived)','https://uni.example/grants/archive']
 ]){
  const html='<main><h1>'+title+'</h1><p>'+('Research opportunities may be announced with application eligibility and funding information on the institutional portal. ').repeat(4)+'</p></main>';
  assert.equal(sourceListingEvidence({html,url:target,source}).ok,false,title);
 }
 assert.equal(sourceListingEvidence({html:good,url,source}).ok,true,'Real named programmes remain eligible');
});

test('provider directories, help pages and promotional articles cannot inflate public opportunity totals',()=>{
 for(const [title,slug] of [
  ['Grants at the Royal Society','https://uni.example/grants'],
  ['DAAD Scholarships - An Overview','https://uni.example/scholarships/daad-scholarships'],
  ['Applying for jobs and internships at IREX: Frequently asked questions','https://uni.example/applying-jobs-and-internships-irex-frequently-asked-questions'],
  ['Discover Türkiye: A Hub for Fully Funded International Scholarships','https://uni.example/page/discover-turkiye'],
  ['Advantages of Türkiye Scholarships for International Students','https://uni.example/page/student-story7-44']
 ]){
  const html='<main><h1>'+title+'</h1><p>'+('Details on student programmes and official scholarship applications. ').repeat(6)+'</p></main>';
  const evidence=sourceListingEvidence({html,url:slug,source});
  assert.equal(evidence.ok,false,title);
 }
 assert.equal(sourceListingEvidence({html:good,url,source}).ok,true);
});

test('public source-only listings show labelled closing dates without claiming open',()=>{
 const api=readFileSync(new URL('../api/source-listings.js',import.meta.url),'utf8');
 const client=readFileSync(new URL('../worldwide-v1.js',import.meta.url),'utf8');
 assert.match(api,/declared_facts,closing_date/);
 assert.match(api,/row.declared_closing_date>/);
 assert.match(api,/interval '30 days'/);
 assert.match(api,/only_when_explicitly_labelled_on_official_page/);
 assert.match(client,/Closing date stated on official page/);
 assert.match(client,/opening status and eligibility not confirmed/);
});

test('closed programme slugs are retained for historical URLs but excluded from source-only discovery',()=>{
 const html='<main><h1>Doctoral Studentships at Wellcome</h1><p>'+('Research funding, opportunities and programme requirements may vary. ').repeat(7)+'</p></main>';
 const source={id:'w',provider:'Wellcome',source_url:'https://wellcome.org/research-funding/schemes'};
 assert.equal(sourceListingEvidence({html,source,url:'https://wellcome.org/research-funding/schemes/doctoral-studentships-closed'}).ok,false);
 const api=readFileSync(new URL('../api/source-listings.js',import.meta.url),'utf8');
 assert.equal((api.match(/l\.canonical_url !~\*/g)||[]).length,2);
 assert.equal((api.match(/l\.title !~\*/g)||[]).length,2);
});

test('official UNESCO candidate pool keeps stated closing date but cannot become an individual verified placement',async()=>{
 const source={id:'unesco-catalogue',source_url:'https://careers.unesco.org/content/Internship-Programme',provider:'UNESCO'};
 const url='https://careers.unesco.org/job/Multiple-INTERNSHIP-Bureau-Of-Human-Resources-Management/1347540857';
 const html='<html><main><h1>INTERNSHIP: Bureau Of Human Resources Management</h1>'+
  '<p>Type of contract: Internship</p><p>Application deadline: 31 December 2026 (Midnight)</p>'+
  '<p>Applicants apply to become part of the pool of intern candidates, not to a specific internship opening.</p>'+
  '<p>Selected applicants may be contacted by the relevant hiring manager when an internship placement is available. A place is not guaranteed and further details will depend on the particular assignment.</p></main></html>';
 const result=sourceListingEvidence({html,url,source,checkedAt:new Date('2026-11-13T09:00:00Z')});
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.evidence.declared_facts.closing_date,'2026-12-31');
 assert.equal(result.evidence.application_scope,'candidate_pool_not_individual_placement');
 assert.equal(result.evidence.declared_facts.matching_approved,false);
 assert.ok(result.evidence.unverified.includes('individual_placement'));
 const {verifyCandidate}=await import('../lib/auto-discovery.js');
 assert.equal(verifyCandidate(html,url,'UNESCO',new Date('2026-11-13T09:00:00Z')).verified,false);
 const general=sourceListingEvidence({html:good,url:'https://uni.example/awards/global-scholarship-2027',source:{id:'uni',provider:'University',source_url:'https://uni.example/awards'}});
 assert.equal(general.evidence.application_scope,null);
 const api=readFileSync(new URL('../api/source-listings.js',import.meta.url),'utf8');
 assert.match(api,/application_scope:row\.application_scope/);
 assert.match(api,/application_status:row\.opportunity_kind===/);
});
