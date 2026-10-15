import test from 'node:test';
import assert from 'node:assert/strict';
import { originFromRequest } from '../lib/exact-ingest.js';

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
