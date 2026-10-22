import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('public JSON endpoints do not reveal database error text',()=>{
  for(const path of ['api/health.js','api/opportunities.js']){
   const src=read(path);
   assert.doesNotMatch(src,/error:\s*error\.message|detail:\s*error\.message/);
   assert.match(src,/Service temporarily unavailable|Catalogue temporarily unavailable/);
  }
});
test('operations, monitoring, provider admission and LinkedIn endpoints are protected',()=>{
 for(const path of ['api/admin-health.js','api/reverify.js','api/verify-worldwide.js',
   'api/worldwide-discover.js','api/expand-providers.js','api/automation-health-watch.js']){
   assert.match(read(path),/CRON_SECRET/,'missing cron gate in '+path);
   assert.match(read(path),/authorization/,'missing authorization in '+path);
 }
 const linkedin=read('api/linkedin-callback.js');
 assert.match(linkedin,/state_hash/);
 assert.match(linkedin,/cookie_hash/);
 assert.match(linkedin,/verifyIdToken/);
 assert.match(linkedin,/auth_session_id/);
 assert.match(read('api/linkedin.js'),/req.headers.origin!==ORIGIN/);
});
test('site retains AdSense ownership code, ads.txt and privacy policy',()=>{
 assert.match(read('index.html'),/ca-pub-1916126969266611/);
 assert.match(read('ads.txt'),/pub-1916126969266611/);
 assert.match(read('privacy.html'),/AdSense/);
 assert.match(read('privacy.html'),/privacy@oppmatcher\.tech/);
 const conf=JSON.parse(read('vercel.json'));
 const h=conf.headers[0].headers;
 assert.ok(h.some(x=>x.key==='X-Frame-Options'&&x.value==='DENY'));
 assert.ok(h.some(x=>x.key==='X-Content-Type-Options'&&x.value==='nosniff'));
});
