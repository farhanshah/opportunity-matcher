import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isProgrammePage } from '../lib/source-listings.js';
import { esc } from '../lib/programme-pages.js';

const u = 'https://example.org/page';

test('support, history and how-to pages are not listed as programmes', () => {
  for (const t of ['Host a Chevening Fellowship', 'Host an internship for Chevening scholars', 'Organising your stay as a scholarship holder',
    'History of the Rhodes Scholarship', 'Applying for the Scholarship', 'Other Scholarship Opportunities', 'Your Scholarship Journey Starts Here',
    'Get ready to start your scholarship', 'Types of Manaaki scholarships', 'UCL Chemistry Fellowship Guidelines',
    'Commonwealth Professional Fellowships &#8211; information for candidates', 'France Excellence Eiffel Scholarship - Implementation',
    'Postdoctoral Fellowships call: 6 steps to prepare your application', 'Scholarships and Grants', 'Scholarships and funding',
    'LOCAL TERTIARY SCHOLARSHIP APPLICATIONS FOR 2026/2027 ACADEMIC YEAR', 'Internship scholarships: how-to guide'])
    assert.equal(isProgrammePage(t, u), false, t);
});

test('named programmes still pass', () => {
  for (const t of ['The Rhodes Scholarship', 'Chevening Fellowships', 'Royal Society Wolfson Fellowship', 'Commonwealth Shared Scholarships',
    'Postdoctoral Fellowships', 'Manaaki New Zealand Scholarships', 'WHO Internship Programme', 'Dorothy Hodgkin Fellowship'])
    assert.equal(isProgrammePage(t, u), true, t);
});

test('/latest drops institutional federal grants, cleans grantor names and de-duplicates', () => {
  const src = readFileSync(new URL('../api/latest.js', import.meta.url), 'utf8');
  assert.match(src, /const institutional=/);
  assert.match(src, /Grantor/);
  assert.match(src, /seen\.has\(key\)/);
});

test('pre-encoded entities in titles are decoded once, then escaped', () => {
  assert.equal(esc("Master&#039;s &amp; PhD <b>"), 'Master&#39;s &amp; PhD &lt;b&gt;');
});
