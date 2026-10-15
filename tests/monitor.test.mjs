import test from 'node:test';
import assert from 'node:assert/strict';
import { meaningfulChange, extractSignals } from '../lib/monitor.js';

test('reordering extracted facts does not create another alert', () => {
  const before={dates:['19 October 2026','25 October 2026'],
    eligibility:['All nationalities.','Bachelor degree required.'],application:[],funding:[]};
  const after={dates:['25 October 2026','19 October 2026'],
    eligibility:['Bachelor degree required.','All nationalities.'],application:[],funding:[]};
  assert.equal(meaningfulChange(before,after),null);
});

test('unrelated dates from a page should not become application deadlines', () => {
  const text='News dated 12 October 2026. Our company celebrates 25 June 2026. '+
    'Applications close 19 November 2026. Funding covers tuition.';
  const s=extractSignals(text);
  assert.deepEqual(s.dates,['19 November 2026']);
});

test('changing a real application deadline still raises a meaningful alert', () => {
  const before=extractSignals('Applications close 19 November 2026. Funding covers tuition.');
  const after=extractSignals('Applications close 20 November 2026. Funding covers tuition.');
  const result=meaningfulChange(before,after);
  assert.ok(result);
  assert.ok(result.changed.includes('dates'));
});

test('long navigation blocks with timestamps do not manufacture application changes', () => {
  const text='Apply scholarship '.repeat(90)+' Applications close 23 October 2026.';
  const signals=extractSignals(text);
  assert.deepEqual(signals.application,[]);
});
