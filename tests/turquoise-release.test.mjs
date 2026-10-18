import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const legacy=read('index.html'),release=read('launch-ready.html'),
 shell=read('integration-shell-live.js'),staging=read('integration-shell-v2.js'),
 css=read('integration-turquoise-v2.css'),routes=JSON.parse(read('vercel.json'));
const ids=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]).sort();
const onclick=s=>[...s.matchAll(/\bonclick="([^"]+)"/g)].map(x=>x[1]).sort();
const embedded=s=>[...s.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(x=>x[1]);
const hasV2=legacy.includes('/integration-shell-live.js');

test('launch candidate preserves every real application field and inline action',()=>{
 assert.deepEqual(ids(release),ids(legacy));
 assert.deepEqual(onclick(release),onclick(legacy));
 assert.ok(ids(release).includes('obNat')&&ids(release).includes('obEdu')&&ids(release).includes('obField'));
 assert.deepEqual(embedded(release),['/app-v07.js','/integration-shell-live.js']);
 assert.match(release,/class="omTurquoisePreview"/);
 assert.match(release,/integration-turquoise-v2.css\?v=2/);
 assert.match(release,/integration-turquoise.css\?v=1/);
});
test('canonical and public metadata remain intact during rollout',()=>{
 assert.match(release,/<link rel="canonical" href="https:\/\/oppmatcher.tech\/">/);
 assert.match(release,/<meta name="robots" content="noindex,nofollow">/);
 assert.match(legacy,/<meta name="description" content="Find scholarships/);
 assert.match(release,/<meta name="description" content="Find scholarships/);
 assert.match(release,/<title>OppMatcher \| Scholarships, Internships &amp; Fellowships<\/title>/);
 assert.doesNotMatch(release,/integrationPreviewNotice|integrationWarning|DESIGN CONCEPT 0/);
 if(hasV2){
  assert.doesNotMatch(legacy,/name="robots" content="noindex/);
  assert.equal(release.replace('<meta name="robots" content="noindex,nofollow">\\n',''),legacy);
 }else{
  assert.doesNotMatch(legacy,/integration-shell-live\.js|integration-turquoise-v2\.css/);
 }
});
test('live router is native and NOT staging hash shim',()=>{
 assert.doesNotMatch(shell,/history\[method\]|previewFile|#'\+path/);
 assert.doesNotMatch(shell,/setInterval\(/);
 assert.match(staging,/history\[method\]=function/);
 assert.match(shell,/window\.addEventListener\('popstate',sync\)/);
 assert.match(shell,/window\.addEventListener\('hashchange',sync\)/);
 assert.match(shell,/\.navbtn\.active\[data-v\]/);
 assert.match(shell,/insertBefore\(hero,appBody\)/);
 for(const path of ['/discover','/saved','/tracker','/dashboard']){
  assert.ok(routes.rewrites.some(r=>r.source===path&&r.destination==='/index.html'),'Missing '+path);
 }
});
test('styles handle late loaded app modules with responsive and accessible controls',()=>{
 assert.match(shell,/new MutationObserver\(lastSheet\)/);
 assert.match(shell,/head\.appendChild\(stylesheet\)/);
 assert.match(shell,/aria-expanded/);
 assert.match(shell,/Escape/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/\.cloudAuthCard/);
 assert.match(css,/\.focusCard/);
});
test('public rollout does not change cron or account backend semantics',()=>{
 for(const job of ['/api/discover','/api/worldwide-discover','/api/verify-worldwide','/api/daily-discovery-email']){
   assert.ok(routes.crons.some(c=>c.path===job),'Missing '+job);
 }
 assert.doesNotMatch(shell,/\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b|\bXMLHttpRequest\b/);
 assert.doesNotMatch(shell,/OpportunityCloud\.|\.submit\(|finishOnboard\(/);
 assert.doesNotMatch(release,/integration-shell-v2\.js/);
});
