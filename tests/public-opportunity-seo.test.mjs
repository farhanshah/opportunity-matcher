import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
  assert.equal(publishedState({...original,title:'  '},now),'needs-recheck');
  assert.equal(publishedState({...original,provider_job_id:'invalid'},now),'needs-recheck');
  assert.equal(publishedState({...original,provider:''},now),'needs-recheck');
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

test('country-level SEO pages are indexed only when exact current vacancies exist',()=>{
 const cfg=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 const source=readFileSync(new URL('../api/public-opportunities.js',import.meta.url),'utf8');
 assert.ok(cfg.rewrites.some(x=>x.source==='/opportunities/country/:country'));
 assert.ok(cfg.rewrites.some(x=>x.source==='/opportunities/countries'));
 assert.ok(source.includes("locationDirectory(rows,country)"));
 assert.ok(source.includes("countries.map(c=>"));
 assert.ok(source.includes("X-Robots-Tag','noindex"));
 assert.ok(source.includes('Location is not citizenship eligibility'));
});

test('provider-local closing times remain visible without changing UTC auto-expiry',()=>{
 const publicApi=readFileSync(new URL('../api/public-opportunities.js',import.meta.url),'utf8');
 const latest=readFileSync(new URL('../api/latest.js',import.meta.url),'utf8');
 const directory=readFileSync(new URL('../lib/latest-directory.js',import.meta.url),'utf8');
 assert.match(publicApi,/const deadlineLabel=row/);
 assert.match(publicApi,/'official_deadline_local',facts->>'official_deadline_local'/);
 assert.match(publicApi,/deadlineLabel\(row\)/);
 assert.match(latest,/facts->>'official_deadline_local' AS official_deadline_local/);
 assert.match(directory,/official_deadline_local:/);
 assert.match(latest,/official local time/);
 const exactUtc='2026-12-01T04:55:00Z';
 const now=Date.parse('2026-11-17T06:00:00Z');
 assert.equal(publishedState({...original,deadline_at:exactUtc,last_verified_at:'2026-11-17T05:00:00Z'},now),'open');
 assert.equal(publishedState({...original,deadline_at:exactUtc,last_verified_at:'2026-11-17T05:00:00Z'},Date.parse(exactUtc)+1),'closed');
});
