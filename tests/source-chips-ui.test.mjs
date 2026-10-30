import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('public source chips use eight distinct accessible controls and load their controller',()=>{
 const html=load('index.html'),js=load('source-chips-v1.js');
 const names=[...html.matchAll(/<button type="button" class="omSourceChip" data-source="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(names,['chevening','worldbank','erasmus','oxford','rhodes','rotary','swedish','daad']);
 assert.match(html,/source-chips-v1\.js\?v=2/);
 for(const key of names)assert.match(js,new RegExp("  "+key+":\\{name:"));
 assert.match(js,/aria-controls/);assert.match(js,/aria-expanded/);
 assert.match(js,/aria-haspopup/);assert.match(js,/pointerenter/);
 assert.match(js,/pointerdown/);assert.match(js,/focusin/);
 assert.match(js,/Escape/);
 assert.match(js,/noopener noreferrer/);
 assert.match(js,/api\/source-highlights/);
 assert.match(js,/omSourceClose/);
 assert.doesNotMatch(js,/applications? are open|guaranteed/i);
});
test('source detail popover opens on tap, follows source identity, closes outside and on Escape',()=>{
 const src=load('source-chips-v1.js');
 const chips=['chevening','worldbank','erasmus','oxford','rhodes','rotary','swedish','daad'].map(key=>{
   const listeners={};
   return {dataset:{source:key},attrs:{},listeners,setAttribute(k,v){this.attrs[k]=v},
     addEventListener(k,fn){listeners[k]=fn},contains(node){return node===this},
     matches(){return false},focus(){this.focused=true}};
 });
 const strip={querySelectorAll:()=>chips};
 const created=[];
 const make=(tag)=>{
   const listeners={};
   const x={tag,listeners,attrs:{},children:[],hidden:false,style:{},
     setAttribute(k,v){this.attrs[k]=v},append(...children){this.children.push(...children)},
     addEventListener(k,fn){listeners[k]=fn},
     contains(node){return this===node||this.children.includes(node)},matches(){return false}};
   created.push(x);return x;
 };
 const docListeners={},winListeners={},body={appendChild(node){this.child=node}};
 const document={body,querySelector:()=>strip,createElement:make,
   addEventListener(k,fn){docListeners[k]=fn}};
 const window={matchMedia:()=>({matches:false}),addEventListener(k,fn){winListeners[k]=fn},
   clearTimeout(){},setTimeout(){return 1},innerWidth:390,innerHeight:820};
 new Function('document','window',src)(document,window);
 const pop=body.child;
 const click={preventDefault(){}};
 assert.equal(pop.hidden,true);
 chips[0].listeners.click(click);
 assert.equal(pop.hidden,false);
 assert.equal(chips[0].attrs['aria-expanded'],'true');
 assert.equal(pop.children[0].textContent,'Chevening');
 assert.match(pop.children[4].href,/chevening\.org/);
 chips[1].listeners.click(click);
 assert.equal(chips[0].attrs['aria-expanded'],'false');
 assert.equal(pop.children[0].textContent,'World Bank');
 docListeners.pointerdown({target:{}});
 assert.equal(pop.hidden,true);
 chips[7].listeners.click(click);
 docListeners.keydown({key:'Escape',preventDefault(){}});
 assert.equal(pop.hidden,true);
 assert.equal(chips[7].focused,true);
});
test('mobile alignment, tooltip contrast and closed status cards remain readable',()=>{
 const css=load('site-nav-contrast-v5.css'),html=load('index.html');
 assert.match(css,/v9 public-mobile readability/);
 assert.match(css,/\.accountFirstHint\s*\{/);
 assert.match(css,/color:#d9f4ed!important/);
 assert.match(css,/\.omSourcePopover\[hidden\]/);
 assert.match(css,/\.omLandingMenuOpen>\.navlinks[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.enginePanel \.changeHead/);
 assert.match(css,/\.enginePanel \.risk/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(html,/class="accountFirstHint" style=/);
});
