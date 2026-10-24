import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findOfficialLinks} from '../lib/auto-discovery.js';
import {trustedSourceForLead} from '../lib/world-verification.js';
const registered=[{id:'s1',source_url:'https://university.example/scholarships',provider:'Official University',is_active:true}];
test('trusted provider snapshots yield named scholarship, fellowship and doctoral opportunity links',()=>{
 const html='<main>'+
 '<a href="/scholarships/2027-global-scholarship">2027 Global Scholarship Programme</a>'+
 '<a href="/fellowships/2027-research-fellowship">2027 Research Fellowship Programme</a>'+
 '<a href="/studentships/2027-phd-studentship">2027 PhD Studentship Programme</a>'+
 '<a href="https://university.example.evil.net/scholarships/2027">2027 Global Scholarship Programme</a>'+
 '<a href="/privacy">2027 Global Scholarship</a>'+
 '</main>';
 const links=findOfficialLinks(html,registered[0].source_url,15,new Date('2026-10-22T00:00:00Z'));
 assert.equal(links.length,3,JSON.stringify(links));
 assert.ok(links.every(l=>trustedSourceForLead({canonical_url:l.url,title:l.title},registered).status==='trusted'));
});
test('dated current-year official programme calls can join queue but not historical generic news',()=>{
 const html='<main>'+
 '<a href="/news/2026/open-call-for-internship-at-university">Open Call for Internship at University 2026</a>'+
 '<a href="/news/2020/scholarship-info">Scholarship information archive</a>'+
 '</main>';
 const links=findOfficialLinks(html,registered[0].source_url,8,new Date('2026-10-22T00:00:00Z'));
 assert.equal(links.length,1,JSON.stringify(links));
 assert.equal(trustedSourceForLead({canonical_url:links[0].url,title:links[0].title},registered).status,'trusted');
});
test('new provider source miner is secret protected, rotated, bounded and enqueues unverified leads only',()=>{
 const s=readFileSync(new URL('../api/discover-official-links.js',import.meta.url),'utf8');
 const v=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.match(s,/CRON_SECRET/);
 assert.match(s,/FROM source_snapshots/);
 assert.match(s,/trustedSourceForLead/);
 assert.match(s,/YEAR|YYYYMMDDHH24/);
 assert.match(s,/leadMap\.size>=160/);
 assert.match(s,/review_status,verification_status/);
 assert.match(s,/FOR UPDATE|ON CONFLICT\(canonical_url\)/);
 assert.doesNotMatch(s,/INSERT INTO opportunities|UPDATE opportunities SET/);
 assert.equal(v.crons.find(c=>c.path==='/api/discover-official-links').schedule,'10 1,5,13,17 * * *');
});
test('eight 16-candidate verifier passes are scheduled daily',()=>{
 const v=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(v.crons.find(c=>c.path==='/api/verify-worldwide').schedule,'15 1,5,8,11,14,17,20,23 * * *');
 assert.equal(v.crons.find(c=>c.path==='/api/promote-source-snapshots').schedule,'40 5,6,12,18 * * *');
});
