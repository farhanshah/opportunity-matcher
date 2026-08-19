import crypto from 'node:crypto';

export const SOURCE_OPPORTUNITY_MAP = {
  chevening_timeline: 'SCH-001',
  commonwealth_masters: 'SCH-002',
  erasmus_mundus: 'SCH-003',
  rhodes_main: 'SCH-004',
  schwarzman: 'SCH-005',
  knight_hennessy: 'SCH-006',
  clarendon: 'SCH-007',
  weidenfeld: 'SCH-008',
  australia_awards: 'SCH-009',
  manaaki: 'SCH-010',
  si_global_professionals: 'SCH-011',
  daad_scholarships: 'SCH-013',
  world_bank_pioneers: 'INT-001',
  world_bank_treasury: 'INT-002',
  commonwealth_fellowships: 'FEL-001',
  rotary_peace: 'FEL-002',
  atlantic_social_equity: 'FEL-003',
  fulbright_foreign_student: 'PRG-009'
};

export function normalizeHtml(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function sentenceMatches(text, regex, limit = 24) {
  const sentences = text.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
  return [...new Set(sentences.filter(s => regex.test(s)).map(s => s.slice(0, 700)))].slice(0, limit);
}

export function extractSignals(text) {
  const dates = [...new Set((text.match(/\b(?:\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+20\d{2}|20\d{2}-\d{2}-\d{2})\b/gi) || []).map(x => x.trim()))].slice(0, 40);
  return {
    dates,
    application: sentenceMatches(text, /\b(application|applications|apply|deadline|opens?|closes?|closing date)\b/i),
    eligibility: sentenceMatches(text, /\b(eligib|nationalit|citizen|resident|age\b|degree|bachelor|master'?s?|work experience|professional experience|GPA|academic requirement)\b/i),
    funding: sentenceMatches(text, /\b(fully funded|funding|tuition|stipend|allowance|airfare|travel costs?|fees? covered|financial support)\b/i)
  };
}

export function meaningfulChange(previous = {}, current = {}) {
  const groups = ['dates', 'application', 'eligibility', 'funding'];
  const changed = groups.filter(key => JSON.stringify(previous[key] || []) !== JSON.stringify(current[key] || []));
  if (!changed.length) return null;
  let risk = 'low';
  if (changed.includes('eligibility')) risk = 'high';
  else if (changed.includes('funding') || changed.includes('dates') || changed.includes('application')) risk = 'medium';
  return { changed, risk, change_type: changed.join('+') };
}

export function expectedContentPresent(text, expectedTerms) {
  const haystack = text.toLowerCase();
  const terms = Array.isArray(expectedTerms) ? expectedTerms.filter(Boolean) : [];
  return terms.length === 0 || terms.every(term => haystack.includes(String(term).toLowerCase()));
}
