// Tiered official-page verification (v2).
//
// v1 (verifyCandidate in auto-discovery.js) only reads schema.org JSON-LD or a
// complete labelled fact sheet. Almost no scholarship/fellowship page has
// either, so v1 extracts nothing and rejects 100% of real pages.
//
// v2 reads the programme's own visible text, scores each field separately and
// returns one of several decisions instead of a single boolean:
//   VERIFIED_OPEN | VERIFIED_UPCOMING | VERIFIED_ROLLING | EXPECTED_TO_REOPEN
//   CLOSED | NEEDS_REVIEW | REJECTED
// It never invents a deadline, never widens nationality eligibility and never
// calls something open because an old page still exists.
import { verifyCandidate, isProviderConsentOrBlockPage } from './auto-discovery.js';

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const ORD = '(?:st|nd|rd|th)?';
const DATE_RE = new RegExp(
  `(\\d{1,2})${ORD}(?:\\s+of)?\\s+${MONTH}\\.?,?\\s+(20\\d{2})` +
  `|${MONTH}\\.?\\s+(\\d{1,2})${ORD},?\\s+(20\\d{2})` +
  `|\\b(20\\d{2})-(\\d{2})-(\\d{2})\\b`, 'gi');

const DEADLINE_CUE = /\b(?:deadline|closing date|clos(?:es|ing)(?:\s+(?:on|at|date))?|applications?\s+close|apply by|apply before|applications?\s+(?:must\s+be\s+)?(?:submitted|received|due)|due (?:date|by)|submission (?:date|deadline)|last date(?: to apply| for applications)?|no later than)\b/i;
const NOT_DEADLINE = /\b(?:results?|interviews?|notif(?:y|ication)|announce(?:d|ment)|start(?:s|ing)? date|programme (?:starts|begins)|program (?:starts|begins)|commenc|orientation|arrival|published|posted|updated|webinar|info(?:rmation)? session|event)\b/i;
const OPEN_DATE_CUE = /\b(?:applications?\s+(?:will\s+)?open(?:s|ing)?(?:\s+on|\s+from)?|opening date|call opens|portal opens|application period(?:\s+starts)?|open from)\b/i;

