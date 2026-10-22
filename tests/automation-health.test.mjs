import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {healthFindings} from '../lib/automation-health.js';
test('healthy completed morning pipeline sends no alarm',()=>{
 assert.deepEqual(healthFindings({official_discovery:4,worldwide_discovery:1,worldwide_verification:3,digest_sent:1,due_records:12,catalogue_rechecks:12}),[]);
});
test('missing jobs and stuck catalogue create precise alarms',()=>{
 const failures=healthFindings({official_discovery:0,worldwide_discovery:1,worldwide_verification:0,digest_sent:0,due_records:16,catalogue_rechecks:0});
 assert.equal(failures.length,4);
 assert.ok(failures.some(x=>x.includes('Catalogue verification')));
});
test('health endpoint requires secret, deduplicates per UK day and never alters opportunity records',()=>{
 const api=readFileSync(new URL('../api/automation-health-watch.js',import.meta.url),'utf8');
 const conf=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(conf.crons.find(x=>x.path==='/api/automation-health-watch').schedule,'40 12 * * *');
 assert.match(api,/req.headers.authorization/);
 assert.match(api,/ON CONFLICT\(report_date\) DO NOTHING/);
 assert.match(api,/Idempotency-Key/);
 assert.doesNotMatch(api,/UPDATE opportunities|INSERT INTO opportunities/);
});
