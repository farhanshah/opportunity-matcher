import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('confirm_rules only stamps rules and routes for one opportunity, behind admin auth', () => {
  const s = read('api/admin-review.js');
  assert.match(s, /adminAuthorised/);
  const block = s.slice(s.indexOf("action === 'confirm_rules'"), s.indexOf('// Group decision'));
  assert.match(block, /UUID\.test\(opportunityId\)/);
  assert.match(block, /UPDATE opportunity_eligibility_rules SET last_verified_at=now\(\) WHERE opportunity_id=\$\{opportunityId\}/);
  assert.match(block, /UPDATE opportunity_country_routes SET last_verified_at=now\(\) WHERE opportunity_id=\$\{opportunityId\}/);
  assert.doesNotMatch(block, /UPDATE opportunities\b/, 'confirming rules must not change the record itself');
});

test('nightly re-check skips sites that have refused automated checks for 30 days', () => {
  const s = read('api/reverify.js');
  assert.match(s, /last_http_status IN \(403,429\)\)\s*>=\s*1\s*AND max\(coalesce\(blocked\.last_success_at/);
});

test('admin exposes the manual-check list and a two-click confirm', () => {
  assert.match(read('api/admin-health.js'), /manual_checks: manualChecks/);
  const js = read('admin-v1.js');
  assert.match(js, /function renderManual\(\)/);
  assert.match(js, /async function confirmRules[\s\S]{0,400}Confirm: checked today/);
  assert.match(read('admin.html'), /id="view-manual"/);
});
