import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, officialHostMatches, findOfficialLinks, verifyCandidate, discoveryId } from '../lib/auto-discovery.js';

const official = 'https://university.example/awards/2027-global-scholarship';
function fixture(overrides = {}) {
  const data = {
    '@context':'https://schema.org',
    '@type':'Scholarship',
    name:'2027 Global University Scholarship',
    url:official,
    description:'Fully funded award covering tuition and stipend.',
    qualifications:"Bachelor's degree completed. Open to all nationalities and all fields of study.",
    applicationDeadline:'2027-05-18',
    location:{name:'United Kingdom'},
    ...overrides
  };
  return '<html><body><h1>2027 Global University Scholarship</h1><script type="application/ld+json">'+JSON.stringify(data)+'</script></body></html>';
}

test('accepts exact programme-level official evidence', () => {
  const found=verifyCandidate(fixture(),official,'University',new Date('2026-10-15T12:00:00Z'));
  assert.equal(found.verified,true,found.reasons.join('; '));
  assert.equal(found.record.deadline,'2027-05-18');
  assert.deepEqual(found.record.nationality,['All Nationalities']);
  assert.equal(found.record.type,'Scholarship');
  assert.equal(found.record.funding,'Fully Funded');
});

test('no deadline means no public publication', () => {
  const result=verifyCandidate(fixture({applicationDeadline:undefined}),official,'University');
  assert.equal(result.verified,false);
  assert.ok(result.reasons.includes('exact application deadline unavailable'));
});

test('unconfirmed nationality and field requirements are withheld', () => {
  const result=verifyCandidate(fixture({qualifications:"Bachelor's degree completed."}),official,'University');
  assert.equal(result.verified,false);
  assert.ok(result.reasons.includes('nationality eligibility not explicit'));
  assert.ok(result.reasons.includes('field-of-study eligibility not explicit'));
});

test('expired deadlines cannot be published', () => {
  const result=verifyCandidate(fixture({applicationDeadline:'2025-01-12'}),official,'University');
  assert.equal(result.verified,false);
  assert.ok(result.reasons.includes('deadline expired or outside verified cycle'));
});

test('keeps discovered links on the configured provider host', () => {
  const html='<a href="/awards/2027-global-scholarship">2027 Global Scholarship Applications</a>'
    +'<a href="https://university.example.evil.org/awards/scholarship">2027 Global Scholarship Applications</a>';
  const links=findOfficialLinks(html,'https://university.example/awards/');
  assert.equal(links.length,1);
  assert.equal(links[0].url,official);
  assert.equal(officialHostMatches('https://university.example.evil.org/awards/scholarship',official),false);
});

test('canonical URLs drop tracking parameters and reject unsafe schemes', () => {
  assert.equal(canonicalUrl('https://university.example/awards/2027-global-scholarship/?utm_source=ads#top'),official);
  assert.equal(canonicalUrl('javascript:alert(1)'), '');
  assert.equal(canonicalUrl('http://localhost/private'),'');
  assert.equal(discoveryId(official),discoveryId(official+'?utm_source=x'));
});
