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
