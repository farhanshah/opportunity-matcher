import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {resolveOfficialRedirect} from '../lib/verification-redirects.js';
const authority='https://careers.cern/summer';
test('follows legitimate same-host slash redirect without canonical loop',()=>{
  assert.equal(resolveOfficialRedirect('/summer/',authority,authority),'https://careers.cern/summer/');
  assert.notEqual(resolveOfficialRedirect('/summer/',authority,authority),authority);
  assert.equal(resolveOfficialRedirect('/summer/?view=latest#section',authority,authority),
    'https://careers.cern/summer/?view=latest');
});
test('redirects to another host or insecure transport are blocked',()=>{
  for(const url of ['https://other.cern/summer','https://careers.cern.attacker.example/summer',
    'http://careers.cern/summer','https://user:pass@careers.cern/summer',
    'https://127.0.0.1/private','//evil.example/x','']) {
    assert.throws(()=>resolveOfficialRedirect(url,authority,authority),/Official host redirect invalid/);
  }
});
test('re-verify worker uses security-checked redirect without changing evidence gate',()=>{
  const code=readFileSync(new URL('../api/reverify.js',import.meta.url),'utf8');
  assert.ok(code.includes("resolveOfficialRedirect(r.headers.get('location'),current,original)"));
  assert.ok(code.includes('verifyCandidate(page.html,page.url,opp.provider)'));
  assert.ok(code.includes('if(!report.verified)'));
  assert.ok(code.includes("last_verified_at=now()"));
});
test('stale profile fit is not labelled strong or verified',()=>{
  const source=readFileSync(new URL('../app-v156-stale-fit-v287.js',import.meta.url),'utf8');
  const sandbox={window:{
    evaluate:()=>({label:'Strong match',cls:'eligible',rank:4,passes:5,checks:[]}),
    renderAll:()=>{}
  }};
  vm.runInNewContext(source,sandbox);
  const fresh=sandbox.window.evaluate({Verification_Stale:false,Last_Verified:new Date().toISOString()});
  assert.equal(fresh.label,'Strong match');
  const stale=sandbox.window.evaluate({Verification_Stale:true});
  assert.equal(stale.label,'Profile fit · verify source');
  assert.equal(stale.cls,'possible');
  assert.equal(stale.rank,3);
  assert.equal(stale.verifiedEligibility,false);
  assert.equal(stale.passes,5);
});
