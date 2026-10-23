import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatedCuratedProviders} from '../lib/curated-provider-sources.js';
const api=readFileSync(new URL('../api/admit-curated-sources.js',import.meta.url),'utf8');
const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
test('source admission is a reviewed, static registry rather than web search leads',()=>{
 const sources=validatedCuratedProviders();
 assert.ok(sources.length>=15);
 assert.equal(new Set(sources.map(x=>x.source_url)).size,sources.length);
 assert.ok(sources.every(x=>new URL(x.source_url).protocol==='https:'));
 assert.match(api,/CRON_SECRET/);
 assert.match(api,/ON CONFLICT \(source_key\) DO NOTHING/);
 assert.doesNotMatch(api,/INSERT INTO opportunities|UPDATE opportunities|source_confirmed|status='open'/);
 assert.equal(config.crons.find(x=>x.path==='/api/admit-curated-sources').schedule,'35 1 * * *');
});
test('unknown or local addresses cannot enter the curated list',()=>{
 assert.throws(()=>validatedCuratedProviders([{source_key:'new_unsafe',provider:'Example',source_url:'http://localhost/apply'}]));
 assert.throws(()=>validatedCuratedProviders([{source_key:'new_unsafe',provider:'Example',source_url:'https://127.0.0.1/apply'}]));
});
