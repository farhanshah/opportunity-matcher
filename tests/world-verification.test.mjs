import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trustedSourceForLead,WORLD_VERIFICATION_BATCH_SIZE} from '../lib/world-verification.js';
import {verifyCandidate} from '../lib/auto-discovery.js';
const source={id:'registered',source_url:'https://university.example/scholarships',
  provider:'Example University',is_active:true};
const lead=url=>({canonical_url:url,title:'2027 scholarship programme'});
test('unrecognized domains, fake subdomains and private addresses cannot auto-publish',()=>{
  assert.equal(trustedSourceForLead(lead('https://untrusted.example/scholarship/2027'),[source]).status,'source_review');
  assert.equal(trustedSourceForLead(lead('https://university.example.evil.org/scholarship/2027'),[source]).status,'source_review');
  assert.equal(trustedSourceForLead(lead('http://127.0.0.1/scholarships'),[source]).status,'invalid_url');
  assert.equal(trustedSourceForLead(lead('https://university.example/$$$$$$$$%7Byear%7D/scholarships'),[source]).status,'invalid_url');
});
test('registered provider and programme-specific path are eligible for verification only',()=>{
  assert.equal(trustedSourceForLead(lead('https://university.example/scholarships/2027-award'),[source]).status,'trusted');
  assert.equal(trustedSourceForLead(lead('https://university.example/news/scholarship-2027'),[source]).status,'source_review');
  assert.equal(trustedSourceForLead(lead('https://university.example/'),[source]).status,'source_review');
});
test('ambiguous provider identity blocks publishing',()=>{
  const other={id:'other',source_url:'https://university.example/careers',
    provider:'Unrelated Institution',is_active:true};
  assert.equal(trustedSourceForLead(lead('https://university.example/scholarship/2027'),[source,other]).status,'source_review');
});
test('a registered provider does not make an incomplete programme eligible',()=>{
  const result=verifyCandidate('<h1>2027 Scholarship applications</h1><p>Students may apply.</p>',
    'https://university.example/scholarships/2027-award','Example University');
  assert.equal(result.verified,false);
  assert.ok(result.reasons.includes('exact application deadline unavailable'));
});
test('automated verifier is bounded, atomic, and reuses official validation and publication',()=>{
  const api=readFileSync(new URL('../api/verify-worldwide.js',import.meta.url),'utf8');
  const discover=readFileSync(new URL('../api/discover.js',import.meta.url),'utf8');
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  assert.equal(WORLD_VERIFICATION_BATCH_SIZE,16);
  assert.equal(config.crons.find(x=>x.path==='/api/verify-worldwide').schedule,'15 1,5,8,11,14,17,20,23 * * *');
  for(const phrase of ['FOR UPDATE SKIP LOCKED','verification_attempts<4',
    'trustedSourceForLead(lead,sources)','fetchOfficial(trust.url,trust.source.source_url)',
    'verifyCandidate(page.html,page.url,trust.source.provider)',
    'publish(sql,trust.source,page.url,checked)',"l.review_status='unverified'"]){
    assert.ok(api.includes(phrase),'Missing '+phrase);
  }
  // Previously rejected third-party URLs stay withheld. Only leads from an
  // exact newly-registered official hostname may rejoin the verification queue.
  assert.match(api,/l\.verification_status='source_review'/);
  assert.match(api,/FROM monitored_sources m/);
  assert.match(api,/ORDER BY l\.matched_official_host DESC/);
  assert.match(api,/l\.canonical_url ~\*/);
  assert.match(api,/split_part\(l\.canonical_url,'\/',3\)/);
  assert.ok(api.includes('if(!authorised(req))return res.status(401)'));
  assert.ok(discover.includes('export { publish, fetchOfficial };'));
  assert.ok(discover.includes('WITH upserted AS'));
  assert.ok(!api.includes('BRAVE_SEARCH_API_KEY'));
});
test('admin records decisions separately from raw search results',()=>{
  const api=readFileSync(new URL('../api/admin-health.js',import.meta.url),'utf8');
  for(const field of ['worldwide_verified_published','worldwide_source_review',
    'worldwide_needs_evidence','worldwide_verification_runs']){
    assert.ok(api.includes(field));
  }
});


