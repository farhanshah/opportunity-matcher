import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mainWords, isIndexable, MIN_AD_WORDS, ALWAYS_ADS} from '../tools/apply-ad-policy.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SKIP = new Set(['node_modules', '.git', 'tests', 'data', 'fonts', 'api', 'lib']);
const walk = (d, out = []) => { for (const e of readdirSync(d, {withFileTypes: true})) {
  if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith('.')) walk(join(d, e.name), out); }
  else if (e.name.endsWith('.html')) out.push(join(d, e.name)); } return out; };
const policy = JSON.parse(readFileSync(join(ROOT, 'data/ad-free-pages.json'), 'utf8'));
const adFree = new Set(policy.pages.map(p => p.path));

test('AdSense loads only on substantial indexable pages', () => {
  let withAds = 0;
  for (const file of walk(ROOT)) {
    const path = file.slice(ROOT.length), html = readFileSync(file, 'utf8');
    if (!html.includes('adsbygoogle.js')) continue;
    withAds++;
    assert.ok(isIndexable(html), path + ' is noindex but loads AdSense');
    assert.ok(!adFree.has(path), path + ' is on the ad-free list but loads AdSense');
    assert.ok(ALWAYS_ADS.has(path) || mainWords(html) >= MIN_AD_WORDS,
      path + ' has fewer than ' + MIN_AD_WORDS + ' words of main content; run tools/apply-ad-policy.mjs or expand it');
  }
  assert.ok(withAds >= 60, 'expected the substantial guides to keep ads, found ' + withAds);
});

test('ad-free pages stay indexed and listed truthfully', () => {
  for (const {path} of policy.pages) {
    const html = readFileSync(join(ROOT, path), 'utf8');
    assert.ok(isIndexable(html), path + ' ad-free pages must remain indexable');
    assert.ok(!html.includes('adsbygoogle.js'), path + ' listed as ad-free but loads ads');
  }
});

test('generated programme, latest and opportunity pages carry no AdSense', () => {
  for (const f of ['lib/programme-pages.js', 'api/latest.js', 'api/public-opportunities.js'])
    assert.ok(!readFileSync(join(ROOT, f), 'utf8').includes('adsbygoogle.js'), f);
});
