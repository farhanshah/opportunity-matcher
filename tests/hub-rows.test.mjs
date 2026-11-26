import test from 'node:test';
import assert from 'node:assert/strict';
import { hubRows } from '../tools/build-programme-links.mjs';

test('hub cards drop duplicate, generic and foreign-portal re-listings', () => {
  const rows = [
    { external_id: 'SCH-019', title: 'Commonwealth Shared Scholarships', provider: 'Commonwealth Scholarship Commission in the UK' },
    { external_id: 'AUTO-1', title: 'Commonwealth Shared Scholarship Scheme', provider: 'University College London' },
    { external_id: 'AUTO-2', title: 'SWITZERLAND: Swiss Government Excellence Scholarships 2027 – 2028', provider: 'internationalscholarships.dhet.gov.za' },
    { external_id: 'AUTO-3', title: 'Scholarships and funding', provider: 'University College London' },
    { external_id: 'AUTO-4', title: 'Cambridge University Scholarship Deadlines | Gates Cambridge', provider: 'University of Cambridge' },
    { external_id: 'AUTO-5', title: 'Research Excellence Scholarship', provider: 'University College London' },
  ];
  assert.deepEqual(hubRows(rows).map(r => r.external_id).sort(), ['AUTO-5', 'SCH-019']);
});
