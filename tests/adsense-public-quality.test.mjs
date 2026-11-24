import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// A page's sitemap lastmod must reflect its last real edit: on or after the
// substantive rewrite (16 Nov 2026) and never in the future. Later genuine
// edits (e.g. the daily programme-index refresh) legitimately move it forward.
const lastmodFollowsEdit=(sitemap,canonical,since='2026-11-16')=>{
  const m=sitemap.match(new RegExp('<loc>'+canonical.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'</loc>\\s*<lastmod>(\\d{4}-\\d{2}-\\d{2})</lastmod>'));
  return Boolean(m)&&m[1]>=since&&m[1]<=new Date().toISOString().slice(0,10);
};

const get=path=>readFileSync(new URL('../'+path, import.meta.url),'utf8');
// Ad placement policy (tools/apply-ad-policy.mjs): thin pages stay indexed but carry no ads.
const AD_POLICY=JSON.parse(get('data/ad-free-pages.json'));
const AD_FREE=new Set(AD_POLICY.pages.map(p=>p.path));

test('public About, Contact and worksheet routes are configured',()=>{
 const config=JSON.parse(get('vercel.json'));
 for(const route of ['/about','/contact','/tools/application-readiness']){
   assert.ok(config.rewrites.some(r=>r.source===route),route+' missing');
 }
 for(const [file,canonical] of [['about.html','/about'],['contact.html','/contact'],['tools/application-readiness.html','/tools/application-readiness']]){
   const html=get(file);
   assert.match(html,/name="robots" content="index,follow"/);
   assert.ok(html.includes('href="https://oppmatcher.tech'+canonical+'"'));
 }
});

test('public navigation, contact and source integrity are visible without JavaScript',()=>{
 const home=get('index.html'),blog=get('blog/index.html'),about=get('about.html'),contact=get('contact.html');
 for(const file of [home,blog]){
  assert.ok(file.includes('href="/about"'));
  assert.ok(file.includes('href="/contact"'));
  assert.ok(file.includes('href="/tools/application-readiness"'));
 }
 assert.ok(about.includes('/blog/methodology/'));
 assert.ok(about.includes('independent online service'));
 assert.ok(contact.includes('privacy@oppmatcher.tech'));
 assert.ok(contact.includes('do not send') || contact.includes('Please do not send'));
});

