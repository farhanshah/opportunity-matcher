// Writes a "Programmes tracked in this category" section into every static
// hub page, and a "Live status" link into each /programmes/* guide, from
// data/programme-index.json (a snapshot of the `opportunities` table).
//
// Regenerate after the catalogue changes:
//   node tools/build-programme-links.mjs
// Only stable facts are written (name, provider, funding type, destination).
// Status and deadlines live on the linked /opportunity/* page, so hubs can't
// go stale. Content between the markers is replaced; nothing else changes.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pathFor, esc } from '../lib/programme-pages.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const START = '<!-- programme-index:start -->', END = '<!-- programme-index:end -->';
const rows = JSON.parse(readFileSync(join(root, 'data/programme-index.json'), 'utf8'));

const text = r => [r.title, r.provider, r.destination_country, ...(r.education_levels || []), ...(r.fields_of_study || [])].join(' ');
const dest = re => r => re.test(r.destination_country || '');
const isType = t => r => r.opportunity_type === t;
const and = (...fs) => r => fs.every(f => f(r));
const or = (...fs) => r => fs.some(f => f(r));
const has = re => r => re.test(text(r));
const title = re => r => re.test(r.title || '');
const level = re => r => (r.education_levels || []).some(l => re.test(String(l).trim()));
const EUROPE = /United Kingdom|France|Germany|Switzerland|Netherlands|Belgium|Hungary|Sweden|Luxembourg|Europe|Geneva|Paris|Türkiye/i;
const ASIA_PACIFIC = /Japan|Korea|China|Taiwan|Singapore|Australia|New Zealand|Aotearoa|Asia|Philippines|Okinawa/i;
const UN = /\b(UNICEF|UNDP|UNESCO|UNHCR|WFP|WHO|FAO|ILO|IOM|ITU|UNOPS|UNFPA|IFAD|WIPO|United Nations|UN Volunteers)\b/;
const IO = /\b(UNICEF|UNDP|UNESCO|UNHCR|WFP|WHO|FAO|ILO|IOM|ITU|UNOPS|UNFPA|IFAD|WIPO|WTO|World Bank|IMF|International Monetary Fund|OECD|ADB|Asian Development Bank|AIIB|EBRD|European Investment Bank|European Central Bank|IDB|Inter-American|CERN|ESA|European Space Agency|United Nations|World Trade|World Health|International Labour|World Food|Food and Agriculture|International Fund|International Organization|International Telecommunication|World Intellectual)\b/i;
const sch = isType('Scholarship'), intern = isType('Internship'), fel = isType('Fellowship'), exch = isType('Exchange / International Programme');

