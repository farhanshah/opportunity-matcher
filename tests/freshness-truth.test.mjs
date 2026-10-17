import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evidenceIsCurrent,recheckCategory,FRESHNESS_WINDOW_DAYS} from '../lib/opportunity-freshness.js';
const now=Date.UTC(2026,9,17,12);
test('freshness requires an actual recent evidence timestamp',()=>{
  assert.equal(FRESHNESS_WINDOW_DAYS,30);
  assert.equal(evidenceIsCurrent(null,now),false);
  assert.equal(evidenceIsCurrent('invalid',now),false);
  assert.equal(evidenceIsCurrent('2026-08-20T00:00:00Z',now),false);
  assert.equal(evidenceIsCurrent('2026-10-16T00:00:00Z',now),true);
  assert.equal(evidenceIsCurrent(new Date(now+86400000),now),false);
  assert.equal(evidenceIsCurrent(new Date(now-30*86400000),now),true);
});
test('recheck attempts never confer verification by themselves',()=>{
  assert.equal(recheckCategory('needs_evidence: country details missing'),'needs_evidence');
  assert.equal(recheckCategory('retry_needed: HTTP 403'),'retry_needed');
  assert.equal(recheckCategory('verified_current_cycle'),'verified_current_cycle');
  assert.equal(recheckCategory(null),'not_checked');
});
test('the catalogue publishes independent freshness for programmes, rules and routes',()=>{
  const api=readFileSync(new URL('../api/opportunities.js',import.meta.url),'utf8');
  for(const field of ['programme_needs_recheck','rule_needs_recheck','country_route_needs_recheck','Verification_Confidence_Current','Recheck_Category'])
    assert.ok(api.includes(field),'Missing '+field);
  assert.match(api,/Verification_Stale:\s*isStale\(row.last_verified_at\)/);
});
test('public freshness banner uses actual health metrics, never an optimistic default',()=>{
  const client=readFileSync(new URL('../app-v155-freshness-truth-v286.js',import.meta.url),'utf8');
  assert.ok(client.includes("fetch('/api/health'"));
  assert.ok(client.includes('programme_needs_recheck'));
  assert.ok(client.includes('Source freshness status unavailable'));
  assert.doesNotMatch(client,/last_success_at\s*=\s*last_verified_at/);
});
