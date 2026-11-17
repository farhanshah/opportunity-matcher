import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedInternship} from '../lib/exact-internship-publishing.js';
const dt=new Date('2026-10-22T16:00:00Z');
const examples=[
 {provider:'UNDP',url:'https://estm.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/12345',title:'Communications Internship for Regional Office'},
 {provider:'WFP',url:'https://wd3.myworkdaysite.com/recruiting/wfp/job_openings/job/London-United-Kingdom/Communications-Internship_JR127797',title:'Communications Internship for Youth Teams'},
 {provider:'UNOPS',url:'https://careers.unops.org/careersmarketplace/JobDetail/Project-Intern/5200',title:'Project Management Internship Programme'},
 {provider:'UNICEF',url:'https://jobs.unicef.org/en-us/job/596567/communications-intern-in-algeria',title:'Communication and Advocacy Intern, UNICEF Algeria'},
 {provider:'FAO',url:'https://jobs.fao.org/careersection/fao_external/jobdetail.ftl?job=2602160&lang=en',title:'Internship Programme at FAO Rome Headquarters'}
];
test('five exact official vacancy feeds may create source-only active internship records',()=>{
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

test('FAO exact Taleo job IDs cannot be replaced by generic search or job boards',()=>{
 const basic={title:'FAO International Internship Call',source:'FAO',deadline:'2026-11-25',
 status_verified:true,verification_level:'exact',
 url:'https://jobs.fao.org/careersection/fao_external/jobdetail.ftl?job=2602160&lang=en'};
 const accepted=verifiedInternship(basic,'FAO',dt);
 assert.equal(accepted?.evidence.official_job_id,'2602160');
 assert.equal(accepted?.evidence.matching_approved,false);
 for(const wrong of ['https://jobs.fao.org/careersection/fao_external/moresearch.ftl?lang=en',
 'https://jobs.fao.org/careersection/fao_external/jobdetail.ftl?job=none',
 'https://jobs.fao.org/careersection/fao_external/jobdetail.ftl?job=2602160.evil']){
  assert.equal(verifiedInternship({...basic,url:wrong},'FAO',dt),null);
 }
});

test('WFP accepts its official tenant-prefixed job URLs without accepting another Workday tenant',()=>{
 const row={title:'Monitoring and Evaluation Internship in Bridgetown',source:'WFP',deadline:'2026-11-02',
  status_verified:true,verification_level:'exact',
  url:'https://wfp.wd3.myworkdayjobs.com/en-US/job_openings/job/Bridgetown-Barbados/Monitoring-and-Evaluation-Internship_JR126957'};
 assert.ok(verifiedInternship(row,'WFP',dt));
 for(const url of [
  'https://other.wd3.myworkdayjobs.com/en-US/job_openings/job/Bridgetown/Intern_JR126957',
  'https://wfp.wd3.myworkdayjobs.com/en-US/job_openings',
  'https://wfp.wd3.myworkdayjobs.com/recruiting/wfp/job_openings/job/Bridgetown/Intern_JR126957'
 ])assert.equal(verifiedInternship({...row,url},'WFP',dt),null);
});

test('UNICEF official internship fallback keeps deadlines within each individual job card',async()=>{
 const {boardCandidates}=await import('../api/unicef-openings.js');
 const base='https://jobs.unicef.org/en-us/filter/?work-type=internship';
 const html='<div><a href="/en-us/job/596881/finance-consultant">Finance Consultant, Paris</a><p>Deadline: 31 December 2027</p></div>'+
  '<div><a href="/en-us/job/596882/education-internship">Education Internship, Manila</a><p>Deadline: 30 December 2027</p></div>'+
  '<div><a href="/en-us/job/596883/operations-intern">Operations Intern, Manila</a><p>No closing date published.</p></div>'+
  '<div><a href="/en-us/job/596884/legal-internship">Legal Internship, Nairobi</a><p>Deadline: 29 December 2027</p></div>'+
  '<div><a href="https://jobs.unicef.org.evil.com/en-us/job/596885/bogus-internship">Bogus Internship</a><p>Deadline: 30 December 2027</p></div>';
 const rows=boardCandidates(html,base);
 assert.deepEqual(rows.map(x=>x.id),['596882','596883','596884']);
 assert.equal(rows[0].deadline,'2027-12-30');
 assert.equal(rows[1].deadline,'','a missing deadline cannot be borrowed from the next job');
 assert.equal(rows[2].deadline,'2027-12-29');
 assert.ok(rows.every(x=>new URL(x.url).hostname==='jobs.unicef.org'));
 const code=readFileSync(new URL('../api/unicef-openings.js',import.meta.url),'utf8');
 assert.ok(code.includes('https://jobs.unicef.org/en-us/filter/?work-type=internship'));
 assert.ok(code.includes('All UNICEF internship boards were unreadable'));
});


test('modern UNICEF career portal requires per-job ID, internship type and current deadline',async()=>{
 const {modernBoardCandidates,modernExactEvidence}=await import('../api/unicef-openings.js');
 const source='https://jobs.unicef.org/jobs/search';
 const url='https://jobs.unicef.org/jobs/junior-archivist-internship-6-months-dfam-nyhq-on-site-united-states-new-york';
 const board='<a href="/jobs/finance-manager-paris">Read more</a>'+
   '<a href="/jobs/junior-archivist-internship-6-months-dfam-nyhq-on-site-united-states-new-york">Read more</a>'+
   '<a href="https://jobs.unicef.org.evil.org/jobs/malicious-internship">Read more</a>';
 const c=modernBoardCandidates(board,source);
 assert.deepEqual(c.map(x=>x.url),[url]);
 const html='<html><h1>UNICEF Careers</h1><h3>Junior Archivist, Internship, 6 months, DFAM, NYHQ (on-site)</h3>'+
  '<p>596913</p><p>United States, New York</p><p>Internship</p>'+
  '<p>Closing at: 30 Nov 2026 - 23:55 EST</p>'+
  '<p>Applications are for an exact UNICEF internship role.</p></html>';
 const exact=modernExactEvidence(html,url,new Date('2026-11-17T05:00:00Z'));
 assert.equal(exact?.job_id,'596913');
 assert.equal(modernExactEvidence(html,url.replace('junior-archivist','secret-archivist'),new Date('2026-11-17T05:00:00Z')),null);
 assert.equal(exact?.deadline,'2026-11-30');
 const record={title:exact.title,url,job_id:exact.job_id,deadline:exact.deadline,source:'UNICEF',
  status_verified:true,verification_level:'exact',status_source:'unicef-new-exact-job-page',
  detail_evidence_quality:'high'};
 const published=verifiedInternship(record,'UNICEF',new Date('2026-11-17T05:00:00Z'));
 assert.equal(published?.evidence.official_job_id,'596913');
 assert.equal(published?.evidence.matching_approved,false);
 for(const modified of [
  html.replace('596913','no job identifier'),
  html.replace('30 Nov 2026','30 Oct 2026'),
  html.replace('Closing at:','Listed on:'),
  html.replaceAll('Internship','Consultancy')
 ])assert.equal(modernExactEvidence(modified,url,new Date('2026-11-17T05:00:00Z')),null);
 for(const modified of [
  {...record,detail_evidence_quality:'low'},
  {...record,status_source:'board-only'},
  {...record,job_id:''},
  {...record,url:'https://jobs.unicef.org.evil.org/jobs/junior-archivist-internship-6-months'},
  {...record,url:'https://jobs.unicef.org/jobs/search'}
 ])assert.equal(verifiedInternship(modified,'UNICEF',new Date('2026-11-17T05:00:00Z')),null);
 const adapter=readFileSync(new URL('../api/unicef-openings.js',import.meta.url),'utf8');
 assert.match(adapter,/https:\/\/jobs\.unicef\.org\/jobs\/search/);
 assert.match(adapter,/verifyModern\(c\)/);
});

test('UNICEF new careers pagination and expiring exact seeds cannot bypass verification',async()=>{
 const {modernBoardCandidates,modernExactEvidence}=await import('../api/unicef-openings.js');
 const adapter=readFileSync(new URL('../api/unicef-openings.js',import.meta.url),'utf8');
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(config.functions['api/unicef-openings.js'].maxDuration,45);
 assert.match(adapter,/jobs\/search\?page=2/);
 assert.match(adapter,/jobs\/search\?page=6/);
 assert.match(adapter,/source\.pathname==='\/jobs\/search'/);
 assert.match(adapter,/REVIEWED_EXACT_SEEDS/);
 assert.match(adapter,/if\(seed\.until<today\(\)\)continue/);
 assert.match(adapter,/if\(!fetches\.some\(x=>x\.ok\)&&!merged\.length\)/);
 const board='https://jobs.unicef.org/jobs/search?page=3';
 assert.deepEqual(modernBoardCandidates('<a href="/jobs/batch-recruitment-national-internship-roster-unicef">Read more</a>',board),[]);
 const job='https://jobs.unicef.org/jobs/youth-participation-intern-mbabane-eswatini-6-months-eswatini-formerly-swaziland-eswatini';
 const cards=modernBoardCandidates('<a href="/jobs/youth-participation-intern-mbabane-eswatini-6-months-eswatini-formerly-swaziland-eswatini">Read more</a>',board);
 assert.deepEqual(cards.map(x=>x.url),[job]);
 assert.equal(modernExactEvidence('<main><h2>Internship roster</h2><p>596751</p><p>Closing at: 20 Nov 2026 - 23:55 PKT</p></main>',job,new Date('2026-11-17T06:00:00Z')),null);
});
