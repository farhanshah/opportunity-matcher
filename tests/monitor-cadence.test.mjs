import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const config=JSON.parse(get('vercel.json'));
const cron=path=>config.crons.find(x=>x.path===path);
test('primary ingest remains daily and source-only cron provides four UTC checks',()=>{
  assert.equal(cron('/api/monitor').schedule,'0 3 * * *');
  assert.equal(cron('/api/monitor-sources').schedule,'0 5,11,17,23 * * *');
  assert.equal(config.crons.filter(x=>x.path==='/api/monitor-sources').length,1);
  assert.equal(cron('/api/reverify').schedule,'0 */2 * * *');
  assert.equal(cron('/api/welcome-email').schedule,'*/5 * * * *');
});
test('source-only monitor keeps bounded batches, request auth, and no second vacancy ingestion',()=>{
  const source=get('api/monitor-sources.js');
  assert.ok(source.includes('const MAX_SOURCES_PER_RUN = 26;'));
  assert.ok(source.includes('const FETCH_CONCURRENCY = 16;'));
  assert.ok(source.includes('runDueSourceChecks(sql, MAX_SOURCES_PER_RUN, FETCH_CONCURRENCY)'));
  assert.ok(source.includes('if (!authorised(req)) return res.status(401)'));
  assert.ok(!source.includes('ingestExactVacancies('));
});
test('due check uses provider retry cooldown and host limits',()=>{
  const source=get('api/monitor.js');
  assert.ok(source.includes('check_interval_minutes * interval'));
  assert.ok(source.includes('last_http_status NOT IN (403,429,503)'));
  assert.ok(source.includes("WHEN last_http_status=403 THEN interval '7 days'"));
  assert.ok(source.includes("WHEN last_http_status=429 THEN interval '2 days'"));
  assert.ok(source.includes("WHEN last_http_status=503 THEN interval '24 hours'"));
  assert.ok(source.includes('ROW_NUMBER() OVER'));
  assert.ok(source.includes('WHERE host_rank<=3'));
  assert.ok(source.includes('WHERE is_active=true'));
});
test('high-risk review events are surfaced without erasing pending review history',()=>{
  const frontend=get('admin-v1.js');
  const html=get('admin.html');
  const api=get('api/admin-health.js');
  assert.ok(html.includes('id="priorityReviewCount"'));
  assert.ok(frontend.includes('s.high_risk_pending'));
  assert.ok(frontend.includes('s.pending_review_groups'));
  assert.ok(api.includes("status='pending_review'"));
  assert.ok(api.includes('if (!authorised(req)) return res.status(401)'));
});
