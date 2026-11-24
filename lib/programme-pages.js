// Server-rendered, indexable page for every catalogue opportunity
// (table `opportunities`), at /opportunity/<title-slug>-<external-id>.
//
// Everything shown comes from the stored record: no deadline, eligibility or
// funding is inferred. Status is shown together with the date it was last
// confirmed so a stale record is never presented as freshly verified.
const BASE = 'https://oppmatcher.tech';
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CSS = '*{box-sizing:border-box}body{margin:0;background:#f5faf8;color:#13343a;font:16px/1.6 system-ui,Arial,sans-serif}a{color:#08767c}header,footer{background:#10353b;color:white;padding:18px max(18px,calc((100vw - 1100px)/2))}header{display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between}header a,footer a{color:white}nav{display:flex;flex-wrap:wrap;gap:15px}main{max-width:1050px;padding:40px 20px 80px;margin:auto}h1{font-size:clamp(2rem,4vw,3.1rem);line-height:1.12;margin:12px 0}h2{line-height:1.3}p{max-width:78ch}.lead{font-size:1.12rem;color:#46666a}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,295px),1fr));gap:18px;margin:28px 0}.card,.panel{background:#fff;border:1px solid #daeae7;border-radius:14px;padding:23px}.card h2{font-size:1.23rem}.tag{letter-spacing:.11em;text-transform:uppercase;font-size:.78rem;font-weight:bold;color:#08767c}.notice{padding:15px 19px;background:#e7f5f0;border-left:4px solid #08767c;margin:25px 0}.button{display:inline-block;background:#08767c;color:white;padding:10px 18px;text-decoration:none;border-radius:8px;font-weight:700} .state{display:inline-block;border-radius:99px;padding:6px 12px;font-size:.85rem;font-weight:750;background:#daf2e9;color:#00624a}.state.closed{background:#fff0dc;color:#855017}.state.unconfirmed{background:#eaf0f5;color:#3a5469}.related{margin-top:28px;padding:22px;border-radius:14px;background:#edf6f4}.related a{margin-right:18px}dt{font-weight:bold;margin-top:12px}dd{margin:0 0 14px}@media(max-width:600px){main{padding:25px 16px 50px}header,footer{padding:16px}}.facts{display:grid;grid-template-columns:minmax(150px,220px) 1fr;gap:0 18px}.facts dt{margin-top:10px}.facts dd{margin:10px 0 0}.crumbs{font-size:.9rem}.warn{padding:14px 18px;background:#fff6e5;border-left:4px solid #b7791f;margin:22px 0}.faq h3{margin-bottom:4px}ul.plain{padding-left:20px}';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function iso(v) { if (v === null || v === undefined || v === '') return ''; const d = new Date(v); return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : ''; }
export function human(v) { const s = iso(v); if (!s) return ''; const [y, m, d] = s.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; }
const list = v => (Array.isArray(v) ? v : []).map(x => String(x || '').trim()).filter(Boolean);
export function safeUrl(raw) {
  try { const u = new URL(String(raw || '')); return u.protocol === 'https:' && !u.username && !u.password && u.hostname.includes('.') ? u.href : ''; }
  catch { return ''; }
}

export function slugFor(row) {
  const words = String(row.title || 'opportunity').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72).replace(/-[^-]*$/, m => (m.length < 3 ? '' : m)).replace(/-$/, '');
  return (words || 'opportunity') + '-' + String(row.external_id).toLowerCase();
}
export const pathFor = row => '/opportunity/' + slugFor(row);
// The trailing external id (e.g. "sch-020", "auto-5ea1badcf272b8ac") identifies the record.
export function externalIdFromSlug(slug) {
  const m = String(slug || '').toLowerCase().match(/(?:^|-)((?:sch|int|fel|prg|exc|auto)-[a-z0-9]{2,24})$/);
  return m ? m[1].toUpperCase() : '';
}

export function statusView(row, now = new Date()) {
  const s = String(row.status || '').trim() || 'Status not confirmed';
  const today = iso(now);
  const close = iso(row.application_close_date), reopen = iso(row.expected_reopen_date);
  const lastConfirmed = iso(row.last_verified_at);
  const stale = !lastConfirmed || (now - new Date(row.last_verified_at)) > 45 * 86400000;
  let kind = 'unconfirmed';
  if (/^closed/i.test(s)) kind = 'closed';
  else if (/^(open|rolling)/i.test(s)) kind = 'open';
  // A recorded deadline in the past always wins over a stored "open" label.
  const elapsed = close && close < today && !/^closed/i.test(s);
  return { label: elapsed ? 'Deadline passed' : s, kind: elapsed ? 'closed' : kind, close, reopen, reopenPassed: reopen && reopen < today, lastConfirmed, stale };
}

