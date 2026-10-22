import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const code=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('overdue source evidence cannot appear as Strong match or Likely eligible',()=>{
 const matcher=code('app-v08-match.js');
 const getEval=new Function('currentProfile','low',matcher+';return evaluate;');
 const evaluate=getEval({nat:'Pakistan',edu:"Bachelor's degree",
    field:'Computer Science, AI & Data',type:'Scholarship',fund:'Fully Funded',expMonths:0},
    v=>String(v||'').toLowerCase());
 const opportunity={Eligible_Nationalities:['All Nationalities'],
    Education_Levels:["Bachelor's degree"],Fields_of_Study:['All fields'],
    Type:'Scholarship',Funding:'Fully Funded',
    Verification_Stale:true};
 const stale=evaluate(opportunity);
 assert.equal(stale.label,'Needs source recheck');
 assert.equal(stale.cls,'review');
 assert.ok(stale.rank<3);
 const current=evaluate({...opportunity,Verification_Stale:false});
 assert.ok(['Strong match','Likely eligible'].includes(current.label));
});
test('historic close dates are not advertised as current countdowns',()=>{
 const codebase=code('app-v08-base.js');
 const start=codebase.indexOf('function days(o)');
 const end=codebase.indexOf('function deadline(o)',start);
 const stop=codebase.indexOf('}',end);
 assert.ok(start>=0&&end>start);
 const fn=new Function(codebase.slice(start,end)+
   codebase.slice(end,stop+1)+';return deadline;')();
 assert.match(fn({Close_Date:'2027-11-30',Status:'Open',Verification_Stale:true}),/verify with provider/);
 assert.match(fn({Status:'Open',Verification_Stale:true}),/needs verification/);
 assert.notEqual(fn({Close_Date:'2027-11-30',Status:'Open',Verification_Stale:false}),
   'Listed deadline · verify with provider');
});
test('homepage Open count and opening badges exclude overdue evidence',()=>{
 const ui=code('app-v08-boot.js');
 assert.match(ui,/Verification_Stale===false&&publicActive\(o\)/);
 assert.match(ui,/Verification_Stale!==false\?'Needs source recheck'/);
 assert.match(ui,/Verification_Stale!==false\)return deadline\(o\)/);
 const drawer=code('app-v08-tracker.js');
 assert.match(drawer,/Status needs source recheck/);
 assert.match(drawer,/Historical source check/);
});
