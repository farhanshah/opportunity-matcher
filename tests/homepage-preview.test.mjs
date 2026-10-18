import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const live=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const preview=readFileSync(new URL('../design-preview.html',import.meta.url),'utf8');
test('preview has a distinct turquoise visual identity with noindex',()=>{
  assert.match(preview,/<meta name="robots" content="noindex,nofollow">/);
  assert.match(preview, /--aqua:#51e7d6/);
  assert.match(preview, /DESIGN CONCEPT 01/);
  assert.match(preview, /Return to live OppMatcher/);
});
test('design has working navigation, responsive states and reduced-motion fallback',()=>{
  for(const id of ['top','why','categories','process','workspace','faq','navLinks','menuBtn'])
    assert.ok(preview.includes('id="'+id+'"'),id+' missing');
  for(const target of ['href="/discover"','href="/blog/"','href="/privacy"','href="/"'])
    assert.ok(preview.includes(target),target+' missing');
  assert.match(preview, /prefers-reduced-motion:reduce/);
  assert.match(preview, /IntersectionObserver/);
  assert.match(preview, /aria-expanded/);
  assert.match(preview, /\.navLinks\.open/);
  assert.match(preview, /\.serviceRow\.active/);
});
test('preview is a standalone design and does not alter production entrypoint',()=>{
  assert.match(live, /<div id="landing" class="landing">/);
  assert.match(live, /styles-v07\.css/);
  assert.match(live, /app-v07\.js/);
  assert.doesNotMatch(live, /DESIGN CONCEPT 01/);
  assert.doesNotMatch(preview, /<script[^>]*src="\/app-v07\.js"/);
});
test('preview avoids fictitious verification and partner claims',()=>{
  assert.match(preview,/does not imply affiliation or endorsement/);
  assert.match(preview,/Illustrative interface/);
  assert.match(preview,/Unknown requirements stay visible/);
  assert.match(preview,/official source/);
});
