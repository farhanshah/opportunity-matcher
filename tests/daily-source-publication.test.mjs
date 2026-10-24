import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=JSON.parse(get('vercel.json'));
test('successful unchanged provider rechecks keep source-only publications fresh',()=>{
 const prom=get('api/promote-source-snapshots.js'),mine=get('api/discover-official-links.js');
 for(const s of [prom,mine]){
  assert.match(s,/m.last_success_at>=now\(\)-interval/);
  assert.match(s,/m.last_error IS NULL/);
  assert.match(s,/m.last_http_status IN \(200,304\)/);
  assert.match(s,/s.http_status=200/);
 }
 assert.match(prom,/checkedAt:s.checked_at/);
 assert.doesNotMatch(prom,/INSERT INTO opportunities|UPDATE opportunities/);
});
test('scheduled discovery and source-only publication cover mornings, middays, and evenings',()=>{
 assert.equal(config.crons.find(x=>x.path==='/api/promote-source-snapshots').schedule,'40 5,6,12,18 * * *');
 assert.equal(config.crons.find(x=>x.path==='/api/discover-official-links').schedule,'10 1,5,13,17 * * *');
});
test('admin distinguishes source-confirmed pages from fully verified programmes',()=>{
 const api=get('api/admin-health.js'),ui=get('admin-v1.js'),html=get('admin.html');
 assert.match(api,/AS source_confirmed_published_today/);
 assert.match(api,/AS exact_open_published_today/);
 assert.match(ui,/sourceConfirmedToday/);
 assert.match(ui,/exactOpenToday/);
 assert.match(html,/intake unverified/);
});
