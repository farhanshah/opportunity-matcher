import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {worldwideQueries,normalizeWebLead,uniqueLeads,WORLDWIDE_DAILY_QUERY_LIMIT,COUNTRY_MARKETS} from '../lib/worldwide-search.js';
const load=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('bounded daily search covers regions and different opportunity categories',()=>{
 const queries=worldwideQueries(new Date('2026-10-17T00:00:00Z'));
 assert.equal(queries.length,WORLDWIDE_DAILY_QUERY_LIMIT); // country searches work without registered hosts.
 assert.ok(queries.some(x=>x.region.startsWith('Country: ')));
 assert.ok(queries.some(x=>x.region==='Africa') || queries.some(x=>x.region==='Europe'));



 assert.ok(queries.every(x=>/2026|2027/.test(x.query)));
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
 assert.ok(api.includes('if (!authorisedAdmin(req)) return res.status(401)'));
 assert.ok(html.includes('worldwideSearchStatus'));
});


test('registered official sources receive rotating search slots without being auto-trusted',()=>{
 const hosts=Array.from({length:34},(_,i)=>'provider'+i+'.example.org');
 const dayOne=worldwideQueries(new Date('2026-10-22T00:00:00Z'),hosts);
 const dayTwo=worldwideQueries(new Date('2026-10-23T00:00:00Z'),hosts);
 assert.equal(dayOne.length,WORLDWIDE_DAILY_QUERY_LIMIT);
 assert.equal(dayOne.filter(x=>x.officialTarget).length,10);
 assert.equal(dayOne.filter(x=>x.countryTarget).length,8);
 assert.equal(dayOne.filter(x=>!x.officialTarget&&!x.countryTarget).length,2);
 assert.ok(dayOne.every(x=>/2026|2027/.test(x.query)));
 assert.ok(dayOne.filter(x=>x.officialTarget).every(x=>x.query.startsWith('site:')));
 assert.notDeepEqual(dayOne.filter(x=>x.officialTarget).map(x=>x.query),
   dayTwo.filter(x=>x.officialTarget).map(x=>x.query));
 assert.equal(worldwideQueries(new Date('2026-10-22T00:00:00Z'),[]).length,WORLDWIDE_DAILY_QUERY_LIMIT);
 const source=load('api/worldwide-discover.js');
 assert.ok(source.includes('worldwideQueries(new Date(),officialHosts)'));
 assert.ok(source.includes('if(!officialTarget&&!countryTarget)url.searchParams.set'));
 assert.ok(source.includes("review_status"));
});


test('low-quality navigation and financial-news results do not enter verification queue',()=>{
 for(const [title,url] of [
  ['USEFP - Press Releases','https://usefp.org/media-room/press-releases.cfm'],
  ['Lending Rates & Fees','https://treasury.worldbank.org/en/about/lending-rates-and-fees'],
  ['University Information | Scholarships','https://studyinkorea.go.kr/ko/search/universityInfo.do'],
  ['Frequently Asked Questions on the Internship Program','https://wipo.int/en/web/working-at-wipo/internship-program/faqs'],
  ['2027 Global Scholarships Announcement','https://example.edu/news/global-scholarships-2027']
 ]){
  assert.equal(normalizeWebLead({title,url},'Global','query',['example.edu']),null,title);
 }
});
test('official named application calls and programme pages survive lead filtering',()=>{
 for(const [title,url] of [
  ['Open Call for Internship at WIPO Japan Office','https://www.wipo.int/en/web/office-japan/w/news/2026/open-call-for-internship-at-wipo-japan-office'],
  ['World Bank Scholarships Program JJ WBGSP','https://www.worldbank.org/en/programs/scholarships/jj-wbgsp'],
  ['Türkiye Scholarships Full-Time Scholarship Program','https://www.turkiyeburslari.gov.tr/fulltimeprograms']
 ]){
  assert.ok(normalizeWebLead({title,url},'Global','query'),title);
 }
});