// No year is added to titles: a deadline year is often not the programme
// cycle (applications closing Nov 2026 can be for the 2027 cohort).
function yearHint() { return ''; }
export function metaTitle(row) {
  const base = String(row.title || '').trim() + yearHint(row);
  const full = base + ': Deadline, Eligibility & How to Apply';
  if (full.length <= 68) return full;
  const short = base + ' – Deadline & Eligibility';
  return short.length <= 68 ? short : base.slice(0, 66).replace(/\s\S*$/, '') + '…';
}
export function metaDescription(row, now = new Date()) {
  const st = statusView(row, now);
  const bits = [];
  bits.push(st.label + (st.close ? ` · deadline ${human(st.close)}` : st.reopen && !st.reopenPassed ? ` · expected to reopen ${human(st.reopen)}` : ''));
  const what = [row.funding_type && !/see official/i.test(row.funding_type) ? row.funding_type : '', String(row.opportunity_type || 'opportunity').toLowerCase()].filter(Boolean).join(' ');
  bits.push(`${what} from ${row.provider}${row.destination_country ? ' (' + row.destination_country + ')' : ''}`);
  bits.push('eligibility, official source and how to apply');
  const d = bits.join(' · ');
  return (d.charAt(0).toUpperCase() + d.slice(1)).slice(0, 158);
}

function nationalityText(row) {
  const n = list(row.eligible_nationalities);
  if (!n.length) return 'Not stated in our record – check the official page';
  return n.join(', ');
}

const GUIDES = {
  Scholarship: [['/blog/scholarship-application-process-step-by-step/', 'Scholarship application step by step'], ['/blog/scholarship-application-documents/', 'Documents you will need'], ['/blog/scholarship-eligibility-nationality-rules/', 'How nationality rules work']],
  Internship: [['/blog/international-internships-graduate-placements/', 'International internship applications'], ['/blog/internship-cv-for-students/', 'Internship CV for students'], ['/blog/un-internship-application-checklist/', 'UN internship checklist']],
  Fellowship: [['/blog/research-fellowships-uk-funding-guide/', 'Research fellowships guide'], ['/blog/phd-fellowship-vs-research-grant/', 'Fellowship vs research grant'], ['/blog/scholarship-research-proposal/', 'Writing a research proposal']]
};

function shell(title, description, url, body, jsonld) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="index,follow"><link rel="canonical" href="' + esc(BASE + url) + '"><title>' + esc(title) + '</title>' +
    '<meta name="description" content="' + esc(description) + '"><meta property="og:type" content="article">' +
    '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(description) + '"><meta property="og:url" content="' + esc(BASE + url) + '">' +
    '<meta property="og:site_name" content="OppMatcher"><meta property="og:image" content="https://oppmatcher.tech/api/brand-image?kind=social&amp;v=2">' +
    jsonld.map(x => '<script type="application/ld+json">' + JSON.stringify(x).replace(/</g, '\\u003c') + '</script>').join('') +
    '<link rel="icon" href="/brand-icon.svg" type="image/svg+xml">' +
    '<style>' + CSS + '</style></head><body>' +
    '<header><a href="/"><strong>OppMatcher</strong></a><nav aria-label="Main navigation"><a href="/opportunity">All programmes</a><a href="/scholarships/">Scholarships</a><a href="/internships/">Internships</a><a href="/fellowships/">Fellowships</a><a href="/opportunities">Verified vacancies</a><a href="/blog/">Guides</a><a href="/about">About</a></nav></header>' +
    '<main>' + body + '</main><footer>© OppMatcher · Always confirm details on the official provider page before applying. <a href="/blog/methodology/">How we verify</a> · <a href="/about">About</a> · <a href="/contact">Contact</a> · <a href="/privacy">Privacy</a></footer></body></html>';
}

