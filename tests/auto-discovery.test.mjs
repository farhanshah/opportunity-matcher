import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, officialHostMatches, findOfficialLinks, verifyCandidate, discoveryId, isProviderConsentOrBlockPage } from '../lib/auto-discovery.js';

const official = 'https://university.example/awards/2027-global-scholarship';
function fixture(overrides = {}) {
  const data = {
    '@context':'https://schema.org',
    '@type':'Scholarship',
    name:'2027 Global University Scholarship',
    url:official,
    description:'Fully funded award covering tuition and stipend.',
    qualifications:"Bachelor's degree completed. Open to all nationalities and all fields of study.",
    applicationStartDate:'2026-10-01',
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


test('official-source discovery follows the current intake cycle rather than fixed 2026-2028 years',()=>{
  const html='<a href="/awards/global-2029">2029 Global Scholarship Applications</a>'+
    '<a href="/awards/2019-old">2019 Global Scholarship Applications</a>';
  const current=findOfficialLinks(html,'https://university.example/awards/',8,new Date('2028-06-01T00:00:00Z'));
  assert.equal(current.length,1);
  assert.equal(current[0].url,'https://university.example/awards/global-2029');
});

test('canonical URLs drop tracking parameters and reject unsafe schemes', () => {
  assert.equal(canonicalUrl('https://university.example/awards/2027-global-scholarship/?utm_source=ads#top'),official);
  assert.equal(canonicalUrl('javascript:alert(1)'), '');
  assert.equal(canonicalUrl('http://localhost/private'),'');
  assert.equal(discoveryId(official),discoveryId(official+'?utm_source=x'));
});

test('future application opening dates remain Upcoming, not Open', () => {
  const result=verifyCandidate(fixture({applicationStartDate:'2027-02-01'}),official,'University',new Date('2026-10-15T12:00:00Z'));
  assert.equal(result.verified,true,result.reasons.join('; '));
  assert.equal(result.record.status,'Upcoming');
});

test('impossible calendar dates cannot pass verification', () => {
  const result=verifyCandidate(fixture({applicationDeadline:'2027-02-30'}),official,'University',new Date('2026-10-15T12:00:00Z'));
  assert.equal(result.verified,false);
  assert.ok(result.reasons.includes('exact application deadline unavailable'));
});

test('nomination requirements require route-level proof, not a general programme page', () => {
  const result=verifyCandidate(fixture({qualifications:"Bachelor's degree completed. Open to all nationalities and all fields of study. University nomination required."}),official,'University',new Date('2026-10-15T12:00:00Z'));
  assert.equal(result.verified,false);
  assert.ok(result.reasons.includes('nomination prerequisite requires route-specific verification'));
});

test('cookie consent and access challenge pages never count as programme evidence',()=>{
 assert.equal(isProviderConsentOrBlockPage('<html><main><h1>Cookie Consent</h1><p>Scholarships for everybody</p></main></html>'),true);
 assert.equal(isProviderConsentOrBlockPage('<html><title>Just a moment...</title><p>Cloud challenge</p></html>'),true);
 assert.equal(isProviderConsentOrBlockPage(fixture()),false);
});
