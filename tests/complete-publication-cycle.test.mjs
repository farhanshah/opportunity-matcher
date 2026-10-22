import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyCandidate,discoveryId} from '../lib/auto-discovery.js';
import {trustedSourceForLead} from '../lib/world-verification.js';
import {eligibilityRecheckCompatible} from '../lib/verification-eligibility.js';
const url='https://uni.example.edu/scholarships/2027-business-scholarship';
const source={id:'source-1',provider:'Example Official University',source_url:'https://uni.example.edu/scholarships',is_active:true};
const page='<html><nav><p>Old scholarship applications closed last year.</p></nav>'+
 '<main><h1>2027 International Business Scholarship</h1>'+
 '<p>Application deadline: 18 May 2027</p><p>Applications open: 1 October 2026</p>'+
 '<p>Funding: Fully funded</p><p>Nationality eligibility: Pakistan</p>'+
 '<p>Education requirement: Bachelor degree</p>'+
 '<p>Fields of study: Business &amp; Management</p>'+
 '<p>Host country: United Kingdom</p></main></html>';
const discovery=readFileSync(new URL('../api/discover.js',import.meta.url),'utf8')
 .replace(/^import .*;\s*$/gm,'')
 .replace('export default async function handler','async function handler')
 .replace(/^export \{ publish, fetchOfficial \};\s*$/gm,'');
const publish=new Function('discoveryId','eligibilityRecheckCompatible',discovery+'\nreturn publish;')(discoveryId,eligibilityRecheckCompatible);
function fakeDb(){
 const commands=[];
 async function sql(strings,...values){
  const query=strings.join('?');commands.push({query,values});
  if(query.includes('SELECT id,external_id,title,opportunity_type'))return [];
  if(query.includes('WHERE lower(title)=lower('))return [];
  if(query.includes('WITH upserted AS'))return [{id:'program-uuid'}];
  throw Error('Unexpected database call '+query.slice(0,100));
 }
 return {sql,commands};
}
test('trusted official page can pass full extraction and publish atomically with restricted country and subject',async()=>{
 const trust=trustedSourceForLead({canonical_url:url,title:'2027 International Business Scholarship'},[source]);
 assert.equal(trust.status,'trusted');
 const checked=verifyCandidate(page,url,source.provider,new Date('2026-10-22T14:00:00Z'));
 assert.equal(checked.verified,true,checked.reasons.join('; '));
 assert.deepEqual(checked.record.nationality,['Pakistan']);
 assert.deepEqual(checked.record.fields,['Business & Management']);
 const db=fakeDb();const result=await publish(db.sql,source,url,checked);
 assert.equal(result.status,'published');
 const insert=db.commands.find(x=>x.query.includes('WITH upserted AS'));
 assert.ok(insert);assert.match(insert.query,/INSERT INTO opportunities/);
 assert.match(insert.query,/INSERT INTO opportunity_eligibility_rules/);
 assert.ok(insert.values.some(x=>String(x).includes('"scope":"explicit_list"')&&String(x).includes('Pakistan')));
 assert.ok(insert.values.some(x=>String(x).includes('"values":["Business & Management"]')));
});
test('missing official deadline blocks main-catalogue writes',async()=>{
 const bad=page.replace('Application deadline: 18 May 2027','Application deadlines vary by university');
 const checked=verifyCandidate(bad,url,source.provider,new Date('2026-10-22T14:00:00Z'));
 assert.equal(checked.verified,false);
 const db=fakeDb();const result=await publish(db.sql,source,url,checked);
 assert.equal(result.status,'needs_evidence');assert.equal(db.commands.length,0);
});
test('unregistered provider URLs are excluded from automatic publication',()=>{
 const trust=trustedSourceForLead({canonical_url:'https://not-official.example.net/scholarships/2027',title:'2027 International Business Scholarship'},[source]);
 assert.equal(trust.status,'source_review');
});
