import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const get=path=>readFileSync(new URL('../'+path, import.meta.url),'utf8');

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

test('sitemap lists valuable public destinations and avoids temporarily excluded guides',()=>{
 const sitemap=get('sitemap.xml');
 for(const url of ['/about','/contact','/tools/application-readiness',
 '/blog/chevening-scholarship-application-guide/',
 '/blog/erasmus-mundus-joint-masters-application/',
 '/blog/undp-internships-application-guide/']){
   assert.ok(sitemap.includes('https://oppmatcher.tech'+url+'</loc>'),url);
 }
 const excluded=[
 "chevening-work-experience-calculation",
 "commonwealth-scholarship-nominating-agency",
 "daad-vs-university-scholarship-germany",
 "erasmus-mundus-course-catalogue-guide",
 "fully-funded-vs-partially-funded-scholarships",
 "international-internship-work-visa-requirements",
 "internships-without-experience-portfolio",
 "masters-scholarships-international-students-guide",
 "msca-postdoctoral-mobility-rules",
 "paid-vs-unpaid-internships-abroad",
 "phd-fellowship-vs-research-grant",
 "remote-internships-international-students",
 "research-proposal-for-scholarship-guide",
 "scholarship-country-eligibility-matching",
 "scholarship-cv-format-for-students",
 "scholarship-eligibility-nationality-rules",
 "scholarship-essay-common-mistakes",
 "scholarship-recommendation-letter-request",
 "scholarships-students-with-disabilities",
 "statement-of-purpose-vs-personal-statement",
 "un-internship-application-checklist",
 "undergraduate-scholarships-abroad-checklist",
 "university-placement-year-internship-credit",
 "us-graduate-assistantship-vs-fellowship"
];
 for(const slug of excluded){
  const html=get('blog/'+slug+'/index.html');
  assert.match(html,/name="robots" content="noindex,follow"/,slug+' missing noindex');
  assert.ok(!sitemap.includes('https://oppmatcher.tech/blog/'+slug+'/</loc>'),slug+' in sitemap');
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
test('AdSense uses one shared root ads.txt and matching publisher snippets on public destinations',()=>{
 const ads=get('ads.txt').trim();
 assert.equal(ads,'google.com, pub-1916126969266611, DIRECT, f08c47fec0942fa0');
 for(const file of ['index.html','about.html','contact.html','privacy.html','worldwide.html','blog/index.html','tools/application-readiness.html',
 'blog/chevening-scholarship-application-guide/index.html',
 'blog/unicef-internships-application-guide/index.html',
 'blog/unesco-internship-programme-guide/index.html']){
   assert.ok(get(file).includes('ca-pub-1916126969266611'),file+' missing publisher script');
 }
 for(const file of ['api/public-opportunities.js','api/latest.js']){
   assert.ok(get(file).includes('ca-pub-1916126969266611'),file+' missing dynamic page script');
 }
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
  assert.match(html,/"dateModified":"2026-11-03"/);
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
 assert.equal((blog.match(/class="blogCard"/g)||[]).length,31);
 assert.equal((sitemap.match(/<loc>/g)||[]).length,40);
 const methodology=get('blog/methodology/index.html');
 assert.match(methodology,/name="robots" content="index,follow"/);
 assert.match(methodology,/"dateModified":"2026-11-04"/);
 assert.ok(methodology.includes('href="#method-current"'));
 assert.ok(methodology.includes('last successful check must also be within'));
 const listing=get('api/public-opportunities.js');
 assert.ok(listing.includes("(index ? '<script async"),'Adsense code should be conditional on indexable vacancy status');
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
  const hasAd=html.includes('ca-pub-1916126969266611');
  assert.equal(hasAd,!excluded,path+' should only serve AdSense on reviewed/indexable guides');
  assert.equal(sitemap.includes('<loc>'+url+'</loc>'),!excluded,path+' sitemap should reflect robots status');
  if(excluded){
    assert.ok(html.includes('<b>Editorial review</b>'),path+' missing editorial notice');
    assert.ok(!get('blog/index.html').includes('href="/blog/'+dir.name+'/"'),path+' promoted in blog index');
  }
 }
});

