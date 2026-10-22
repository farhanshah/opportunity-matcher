import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHEVENING_OPEN_CALLS,officialPageSaysOpen} from '../lib/official-open-calls.js';
const sample=(call)=>'<html><main><h1>'+call.title+'</h1>'+
 '<p>Open for applications until 27 October 2026, at 12:00 (UTC)</p>'+
 '<p>Applications are open</p>'+
 '<p>Eligibility: '+call.countries.join(', ')+' citizens and relevant researchers.</p>'+
 '<p>Postgraduate qualification and five years professional research experience. '+
 'Applicants should always confirm the instructions directly with the official provider. Applications must follow all published eligibility rules and the provider reserves the right to close an intake early.</p>'+
 '</main></html>';
test('provider calls open on 22 October only with explicit date and country conditions',()=>{
 for(const c of CHEVENING_OPEN_CALLS){
  assert.equal(officialPageSaysOpen(sample(c),c,new Date('2026-10-22T10:00:00Z')),true);
  assert.equal(officialPageSaysOpen(sample(c),c,new Date('2026-10-27T12:00:00Z')),false);
  assert.equal(officialPageSaysOpen(sample(c).replace('Applications are open','Applications are closed'),c,new Date('2026-10-22T10:00:00Z')),false);
  assert.equal(officialPageSaysOpen(sample(c).replace('27 October 2026','1 October 2026'),c,new Date('2026-10-22T10:00:00Z')),false);
  assert.equal(officialPageSaysOpen(sample(c).replace(c.countries[0],'Other country'),c,new Date('2026-10-22T10:00:00Z')),false);
 }
});
test('open-call API expires calls, keeps citizenship restrictions and does not create eligibility matches',()=>{
 const api=readFileSync(new URL('../api/open-calls.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/recheck-open-calls.js',import.meta.url),'utf8');
 const page=readFileSync(new URL('../worldwide-v1.js',import.meta.url),'utf8');
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.match(api,/closing_at>now\(\)/);assert.match(api,/status='open'/);
 assert.match(api,/eligible_countries:x\.eligible_countries/);
 assert.match(api,/personal_eligibility:'not_assessed'/);
 assert.match(worker,/CRON_SECRET/);assert.match(worker,/officialPageSaysOpen/);
 assert.match(worker,/status='needs_recheck'/);
 assert.equal(config.crons.find(c=>c.path==='/api/recheck-open-calls').schedule,'20 */6 * * *');
 assert.match(page,/Citizenship:/);
 assert.doesNotMatch(api+worker,/INSERT INTO opportunities|UPDATE opportunities/);
});
