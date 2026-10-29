import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedInternship} from '../lib/exact-internship-publishing.js';
const dt=new Date('2026-10-22T16:00:00Z');
const examples=[
 {provider:'UNDP',url:'https://estm.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/12345',title:'Communications Internship for Regional Office'},
 {provider:'WFP',url:'https://wd3.myworkdaysite.com/en-US/recruiting/wfp/job_openings/Communications-Internship_456',title:'Communications Internship for Youth Teams'},
 {provider:'UNOPS',url:'https://careers.unops.org/careersmarketplace/JobDetail/Project-Intern/5200',title:'Project Management Internship Programme'},
 {provider:'UNICEF',url:'https://jobs.unicef.org/en-us/job/596567/communications-intern-in-algeria',title:'Communication and Advocacy Intern, UNICEF Algeria'}
];
test('four exact official vacancy feeds may create source-only active internship records',()=>{
 for(const sample of examples){
  const row={title:sample.title,url:sample.url,deadline:'2026-11-25',
    status_verified:true,verification_level:'exact',source:sample.provider,location:'London',job_id:'123'};
  const result=verifiedInternship(row,sample.provider,dt);
  assert.ok(result,sample.provider);
  assert.equal(result.evidence.matching_approved,false);
  assert.equal(result.evidence.application_deadline,'2026-11-25');
  assert.equal(result.evidence.opportunity_kind,'official internship vacancy');
  assert.match(result.evidence_hash,/^[a-f0-9]{64}$/);
 }
});
test('not-current, non-exact, misattributed and substituted URLs cannot publish',()=>{
 for(const x of examples){
  const base={title:x.title,url:x.url,deadline:'2026-11-25',
    status_verified:true,verification_level:'exact',source:x.provider};
  for(const wrong of [
   {...base,status_verified:false},{...base,verification_level:'unverified'},
   {...base,deadline:'2026-09-01'},{...base,deadline:'2026-11-99'},
   {...base,url:'https://'+new URL(x.url).hostname+'.evil.org/job/123'},
   {...base,title:'Internship programme'},
   {...base,source:'Wrong Provider'}
  ]){
    const result=verifiedInternship(wrong,x.provider,dt);
    assert.equal(result,null,x.provider+' failed to reject '+JSON.stringify(wrong));
  }
 }
});
test('official live internship ingestion is private, bounded, audited and never auto-matches',()=>{
 const api=readFileSync(new URL('../api/discover-exact-internships.js',import.meta.url),'utf8');
 const v=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.match(api,/CRON_SECRET/);
 assert.match(api,/Promise\.allSettled/);
 assert.match(api,/opportunity_official_feed_runs/);
 assert.match(api,/INSERT INTO worldwide_source_listings/);
 assert.match(api,/slice\(0,60\)/);
 assert.doesNotMatch(api,/INSERT INTO opportunities|UPDATE opportunities SET/);
 assert.equal(v.crons.find(c=>c.path==='/api/discover-exact-internships').schedule,'50 0,6,12,18 * * *');
 const listing=readFileSync(new URL('../api/source-listings.js',import.meta.url),'utf8');
 assert.match(listing,/application_deadline/);
 assert.match(listing,/interval '36 hours'/);
 assert.match(listing,/personal_match:'not_assessed'/);
});

test('UNICEF exact URL is verified by job ID and never accepts general board URLs',()=>{
 const row={title:'Education and Advocacy Internship in Manila',
 url:'https://jobs.unicef.org/en-us/job/596777/education-internship-philippines',deadline:'2026-11-25',
 status_verified:true,verification_level:'exact',source:'UNICEF',location:'Philippines',
 status_source:'unicef-exact-job-page'};
 const record=verifiedInternship(row,'UNICEF',dt);
 assert.equal(record?.evidence.official_job_id,'596777');
 assert.equal(record.evidence.matching_approved,false);
 assert.equal(verifiedInternship({...row,url:'https://jobs.unicef.org/en-us/search/?q=intern'},'UNICEF',dt),null);
 assert.equal(verifiedInternship({...row,title:'Vacancy Announcement - Roster (Administrative Associates)'},'UNICEF',dt),null);
});
