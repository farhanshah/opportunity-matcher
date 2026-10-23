import test from 'node:test';
import assert from 'node:assert/strict';
import {hostBatches} from '../lib/monitor-batching.js';
test('never dispatch concurrent official requests to the same provider host',()=>{
 const sources=[
  {source_key:'ox1',source_url:'https://www.ox.ac.uk/a'},
  {source_key:'ox2',source_url:'https://www.ox.ac.uk/b'},
  {source_key:'un1',source_url:'https://unicef.org/a'},
  {source_key:'ox3',source_url:'https://www.ox.ac.uk/c'},
  {source_key:'eu1',source_url:'https://europa.eu/a'},
  {source_key:'eu2',source_url:'https://europa.eu/b'}
 ];
 const batches=hostBatches(sources,3);
 assert.deepEqual(batches.map(x=>x.map(y=>y.source_key)),[['ox1','un1','eu1'],['ox2','eu2'],['ox3']]);
 assert.equal(batches.flat().length,sources.length);
 for(const b of batches)assert.equal(new Set(b.map(s=>new URL(s.source_url).hostname)).size,b.length);
});
test('enforces concurrency and preserves input order within a host',()=>{
 const sources=Array.from({length:29},(_,i)=>({source_key:String(i),source_url:'https://'+(i%9)+'.example.org/list/'+i}));
 const batches=hostBatches(sources,14);
 assert.ok(batches.every(x=>x.length<=14));
 assert.deepEqual(batches.flat().map(x=>x.source_key).sort((a,b)=>Number(a)-Number(b)),sources.map(x=>x.source_key));
 for(let host=0;host<9;host++){
  assert.deepEqual(batches.flat().filter(s=>new URL(s.source_url).hostname===host+'.example.org').map(s=>s.source_key),
   sources.filter(s=>new URL(s.source_url).hostname===host+'.example.org').map(s=>s.source_key));
 }
 assert.throws(()=>hostBatches(sources,0));
});
