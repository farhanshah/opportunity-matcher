import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=(f)=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const pages=['guides-preview.html','guide-preview.html','about-preview.html'].map(read);
const css=read('editorial-preview.css'),client=read('editorial-preview.js');
const model=vm.runInNewContext(client+'\nEditorialPreviewModel',{});
const previewFiles=['design-preview.html','discover-preview.html',
  'passport-preview.html','workspace-preview.html'].map(read);
const liveBlog=read('blog/index.html'),livePolicy=read('privacy.html'),liveHome=read('index.html');

test('three standalone editorial pages are noindex and production remains isolated',()=>{
 for(const html of pages){
  assert.match(html,/<meta name="robots" content="noindex,nofollow"/);
  assert.match(html,/editorial-preview.css\?v=1/);
  assert.match(html,/editorial-preview.js\?v=1/);
  assert.match(html,/DESIGN CONCEPT 05/);
 }
 assert.match(liveBlog,/Scholarships and placements, explained before you apply/);
 assert.doesNotMatch(liveBlog,/DESIGN CONCEPT 05/);
 assert.match(livePolicy,/Privacy Policy/);
 assert.doesNotMatch(livePolicy,/DESIGN CONCEPT 05/);
 assert.doesNotMatch(liveHome,/DESIGN CONCEPT 05/);
});
test('guides come from all four real published OppMatcher blog directories',()=>{
 assert.equal(model.items.length,4);
 for(const item of model.items){
  const path='blog/'+item.slug+'/index.html';
  const original=read(path);
  assert.ok(original.includes(item.title),item.title+' missing from '+path);
  assert.equal(model.livePath(item),'/blog/'+item.slug+'/');
  assert.equal(model.findGuide(item.slug).slug,item.slug);
  assert.equal(model.find(item.category.toLowerCase(),item.topic).length,1);
 }
});
test('search and category filter return only real published topics',()=>{
 assert.equal(model.find('').length,4);
 assert.deepEqual(Array.from(model.find('internship').map(x=>x.topic)),['internships']);
 assert.deepEqual(Array.from(model.find('scholarship','applications').map(x=>x.topic)),['applications']);
 assert.equal(model.find('nonexistent provider', 'all').length,0);
 assert.equal(model.find('','eligibility').length,1);
 assert.equal(model.find('','scholarships').length,1);
});
test('article navigation uses safe fixed slugs and abridged factual provider-first copy',()=>{
 for(const item of model.items){
  const link=model.previewPath(item);
  assert.match(link,/^\/guide-preview\.html\?guide=[a-z0-9%-]+$/);
  assert.equal(item.headings.length,4);
  assert.ok(item.headings.every(pair=>pair.length===2&&pair[0]&&pair[1]));
 }
 assert.equal(model.findGuide('not-a-real-article').slug,model.items[0].slug);
 assert.match(pages[1],/Content excerpt, not the complete published guide/);
 assert.match(pages[1],/Read complete published guide/);
 assert.match(pages[1],/official provider for programme-specific facts/);
 assert.match(client,/new URLSearchParams\(window.location.search\)/);
});
test('untrusted search terms cannot become executable HTML',()=>{
 assert.equal(model.esc('<img src=x onerror="alert(1)">'),
  '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
 assert.ok(model.card({...model.items[0],title:'<script>alert(1)</script>'})
  .includes('&lt;script&gt;'));
 assert.ok(!model.card({...model.items[0],title:'<script>alert(1)</script>'})
  .includes('<script>'));
 assert.doesNotMatch(client,/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/);
 assert.doesNotMatch(client,/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\b/);
});
test('About and support FAQ avoid invented endorsements and keep policy authoritative',()=>{
 const about=pages[2];
 assert.match(about,/Official provider first/);
 assert.match(about,/Dates need context/);
 assert.match(about,/No invented certainty/);
 assert.match(about,/Does OppMatcher guarantee that I qualify/);
 assert.match(about,/No\. Matching can highlight/);
 assert.match(about,/href="\/privacy"/);
 assert.match(about,/href="\/blog\/methodology\/"/);
 assert.match(about,/legal text has not been changed/);
 assert.ok((about.match(/<details>/g)||[]).length>=5);
});
test('turquoise responsive layout and mobile interactions are present',()=>{
 assert.match(css,/--aqua:#51e7d6/);
 assert.match(css,/@media\(max-width:770px\)/);
 assert.match(css,/@media\(max-width:540px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.srOnly/);
 assert.match(client,/aria-expanded/);
 assert.match(client,/IntersectionObserver/);
 for(const page of pages)assert.match(page,/aria-controls="navLinks"/);
});
test('all four earlier approved designs link to the new guides preview',()=>{
 for(const page of previewFiles)assert.match(page,/href="\/guides-preview.html"/);
 assert.match(previewFiles[0],/href="\/about-preview.html#faq"/);
 assert.match(previewFiles[1],/href="\/about-preview.html#approach"/);
});
