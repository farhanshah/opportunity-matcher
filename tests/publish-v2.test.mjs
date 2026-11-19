import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyOfficialPage } from '../lib/verification-v2.js';
import { v2Nationalities, v2Notes, recheckUpdate, publishV2, COUNTRY_SPECIFIC_LABEL } from '../lib/publish-v2.js';

const NOW = new Date('2026-11-19T09:00:00Z');
const mk = (t, b) => `<main><h1>${t}</h1>${b}</main>`;
const restricted = verifyOfficialPage(mk('Africa Leaders Scholarship 2027', '<h2>Eligibility</h2><p>You must be a citizen of Kenya or Ghana and hold a bachelor\'s degree.</p><p>Application deadline: 15 January 2027</p>'), 'https://www.example.ac.uk/a', 'X', NOW);
const worldwide = verifyOfficialPage(mk('Global Research Fellowship', '<h2>Eligibility</h2><p>Open to applicants of all nationalities with a PhD.</p><p>Applications are now open.</p><p>Deadline: 1 March 2027</p>'), 'https://www.example.org/b', 'X', NOW);
const silent = verifyOfficialPage(mk('Graduate Internship Programme', '<h2>Eligibility</h2><p>Applicants must hold a master\'s degree.</p><p>Application deadline: 1 February 2027</p>'), 'https://www.example.org/c', 'X', NOW);

// The live site's own nationality matcher, extracted from app-v08-match.js.
const src = readFileSync(new URL('../app-v08-match.js', import.meta.url), 'utf8');
const fn = src.match(/function checkNationality\(o,p\)\{[\s\S]*?\n?\}(?=function|\n|$)/)[0];
const checkNationality = new Function('low', fn + '; return checkNationality;')(v => String(v || '').toLowerCase());

test('restricted nationality is stored as a review label, never widened', () => {
  assert.deepEqual(v2Nationalities(restricted), [COUNTRY_SPECIFIC_LABEL]);
  assert.match(v2Notes(restricted), /citizen of Kenya or Ghana/);
  for (const nat of ['Kenya', 'India', 'Brazil']) {
    const r = checkNationality({ Eligible_Nationalities: v2Nationalities(restricted) }, { nat });
    assert.equal(r.status, 'review', nat + ' must be sent to the official page, not passed or failed');
  }
});

test('explicit all-nationalities passes; silence stays review', () => {
  assert.deepEqual(v2Nationalities(worldwide), ['All Nationalities']);
  assert.equal(checkNationality({ Eligible_Nationalities: v2Nationalities(worldwide) }, { nat: 'India' }).status, 'pass');
  assert.deepEqual(v2Nationalities(silent), []);
  assert.equal(checkNationality({ Eligible_Nationalities: v2Nationalities(silent) }, { nat: 'India' }).status, 'review');
});

test('publishV2 inserts no hard rule for restricted records and withholds duplicates', async () => {
  const calls = [];
  const sql = (s, ...v) => { calls.push({ q: s.join('?'), v }); return Promise.resolve(calls.length === 2 ? [{ id: 'dup' }] : []); };
  const out = await publishV2(sql, { id: null, provider: 'X', source_url: 'https://www.example.ac.uk/' }, 'https://www.example.ac.uk/a', restricted);
  assert.equal(out.status, 'needs_evidence');
  assert.match(out.reason, /duplicate withheld/);
  const calls2 = [];
  const sql2 = (s, ...v) => { calls2.push({ q: s.join('?'), v }); return Promise.resolve(calls2.length >= 3 ? [{ id: 'new' }] : []); };
  const ok = await publishV2(sql2, { id: null, provider: 'X', source_url: 'https://www.example.ac.uk/' }, 'https://www.example.ac.uk/a', restricted);
  assert.equal(ok.status, 'published');
  const insert = calls2[2];
  assert.ok(insert.v.includes(false), 'worldwide rule flag must be false for restricted pages');
  assert.ok(insert.v.includes('Open'));
});

test('review / closed / rejected results are never published', async () => {
  const sql = () => { throw Error('must not touch the database'); };
  const review = verifyOfficialPage(mk('Global Scholarship', '<p>About us.</p>'), 'https://www.example.org/d', 'X', NOW);
  assert.equal((await publishV2(sql, {}, 'https://www.example.org/d', review)).status, 'needs_evidence');
});

test('re-check never changes country-varying records and keeps Expected to Reopen when a page is closed', () => {
  assert.equal(recheckUpdate({ status: 'Varies by Country/Programme' }, worldwide), null);
  assert.equal(recheckUpdate({ status: 'Expected to Reopen / Intake-specific' }, { decision: 'CLOSED', record: {} }).status, 'Expected to Reopen / Intake-specific');
  assert.equal(recheckUpdate({ status: 'Opening Soon' }, { decision: 'CLOSED', record: {} }).status, 'Closed');
  assert.equal(recheckUpdate({ status: 'Rolling / Roster' }, { decision: 'VERIFIED_ROLLING', record: {} }).status, 'Rolling / Roster');
  assert.equal(recheckUpdate({ status: 'Open' }, { decision: 'NEEDS_REVIEW', record: {} }), null);
  const u = recheckUpdate({ status: 'Expected to Reopen' }, worldwide);
  assert.deepEqual([u.status, u.close], ['Open', '2027-03-01']);
});
