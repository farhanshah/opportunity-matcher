import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('risk summary separates missing legacy fingerprints and unmatched opportunity links',()=>{
 const api=read('api/admin-health.js'),ui=read('admin-v1.js');
 for(const k of ['high_risk_without_fingerprint','high_risk_without_opportunity',
    'legacy_unfingerprinted_events','events_without_opportunity']){
   assert.ok(api.includes(k),'API missing '+k);
   if(k.includes('events')) assert.ok(ui.includes(k),'UI missing '+k);
 }
 assert.ok(api.includes("status='pending_review'"));
 assert.ok(api.includes('if (!authorised(req)) return res.status(401)'));
});
test('admin offers read-only filters for high risk, evidence gaps and all groups',()=>{
 const ui=read('admin-v1.js'),html=read('admin.html');
 for(const filter of ['high','gaps','all'])assert.ok(html.includes('data-filter="'+filter+'"'));
 assert.ok(ui.includes("reviewFilter:'high'"));
 assert.ok(ui.includes('selected.map(x=>'));
 assert.ok(ui.includes("x.status==='pending_review'&&x.risk_level==='high'"));
 assert.ok(ui.includes("original events"));
});
test('review cards display group evidence quality rather than asserting eligibility changed',()=>{
 const ui=read('admin-v1.js');
 assert.ok(ui.includes('legacy_unfingerprinted_events'));
 assert.ok(ui.includes('events_without_opportunity'));
 assert.ok(ui.includes('may include website menus or navigation'));
 assert.ok(ui.includes('Only independently supported facts can update the published record'));
 assert.ok(!ui.includes("status:'auto_accepted'"));
});
