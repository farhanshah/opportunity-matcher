import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withChrome, siteHeader } from '../lib/site-chrome.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SKIP = new Set(['node_modules', '.git', 'tests', 'data', 'fonts', 'api', 'lib', 'blog']);
const walk = (d, out = []) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith('.')) walk(join(d, e.name), out); }
  else if (e.name.endsWith('.html')) out.push(join(d, e.name)); } return out; };

test('every public hub/programme page and about/contact use the shared header and footer', () => {
  let n = 0;
  for (const f of walk(ROOT)) {
    const p = f.slice(ROOT.length), html = readFileSync(f, 'utf8');
    if (/noindex/i.test(html.match(/<meta[^>]*name=["']robots["'][^>]*>/i)?.[0] || '')) continue;
    if (!/<main>\s*<nav class="crumb"/.test(html) && !['about.html', 'contact.html'].includes(p)) continue;
    n++;
    assert.match(html, /<header class="omHeader">/, p + ' header (run tools/apply-site-chrome.mjs)');
    assert.match(html, /<footer class="omFooter">/, p + ' footer');
    assert.match(html, /\/site-chrome-v1\.css/, p + ' stylesheet');
    assert.equal((html.match(/<header\b/g) || []).length, 1, p + ' single header');
  }
  assert.ok(n >= 50, 'expected the hub and programme pages, found ' + n);
});

test('server-rendered public pages are wrapped in the shared chrome', () => {
  for (const f of ['api/latest.js', 'api/public-opportunities.js', 'api/programme-page.js'])
    assert.match(readFileSync(join(ROOT, f), 'utf8'), /withChrome\(/, f);
  const out = withChrome('<html><head></head><body><header>old</header><main>x</main><footer>old</footer></body></html>', 'latest');
  assert.match(out, /omHeader/); assert.match(out, /omFooter/); assert.doesNotMatch(out, /<header>old/);
  assert.match(siteHeader('/latest'), /href="\/latest" aria-current="page"/);
});
