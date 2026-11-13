# Search Console zero-click query baseline — 13 November 2026

## Scope
Source: OppMatcher's connected Google Search Console Search Analytics, **Web**, last 28 days of finalised data at review time, grouped by query and page. Filter: **0 clicks**, average position **5–20 inclusive**, minimum **1 impression**. There were **38 qualifying query-page rows**. Impressions and positions are historical, not live rankings. Search Console's query data can omit anonymised or low-volume searches.

This is the **baseline**, not a claim of measured traffic improvement. Let the amended pages be crawled and evaluated; review after approximately **30 days (13 December 2026)** and again **60 days (12 January 2027)**. Compare query-plus-page pairs, impressions, clicks, CTR and average position, keeping the date-window length and search type consistent.

## Largest zero-click opportunities

| Search query | Target article slug | Impressions | Avg. position |
| --- | --- | ---: | ---: |
| scholarship eligibility requirements | scholarship-eligibility-checklist | 15 | 18.3 |
| what eligibility requirements should i check before applying? | scholarship-eligibility-checklist | 10 | 5.6 |
| research fellowship | research-fellowships-uk-funding-guide | 7 | 19.0 |
| msca mobility rule | msca-postdoctoral-mobility-rules | 6 | 9.7 |
| knight hennesy application | knight-hennessy-scholars-application | 3 | 8.7 |
| scholarship eligibility | scholarship-eligibility-checklist | 3 | 11.3 |
| graduate assistantship or fellowship | us-graduate-assistantship-vs-fellowship | 2 | 19.5 |
| how to apply for mext scholarship undergraduate | mext-japan-scholarships-embassy-route | 2 | 5.5 |
| international scholarships 2026 | fully-funded-scholarships-international-students | 2 | 6.5 |
| internship application via the undp vacancy | undp-internships-application-guide | 2 | 10.0 |
| knight hennessy application | knight-hennessy-scholars-application | 2 | 18.5 |
| mcsa mobility requirements | msca-postdoctoral-mobility-rules | 2 | 9.0 |
| mext university route | mext-japan-scholarships-embassy-route | 2 | 5.0 |
| oecd application status | oecd-internship-programme-guide | 2 | 9.0 |

## Changes made
Added user-oriented explanations and query-matched headings to these **13 existing articles**, leaving their URLs and main title tags intact:

- scholarship-eligibility-checklist
- msca-postdoctoral-mobility-rules
- research-fellowships-uk-funding-guide
- mext-japan-scholarships-embassy-route
- knight-hennessy-scholars-application
- oecd-internship-programme-guide
- us-graduate-assistantship-vs-fellowship
- erasmus-mundus-course-catalogue-guide
- scholarship-application-documents
- un-internship-application-checklist
- undp-internships-application-guide
- scholarship-cv-format-for-students
- fully-funded-scholarships-international-students

**11 pages are indexable** and their existing sitemap `lastmod` dates were changed to 2026-11-13 after the substantive edits. The **assistantship** and **scholarship CV** guides are still `noindex,follow` and excluded from the sitemap. This restriction was intentionally preserved.

Unhelpful searches, obvious spelling errors, official-document navigational queries and terms already fully answered were not copied indiscriminately into headings. Improve useful answers, not keyword density.

## Verification
The post-edit workflows passed:
- [Public content quality](https://github.com/farhanshah/opportunity-matcher/actions/runs/43449592384)
- [SEO sitemap and publisher coverage](https://github.com/farhanshah/opportunity-matcher/actions/runs/43449601311)
- [v5 public release QA, including real browser](https://github.com/farhanshah/opportunity-matcher/actions/runs/43449813465)

**Production deployment is not independently confirmed.** The connected Vercel integration currently lists no accessible OppMatcher project even though the account is a member of the owning team; the project lookup returns a 404 and deployments lookup returned 403. Resolve the Vercel app's project access scope before claiming this release is live.

## Review process
1. In Search Console, filter **Search results > Web > Last 28 days** and group by **Query + Page**.
2. Compare the same target query/page pairs to this baseline. Note Google's changing impression mix and average-position fluctuations.
3. Prioritise pages gaining impressions while remaining between positions 5–20 with low CTR.
4. Check the *live* page text, indexability, canonical and rendering before further edits.
5. Adjust a title or description only when it helps accurately reflect the page and real search intent. Avoid re-editing all headings because of a single low-volume query.
