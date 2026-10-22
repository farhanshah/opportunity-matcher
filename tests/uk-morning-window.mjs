import assert from 'node:assert/strict';
import {isEightAmUK} from '../lib/uk-discovery-window.js';
const check=(iso,expected)=>assert.equal(isEightAmUK(new Date(iso)),expected,iso);
check('2026-10-22T07:00:00Z',true);  // British Summer Time
check('2026-10-22T08:00:00Z',false);
check('2026-10-26T07:00:00Z',false); // Greenwich Mean Time
check('2026-10-26T08:00:00Z',true);
console.log('UK 08:00 discovery scheduling is DST-safe');
