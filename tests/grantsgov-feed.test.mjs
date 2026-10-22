import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validGrantLead,grantSearchKeyword,officialGrantPost} from '../lib/grantsgov-feed.js';
const hit={
 id:'363825',number:'DOL-OESE-34832',
 title:'Education Research Fellowship Program for 2027',
 agencyName:'Department of Education',oppStatus:'posted'
};
const detail={id:363825,opportunityNumber:'DOL-OESE-34832',
 opportunityTitle:hit.title,revision:1,
 synopsis:{agencyName:hit.agencyName,applicantTypes:[{description:'Individuals'}]}};
test('source-only official grant adapter requires matching search and detail identifiers',()=>{
 const item=validGrantLead(hit,detail);
 assert.equal(item.url,'https://www.grants.gov/search-results-detail/363825');
 assert.equal(item.title,hit.title);
 assert.equal(item.evidence.matching_approved,false);
 assert.deepEqual(item.evidence.applicant_types,['Individuals']);
 assert.match(item.hash,/^[a-f0-9]{64}$/);
 for(const [h,d] of [
  [{...hit,oppStatus:'closed'},detail],
  [{...hit,id:'0'},detail],
  [hit,{...detail,opportunityNumber:'WRONG'}],
  [hit,{...detail,opportunityTitle:'Different title'}],
  [{...hit,title:'General Community Support'},detail]
 ])assert.equal(validGrantLead(h,d),null);
});
test('daily keyword rotation is deterministic across UTC days',()=>{
 const t1=grantSearchKeyword(new Date('2026-10-22T00:00:00Z'));
 const t2=grantSearchKeyword(new Date('2026-10-22T23:59:59Z'));
 const t3=grantSearchKeyword(new Date('2026-10-23T00:00:00Z'));
 assert.equal(t1,t2);assert.notEqual(t1,t3);
});
test('API helper only sends controlled POST and rejects failed responses',async()=>{
 const seen=[];
 const fetcher=async(url,opts)=>{
   seen.push({url,method:opts.method,redirect:opts.redirect,body:JSON.parse(opts.body)});
   return {ok:true,status:200,headers:new Map(),
      text:async()=>JSON.stringify({errorcode:0,data:{oppHits:[]}})};
 };
 const response=await officialGrantPost('https://api.grants.gov/v1/api/search2',
   {keyword:'fellowship'},fetcher);
 assert.deepEqual(response,{oppHits:[]});
 assert.deepEqual(seen.map(x=>[x.method,x.redirect]),[['POST','error']]);
 await assert.rejects(()=>officialGrantPost('https://api.grants.gov/v1/api/search2',
   {},async()=>({ok:false,status:429})),/HTTP 429/);
});
test('feed never inserts a strong match and cron requires secret',()=>{
 const code=readFileSync(new URL('../api/discover-grantsgov.js',import.meta.url),'utf8');
 const cfg=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.match(code,/CRON_SECRET/);
 assert.match(code,/worldwide_source_listings/);
 assert.doesNotMatch(code,/INSERT INTO opportunities|UPDATE opportunities/);
 assert.match(code,/slice\(0,5\)/);
 assert.equal(cfg.crons.find(x=>x.path==='/api/discover-grantsgov').schedule,'40 3 * * *');
});
