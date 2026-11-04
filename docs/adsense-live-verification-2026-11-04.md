# OppMatcher AdSense live-site verification
Checked 4 November 2026, approximately 03:44–03:50 UTC.

## Scope and methods
- Tested the **public custom domain** `https://oppmatcher.tech`, not an authenticated Vercel preview URL.
- Ran HTTPS and HTTP header checks from an isolated Vercel sandbox in the London region.
- Crawled each live XML sitemap URL and inspected the HTTP status, HTML title, canonical, robots directives and presence of the matching AdSense publisher script.
- Used headless Chromium (Playwright) at **390×844** (phone) and **1366×900** (desktop). Browser checks covered the homepage, blog directory, research methodology, About, Contact, application-readiness worksheet, verified opportunities and an excluded draft guide.
- Tested mobile Explore navigation, application checklist controls, an expired vacancy URL, a currently verified UNICEF vacancy URL, the homepage with JavaScript disabled, and HTTP-to-HTTPS redirects.

## Direct HTTP results
- `/`, `/blog/`, `/blog/methodology/`, `/about`, `/contact`, `/tools/application-readiness`, `/opportunities`, one updated Gates Cambridge guide, both sitemaps, robots.txt and ads.txt all returned **200**.
- `/ads.txt`: **200**, `text/plain; charset=utf-8`, exact content `google.com, pub-1916126969266611, DIRECT, f08c47fec0942fa0`.
- `/robots.txt`: **200**; `User-agent: *` allowed crawling and included both sitemap URLs.
- `http://oppmatcher.tech/` redirected to canonical `https://oppmatcher.tech/` (308). `https://www.oppmatcher.tech/` redirected to the non-www canonical custom domain (307).
- `/sitemap.xml`: 40 unique URLs, 40/40 HTTP 200, no `noindex`, correct page titles and AdSense script. No canonical mismatches detected.
- `/opportunities-sitemap.xml`: 19 unique URLs, 19/19 HTTP 200, no `noindex`, correct page titles and AdSense script. No canonical mismatches detected.
- Together: **59 URLs**, **59 successful responses**, **zero detected sitemap/indexability or canonical conflicts**.

## Browser checks
- **16 viewport/page checks**: 8 public pages at each of 390 px and 1366 px. All 16 returned HTTP 200, none had document-wide horizontal overflow, and none emitted JavaScript page errors.
- On mobile, homepage Explore menu opened, changed `aria-expanded` to true, and exposed 11 navigation links including the guides, free checklist, verification methods, About and Contact.
- With JavaScript disabled, homepage content remained visible, including six public trust/navigation cards, with no horizontal overflow.
- Application-readiness worksheet rendered 10 checkboxes. Checking one moved progress from 0/10 to 1/10; Reset restored 0/10; switching to Internship updated the applicable eligibility questions.
- Historical `/opportunities/undp-36925`: 200, clearly **Closed** based on 28 October 2026 deadline, `noindex,follow`, no AdSense publisher script.
- Recorded UNICEF China `/opportunities/unicef-596670`: 200, labelled **Open, recently verified**; page title explicitly retained the **Chinese Nationals only** restriction. This is a dated check, not an applicant eligibility determination.
- Example shorter, excluded guide `/blog/chevening-work-experience-calculation/`: 200, `noindex,follow`, no AdSense script, remains readable to previous visitors.

## Limits and account-level next action
This verified public reachability and representative interactions, **not** Google AdSense approval or actual Google Search Console indexing. It was not an exhaustive visual design review on all devices, and the GitHub Actions run conclusions were not independently retrieved. Individual official providers can change postings between discovery checks.

The owner should confirm any remaining AdSense account setup steps, especially payments information if prompted, and then use **AdSense → Sites → oppmatcher.tech → confirm issues fixed → Request review**, if the account offers that action. Google's approval remains its own decision, and the review has **not** been requested from this audit.

Official policy reference: https://support.google.com/adsense/answer/12176698
