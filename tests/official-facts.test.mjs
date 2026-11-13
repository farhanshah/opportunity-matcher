import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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


test('official definition-list facts are accepted only as complete adjacent pairs',()=>{
  const markup='<html><main><h1>2027 Global University Scholarship</h1><dl>'+
    '<dt>Application closing date</dt><dd><time>18 May 2027</time></dd>'+
    '<dt>Applications start</dt><dd>1 October 2026</dd>'+
    '<dt>Funding</dt><dd>Fully funded</dd>'+
    '<dt>Nationality eligibility</dt><dd>All nationalities</dd>'+
    '<dt>Education requirement</dt><dd>Bachelor degree</dd>'+
    '<dt>Fields of study</dt><dd>All fields</dd>'+
    '<dt>Host country</dt><dd>United Kingdom</dd>'+
    '</dl></main></html>';
  const result=parseOfficialFactSheet(markup);
  assert.equal(result.complete,true,result.reasons.join('; '));
  const verified=verifyCandidate(markup,url,'Official University',new Date('2026-10-22T12:00:00Z'));
  assert.equal(verified.verified,true,verified.reasons.join('; '));
  assert.equal(verified.record.deadline,'2027-05-18');
  const ambiguous=markup.replace('</dl>','<dd>29 May 2027</dd></dl>');
  assert.equal(parseOfficialFactSheet(ambiguous).complete,false);
});
test('one-row-one-value official tables may provide explicit facts',()=>{
  const rows=[
    ['Deadline to apply','18 May 2027'],['Application opens','1 October 2026'],
    ['Funding','Fully funded'],['Nationality eligibility','All nationalities'],
    ['Education requirement','Bachelor degree'],['Fields of study','All fields'],
    ['Host country','United Kingdom']
  ];
  const html='<main><h1>2027 Global University Scholarship</h1><table>'+
    rows.map(([k,v])=>'<tr><th scope="row">'+k+'</th><td>'+v+'</td></tr>').join('')+
    '</table></main>';
  const parsed=parseOfficialFactSheet(html);
  assert.equal(parsed.complete,true,parsed.reasons.join('; '));
  const duplicate=html.replace('</table>','<tr><th>Deadline to apply</th><td>29 May 2027</td></tr></table>');
  assert.equal(parseOfficialFactSheet(duplicate).complete,false);
  const unrelated='<nav><table>'+rows.map(([k,v])=>'<tr><th>'+k+'</th><td>'+v+'</td></tr>').join('')+
    '</table></nav><main><h1>2027 Global University Scholarship</h1></main>';
  assert.equal(parseOfficialFactSheet(unrelated).complete,false);
  const multipart=html.replace('<tr><th scope="row">Funding</th><td>Fully funded</td></tr>',
    '<tr><th>Funding</th><td>Fully funded</td><td>Conditional</td></tr>');
  assert.equal(parseOfficialFactSheet(multipart).complete,false);
});


test('US written dates are valid, ambiguous numeric and impossible dates are not',()=>{
  const american=body.replace('18 May 2027','May 18, 2027')
    .replace('1 October 2026','October 1, 2026');
  const parsed=parseOfficialFactSheet(american);
  assert.equal(parsed.complete,true,parsed.reasons.join('; '));
  assert.equal(parsed.deadline,'2027-05-18');
  assert.equal(parsed.openDate,'2026-10-01');
  const ambiguous=body.replace('18 May 2027','05/18/2027');
  assert.equal(parseOfficialFactSheet(ambiguous).complete,false);
  const impossible=body.replace('18 May 2027','February 30, 2027');
  assert.equal(parseOfficialFactSheet(impossible).complete,false);
});


test('explicit Pakistan-only programme can be verified without being labelled worldwide',()=>{
 const national=body.replace('Nationality eligibility: All nationalities','Nationality eligibility: Pakistan');
 const parsed=parseOfficialFactSheet(national);
 assert.equal(parsed.complete,true,parsed.reasons.join('; '));
 assert.deepEqual(parsed.nationality,['Pakistan']);
 assert.deepEqual(parsed.nationalityScope,{scope:'explicit_list',countries:['Pakistan']});
 const result=verifyCandidate(national,url,'Official University',new Date('2026-10-22T12:00:00Z'));
 assert.equal(result.verified,true,result.reasons.join('; '));
 assert.deepEqual(result.record.nationality,['Pakistan']);
 assert.ok(!result.record.nationality.includes('All Nationalities'));
 const publisher=readFileSync(new URL('../api/discover.js',import.meta.url),'utf8');
 assert.match(publisher,/scope:'explicit_list',countries:r\.nationality/);
});
test('unresolved regional nationality wording never becomes unrestricted eligibility',()=>{
 for(const nation of ['Commonwealth countries','Developing countries','Pakistan and India','Eligible countries listed separately']){
  const changed=body.replace('Nationality eligibility: All nationalities','Nationality eligibility: '+nation);
  const parsed=parseOfficialFactSheet(changed);
  assert.equal(parsed.complete,false,nation);
  const match=verifyCandidate(changed,url,'Official University',new Date('2026-10-22T12:00:00Z'));
  assert.equal(match.verified,false,nation);
 }
});


