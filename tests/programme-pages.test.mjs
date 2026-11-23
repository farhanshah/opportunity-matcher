import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderProgramme, renderHub, slugFor, pathFor, externalIdFromSlug, statusView, metaTitle, sitemapEntries, safeUrl, iso } from '../lib/programme-pages.js';

const NOW = new Date('2026-11-23T02:00:00Z');
const base = {
  external_id: 'SCH-020', title: 'France Excellence Eiffel Scholarship', provider: 'Campus France', opportunity_type: 'Scholarship',
  destination_country: 'France', funding_type: 'Funding Available', status: 'Open', application_close_date: '2027-01-06',
  official_source_url: 'https://www.campusfrance.org/en/eiffel', application_url: 'https://www.campusfrance.org/en/eiffel',
  eligible_nationalities: [], education_levels: [], fields_of_study: [], benefits: [], eligibility_notes: 'Age limits | Institution selection',
  last_verified_at: '2026-11-20T00:00:00Z', updated_at: '2026-11-20T00:00:00Z'
};
const text = h => h.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');

test('stable slug ends with the external id and resolves back to it', () => {
  assert.equal(slugFor(base), 'france-excellence-eiffel-scholarship-sch-020');
  assert.equal(externalIdFromSlug(slugFor(base)), 'SCH-020');
  assert.equal(externalIdFromSlug('swiss-auto-5ea1badcf272b8ac'), 'AUTO-5EA1BADCF272B8AC');
  assert.equal(externalIdFromSlug('no-id-here'), '');
});

test('empty dates are never rendered as 1970 or treated as elapsed', () => {
  assert.equal(iso(null), '');
  const html = renderProgramme({ ...base, status: 'Expected to Reopen', application_close_date: null }, [], NOW);
  assert.doesNotMatch(html, /1970/);
  assert.doesNotMatch(text(html), /Deadline passed/);
});

test('a stored "Open" label with an elapsed deadline is shown as Deadline passed', () => {
  const st = statusView({ ...base, application_close_date: '2026-10-20' }, NOW);
  assert.equal(st.label, 'Deadline passed');
  assert.equal(st.kind, 'closed');
});

test('elapsed deadlines are not presented as something to submit before', () => {
  const h = text(renderProgramme({ ...base, application_close_date: '2026-11-20' }, [], NOW));
  assert.doesNotMatch(h, /route before 20 November 2026/);
  assert.doesNotMatch(renderProgramme(base, [], NOW), /\.\./);
});

test('stale records carry a last-confirmed warning; fresh ones do not', () => {
  assert.match(text(renderProgramme({ ...base, last_verified_at: '2026-08-19T00:00:00Z' }, [], NOW)), /last confirmed against the official source on 19 August 2026/);
  assert.doesNotMatch(renderProgramme(base, [], NOW), /class="warn"/);
});

test('nationality restriction label is shown as-is, never widened', () => {
  const html = text(renderProgramme({ ...base, eligible_nationalities: ['Country-specific eligibility - see official page'] }, [], NOW));
  assert.match(html, /Country-specific eligibility - see official page/);
  assert.doesNotMatch(html, /All Nationalities|open worldwide/i);
  assert.match(text(renderProgramme(base, [], NOW)), /Not stated in our record/);
});

test('output is escaped and only https official links are emitted', () => {
  const html = renderProgramme({ ...base, title: '<script>alert(1)</script>', official_source_url: 'javascript:alert(1)', application_url: 'http://x.example' }, [], NOW);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /javascript:|href="http:\/\//);
  assert.equal(safeUrl('https://user:pw@x.example'), '');
});

test('page is indexable with canonical, FAQ and breadcrumb structured data and a year-aware title', () => {
  const html = renderProgramme(base, [], NOW);
  assert.match(html, /<meta name="robots" content="index,follow">/);
  assert.ok(html.includes('<link rel="canonical" href="https://oppmatcher.tech/opportunity/france-excellence-eiffel-scholarship-sch-020">'));
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  // Years are never guessed from the deadline; an official name's own year is kept.
  assert.equal(metaTitle(base), 'France Excellence Eiffel Scholarship: Deadline, Eligibility & How to Apply'.length <= 68 ? 'France Excellence Eiffel Scholarship: Deadline, Eligibility & How to Apply' : 'France Excellence Eiffel Scholarship – Deadline & Eligibility');
  assert.match(metaTitle({ ...base, title: 'Commonwealth PhD Scholarships 2027/28' }), /2027\/28/);
  assert.doesNotMatch(metaTitle({ ...base, title: 'Ibrahim Leadership Fellowships', application_close_date: '2026-11-20' }), /2026/);
  assert.ok(metaTitle(base).length <= 68);
});

test('hub lists every programme and sitemap carries lastmod per page', () => {
  const rows = [base, { ...base, external_id: 'FEL-001', title: 'Commonwealth Fellowships', opportunity_type: 'Fellowship', status: 'Closed' }];
  const hub = renderHub(rows, NOW);
  for (const r of rows) assert.ok(hub.includes('href="' + pathFor(r) + '"'));
  const sm = sitemapEntries(rows);
  assert.match(sm, /<loc>https:\/\/oppmatcher\.tech\/opportunity<\/loc>/);
  assert.match(sm, /france-excellence-eiffel-scholarship-sch-020<\/loc><lastmod>2026-11-20<\/lastmod>/);
});

test('routes, sitemap wiring and outage handling never de-index', () => {
  const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.ok(cfg.rewrites.some(r => r.source === '/opportunity/:slug' && r.destination === '/api/programme-page?slug=:slug'));
  const page = readFileSync(new URL('../api/programme-page.js', import.meta.url), 'utf8');
  const pub = readFileSync(new URL('../api/public-opportunities.js', import.meta.url), 'utf8');
  for (const src of [page, pub]) {
    const catchBlock = src.slice(src.lastIndexOf('catch'));
    assert.ok(catchBlock.includes('Retry-After'));
    assert.ok(!/X-Robots-Tag[^;]*noindex/.test(catchBlock), 'outage response must not send noindex');
  }
  assert.ok(pub.includes('sitemapEntries(programmes)'));
});
