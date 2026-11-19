import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyOfficialPage, datesIn } from '../lib/verification-v2.js';

const NOW = new Date('2026-11-19T09:00:00Z');
const URL_ = 'https://www.example.ac.uk/study/scholarships/global-excellence-scholarship';
const page = (title, body) => `<html><head><title>${title} | Example University</title></head><body>
<nav><a href="/">Home</a> Applications are closed for 2019</nav>
<main><h1>${title}</h1>${body}</main><footer>Deadline: 1 January 2020</footer></body></html>`;
const ELIG = '<h2>Eligibility</h2><p>Applicants must hold a bachelor\'s degree.</p><p>Open to students of all nationalities.</p>';

test('dates: UK, US, ordinal and ISO formats; impossible dates rejected', () => {
  assert.deepEqual(datesIn('15th January 2027; March 3, 2027; 2027-04-30; 31 February 2027').map(d => d.iso),
    ['2027-01-15', '2027-03-03', '2027-04-30']);
});

test('current-cycle deadline on a programme page publishes as Open with eligibility kept', () => {
  const r = verifyOfficialPage(page('Global Excellence Scholarship 2027',
    `<p>A fully funded scholarship covering tuition and a monthly stipend.</p>${ELIG}<h2>How to apply</h2><p>Application deadline: 15 January 2027</p>`), URL_, 'Example University', NOW);
  assert.equal(r.decision, 'VERIFIED_OPEN');
  assert.equal(r.record.deadline, '2027-01-15');
  assert.equal(r.record.type, 'Scholarship');
  assert.equal(r.record.funding, 'Fully Funded');
  assert.deepEqual(r.record.nationality, ['All Nationalities']);
  assert.ok(r.record.education.includes("Bachelor's degree"));
});

test('nav/footer text is ignored when the page has a <main> element', () => {
  const r = verifyOfficialPage(page('Global Excellence Scholarship 2027', `${ELIG}<p>Deadline: 15 January 2027</p>`), URL_, 'X', NOW);
  assert.equal(r.decision, 'VERIFIED_OPEN');
});

test('nationality restriction is never widened to worldwide', () => {
  const r = verifyOfficialPage(page('Africa Leaders Fellowship 2027',
    '<h2>Eligibility</h2><p>Open to all nationalities of the following: applicants must be citizens of Kenya, Ghana or Nigeria.</p><p>Applications close on 1 March 2027</p>'), URL_, 'X', NOW);
  assert.deepEqual(r.record.nationality, ['Restricted - see official criteria']);
  assert.match(r.record.nationality_restriction, /citizens of Kenya, Ghana or Nigeria/);
});

test('old page with only an elapsed deadline is Closed, never Open', () => {
  const r = verifyOfficialPage(page('Global Excellence Scholarship 2025', `${ELIG}<p>Deadline: 15 January 2025</p>`), URL_, 'X', NOW);
  assert.equal(r.decision, 'CLOSED');
  assert.equal(r.publishable, false);
});

test('explicit closed statement plus reopen wording becomes Expected to Reopen', () => {
  const r = verifyOfficialPage(page('Global Excellence Scholarship', `${ELIG}<p>Applications for this round are now closed. The next call will open in autumn.</p>`), URL_, 'X', NOW);
  assert.equal(r.decision, 'EXPECTED_TO_REOPEN');
  assert.equal(r.record.status, 'Expected to Reopen');
});

test('future opening date is Upcoming, not Open', () => {
  const r = verifyOfficialPage(page('Research Fellowship 2027', `${ELIG}<p>Applications will open on 10 January 2027.</p><p>Deadline: 28 February 2027</p>`), URL_, 'X', NOW);
  assert.equal(r.decision, 'VERIFIED_UPCOMING');
  assert.equal(r.record.status, 'Opening Soon');
});

test('rolling programmes are Rolling', () => {
  const r = verifyOfficialPage(page('Graduate Internship Programme', `${ELIG}<p>Applications are accepted on a rolling basis.</p>`), URL_, 'X', NOW);
  assert.equal(r.decision, 'VERIFIED_ROLLING');
});

test('a date that is not a deadline (funding period, results) is not used', () => {
  const r = verifyOfficialPage(page('Global Excellence Scholarship', `${ELIG}<p>The award covers tuition until 31 August 2028.</p><p>Results will be announced by 30 April 2027.</p>`), URL_, 'X', NOW);
  assert.equal(r.record.deadline, '');
  assert.equal(r.decision, 'NEEDS_REVIEW');
});

test('job rosters are rejected, not classified as internships', () => {
  const r = verifyOfficialPage(page('Senegal Administrative Assistant Roster', '<p>Stipend provided. Deadline: 20 December 2026</p>'), URL_, 'X', NOW);
  assert.equal(r.decision, 'REJECTED');
});

test('conflicting open and closed statements go to review', () => {
  const r = verifyOfficialPage(page('Global Excellence Scholarship', `${ELIG}<p>Applications are now open.</p><p>Applications are closed.</p>`), URL_, 'X', NOW);
  assert.equal(r.decision, 'NEEDS_REVIEW');
});

test('no eligibility information blocks publication', () => {
  const r = verifyOfficialPage(page('Global Excellence Scholarship', '<p>Deadline: 15 January 2027</p>'), URL_, 'X', NOW);
  assert.equal(r.decision, 'NEEDS_REVIEW');
  assert.ok(r.reasons.includes('no eligibility information on the page'));
});

test('listing pages with many programmes are not programme evidence', () => {
  const items = Array.from({ length: 7 }, (_, i) => `<h3>Scholarship ${i}</h3><p>Deadline: ${i + 1} February 2027</p>`).join('');
  const r = verifyOfficialPage(page('Our scholarships', ELIG + items), URL_, 'X', NOW);
  assert.equal(r.decision, 'NEEDS_REVIEW');
});

test('consent and anti-bot pages are never evidence', () => {
  const r = verifyOfficialPage('<html><body><h1>Just a moment...</h1></body></html>', URL_, 'X', NOW);
  assert.equal(r.decision, 'NEEDS_REVIEW');
});
