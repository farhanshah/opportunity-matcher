import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = 'https://oppmatcher.tech';
const read = (file) => readFileSync(join(root, file), 'utf8');
const config = JSON.parse(read('vercel.json'));
const sitemap = read('sitemap.xml');
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const dynamicRoutes = ['/latest', '/opportunities'];
const allowedApplicationRoutes = new Set(['/discover', '/saved', '/tracker', '/dashboard', '/admin', '/workspace']);

function staticPath(pathname) {
  if (pathname === '/') return 'index.html';
  if (pathname === '/worldwide') return 'worldwide.html';
  if (pathname === '/tools/application-readiness') return 'tools/application-readiness.html';
  const stem = pathname.replace(/^\//, '').replace(/\/$/, '');
  const options = [stem + '/index.html', stem + '.html', stem];
  return options.find((name) => existsSync(join(root, name))) || null;
}

function knownRoute(pathname) {
  if (staticPath(pathname)) return true;
  if (pathname.startsWith('/api/')) return true;
  if (dynamicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) return true;
  if (allowedApplicationRoutes.has(pathname)) return true;
  for (const route of [...(config.rewrites || []), ...(config.redirects || [])]) {
    if (route.source === pathname) return true;
    if (route.source?.includes(':') && pathname.startsWith(route.source.split('/:')[0] + '/')) return true;
  }
  return false;
}

test('sitemap URLs are unique, HTTPS, and point to existing pages or supported routes', () => {
  assert.ok(paths.length > 100, 'Expected all main SEO pages in the sitemap');
  assert.equal(new Set(paths).size, paths.length, 'Duplicate sitemap URLs');
  for (const u of paths) {
    const parsed = new URL(u);
    assert.equal(parsed.origin, site, 'Non-canonical sitemap origin: ' + u);
    assert.ok(knownRoute(parsed.pathname), 'Sitemap route is missing: ' + u);
  }
});

test('indexable HTML pages retain valid metadata, canonical, heading, and FAQ structure', () => {
  for (const u of paths) {
    const parsed = new URL(u);
    const file = staticPath(parsed.pathname);
    if (!file || !file.endsWith('.html')) continue;
    const html = read(file);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
    const description = html.match(/<meta name="description" content="([^"]*)"/i)?.[1] || '';
    const canonical = html.match(/rel="canonical" href="([^"]*)"/i)?.[1];
    const robots = html.match(/name="robots" content="([^"]*)"/i)?.[1] || '';
    assert.ok(title.length > 10 && title.length <= 65, 'Title length problem: ' + file + ' (' + title.length + ')');
    assert.ok(description.length >= 50 && description.length <= 165, 'Description length problem: ' + file + ' (' + description.length + ')');
    assert.equal(canonical, u, 'Canonical mismatch: ' + file);
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'H1 count not equal to 1: ' + file);
    assert.ok(!robots.startsWith('noindex'), 'Noindex page in sitemap: ' + file);
    assert.ok(!/<h3>[A-Za-z]<\/h3><p>[A-Za-z]<\/p>/i.test(html), 'Malformed one-letter FAQ: ' + file);
  }
});

test('HTML internal links resolve to local pages, live directories, or configured app routes', () => {
  const failures = [];
  for (const u of paths) {
    const file = staticPath(new URL(u).pathname);
    if (!file || !file.endsWith('.html')) continue;
    const html = read(file);
    for (const m of html.matchAll(/<a\b[^>]*href="(\/[^"]+)"/gi)) {
      const cleaned = m[1].replace(/&amp;/g, '&');
      const pathname = cleaned.split(/[?#]/)[0];
      if (!pathname) continue;
      if (/\.(?:png|svg|webp|jpg|jpeg|gif|ico|css|js|webmanifest|pdf|mp4)$/i.test(pathname)) continue;
      if (!knownRoute(pathname)) failures.push(file + ' -> ' + pathname);
    }
  }
  assert.deepEqual(failures, [], 'Unknown internal-link targets');
});


test('blog discovery links and sitemap agree with editorial indexability for every guide', () => {
  const hub = read('blog/index.html');
  const dirs = [...(awaitableDirectories())];
  const sitemapUrls = new Set(paths);
  let published = 0, withheld = 0;
  for (const slug of dirs) {
    const document = read('blog/' + slug + '/index.html');
    const canonical = site + '/blog/' + slug + '/';
    const robots = document.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)?.[0] || '';
    const noindex = /noindex/i.test(robots);
    const isLinked = hub.includes('href="/blog/' + slug + '/"');
    const isSubmitted = sitemapUrls.has(canonical);
    assert.equal(isSubmitted, !noindex, slug + ': sitemap contradicts robots metadata');
    assert.equal(isLinked, !noindex, slug + ': directory promotes excluded editorial draft');
    assert.ok(document.includes('rel="canonical" href="' + canonical + '"'), slug + ': incorrect canonical');
    if (noindex) withheld++;
    else published++;
  }
  assert.ok(published >= 45, 'Expected all public reviewed blog guides to remain discoverable');
  assert.ok(withheld >= 15, 'The deliberate draft exclusions should remain respected');
});

function awaitableDirectories() {
  return readdirSync(join(root, 'blog'), { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name);
}

test('Google-critical entry pages remain indexable, self-canonical and linked', () => {
  const homepage = read('index.html');
  for (const [url, file] of [
    ['/', 'index.html'], ['/about', 'about.html'],
    ['/blog/', 'blog/index.html'], ['/scholarships/', 'scholarships/index.html'],
    ['/internships/', 'internships/index.html'],
    ['/fellowships/', 'fellowships/index.html'],
    ['/programmes/', 'programmes/index.html'],
    ['/exchange-programs/', 'exchange-programs/index.html']
  ]) {
    const html = read(file);
    const canonical = site + url;
    assert.ok(paths.includes(canonical), 'Entry page missing from canonical sitemap: ' + url);
    assert.ok(html.includes('rel="canonical" href="' + canonical + '"'), 'Bad canonical: ' + url);
    assert.match(html, /name=["']robots["']\s+content=["']index,follow["']/i, 'Indexing blocked: ' + url);
    assert.ok(homepage.includes('href="' + url + '"'), 'Homepage must link directly to crawl entry: ' + url);
  }
  assert.match(read('robots.txt'), /Sitemap: https:\/\/oppmatcher\.tech\/sitemap\.xml/);
  assert.match(read('robots.txt'), /Sitemap: https:\/\/oppmatcher\.tech\/opportunities-sitemap\.xml/);
});