export const HUBS = {
  'scholarships/index.html': sch,
  'scholarships/countries/index.html': sch,
  'scholarships/uk/index.html': and(sch, dest(/United Kingdom|\bUK\b/)),
  'scholarships/usa/index.html': and(sch, dest(/United States|USA/)),
  'scholarships/canada/index.html': and(sch, dest(/Canada/)),
  'scholarships/germany/index.html': and(sch, dest(/Germany/)),
  'scholarships/australia/index.html': and(sch, dest(/Australia/)),
  'scholarships/japan/index.html': and(sch, dest(/Japan/)),
  'scholarships/south-korea/index.html': and(sch, dest(/Korea/)),
  'scholarships/europe/index.html': and(sch, dest(EUROPE)),
  'scholarships/asia-pacific/index.html': and(sch, dest(ASIA_PACIFIC)),
  'scholarships/middle-east/index.html': and(sch, dest(/Saudi|Emirates|UAE|Qatar|Middle East|Türkiye|Turkey/)),
  // education_levels mixes the degree applicants must HOLD ("Bachelor's degree
  // completed") with the level they will STUDY ("master", "phd"); level hubs use
  // the programme name plus study-level values only.
  'scholarships/masters/index.html': and(sch, or(title(/master'?s|graduate|postgraduate/i), level(/^(master|master's degree|postgraduate|graduate)$/i), level(/bachelor'?s degree (completed|or equivalent)/i))),
  'scholarships/phd/index.html': and(sch, or(title(/\bphd\b|doctoral|research students?|graduate research/i), level(/^(phd|phd student|doctoral|postgraduate research)$/i))),
  'scholarships/undergraduate/index.html': and(sch, or(title(/undergraduate/i), level(/^(secondary school|undergraduate|bachelor)$/i))),
  'scholarships/for/index.html': and(sch, r => r.restricted === true),
  'internships/index.html': intern,
  'internships/international-organisations/index.html': and(intern, has(IO)),
  'internships/united-nations/index.html': and(intern, has(UN)),
  'internships/europe/index.html': and(intern, dest(EUROPE)),
  'internships/japan/index.html': and(intern, dest(/Japan|Okinawa/)),
  'internships/paid/index.html': and(intern, r => /paid|stipend/i.test(r.funding_type || '') && !/unpaid/i.test(r.funding_type || '')),
  'internships/remote/index.html': and(intern, has(/remote/i)),
  'internships/research-summer/index.html': and(intern, has(/research|summer/i)),
  'internships/tech/index.html': and(intern, or(has(/technolog|computer|engineering|data|digital|physics|space/i), has(/CERN|ESA|ITU/))),
  'fellowships/index.html': fel,
  'fellowships/leadership/index.html': and(fel, has(/leader|leadership|world fellows|eisenhower|obama|ibrahim|mandela|acumen|atlantic/i)),
  'fellowships/research/index.html': and(fel, has(/research|science|scholar|academic|radcliffe|journalis|reuters|nieman|knight/i)),
  'fellowships/policy-and-ai/index.html': and(fel, has(/policy|governance|law|ocean|climate|\bai\b|development|intellectual property/i)),
  'exchange-programs/index.html': exch,
  'exchange-programs/volunteering/index.html': and(exch, has(/volunteer|solidarity|community/i)),
  'exchange-programs/summer-schools/index.html': and(exch, has(/summer|institute|susi/i)),
  'exchange-programs/youth-conferences/index.html': and(exch, has(/youth|leader|onebeat|fellows/i))
};

const typeWord = { Scholarship: 'scholarships', Internship: 'internships', Fellowship: 'fellowships', 'Exchange / International Programme': 'programmes' };
const facts = r => [r.provider, r.funding_type && !/see official/i.test(r.funding_type) ? r.funding_type : '', r.destination_country].filter(Boolean).join(' · ');

export function hubSection(matches) {
  const kinds = [...new Set(matches.map(r => typeWord[r.opportunity_type] || 'programmes'))];
  const noun = kinds.length === 1 ? kinds[0] : 'programmes';
  return START + `<section class="programmeIndex"><h2>${matches.length} ${noun} tracked in this category</h2>` +
    `<p>Each one links to its own page with the current status, deadline, eligibility and the official source, re-checked against the provider.</p>` +
    `<div class="grid">${matches.map(r => `<article class="card"><h3><a href="${esc(pathFor(r))}">${esc(r.title)}</a></h3><p>${esc(facts(r))}</p></article>`).join('')}</div>` +
    `<p><a href="/opportunity">See all ${rows.length} programmes with their current status →</a></p></section>` + END;
}

function inject(html, block) {
  if (html.includes(START)) return html.replace(new RegExp(START + '[\\s\\S]*?' + END), block);
  // After the source-caution note, else before the first <section>, else before </main>.
  if (/<\/aside>/.test(html)) return html.replace(/<\/aside>/, '</aside>' + block);
  if (/<section/.test(html)) return html.replace(/<section/, block + '<section');
  return html.replace('</main>', block + '</main>');
}

// /programmes/<slug>/ guides → their catalogue record, by distinctive title words.
const STOP = new Set(['the', 'and', 'for', 'of', 'programme', 'program', 'scholarship', 'scholarships', 'internship', 'fellowship', 'students', 'student', 'international', 'summer', 'government', 'excellence']);
const words = s => new Set(String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 2 && !STOP.has(w) && !/^20\d\d$/.test(w)));
// Every distinctive word of the guide's URL slug must appear in the record's
// title/provider; curated records win ties over auto-discovered ones.
export function matchProgramme(slug) {
  const want = [...words(slug.replace(/-/g, ' '))];
  if (!want.length) return null;
  const hits = rows.filter(r => { const got = words(r.title + ' ' + r.provider); return want.every(w => got.has(w)); });
  return hits.sort((a, b) => (a.external_id.startsWith('AUTO-') ? 1 : 0) - (b.external_id.startsWith('AUTO-') ? 1 : 0))[0] || null;
}

export function build({ write = true } = {}) {
  const report = [];
  for (const [file, rule] of Object.entries(HUBS)) {
    const p = join(root, file);
    if (!existsSync(p)) { report.push([file, 'missing']); continue; }
    const matches = rows.filter(rule).sort((a, b) => a.title.localeCompare(b.title));
    const html = readFileSync(p, 'utf8');
    const next = matches.length ? inject(html, hubSection(matches)) : html.replace(new RegExp(START + '[\\s\\S]*?' + END), '');
    if (write && next !== html) writeFileSync(p, next);
    report.push([file, matches.length]);
  }
  for (const dir of readdirSync(join(root, 'programmes'), { withFileTypes: true }).filter(d => d.isDirectory())) {
    const p = join(root, 'programmes', dir.name, 'index.html');
    if (!existsSync(p)) continue;
    const html = readFileSync(p, 'utf8');
    const r = matchProgramme(dir.name);
    if (!r) { report.push(['programmes/' + dir.name, 'no catalogue match']); continue; }
    const block = START + `<aside class="note"><strong>Live status:</strong> current status, deadline and official source for ` +
      `<a href="${esc(pathFor(r))}">${esc(r.title)}</a> – re-checked against the provider.</aside>` + END;
    const next = html.includes(START) ? html.replace(new RegExp(START + '[\\s\\S]*?' + END), block)
      : /<\/h1>/.test(html) ? html.replace(/(<\/h1>(?:\s*<p[^>]*>[\s\S]*?<\/p>)?)/, '$1' + block) : html;
    if (write && next !== html) writeFileSync(p, next);
    report.push(['programmes/' + dir.name, r.external_id + ' ' + r.title]);
  }
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [f, n] of build({ write: !process.argv.includes('--dry') })) console.log(String(n).padEnd(70), f);
}
