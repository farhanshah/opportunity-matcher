import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const original=read('index.html');
const candidate=read('integration-preview.html');
const css=read('integration-turquoise.css');
const scripts=read('app-v07.js');
const vercel=JSON.parse(read('vercel.json'));
const ids=html=>[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]).sort();
const functions=html=>[...html.matchAll(/\bonclick="([^"]+)"/g)].map(x=>x[1]).sort();
const jsSources=html=>[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(x=>x[1]).sort();

test('connected candidate preserves every live application DOM ID and inline action',()=>{
  assert.deepEqual(ids(candidate),ids(original));
  assert.deepEqual(functions(candidate),functions(original));
  assert.ok(jsSources(original).includes('/app-v07.js'));
  assert.ok(jsSources(original).some(x=>x==='/integration-shell-live.js'||x==='/integration-shell-mobile-v3.js'));
  assert.deepEqual(jsSources(candidate),['/app-v07.js']);
  for(const key of ['landing','app','onboard','detail','oppGrid','savedGrid','trackCards',
    'dashGrid','featuredGrid','statOpps','statSources','statOpen']){
    assert.match(candidate,new RegExp('id="'+key+'"'));
  }
});
test('candidate isolates visual changes; current production homepage and app scripts are untouched',()=>{
  assert.doesNotMatch(original,/CONNECTED DESIGN CANDIDATE/);
  assert.match(original,/integration-turquoise\.css/);
  assert.match(candidate,/class="omTurquoisePreview"/);
  assert.match(candidate,/integration-turquoise\.css\?v=1/);
  assert.match(candidate,/styles-v07\.css/);
  assert.match(candidate,/feature-polish-v08\.css/);
  assert.match(candidate,/public-v264\.css/);
  assert.match(original,/src="\/app-v07\.js" defer/);
  assert.match(candidate,/src="\/app-v07\.js" defer/);
  assert.match(scripts,/app-v116-passport-cloud-canonical\.js/);
  assert.match(scripts,/app-v08-tracker\.js/);
  assert.match(scripts,/app-v08-match\.js/);
  assert.match(scripts,/app-v08-views\.js/);
});
test('integration candidate cannot be indexed or compete with canonical public pages',()=>{
  assert.match(candidate,/<meta name="robots" content="noindex,nofollow"/);
  assert.equal((candidate.match(/<meta name="description"/g)||[]).length,1);
  assert.doesNotMatch(candidate,/<link rel="canonical"/);
  assert.match(candidate,/CONNECTED DESIGN CANDIDATE/);
  assert.match(candidate,/not the live public homepage/);
  assert.match(candidate,/Current public site/);
  assert.match(candidate,/Use a test account/);
  assert.match(candidate,/can change your real data/);
});
test('candidate production routes and existing automation schedules are unchanged',()=>{
  const expected=['/discover','/saved','/tracker','/dashboard'];
  for(const name of expected){
    assert.ok(vercel.rewrites.some(r=>r.source===name&&r.destination==='/index.html'),
      'Existing '+name+' production route changed');
  }
  for(const path of ['/api/worldwide-discover','/api/verify-worldwide',
    '/api/discover','/api/daily-discovery-email']){
    assert.ok(vercel.crons.some(x=>x.path===path),'Missing automation '+path);
  }
  assert.match(candidate,/href="\/blog\/"/);
  assert.match(candidate,/href="\/privacy"/);
});
test('turquoise design system covers actual live hero, app shell, Passport and cards',()=>{
  assert.match(css,/--lime:#51e7d6/);
  assert.match(css,/--om-violet:#0b9d90/);
  assert.match(css,/--om-lime:#51e7d6/);
  assert.match(css,/\.omTurquoisePreview #landing \.heroWrap/);
  assert.match(css,/\.omTurquoisePreview #landing \.heroWrap>\.nav/);
  assert.match(css,/\.omTurquoisePreview \.app \.side/);
  assert.match(css,/\.omTurquoisePreview \.app \.appTop/);
  assert.match(css,/\.omTurquoisePreview \.app \.oppCard/);
  assert.match(css,/\.omTurquoisePreview #onboard \.modalBox/);
  assert.match(css,/\.omTurquoisePreview #onboard \.passportSubmit/);
});
test('responsive layouts, keyboard focus and reduced-motion support are defined',()=>{
  assert.match(css,/@media\(max-width:790px\)/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/:focus-visible/);
  assert.match(candidate,/role="note"/);
  assert.ok(css.length<18000,'Integration CSS exceeds the modest styling budget');
  assert.equal(jsSources(candidate).length,1,'Integration must not add a second app loader');
});
test('connected candidate contains no fictional records or modified backend endpoints',()=>{
  assert.doesNotMatch(candidate,/demo-scholarship|demo-fellowship|example award committee/i);
  assert.doesNotMatch(candidate,/workspace-preview\.js|discover-preview\.js|passport-preview\.js/);
  assert.doesNotMatch(candidate,/\bfetch\(['"]\/api\/[^'"]+['"],\s*\{\s*method:\s*['"]POST/i);
});
