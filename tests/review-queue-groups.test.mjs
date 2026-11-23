import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { meaningfulChange, stripVolatileCounters, stableSignals } from '../lib/monitor.js';
import { counterOnlyDifference, COUNTER_ONLY_NOTE } from '../api/triage-nonmaterial.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sig = app => ({ dates: [], application: app, eligibility: [], funding: [] });

test('page view / visitor counters never raise an alert', () => {
  // Real TaiwanICDF footer text: only the counters changed between fetches.
  const a = sig(['Guidebook v4.pdf 更新日期: 2026/07/15 點閱次數:544822 此頁資訊 瀏覽人次: 89975195 回頁首']);
  const b = sig(['Guidebook v4.pdf 更新日期: 2026/07/15 點閱次數:545173 此頁資訊 瀏覽人次: 89980225 回頁首']);
  assert.equal(meaningfulChange(a, b), null);
  assert.equal(counterOnlyDifference(a, b), true);
  assert.equal(stripVolatileCounters('Page views: 1,204 · 87 visitors'), 'Page views · visitors');
  assert.deepEqual(stableSignals(['Hits: 12', 'Hits: 13']), ['Hits']);
});

test('real text changes are still alerts, including dates and deadlines', () => {
  const a = sig(['Applications open 1 December 2026. 點閱次數:1']);
  const b = sig(['Applications open 5 January 2027. 點閱次數:2']);
  assert.deepEqual(meaningfulChange(a, b)?.changed, ['application']);
  assert.equal(counterOnlyDifference(a, b), false);
  // A bare number that is not a counter is content.
  assert.ok(meaningfulChange(sig(['Stipend 1,200 per month']), sig(['Stipend 1,500 per month'])));
  assert.equal(counterOnlyDifference(null, b), false);
});

test('monitor fingerprints use the same counter-free comparison', () => {
  const monitor = read('api/monitor.js');
  assert.match(monitor, /change\.changed\.map\(key => \[key, stableSignals\(signals\[key\]\)\]\)/);
  const triage = read('api/triage-nonmaterial.js');
  assert.ok(triage.includes('counterOnlyDifference(c.previous,c.current)'));
  assert.ok(COUNTER_ONLY_NOTE.includes('Snapshots retained'));
});

test('review queue groups alerts by monitored page and decides per page', () => {
  const api = read('api/admin-health.js');
  assert.match(api, /WINDOW w AS \(PARTITION BY c\.source_id\)/);
  assert.match(api, /count\(DISTINCT source_id\)::int\s+FROM detected_changes WHERE status='pending_review'\) AS pending_review_groups/);
  for (const k of ['net_changed', 'window_previous', 'group_change_types', 'first_detected_at', 'last_detected_at', 'high_events'])
    assert.ok(api.includes(k), k);
  const review = read('api/admin-review.js');
  // Bounded by the newest alert shown, so later alerts stay pending; investigate is not a bulk action.
  assert.match(review, /AND detected_at <= \$\{new Date\(through\)\.toISOString\(\)\}/);
  assert.match(review, /action === 'investigate'/);
  assert.match(review, /source_id=\$\{sourceId\} AND status='pending_review'/);
  assert.ok(review.includes('adminAuthorised'));
  const ui = read('admin-v1.js');
  assert.ok(ui.includes('data-group-action="approve"') && ui.includes('data-group-action="ignore"'));
  assert.ok(ui.includes("button.dataset.armed!=='1'"), 'two-click confirmation');
  assert.ok(!/\bconfirm\(|\balert\(/.test(ui), 'no blocking browser dialogs');
});
