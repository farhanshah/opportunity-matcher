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

## Follow-up on 3 November: six more researched guides

- Expanded and restored **OECD internships**, **DAAD scholarships**, **MEXT Japan**, **Australia Awards**, **Commonwealth Master's**, and **Global Korea Scholarship (GKS)** guides using official provider requirements and current-cycle caveats.
- These articles now contain comparisons, programme-specific eligibility or application-route checks, examples, and direct official-source links. Their original canonical URLs were kept and modification dates updated.
- Added all six to the main sitemap. Total main sitemap entries: **55**.
- **Nine** still-short programme guides remain `noindex,follow`. Their URLs remain available while they await substantial editorial updates.
- Verified through the connected Gmail account that a message addressed to `privacy@oppmatcher.tech` was present in the inbox on **16 October 2026**. This confirms historical delivery to the connected Gmail inbox, not present-day end-to-end deliverability.
- Google Search's fetch of the homepage showed the new public navigation, About and Contact, methodology, free checklist and trust-section links. Other page fetches were not reliably available through that external tool, so full per-URL HTTP and mobile checks remain necessary.

## Final pass on 3 November: eleven source-backed programmes, sitewide consistency

- Restored **WHO Internships**, **UNHCR Internships**, **Schwarzman Scholars** and **Marie Skłodowska-Curie Postdoctoral Fellowships** after substantive source-backed rewrites.
- WHO guide explicitly distinguishes the long-standing general programme description from the **December 2025 WHO HR report** documenting that the global internship programme had been paused since January 2025. No new WHO posting is labelled open solely from the general programme page.
- Schwarzman guide uses the programme's published 2028-2029 cohort application dates and age/degree thresholds; MSCA guide distinguishes the now-closed 2026 call from the next scheduled 2027 opening.
- Added all four to the main sitemap and retained unchanged article canonical URLs.
- Added eight of the newly updated programme guides to the homepage's static link section.
- Corrected the GitHub content-quality test's temporarily excluded slug array to avoid empty entries.
- The main sitemap now contains **59 URL entries**. An independent GitHub-file cross-check of **all 55 blog guides** found **50 indexable guides, five temporarily noindexed**, correct AdSense publisher ID on **55/55**, and **zero sitemap-versus-indexability conflicts**.
- The five pages still requiring substantive source-based editorial work are Gates Cambridge, Knight-Hennessy, UK research fellowships, scholarship interviews, and scholarship statement-of-purpose examples.
- GitHub commits and Vercel production build status are separate from definitive live-device behaviour; perform browser and mobile checks before requesting another AdSense review.

## 4 November 2026: Five-guide backlog completed

- Expanded **Gates Cambridge**, **Knight-Hennessy Scholars**, **UK research fellowships**, **scholarship interview preparation**, and **statement of purpose examples** with programme-specific rules, evidence-based comparisons and direct references.
- Preserved existing article URLs and enabled `index,follow` on the five updated pages. Added them to the main XML sitemap using 2026-11-04 as the actual modification date.
- Updated the main blog listing and homepage links so those pages can be discovered through ordinary public navigation without a login.
- The main sitemap now contains **64 URL entries**, including the restored articles. Across the **55 published guide directories**, none is deliberately marked `noindex` for the earlier short-template review.
- Rechecked the five newly restored pages against repository HTML: all have AdSense publisher ID `ca-pub-1916126969266611`, at least two direct official-source links, at least one evidence comparison table, `index,follow`, a homepage link, current modification metadata, and a sitemap entry.
- The previous complete cross-check found 55/55 article publisher scripts and no robots/sitemap contradictions; the final five were separately rechecked after changes.
- **Caution:** Twenty of the 55 guides have received a substantive programme-specific expansion in this repair project. The others remain as previously written, and shorter articles may still need editorial improvement. Indexable does not guarantee quality or Google's decision to index.
- Vercel reported `READY` for production at commit `f117e6ef06fd7fa538986fc33756bb3a9df799b5` after homepage link cleanup. GitHub Actions test conclusions and full mobile/browser HTTP checks are not independently confirmed.
- **Do not resubmit AdSense automatically.** Review residual short articles, public opportunity content, actual user experience on mobile, and site-review instructions before confirming policy remediation.

