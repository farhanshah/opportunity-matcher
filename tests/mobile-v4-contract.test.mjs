import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const index=get('index.html'),preview=get('mobile-visual-v4.html');
const ids=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]).sort();
const actions=s=>[...s.matchAll(/\bonclick="([^"]+)"/g)].map(x=>x[1]).sort();
const blogNames=['index.html','methodology/index.html','fully-funded-scholarships-international-students/index.html',
'international-internships-graduate-placements/index.html','scholarship-application-documents/index.html',
'scholarship-eligibility-checklist/index.html'];
test('production mobile visual repair preserves all application IDs and actions',()=>{
 assert.deepEqual(ids(index),ids(preview));
 assert.deepEqual(actions(index),actions(preview));
 assert.match(index,/integration-turquoise-v4\.css\?v=4/);
 assert.match(index,/integration-shell-mobile-v4\.js/);
 assert.match(index,/canonical" href="https:\/\/oppmatcher.tech\/"/);
 assert.doesNotMatch(index,/noindex,nofollow|visual preview/i);
});
test('production blog styling preserves all canonical article routes and crawl rules',()=>{
 for(const name of blogNames){
  const html=get('blog/'+name);
  const route=name==='index.html'?'/blog/':'/blog/'+name.replace('/index.html','/');
  assert.ok(html.includes('<link rel="canonical" href="https://oppmatcher.tech'+route+'">'),name);
  assert.ok(html.includes('<meta name="robots" content="index,follow">'),name);
  assert.ok(html.includes('<link rel="stylesheet" href="/blog.css">'),name);
  assert.ok(html.includes('href="/blog-turquoise-v4.css?v=4"'),name);
  assert.ok(html.includes('<script type="application/ld+json">'),name);
 }
});
test('v4 dynamic stylesheets preserve real app loaders and staging isolation',()=>{
 const shell=get('integration-shell-mobile-v4.js');
 assert.match(shell,/integration-turquoise-v4\.css/);
 assert.doesNotMatch(shell,/history\[method\]|OpportunityCloud\.submit/);
 assert.match(index,/src="\/app-v07\.js" defer/);
 const style=get('integration-turquoise-v4.css');
 assert.match(style,/#difference \.feature \.passportMock/);
 assert.match(style,/position:relative!important;inset:auto!important/);
 assert.match(style,/\.checkRow small/);
 assert.match(style,/\.liveCard \.provider/);
 assert.match(style,/@media\(max-width:350px\)/);
});