export function renderProgramme(row, related = [], now = new Date()) {
  const st = statusView(row, now);
  const url = pathFor(row);
  const source = safeUrl(row.official_source_url), apply = safeUrl(row.application_url) || source;
  const type = String(row.opportunity_type || 'Opportunity');
  const facts = [
    ['Status', `<span class="state ${st.kind === 'open' ? '' : st.kind}">${esc(st.label)}</span>`],
    ['Application deadline', st.close ? esc(human(st.close)) : 'Not published in our record'],
    row.application_open_date ? ['Applications open', esc(human(row.application_open_date))] : null,
    st.reopen ? ['Expected to reopen', esc(human(st.reopen)) + (st.reopenPassed ? ' (date passed – not yet re-confirmed)' : '')] : null,
    ['Provider', esc(row.provider)],
    ['Type', esc(type)],
    row.destination_country ? ['Destination', esc(row.destination_country)] : null,
    row.funding_type ? ['Funding', esc(row.funding_type)] : null,
    ['Nationality eligibility', esc(nationalityText(row))],
    list(row.education_levels).length ? ['Education level', esc(list(row.education_levels).join(', '))] : null,
    list(row.fields_of_study).length ? ['Fields of study', esc(list(row.fields_of_study).join(', '))] : null,
    row.minimum_age || row.maximum_age ? ['Age', esc([row.minimum_age ? 'from ' + row.minimum_age : '', row.maximum_age ? 'up to ' + row.maximum_age : ''].filter(Boolean).join(' '))] : null,
    row.minimum_gpa ? ['Minimum GPA', esc(row.minimum_gpa)] : null,
    row.work_experience_months ? ['Work experience', esc(row.work_experience_months + ' months')] : null,
    row.english_requirement ? ['English requirement', esc(row.english_requirement)] : null,
    row.application_fee ? ['Application fee', esc(row.application_fee)] : null,
    row.application_route ? ['How applications are made', esc(row.application_route)] : null
  ].filter(Boolean);
  const notes = String(row.eligibility_notes || '').split(/\s*\|\s*/).map(x => x.trim().replace(/[.;]+$/, '')).filter(x => x && !/^always confirm/i.test(x));
  const benefits = list(row.benefits);
  const guides = GUIDES[type] || GUIDES.Scholarship;
  const confirmed = st.lastConfirmed ? human(st.lastConfirmed) : '';
  const faq = [
    [`What is the deadline for ${row.title}?`, st.close
      ? `Our record shows ${human(st.close)} as the application deadline (status: ${st.label}). Providers can set earlier internal deadlines, so confirm on the official page.`
      : st.reopen ? `No current deadline is published in our record. The programme is expected to reopen around ${human(st.reopen)}${st.reopenPassed ? ' (not yet re-confirmed)' : ''}.`
        : 'No deadline is published in our record. Check the official page for the current cycle.'],
    [`Who can apply for ${row.title}?`, list(row.eligible_nationalities).length
      ? `Nationality eligibility in our record: ${nationalityText(row)}.${notes.length ? ' Other conditions: ' + notes.slice(0, 3).join('; ') + '.' : ''}`
      : `Our record does not state a nationality restriction.${notes.length ? ' Conditions noted: ' + notes.slice(0, 3).join('; ') + '.' : ''} The official page is the authority on eligibility.`],
    row.funding_type && !/see official/i.test(row.funding_type) ? [`Is ${row.title} funded?`, `Funding type in our record: ${row.funding_type}.${benefits.length ? ' Benefits listed: ' + benefits.slice(0, 5).join(', ') + '.' : ''}`] : null,
    [`Where do I apply?`, `Apply only through the official ${row.provider} page${source ? ' (' + new URL(source).hostname + ')' : ''}. OppMatcher does not take applications.`]
  ].filter(Boolean);

  const body =
    `<p class="crumbs"><a href="/">Home</a> › <a href="/opportunity">All programmes</a> › ${esc(type)}</p>` +
    `<p class="tag">${esc(row.provider)} · ${esc(type)}</p><h1>${esc(row.title)}</h1>` +
    `<p class="lead">${esc(row.provider)} ${esc(type.toLowerCase())}${row.destination_country ? ' in ' + esc(row.destination_country) : ''}. ` +
    `Status: <strong>${esc(st.label)}</strong>${st.close ? ` · deadline <strong>${esc(human(st.close))}</strong>` : ''}.</p>` +
    (st.stale ? `<div class="warn">This status was last confirmed against the official source${confirmed ? ' on ' + esc(confirmed) : ''}. Check the official page for the current cycle before applying.</div>` : '') +
    `<p>${apply ? `<a class="button" href="${esc(apply)}" rel="nofollow noopener" target="_blank">Official application page</a> ` : ''}` +
    `${source && source !== apply ? `<a href="${esc(source)}" rel="nofollow noopener" target="_blank">Official programme source</a>` : ''}</p>` +
    `<section class="panel"><h2>Key facts</h2><dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl></section>` +
    (benefits.length ? `<h2>What it offers</h2><ul class="plain">${benefits.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : '') +
    (notes.length ? `<h2>Eligibility and conditions</h2><ul class="plain">${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : '') +
    `<h2>How to apply</h2><ol><li>Read the eligibility rules on the <a href="${esc(source || apply)}" rel="nofollow noopener" target="_blank">official page</a> and confirm the deadline for your country or institution.</li>` +
    `<li>Prepare your documents early – see <a href="${guides[1][0]}">${esc(guides[1][1])}</a>.</li>` +
    `<li>Submit through the official application route${st.close && st.kind !== 'closed' ? ' before ' + esc(human(st.close)) : ''}. Track it in your <a href="/tracker">OppMatcher tracker</a>.</li></ol>` +
    `<div class="notice">Source: <a href="${esc(source)}" rel="nofollow noopener" target="_blank">${esc(source ? new URL(source).hostname : 'official provider')}</a>` +
    `${confirmed ? ` · status last confirmed ${esc(confirmed)}` : ''} · <a href="/blog/methodology/">How we verify</a></div>` +
    `<section class="faq"><h2>Frequently asked questions</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>` +
    (related.length ? `<div class="related"><h2>Related ${esc(type.toLowerCase())}s</h2><p>${related.map(r => `<a href="${esc(pathFor(r))}">${esc(r.title)}</a>`).join(' ')}</p></div>` : '') +
    `<div class="related"><h2>Guides</h2><p>${guides.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join(' ')}</p></div>`;

  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: 'All programmes', item: BASE + '/opportunity' },
      { '@type': 'ListItem', position: 3, name: row.title, item: BASE + url }] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
  ];
  return shell(metaTitle(row), metaDescription(row, now), url, body, jsonld);
}

