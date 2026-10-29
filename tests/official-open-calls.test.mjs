import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OFFICIAL_OPEN_CALLS,officialPageSaysOpen} from '../lib/official-open-calls.js';
const day=c=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(c.deadline));
function sample(c){
 const date=day(c);
 const status=c.url.includes('chevening.org')?'Open for applications until '+date+' at 12:00 (UTC). Applications are open.':'Status: Open Deadline: '+date;
 return '<html><main><h1>'+c.title+'</h1><p>'+status+'</p><p>Eligibility rules: '+
  c.countries.join(', ')+'</p><p>'+
  'The official programme has detailed restrictions. All applicants should check the source for the requirements, academic background, route, supporting documents and terms. '.repeat(6)+
  '</p></main></html>';
}
test('all reviewed official open calls require exact provider status and date and auto-expire',()=>{
 assert.equal(OFFICIAL_OPEN_CALLS.length,8);
 for(const c of OFFICIAL_OPEN_CALLS){
  const html=sample(c);
  assert.equal(officialPageSaysOpen(html,c,new Date('2026-10-22T14:00:00Z')),true,c.slug);
  assert.equal(officialPageSaysOpen(html,c,new Date(c.deadline)),false,c.slug);
  assert.equal(officialPageSaysOpen(html.replace(day(c),'1 October 2026'),c,new Date('2026-10-22T14:00:00Z')),false,c.slug);
  if(c.url.includes('chevening.org')){
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