test('explicit computer science scholarship stays subject restricted through publication',()=>{
 const narrow=body.replace('Fields of study: All fields','Fields of study: Computer Science, AI & Data');
 const parsed=parseOfficialFactSheet(narrow);
 assert.equal(parsed.complete,true,parsed.reasons.join('; '));
 assert.deepEqual(parsed.fields,['Computer Science, AI & Data']);
 const result=verifyCandidate(narrow,url,'Official University',new Date('2026-10-22T12:00:00Z'));
 assert.equal(result.verified,true,result.reasons.join('; '));
 assert.deepEqual(result.record.fields,['Computer Science, AI & Data']);
 assert.ok(!result.record.fields.includes('All fields'));
 const publisher=readFileSync(new URL('../api/discover.js',import.meta.url),'utf8');
 assert.match(publisher,/r\.fields\.includes\('All fields'\)\?'not_applicable':'one_of'/);
 assert.match(publisher,/values:r\.fields/);
});
test('ambiguous subject scope cannot be silently converted to all fields',()=>{
 for(const subject of ['Science and other subjects','Computer Science or Mathematics','Engineering disciplines','Fields vary by department']){
  const result=parseOfficialFactSheet(body.replace('Fields of study: All fields','Fields of study: '+subject));
  assert.equal(result.complete,false,subject);
 }
});
test('rolling dates remain unverified even on a programme-specific official page',async()=>{
 const {parseApplicationTiming}=await import('../lib/official-facts.js');
 const rolling=body.replace('Application deadline: 18 May 2027','Applications: Rolling');
 assert.deepEqual(parseApplicationTiming(rolling),{type:'rolling',wording:'Rolling',current_open_verified:false});
 const candidate=verifyCandidate(rolling,url,'Official University',new Date('2026-10-22T12:00:00Z'));
 assert.equal(candidate.verified,false);
 const institution=body.replace('Application deadline: 18 May 2027','Application period: Varies by institution');
 assert.equal(parseApplicationTiming(institution).type,'institution_specific');
 assert.equal(verifyCandidate(institution,url,'Official University').verified,false);
});
test('funded is not synonymous with explicitly paid for internships',()=>{
 const internship=body.replaceAll('Scholarship','Internship').replaceAll('scholarship','internship')
  .replace('Funding: Fully funded','Funding: Funded');
 const candidate=verifyCandidate(internship,url,'Official University',new Date('2026-10-22T12:00:00Z'));
 assert.equal(candidate.verified,true,candidate.reasons.join('; '));
 assert.equal(candidate.record.funding,'Funding Available');
});


test('permissive structured scholarship data cannot override partial visible country or subject restrictions',()=>{
 const schema={
  '@type':'Scholarship',name:'2027 Global University Scholarship',
  url,description:'Fully funded scholarship.',
  qualifications:"Bachelor degree. Open to all nationalities. All fields of study.",
  applicationStartDate:'2026-10-01',applicationDeadline:'2027-05-18',
  location:{name:'United Kingdom'}
 };
 const visible='<main><h1>2027 Global University Scholarship</h1>'+
   '<p>Nationality eligibility: Pakistan</p>'+
   '<p>Fields of study: Computer Science, AI & Data</p>'+
   '<p>All candidates must have at least 2 years work experience.</p></main>';
 const page=visible+'<script type="application/ld+json">'+JSON.stringify(schema)+'</script>';
 const result=verifyCandidate(page,url,'Official University',new Date('2026-10-22T12:00:00Z'));
 assert.equal(result.verified,false);
 assert.ok(result.reasons.includes('structured nationality metadata conflicts with visible provider restriction'));
 assert.ok(result.reasons.includes('structured field metadata conflicts with visible provider restriction'));
 assert.ok(result.reasons.includes('visible provider restrictions require explicit rule modelling'));
});

test('source-only deadline extraction accepts an explicitly labelled midnight annotation without guessing timezone',()=>{
 const html=body.replace('18 May 2027','18 May 2027 (Midnight)');
 const parsed=parseOfficialFactSheet(html);
 assert.equal(parsed.complete,true,parsed.reasons.join('; '));
 assert.equal(parsed.deadline,'2027-05-18');
 for(const bad of ['18 May 2027 (14:00)','18 May 2027 (whenever)','18 May 2027 approximately']){
  assert.equal(parseOfficialFactSheet(body.replace('18 May 2027',bad)).complete,false,bad);
 }
});
