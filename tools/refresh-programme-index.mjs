// Daily refresh (GitHub Action): fetch the live catalogue index, validate it,
// regenerate hub sections and bump sitemap lastmod for pages that changed.
//   node tools/refresh-programme-index.mjs [url]
// Refuses to write anything if the response looks wrong, so an outage or a
// partial response can never wipe the hub sections.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.argv[2] || 'https://oppmatcher.tech/api/programme-index';
const file = join(root, 'data/programme-index.json');

export function validate(next, previous) {
  if (!Array.isArray(next)) throw Error('Index is not an array');
  const ok = r => r && /^[A-Z]+-[A-Z0-9]+$/.test(r.external_id) && typeof r.title === 'string' && r.title.length >= 4 &&
    typeof r.provider === 'string' && typeof r.opportunity_type === 'string' && Array.isArray(r.education_levels);
  const bad = next.filter(r => !ok(r));
  if (bad.length) throw Error(`${bad.length} malformed record(s), e.g. ${JSON.stringify(bad[0]).slice(0, 120)}`);
  // A sudden large drop means a broken response, not a real catalogue change.
  if (next.length < Math.max(20, Math.floor(previous.length * 0.8)))
    throw Error(`Index shrank from ${previous.length} to ${next.length}; refusing to update`);
  return next;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const previous = JSON.parse(readFileSync(file, 'utf8'));
  let res;
  for (let attempt = 1; attempt <= 8; attempt++) {
    res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000) }).catch(e => ({ ok: false, status: e.message }));
    if (res.ok) break;
    console.log(`attempt ${attempt}: HTTP ${res.status}; retrying in 45 s`);
    await new Promise(r => setTimeout(r, 45000));
  }
  if (!res.ok) throw Error(`Fetch failed: HTTP ${res.status}`);
  const next = validate(await res.json(), previous);
  writeFileSync(file, JSON.stringify(next, null, 1) + '\n');
  const { build } = await import('./build-programme-links.mjs');
  const report = build();
  const changed = report.filter(([, , didChange]) => didChange).map(([f]) => f);
  console.log(`records ${previous.length} -> ${next.length}; pages changed: ${changed.length}`);
  for (const f of changed) console.log('  ' + f);
}
