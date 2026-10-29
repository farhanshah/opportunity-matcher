import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../api/wfp-openings.js',import.meta.url),'utf8');
function adapter(fakeFetch){
 const code=source.replace('export default async function handler','async function handler');
 return new Function('fetch',code+'\nreturn {searchWorkday,applicationDeadlineFromDescription,verifyRow};')(fakeFetch);
}
function response(data,url,status=200){return {ok:status===200,status,url,headers:new Map([['content-type','application/json']]),text:async()=>JSON.stringify(data)}}
test('empty first Workday host does not hide internships on second host',async()=>{
 const requests=[];
 const fake=async(url,options)=>{requests.push({url,method:options.method});
  if(url.includes('wd3.myworkdaysite.com'))return response({jobPostings:[],total:0},url);
  if(url.includes('wfp.wd3.myworkdayjobs.com'))return response({jobPostings:[{title:'Intern - Knowledge Management',externalPath:'/job/Rome-Italy/Intern-Knowledge_2099'}],total:1},url);
  return response({error:'rate limited'},url,429);
 };
 const api=adapter(fake);
 const result=await api.searchWorkday();
 assert.match(result.root,/wfp\.wd3\.myworkdayjobs\.com/);
 assert.equal(result.rows.length,1);
 assert.equal(result.entries.length,1);
 assert.match(result.entries[0].root,/wfp\.wd3\.myworkdayjobs\.com/);
 assert.equal(result.host_errors.length,0);
 assert.equal(requests.length,2);
});
test('exact Workday description deadline can validate an internship without structured endDate',async()=>{
 const fetcher=async(url,opts)=>response({jobPostingInfo:{
  title:'Intern - Knowledge Management',location:'Rome, Italy',
  jobDescription:'DEADLINE FOR APPLICATIONS 28 November 2099-23:59-GMT. Applicants must apply online.'
 }},url);
 const api=adapter(fetcher);
 assert.equal(api.applicationDeadlineFromDescription('DEADLINE FOR APPLICATIONS 28 November 2099-23:59'), '2099-11-28');
 assert.equal(api.applicationDeadlineFromDescription('DEADLINE FOR APPLICATIONS 31 February 2099'),'');
 assert.equal(api.applicationDeadlineFromDescription('Posting date 28 November 2099'),'');
 const job=await api.verifyRow({title:'Intern - Knowledge Management',externalPath:'/job/Rome/Intern-Knowledge_2099'},
   'https://wfp.wd3.myworkdayjobs.com/wday/cxs/wfp/job_openings/jobs');
 assert.ok(job);assert.equal(job.deadline,'2099-11-28');assert.equal(job.status_verified,true);
 assert.match(job.url,/wfp\.wd3\.myworkdayjobs\.com\/en-US\/job_openings\/job\//);
});
test('conflicting official closing dates and non-intern titles are rejected',async()=>{
 const fake=async(url)=>response({jobPostingInfo:{
  title:'Intern - Knowledge Management',endDate:'2099-12-12',
  jobDescription:'DEADLINE FOR APPLICATIONS 28 November 2099-23:59-GMT.'
 }},url);
 const api=adapter(fake);
 const row={title:'Intern - Knowledge Management',externalPath:'/job/Rome/Intern-2099'};
 assert.equal(await api.verifyRow(row,'https://wfp.wd3.myworkdayjobs.com/wday/cxs/wfp/job_openings/jobs'),null);
 const descriptionOnly=adapter(async(url)=>response({jobPostingInfo:{
  title:'Finance Officer',endDate:'2099-11-28',jobDescription:'Past internships were available to applicants.'
 }},url));
 assert.equal(await descriptionOnly.verifyRow(row,'https://wfp.wd3.myworkdayjobs.com/wday/cxs/wfp/job_openings/jobs'),null);
});
test('official internship importer retains per-provider diagnostics and does not write matching catalogue',()=>{
 const source=readFileSync(new URL('../api/discover-exact-internships.js',import.meta.url),'utf8');
 assert.match(source,/providerDetails\[provider\]/);
 assert.match(source,/details=\$\{JSON\.stringify/);
 assert.match(source,/provider_host_errors/);
 assert.doesNotMatch(source,/INSERT INTO opportunities|UPDATE opportunities SET/);
 const mig=readFileSync(new URL('../migrations/20261022-feed-provider-details.sql',import.meta.url),'utf8');
 assert.match(mig,/ADD COLUMN IF NOT EXISTS details jsonb/);
});

test('multiple readable Workday hosts contribute unique internship vacancy paths',async()=>{
 const fake=async(url,opts)=>{
  if(url.includes('wd3.myworkdaysite.com'))return response({jobPostings:[
    {title:'Intern - Policy',externalPath:'/job/Rome/Intern-Policy_JR001'}],total:1},url);
  if(url.includes('wfp.wd3.myworkdayjobs.com'))return response({jobPostings:[
    {title:'Intern - Policy',externalPath:'/job/Rome/Intern-Policy_JR001'},
    {title:'Intern - Communications',externalPath:'/job/Dakar/Intern-Communications_JR002'}],total:2},url);
  return response({jobPostings:[],total:0},url);
 };
 const result=await adapter(fake).searchWorkday();
 assert.equal(result.entries.length,2);
 assert.equal(new Set(result.entries.map(e=>e.row.externalPath)).size,2);
 assert.equal(result.host_errors.length,0);
});

test('WFP canonical official vacancy URLs retain the provider Workday recruiting job route',()=>{
 const workday=readFileSync(new URL('../api/wfp-openings.js',import.meta.url),'utf8');
 const filter=readFileSync(new URL('../lib/exact-internship-publishing.js',import.meta.url),'utf8');
 assert.match(workday,/recruiting\/wfp\/job_openings/);
 assert.doesNotMatch(workday,/host}\/en-US\/recruiting/);
 assert.match(filter,/provider==='WFP'/);
});

test('Workday listing requests use at most 20 entries and only official WFP hosts',async()=>{
 const requests=[];
 const fake=async(url,options)=>{requests.push({url,payload:JSON.parse(options.body)});return response({jobPostings:[],total:0},url)};
 await adapter(fake).searchWorkday();
 assert.equal(requests.length,2);
 assert.ok(requests.every(x=>x.payload.limit===20&&x.payload.offset===0));
 assert.ok(requests.every(x=>['wd3.myworkdaysite.com','wfp.wd3.myworkdayjobs.com'].includes(new URL(x.url).hostname)));
});
