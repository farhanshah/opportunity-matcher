import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, HUBS, matchProgramme } from '../tools/build-programme-links.mjs';
import { pathFor } from '../lib/programme-pages.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const rows = JSON.parse(readFileSync(join(root, 'data/programme-index.json'), 'utf8'));
const valid = new Set(rows.map(pathFor));
const htmlFiles = dir => readdirSync(join(root, dir)).flatMap(n => {
  const p = join(dir, n);
  return statSync(join(root, p)).isDirectory() ? htmlFiles(p) : n.endsWith('.html') ? [p] : [];
});

test('generated hub sections are committed and regenerating changes nothing', () => {
  const before = Object.keys(HUBS).map(f => readFileSync(join(root, f), 'utf8'));
  build({ write: false });
  build();
  const after = Object.keys(HUBS).map(f => readFileSync(join(root, f), 'utf8'));
  assert.deepEqual(after, before);
});

test('every /opportunity/ link on a static page resolves to a catalogue record', () => {
  const bad = [];
  for (const dir of ['scholarships', 'internships', 'fellowships', 'exchange-programs', 'programmes'])
    for (const f of htmlFiles(dir))
      for (const m of readFileSync(join(root, f), 'utf8').matchAll(/href="(\/opportunity\/[^"]+)"/g))
        if (!valid.has(m[1])) bad.push(f + ' -> ' + m[1]);
  assert.deepEqual(bad, []);
});

test('country hubs list only programmes in that country; level hubs use study level', () => {
  const uk = readFileSync(join(root, 'scholarships/uk/index.html'), 'utf8');
  assert.match(uk, /Chevening Scholarships/);
  assert.doesNotMatch(uk, /Global Korea Scholarship/);
  const ug = readFileSync(join(root, 'scholarships/undergraduate/index.html'), 'utf8');
  assert.match(ug, /MEXT Scholarship - Undergraduate/);
  assert.doesNotMatch(ug, /Chevening Scholarships/, 'a bachelor degree required to apply is not undergraduate study');
});

test('programme guides link only to the same programme', () => {
  assert.equal(matchProgramme('eiffel-excellence-scholarship').external_id, 'SCH-020');
  assert.equal(matchProgramme('swiss-government-excellence-scholarships').external_id, 'SCH-031');
  assert.equal(matchProgramme('erasmus-plus'), null, 'Erasmus+ is not Erasmus Mundus');
  assert.equal(matchProgramme('humboldt-research-fellowship'), null);
});

test('homepage links to the programme hub', () => {
  assert.ok(readFileSync(join(root, 'index.html'), 'utf8').includes('href="/opportunity"'));
});

test('refresh refuses malformed or sharply shrunken catalogue responses', async () => {
  const { validate } = await import('../tools/refresh-programme-index.mjs');
  assert.throws(() => validate({ error: 'x' }, rows), /not an array/);
  assert.throws(() => validate(rows.slice(0, 10), rows), /shrank/);
  assert.throws(() => validate([...rows.slice(1), { external_id: 'bad id', title: '' }], rows), /malformed/);
  assert.equal(validate(rows, rows).length, rows.length);
});

test('daily workflow refreshes from the public index and commits only on change', () => {
  const wf = readFileSync(join(root, '.github/workflows/refresh-programme-hubs.yml'), 'utf8');
  assert.match(wf, /cron: '40 7 \* \* \*'/);
  assert.match(wf, /refresh-programme-index\.mjs https:\/\/oppmatcher\.tech\/api\/programme-index/);
  assert.match(wf, /git diff --quiet/);
  assert.doesNotMatch(wf, /secrets\./, 'needs no secrets');
});
