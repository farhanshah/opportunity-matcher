# OppMatcher SEO source-level audit | 12 November 2026

## Scope and accuracy

- Inspected the **114 main-sitemap URLs** against their repository files, including dynamic route handler mappings. These resolve to 111 unique source-file or handler locations because several routes share dynamic handlers.
- Source checks assessed titles, descriptions, canonical addresses, H1 counts, `noindex` declarations, one-letter broken FAQs, and root-relative link targets.
- Checked route exceptions such as `/discover` against Vercel rewrites; it is a supported application route, not a broken internal link.
- **This is a source audit, not 114 live HTTP crawls or a Google index coverage inspection.** Four independent OpenSEO crawls reached a total of 64 distinct live URLs because the current account limited each run to 50 pages.
- Google Search Console Search Analytics confirms search impressions but cannot, on its own, establish the full index status of all 114 URLs.

## Issues addressed in this batch

1. Five indexable evergreen guides had one-letter FAQ questions and one-letter answers. Replaced the broken text with specific, bounded answers:
   - fake-internship-offers-red-flags
   - internships-after-graduation-eligibility
   - uk-internships-international-graduates
   - un-internship-application-checklist
   - unicef-vs-undp-internships-comparison
2. Shortened or clarified **45** country, scholarship, internship, exchange, fellowship, and provider programme page titles.
3. Updated **12** short, overly generic or overlong descriptions, including named provider programmes and the application-readiness tool. Two of these pages also received shorter titles.
4. Added an automatic static-source integrity test covering sitemap routing, duplicate URLs, canonical consistency, indexability, H1 count, basic metadata, broken one-letter FAQ text, and internal anchor destinations. Added it to the existing future CI test suite; this SEO commit deliberately skips CI to conserve GitHub Actions usage.

## Still open

- Real Google indexing and crawl coverage for all URLs has not been established. Search Console Search Analytics data is not equivalent to the URL Inspection or Pages coverage report.
- Twenty older editorial-stage guides remain `noindex` while their full content is reviewed. Their corrupted one-letter FAQ fragments have already been repaired, but that alone is not a reason to index them.
- The 34 keyword-intent groups requiring individual official provider evidence or sufficiently checked subject/nationality examples remain gated.
- Re-crawl the newly deployed pages and monitor search impressions and clicks as Google processes the updates. Titles and snippets are ultimately chosen by Google.