## 4 November 2026: Sitewide editorial follow-up and database safeguards

**Public-facing outcome**

- Audited all **55** article directories in the current repository. Rewrote six further practical guides: IELTS alternatives, UNICEF versus UNDP eligibility, internships after graduation, scholarship deadline planning, fake internship recruitment and UK international-graduate work rights.
- Expanded the public <a href="/blog/methodology/">methodology</a> with the actual exact-vacancy publication criteria, last-check window, date handling, source hierarchy, explicit nationality restrictions, dated UNICEF examples, and correction process.
- Temporarily marked **24** shorter, closely templated guides `noindex,follow`, placed a transparent editorial notice on each and linked readers to stronger topic guidance. None was deleted; canonical URLs were preserved.
- Removed those 24 from the main public sitemap and from the blog directory. Removed the AdSense script from those low-value pages until reviewed. This follows Google's guidance against placing ads on pages with insufficient original content.
- The blog now promotes **31 reviewed destinations**, including methodology. The main sitemap has **40 URL entries**. The separate automatically generated opportunity sitemap remains in place for current listings.
- Verified all 55 article HTML files through repository checks in four batches: the 31 indexed pages have AdSense publisher code and public blog links; the 24 excluded pages have an editorial notice and no ad code; no page has a sitemap-versus-robots mismatch.
- Dynamic historical or unverified vacancy pages now omit the AdSense publisher script when marked noindex.

**Vacancy accuracy**

- Read-only audit of live exact-vacancy records found 18 total on 4 November, with four blank FAO titles, one database record labelled open despite an expired deadline, and approximately eight records satisfying basic recent-verified, future-deadline, nonblank-title checks. These counts may change after subsequent discovery.
- The existing public directory already filters out expired deadlines, stale verification and blank titles. Hardened the direct vacancy-detail page indexability rule to reject blank titles and invalid numeric provider IDs too.
- Updated exact-vacancy ingestion to reject unusable source records (blank title, missing/past deadline, non-HTTPS source), record rejected-candidate counts, avoid treating malformed full inventories as definitive closures, and run deterministic deadline expiry even after a complete provider scan. This is deployed code, not a manual database cleanup; historical records may remain unchanged until another ingestion run.
- Extended the existing ingestion and public SEO regression tests and included ingestion tests in the corresponding GitHub workflow.

**Verification limits before AdSense resubmission**

- Vercel reports `READY` for the latest production build. That confirms successful deployment but does not independently establish every page's HTTP response, a mobile browser's visual layout or GitHub Actions test conclusions.
- External live fetch attempts for multiple `oppmatcher.tech` pages were inconclusive because this environment's web fetch could not retrieve them. The website must be reviewed on a real browser and preferably Search Console's live URL test before submitting a new AdSense review.
- Google has not specified a minimum article count or guaranteed approval criteria. The user must assess any remaining account-level review prompts, mobile navigation and real page quality before checking “fixed” and requesting reconsideration.
- No AdSense re-review has been submitted.

## Open work before another AdSense submission

- **Do not re-request review yet.** Verify all newly published URLs work on production and that mobile navigation is usable without a login.
- Keep the 24 temporarily excluded guides out of indexing and public ad inventory until they gain enough original, source-backed detail to be useful. Reintroduce them individually, with sitemap and blog links, after verification.
- Check that the public contact mailbox works and that messages arrive at an inbox the site owner controls.
- Confirm no unsupported "Open" statuses, old deadlines, or false funding/eligibility claims remain on public homepage, featured pages or directory pages.
- Verify source-freshness automation continues to operate reliably and capture genuine user engagement after the content work.
- Review the policy feedback inside the AdSense account, and only then decide whether to tick the confirmation and request a new review.

**Policy references:** https://support.google.com/adsense/answer/12176698 and https://developers.google.com/search/docs/essentials/spam-policies
