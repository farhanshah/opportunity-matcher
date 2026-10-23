import test from 'node:test';
import assert from 'node:assert/strict';
import { originFromRequest, authoritative } from '../lib/exact-ingest.js';

test('cron ingestion uses the public production domain, not protected deployment hostname', () => {
  const original=process.env.OPPMATCHER_PUBLIC_ORIGIN;
  delete process.env.OPPMATCHER_PUBLIC_ORIGIN;
  try {
    const value=originFromRequest({headers:{host:'example.vercel.app','x-forwarded-host':'hostile.example'}});
    assert.equal(value,'https://oppmatcher.tech');
  } finally {
    if(original===undefined)delete process.env.OPPMATCHER_PUBLIC_ORIGIN;
    else process.env.OPPMATCHER_PUBLIC_ORIGIN=original;
  }
});

test('rejects unsafe configured callback domains', () => {
  const original=process.env.OPPMATCHER_PUBLIC_ORIGIN;
  process.env.OPPMATCHER_PUBLIC_ORIGIN='https://malicious.example';
  try {assert.throws(()=>originFromRequest({headers:{}}),/authorised public HTTPS domain/)}
  finally {
    if(original===undefined)delete process.env.OPPMATCHER_PUBLIC_ORIGIN;
    else process.env.OPPMATCHER_PUBLIC_ORIGIN=original;
  }
});

test('failed or incomplete provider reads cannot masquerade as authoritative', () => {
  assert.equal(authoritative({ok:true,verification_health:'empty',openings:[]}),false);
  assert.equal(authoritative({ok:true,fetch_error:'HTTP 403'}),false);
  assert.equal(authoritative({ok:true,adapter_state:'unreadable'}),false);
  assert.equal(authoritative({ok:true,verification_health:'degraded'}),false);
  assert.equal(authoritative({ok:true,verification_health:'healthy',openings:[{title:'Internship'}]}),true);
});

test('posting title rather than provider feed decides the vacancy category',async()=>{
 const {classifyExactVacancy}=await import('../lib/exact-ingest.js');
 assert.equal(classifyExactVacancy({title:'Vacancy Announcement - Roster (Administrative Associates) - SENEGAL CO'}),'Job');
 assert.equal(classifyExactVacancy({title:'Special Call: Internship, Youth & Disability Inclusion'}),'Internship');
 assert.equal(classifyExactVacancy({title:'Programme de Stages du PNUD Djibouti'}),'Internship');
 assert.equal(classifyExactVacancy({title:'Communications Intern'}),'Internship');
 assert.equal(classifyExactVacancy({title:'Graduate Fellowship'}),'Fellowship');
 assert.equal(classifyExactVacancy({title:'Policy Specialist'}),'Job');
});
