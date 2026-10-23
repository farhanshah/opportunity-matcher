import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getRecoveryLink,OFFICIAL_RECOVERY_LINKS} from '../lib/official-recovery-links.js';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('monitor and discovery defer repeatedly inaccessible official hosts without faking success',()=>{
 const mon=get('api/monitor.js'),dis=get('api/discover.js');
 for(const s of ['last_http_status=403','last_http_status=429','last_http_status=503']){
  assert.ok(mon.includes(s),'monitor host breaker lacks '+s);
  assert.ok(dis.includes(s),'discovery host breaker lacks '+s);
 }
 for(const threshold of ['>= 2','>= 3'])assert.ok(mon.includes(threshold));
 assert.ok(mon.includes('AND NOT EXISTS ('));
 assert.ok(dis.includes('AND NOT EXISTS ('));
 assert.ok(mon.includes('last_error='),'Failures must remain visible');
 assert.ok(dis.includes('new_published='),'Publication proof unchanged');
});
test('official alternate links are investigative only and not silently trusted',()=>{
 const vals=Object.values(OFFICIAL_RECOVERY_LINKS);
 assert.ok(vals.length>=7);
 assert.ok(vals.every(u=>new URL(u).protocol==='https:'));
 assert.equal(getRecoveryLink('untrusted-provider'),null);
 const api=get('api/admin-health.js'),js=get('admin-v1.js');
 assert.ok(api.includes('getRecoveryLink(source.source_key)'));
 assert.ok(js.includes('x.recovery_url'));
 assert.ok(js.includes('not automatically used to verify eligibility'));
 assert.ok(!get('api/monitor.js').includes('getRecoveryLink'),'Do not mix provider bodies under one snapshot source');
});
