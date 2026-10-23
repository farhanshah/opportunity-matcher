import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedState, categoryType, narrowFacts, publicSlug, safePublicSource } from '../lib/public-opportunity-seo.js';

const now=Date.parse('2026-10-22T15:00:00Z');
const original=Object.freeze({
  provider:'UNDP', provider_job_id:'36925',title:'Communications Intern',opportunity_type:'Internship',
  status:'open', status_verified:true,verification_level:'exact',
  deadline_at:'2026-10-28T23:59:59Z',last_verified_at:'2026-10-22T03:00:00Z',
  source_url:'https://estm.fa.em2.oraclecloud.com/job/36925'
});
test('only verified recent and unexpired postings are open',()=>{
  assert.equal(publishedState(original,now),'open');
  assert.equal(publishedState({...original,status_verified:false},now),'needs-recheck');
  assert.equal(publishedState({...original,verification_level:'board'},now),'needs-recheck');
  assert.equal(publishedState({...original,last_verified_at:'2026-09-10T03:00:00Z'},now),'needs-recheck');
  assert.equal(publishedState({...original,deadline_at:null},now),'needs-recheck');
});
test('expired postings keep a clear closed state even if database status remains open',()=>{
  assert.equal(publishedState({...original,deadline_at:'2026-10-21T23:59:59Z'},now),'closed');
  assert.equal(publishedState({...original,status:'closed'},now),'closed');
  assert.equal(publishedState({...original,closed_at:'2026-10-21T22:00:00Z'},now),'closed');
});
test('provider IDs are stable and categories reflect the listing type',()=>{
  assert.equal(publicSlug(original),'undp-36925');
  assert.equal(categoryType(original),'internships');
  assert.equal(categoryType({...original,opportunity_type:'Fellowship'}),'fellowships');
  assert.equal(categoryType({...original,opportunity_type:'Scholarship'}),'scholarships');
});
test('never advertise fabricated eligibility fields',()=>{
  const raw_payload={detail_evidence_quality:'medium',minimum_education:'Advanced degree',required_language:'French'};
  assert.equal(narrowFacts({...original,raw_payload}).education,'');
  assert.equal(narrowFacts({...original,raw_payload:{...raw_payload,detail_evidence_quality:'high'}}).education,'Advanced degree');
  assert.equal(narrowFacts({...original,title:'Internship (Sri Lankan nationals only)'}).titleRestriction,'Sri Lankan nationals only');
});
test('block unsafe provider links',()=>{
  assert.equal(safePublicSource('javascript:alert(1)'),'');
  assert.equal(safePublicSource('http://example.com/'),'');
  assert.equal(safePublicSource('https://example.com/path'),'https://example.com/path');
});

test('explicit nationality and disability restrictions remain visible verbatim',async()=>{
 const {restrictionFromTitle}=await import('../lib/public-opportunity-seo.js');
 assert.equal(restrictionFromTitle('Communications Intern (Open to South Sudanese only, 3 Months)'), 'Open to South Sudanese only');
 assert.equal(restrictionFromTitle('Internship (Sri Lankan nationals only)'), 'Sri Lankan nationals only');
 assert.ok(restrictionFromTitle('Internship - only for Indonesians LIVING WITH DISABILITY').toLowerCase().includes('indonesians'));
 assert.equal(restrictionFromTitle('Communications Intern'), '');
});
