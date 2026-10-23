import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('../',import.meta.url);
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const folders=readdirSync(new URL('../blog/',import.meta.url)).filter(x=>x!=='index.html'&&statSync(new URL('../blog/'+x,import.meta.url)).isDirectory());
const sitemap=get('sitemap.xml'),index=get('blog/index.html'),robots=get('robots.txt');
const ADS='ca-pub-1916126969266611';
test('every published guide is in the sitemap and blog directory, with canonical metadata and publisher tag',()=>{
 assert.ok(folders.length>=25,'Expected at least 20 new + 5 existing editorial pages');
 const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
 assert.equal(locs.length,new Set(locs).size,'Duplicate sitemap URLs');
 for(const slug of folders){
  const path='blog/'+slug+'/index.html',html=get(path);
  const url='https://oppmatcher.tech/blog/'+slug+'/';
  assert.ok(sitemap.includes('<loc>'+url+'</loc>'),path+' missing sitemap entry');
  assert.ok(index.includes('href="/blog/'+slug+'/"')||slug==='methodology',path+' missing blog discovery link');
  assert.ok(html.includes('rel="canonical" href="'+url+'"'),path+' missing canonical');
  assert.ok(html.includes('name="description"'),path+' missing description');
  assert.ok(html.includes('name="robots" content="index,follow"'),path+' unexpectedly not indexable');
  const head=html.slice(0,html.indexOf('</head>'));
  assert.equal((head.match(/ca-pub-1916126969266611/g)||[]).length,1,path+' must contain one publisher tag inside <head>');
  assert.match(html,/<script type="application\/ld\+json">/,'Missing article JSON-LD');
  assert.ok(html.includes('href="/blog/')||slug==='methodology','Missing internal links');
 }
 for(const slug of ['latest','worldwide','opportunities'])assert.ok(sitemap.includes('<loc>https://oppmatcher.tech/'+slug+'</loc>'),slug+' missing sitemap');
 assert.match(robots,/Sitemap: https:\/\/oppmatcher.tech\/sitemap.xml/);
 assert.match(robots,/Sitemap: https:\/\/oppmatcher.tech\/opportunities-sitemap.xml/);
});
test('existing public pages keep required AdSense publisher identification',()=>{
 for(const page of ['index.html','blog/index.html','privacy.html','worldwide.html']){
  const html=get(page),head=html.slice(0,html.indexOf('</head>'));
  assert.equal((head.match(/ca-pub-1916126969266611/g)||[]).length,1,page+' publisher tag missing or duplicated');
 }
 assert.ok(get('api/latest.js').includes(ADS));
 assert.ok(get('api/public-opportunities.js').includes('adsbygoogle.js')||get('api/public-opportunities.js').includes(ADS),'SEO opportunity pages must include publisher integration');
});
