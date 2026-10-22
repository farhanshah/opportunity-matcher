import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sourceListingEvidence,storeSourceListing} from '../lib/source-listings.js';

const source={id:'known-1',provider:'Official University',source_url:'https://uni.example/awards'};
const url='https://uni.example/awards/global-scholarship-2027';
const good='<html><main><h1>2027 Global Scholarship Programme</h1>'+
 '<p>Research scholarships at this university. Applicants should read the official conditions before applying. Details, deadlines, eligibility and funding can vary between participating courses. Contact the scholarships office for individual programme instructions.</p></main></html>';

test('real official programme page enters source-only tier, not fully verified matching',()=>{
 const result=sourceListingEvidence({html:good,url,source,checkedAt:new Date('2026-10-22T06:00:00Z')});
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.title,'2027 Global Scholarship Programme');
 assert.deepEqual(result.evidence.unverified,['application_status','deadline','funding','nationalities','education','subjects']);
 assert.match(result.evidence_hash,/^[0-9a-f]{64}$/);
});
test('navigation text, unrelated domains and errors cannot create source listings',()=>{
 for(const [html,target] of [
  ['<nav><h1>2027 Global Scholarship Programme</h1></nav>',url],
  ['<main><h1>Page not found</h1><p>'+('Missing '.repeat(30))+'</p></main>',url],
  [good,'https://uni.example.evil.com/awards/global-scholarship-2027']
 ]){
  assert.equal(sourceListingEvidence({html,url:target,source}).ok,false);
 }
});
test('single-H1 official microsite is allowed but multiple unscoped H1 headings are not',()=>{
 const micro=good.replace('<main>','').replace('</main>','');
 assert.equal(sourceListingEvidence({html:micro,url,source}).ok,true);
 assert.equal(sourceListingEvidence({html:micro+'<h1>Other scholarship</h1>',url,source}).ok,false);
});
test('partial publisher never creates an opportunity or verified eligibility rules',async()=>{
 const requests=[];
 async function sql(strings,...args){
  const statement=strings.join('?');requests.push(statement);
  if(statement.includes('SELECT id,last_verified_at FROM opportunities'))return [];
  if(statement.includes('INSERT INTO worldwide_source_listings'))return [{id:10}];
  throw Error('Unexpected write '+statement);
 }
 const result=await storeSourceListing(sql,{title:'Search lead'},source,{url,html:good});
 assert.equal(result.stored,true);
 assert.ok(requests.some(s=>s.includes('INSERT INTO worldwide_source_listings')));
 assert.ok(requests.every(s=>!s.includes('INSERT INTO opportunities')&&!s.includes('UPDATE opportunities')));
});
test('recently verified matching catalogue entry is not duplicated in source tier',async()=>{
 const requests=[];
 async function sql(strings,...args){
  const statement=strings.join('?');requests.push(statement);
  return [{id:'existing',last_verified_at:new Date()}];
 }
 const result=await storeSourceListing(sql,{},source,{url,html:good});
 assert.equal(result.stored,false);
 assert.equal(requests.length,1);
});
test('public listing API cannot represent source-only data as verified or open',()=>{
 const endpoint=readFileSync(new URL('../api/source-listings.js',import.meta.url),'utf8');
 assert.match(endpoint,/publication_level:'source_confirmed'/);
 assert.match(endpoint,/application_status:'unknown'/);
 assert.match(endpoint,/eligibility:'not_verified'/);
 assert.match(endpoint,/personal_match:'not_assessed'/);
 assert.doesNotMatch(endpoint,/INSERT INTO opportunities|UPDATE opportunities/);
 const html=readFileSync(new URL('../worldwide.html',import.meta.url),'utf8');
 assert.match(html,/official provider websites/i);
 assert.match(html,/not promises of an open application/i);
});
