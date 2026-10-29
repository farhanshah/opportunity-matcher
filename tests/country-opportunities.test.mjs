import test from 'node:test';
import assert from 'node:assert/strict';
import {countryFromLocation,liveCountries,countrySlug} from '../lib/country-opportunities.js';
test('country location requires an explicit location rather than inferred eligibility',()=>{
 assert.equal(countryFromLocation('Algiers, Algeria'),'Algeria');
 assert.equal(countryFromLocation('Djibouti, Djibouti'),'Djibouti');
 assert.equal(countryFromLocation('Italy'),'Italy');
 assert.equal(countryFromLocation('World wide / remote'),null);
 assert.equal(countryFromLocation('Asia'),null);
 assert.equal(countryFromLocation('Delhi'),null);
 assert.equal(countrySlug('South Korea'),'south-korea');
});
test('country pages auto-populate from exactly verified vacancy rows',()=>{
 const grouped=liveCountries([{location:'Algeria',title:'Intern 1'},
  {location:'Rome, Italy',title:'Intern 2'},{location:'Rome, Italy',title:'Intern 3'},
  {location:'Remote',title:'Intern 4'}]);
 assert.equal(grouped.length,2);
 assert.equal(grouped.find(x=>x.slug==='italy').records.length,2);
 assert.equal(grouped.find(x=>x.slug==='algeria').records.length,1);
});
