import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const v10=readFileSync(new URL('../app-v10-post.js',import.meta.url),'utf8');
const v287=readFileSync(new URL('../app-v156-stale-fit-v287.js',import.meta.url),'utf8');
const start=v10.indexOf('  const sourceNeedsRecheck=o=>{');
const end=v10.indexOf('  const likely=()=>',start);
assert.ok(start>=0&&end>start,'Renderer contains source freshness policy');
const snippet=v10.slice(start,end);
const makeDisplay=fn=>{
  const context={evaluate:fn,Date,Math,Number,String};
  vm.runInNewContext(snippet+';globalResult={sourceNeedsRecheck,displayMatch};',context);
  return context.globalResult;
};

const historical={Last_Verified:'2026-08-20',Verification_Stale:true};
const recent={Last_Verified:new Date().toISOString(),Verification_Stale:false};
const evaluate=o=>({label:'Strong match',cls:'eligible',rank:4,passes:5,reviews:0,
  relevance:2,checks:[]});
test('stale strong match remains useful but cannot be called verified',()=>{
  const {displayMatch}=makeDisplay(evaluate);
  const result=displayMatch(historical);
  assert.equal(result.label,'Profile fit · verify source');
  assert.equal(result.cls,'possible');
  assert.equal(result.rank,3);
  assert.equal(result.passes,5);
  assert.equal(result.verifiedEligibility,false);
});
test('missing freshness flags, missing dates, and stale-but-false flags fail closed',()=>{
  const {displayMatch}=makeDisplay(evaluate);
  for(const row of [{Last_Verified:'2026-08-20'},
    {Verification_Stale:false,Last_Verified:'2026-08-20'},
    {Verification_Stale:false},{Verification_Stale:true,Last_Verified:new Date().toISOString()}]){
    assert.equal(displayMatch(row).cls,'possible');
  }
});
test('current verified entries may retain strong match and existing blockers remain blockers',()=>{
  const {displayMatch}=makeDisplay(evaluate);
  assert.equal(displayMatch(recent).label,'Strong match');
  const blocking=makeDisplay(()=>({label:'Not eligible',cls:'ineligible',rank:0,checks:[]})).displayMatch;
  assert.equal(blocking(historical).label,'Not eligible');
});
test('cards, headline, saved and dashboard use the trusted display evaluation',()=>{
  assert.equal((v10.split('evaluate(o)').length-1),1,
    'Only displayMatch should invoke the underlying evaluate(o) function');
  assert.ok((v10.split('displayMatch(o)').length-1)>=8);
  assert.ok(v10.includes("const v10Card=o=>{const ev=displayMatch(o);"));
  assert.ok(v10.includes("const l=list.filter(o=>displayMatch(o).cls==='eligible').length"));
  assert.ok(v287.includes("opportunity?.Verification_Stale!==false"));
});
