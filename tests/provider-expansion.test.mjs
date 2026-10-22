import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eligibleSource} from '../api/expand-providers.js';
const source={provider:'Official University',source_url:'https://university.example/awards',is_active:true};
const programme={external_id:'SCH-123',provider:'Official University',official_source_url:'https://university.example/scholarships/2027-award'};
test('approved provider and exact domain may expand monitoring, never new hostname',()=>{
 assert.equal(eligibleSource(programme,[source]).key,'catalogue_sch-123');
 assert.equal(eligibleSource({...programme,official_source_url:'https://university.example.bad.org/scholarships'},[source]),null);
 assert.equal(eligibleSource({...programme,provider:'Other Organization'},[source]),null);
 assert.equal(eligibleSource({...programme,official_source_url:'https://university.example/privacy'},[source]),null);
 assert.equal(eligibleSource({...programme,official_source_url:'http://127.0.0.1/secrets'},[source]),null);
});
test('new cron requires secret and leaves matching and publication untouched',()=>{
 const api=readFileSync(new URL('../api/expand-providers.js',import.meta.url),'utf8');
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(config.crons.find(x=>x.path==='/api/expand-providers').schedule,'20 1 * * *');
 assert.match(api,/req.headers.authorization/);
 assert.match(api,/MAX_ADMISSIONS=8/);
 assert.match(api,/ON CONFLICT\(source_key\) DO NOTHING/);
 assert.doesNotMatch(api,/UPDATE opportunities|INSERT INTO opportunities/);
});
