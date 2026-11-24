#!/usr/bin/env node
// Ad placement policy: AdSense loads only on substantial pages.
// Static indexable pages whose <main> text is shorter than MIN_AD_WORDS lose
// the AdSense loader and are recorded in data/ad-free-pages.json. The pages
// stay indexed; they simply do not carry ads until they are expanded.
// Re-run after expanding a page: pages that now pass the threshold get the
// loader back and leave the list.
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join, relative} from 'node:path';

export const MIN_AD_WORDS = 500;
export const ALWAYS_ADS = new Set(['index.html']); // homepage carries publisher verification
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SKIP_DIRS = new Set(['node_modules', '.git', 'tests', 'data', 'fonts', 'api', 'lib']);
export const AD_TAG = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1916126969266611"\n     crossorigin="anonymous"></script>';
const LOADER = /<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-1916126969266611"\s*crossorigin="anonymous"><\/script>/g;

export function mainWords(html) {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  let body = m ? m[1] : html.replace(/<head\b[\s\S]*?<\/head>/i, '');
  body = body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
  return body.split(/\s+/).filter(Boolean).length;
}

export function isIndexable(html) {
  const robots = html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)?.[0] || '';
  return !/noindex/i.test(robots);
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, {withFileTypes: true})) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(join(dir, e.name), out); }
    else if (e.name.endsWith('.html')) out.push(join(dir, e.name));
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const listPath = join(ROOT, 'data/ad-free-pages.json');
  let previous = [];
  try { previous = JSON.parse(readFileSync(listPath, 'utf8')).pages.map(p => p.path); } catch {}
  const adFree = [];
  for (const file of walk(ROOT)) {
    const path = relative(ROOT, file);
    let html = readFileSync(file, 'utf8');
    if (!isIndexable(html)) continue;
    const words = mainWords(html);
    const hasLoader = LOADER.test(html); LOADER.lastIndex = 0;
    const wasAdFree = previous.includes(path);
    if (!hasLoader && !wasAdFree) continue; // pages that never carried ads (e.g. private tools) are untouched
    if (ALWAYS_ADS.has(path) || words >= MIN_AD_WORDS) {
      if (!hasLoader && wasAdFree) {
        html = html.replace('</head>', AD_TAG + '</head>');
        writeFileSync(file, html);
        console.log('restored ads:', path, words);
      }
      continue;
    }
    if (hasLoader) { html = html.replace(LOADER, ''); writeFileSync(file, html); console.log('removed ads:', path, words); }
    adFree.push({path, words});
  }
  adFree.sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(listPath, JSON.stringify({
    policy: `AdSense loads only on indexable pages with at least ${MIN_AD_WORDS} words of main content (homepage excepted). Generated programme records, /latest and /opportunities pages carry no ads. Pages here stay indexed; expand them and re-run tools/apply-ad-policy.mjs to restore ads.`,
    min_words: MIN_AD_WORDS,
    pages: adFree
  }, null, 1) + '\n');
  console.log(adFree.length, 'ad-free static pages');
}
