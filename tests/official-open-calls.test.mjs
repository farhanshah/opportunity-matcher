import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OFFICIAL_OPEN_CALLS,officialPageSaysOpen,officialMopgaPortalSaysOpen} from '../lib/official-open-calls.js';
const day=c=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(c.deadline));
function sample(c){
 const date=day(c);
 const status=c.url.includes('campusfrance.org')
  ?'MOPGA 2027: Visiting Fellowship Program for Early Career Researchers. 15 September 2026: Applications open. 15 December 2026: Application deadline. Applicants must hold a doctoral degree defended between December 2021 and December 2026. Be exclusively of foreign nationality (all nationalities are eligible except French nationality). Not be residing and professionally active in France. Not have previously received a MOPGA fellowship.'
  :c.url.includes('chevening.org')?'Open for applications until '+date+' at 12:00 (UTC). Applications are open.':'Status: Open Deadline: '+date;
 return '<html><main><h1>'+c.title+'</h1><p>'+status+'</p><p>Eligibility rules: '+
  c.countries.join(', ')+'</p><p>'+
  'The official programme has detailed restrictions. All applicants should check the source for the requirements, academic background, route, supporting documents and terms. '.repeat(6)+
  '</p></main></html>';
}
test('all reviewed official open calls require exact provider status and date and auto-expire',()=>{
 assert.equal(OFFICIAL_OPEN_CALLS.length,9);
 for(const c of OFFICIAL_OPEN_CALLS){
  const html=sample(c);
  assert.equal(officialPageSaysOpen(html,c,new Date('2026-10-22T14:00:00Z')),true,c.slug);
  assert.equal(officialPageSaysOpen(html,c,new Date(c.deadline)),false,c.slug);
  assert.equal(officialPageSaysOpen(html.replace(day(c),'1 October 2026'),c,new Date('2026-10-22T14:00:00Z')),false,c.slug);
  if(c.url.includes('campusfrance.org')){
   assert.equal(officialPageSaysOpen(html.replace('15 September 2026: Applications open','15 September 2026: Applications closed'),c,new Date('2026-11-17T04:00:00Z')),false);
   assert.equal(officialPageSaysOpen(html.replace('except French nationality','including French nationality'),c,new Date('2026-11-17T04:00:00Z')),false);
   assert.equal(officialPageSaysOpen(html.replace('December 2021 and December 2026','December 2017 and December 2020'),c,new Date('2026-11-17T04:00:00Z')),false);
  }else if(c.url.includes('chevening.org')){
   assert.equal(officialPageSaysOpen(html.replace('Applications are open','Applications are closed'),c,new Date('2026-10-22T14:00:00Z')),false,c.slug);
   assert.equal(officialPageSaysOpen(html.replace(c.countries[0],'Unknown Country'),c,new Date('2026-10-22T14:00:00Z')),false,c.slug);
  }else{
   assert.equal(officialPageSaysOpen(html.replace('Status: Open','Status: Closed'),c,new Date('2026-10-22T14:00:00Z')),false,c.slug);
  }
 }
});
test('source bulletin is restricted, time-limited and isolated from matchable catalogue',()=>{
 const api=readFileSync(new URL('../api/open-calls.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/recheck-open-calls.js',import.meta.url),'utf8');
 const page=readFileSync(new URL('../worldwide-v1.js',import.meta.url),'utf8');
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.match(api,/closing_at>now\(\)/);assert.match(api,/status='open'/);
 assert.match(api,/eligible_countries:x\.eligible_countries/);assert.match(api,/personal_eligibility:'not_assessed'/);
 assert.match(worker,/CRON_SECRET/);assert.match(worker,/officialPageSaysOpen/);
 assert.match(worker,/status='needs_recheck'/);
 assert.equal(config.crons.find(c=>c.path==='/api/recheck-open-calls').schedule,'20 */6 * * *');
 assert.match(page,/Citizenship restricted to/);assert.match(page,/confirm exact closing time/);
 assert.doesNotMatch(api+worker,/INSERT INTO opportunities|UPDATE opportunities/);
});