const ORDER = r => { const k = statusView(r).kind; return k === 'open' ? 0 : k === 'unconfirmed' ? 1 : 2; };
export function renderHub(rows, now = new Date()) {
  const groups = ['Scholarship', 'Fellowship', 'Internship'];
  const typed = t => rows.filter(r => (groups.includes(r.opportunity_type) ? r.opportunity_type : 'Other') === t)
    .sort((a, b) => ORDER(a) - ORDER(b) || String(iso(a.application_close_date) || '9').localeCompare(String(iso(b.application_close_date) || '9')));
  const card = r => { const st = statusView(r, now); return `<article class="card"><p class="tag">${esc(r.provider)}</p><h3><a href="${esc(pathFor(r))}">${esc(r.title)}</a></h3>` +
    `<p><span class="state ${st.kind === 'open' ? '' : st.kind}">${esc(st.label)}</span>${st.close ? ' · deadline ' + esc(human(st.close)) : ''}</p>` +
    `<p>${esc([r.funding_type, r.destination_country].filter(Boolean).join(' · '))}</p></article>`; };
  const body = `<p class="tag">${rows.length} programmes tracked against official sources</p><h1>Scholarships, fellowships and internships</h1>` +
    `<p class="lead">Every programme OppMatcher tracks, with its status, deadline and official source. Open programmes are listed first.</p>` +
    [...groups, 'Other'].map(t => { const xs = typed(t); return xs.length ? `<h2>${t === 'Other' ? 'Other programmes' : t + 's'} (${xs.length})</h2><div class="grid">${xs.map(card).join('')}</div>` : ''; }).join('');
  return shell('All Scholarships, Fellowships & Internships – Deadlines | OppMatcher',
    `${rows.length} scholarships, fellowships and internships with status, deadlines and official application links, checked against official sources.`,
    '/opportunity', body,
    [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'All programmes', url: BASE + '/opportunity',
      mainEntity: { '@type': 'ItemList', numberOfItems: rows.length, itemListElement: rows.slice(0, 200).map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: BASE + pathFor(r), name: r.title })) } }]);
}

export function sitemapEntries(rows) {
  return [`<url><loc>${BASE}/opportunity</loc></url>\n`].concat(rows.map(r => {
    const lm = iso([r.last_verified_at, r.updated_at].map(v => new Date(v)).filter(d => Number.isFinite(d.getTime())).sort((a, b) => b - a)[0]);
    return `<url><loc>${esc(BASE + pathFor(r))}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}</url>\n`;
  })).join('');
}
