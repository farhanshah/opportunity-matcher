import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('public homepage exposes one meaningful main landmark', () => {
  const html = read('index.html');
  assert.match(html, /<div id="landing" class="landing" role="main">/);
  assert.match(html, /<main class="appBody">/); // workspace retains its own landmark
});

test('official provider popover anchor remains crawlable before opening', () => {
  const js = read('source-chips-v1.js');
  assert.match(js, /link\.href\s*=\s*SOURCES\.chevening\.url/);
  assert.match(js, /link\.href\s*=\s*info\.url/);
  assert.match(js, /link\.target\s*=\s*'_blank'/);
});

test('carousel selects appropriately sized images on mobile', () => {
  const html = read('index.html');
  const images = [...html.matchAll(/<img\b[^>]*src="https:\/\/images\.unsplash\.com\/[^"]+"[^>]*>/g)]
    .map(([tag]) => tag);
  assert.equal(images.length, 7);
  for (const image of images) {
    assert.match(image, /srcset="[^"]+420w, [^"]+720w, [^"]+1100w"/);
    assert.match(image, /sizes="\(max-width:700px\) 88vw/);
    assert.match(image, /loading="(?:eager|lazy)"/);
  }
  assert.equal(images.filter(x => /fetchpriority="high"/.test(x)).length, 1);
});

test('landing contrast is increased without altering workspace themes', () => {
  const css = read('orbital-v2.css');
  assert.match(css, /#landing \.footer \.brandword small\{color:#c6f6e7!important/);
  assert.match(css, /#landing \.footer \.footerLinks span\{color:#daf7ed!important/);
  assert.doesNotMatch(css, /@import url\('https:\/\/fonts\.googleapis\.com\/css2/);
});

test('public landing avoids expensive text measuring for every node', () => {
  const js = read('app-v92-readability.js');
  assert.doesNotMatch(js, /\['landing','app','prepModal'/);
  assert.match(js, /\/\* Public site readability \*\//);
});

test('AdSense ownership is unchanged on the homepage', () => {
  const html = read('index.html');
  assert.match(html, /name="google-adsense-account" content="ca-pub-1916126969266611"/);
  assert.match(html, /pagead\/js\/adsbygoogle\.js\?client=ca-pub-1916126969266611/);
});

test('public homepage is painted before account and tracker modules finish booting', () => {
  const js = read('app-v07.js');
  const reveal = js.indexOf("document.documentElement.classList.add('omBootReady')");
  const awaitAll = js.indexOf('await Promise.all(files.map');
  assert.ok(reveal > 0 && awaitAll > reveal,
    'first public paint must not wait for the workspace script waterfall');
  assert.match(js, /const isPublicHome=location\.pathname==='\/'/);
  assert.match(js, /earlyOpenOnboard=\(\.\.\.args\)=>\{queuedOnboard\.push\(args\);startPublicWorkspace\('passport'\)\}/);
  assert.match(js, /window\.openOnboard\(\.\.\.queuedOnboard\[queuedOnboard\.length-1\]\)/);
});

test('non-essential homepage CSS is deferred without losing no-script fallbacks', () => {
  const html=read('index.html');
  for(const name of ['public-v264.css','homepage-trust-v1.css?v=1','seo-clusters.css']) {
    const tag=`<link rel="stylesheet" href="/${name}" media="print" onload="this.media='all'">`;
    const fallback=`<noscript><link rel="stylesheet" href="/${name}"></noscript>`;
    assert.ok(html.includes(tag), name+' is still render blocking');
    assert.ok(html.includes(fallback), name+' must work without JavaScript');
  }
});
test('carousel gives priority only to the hero image and uses smaller source quality', () => {
  const html=read('index.html');
  const images=[...html.matchAll(/<img\b[^>]*src="https:\/\/images\.unsplash\.com\/[^"]+"[^>]*>/g)].map(m=>m[0]);
  assert.equal(images.length,7);
  assert.equal(images.filter(x=>x.includes('fetchpriority="high"')).length,1);
  assert.equal(images.filter(x=>x.includes('fetchpriority="low"')).length,6);
  for(const tag of images)assert.doesNotMatch(tag,/q=80/);
});

test('public workspace background fetches are low priority and its execution yields', () => {
  const js=read('app-v07.js');
  assert.match(js,/priority:isPublicHome\?'low':'auto'/);
  assert.match(js,/cache:'default'/);
  assert.match(js,/\(i\+1\)%3===0\|\|performance\.now\(\)-taskStarted>=12/);
  assert.match(js,/typeof window\.scheduler\?\.yield==='function'/);
  assert.match(js,/await yieldToMain\(\)/);
  assert.match(js,/requestAnimationFrame\(\(\)=>setTimeout\(resolve,0\)\)/);
  assert.match(js,/for\(let i=0;i<files.length;i\+\+\)/);
});

test('Passport clicks cannot bypass the account gate during yielded boot', () => {
  const js=read('app-v07.js');
  assert.match(js,/document\.addEventListener\('click',guardEarlyPassportClick,true\)/);
  assert.match(js,/event\.stopImmediatePropagation\(\)/);
  assert.match(js,/document\.removeEventListener\('click',guardEarlyPassportClick,true\)/);
  assert.ok(js.indexOf('bootstrapComplete=true')>js.indexOf('document.body.appendChild(s)'));
});

test('auth return routes preserve immediate boot and no workspace module is omitted', () => {
  const js=read('app-v07.js');
  assert.ok(js.includes("const isPublicHome=location.pathname==='/' && !/[?&](?:token|code|state|linkedin_connect|error)=/i.test(location.search);"));
  const start=js.indexOf('const files=['),end=js.indexOf('  ];',start);
  assert.ok(start>=0&&end>start);
  const manifest=js.slice(start,end);
  assert.ok((manifest.match(/'\/app-[^']+\.js'/g)||[]).length>=95,'workspace manifest unexpectedly shortened');
  assert.ok(manifest.includes("'/app-account-gate-v1.js'"),'account gate must remain the final loader module');
});

test('script evaluations stay sequential, with a normal timeout fallback', () => {
  const js=read('app-v07.js');
  assert.match(js,/for\(let i=0;i<files\.length;i\+\+\)/);
  const execute=js.indexOf('document.body.appendChild(s)',js.indexOf('const yieldToMain'));
  const yieldLater=js.indexOf('await yieldToMain()',execute);
  assert.ok(execute>=0&&yieldLater>execute);
  assert.match(js,/new Promise\(resolve=>setTimeout\(resolve,0\)\)/);
  assert.match(js,/if\(isPublicHome&&i\+1<files\.length/);
});


test('public homepage does not start the whole workspace until intent or settle', () => {
  const js=read('app-v07.js');
  assert.match(js,/publicBootGate=new Promise\(resolve=>/);
  assert.match(js,/await publicBootGate/);
  assert.match(js,/window\.OpportunityStartWorkspace=startPublicWorkspace/);
  assert.match(js,/startPublicWorkspace\('featured'\)/);
  assert.match(js,/startPublicWorkspace\('passport'\)/);
  assert.match(js,/setTimeout\(\(\)=>startPublicWorkspace\('fallback'\),9500\)/);
  assert.match(js,/document\.addEventListener\('click',guardEarlyPassportClick,true\)/);
});

test('public Sign in is available without waiting for Neon Auth and is rebound securely', () => {
  const html=read('index.html');
  assert.match(html,/<button id="cloudLandingAuth" class="cloudNavAuth" type="button" onclick="window\.OpportunityStartWorkspace\?\.\('signin'\)">Sign in<\/button>/);
  const cloud=read('app-cloud-v13.js');
  assert.match(cloud,/let b=document\.getElementById\('cloudLandingAuth'\)/);
  assert.match(cloud,/b\.onclick=\(\)=>openAuth\(\)/);
  assert.match(cloud,/window\.dispatchEvent\(new Event\('opportunity:cloudready'\)\)/);
  assert.match(read('app-v07.js'),/if\(pendingSignIn\)window\.OpportunityCloud\?\.openAuth\?\.\(\)/);
});

test('public counts use live endpoints and cannot fabricate a missing count', () => {
  const html=read('index.html');
  assert.match(html,/<script src="\/public-home-lite\.js\?v=1" defer><\/script>/);
  const publicJs=read('public-home-lite.js');
  for(const endpoint of ['/api/health','/api/source-listings?limit=72','/api/open-calls'])
    assert.ok(publicJs.includes(endpoint),endpoint+' is not queried');
  assert.match(publicJs,/if\(!\['string','number'\]\.includes\(typeof v\)/);
  assert.doesNotMatch(publicJs,/Math\.random\(\)/);
  assert.match(html,/ca-pub-1916126969266611/);
});
