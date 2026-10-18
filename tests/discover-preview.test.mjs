import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const files={
  page:readFileSync(new URL('../discover-preview.html',import.meta.url),'utf8'),
  css:readFileSync(new URL('../discover-preview.css',import.meta.url),'utf8'),
  js:readFileSync(new URL('../discover-preview.js',import.meta.url),'utf8'),
  homepage:readFileSync(new URL('../design-preview.html',import.meta.url),'utf8'),
  live:readFileSync(new URL('../index.html',import.meta.url),'utf8'),
  config:JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'))
};
const f=vm.runInNewContext(files.js+'\nPreviewFilters',{URL,Date});

const sample=[
  {Opportunity_ID:'A',Opportunity_Name:'2027 Example Scholarship',Provider:'North University',Type:'Scholarship',
   Destination:'United Kingdom',Funding:'Fully Funded',Status:'Open',Close_Date:'2027-07-31',
   Last_Verified:'',Verification_Stale:true},
  {Opportunity_ID:'B',Opportunity_Name:'Science Internship',Provider:'Research Institute',Type:'Internship',
   Destination:'Germany',Funding:'Paid',Status:'Opening Soon',Close_Date:'2027-08-31',
   Last_Verified:'2026-10-18',Verification_Stale:false},
  {Opportunity_ID:'C',Opportunity_Name:'Historic Fellowship',Provider:'Global Foundation',Type:'Fellowship',
   Destination:'Canada',Funding:'Partially Funded',Status:'Open',Close_Date:'2026-01-01',
   Verification_Stale:true},
  {Opportunity_ID:'D',Opportunity_Name:'Expected Future Scholarship',Provider:'World Trust',Type:'Scholarship',
   Destination:'Australia',Funding:'Unknown',Status:'Expected to Reopen',Verification_Stale:true},
  {Opportunity_ID:'E',Opportunity_Name:'International Opportunity',Provider:'Agency',Type:'Exchange / International Programme',
   Destination:'Kenya',Funding:'Funding Varies',Status:'Rolling / Vacancy-specific',Verification_Stale:true}
];

test('preview remains isolated, noindex and wired to the public catalogue',()=>{
  assert.match(files.page,/<meta name="robots" content="noindex,nofollow">/);
  assert.match(files.page,/discover-preview\.css/);
  assert.match(files.page,/discover-preview\.js/);
  assert.match(files.js,/fetch\('\/api\/opportunities'/);
  assert.match(files.homepage,/href="\/discover-preview\.html"/);
  assert.match(files.live,/<div id="landing" class="landing">/);
  assert.doesNotMatch(files.live,/discover-preview/);
  assert.deepEqual(files.config.rewrites.filter(x=>x.source==='/discover').map(x=>x.destination),['/index.html']);
});
test('preview search, filter controls, working cards and details are present',()=>{
  for(const id of ['keyword','countryFilter','fundingFilter','statusFilter','sourceFilter',
    'sortOrder','cards','resultText','loadMore','detailDialog','detailBody','emptyReset']){
    assert.match(files.page,new RegExp('id="'+id+'"'));
  }
  assert.match(files.page,/Return to live Discover/);
  assert.match(files.page,/not the live app/);
  assert.match(files.js,/aria-busy/);
  assert.match(files.js,/showDetail\(/);
  assert.match(files.js,/sourceCurrent\(o\)/);
});
test('filters keep uncertain statuses out of Open/Upcoming and allow inspection of all',()=>{
  const result=f.filter(sample,{status:'current'},'2026-10-18');
  assert.deepEqual(Array.from(result.map(x=>x.Opportunity_ID)),['A','B']);
  assert.equal(f.statusOf(sample[2],'2026-10-18'),'closed');
  assert.equal(f.statusOf(sample[3],'2026-10-18'),'varies');
  assert.equal(f.statusOf(sample[4],'2026-10-18'),'varies');
  assert.equal(f.filter(sample,{status:'all'},'2026-10-18').length,5);
  assert.deepEqual(Array.from(f.filter(sample,{status:'varies'},'2026-10-18').map(x=>x.Opportunity_ID)),['D','E']);
});
test('category, destination, funding, search and verification filters combine correctly',()=>{
  assert.deepEqual(Array.from(f.filter(sample,{status:'all',category:'scholarship'},'2026-10-18')
    .map(x=>x.Opportunity_ID)),['A','D']);
  assert.equal(f.filter(sample,{status:'all',destination:'Germany',funding:'Paid',
    category:'internship',source:'current'},'2026-10-18')[0].Opportunity_ID,'B');
  assert.equal(f.filter(sample,{status:'all',keyword:'science'},'2026-10-18')[0].Opportunity_ID,'B');
  assert.equal(f.filter(sample,{status:'all',source:'current'},'2026-10-18').length,1);
  assert.equal(f.filter(sample,{status:'all',source:'stale'},'2026-10-18').length,4);
});
test('provider URLs reject unsafe and untrusted schemes and titles are escaped',()=>{
  assert.equal(f.safeHttps('javascript:alert(1)'),'');
  assert.equal(f.safeHttps('http://university.example/scholarship'),'');
  assert.equal(f.safeHttps('https://127.0.0.1/metadata'),'');
  assert.equal(f.safeHttps('https://university.example/scholarship'),'https://university.example/scholarship');
  assert.equal(f.escapeHtml('<img src=x onerror="alert(1)">'),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.match(files.js,/rel="noopener noreferrer"/);
  assert.doesNotMatch(files.js,/localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(files.js,/fetch\([^,]+,\s*\{\s*method:\s*['"]POST/);
});
test('responsive design, labels and reduced-motion safeguards are present',()=>{
  assert.match(files.css,/@media\(max-width:580px\)/);
  assert.match(files.css,/@media\(max-width:870px\)/);
  assert.match(files.css,/prefers-reduced-motion:reduce/);
  assert.match(files.css,/--aqua:#51e7d6/);
  assert.match(files.page,/aria-label="Opportunity filters"/);
  assert.match(files.page,/aria-labelledby="detailTitle"/);
  assert.match(files.page,/id="loadDot"/);
  assert.match(files.js,/No demonstration listings have been substituted/);
});