test('only dated, explicitly named official calls may pass a news path gate',()=>{
 const call='https://university.example/news/2026/open-call-for-internship-programme';
 const genuine={canonical_url:call,title:'Open Call for Internship at University 2026'};
 assert.equal(trustedSourceForLead(genuine,[source]).status,'trusted');
 const generic={canonical_url:'https://university.example/news/2026/education-scholarship-research',title:'2026 Scholarship Research News'};
 assert.equal(trustedSourceForLead(generic,[source]).status,'source_review');
 const unrelated={canonical_url:call,title:'General News 2026'};
 assert.equal(trustedSourceForLead(unrelated,[source]).status,'source_review');
 const old={canonical_url:'https://university.example/news/2020/open-call-for-internship-programme',title:genuine.title};
 assert.equal(trustedSourceForLead(old,[source]).status,'source_review');
});


test('WIPO programme-specific fellowship news calls are eligible only for evidence checks',()=>{
 const calls=[
  ['2026-2027 WIPO Indigenous Fellowship Program – Extended application deadline',
   'https://www.wipo.int/en/web/traditional-knowledge/w/news/2026/wipo-indigenous-fellowship-program-2026-2027'],
  ['World Intellectual Property Organization: Call for Applications to the PCT Fellowship Program for Graduate Students',
   'https://www.wipo.int/en/web/wipo-pearl/w/news/2026/call-for-applications-to-the-pct-fellowship-program-for-graduate-students'],
  ['Applications Open: 2026 Short-Term Fellowship Programme for International Students in Japan',
   'https://www.wipo.int/en/web/office-japan/w/news/2026/applications-open-2026-short-term-fellowship-programme-international-students-japan'],
  ['Open Call for Internship at WIPO Japan Office',
   'https://www.wipo.int/en/web/office-japan/w/news/2026/open-call-for-internship-at-wipo-japan-office']
 ];
 const registry=[{id:'wipo',provider:'World Intellectual Property Organization',
   source_url:'https://www.wipo.int/en/web/working-at-wipo/fellowship-program',is_active:true}];
 for(const [title,url] of calls)
  assert.equal(trustedSourceForLead({title,canonical_url:url},registry).status,
    'trusted',title);
});


test('official evidence and provider registration can be rechecked past the old attempt cap',()=>{
 const api=readFileSync(new URL('../api/verify-worldwide.js',import.meta.url),'utf8');
 assert.match(api,/l\.verification_status='pending' AND l\.verification_attempts<4/);
 assert.match(api,/l\.verification_status='needs_evidence'[\s\S]*?l\.matched_official_host=true[\s\S]*?interval '14 days'/);
 assert.match(api,/l\.verification_status='retry_needed'[\s\S]*?HTTP 403%[\s\S]*?interval '14 days'/);
 assert.match(api,/l\.verification_status='source_review'[\s\S]*?Provider hostname is not in the official-source registry[\s\S]*?FROM monitored_sources/);
 assert.doesNotMatch(api,/review_status='unverified' AND l\.verification_attempts<4/);
});

test('current-cycle verified-host calls are queued ahead of closed and archival pages',()=>{
 const api=readFileSync(new URL('../api/verify-worldwide.js',import.meta.url),'utf8');
 const ranked=api.slice(api.indexOf('ORDER BY l.matched_official_host DESC'),api.indexOf('FOR UPDATE SKIP LOCKED'));
 assert.match(ranked,/THEN 4/);
 assert.match(ranked,/THEN 0/);
 assert.match(ranked,/l.first_seen_at ASC/);
 assert.ok(api.includes("interval '5 days'"));
 assert.ok(api.includes("interval '14 days'"));
 assert.ok(api.includes("interval '7 days'"));
 assert.match(api,/FOR UPDATE SKIP LOCKED/);
});
test('officially linked UNOPS career board only qualifies exact job-detail URLs for evidence checks',async()=>{
 const {validatedCuratedProviders}=await import('../lib/curated-provider-sources.js');
 const selected=validatedCuratedProviders().find(x=>x.source_key==='new_unops_official_careers');
 assert.equal(selected.provider,'UNOPS');
 const registry=[{id:'verified-unops',provider:'UNOPS',source_url:selected.source_url,is_active:true}];
 const valid='https://careers.unops.org/careersmarketplace/JobDetail/Project-Management-Intern/4382';
 assert.equal(trustedSourceForLead({canonical_url:valid,title:'Project Management Intern'},registry).status,'trusted');
 assert.equal(trustedSourceForLead({canonical_url:'https://careers.unops.org.evil.org/careersmarketplace/JobDetail/Project-Management-Intern/4382',title:'Project Management Intern'},registry).status,'source_review');
 assert.equal(trustedSourceForLead({canonical_url:'https://careers.unops.org/careersmarketplace/Home',title:'Jobs portal'},registry).status,'source_review');
});
