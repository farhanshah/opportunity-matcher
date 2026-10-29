import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../api/specific-openings.js',import.meta.url),'utf8');
test('FAO current-cycle exact job seeds replace expired August 2026 candidates',()=>{
 for(const id of ['2602160','2601979','2601980','2601981']){
  assert.ok(source.includes('job='+id+'&lang=en'));
  assert.ok(source.includes("'"+id+"':{title:"));
 }
 for(const expired of ['2600026','2600030','2600032','2600034'])
  assert.ok(!source.includes('job='+expired+'&lang=en'));
 assert.match(source,/registryEvidence/);
 assert.match(source,/fetchHtml\(opening.url\)/);
});