const STATUS = {
  open: /\b(?:applications?\s+(?:are|is)\s+(?:now\s+)?open|now accepting applications|currently accepting applications|(?:call|portal|application (?:window|period|round))\s+is\s+(?:now\s+)?open|applications?\s+(?:are\s+)?now\s+being\s+accepted)/i,
  closed: /\b(?:applications?\s+(?:are|is|have)\s+(?:now\s+)?closed|(?:call|portal|application (?:window|period|round))\s+(?:is|has)\s+(?:now\s+)?closed|no longer accepting applications|closed for applications|applications? (?:for this|for the current) (?:round|cycle|year) (?:are|have) (?:now )?(?:been )?closed|deadline has passed)\b/i,
  upcoming: /\b(?:applications?\s+will\s+open|will open (?:on|in)|not yet open|call will (?:be )?(?:launched|open)|opens? (?:on|in) (?:early |mid-|late )?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i,
  rolling: /\b(?:rolling basis|rolling admissions?|rolling deadline|accepted (?:on a rolling basis|year-round|throughout the year)|no (?:fixed )?(?:application )?deadline|apply (?:at )?any time)\b/i,
  reopen: /\b(?:will re-?open|next (?:call|round|intake|cycle|application round)(?:\s+\w+){0,3}\s+(?:open|be announced|launch)|re-?opens? in)\b/i
};

const TYPE_FROM = [
  ['Internship', /\b(?:intern(?:ship)?s?|traineeships?)\b/i],
  ['Fellowship', /\bfellowships?\b/i],
  ['Scholarship', /\b(?:scholarships?|studentships?|bursar(?:y|ies)|tuition (?:fee )?waivers?|funded (?:phd|master'?s|doctoral) (?:positions?|places?))\b/i],
  ['Competition', /\b(?:competitions?|challenge|hackathon|prize|awards? programme)\b/i],
  ['Exchange / International Programme', /\b(?:student exchange|exchange programm?e|study abroad programm?e|summer school)\b/i]
];
// A job roster, procurement call or consultancy is never an internship just
// because it has an application form, a deadline or a stipend.
const NOT_EDUCATION = /\b(?:rosters?|vacanc(?:y|ies)|consultan(?:t|cy|ts)|job (?:opening|posting)|recruitment of staff|tenders?|procurement|request for (?:proposals|quotations)|expression of interest for (?:services|suppliers))\b/i;

const ELIGIBILITY_HEAD = /\b(?:eligib(?:le|ility)|who can apply|who is eligible|requirements|criteria|applicant profile|candidate profile)\b/i;

const CC_TLD = { uk:'United Kingdom', de:'Germany', fr:'France', nl:'Netherlands', ca:'Canada', au:'Australia', jp:'Japan', kr:'South Korea', cn:'China', se:'Sweden', ch:'Switzerland', no:'Norway', dk:'Denmark', fi:'Finland', ie:'Ireland', nz:'New Zealand', sg:'Singapore', it:'Italy', es:'Spain', be:'Belgium', at:'Austria', hu:'Hungary', tr:'Turkey', tw:'Taiwan', hk:'Hong Kong', pl:'Poland', cz:'Czechia', pt:'Portugal', is:'Iceland', ee:'Estonia', za:'South Africa' };

const decode = s => String(s || '')
  .replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;|&#38;/gi, '&').replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'").replace(/&ndash;|&mdash;|&#821[12];/gi, '-')
  .replace(/&[a-z]+;/gi, ' ');

export function visibleLines(html) {
  let page = String(html || '');
  const scoped = page.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || page.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  let body = scoped ? scoped[1] : (page.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [, page])[1];
  body = body.replace(/<(script|style|noscript|svg|template|iframe|form)\b[\s\S]*?<\/\1>/gi, ' ');
  if (!scoped) body = body.replace(/<(nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, ' ');
  body = body.replace(/<\/(?:p|div|li|dd|dt|section|h[1-6]|tr|td|th|ul|ol|table|blockquote)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
  return decode(body.replace(/<[^>]+>/g, ' ')).split('\n')
    .map(x => x.replace(/[ \t\r]+/g, ' ').trim()).filter(x => x.length > 1 && x.length <= 600);
}

function toIso(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date.toISOString().slice(0, 10) : '';
}
function monthIndex(name) {
  const n = String(name).toLowerCase().slice(0, 3);
  return MONTHS.findIndex(m => m.startsWith(n)) + 1;
}
export function datesIn(text) {
  const out = [];
  for (const m of String(text).matchAll(DATE_RE)) {
    let iso = '';
    if (m[1]) iso = toIso(+m[3], monthIndex(m[2]), +m[1]);
    else if (m[4]) iso = toIso(+m[6], monthIndex(m[4]), +m[5]);
    else if (m[7]) iso = toIso(+m[7], +m[8], +m[9]);
    if (iso) out.push({ iso, index: m.index });
  }
  return out;
}

// Dates that appear in a deadline/opening statement in the same line or the
// line straight after a deadline label ("Deadline:" / "15 January 2027").
function cuedDates(lines, cue) {
  const found = [];
  lines.forEach((line, i) => {
    const pairs = [[line, line]];
    if (cue.test(line) && line.length < 60 && lines[i + 1]) pairs.push([line, lines[i + 1]]);
    for (const [label, text] of pairs) {
      if (!cue.test(label)) continue;
      for (const d of datesIn(text)) {
        const window = text.slice(Math.max(0, d.index - 140), d.index);
        const cueHere = label !== text || cue.test(window);
        if (!cueHere) continue;
        if (NOT_DEADLINE.test(text.slice(Math.max(0, d.index - 70), d.index))) continue;
        found.push({ iso: d.iso, snippet: text.slice(0, 220) });
      }
    }
  });
  return found;
}

function firstMatch(lines, re) {
  for (const l of lines) { const m = l.match(re); if (m) return l.slice(0, 240); }
  return '';
}

function eligibilityLines(lines) {
  // Lines in/after an eligibility heading plus any line naming citizenship,
  // nationality or degree level.
  const out = [];
  let inSection = 0;
  for (const l of lines) {
    if (ELIGIBILITY_HEAD.test(l) && l.length < 90) { inSection = 12; continue; }
    if (inSection > 0) { out.push(l); inSection--; continue; }
    if (/\b(?:citizens?|nationals?|nationalit(?:y|ies)|residents? of|countries|bachelor|master'?s|phd|doctora|undergraduate|postgraduate|graduate degree|years? of (?:work|professional) experience|aged? (?:between|under|over)|ielts|toefl)\b/i.test(l)) out.push(l);
  }
  return out.slice(0, 60);
}

function nationalityFrom(lines) {
  const text = lines.join(' \n ');
  const restricted = text.match(/[^.\n]{0,120}\b(?:citizens? of|nationals? of|must (?:be|hold) (?:a )?(?:citizen|national|passport|resident)|applicants? from|students? from|residents? of|eligible countries|developing countries|commonwealth countries|low[- ](?:and|&)[- ]middle[- ]income|lmics?|least developed countries|african countries|eu\/eea|european union)\b[^.\n]{0,160}/i);
  const worldwide = /\b(?:open to (?:all )?(?:students|applicants|candidates)?\s*(?:of|from)?\s*(?:all|any) (?:nationalit(?:y|ies)|countr(?:y|ies))|regardless of (?:their )?nationality|(?:all|any) nationalit(?:y|ies) (?:are|is|may) (?:eligible|welcome)|international students from all countries|open to all international (?:students|applicants))\b/i.test(text);
  // Restriction always wins: never turn "citizens of X, Y and Z" into worldwide.
  if (restricted && !/\bnot (?:open to|available to)\b/i.test(restricted[0]))
    return { value: ['Restricted - see official criteria'], restriction: restricted[0].trim().slice(0, 280), confidence: 'medium' };
  if (worldwide) return { value: ['All Nationalities'], restriction: '', confidence: 'medium' };
  return { value: [], restriction: '', confidence: 'none' };
}

function educationFrom(title, lines) {
  const text = title + ' \n ' + lines.join(' \n ');
  const levels = [];
  if (/\b(?:bachelor'?s?|undergraduate)\b/i.test(text)) levels.push("Bachelor's degree");
  if (/\b(?:master'?s?|postgraduate|msc|m\.sc|mba|llm)\b/i.test(text)) levels.push("Master's degree");
  if (/\b(?:phd|ph\.d|doctoral|doctorate|dphil)\b/i.test(text)) levels.push('PhD');
  if (/\b(?:postdoc(?:toral)?)\b/i.test(text)) levels.push('Postdoctoral');
  if (/\b(?:high school|secondary school)\b/i.test(text)) levels.push('Secondary school');
  return levels;
}

function fundingFrom(lines) {
  const text = lines.join(' \n ');
  if (/\bfully[\s-]?funded\b/i.test(text) || /\b(?:full|100%) (?:tuition|scholarship)\b[^.]{0,80}\b(?:stipend|allowance|living)\b/i.test(text)) return 'Fully Funded';
  if (/\bunpaid\b/i.test(text)) return 'Unpaid';
  if (/\b(?:stipend|monthly allowance|living allowance|salary|paid internship|tuition (?:fee )?(?:waiver|covered|coverage)|covers? (?:tuition|travel|accommodation)|grant of|award of|bursary of|[€£$]\s?\d)/i.test(text)) return 'Funding Available';
  return '';
}

function typeFrom(title, path, lines) {
  for (const [type, re] of TYPE_FROM) if (re.test(title)) return { type, confidence: 'high' };
  const head = lines.slice(0, 8).join(' ');
  for (const [type, re] of TYPE_FROM) if (re.test(path.replace(/[-_/]/g, ' ')) && re.test(head)) return { type, confidence: 'medium' };
  return { type: '', confidence: 'none' };
}

function destinationFrom(html, url) {
  const ld = String(html).match(/"addressCountry"\s*:\s*"([^"]{2,60})"/i);
  if (ld) return { value: ld[1], confidence: 'high' };
  try {
    const tld = new URL(url).hostname.split('.').pop().toLowerCase();
    if (CC_TLD[tld]) return { value: CC_TLD[tld], confidence: 'low' };
  } catch {}
  return { value: '', confidence: 'none' };
}

const addMonths = (now, n) => { const d = new Date(now); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };

export function verifyOfficialPage(html, url, provider, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const page = String(html || '');
  const reasons = [];
  const uncertain = [];

  if (isProviderConsentOrBlockPage(page))
    return { decision: 'NEEDS_REVIEW', reasons: ['provider returned a consent or anti-bot page'], fields: {}, uncertain: [], publishable: false };

  // v1 structured/fact-sheet evidence is still the strongest signal.
  const v1 = verifyCandidate(page, url, provider, now);
  const lines = visibleLines(page);
  const h1 = decode((page.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const og = decode((page.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || [])[1] || '').trim();
  const docTitle = decode((page.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
  let title = (v1.record.title && v1.record.title.length >= 8 ? v1.record.title : '') || h1 || og || docTitle.split(/\s[|\-–]\s/)[0];
  title = title.slice(0, 180);
  let path = ''; try { path = new URL(url).pathname; } catch {}

  const type = typeFrom(title, path, lines);
  if (NOT_EDUCATION.test(title) && !/\b(?:intern|scholar|fellow|studentship)/i.test(title))
    return { decision: 'REJECTED', reasons: ['page is a job roster, vacancy, consultancy or procurement call, not an education/career programme'], fields: { title }, uncertain: [], publishable: false };
  if (!title || title.length < 8) reasons.push('programme title unavailable');
  if (!type.type) reasons.push('programme type not identifiable from title');

  // Status evidence.
  const text = lines.join('\n');
  const said = Object.fromEntries(Object.entries(STATUS).map(([k, re]) => [k, firstMatch(lines, re)]));
  const deadlines = cuedDates(lines, DEADLINE_CUE);
  const openings = cuedDates(lines, OPEN_DATE_CUE);
  const cycleEnd = addMonths(now, 18);
  const future = [...new Set(deadlines.filter(d => d.iso > today && d.iso <= cycleEnd).map(d => d.iso))].sort();
  const past = [...new Set(deadlines.filter(d => d.iso <= today).map(d => d.iso))].sort();
  const deadline = future[0] || '';
  const openDate = [...new Set(openings.map(d => d.iso))].sort().find(d => !deadline || d <= deadline) || '';

  // Pages listing many programmes are not programme-specific evidence.
  const programmeHeadings = (page.match(/<h[23]\b[^>]*>[\s\S]{0,200}?<\/h[23]>/gi) || [])
    .filter(h => TYPE_FROM.some(([, re]) => re.test(h.replace(/<[^>]+>/g, ' ')))).length;
  const listing = future.length > 4 || programmeHeadings > 6;
  if (listing) reasons.push('page lists several programmes; needs a programme-specific page');

  const elig = eligibilityLines(lines);
  const nationality = nationalityFrom(elig);
  const education = educationFrom(title, elig);
  const funding = (!v1.reasons.includes('funding package not explicit') && v1.record.funding) || fundingFrom(lines);
  const destination = v1.record.destination ? { value: v1.record.destination, confidence: 'high' } : destinationFrom(page, url);
  const hasEligibility = nationality.value.length > 0 || education.length > 0 || lines.some(l => ELIGIBILITY_HEAD.test(l) && l.length < 90);

  let decision; let status = '';
  const conflicting = said.open && said.closed;
  if (v1.verified) { decision = v1.record.status === 'Upcoming' ? 'VERIFIED_UPCOMING' : 'VERIFIED_OPEN'; status = v1.record.status === 'Upcoming' ? 'Opening Soon' : 'Open'; }
  else if (conflicting) { decision = 'NEEDS_REVIEW'; reasons.push('page states both open and closed'); }
  else if (said.closed && !deadline) {
    decision = said.reopen ? 'EXPECTED_TO_REOPEN' : 'CLOSED'; status = said.reopen ? 'Expected to Reopen' : 'Closed';
  } else if (said.upcoming && (!openDate || openDate > today)) { decision = 'VERIFIED_UPCOMING'; status = 'Opening Soon'; }
  else if (openDate && openDate > today) { decision = 'VERIFIED_UPCOMING'; status = 'Opening Soon'; }
  else if (deadline) { decision = 'VERIFIED_OPEN'; status = 'Open'; if (!said.open && !openDate) uncertain.push('open status inferred from a current-cycle deadline on the official page'); }
  else if (said.rolling && !said.closed) { decision = 'VERIFIED_ROLLING'; status = 'Rolling'; }
  else if (past.length && said.reopen) { decision = 'EXPECTED_TO_REOPEN'; status = 'Expected to Reopen'; }
  else if (past.length && !said.open) { decision = 'CLOSED'; status = 'Closed'; uncertain.push('closed status inferred from elapsed deadline ' + past[past.length - 1]); }
  else { decision = 'NEEDS_REVIEW'; reasons.push('no current deadline or explicit status statement on the page'); }

  if (future.length > 1) uncertain.push('multiple deadlines on page (' + future.slice(0, 3).join(', ') + '); earliest used - may be rounds or country-specific');
  if (!funding) uncertain.push('funding not stated');
  if (!nationality.value.length) uncertain.push('nationality eligibility not stated - users told to check the official page');
  if (!education.length) uncertain.push('education level not stated');
  if (destination.confidence === 'low') uncertain.push('destination inferred from official domain');

  // Hard blockers move any VERIFIED_* decision to review.
  const verified = /^(?:VERIFIED_|EXPECTED_TO_REOPEN)/.test(decision);
  if (verified && (reasons.length || !hasEligibility)) {
    if (!hasEligibility) reasons.push('no eligibility information on the page');
    decision = 'NEEDS_REVIEW';
  }
  if (decision === 'CLOSED' && reasons.some(r => /type|title|lists several/.test(r))) decision = 'NEEDS_REVIEW';

  return {
    decision,
    publishable: /^(?:VERIFIED_|EXPECTED_TO_REOPEN)/.test(decision),
    reasons,
    uncertain,
    record: {
      title, provider, type: type.type, status, deadline, openDate,
      funding: funding || 'See official page',
      destination: destination.value, nationality: nationality.value,
      nationality_restriction: nationality.restriction,
      education, fields: v1.record.fields?.length ? v1.record.fields : [],
      source_url: url
    },
    fields: {
      title: { value: title, confidence: v1.record.title ? 'high' : title ? 'medium' : 'none' },
      type: type,
      status: { value: status, confidence: v1.verified || said.open || said.closed || said.upcoming || said.rolling ? 'high' : deadline || past.length ? 'medium' : 'none', evidence: said.open || said.closed || said.upcoming || said.rolling || said.reopen || '' },
      deadline: { value: deadline, confidence: deadline ? (future.length > 1 ? 'medium' : 'high') : 'none', evidence: (deadlines.find(d => d.iso === deadline) || {}).snippet || '', past },
      openDate: { value: openDate, evidence: (openings.find(d => d.iso === openDate) || {}).snippet || '' },
      funding: { value: funding, confidence: funding ? 'medium' : 'none' },
      nationality: nationality,
      education: { value: education, confidence: education.length ? 'medium' : 'none' },
      destination
    },
    v1: { verified: v1.verified, reasons: v1.reasons }
  };
}
