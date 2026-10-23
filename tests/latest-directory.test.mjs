import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preparedListings,sourceUrl,categoryOf} from '../lib/latest-directory.js';
const now=new Date('2026-10-23T09:00:00Z'),provider='University of Somewhere';
const url='https://official.example/scholarships/global-2027';
const exact={provider:'UNDP',provider_job_id:'36925',title:'Communications Intern',
 opportunity_type:'Internship',location:'London',source_url:'https://official.example/jobs/36925',
 status:'open',status_verified:true,verification_level:'exact',
 deadline_at:'2026-10-30T23:59:59Z',last_verified_at:'2026-10-23T06:00:00Z',first_seen_at:'2026-10-22T06:00:00Z'};
const call={title:'Scholarships 2027',provider,source_url:url,
 status:'open',closing_at:'2026-11-23T17:00:00Z',last_checked_at:'2026-10-23T05:00:00Z'};
const source={title:'Global Scholarship 2027',provider,canonical_url:url,
 source_status:'source_confirmed',verified_page_at:'2026-10-23T07:00:00Z',created_at:'2026-10-20T01:00:00Z'};
test('live postings take precedence over duplicate official source cards',()=>{
 const rows=preparedListings({vacancies:[exact],calls:[call],sources:[source]},now);
 assert.equal(rows.length,2);
 assert.equal(rows.find(x=>x.title===exact.title)?.level,3);
 assert.equal(rows.find(x=>x.url===url)?.level,2);
 assert.equal(rows.find(x=>x.url===url)?.deadline_at,call.closing_at);
});
test('unverified source pages remain discoverable but never become open listings',()=>{
 const rows=preparedListings({sources:[source]},now);
 assert.equal(rows.length,1);
 assert.equal(rows[0].level,1);
 assert.equal(rows[0].deadline_at,null);
 assert.equal(rows[0].detail_url,undefined);
});
test('rejects expired vacancy, stale calls and untrustworthy provider links',()=>{
 assert.equal(preparedListings({vacancies:[{...exact,deadline_at:'2026-10-22T00:00:00Z'}]},now).length,0);
 assert.equal(preparedListings({calls:[{...call,last_checked_at:'2026-10-19T03:00:00Z'}]},now).length,0);
 assert.equal(preparedListings({sources:[{...source,canonical_url:'http://official.example/scholarships'}]},now).length,0);
 assert.equal(preparedListings({vacancies:[{...exact,verification_level:'board'}]},now).length,0);
 assert.equal(sourceUrl('https://127.0.0.1/private'),'');
 assert.equal(sourceUrl('javascript:alert(1)'),'');
});
test('classification supports opportunity interests without guessing eligibility',()=>{
 assert.equal(categoryOf('2027 World Scholarship'),'scholarships');
 assert.equal(categoryOf('Management Internship'),'internships');
 assert.equal(categoryOf('Early Career Fellowship'),'fellowships');
 assert.equal(categoryOf('Official Training Grant'),'grants');
});
test('directory is public, rendered server-side, linked and protected against inflated claims',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const vercel=JSON.parse(read('vercel.json'));
 assert.equal(vercel.rewrites.find(x=>x.source==='/latest').destination,'/api/latest');
 assert.equal(vercel.crons.find(x=>x.path==='/api/discover-exact-internships').schedule,'50 0,6,12,18 * * *');
 const page=read('api/latest.js');
 assert.match(page,/preparedListings/);
 assert.match(page,/status_verified=true/);
 assert.match(page,/source_status='source_confirmed'/);
 assert.match(page,/not yet|not confirmed|not personally assessed/i);
 assert.ok(!page.includes('INSERT INTO opportunities'));
 assert.match(read('index.html'),/href="\/latest"/);
 assert.match(read('api/public-opportunities.js'),/BASE\+'\/latest'/);
});
