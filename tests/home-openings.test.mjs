import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicHomeOpening} from '../api/home-openings.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const now=Date.parse('2026-10-29T10:00:00Z');
const row={provider:'UNICEF',provider_job_id:'596461',title:'Youth Disability Inclusion Intern in Indonesia - only for Indonesians',
 location:'Indonesia',opportunity_type:'Internship',status:'open',status_verified:true,
 verification_level:'exact',last_verified_at:'2026-10-28T03:00:00Z',deadline_at:'2026-11-11T23:59:59Z',
 source_url:'https://jobs.unicef.org/en-us/job/596461/test'};
test('home only shows exact current official vacancies and retains restrictions',()=>{
 const good=publicHomeOpening(row,now);assert.ok(good);assert.equal(good.location,'Indonesia');
 assert.equal(good.detail_url,'/opportunities/unicef-596461');
 assert.equal(good.eligibility,'provider_restrictions_apply');
 assert.ok(publicHomeOpening({...row,deadline_at:'2026-10-20T00:00:00Z'},now)===null);
 assert.ok(publicHomeOpening({...row,status_verified:false},now)===null);
 assert.ok(publicHomeOpening({...row,last_verified_at:'2026-10-17T03:00:00Z'},now)===null);
 assert.ok(publicHomeOpening({...row,source_url:'http://example.com/vacancy'},now)===null);
});
test('public homepage uses live current feed and keeps AdSense snippet unchanged',()=>{
 const home=read('index.html'),server=read('api/home-openings.js'),client=read('home-openings-v1.js');
 assert.match(home,/verifiedOpenGrid/);assert.match(home,/pagead2.googlesyndication.com/);
 assert.match(client,/fetch\('\/api\/home-openings'/);
 assert.match(client,/Confirm nationality, studies and work eligibility/);
 assert.match(server,/status_verified=true/);
 assert.doesNotMatch(server,/INSERT INTO |UPDATE exact_vacancies/);
});
