import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { officialDomainClass, trustedSourceForLead, siteNameFromPage } from '../lib/world-verification.js';

const registered = ['daad.de', 'campusfrance.org', 'rotary.org', 'careers.smartrecruiters.com'];

test('government, academic and intergovernmental hosts are trusted for evidence fetching', () => {
  for (const [h, c] of [['turkiyeburslari.gov.tr', 'government'], ['www.nsf.gov', 'government'], ['jsps.go.jp', 'government'],
    ['eda.admin.ch', 'government'], ['scholarships.gov.gh', 'government'], ['www.gouv.fr', 'government'], ['service-public.gouv.fr', 'government'],
    ['www.imperial.ac.uk', 'academic'], ['nus.edu.sg', 'academic'], ['www.middlebury.edu', 'academic'],
    ['help.unhcr.org', 'intergovernmental'], ['jobs.au.int', 'intergovernmental'], ['academy.worldbank.org', 'intergovernmental'],
    ['www2.daad.de', 'subdomain_of_registered'], ['uk.campusfrance.org', 'subdomain_of_registered']])
    assert.equal(officialDomainClass(h, registered), c, h);
});

test('aggregators, look-alike and shared-platform domains are never trusted', () => {
  for (const h of ['opportunitiesforyouth.org', 'wemakescholars.com', 'daadscholarship.com', 'unitednationsrecruit.com',
    'scholars4dev.com', 'opportunitydesk.org', 'gksscholarships.com', 'unicafscholarship.com', 'fully-fundedscholarships.com',
    'daad.de.example.com', 'gov.uk.scam.com', 'acme.careers.smartrecruiters.com', 'edu.example.com'])
    assert.equal(officialDomainClass(h, registered), '', h);
});

test('staging, CMS and utility hosts are excluded even on official domains', () => {
  for (const h of ['my-cmsuat.rotary.org', 'stage-mwf.irex.org', 'salarycalculator.unops.org', 'newsletter.usefp.org', 'cms.wellcome.org', 'test.nus.edu.sg'])
    assert.equal(officialDomainClass(h, registered), '', h);
});

test('domain-trusted leads still need a programme-shaped URL and get a page-derived provider', () => {
  const sources = [{ id: 'x', source_url: 'https://www.daad.de/en/', provider: 'DAAD', is_active: true }];
  const ok = trustedSourceForLead({ canonical_url: 'https://www.nawa.gov.pl/en/students/foreign-students/the-banach-scholarship-programme', title: 'Banach' }, sources);
  assert.equal(ok.status, 'trusted');
  assert.equal(ok.source.derived, true);
  assert.equal(ok.source.source_url, 'https://www.nawa.gov.pl/');
  const sub = trustedSourceForLead({ canonical_url: 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/', title: 'DAAD' }, sources);
  assert.equal(sub.status, 'trusted');
  assert.equal(sub.source.provider, 'DAAD');
  assert.equal(trustedSourceForLead({ canonical_url: 'https://www.nasa.gov/news/press-releases', title: 'x' }, sources).status, 'source_review');
  assert.equal(trustedSourceForLead({ canonical_url: 'https://wemakescholars.com/scholarship/daad', title: 'x' }, sources).status, 'source_review');
  assert.equal(siteNameFromPage('<meta property="og:site_name" content="NAWA">', 'https://nawa.gov.pl/x'), 'NAWA');
  assert.equal(siteNameFromPage('<html></html>', 'https://www.nawa.gov.pl/x'), 'nawa.gov.pl');
});

test('SQL queue rule mirrors the JavaScript trust rule', () => {
  const api = readFileSync(new URL('../api/verify-worldwide.js', import.meta.url), 'utf8');
  assert.match(api, /verification_reason='Provider hostname is not in the official-source registry'\s+AND l\.verification_attempts<4/);
  assert.ok(api.includes('salarycalculator'));
  assert.ok(api.includes('smartrecruiters[.]com'));
  assert.ok(api.includes("[.](edu|ac)[.][a-z]{2}$"));
});