test('unregistered search leads are held before official verification, then eligible for host registration',()=>{
 const discovery=load('api/worldwide-discover.js');
 const verifier=load('api/verify-worldwide.js');
 assert.match(discovery,/CASE WHEN x\.matched_official_host THEN 'pending' ELSE 'source_review' END/);
 assert.match(discovery,/Provider hostname is not in the official-source registry/);
 assert.match(discovery,/opportunity_web_leads\.verification_status='source_review'/);
 assert.match(discovery,/THEN 'pending' ELSE opportunity_web_leads\.verification_status END/);
 assert.match(verifier,/l\.verification_reason='Provider hostname is not in the official-source registry'/);
 assert.match(verifier,/l\.verification_checked_at IS NULL OR l\.verification_checked_at/);
 assert.doesNotMatch(discovery,/INSERT INTO opportunities\s*\(/);
});

test('country-specific search rotates fairly without changing official evidence rules',()=>{
 const start=new Date('2026-10-23T00:00:00Z');
 const names=new Set();
 for(let d=0;d<12;d++){
   const day=new Date(start.getTime()+d*86400000);
   for(const q of worldwideQueries(day,['ox.ac.uk','studyinkorea.go.kr'])){
     if(q.countryTarget)names.add(q.region.slice(9));
     if(q.countryTarget)assert.match(q.query,/20\d\d.+official university government/);
   }
 }
 for(const country of ['China','South Korea','Lithuania','Canada','United States',
    'United Kingdom','Pakistan','India','Indonesia','Japan'])
  assert.ok(COUNTRY_MARKETS.includes(country)&&names.has(country),country+' must be covered');
 assert.equal(worldwideQueries(start,['ox.ac.uk']).length,20);
});

test('country rotation finds current-year vacancy deadlines as well as next-year schemes',()=>{
 const queries=worldwideQueries(new Date('2026-10-29T12:00:00Z'),['studyin.lt']);
 assert.equal(queries.length,20);
 const countries=queries.filter(x=>x.countryTarget);
 assert.equal(countries.length,8);
 assert.ok(countries.some(x=>x.query.includes('2026')&&x.query.includes('applications open deadline')));
 assert.ok(countries.some(x=>x.query.includes('2027')&&x.query.includes('application intake deadline')));
 assert.ok(countries.every(x=>x.officialTarget===false));
});

test('search leads skip closed or generic pages but retain official exact job candidates',()=>{
 for(const [title,url] of [
  ['Doctoral Studentships (Closed)','https://wellcome.org/research-funding/schemes/doctoral-studentships-closed'],
  ["Master's Studentships in Humanities and Social Science",'https://wellcome.org/research-funding/schemes/masters-studentships-humanities-and-social-science-closed'],
  ['Apply for scholarships','https://www.educanada.ca/scholarships-bourses/app/apply-scholarships-postuler-bourses.aspx'],
  ['Archived Research Fellowship','https://university.example/fellowships/archived']
 ])assert.equal(normalizeWebLead({title,url},'Global','q',['wellcome.org','university.example','educanada.ca']),null,title);
 assert.ok(normalizeWebLead({title:'Project Management Intern - 4382 - UNOPS',
  url:'https://careers.unops.org/careersmarketplace/JobDetail/Project-Management-Intern/4382'},'Global','q',['careers.unops.org']));
});

test('global search gives more slots to verified official hosts without more API queries',()=>{
 const hosts=Array.from({length:95},(_,i)=>'official'+i+'.example.org');
 const tasks=worldwideQueries(new Date('2026-11-13T00:00:00Z'),hosts);
 assert.equal(tasks.length,20);
 assert.equal(tasks.filter(x=>x.countryTarget).length,8);
 assert.equal(tasks.filter(x=>x.officialTarget).length,10);
 assert.equal(tasks.filter(x=>!x.countryTarget&&!x.officialTarget).length,2);
 assert.ok(tasks.filter(x=>x.officialTarget).every(x=>x.query.startsWith('site:')));
});
