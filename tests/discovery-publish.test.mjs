import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../api/discover.js',import.meta.url),'utf8')
  .replace(/^import .*;\s*$/gm,'')
  .replace('export default async function handler','async function handler')
  .replace(/^export \{ publish, fetchOfficial \};\s*$/gm,'');
const getPublish=new Function('discoveryId',source+'\nreturn publish;');
const publish=getPublish(()=> 'AUTO-TEST-0001');
const url='https://scholarships.example.edu/open-2027-scholarship';
const provider={id:'test-source',provider:'Verified University'};
const result={
  verified:true,reasons:[],
  record:{
    title:'University Open 2027 Scholarship',provider:'Verified University',
    type:'Scholarship',destination:'United Kingdom',funding:'Fully Funded',
    deadline:'2027-05-18',openDate:'2026-10-01',status:'Open',
    nationality:['All Nationalities'],education:["Bachelor's degree"],
    fields:['All fields'],benefits:'Tuition fees covered.',
    eligibility:"Bachelor's degree completed."
  },
  evidence:{source_url:url}
};

function mockDb({existing=null,duplicate=false,failPublish=false}={}){
  const statements=[];
  async function sql(strings,...values){
    const statement=strings.join('?');
    statements.push({statement,values});
    if(statement.includes('SELECT id,external_id,title,opportunity_type'))return existing?[existing]:[];
    if(statement.includes('SELECT count(*)::int AS total FROM opportunity_country_routes'))return [{total:0}];
    if(statement.includes('WHERE lower(title)=lower('))return duplicate?[{id:'duplicate'}]:[];
    if(statement.includes('WITH upserted AS')){
      if(failPublish)throw Error('Synthetic publication insert failure');
      return [{id:'created-id'}];
    }
    if(statement.includes('UPDATE opportunities SET'))return [{id:'existing-id'}];
    throw Error('Unexpected database query '+statement.slice(0,100));
  }
  return {sql,statements};
}

test('verified publication uses ONE atomic SQL write for card, rule and monitor source',async()=>{
  const db=mockDb();
  const response=await publish(db.sql,provider,url,result);
  assert.equal(response.status,'published');
  assert.equal(response.id,'created-id');
  assert.equal(response.candidateStored,true);
  const write=db.statements.filter(x=>x.statement.includes('WITH upserted AS'));
  assert.equal(write.length,1);
  assert.match(write[0].statement,/ensured_rule AS/);
  assert.match(write[0].statement,/ensured_education AS/);
  assert.match(write[0].statement,/ensured_field AS/);
  assert.match(write[0].statement,/candidate_registered AS/);
  assert.match(write[0].statement,/published_opportunity_id/);
  assert.match(write[0].statement,/source_registered AS/);
  assert.match(write[0].statement,/INSERT INTO opportunity_eligibility_rules/);
  assert.match(write[0].statement,/INSERT INTO monitored_sources/);
});

test('incomplete source evidence never reaches the public database',async()=>{
  const db=mockDb();
  const response=await publish(db.sql,provider,url,{...result,verified:false,reasons:['deadline missing']});
  assert.equal(response.status,'needs_evidence');
  assert.equal(db.statements.length,0);
});

test('duplicate provider programme title never produces another public record',async()=>{
  const db=mockDb({duplicate:true});
  const response=await publish(db.sql,provider,url,result);
  assert.equal(response.status,'needs_evidence');
  assert.equal(db.statements.some(s=>s.statement.includes('WITH upserted AS')),false);
});

test('if atomic publication fails, it does not report a published result',async()=>{
  const db=mockDb({failPublish:true});
  await assert.rejects(()=>publish(db.sql,provider,url,result),/Synthetic publication insert failure/);
});

test('conflicting existing funding is not overwritten or falsely verified',async()=>{
  const db=mockDb({existing:{
    id:'existing-id',external_id:'SCH-999',title:result.record.title,
    opportunity_type:'Scholarship',funding_type:'Partially Funded',
    eligible_nationalities:['All Nationalities'],education_levels:["Bachelor's degree"]
  }});
  const response=await publish(db.sql,provider,url,result);
  assert.equal(response.status,'needs_evidence');
  assert.equal(db.statements.some(s=>s.statement.includes('UPDATE opportunities SET')),false);
});


test('single-country and single-subject verified scholarship has hard matched rules',async()=>{
 const db=mockDb();
 const restricted={...result,record:{...result.record,
   nationality:['Pakistan'],fields:['Computer Science, AI & Data']}};
 const response=await publish(db.sql,provider,url,restricted);
 assert.equal(response.status,'published');
 const insertion=db.statements.find(item=>item.statement.includes('WITH upserted AS'));
 assert.ok(insertion);
 assert.ok(insertion.values.some(x=>typeof x==='string'&&x.includes('"scope":"explicit_list"')&&x.includes('Pakistan')));
 assert.ok(insertion.values.some(x=>typeof x==='string'&&x.includes('"values":["Computer Science, AI & Data"]')));
 assert.ok(insertion.values.includes('one_of'));
 assert.ok(insertion.values.includes(true));
});
test('verified rechecks with changed nationality or subject cannot silently stamp stored award fresh',async()=>{
 const existing={
  id:'existing-id',external_id:'AUTO-ABCD',title:result.record.title,
  opportunity_type:result.record.type,funding_type:result.record.funding,
  eligible_nationalities:['All Nationalities'],
  education_levels:["Bachelor's degree"],
  fields_of_study:['All fields']
 };
 for(const record of [
  {...result.record,nationality:['Pakistan']},
  {...result.record,fields:['Computer Science, AI & Data']}
 ]){
  const db=mockDb({existing});
  const response=await publish(db.sql,provider,url,{...result,record});
  assert.equal(response.status,'needs_evidence');
  assert.equal(db.statements.some(x=>x.statement.includes('UPDATE opportunities SET')),false);
 }
});
