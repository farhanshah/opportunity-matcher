import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('verified vacancies and light-background guide headings remain readable in every theme',()=>{
 const css=read('site-nav-contrast-v5.css'),html=read('index.html');
 assert.match(css,/#verified-openings \.verifiedOpenHead h2,[\s\S]*?color:#123d3a!important/);
 assert.match(css,/\.guideSection \.guideHeader h2\{\s*color:#123b3b!important/);
 assert.match(css,/\.guideSection \.guideHeader p\{\s*color:#37645d!important/);
 assert.match(css,/\.guideSection\{\s*background:#f7fcfa!important/);
 assert.match(html,/site-nav-contrast-v5\.css\?v=11/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/\.omThemeMode\{\s*display:none!important/);
 assert.match(css,/\.verifiedOpenCard \.verifiedOpenLink\{/);
});
test('historical catalogue cannot be confused with verified exact openings',()=>{
 const html=read('index.html');
 const js=read('public-ux-v1.js');
 const freshness=read('app-v155-freshness-truth-v286.js');
 assert.match(html,/Programme catalogue · historical leads/);
 assert.match(html,/separate from the individually verified vacancies above/);
 assert.match(html,/DEMO · NOT LIVE/);
 assert.doesNotMatch(html,/Deadline in 22 days/);
 assert.match(js,/1 call/);
 assert.match(js,/omHistoricalNotice/);
 assert.match(js,/historical programme information/i);
 assert.match(freshness,/separate from the individually verified vacancy postings above/);
 assert.doesNotMatch(js,/INSERT INTO opportunities|UPDATE opportunities/);
});
test('official source popovers open near selected chip, close explicitly and handle live page-monitor data safely',()=>{
 const js=read('source-chips-v1.js'),css=read('site-nav-contrast-v5.css');
 assert.match(js,/getBoundingClientRect/);
 assert.match(js,/omSourceClose/);
 assert.match(js,/api\/source-highlights/);
 assert.match(js,/Last successful check:/);
 assert.match(js,/attention_needed/);
 assert.match(css,/\.omSourcePopover \.omSourceClose/);
 assert.match(css,/\.omSourcePopover \.omSourceMonitoring/);
 assert.doesNotMatch(js,/currently accepting applications|verified eligible/i);
});
test('source-monitor API only reports whitelisted public monitoring facts and preserves failed fetches',()=>{
 const source=read('api/source-highlights.js');
 const runnable=source.replace("import {db} from '../lib/db.js';",'')
   .replace('export function summarizeSourceHealth','function summarizeSourceHealth')
   .replace('export default async function handler','async function handler');
 const summarize=new Function(runnable+';return summarizeSourceHealth;')();
 const recent=new Date('2026-10-30T10:00:00Z');
 const statuses=summarize([
  {source_key:'chevening_timeline',is_active:true,has_error:false,last_http_status:200,last_success_at:'2026-10-29T11:00:00Z'},
  {source_key:'clarendon',is_active:true,has_error:true,last_http_status:403,last_success_at:null},
  {source_key:'rotary_peace',is_active:true,has_error:true,last_http_status:429,last_success_at:'2026-08-28T03:00:00Z'}
 ],recent);
 assert.equal(statuses.chevening.status,'monitored');
 assert.equal(statuses.chevening.successful_pages_7d,1);
 assert.equal(statuses.oxford.status,'attention_needed');
 assert.equal(statuses.rotary.status,'attention_needed');
 assert.equal(statuses.rotary.last_success_at,'2026-08-28T03:00:00.000Z');
 assert.ok(!JSON.stringify(statuses).includes('has_error'));
 assert.doesNotMatch(source,/INSERT INTO|UPDATE monitored_sources|DELETE FROM/i);
 assert.match(source,/Cache-Control/);
});
