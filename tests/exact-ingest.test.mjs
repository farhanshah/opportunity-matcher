import test from 'node:test';
import assert from 'node:assert/strict';
import { originFromRequest, authoritative, usableExactOpening } from '../lib/exact-ingest.js';

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

test('only evidence-backed open postings with meaningful title and future deadline are ingestible',()=>{
 const at=Date.parse('2026-11-04T12:00:00Z');
 const valid={title:'Communications Intern',deadline:'2026-11-29T23:59:59Z',
  url:'https://jobs.unicef.org/en-us/job/596670',status_verified:true,verification_level:'exact'};
 assert.equal(usableExactOpening(valid,at),true);
 assert.equal(usableExactOpening({...valid,title:'   '},at),false);
 assert.equal(usableExactOpening({...valid,title:'Intern'},at),false);
 assert.equal(usableExactOpening({...valid,deadline:'2026-11-03T23:59:59Z'},at),false);
 assert.equal(usableExactOpening({...valid,deadline:null},at),false);
 assert.equal(usableExactOpening({...valid,url:'http://jobs.unicef.org/job/596670'},at),false);
 assert.equal(usableExactOpening({...valid,url:'javascript:alert(1)'},at),false);
 assert.equal(usableExactOpening({...valid,status_verified:false},at),false);
 assert.equal(usableExactOpening({...valid,verification_level:'board'},at),false);
});
