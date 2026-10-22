import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {worldwideQueries,normalizeWebLead,uniqueLeads,WORLDWIDE_DAILY_QUERY_LIMIT} from '../lib/worldwide-search.js';
const load=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('bounded daily search covers regions and different opportunity categories',()=>{
 const queries=worldwideQueries(new Date('2026-10-17T00:00:00Z'));
 assert.equal(queries.length,WORLDWIDE_DAILY_QUERY_LIMIT);
 assert.ok(queries.some(x=>x.region==='Africa'));
 assert.ok(queries.some(x=>x.region==='Europe'));
 assert.ok(queries.some(x=>x.region==='Oceania'));
 assert.ok(queries.some(x=>x.region==='Global internships'));
 assert.ok(queries.every(x=>x.query.includes('2027')));
});
test('search results are URLs only, never trusted programme evidence',()=>{
 const item=normalizeWebLead({title:'2027 Fully funded research scholarship',url:'https://university.example/awards?utm_source=spam',
    description:'Funding exists'},'Europe','query',['university.example']);
 assert.equal(item.canonical_url,'https://university.example/awards');
 assert.equal(item.matched_official_host,true);
 assert.equal(item.search_region,'Europe');
 assert.equal(normalizeWebLead({title:'Bad URL title',url:'http://localhost/private'},'EU','q'),null);
 assert.equal(normalizeWebLead({title:'Social media programme 2027',url:'https://instagram.com/p/1234'},'EU','q'),null);
 assert.equal(normalizeWebLead({title:'Government scholarship 2027',url:'https://www.studyinkorea.go.kr/$$$$$$$$$$$$$$$$$$$$$%7BlangCd%7D/plan/scholarship.do'},'Asia','q',['studyinkorea.go.kr']),null);
 assert.equal(uniqueLeads([item,item]).length,1);
});
test('web search is authenticated, bounded, rate budgeted, and cannot automatically publish leads',()=>{
 const code=load('api/worldwide-discover.js'),cron=JSON.parse(load('vercel.json')).crons;
 assert.equal(cron.find(x=>x.path==='/api/worldwide-discover').schedule,'30 4 * * *');
 assert.ok(code.includes('if(!authorised(req))return res.status(401)'));
 assert.ok(code.includes("if(!secret)"));
 assert.ok(code.includes("status='not_configured'"));
 assert.ok(code.includes("url.searchParams.set('count','10')"));
 assert.ok(code.includes('uniqueLeads(leads)'));
 assert.ok(code.includes("review_status"));
 assert.ok(!code.includes('INSERT INTO opportunities('));
 assert.ok(!code.includes('UPDATE opportunities SET'));
});
test('private operations can track worldwide searches without promoting unverified results',()=>{
 const api=load('api/admin-health.js');
 const html=load('admin.html');
 assert.ok(api.includes('FROM opportunity_web_search_runs ORDER BY started_at DESC'));
 assert.ok(api.includes('FROM opportunity_web_leads'));
 assert.ok(api.includes('if (!authorised(req)) return res.status(401)'));
 assert.ok(html.includes('worldwideSearchStatus'));
});


test('registered official sources receive rotating search slots without being auto-trusted',()=>{
 const hosts=Array.from({length:34},(_,i)=>'provider'+i+'.example.org');
 const dayOne=worldwideQueries(new Date('2026-10-22T00:00:00Z'),hosts);
 const dayTwo=worldwideQueries(new Date('2026-10-23T00:00:00Z'),hosts);
 assert.equal(dayOne.length,WORLDWIDE_DAILY_QUERY_LIMIT);
 assert.equal(dayOne.filter(x=>x.officialTarget).length,6);
 assert.equal(dayOne.filter(x=>!x.officialTarget).length,6);
 assert.ok(dayOne.every(x=>x.query.includes('2027')));
 assert.ok(dayOne.filter(x=>x.officialTarget).every(x=>x.query.startsWith('site:')));
 assert.notDeepEqual(dayOne.filter(x=>x.officialTarget).map(x=>x.query),
   dayTwo.filter(x=>x.officialTarget).map(x=>x.query));
 assert.equal(worldwideQueries(new Date('2026-10-22T00:00:00Z'),[]).length,12);
 const source=load('api/worldwide-discover.js');
 assert.ok(source.includes('worldwideQueries(new Date(),officialHosts)'));
 assert.ok(source.includes('if(!officialTarget)url.searchParams.set'));
 assert.ok(source.includes("review_status"));
});
