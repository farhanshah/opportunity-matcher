import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const live=get('index.html'),first=get('integration-preview.html'),
 current=get('integration-preview-v2.html'),css=get('integration-turquoise-v2.css'),
 bridge=get('integration-shell-v2.js');
const ids=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]).sort();
const handlers=s=>[...s.matchAll(/\bonclick="([^"]+)"/g)].map(x=>x[1]).sort();
const scriptLinks=s=>[...s.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(x=>x[1]);
test('v2 carries every live DOM ID, handler, original loader and integration guards',()=>{
 assert.deepEqual(ids(current),ids(live));
 assert.deepEqual(handlers(current),handlers(live));
 assert.deepEqual(scriptLinks(current),['/app-v07.js','/integration-shell-v2.js']);
 assert.match(current,/noindex,nofollow/);
 assert.match(current,/Use a test account|Test with a separate account/);
 assert.match(current,/can change your actual data/);
 assert.doesNotMatch(live,/integration-shell-v2|integration-turquoise-v2|omBridgeHero/);
 assert.doesNotMatch(current,/<link rel="canonical"/);
});
test('redesign is a new preview route and does not switch production',()=>{
 assert.match(current,/CONNECTED REDESIGN · VERSION 2/);
 assert.match(current,/integration-turquoise.css\?v=1/);
 assert.match(current,/integration-turquoise-v2.css\?v=2/);
 assert.match(current,/app-v07.js" defer/);
 assert.match(first,/CONNECTED DESIGN CANDIDATE/);
 assert.match(current,/href="\/">Current public site/);
});
test('v2 introduces a structural hero for every actual application view',()=>{
 assert.match(bridge,/insertBefore\(hero,appBody\)/);
 assert.match(bridge,/dashboard:/);
 assert.match(bridge,/tracker:/);
 assert.match(bridge,/saved:/);
 assert.match(bridge,/discover:/);
 assert.match(bridge,/validView/);
 assert.match(bridge,/MutationObserver\(sync\)/);
 assert.match(bridge,/window.addEventListener\('popstate',sync\)/);
 assert.match(bridge,/window.addEventListener\('hashchange',sync\)/);
 assert.match(css,/\.omBridgeHero\{/);
 assert.match(css,/\.omBridgeTitle\{/);
 assert.match(css,/\.omBridgeArt/);
});
test('new palette covers real tracker focus mode, board mode and account modal',()=>{
 for(const name of ['.focusCard{','.focusSummaryHero,','.focusSummaryStat b,',
   '.focusAction,','.focusTasks{','.trackerBoardV11{','.boardColumnV11{',
   '.cloudModal .cloudAuthCard{','.cloudModal .cloudAccountActions button{',
   '.cloudModal .cloudBigAvatar{','.cloudModal .cloudStatusBox{']){
    assert.ok(css.includes(name),name+' styling not found');
 }
 assert.match(css,/#51e7d6/);
 assert.match(css,/background:#fff!important/);
 assert.match(css,/background:#edf6f2!important/);
 assert.match(css,/\.cloudVerifyNotice/);
 assert.match(css,/\.navbtn\.active/);
});
test('module stylesheet order is controlled only within staging candidate',()=>{
 assert.match(bridge,/document\.querySelector\('link\[href\^="\/integration-turquoise-v2\.css"\]'\)/);
 assert.match(bridge,/MutationObserver\(lastSheet\)/);
 assert.match(bridge,/head\.appendChild\(stylesheet\)/);
 assert.doesNotMatch(bridge,/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\b/);
 assert.doesNotMatch(bridge,/\blocalStorage\.[a-zA-Z]+|sessionStorage\.[a-zA-Z]+/);
 assert.doesNotMatch(bridge,/window\.setView\s*=|window\.renderTracker\s*=/);
});
test('responsive sidebar retains real nav controls with keyboard and motion safeguards',()=>{
 assert.match(bridge,/\.navbtn/);
 assert.match(bridge,/aria-expanded/);
 assert.match(bridge,/Escape/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/\.omMobileScrim/);
 assert.match(bridge,/scrim\.hidden=true/);
 assert.match(bridge,/addEventListener\('click',shut\)/);
});
