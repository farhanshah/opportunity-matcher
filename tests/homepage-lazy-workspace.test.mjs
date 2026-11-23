import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const get = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('public homepage paints immediately instead of behind the boot splash', () => {
  const html = get('index.html');
  const head = html.slice(0, html.indexOf('</head>'));
  const flag = head.indexOf("classList.add('omPublicPaint')");
  assert.ok(flag > 0, 'omPublicPaint flag missing');
  assert.ok(flag < head.indexOf('rel="stylesheet"'), 'flag must be set before stylesheets load');
  assert.match(head, /\(\?:token\|code\|state\|linkedin_connect\|error\)=/, 'auth callbacks keep the splash');
  assert.match(head, /html\.omPublicPaint:not\(\.omBootReady\) body>#landing\{visibility:visible!important;opacity:1!important\}/);
});

test('workspace modules wait for the first input on a fresh public visit', () => {
  const js = get('app-v07.js');
  const wait = js.indexOf('if(isPublicHome&&!hasWorkspaceState)');
  const fetches = js.indexOf('const sources=await Promise.all(');
  assert.ok(wait > 0 && wait < fetches, 'interaction gate must precede module fetches');
  for (const type of ['pointerdown', 'touchstart', 'keydown']) assert.ok(js.includes(`'${type}'`), type);
  for (const key of ['oppProfileV8', 'oppProfileV6', 'oppTracksV6', 'oppExactTracksV1', 'opp_prepare_pending'])
    assert.ok(js.includes(key), 'returning-user key ' + key);
  // The early CTA guard must be installed before waiting, so a first click is queued and replayed.
  assert.ok(js.indexOf("document.addEventListener('click',guardEarlyPassportClick,true)") < wait);
});

test('hero figures load without the workspace, from the same endpoints', () => {
  const html = get('index.html');
  assert.match(html, /<script src="\/home-stats-v1\.js\?v=\d+" defer><\/script>/);
  const js = get('home-stats-v1.js');
  for (const url of ['/api/health', '/api/source-listings?limit=72', '/api/open-calls']) assert.ok(js.includes(url), url);
  for (const id of ['statOpps', 'statSources', 'statOpen', 'heroOpenCallsLabel', 'engOpps', 'engSources']) assert.ok(js.includes(id), id);
  assert.ok(!/innerHTML/.test(js), 'use textContent only');
});

test('hero entrance animation does not re-run after the landing has painted', () => {
  const css = get('homepage-trust-v1.css');
  assert.match(css, /html\[data-om-public-first-paint="true"\] \.hero \.heroCopy[^{]*\{animation:none!important;opacity:1!important/);
});
