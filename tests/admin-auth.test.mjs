import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adminAuthorised } from '../lib/admin-auth.js';

const req = token => ({ headers: { authorization: token === undefined ? undefined : 'Bearer ' + token } });

test('console uses ADMIN_SECRET when configured; the cron secret no longer opens it', () => {
  const env = { ADMIN_SECRET: 'admin-key-123', CRON_SECRET: 'cron-key-456' };
  assert.equal(adminAuthorised(req('admin-key-123'), env), true);
  assert.equal(adminAuthorised(req('cron-key-456'), env), false);
  assert.equal(adminAuthorised(req('admin-key-12'), env), false);
  assert.equal(adminAuthorised(req(), env), false);
  assert.equal(adminAuthorised({ headers: { authorization: 'admin-key-123' } }, env), false);
});

test('falls back to CRON_SECRET only when ADMIN_SECRET is not set (no lock-out)', () => {
  assert.equal(adminAuthorised(req('cron-key-456'), { CRON_SECRET: 'cron-key-456' }), true);
  assert.equal(adminAuthorised(req('cron-key-456'), { ADMIN_SECRET: '  ', CRON_SECRET: 'cron-key-456' }), true);
  assert.equal(adminAuthorised(req(''), {}), false);
});

test('admin endpoints use the shared admin check; scheduled jobs keep CRON_SECRET', () => {
  for (const f of ['api/admin-health.js', 'api/admin-review.js']) {
    const s = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    assert.ok(s.includes('adminAuthorised(req)'), f);
    assert.ok(!s.includes('process.env.CRON_SECRET'), f + ' must not read CRON_SECRET directly');
  }
  const cron = readFileSync(new URL('../api/reverify.js', import.meta.url), 'utf8');
  assert.ok(cron.includes('CRON_SECRET'));
});
