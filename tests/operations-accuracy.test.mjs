import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('operations source summary uses last seven days rather than next-check due interval',()=>{
 const api=load('api/admin-health.js'),js=load('admin-v1.js');
 assert.ok(api.includes('AS successful_monitors_7d'));
 assert.ok(js.includes('s.successful_monitors_7d'));
 assert.ok(js.includes('s.cooling_down_monitors'));
 assert.ok(js.includes('eligible for retry now'));
 assert.ok(api.includes('AS cooling_down_monitors'));
 assert.ok(api.includes('AS blocked_monitors'));
 assert.ok(!js.includes('active · healthy now'));
});
test('distinct verification freshness metrics reach the admin dashboard',()=>{
 const api=load('api/admin-health.js'),js=load('admin-v1.js'),html=load('admin.html');
 for(const x of ['verified_records_30d','verified_routes_30d','verified_rules_30d']){assert.ok(api.includes(x));assert.ok(js.includes(x));}
 for(const x of ['freshProgrammeCount','freshRoutesCount','freshRulesCount']){assert.ok(html.includes(x));assert.ok(js.includes(x));}
 assert.ok(html.includes('separate from normalization'));
});
test('the source change events remain protected and unchanged',()=>{
 const api=load('api/admin-health.js');
 assert.ok(api.includes("status='pending_review'"));
 assert.ok(api.includes('if (!authorised(req)) return res.status(401)'));
});
test('historical profile fits do not unfairly blame Passport filters',()=>{
 const js=load('app-v10-post.js');
 assert.ok(js.includes('No currently verified strong matches yet.'));
 assert.ok(js.includes('current provider eligibility and deadlines still need verification'));
});