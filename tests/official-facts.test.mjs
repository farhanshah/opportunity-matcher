import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfficialFactSheet } from '../lib/official-facts.js';
import { verifyCandidate } from '../lib/auto-discovery.js';

const url='https://scholarships.example.edu/2027-global-scholarship';
const body=[
  '<html><body><nav>News: applications for previous programmes closed in 2025.</nav>',
  '<main><h1>2027 Global University Scholarship</h1>',
  '<p>Application deadline: 18 May 2027</p>',
  '<p>Applications open: 1 October 2026</p>',
  '<p>Funding: Fully funded</p>',
  '<p>Nationality eligibility: All nationalities</p>',
  '<p>Education requirement: Bachelor degree</p>',
  '<p>Fields of study: All fields</p>',
  '<p>Host country: United Kingdom</p></main>',
  '<footer>Subscribe to scholarship updates</footer></body></html>'
].join('');

test('verified official fact sheet supplies all publishing facts',()=>{
  const a=parseOfficialFactSheet(body);
  assert.equal(a.complete,true,a.reasons.join('; '));
  assert.equal(a.deadline,'2027-05-18');
  const candidate=verifyCandidate(body,url,'Official University',new Date('2026-10-15T12:00:00Z'));
  assert.equal(candidate.verified,true,candidate.reasons.join('; '));
  assert.equal(candidate.evidence.evidence_format,'labelled-main-fact-sheet');
  assert.equal(candidate.record.status,'Open');
});

test('multiple deadline labels block ambiguous programme-wide claims',()=>{
  const html=body.replace('</main>','<p>Application deadline: 29 May 2027</p></main>');
  const output=parseOfficialFactSheet(html);
  assert.equal(output.complete,false);
  assert.ok(output.reasons.includes('explicit single application deadline missing'));
});

test('nomination precondition blocks publishing',()=>{
  const html=body.replace('</main>','<p>School nomination required before application.</p></main>');
  const output=parseOfficialFactSheet(html);
  assert.equal(output.complete,false);
  assert.ok(output.reasons.includes('application route requires institution-level evidence'));
});

test('navigation and news outside main cannot supply required facts',()=>{
  const notProgramme=body.replace(/<main>[\s\S]*?<\/main>/,'<div>News and scholarships open for everyone</div>');
  assert.equal(verifyCandidate(notProgramme,url,'Official University').verified,false);
});

test('impossible or unlabeled deadlines do not publish',()=>{
  assert.equal(parseOfficialFactSheet(body.replace('18 May 2027','30 February 2027')).complete,false);
  assert.equal(parseOfficialFactSheet(body.replace('Application deadline: 18 May 2027','Applications end in 2027')).complete,false);
});

test('unmodelled work-experience requirements prevent automatic publication',()=>{
  const withRequirement=body.replace('</main>','<p>Applicants must have at least 2 years work experience.</p></main>');
  const result=verifyCandidate(withRequirement,url,'Official University',new Date('2026-10-15T12:00:00Z'));
  assert.equal(result.verified,false);
});

test('schema and visible fact-sheet deadline disagreement prevents publication',()=>{
  const schema={
    '@type':'Scholarship',name:'2027 Global University Scholarship',
    url,description:'Fully funded scholarship.',
    qualifications:"Bachelor degree. Open to all nationalities. All fields of study.",
    applicationStartDate:'2026-10-01',applicationDeadline:'2027-05-29',
    location:{name:'United Kingdom'}
  };
  const conflicting=body.replace('</main>','<script type="application/ld+json">'+JSON.stringify(schema)+'</script></main>');
  const result=verifyCandidate(conflicting,url,'Official University',new Date('2026-10-15T12:00:00Z'));
  assert.equal(result.verified,false);
  assert.ok(result.reasons.includes('structured data conflicts with visible official programme facts'));
});
