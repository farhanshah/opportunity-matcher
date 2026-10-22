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
    ["HTTP 403","7 days"],["HTTP 429","2 days"],
    ["HTTP 404","3 days"],["%redirect%","3 days"],
    ["%timeout%","6 hours"]
  ]){
    assert.ok(code.includes(match),'missing '+match);
    assert.ok(code.includes("interval '"+retry+"'"),'missing '+retry);
  }
  assert.match(code,/ORDER BY last_recheck_at NULLS FIRST,external_id/);
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
