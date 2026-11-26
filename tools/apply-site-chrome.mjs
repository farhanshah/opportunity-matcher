#!/usr/bin/env node
// Replaces the ad-hoc headers/footers of public content pages with the shared
// site chrome (lib/site-chrome.js + /site-chrome-v1.css). Idempotent.
// Targets: hub and programme pages (main > nav.crumb), about, contact.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyChrome } from '../lib/site-chrome.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SKIP = new Set(['node_modules', '.git', 'tests', 'data', 'fonts', 'api', 'lib', 'blog']);
const EXTRA = new Set(['about.html', 'contact.html']);

function walk(d, out = []) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith('.')) walk(join(d, e.name), out); }
    else if (e.name.endsWith('.html')) out.push(join(d, e.name));
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let n = 0;
  for (const file of walk(ROOT)) {
    const path = relative(ROOT, file);
    const html = readFileSync(file, 'utf8');
    if (/noindex/i.test(html.match(/<meta[^>]*name=["']robots["'][^>]*>/i)?.[0] || '')) continue;
    if (!EXTRA.has(path) && !/<main>\s*<nav class="crumb"/.test(html)) continue;
    const next = applyChrome(html, path);
    if (next && next !== html) { writeFileSync(file, next); n++; }
    else if (!next) console.log('skipped (structure):', path);
  }
  console.log(n, 'pages updated');
}
