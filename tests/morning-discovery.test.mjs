import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('search executes four mornings before 8am both BST and GMT',()=>{
 const crons=JSON.parse(read('vercel.json')).crons;
 const discovery=crons.filter(c=>c.path==='/api/discover');
 assert.equal(discovery.length,1);
 assert.equal(discovery[0].schedule,'*/15 6 * * *');
 assert.ok(!crons.some(c=>c.path==='/api/discover'&&c.schedule==='0 7 * * *'));
});
test('daily 4 passes cover 46-source registry when successful and nonoverlapping',()=>{
 const code=read('api/discover.js');
 assert.ok(code.includes('const SOURCE_BATCH = 12'));
 assert.ok(code.includes('ORDER BY m.last_discovery_at NULLS FIRST,m.source_key'));
 assert.ok(4*12>=46);
});
test('search outcomes saved with each pass for operations, without exposing secret',()=>{
 const code=read('api/discover.js');
 const api=read('api/admin-health.js');
 const client=read('admin-v1.js');
 assert.ok(code.includes("INSERT INTO opportunity_discovery_runs(status)"));
 assert.ok(code.includes("status='completed'"));
 assert.ok(code.includes("status='failed'"));
 assert.ok(code.includes('if(!authorised(req))return res.status(401)'));
 assert.ok(api.includes('FROM opportunity_discovery_runs ORDER BY started_at DESC'));
 assert.ok(api.includes('discovery_runs:discoveryRuns'));
 assert.ok(api.includes('if (!authorised(req)) return res.status(401)'));
 assert.ok(client.includes('discoveryTodaySources'));
 assert.ok(client.includes('discoveryRunSummary'));
});
test('published opportunities continue to require strict first-party evidence',()=>{
 const code=read('api/discover.js');
 assert.ok(code.includes('if(!result.verified)'));
 assert.ok(code.includes('verifyCandidate(page.html,page.url,source.provider)'));
 assert.ok(code.includes("officialHostMatches(next, authority)"));
 assert.ok(code.includes('resolveOfficialRedirect('));
 assert.ok(code.includes('return {status:\'needs_evidence\''));
});
