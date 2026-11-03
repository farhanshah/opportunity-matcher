import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
 'australia-awards-scholarships-guide','commonwealth-masters-scholarship-guide',
 'daad-scholarships-germany-guide','gates-cambridge-scholarship-application',
 'global-korea-scholarship-application','knight-hennessy-scholars-application',
 'marie-curie-postdoctoral-fellowships-guide','mext-japan-scholarships-embassy-route',
 'oecd-internship-programme-guide','research-fellowships-uk-funding-guide',
 'scholarship-interview-preparation-questions','scholarship-statement-of-purpose-examples',
 'schwarzman-scholars-eligibility-application','unesco-internship-programme-guide',
 'unhcr-internships-guide','unicef-internships-application-guide','who-internships-guide'];
 for(const slug of excluded){
  const html=get('blog/'+slug+'/index.html');
  assert.match(html,/name="robots" content="noindex,follow"/,slug+' missing noindex');
  assert.ok(!sitemap.includes('https://oppmatcher.tech/blog/'+slug+'/</loc>'),slug+' in sitemap');
 }
});

test('expanded high-value guides retain indexability and official source references',()=>{
 for(const name of ['chevening-scholarship-application-guide','erasmus-mundus-joint-masters-application','undp-internships-application-guide']){
  const html=get('blog/'+name+'/index.html');
  const text=html.match(/<article class="article">([\s\S]*?)<\/article>/)?.[1]||'';
  assert.ok(text.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length>=650,name+' too short');
  assert.ok((text.match(/<table/g)||[]).length>=1,name+' missing comparison');
  assert.ok((text.match(/href="https:\/\//g)||[]).length>=2,name+' missing direct official references');
  assert.match(html,/name="robots" content="index,follow"/);
  assert.match(html,/"dateModified":"2026-11-03"/);
 }
});
