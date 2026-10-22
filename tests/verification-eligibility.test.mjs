import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {exactVerifiedEligibility,eligibilityRecheckCompatible} from '../lib/verification-eligibility.js';

test('exact eligibility matches country, education and study field in any order',()=>{
 const stored={eligible_nationalities:['Pakistan','United Kingdom'],education_levels:["Bachelor's degree"],fields_of_study:['Computer Science, AI & Data']};
 const extracted={nationality:['United Kingdom','Pakistan'],education:["Bachelor's degree"],fields:['Computer Science, AI & Data']};
 assert.equal(eligibilityRecheckCompatible(stored,extracted),true);
});
test('unknown fields, citizenship or degree never receive a verified timestamp',()=>{
 const current={eligible_nationalities:['Pakistan'],education_levels:["Bachelor's degree"],fields_of_study:['Computer Science, AI & Data']};
 const fresh={nationality:['Pakistan'],education:["Bachelor's degree"],fields:['Computer Science, AI & Data']};
 for(const modified of [
   {...fresh,nationality:['All Nationalities']},
   {...fresh,nationality:[]},
   {...fresh,fields:['All fields']},
   {...fresh,fields:[]},
   {...fresh,education:["Master's degree"]},
   {...fresh,education:[]}
 ]) assert.equal(eligibilityRecheckCompatible(current,modified),false);
 assert.equal(exactVerifiedEligibility([],['Pakistan']),false);
 assert.equal(exactVerifiedEligibility(['Pakistan'],[]),false);
});
test('catalogue and new-publication cycle verification share the same exact-match gate',()=>{
 const a=readFileSync(new URL('../api/reverify.js',import.meta.url),'utf8');
 const b=readFileSync(new URL('../api/discover.js',import.meta.url),'utf8');
 assert.match(a,/eligibilityRecheckCompatible\(opp,report\.record\)/);
 assert.match(b,/eligibilityRecheckCompatible\(o,r\)/);
 assert.doesNotMatch(a,/oldCountry\.includes\('all nationalit'\)/);
 assert.doesNotMatch(a,/eligible_nationalities=CASE WHEN/);
});
