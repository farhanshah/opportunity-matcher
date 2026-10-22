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


test('missing official-grants cron is an alert only after rollout grace period',()=>{
 const healthy={official_discovery:1,worldwide_discovery:1,worldwide_verification:1,
   digest_sent:1,due_records:0,catalogue_rechecks:1};
 assert.deepEqual(healthFindings({...healthy,official_grants_api:null}),[]);
 const errors=healthFindings({...healthy,official_grants_api:0});
 assert.equal(errors.length,1);
 assert.match(errors[0],/Grants.gov/);
 assert.deepEqual(healthFindings({...healthy,official_grants_api:1}),[]);
 const code=readFileSync(new URL('../api/automation-health-watch.js',import.meta.url),'utf8');
 assert.match(code,/2026-10-24T00:00:00Z/);
 assert.match(code,/opportunity_official_feed_runs/);
});


test('government feed is watched after its first run but never raises launch-day false positives',()=>{
 const base={official_discovery:1,worldwide_discovery:1,worldwide_verification:1,
  digest_sent:1,due_records:0,catalogue_rechecks:12};
 assert.deepEqual(healthFindings({...base,official_feed_prior:0,official_feed_recent:0}),[]);
 assert.deepEqual(healthFindings({...base,official_feed_prior:3,official_feed_recent:1}),[]);
 const findings=healthFindings({...base,official_feed_prior:3,official_feed_recent:0});
 assert.equal(findings.length,1);
 assert.match(findings[0],/government feed/);
});

test('daily health detects silent stops in scaled provider link and exact-vacancy discovery',()=>{
 const base={official_discovery:1,worldwide_discovery:1,worldwide_verification:1,
  digest_sent:1,due_records:0,catalogue_rechecks:1,official_grants_api:1,
  official_feed_prior:0,official_feed_recent:0};
 const flagged=healthFindings({...base,official_links:0,exact_internships:0});
 assert.ok(flagged.some(x=>x.includes('Official-provider link discovery')));
 assert.ok(flagged.some(x=>x.includes('Exact official internship discovery')));
 assert.deepEqual(healthFindings({...base,official_links:1,exact_internships:1}),[]);
 assert.deepEqual(healthFindings({...base,official_links:null,exact_internships:null}),[]);
});
