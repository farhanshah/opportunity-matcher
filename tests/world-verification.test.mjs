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
  assert.equal(WORLD_VERIFICATION_BATCH_SIZE,12);
  assert.equal(config.crons.find(x=>x.path==='/api/verify-worldwide').schedule,'15 7 * * *');
  for(const phrase of ['FOR UPDATE SKIP LOCKED','verification_attempts<4',
    'trustedSourceForLead(lead,sources)','fetchOfficial(trust.url,trust.source.source_url)',
    'verifyCandidate(page.html,page.url,trust.source.provider)',
    'publish(sql,trust.source,page.url,checked)',"WHERE review_status='unverified'"]){
    assert.ok(api.includes(phrase),'Missing '+phrase);
  }
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
