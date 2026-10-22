import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index=read('index.html'),preview=read('nav-contrast-preview-v5.html');
const id=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]).sort();
const onclick=s=>[...s.matchAll(/\bonclick="([^"]+)"/g)].map(x=>x[1]).sort();
test('new navbar preserves actual application controls and routes',()=>{
 assert.deepEqual(id(index),id(preview));
 assert.deepEqual(onclick(index),onclick(preview));
 assert.match(preview,/site-nav-contrast-v5\.css/);
 assert.match(preview,/integration-shell-v5\.js/);
 assert.match(preview,/noindex,nofollow/);
 assert.match(index,/src="\/app-v07\.js" defer/);
 assert.doesNotMatch(read('integration-shell-v5.js'),/history\[method\]|\/api\/|fetch\(/);
});
test('dropdown supports desktop and phone with accessible interactions',()=>{
 const js=read('integration-shell-v5.js');
 const css=read('site-nav-contrast-v5.css');
 assert.match(js,/omLandingMenu/);
 assert.match(js,/aria-expanded/);
 assert.match(js,/Escape/);
 assert.match(js,/Explore ▾/);
 assert.match(css,/\.omLandingMenu/);
 assert.match(css,/omLandingMenuOpen/);
 assert.match(css,/\.heroActions \.btnGhost/);
 assert.match(css,/@media\(max-width:900px\)/);
});
test('companion page CSS is scoped to admin, prepare and privacy',()=>{
 const css=read('secondary-turquoise-v5.css');
 for(const page of ['admin','prepare','privacy'])assert.match(css,new RegExp('data-page="'+page+'"'));
 assert.match(css,/color:#eaf8f4/);
});
