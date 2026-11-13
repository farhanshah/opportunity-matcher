import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { authorisedAdmin } from '../lib/operations-auth.js';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('admin access uses a separate, strong credential and fails closed',()=>{
  const prior=process.env.ADMIN_SECRET;
  try {
    delete process.env.ADMIN_SECRET;
    assert.equal(authorisedAdmin({headers:{authorization:'Bearer '+ 'A'.repeat(40)}}),false);
    process.env.ADMIN_SECRET='short';
    assert.equal(authorisedAdmin({headers:{authorization:'Bearer short'}}),false);
    process.env.ADMIN_SECRET='A'.repeat(48);
    assert.equal(authorisedAdmin({headers:{authorization:'Bearer '+ 'A'.repeat(48)}}),true);
    assert.equal(authorisedAdmin({headers:{authorization:'Bearer '+ 'B'.repeat(48)}}),false);
    assert.equal(authorisedAdmin({headers:{authorization:''}}),false);
  } finally {
    if(prior===undefined)delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET=prior;
  }
});
test('the operations key is never persisted in browser storage',()=>{
  const source=read('admin-v1.js');
  assert.doesNotMatch(source,/sessionStorage.*oppAdminSecret|localStorage.*oppAdminSecret/);
  assert.match(source,/secret:''/);
  for(const path of ['api/admin-health.js','api/admin-review.js']) {
    assert.match(read(path),/authorisedAdmin\(req\)/);
    assert.doesNotMatch(read(path),/process\.env\.CRON_SECRET/);
  }
});
test('operations and monitor failures return non-sensitive messages',()=>{
  for(const path of ['api/admin-health.js','api/admin-review.js','api/monitor.js']) {
    const source=read(path);
    assert.doesNotMatch(source,/error:\s*(?:error|err|e)\.message/,'raw error in '+path);
  }
});
test('common environment secret files remain ignored',()=>{
  const ignore=read('.gitignore');
  assert.match(ignore,/^\.env\.\*/m);
  assert.match(ignore,/^!\.env\.example/m);
});
test('user data endpoints must keep their authentication and ownership boundaries',()=>{
  const auth=read('api/welcome-now.js');
  assert.match(auth,/s\.token=\$\{match\[1\]\}/);
  assert.match(auth,/u\.banned IS DISTINCT FROM TRUE/);
  const linkedin=read('api/linkedin.js');
  assert.match(linkedin,/getAccountBySession/);
  assert.match(linkedin,/auth_user_id=\$\{account\.id\}/);
});

test('password reset token is neither copied into the DOM nor left in the address bar',()=>{
  const code=read('app-v71-password-recovery-v2.js');
  assert.doesNotMatch(code,/token:\$\{token\}/);
  assert.match(code,/if\(token&&location\.search\)history\.replaceState/);
  assert.match(code,/lastRecoveryToken/);
});
