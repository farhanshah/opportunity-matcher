import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');

test('two-hour catalogue cron uses provider-aware cooldowns',()=>{
  const config=JSON.parse(read('vercel.json'));
  const entry=config.crons.find(x=>x.path==='/api/reverify');
  assert.equal(entry?.schedule,'0 */2 * * *');
  const code=read('api/reverify.js');
  for(const [match,retry] of [
    ["HTTP 403","7 days"],["HTTP 429","2 days"],["HTTP 503","24 hours"],
    ["HTTP 404","3 days"],["%redirect%","3 days"],
    ["%timeout%","6 hours"]
  ]){
    assert.ok(code.includes(match),'missing '+match);
    assert.ok(code.includes("interval '"+retry+"'"),'missing '+retry);
  }
  assert.match(code,/ORDER BY last_recheck_at NULLS FIRST,external_id/);
  assert.match(code,/monitored_sources blocked/);
  assert.match(code,/blocked.last_http_status=403/);
  assert.match(code,/blocked.last_http_status=429/);
  assert.match(code,/blocked.last_http_status=503/);
  assert.match(code,/last_recheck_at IS NULL/);
  assert.match(code,/WHEN last_recheck_outcome LIKE/);
  assert.match(code,/SELECT count\(\*\)::int AS count FROM opportunity_country_routes/);
});

test('catalogue only stamps verified status after programme and country route validation',()=>{
  const code=read('api/reverify.js');
  assert.match(code,/if\(!report\.verified\)/);
  assert.match(code,/programme title mismatch/);
  assert.match(code,/country-specific application routes need direct evidence/);
  assert.match(code,/last_verified_at=now\(\),verification_confidence='high'/);
});

test('elapsed deadlines close every open-or-opening status, not only exact "Open"',()=>{
  const code=read('api/reverify.js');
  const m=code.match(/o\.status ~\* '([^']+)' AND o\.application_close_date < CURRENT_DATE/);
  assert.ok(m,'auto-close must match statuses by case-insensitive pattern');
  const pattern=new RegExp(m[1],'i');
  for(const s of ['Open','Opening Soon','Open / Varies by Country','open'])
    assert.ok(pattern.test(s),s+' must be closed once its deadline has passed');
  for(const s of ['Closed','Expected to Reopen','Expected to Reopen / Intake-specific',
    'Rolling / Vacancy-specific','Varies by Country/Programme','Opened elsewhere'])
    assert.ok(!pattern.test(s),s+' must not be auto-closed by this rule');
  // Postgres treats \b as backspace, so word boundaries must not be used.
  assert.ok(!m[1].includes('\\b'));
  assert.match(code,/r\.application_close_date>=CURRENT_DATE/,'active country routes stay protected');
});
