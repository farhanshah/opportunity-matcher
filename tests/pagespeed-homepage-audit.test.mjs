import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('public homepage exposes one meaningful main landmark', () => {
  const html = read('index.html');
  assert.match(html, /<div id="landing" class="landing" role="main">/);
  assert.match(html, /<main class="appBody">/); // workspace retains its own landmark
});

test('official provider popover anchor remains crawlable before opening', () => {
  const js = read('source-chips-v1.js');
  assert.match(js, /link\.href\s*=\s*SOURCES\.chevening\.url/);
  assert.match(js, /link\.href\s*=\s*info\.url/);
  assert.match(js, /link\.target\s*=\s*'_blank'/);
});

test('carousel selects appropriately sized images on mobile', () => {
  const html = read('index.html');
  const images = [...html.matchAll(/<img\b[^>]*src="https:\/\/images\.unsplash\.com\/[^"]+"[^>]*>/g)]
    .map(([tag]) => tag);
  assert.equal(images.length, 7);
  for (const image of images) {
    assert.match(image, /srcset="[^"]+420w, [^"]+720w, [^"]+1100w"/);
    assert.match(image, /sizes="\(max-width:700px\) 88vw/);
    assert.match(image, /loading="(?:eager|lazy)"/);
  }
  assert.equal(images.filter(x => /fetchpriority="high"/.test(x)).length, 1);
});

test('landing contrast is increased without altering workspace themes', () => {
  const css = read('orbital-v2.css');
  assert.match(css, /#landing \.footer \.brandword small\{color:#c6f6e7!important/);
  assert.match(css, /#landing \.footer \.footerLinks span\{color:#daf7ed!important/);
  assert.doesNotMatch(css, /@import url\('https:\/\/fonts\.googleapis\.com\/css2/);
});

test('public landing avoids expensive text measuring for every node', () => {
  const js = read('app-v92-readability.js');
  assert.doesNotMatch(js, /\['landing','app','prepModal'/);
  assert.match(js, /\/\* Public site readability \*\//);
});

test('AdSense ownership is unchanged on the homepage', () => {
  const html = read('index.html');
  assert.match(html, /name="google-adsense-account" content="ca-pub-1916126969266611"/);
  assert.match(html, /pagead\/js\/adsbygoogle\.js\?client=ca-pub-1916126969266611/);
});
