import crypto from 'node:crypto';
import { parseOfficialFactSheet } from './official-facts.js';

const OPPORTUNITY_TERMS = /\b(scholarships?|fellowships?|internships?|studentships?|funded grants?|graduate programmes?|exchange programmes?|student exchanges?)\b/i;
const UNSAFE_LINK = /\/(?:login|signup|privacy|policy|about|contact|events?|news|blog|social|search|tag|category|download|pdf)(?:\/|$)/i;
const normalize = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&(?:amp|#38);/gi, '&').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();

export function canonicalUrl(raw, base) {
  try {
    const u = new URL(String(raw || ''), base);
    if (u.protocol !== 'https:' || u.username || u.password || u.port && u.port !== '443') return '';
    if (!u.hostname.includes('.') || /^(?:localhost|.*\.localhost|.*\.local)$/i.test(u.hostname)) return '';
    // Do not let discovered or redirected links reach IP literals,
    // loopback hosts or private naming schemes.
    if (/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.startsWith('[') ||
        /\.(?:internal|local|lan|test|invalid)$/i.test(u.hostname)) return '';
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (/^(utm_.+|fbclid|gclid|ts|ref)$/i.test(key)) u.searchParams.delete(key);
    u.searchParams.sort();
    const pathname = u.pathname.replace(/\/+$/, '');
    u.pathname = pathname || '/';
    return u.toString();
  } catch { return ''; }
}

export function officialHostMatches(url, officialUrl) {
  try {
    const a = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    const b = new URL(officialUrl).hostname.toLowerCase().replace(/^www\./, '');
    return a === b;
  } catch { return false; }
}

export function findOfficialLinks(html, sourceUrl, limit = 8, now = new Date()) {
  const year=now.getUTCFullYear();
  // Avoid a fixed set of intake years. University programmes roll over annually.
  const visibleYears=new RegExp('\\b(?:'+[year-1,year,year+1,year+2,year+3].join('|')+')\\b');
  const found = new Map();
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]{0,400}?)<\/a>/gi;
  for (const a of String(html || '').matchAll(pattern)) {
    const title = normalize(a[2]);
    const url = canonicalUrl(a[1], sourceUrl);
    if (!url || !officialHostMatches(url, sourceUrl) || url === canonicalUrl(sourceUrl)) continue;
    if (!title || title.length < 12 || title.length > 160) continue;
    if (!OPPORTUNITY_TERMS.test(title) || UNSAFE_LINK.test(new URL(url).pathname)) continue;
    if (!visibleYears.test(title) && !/\b(apply|application|opportunities|scholarship|fellowship|internship)\b/i.test(new URL(url).pathname)) continue;
    if (!found.has(url)) found.set(url, { url, title });
    if (found.size >= limit) break;
  }
  return [...found.values()];
}

function schemas(html) {
  const result = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  function visit(entry, depth = 0) {
    if (!entry || depth > 3 || result.length >= 100) return;
    if (Array.isArray(entry)) { for (const e of entry) visit(e, depth + 1); return; }
    if (typeof entry !== 'object') return;
    if (entry['@graph']) visit(entry['@graph'], depth + 1);
    result.push(entry);
  }
  for (const match of String(html || '').matchAll(re)) {
    try { visit(JSON.parse(match[1])); } catch {}
  }
  return result;
}

function isoDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:[.+Z-].*)?)?$/.test(value)) return '';
  const d = new Date(value.length === 10 ? value + 'T12:00:00Z' : value);
  // Date.parse normalises impossible dates such as 30 February; never publish them.
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0,10) !== value.slice(0,10) ? '' : value.slice(0,10);
}

function schemeName(x) {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object') return x.name || x.value || '';
  return '';
}