test('readiness worksheet has functioning local interaction and no submission',()=>{
 const html=get('tools/application-readiness.html');
 for(const id of ['id="type"','id="checklist"','id="summary"','id="copy"','id="reset"','id="print"']){
  assert.ok(html.includes(id),'missing control '+id);
 }
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 assert.equal(scripts.length,1,'expected one inline interaction script');
 new Function(scripts[0]); // syntax only, no browser needed
 assert.equal(/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\s*\(/.test(scripts[0]),false);
});

test('sitemap includes useful routes and reflects current editorial indexability',()=>{
 const sitemap=get('sitemap.xml');
 for(const url of ['/about','/contact','/tools/application-readiness',
  '/blog/chevening-scholarship-application-guide/',
  '/blog/erasmus-mundus-joint-masters-application/',
  '/blog/undp-internships-application-guide/']){
  assert.ok(sitemap.includes('https://oppmatcher.tech'+url+'</loc>'),url+' absent from sitemap');
 }
 const dirs=readdirSync(new URL('../blog/',import.meta.url),{withFileTypes:true}).filter(e=>e.isDirectory());
 for(const dir of dirs){
  const html=get('blog/'+dir.name+'/index.html');
  const isExcluded=/name="robots"\s+content="noindex(?:,follow)?"/i.test(html);
  const isListed=sitemap.includes('<loc>https://oppmatcher.tech/blog/'+dir.name+'/</loc>');
  assert.equal(isListed,!isExcluded,dir.name+' sitemap/robots mismatch');
 }
});

test('homepage offers visible paths to useful pages without login or reliance on dynamic cards',()=>{
 const home=get('index.html');
 for(const url of ['/tools/application-readiness','/about','/contact','/blog/methodology/','/opportunities',
 '/blog/chevening-scholarship-application-guide/','/blog/unicef-internships-application-guide/',
 '/blog/unesco-internship-programme-guide/']){
   assert.ok(home.includes('href="'+url+'"'), 'Missing home link: '+url);
 }
 assert.ok((home.match(/class="omTrustCard"/g)||[]).length>=6);
 assert.ok(home.includes('<noscript><style>'), 'No non-JavaScript fallback on homepage');
 assert.ok(get('site-aux-nav-v5.js').includes('Free checklist'));
});
test('AdSense uses one shared root ads.txt and matching publisher snippets on substantial public destinations',()=>{
 const ads=get('ads.txt').trim();
 assert.equal(ads,'google.com, pub-1916126969266611, DIRECT, f08c47fec0942fa0');
 for(const file of ['index.html','privacy.html','blog/index.html',
 'blog/chevening-scholarship-application-guide/index.html',
 'blog/unicef-internships-application-guide/index.html',
 'blog/unesco-internship-programme-guide/index.html']){
   assert.ok(get(file).includes('ca-pub-1916126969266611'),file+' missing publisher script');
 }
 // Thin utility pages and generated record/listing pages are not ad inventory.
 for(const file of ['about.html','contact.html','worldwide.html','tools/application-readiness.html'])
   assert.ok(AD_FREE.has(file)&&!get(file).includes('adsbygoogle.js'),file+' should be ad-free under the thin-page policy');
 for(const file of ['api/public-opportunities.js','api/latest.js','lib/programme-pages.js'])
   assert.ok(!get(file).includes('adsbygoogle.js'),file+' generated pages must not load AdSense');
 // Private tracker preparation and admin pages are not general ad inventory.
});

test('expanded high-value guides retain indexability and official source references',()=>{
 for(const name of ['chevening-scholarship-application-guide','erasmus-mundus-joint-masters-application','undp-internships-application-guide','unicef-internships-application-guide','unesco-internship-programme-guide','oecd-internship-programme-guide','daad-scholarships-germany-guide','mext-japan-scholarships-embassy-route','australia-awards-scholarships-guide','commonwealth-masters-scholarship-guide','global-korea-scholarship-application','who-internships-guide','unhcr-internships-guide','schwarzman-scholars-eligibility-application','marie-curie-postdoctoral-fellowships-guide']){
  const html=get('blog/'+name+'/index.html');
  const text=html.match(/<article class="article">([\s\S]*?)<\/article>/)?.[1]||'';
  assert.ok(text.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length>=650,name+' too short');
  assert.ok((text.match(/<table/g)||[]).length>=1,name+' missing comparison');
  assert.ok((text.match(/href="https:\/\//g)||[]).length>=2,name+' missing direct official references');
  assert.match(html,/name="robots" content="index,follow"/);
  const modified=html.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1]||'';
  assert.ok(modified>='2026-11-03',name+' dateModified went backwards from its 3 Nov expansion');
 }
});


test('all five formerly excluded guides now provide real source-backed content',()=>{
 const names=['gates-cambridge-scholarship-application','knight-hennessy-scholars-application',
 'research-fellowships-uk-funding-guide','scholarship-interview-preparation-questions',
 'scholarship-statement-of-purpose-examples'];
 const sitemap=get('sitemap.xml');
 for(const name of names){
   const html=get('blog/'+name+'/index.html');
   const article=html.match(/<article class="article">([\s\S]*?)<\/article>/)?.[1]||'';
   assert.match(html,/name="robots" content="index,follow"/,name);
   assert.match(html,/"dateModified":"2026-11-04"/,name);
   assert.ok(article.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length>=650,name+' still thin');
   assert.ok((article.match(/<table/g)||[]).length>=1,name+' missing comparison');
   assert.ok((article.match(/href="https:\/\//g)||[]).length>=2,name+' lacks official citations');
   assert.ok(sitemap.includes('<loc>https://oppmatcher.tech/blog/'+name+'/</loc>'),name+' not in sitemap');
 }
});

test('public blog and sitemap promote only reviewed, indexable article destinations',()=>{
 const blog=get('blog/index.html');
 const sitemap=get('sitemap.xml');
 assert.ok((blog.match(/class="blogCard"/g)||[]).length>=30,'Too few substantive guide cards');
 assert.ok((sitemap.match(/<loc>/g)||[]).length>100,'SEO sitemap unexpectedly shrank');
 const methodology=get('blog/methodology/index.html');
 assert.match(methodology,/name="robots" content="index,follow"/);
 assert.match(methodology,/"dateModified":"2026-11-04"/);
 assert.ok(methodology.includes('href="#method-current"'));
 assert.ok(methodology.includes('last successful check must also be within'));
 const listing=get('api/public-opportunities.js');
 assert.ok(!listing.includes('adsbygoogle.js'),'Generated vacancy pages carry no AdSense (thin-page policy)');
});

test('six additional applicant guides have substantial examples and dated source evidence',()=>{
 const names=['unicef-vs-undp-internships-comparison','internships-after-graduation-eligibility',
  'scholarships-without-ielts-what-counts','fake-internship-offers-red-flags',
  'uk-internships-international-graduates','scholarship-application-deadline-tracker'];
 for(const name of names){
  const html=get('blog/'+name+'/index.html');
  const article=html.match(/<article class="article">([\s\S]*?)<\/article>/)?.[1]||'';
  const words=article.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length;
  assert.ok(words>=650,name+' needs more complete practical detail');
  assert.ok((article.match(/<table/g)||[]).length>=1,name+' must contain an application comparison');
  assert.ok((article.match(/href="https:\/\//g)||[]).length>=1,name+' must refer to an official source');
  assert.match(html,/name="robots" content="index,follow"/);
  assert.match(html,/"dateModified":"2026-11-04"/);
 }
});

test('every public blog article has correct publisher script and sitemap matches its indexability',()=>{
 const sitemap=get('sitemap.xml');
 const blog=new URL('../blog/',import.meta.url);
 const dirs=readdirSync(blog,{withFileTypes:true}).filter(entry=>entry.isDirectory());
 assert.ok(dirs.length>=50,'expected published guide directories');
 for(const dir of dirs){
  const path='blog/'+dir.name+'/index.html';
  const html=get(path);
  const url='https://oppmatcher.tech/blog/'+dir.name+'/';
  const excluded=/name="robots"\s+content="noindex(?:,follow)?"/i.test(html);
  const hasAd=html.includes('adsbygoogle.js?client=ca-pub-1916126969266611');
  assert.equal(hasAd,!excluded&&!AD_FREE.has(path),path+' should only serve AdSense on reviewed, substantial guides');
  assert.equal(sitemap.includes('<loc>'+url+'</loc>'),!excluded,path+' sitemap should reflect robots status');
  if(excluded){
    assert.ok(html.includes('<b>Editorial review</b>'),path+' missing editorial notice');
    // Noindex pages may remain discoverable to users; robots metadata keeps them out of search.
  }
 }
});



test('every indexable static public HTML page carries exactly one AdSense loader in the head',()=>{
 const root=new URL('../',import.meta.url);
 const skippedRoot=/^(?:admin|prepare)\.html$|(?:preview|visual|launch-ready)\.html$/i;
 let checked=0,excluded=0;
 function inspect(dir,path=''){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
   const name=path+entry.name;
   if(entry.isDirectory()){
    if(entry.name==='node_modules'||entry.name==='.git')continue;
    inspect(new URL(entry.name+'/',dir),name+'/');
    continue;
   }
   if(!entry.name.endsWith('.html')||(path===''&&skippedRoot.test(entry.name)))continue;
   const html=readFileSync(new URL(entry.name,dir),'utf8');
   const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
   assert.ok(head,name+' is missing an HTML head');
   const robots=html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)?.[0]||'';
   const noindex=/noindex/i.test(robots);
   const snippets=[...head[1].matchAll(/adsbygoogle\.js\?client=ca-pub-1916126969266611/gi)];
   const allSnippets=[...html.matchAll(/adsbygoogle\.js\?client=/gi)];
   if(noindex){
    assert.equal(allSnippets.length,0,name+' is an excluded editorial page and should stay ad-free');
    excluded++;
   }else if(AD_FREE.has(name)){
    assert.equal(allSnippets.length,0,name+' is on the thin-page ad-free list and must not load AdSense');
    excluded++;
   }else{
    assert.equal(snippets.length,1,name+' must have one approved AdSense loader inside <head>');
    assert.equal(allSnippets.length,1,name+' must not load AdSense more than once');
    assert.match(head[1],/crossorigin=["']anonymous["']/i,name+' missing cross-origin attribute');
    checked++;
   }
  }
 }
 inspect(root);
 assert.ok(checked>=60,'Expected the substantial public pages to carry ads');
 // Design previews and admin pages stay noindex and ad-free; reviewed guides are re-indexed as they are rewritten.
 assert.ok(excluded>=4,'Expected the design-preview pages to stay noindex and ad-free');
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(home,/<meta name="google-adsense-account" content="ca-pub-1916126969266611">/);
 assert.equal(readFileSync(new URL('../ads.txt',import.meta.url),'utf8').trim(),
  'google.com, pub-1916126969266611, DIRECT, f08c47fec0942fa0');
});


test('AdSense quality priority pages explain the decision, not just a templated list',()=>{
 const pages=[
  ['scholarships/index.html', 'Choose a scholarship by its application route'],
  ['internships/index.html', 'Choose the right internship listing'],
  ['fellowships/index.html', 'What kind of fellowship matches your background?'],
  ['exchange-programs/index.html', 'Compare exchange formats before applying'],
  ['programmes/index.html', 'Choose your application route, not just a famous programme'],
  ['blog/scholarship-motivation-letter-sample/index.html', 'Worked example: turn a vague motivation into verifiable evidence'],
  ['blog/scholarship-recommendation-letter-sample/index.html', 'What makes a recommendation useful?'],
  ['blog/scholarship-scams-how-to-verify/index.html', 'Two example offers: how the evidence differs']
 ];
 const sitemap=get('sitemap.xml');
 for(const [file,marker] of pages){
   const html=get(file);
   const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
   const words=main.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().split(/\s+/).length;
   assert.ok(words>=375,file+' lost its practical content');
   assert.ok(main.includes(marker),file+' lost its distinct comparison or worked example');
   assert.ok((main.match(/<table\b/g)||[]).length>=1,file+' missing detailed comparison');
   assert.ok((main.match(/href="\/(?:blog|tools|latest|programmes|scholarships|internships|fellowships|exchange-programs)/g)||[]).length>=3,file+' lost useful next steps');
   assert.match(html,/rel="canonical" href="https:\/\/oppmatcher\.tech\//i,file+' missing canonical');
   assert.match(html,/name=["']robots["']\s+content=["']index,follow["']/i,file+' blocked from index');
   const canonical=html.match(/rel="canonical" href="([^"]+)"/i)?.[1];
   assert.ok(lastmodFollowsEdit(sitemap,canonical),file+' sitemap lastmod did not follow the real edit');
 }
 assert.doesNotMatch(get('programmes/index.html'),/Provider application status must be checked directly/);
});


test('expanded source-backed programme and planning pages retain actual decision tools',()=>{
 const focus=[
   ['deadlines/index.html','Build a deadline record from official evidence'],
   ['scholarships/countries/index.html','Study destination and applicant nationality are separate questions'],
   ['programmes/adb-internship-programme/index.html','What the ADB Internship Program actually requires'],
   ['programmes/newton-international-fellowship/index.html','Newton International Fellowships: eligibility that matters'],
   ['internships/remote/index.html','Remote does not automatically mean international'],
   ['exchange-programs/summer-schools/index.html','What will the summer school actually give you?']
 ];
 const sitemap=get('sitemap.xml');
 for(const [path,heading] of focus){
   const html=get(path);
   const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
   const words=main.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().split(/\s+/).length;
   assert.ok(words>=420,path+' must give real programme-specific guidance');
   assert.ok(main.includes(heading),path+' lost its distinct content');
   assert.ok(main.includes('<table'),path+' must retain a practical decision comparison');
   assert.match(html,/name="robots" content="index,follow"/);
   const canonical=html.match(/rel="canonical" href="([^"]+)"/)?.[1];
   assert.ok(canonical,path+' missing canonical');
   assert.ok(lastmodFollowsEdit(sitemap,canonical),
     path+' sitemap must keep a truthful modification date');
   assert.equal((html.match(/adsbygoogle\.js\?client=ca-pub-1916126969266611/g)||[]).length,1,
     path+' must have one publisher script');
 }
 const deadlines=get('deadlines/index.html');
 const scripts=[...deadlines.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 assert.equal(scripts.length,1,'Deadline form has one browser-only script');
 new Function(scripts[0]);
 for(const formField of ['deadlineWorksheet','deadlineName','deadlineSource','deadlineDate',
   'deadlineTime','deadlineZone','deadlineOther','deadlineRecord','copyDeadline']){
   assert.ok(deadlines.includes('id="'+formField+'"'),'Missing deadline input '+formField);
 }
 assert.doesNotMatch(scripts[0],/\b(?:fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage)\b/,
   'Deadline planner must not transmit or retain personal application data');
 assert.match(get('programmes/adb-internship-programme/index.html'),
   /https:\/\/www\.adb\.org\/work-with-us\/careers\/internship-program/);
 assert.match(get('programmes/newton-international-fellowship/index.html'),
   /https:\/\/www\.royalsociety\.org\/grants\/newton-international\//);
});


test('ten category hubs provide distinct evidence-based comparisons and avoid excluded editorial drafts',()=>{
 const updated=[
  ['exchange-programs/youth-conferences/index.html','Is the event selective, funded or simply paid admission?'],
  ['fellowships/leadership/index.html','What does a leadership fellowship actually assess?'],
  ['internships/paid/index.html','Paid internship, expense allowance or reimbursement?'],
  ['scholarships/undergraduate/index.html','First-degree funding follows different routes'],
  ['scholarships/masters/index.html',"Three different ways master's scholarships are awarded"],
  ['scholarships/phd/index.html','Separate doctoral studentships from postdoctoral research awards'],
  ['internships/research-summer/index.html','Research placements, summer courses and lab internships are different'],
  ['scholarships/for/index.html','Nationality is not the same as residence or study location'],
  ['internships/tech/index.html','What evidence fits a technology internship?'],
  ['fellowships/policy-and-ai/index.html','Choose the project, not just the fellowship title']
 ];
 const excludedSlugs=new Set([
  'chevening-work-experience-calculation','commonwealth-scholarship-nominating-agency',
  'daad-vs-university-scholarship-germany','fully-funded-vs-partially-funded-scholarships',
  'international-internship-work-visa-requirements','internships-without-experience-portfolio',
  'masters-scholarships-international-students-guide','paid-vs-unpaid-internships-abroad',
  'phd-fellowship-vs-research-grant','remote-internships-international-students',
  'research-proposal-for-scholarship-guide','scholarship-country-eligibility-matching',
  'scholarship-cv-format-for-students','scholarship-essay-common-mistakes',
  'scholarship-recommendation-letter-request','scholarships-students-with-disabilities',
  'statement-of-purpose-vs-personal-statement','undergraduate-scholarships-abroad-checklist',
  'university-placement-year-internship-credit','us-graduate-assistantship-vs-fellowship'
 ]);
 const sitemap=get('sitemap.xml');
 for(const [path,heading] of updated){
  const html=get(path);
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
  const words=main.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().split(/\s+/).length;
  assert.ok(words>=400,path+' has reverted to a thin directory');
  assert.ok(main.includes(heading),path+' missing its original comparison');
  assert.ok(main.includes('<table'),path+' missing its structured decision table');
  assert.doesNotMatch(main,/These resources compare the route without asserting that every linked scheme is open/,
    path+' repeated generic copy instead of a useful answer');
  const canonical=html.match(/rel="canonical" href="([^"]+)"/)?.[1];
  assert.ok(canonical,path+' missing canonical');
  assert.ok(lastmodFollowsEdit(sitemap,canonical),
    path+' lastmod must match the substantive change');
  assert.match(html,/name="robots" content="index,follow"/);
  assert.equal((html.match(/adsbygoogle\.js\?client=ca-pub-1916126969266611/g)||[]).length,1,
    path+' must use one publisher script');
  for(const match of main.matchAll(/href="\/blog\/([^/]+)\//g)){
    assert.ok(!excludedSlugs.has(match[1]),path+' promotes noindex draft '+match[1]);
  }
 }
});
