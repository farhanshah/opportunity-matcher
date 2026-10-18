import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=src('passport-preview.html'),style=src('passport-preview.css'),script=src('passport-preview.js');
const home=src('design-preview.html'),discover=src('discover-preview.html'),live=src('index.html');
const model=vm.runInNewContext(script+'\nPassportPreviewModel',{Date});
const valid={nat:'Canada',residence:'Germany',edu:"Bachelor's degree",field:'Computer Science, AI & Data'};

test('the interactive Passport is an isolated noindex, no-storage design preview',()=>{
  assert.match(page,/<meta name="robots" content="noindex,nofollow"/);
  assert.match(page,/DESIGN CONCEPT 03/);
  assert.match(page,/Anything you type stays in this open page temporarily/);
  assert.match(page,/Nothing is saved to your account/);
  assert.doesNotMatch(script,/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/);
  assert.doesNotMatch(script,/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\b/);
  assert.doesNotMatch(script,/\bwindow\.OpportunityState\b/);
  assert.match(live,/<div id="landing" class="landing">/);
  assert.doesNotMatch(live,/DESIGN CONCEPT 03/);
});

test('real Passport field vocabulary was reused from current app',()=>{
  assert.ok(model.COUNTRIES.length>75);
  assert.ok(model.COUNTRIES.includes('Canada'));
  assert.ok(model.COUNTRIES.includes('Germany'));
  assert.ok(model.FIELDS.includes('Computer Science, AI & Data'));
  assert.ok(model.FIELDS.includes('Business & Management'));
  assert.deepEqual(Array.from(model.REQUIRED),['nat','edu','field']);
  for(const id of ['nat','residence','age','english','edu','field','gpa','degreeName',
    'degreeStatus','degreeCountry','graduationDate','experienceYears','workHours','fund']){
    assert.ok(page.includes('id="'+id+'"'),id+' not in UI');
  }
});

test('nationality, education and subject are mandatory, everything else stays optional',()=>{
  const missingNat=model.validateStep(0,{});assert.equal(missingNat.field,'nat');
  assert.equal(model.validateStep(0,{nat:'Canada'}).ok,true);
  assert.equal(model.validateStep(1,{edu:"Bachelor's degree"}).field,'field');
  assert.equal(model.validateStep(1,{field:'Computer Science, AI & Data'}).field,'edu');
  assert.equal(model.validateStep(1,valid).ok,true);
  assert.equal(model.verifyThrough(3,valid).ok,true);
  assert.equal(model.verifyThrough(3,{nat:'Canada'}).field,'edu');
});

test('out-of-range numbers, impossible dates and fractional work hours are rejected',()=>{
  assert.equal(model.validateStep(0,{nat:'Canada',age:'13'}).field,'age');
  assert.equal(model.validateStep(0,{nat:'Canada',age:'100'}).field,'age');
  assert.equal(model.validateStep(1,{...valid,gpa:'20'}).field,'gpa');
  assert.equal(model.validateStep(2,{workHours:'35.5'}).field,'workHours');
  assert.equal(model.validateStep(2,{graduationDate:'2027-02-30'}).field,'graduationDate');
  assert.equal(model.validateStep(2,{graduationDate:'2027-02-28'}).ok,true);
});

test('review screen escapes arbitrary text and never claims a real eligibility outcome',()=>{
  const html=model.reviewMarkup({...valid,degreeName:'<img src=x onerror=alert(1)>'});
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html,/<img src=x/);
  assert.match(html,/not a saved Passport or eligibility assessment/);
  assert.match(html,/Canada/);
  assert.match(page,/Nothing from this preview transfers to your account/);
});

test('all five sections, progress, keyboard-labelled fields and real app handoff work structurally',()=>{
  assert.equal((page.match(/class="stepPane"/g)||[]).length,5);
  assert.equal((page.match(/class="stepLink/g)||[]).length,5);
  for(const x of ['progressText','progressFill','backStep','nextStep','sampleButton','resetButton',
    'reviewCard','formError','navLinks','menuToggle']){
    assert.ok(page.includes('id="'+x+'"'),'Missing control '+x);
  }
  assert.match(script,/verifyThrough\(target-1,values\(\)\)/);
  assert.match(script,/addEventListener\('click',sample\)/);
  assert.match(script,/addEventListener\('click',\(\)=>\{form\.reset\(\);showStep\(0\);\}\)/);
  assert.match(page,/href="\/" class="primaryAction realCta"/);
  assert.match(script,/aria-invalid/);
});

test('responsive turquoise concept is linked from both approved previews',()=>{
  assert.match(style,/--aqua:#51e7d6/);
  assert.match(style,/@media\(max-width:580px\)/);
  assert.match(style,/@media\(max-width:830px\)/);
  assert.match(style,/prefers-reduced-motion:reduce/);
  assert.match(home,/href="\/passport-preview.html"/);
  assert.match(discover,/href="\/passport-preview.html"/);
  assert.match(page,/href="\/discover-preview.html"/);
  assert.match(page,/href="\/design-preview.html"/);
});
