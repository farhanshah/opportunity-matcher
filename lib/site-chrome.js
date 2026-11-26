// Shared header/footer markup for public content pages. Styled by
// /site-chrome-v1.css. Used by tools/apply-site-chrome.mjs (static pages)
// and by the server-rendered pages (/latest, /opportunities, /opportunity/*).
export const CHROME_CSS = '<link rel="stylesheet" href="/site-chrome-v1.css?v=1">';

const LINKS = [
  ['/scholarships/', 'Scholarships'], ['/internships/', 'Internships'], ['/fellowships/', 'Fellowships'],
  ['/exchange-programs/', 'Exchange'], ['/latest', 'Latest'], ['/blog/', 'Guides'], ['/tools/application-readiness', 'Checklist']
];
const FOOT = [
  ['/scholarships/', 'Scholarships'], ['/internships/', 'Internships'], ['/fellowships/', 'Fellowships'], ['/exchange-programs/', 'Exchange programmes'],
  ['/latest', 'Latest opportunities'], ['/opportunities', 'Verified vacancies'], ['/programmes/', 'Programme guides'], ['/blog/', 'Guides'],
  ['/tools/application-readiness', 'Free checklist'], ['/blog/methodology/', 'How we verify'], ['/about', 'About'], ['/contact', 'Contact'], ['/privacy', 'Privacy']
];
const brand = '<a class="omBrand" href="/"><img src="/brand-icon.svg?v=2" alt="" width="34" height="34"><span>OppMatcher<small>Global matcher</small></span></a>';

// `current` is the section path this page belongs to (e.g. '/scholarships/').
export function siteHeader(current = '') {
  const links = LINKS.map(([href, label]) => `<a href="${href}"${current && current === href ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<header class="omHeader"><div class="omBar">${brand}<nav class="omLinks" aria-label="Main navigation">${links}</nav><a class="omCta" href="/">Open OppMatcher ↗</a></div></header>`;
}

export function siteFooter() {
  return `<footer class="omFooter"><div class="omFoot"><div>${brand}<p>Official-source discovery for scholarships, internships and fellowships. Always confirm details with the provider before applying.</p></div>` +
    `<nav aria-label="Footer">${FOOT.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>` +
    `<div class="omLegal">© ${new Date().getUTCFullYear()} OppMatcher · Official provider pages remain the source of truth for applications and eligibility.</div></div></footer>`;
}

export function sectionFor(path) {
  const p = String(path || '');
  for (const [href] of LINKS) if (href.length > 1 && p.startsWith(href)) return href;
  if (p.startsWith('/programmes/') || p.startsWith('/opportunity')) return '';
  return '';
}

// Swap the first <header> before <main> and the last <footer> after </main>
// for the shared chrome; adds the stylesheet. Returns null if the page has
// no recognisable header before <main>.
export function applyChrome(html, path) {
  const url = '/' + path.replace(/index\.html$/, '').replace(/\.html$/, '');
  let out = html;
  const h = out.search(/<header\b/i), m = out.search(/<main\b/i);
  if (h < 0 || m < 0 || h > m) return null;
  const hEnd = out.indexOf('</header>', h);
  if (hEnd < 0 || hEnd > m) return null;
  out = out.slice(0, h) + siteHeader(sectionFor(url)) + out.slice(hEnd + 9);
  const f = out.lastIndexOf('<footer');
  if (f > out.search(/<\/main>/i)) {
    const fEnd = out.indexOf('</footer>', f);
    if (fEnd > 0) out = out.slice(0, f) + siteFooter() + out.slice(fEnd + 9);
  }
  if (!out.includes('/site-chrome-v1.css')) out = out.replace('</head>', CHROME_CSS + '</head>');
  return out;
}


export const withChrome = (html, path = '') => applyChrome(String(html), path) || html;
