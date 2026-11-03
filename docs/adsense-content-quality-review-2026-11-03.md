# OppMatcher public content quality review

**Audit date:** 3 November 2026  
**Reason:** AdSense site feedback "Low value content." This audit is internal evidence, not Google's page-by-page diagnosis.

## Baseline

- Public article directories reviewed in GitHub: **55**.
- Of those, **7** guides have at least about 700 visible article words after the first edits in this round: the earlier general funding, eligibility, documents, and international internships guides, plus Chevening, Erasmus Mundus and UNDP.
- Most remaining guides were roughly 295–437 words, often with one official reference and reused generic application advice. Word count alone does **not** determine quality.
- The programme-specific short pages with repeated "Before submitting your application" copy were prioritised for temporary `noindex,follow` treatment, not deletion.

## Changes made

1. Created public **About** and **Contact** pages and linked them in the main public navigation and sitemap. Confirm that the published email address `privacy@oppmatcher.tech` actually receives messages before requesting review.
2. Rewrote and expanded **Chevening**, **Erasmus Mundus Joint Masters** and **UNDP internships** guides using multiple official sources, programme-specific comparisons and worked examples. Retained each canonical URL.
3. Added a public **Application Readiness Checklist** under `/tools/application-readiness` that runs entirely in the visitor's browser. It distinguishes checking an official rule from qualifying for an award, and doesn't transfer or store user entries.
4. Temporarily set `noindex,follow` on **17** short, closely templated guides pending source-backed revision. Removed only these URLs from the main sitemap; their URLs remain available to existing readers. Restore indexing only when the actual article has been meaningfully improved.
5. Updated the main sitemap modification dates for changed public pages.

## The 17 pages temporarily excluded from search indexing

- australia-awards-scholarships-guide
- commonwealth-masters-scholarship-guide
- daad-scholarships-germany-guide
- gates-cambridge-scholarship-application
- global-korea-scholarship-application
- knight-hennessy-scholars-application
- marie-curie-postdoctoral-fellowships-guide
- mext-japan-scholarships-embassy-route
- oecd-internship-programme-guide
- research-fellowships-uk-funding-guide
- scholarship-interview-preparation-questions
- scholarship-statement-of-purpose-examples
- schwarzman-scholars-eligibility-application
- unesco-internship-programme-guide
- unhcr-internships-guide
- unicef-internships-application-guide
- who-internships-guide

## Follow-up on 3 November: homepage, navigation and further guides

- Added a static, responsive **Explore OppMatcher** section directly to the homepage, with six cards linking to Verified Opportunities, a free Application Readiness Checklist, Guides, Methodology, About and Contact.
- Added **Free checklist** and **How we verify** to the homepage Explore dropdown, and the checklist to the main footer and homepage call to action.
- Expanded public navigation across the blog, privacy, worldwide and server-rendered opportunity directories. Existing internal login/workspace code remains unchanged.
- Added direct homepage links to the five researched programme guides.
- Rewrote and reinstated the UNICEF and UNESCO internship guides using current, direct official programme and internship vacancy sources. Both returned to `index,follow` and the main sitemap.
- **15** guides are still deliberately `noindex,follow` while their source-backed content is improved. Their URLs remain readable and are excluded from the main sitemap.
- The Ads.txt publisher authorization remains at one root-domain file `/ads.txt`; the matching AdSense JavaScript is in public page HTML. The private Application Studio and admin console are **not** intended as ad inventory.
- Added regression checks for the homepage links, correct sitemap behaviour and AdSense script integration.

## Open work before another AdSense submission

- **Do not re-request review yet.** Verify all newly published URLs work on production and that mobile navigation is usable without a login.
- Complete a second editorial pass on the other short articles, prioritising meaningful examples and official evidence rather than length or SEO keywords.
- Check that the public contact mailbox works and that messages arrive at an inbox the site owner controls.
- Confirm no unsupported "Open" statuses, old deadlines, or false funding/eligibility claims remain on public homepage, featured pages or directory pages.
- Verify source-freshness automation continues to operate reliably and capture genuine user engagement after the content work.
- Review the policy feedback inside the AdSense account, and only then decide whether to tick the confirmation and request a new review.

**Policy references:** https://support.google.com/adsense/answer/12176698 and https://developers.google.com/search/docs/essentials/spam-policies
