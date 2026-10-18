import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('workspace-preview.html'),css=read('workspace-preview.css'),
 script=read('workspace-preview.js'),home=read('design-preview.html'),
 discover=read('discover-preview.html'),passport=read('passport-preview.html'),
 live=read('index.html');
const model=vm.runInNewContext(script+'\nWorkspacePreviewModel',{});

test('workspace preview is isolated from account data, production and public search indexing',()=>{
 assert.match(html,/<meta name="robots" content="noindex,nofollow"/);
 assert.match(html,/DESIGN CONCEPT 04/);
 assert.match(html,/Sample records only/);
 assert.match(html,/not your real saved opportunities/);
 assert.match(html,/Changes reset when you leave or reload this page/);
 assert.match(live,/<div id="app" class="app hide">/);
 assert.doesNotMatch(live,/workspace-preview/);
 assert.doesNotMatch(script,/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/);
 assert.doesNotMatch(script,/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\b/);
 assert.doesNotMatch(script,/OpportunityState|supabase|neon/);
});
test('Dashboard, Saved and Tracker have working structural controls and accessible navigation',()=>{
 for(const id of ['dashboardView','savedView','trackerView','sidebar','openMenu','closeMenu',
   'pageHeading','statSaved','statTracked','statSubmitted','statTasks','priorityActions',
   'savedSearch','savedType','savedCards','savedEmpty','clearSavedSearch',
   'trackerFilter','trackerBoard','checklistSummary','resetDemo','sideScrim']){
   assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
 }
 for(const view of ['dashboard','saved','tracker']){
   assert.match(html,new RegExp('href="#'+view+'"'));
   assert.match(html,new RegExp('data-view="'+view+'"'));
   assert.match(html,new RegExp('data-panel="'+view+'"'));
 }
 assert.match(script,/hashchange/);
 assert.match(script,/aria-current/);
 assert.match(script,/aria-expanded/);
 assert.match(script,/Escape/);
});
test('sample totals reflect five distinct fictional records',()=>{
 const records=model.copy(),totals=model.stats(records);
 assert.equal(records.length,5);
 assert.equal(totals.saved,4);
 assert.equal(totals.tracked,5);
 assert.equal(totals.submitted,3);
 assert.equal(totals.tasks,9);
 assert.equal(totals.totalTasks,15);
 assert.ok(records.every(r=>/example|sample|illustrative|fictional/i.test(r.title)));
 assert.ok(records.every(r=>/example|sample|fictional|illustrative/i.test(r.provider)));
});
test('saving and unsaving demo records changes totals but does not persist',()=>{
 const records=model.copy(),before=model.stats(records).saved;
 assert.equal(model.setSaved(records,'demo-scholarship',false),true);
 assert.equal(model.stats(records).saved,before-1);
 assert.equal(model.savedMatches(records,'graduate').length,0);
 assert.equal(model.setSaved(records,'demo-scholarship',true),true);
 assert.equal(model.savedMatches(records,'graduate','Scholarship').length,1);
 assert.equal(model.savedMatches(records,'graduate','Internship').length,0);
 assert.equal(model.setSaved(records,'wrong',true),false);
 assert.equal(model.stats(model.copy()).saved,before);
});
test('application stage changes propagate to lanes, submitted counts and outcomes',()=>{
 const records=model.copy();
 assert.equal(model.countByLane(records,'Planning'),1);
 assert.equal(model.countByLane(records,'Preparing'),1);
 assert.equal(model.countByLane(records,'Submitted'),2);
 assert.equal(model.countByLane(records,'Outcome'),1);
 assert.equal(model.setStage(records,'demo-fellowship','Submitted'),true);
 assert.equal(model.stats(records).submitted,4);
 assert.equal(model.countByLane(records,'Submitted'),3);
 assert.equal(model.filterTracker(records,'Submitted').length,3);
 assert.equal(model.filterTracker(records,'Outcome').length,1);
 assert.equal(model.setStage(records,'demo-fellowship','Fake provider stage'),false);
 assert.equal(model.byId(records,'demo-fellowship').stage,'Submitted');
});
test('documents, statements and reference checklist is editable on example state only',()=>{
 const records=model.copy(),before=model.stats(records).tasks;
 assert.equal(model.setTask(records,'demo-fellowship','Documents',true),true);
 assert.equal(model.taskCount(model.byId(records,'demo-fellowship')),1);
 assert.equal(model.stats(records).tasks,before+1);
 assert.equal(model.setTask(records,'demo-fellowship','Unknown task',true),false);
 assert.equal(model.setTask(records,'unknown','Documents',true),false);
 assert.equal(model.stats(model.copy()).tasks,before);
});
test('text is escaped, no fictional applications presented as authenticated facts',()=>{
 assert.equal(model.esc('<img src=x onerror="alert(1)">'),
  '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
 assert.match(html,/fictional examples/);
 assert.match(html,/not your real saved opportunities, eligibility results or applications/);
 assert.match(html,/This prototype does not prepare or submit applications/);
 assert.match(html,/nothing is read from or written to your account/i);
 assert.match(html,/href="\/"/);
});
test('responsive turquoise preview is connected to all approved design concepts',()=>{
 assert.match(css,/--aqua:#51e7d6/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(home,/href="\/workspace-preview.html#dashboard"/);
 assert.match(home,/href="\/workspace-preview.html#tracker"/);
 assert.match(discover,/href="\/workspace-preview.html#dashboard"/);
 assert.match(passport,/href="\/workspace-preview.html#dashboard"/);
 assert.match(html,/href="\/discover-preview.html"/);
 assert.match(html,/href="\/passport-preview.html"/);
 assert.match(html,/href="\/design-preview.html"/);
});