test('scheduled official call publisher inserts only freshly confirmed open calls and retains restrictions',()=>{
 const code=readFileSync(new URL('../api/recheck-open-calls.js',import.meta.url),'utf8');
 assert.match(code,/if\(status==='open'\)/);
 assert.match(code,/INSERT INTO official_open_calls/);
 assert.match(code,/ON CONFLICT\(slug\) DO UPDATE/);
 assert.match(code,/personal_eligibility:'not_assessed'/);
 assert.doesNotMatch(code,/INSERT INTO opportunities/);
 const restricted=OFFICIAL_OPEN_CALLS.filter(x=>/yusuf-hamied|partnership-grants/.test(x.slug));
 assert.equal(restricted.length,2);
 assert.ok(restricted.every(x=>/Only /.test(x.requirement)));
});

test('MOPGA is restricted to the current Campus France programme page, with its PhD and nationality exclusions',()=>{
 const call=OFFICIAL_OPEN_CALLS.find(x=>x.slug==='campus-france-mopga-2027');
 assert.equal(call.url,'https://www.campusfrance.org/en/mopga-2027');
 assert.equal(call.deadline,'2026-12-15T22:59:00Z');
 assert.match(call.requirement,/non-French/);
 assert.match(call.requirement,/not be residing and professionally active in France/);
 assert.match(call.requirement,/not a masters or PhD studentship/);
 const html=sample(call);
 assert.equal(officialPageSaysOpen(html,call,new Date('2026-11-17T04:00:00Z')),true);
 assert.equal(officialPageSaysOpen(html,call,new Date('2026-09-14T23:00:00Z')),false);
 assert.equal(officialPageSaysOpen(html+'<p>Applications are closed</p>',call,new Date('2026-11-17T04:00:00Z')),false);
 assert.equal(officialPageSaysOpen(html,call,new Date('2026-12-15T22:59:00Z')),false);
 const stale=html.replace('15 December 2026: Application deadline','15 December 2025: Application deadline');
 assert.equal(officialPageSaysOpen(stale,call,new Date('2026-11-17T04:00:00Z')),false);
 assert.equal(officialPageSaysOpen(html,{...call,url:'https://scholarship-aggregator.example/en/mopga-2027'},new Date('2026-11-17T04:00:00Z')),false);
 const worker=readFileSync(new URL('../api/recheck-open-calls.js',import.meta.url),'utf8');
 assert.match(worker,/www[.]campusfrance[.]org/);
 assert.match(worker,/call[.]provider/);
});

test('MOPGA portal explicitly confirms exact local time and independent application status',()=>{
 const c=OFFICIAL_OPEN_CALLS.find(x=>x.slug==='campus-france-mopga-2027');
 const sample='<main><h1>MOPGA 2027: Visiting Fellowship Program for Early Career Researchers</h1>'+
  '<p>Official programme: www.campusfrance.org/en/mopga-2027</p>'+
  '<p>Opens 15 Sep 2026 06:00 (CEST)</p>'+
  '<p>Deadline 15 Dec 2026 23:59 (CET)</p>'+
  '<p>Read the official Campus France programme details before applying. '.repeat(7)+'</p></main>';
 assert.equal(officialMopgaPortalSaysOpen(sample,c,new Date('2026-11-17T05:00:00Z')),true);
 for(const bad of [
  sample.replace('23:59','22:59'),
  sample.replace('www.campusfrance.org/en/mopga-2027','aggregator.example/fake'),
  sample.replace('15 Sep 2026','15 Sep 2025'),
  sample+'<p>Applications are closed</p>'
 ])assert.equal(officialMopgaPortalSaysOpen(bad,c,new Date('2026-11-17T05:00:00Z')),false);
 assert.equal(officialMopgaPortalSaysOpen(sample,c,new Date('2026-12-15T22:59:00Z')),false);
 assert.equal(officialMopgaPortalSaysOpen(sample,{...c,portal_url:'https://fake.invalid/'},new Date('2026-11-17T05:00:00Z')),false);
 const worker=readFileSync(new URL('../api/recheck-open-calls.js',import.meta.url),'utf8');
 assert.match(worker,/officialMopgaPortalSaysOpen/);
 assert.match(worker,/open_cached/);
 assert.match(worker,/last_attempted_at/);
 assert.match(worker,/closing_at=EXCLUDED[.]closing_at/);
});