export function verifyCandidate(html, url, provider, now = new Date()) {
  const page = String(html || '');
  const docs = schemas(page);
  const structured = docs.find(s => {
    const ty = [s['@type']].flat().map(String);
    const title = normalize(s.title || s.name);
    return ty.some(t => /^(?:JobPosting|MonetaryGrant|Scholarship|EducationalOccupationalProgram)$/i.test(t)) && OPPORTUNITY_TERMS.test(title);
  });
  const labelled = parseOfficialFactSheet(page);
  // Only promote a labelled page when every required fact is explicit and
  // comes from the programme's own main/article content.
  const found = structured || (labelled.complete ? {
    '@type': /internship/i.test(labelled.title) ? 'JobPosting' : 'Scholarship',
    name:labelled.title, url,
    description:labelled.funding === 'Fully Funded' ? 'Fully funded programme.' : 'Funding stated by provider.',
    qualifications:`${labelled.education}. Nationality: ${labelled.nationality.join(', ')}. Fields: ${labelled.fields.join(', ')}.`,
    applicationStartDate:labelled.openDate,applicationDeadline:labelled.deadline,
    location:{name:labelled.destination}
  } : null);
  const title = normalize(found?.title || found?.name || ((page.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]));
  const validThrough = String(found?.validThrough || found?.applicationDeadline || found?.applicationEndDate || '');
  const deadline = isoDay(validThrough);
  // An application deadline is not proof that applications have opened.
  const startValue = String(found?.applicationStartDate || found?.applicationOpenDate ||
    (/JobPosting/i.test([found?.['@type']].flat().join(' ')) ? found?.datePosted : '') || '');
  const openDate = isoDay(startValue);
  const body = normalize(found?.description || '');
  const qualifications = normalize(found?.qualifications || found?.eligibility || found?.educationalRequirements || '');
  const fullText = [body, qualifications].filter(Boolean).join('. ');
  const statedOpen = /\b(?:applications? (?:are|is) (?:now|currently) open|apply now for (?:this|the) (?:scholarship|fellowship|internship))\b/i.test(fullText);
  const type = /\bintern(ship)?\b/i.test(title) ? 'Internship'
    : /\bfellow(ship)?\b/i.test(title) ? 'Fellowship'
    : /\bscholarship|studentship|grant\b/i.test(title) ? 'Scholarship'
    : /\b(?:student exchange|exchange programme|exchange program)\b/i.test(title) ? 'Exchange / International Programme' : '';
  const funding = !structured && labelled.complete ? (labelled.funding === 'Fully Funded' ? 'Fully Funded' : (/\binternship\b/i.test(title) ? 'Paid' : 'Funding Available'))
    : /\bfully[\s-]?funded\b/i.test(fullText) ? 'Fully Funded'
    : /\b(?:paid internship|paid fellowship|stipend|salary|monthly allowance)\b/i.test(fullText) ? (/\binternship\b/i.test(title) ? 'Paid' : 'Funding Available') : '';
  const nationality = !structured && labelled.complete ? labelled.nationality
    : /\b(?:open to|eligible for|applicants from|students from)\s+(?:students? |applicants? )?(?:of )?(?:all nationalit(?:y|ies)|all countries|any country|worldwide)\b/i.test(fullText)
    ? ['All Nationalities'] : [];
  const education = /\b(?:bachelor(?:'s)?(?: degree)?|undergraduate degree)\b/i.test(qualifications) ? ["Bachelor's degree"]
    : /\b(?:master(?:'s)?(?: degree)?|postgraduate degree)\b/i.test(qualifications) ? ["Master's degree"]
    : /\b(?:high school diploma|secondary school)\b/i.test(qualifications) ? ['Secondary school'] : [];
  const fields = !structured && labelled.complete ? labelled.fields
    : /\b(?:all fields of study|all academic disciplines|any academic discipline|all subject areas)\b/i.test(qualifications) ? ['All fields'] : [];
  const location = found?.jobLocation?.address?.addressCountry || found?.location?.address?.addressCountry || found?.location?.name || '';
  const destination = normalize(schemeName(location) || (typeof location === 'string' ? location : ''));
  const reasons = [];
  if (structured && labelled.complete) {
    const structureFunding = funding;
    if (labelled.deadline!==deadline ||
        (labelled.openDate && openDate && labelled.openDate!==openDate) ||
        (labelled.funding!==structureFunding) ||
        (labelled.nationality.length!==nationality.length || labelled.nationality.some(c=>!nationality.includes(c))) ||
        (labelled.fields.length!==fields.length || labelled.fields.some(c=>!fields.includes(c))) ||
        (labelled.destination.toLowerCase()!==destination.toLowerCase())) {
      reasons.push('structured data conflicts with visible official programme facts');
    }
  }
  // Avoid hiding extra hard eligibility restrictions behind a general
  // "all nationalities" or degree-level phrase.
  if (/\b(?:at least\s+\d+\s+years?\s+(?:of\s+)?(?:professional\s+)?(?:work\s+)?experience|minimum GPA|IELTS\s+\d|TOEFL\s+\d|must be nominated|university nomination|school nomination|age (?:limit|between)|minimum age|maximum age)\b/i.test(fullText)) {
    reasons.push('additional hard eligibility requirements not yet modelled');
  }
  if (!found) reasons.push('no complete programme-specific structured data or labelled fact sheet');
  if (!type) reasons.push('programme type not explicit');
  if (!title || title.length < 15 || title.length > 180) reasons.push('programme title unavailable');
  if (!deadline) reasons.push('exact application deadline unavailable');
  else {
    const today = now.toISOString().slice(0, 10);
    const cap = new Date(now); cap.setUTCFullYear(cap.getUTCFullYear() + 2);
    if (deadline <= today || deadline > cap.toISOString().slice(0, 10)) reasons.push('deadline expired or outside verified cycle');
  }
  if (!openDate && !statedOpen) reasons.push('application opening status not explicit');
  if (openDate && deadline && openDate > deadline) reasons.push('opening date later than deadline');
  if (/\b(?:school nomination|university nomination|nominat(?:e|ion|ed) required)\b/i.test(fullText))
    reasons.push('nomination prerequisite requires route-specific verification');
  if (!funding) reasons.push('funding package not explicit');
  if (!nationality.length) reasons.push('nationality eligibility not explicit');
  if (!education.length) reasons.push('education eligibility not explicit');
  if (!fields.length) reasons.push('field-of-study eligibility not explicit');
  if (!destination) reasons.push('destination not explicit');
  if (normalize(found?.url) && canonicalUrl(found.url, url) !== canonicalUrl(url)) reasons.push('structured-data URL differs from official page');
  return {
    verified: reasons.length === 0,
    reasons,
    record: { title, provider, type, funding, deadline, openDate, status: openDate && openDate > now.toISOString().slice(0,10) ? 'Upcoming' : 'Open', destination, nationality, education,
      fields, eligibility: qualifications.slice(0, 1000), benefits: body.slice(0, 1000), source_url: canonicalUrl(url) },
    evidence: { type: found?.['@type'] || null, evidence_format:structured?'schema.org':labelled.complete?'labelled-main-fact-sheet':'insufficient', labelled_fields:labelled.complete?labelled.evidence:null, deadline_value: validThrough, opening_value: startValue, stated_open: statedOpen,
      structured_title: title, qualifications: qualifications.slice(0, 1000),
      funding_evidence: body.slice(0, 1200), source_url: canonicalUrl(url),
      sha256: crypto.createHash('sha256').update(page).digest('hex') }
  };
}

export function discoveryId(url) {
  return 'AUTO-' + crypto.createHash('sha256').update(canonicalUrl(url)).digest('hex').slice(0, 16).toUpperCase();
}
