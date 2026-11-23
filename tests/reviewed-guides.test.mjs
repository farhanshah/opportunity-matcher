import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Guides that were held as noindex drafts (3 Nov 2026) and re-indexed on 23 Nov 2026
// only after a source-backed rewrite. Each must keep that standard.
export const REVIEWED = [
  'chevening-work-experience-calculation',
  'commonwealth-scholarship-nominating-agency',
  'daad-vs-university-scholarship-germany',
  'fully-funded-vs-partially-funded-scholarships',
];

const get = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('re-indexed guides carry real, cited content and are discoverable', () => {
  const sitemap = get('sitemap.xml');
  const hub = get('blog/index.html');
  for (const slug of REVIEWED) {
    const html = get('blog/' + slug + '/index.html');
    const article = html.match(/<article class="article">([\s\S]*?)<\/article>/)?.[1] || '';
    const words = article.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
    assert.ok(words >= 900, slug + ' is too thin (' + words + ' words)');
    assert.ok(/<table\b/.test(article), slug + ' needs a comparison table');
    const external = article.match(/href="https:\/\/(?!oppmatcher\.tech)/g) || [];
    assert.ok(external.length >= 2, slug + ' needs at least two official citations');
    assert.ok(!html.includes('<b>Editorial review</b>'), slug + ' still shows the draft notice');
    assert.match(html, /<meta name="robots" content="index,follow">/);
    assert.match(html, /"dateModified":"2026-11-2\d"/);
    assert.ok(html.includes('Updated 2'), slug + ' must show when it was updated');
    assert.ok(sitemap.includes('<loc>https://oppmatcher.tech/blog/' + slug + '/</loc>'), slug + ' not in sitemap');
    assert.ok(hub.includes('href="/blog/' + slug + '/"'), slug + ' not linked from the guide directory');
    for (const id of article.matchAll(/<h2 id="([^"]+)"/g)) {
      assert.equal(html.split('id="' + id[1] + '"').length, 2, slug + ' duplicate heading id ' + id[1]);
    }
  }
});
