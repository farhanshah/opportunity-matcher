import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ukDeliveryWindow,discoveryDigest} from '../lib/daily-discovery-email.js';

const date=stamp=>ukDeliveryWindow(new Date(stamp));
test('UK daily report runs once per local day across BST and GMT',()=>{
  assert.deepEqual({day:date('2026-10-18T08:10:00Z').day,hour:date('2026-10-18T08:10:00Z').hour},
    {day:'2026-10-18',hour:9});
  assert.equal(date('2026-10-18T08:10:00Z').shouldRun,true);
  assert.equal(date('2026-10-18T09:10:00Z').shouldRun,true);
  assert.equal(date('2026-12-18T08:10:00Z').shouldRun,false);
  assert.equal(date('2026-12-18T09:10:00Z').shouldRun,true);
  assert.equal(date('2026-10-18T07:10:00Z').shouldRun,false);
});
test('report does not invent zero outcomes for missing searches',()=>{
  const message=discoveryDigest({day:'2026-10-18'});
  assert.match(message.text,/No successfully completed official-source discovery run/);
  assert.match(message.text,/No successfully completed worldwide search run/);
  assert.match(message.text,/New opportunities published: Not recorded/);
  assert.match(message.html,/Not recorded/);
  assert.equal(message.statistics.missingCount,3);
});
test('counts only completed runs and escapes untrusted search titles',()=>{
  const message=discoveryDigest({
    day:'2026-10-18',
    officialRuns:[{status:'completed',scanned_sources:12,found_links:3,new_published:1,withheld:2},
      {status:'failed',scanned_sources:12,new_published:50}],
    worldRuns:[{status:'completed',queries_attempted:12,results_found:26,new_leads:3,provider_errors:1}],
    verificationRuns:[{status:'completed',inspected:6,published_new:2,provider_errors:0}],
    publishedOpportunities:[{title:'Verified scholarship programme',provider:'University'}],
    worldLeads:[{title:'<script>oops</script>',search_region:'Europe'}]});
  assert.equal(message.statistics.published,3);
  assert.equal(message.statistics.publishedFromWeb,2);
  assert.match(message.html,/Newly published opportunities/);
  assert.match(message.text,/Verified scholarship programme/);
  assert.equal(message.statistics.worldNew,3);
  assert.equal(message.statistics.providerErrors,1);
  assert.doesNotMatch(message.html,/<script>/);
  assert.match(message.html,/&lt;script&gt;/);
});
test('catalogue checks are not described as verified opportunities',()=>{
 const message=discoveryDigest({day:'2026-10-22',
   officialRuns:[{status:'completed',scanned_sources:12,found_links:4,new_published:0}],
   worldRuns:[{status:'completed',queries_attempted:12,results_found:32,new_leads:19}],
   verificationRuns:[{status:'completed',inspected:12,published_new:0}],
   catalogueHealth:{total_records:100,rechecked_24h:12,verified_30d:0,
     never_checked:16,needs_evidence:54,retry_needed:30}});
 assert.match(message.text,/Programme records checked, last 24h: 12 \/ 100/);
 assert.match(message.text,/Programme records verified in last 30d: 0 \/ 100/);
 assert.match(message.text,/Never checked \/ need evidence \/ need retry: 16 \/ 54 \/ 30/);
 assert.match(message.html,/Catalogue verification:/);
 assert.equal(message.statistics.catalogueChecked24h,12);
 assert.equal(message.statistics.catalogueVerified30d,0);
 assert.equal(message.statistics.published,0);
 const unavailable=discoveryDigest({day:'2026-10-22'});
 assert.match(unavailable.text,/Programme records checked, last 24h: Not recorded/);
 assert.equal(unavailable.statistics.catalogueChecked24h,null);
});

test('cron is authenticated, private, idempotent, and scheduled after discovery',()=>{
  const api=readFileSync(new URL('../api/daily-discovery-email.js',import.meta.url),'utf8');
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  assert.equal(config.crons.find(c=>c.path==='/api/daily-discovery-email').schedule,
    '10 8-12 * * *');
  assert.match(api,/req.headers.authorization/);
  assert.match(api,/DISCOVERY_REPORT_TO_EMAIL/);
  assert.match(api,/Idempotency-Key/);
  assert.match(api,/sent_at IS NULL AND attempts<4/);
  assert.match(api,/status='sent'/);
  assert.doesNotMatch(api,/@gmail\.com/);
  assert.match(api,/FROM opportunity_web_verification_runs/);
  assert.match(api,/FROM opportunities/);
  assert.match(api,/catalogueHealth/);
});
