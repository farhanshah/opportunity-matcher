import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('../',import.meta.url);
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const folders=readdirSync(new URL('../blog/',import.meta.url)).filter(x=>x!=='index.html'&&statSync(new URL('../blog/'+x,import.meta.url)).isDirectory());
const sitemap=get('sitemap.xml'),index=get('blog/index.html'),robots=get('robots.txt');
const ADS='ca-pub-1916126969266611';
test('editorial guides have consistent robots, canonical, sitemap, and AdSense configuration',()=>{
 assert.ok(folders.length>=55,'Expected existing scholarship and internship guides');
 const locs=[...sitemap.matchAll(/<loc>([^<]+)<\\/loc>/g)].map(x=>x[1]);
 assert.equal(locs.length,new Set(locs).size,'Duplicate sitemap URLs');
 for(const slug of folders){
  const path='blog/'+slug+'/index.html',html=get(path);
  const url='https://oppmatcher.tech/blog/'+slug+'/';
  const excluded=/name="robots"\\s+content="noindex(?:,follow)?"/i.test(html);
  const head=html.slice(0,html.indexOf('</head>'));
  const adLoaders=[...head.matchAll(/adsbygoogle\\.js\\?client=ca-pub-1916126969266611/g)].length;
  assert.equal(sitemap.includes('<loc>'+url+'</loc>'),!excluded,path+' sitemap and robots disagree');
  assert.ok(html.includes('rel="canonical" href="'+url+'"'),path+' missing canonical');
  assert.ok(html.includes('name="description"'),path+' missing description');
  assert.equal(adLoaders,excluded?0:1,path+' AdSense loader count');
  assert.match(html,/<script type="application\\/ld\\+json">/,path+' missing structured data');
 }
 for(const slug of ['latest','worldwide','opportunities'])assert.ok(sitemap.includes('<loc>https://oppmatcher.tech/'+slug+'</loc>'),slug+' missing sitemap');
 assert.match(robots,/Sitemap: https:\\/\\/oppmatcher.tech\\/sitemap.xml/);
 assert.match(robots,/Sitemap: https:\\/\\/oppmatcher.tech\\/opportunities-sitemap.xml/);
});
test('existing public pages keep required AdSense publisher identification',()=>{
 for(const page of ['index.html','blog/index.html','privacy.html','worldwide.html']){
  const html=get(page),head=html.slice(0,html.indexOf('</head>'));
  assert.equal((head.match(/adsbygoogle\\.js\\?client=ca-pub-1916126969266611/g)||[]).length,1,page+' AdSense loader missing or duplicated');
 }
 assert.ok(get('api/latest.js').includes(ADS));
 assert.ok(get('api/public-opportunities.js').includes('adsbygoogle.js')||get('api/public-opportunities.js').includes(ADS),'SEO opportunity pages must include publisher integration');
});

test('scholarship pillar explains funding comparison and links to exact provider guides',()=>{
 const pillar=get('blog/fully-funded-scholarships-international-students/index.html');
 assert.ok(pillar.includes('"dateModified":"2026-10-23"'));
 assert.ok(pillar.includes('id="compare"'));
 assert.ok(pillar.includes('id="routes"'));
 assert.ok(pillar.includes('href="/latest"'));
 assert.ok(pillar.includes('The provider')||pillar.includes('provider'));
 assert.ok(!pillar.includes('href="/#live-opportunities"'));
 for(const slug of ['erasmus-mundus-joint-masters-application','daad-scholarships-germany-guide',
    'chevening-scholarship-application-guide','commonwealth-masters-scholarship-guide',
    'gates-cambridge-scholarship-application','mext-japan-scholarships-embassy-route',
    'australia-awards-scholarships-guide','global-korea-scholarship-application']){
   assert.ok(get('blog/'+slug+'/index.html').includes('href="/blog/fully-funded-scholarships-international-students/"'),slug+' should link to funding comparison');
 }
 assert.match(sitemap,/<loc>https:\\/\\/oppmatcher\\.tech\\/blog\\/fully-funded-scholarships-international-students\\/<\\/loc><lastmod>\\d{4}-\\d{2}-\\d{2}<\\/lastmod>/);
});

test('new editorial guide clusters and all 61 sitemap URLs are linked correctly',()=>{
 const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
 assert.ok(urls.length>=61,'31 previous URLs and 30 new guides required');
 for(const group of ['scholarship','internship','research'])
  assert.ok(index.includes('id="new-'+group+'-guides"'));
 for(const slug of folders){
  const html=get('blog/'+slug+'/index.html');
  if(!html.includes('OppMatcher editorial ·'))continue;
  const plain=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  assert.ok(plain.split(' ').length>=300,slug+' lacks substantial guidance');
  assert.ok(html.includes('href="/latest"'),slug+' should link to official listings');
 }
});

test('priority application guides are connected to existing relevant pillar pages',()=>{
 const scholarship=get('blog/fully-funded-scholarships-international-students/index.html');
 const internship=get('blog/international-internships-graduate-placements/index.html');
 for(const slug of ['scholarships-without-ielts-what-counts','masters-scholarships-international-students-guide'])
  assert.ok(scholarship.includes('href="/blog/'+slug+'/"'));
 assert.ok(internship.includes('href="/blog/un-internship-application-checklist/"'));
 assert.ok(internship.includes('href="/latest"'));
 assert.ok(!internship.includes('href="/#live-opportunities"'));
});
