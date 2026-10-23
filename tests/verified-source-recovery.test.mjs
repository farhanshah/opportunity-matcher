import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safeSuccessors} from '../lib/official-source-successors.js';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=JSON.parse(get('vercel.json'));
test('official alternatives are unique, scoped, and not direct database replacements',()=>{
 const rows=safeSuccessors();
 assert.equal(rows.length,5);
 assert.ok(rows.every(x=>x.source_url.startsWith('https://')&&x.expected_terms.length));
 assert.ok(rows.every(x=>x.original_key!==x.successor_key));
 assert.throws(()=>safeSuccessors([{original_key:'a',successor_key:'successor_bad',provider:'bad',source_url:'http://localhost',expected_terms:['test']}]));
});
test('successor cannot retire an original without new successful checked evidence',()=>{
 const code=get('api/reconcile-source-successors.js');
 for(const guard of ['last_error IS NULL','last_http_status IN (200,304)','last_success_at>=now()',
  'source_snapshots snap','snap.fetched_at>=now()','old.last_error IS NOT NULL','ON CONFLICT(source_key) DO NOTHING']){
  assert.ok(code.includes(guard),guard);
 }
 assert.ok(code.includes("source_type='superseded_official_page'"));
 assert.ok(!code.includes('SET last_verified_at=now()'));
 assert.ok(!code.includes("status='Open'"));
 assert.ok(code.includes('if(!authorized(req))'));
});
test('historic no-change triage demands exact same main body, safe provider allowlist, dates and retained evidence',()=>{
 const code=get('api/triage-nonmaterial.js');
 for(const snippet of ['community_college_initiative_pakistan','fulbright_pakistan',
  'regexp_count(before.raw_html','before.id<>after.id',"'dates'",
  "status='resolved_nonmaterial'",'review_note=','before.source_id=s.id']){
  assert.ok(code.includes(snippet),snippet);
 }
 assert.ok(!code.includes('DELETE FROM detected_changes'));
 assert.ok(!code.includes("last_verified_at=now()"));
 assert.ok(code.includes('if(!authorized(req))'));
});
test('automatic cron follows daily source monitor rather than overriding it',()=>{
 assert.equal(config.crons.find(c=>c.path==='/api/reconcile-source-successors')?.schedule,'5 2,14 * * *');
 assert.equal(config.crons.find(c=>c.path==='/api/triage-nonmaterial')?.schedule,'25 4 * * *');
});

test('successor snapshots preserve direct association with the original programme',async()=>{
 const {SOURCE_OPPORTUNITY_MAP}=await import('../lib/monitor.js');
 for(const [key,expected] of [
  ['successor_csp_irex','PRG-001'],
  ['successor_fulbright_global','PRG-009'],
  ['successor_yes_official','PRG-005'],
  ['successor_onebeat_direct','PRG-007']
 ])assert.equal(SOURCE_OPPORTUNITY_MAP[key],expected);
 const code=get('api/reconcile-source-successors.js');
 assert.ok(code.includes("old.source_type='superseded_official_page'"));
 assert.ok(code.includes('o.official_source_url=ready.old_url'));
 assert.ok(code.includes('o.external_id=ready.external_id'));
 assert.ok(!code.includes("SET last_verified_at=now()"));
});
