# OppMatcher: low-difficulty, source-first content sprint
**Research date:** 16 November 2026 · **Primary metrics market:** United States (English) · **Source:** connected OpenSEO and Google Search Console.

## What the current first-party evidence shows
Search Console Web / 28 complete days, **17 Oct–13 Nov 2026**, grouped by `query,page`, returned **148 visible rows**, **one recorded click**. This is not all possible searches (private/anonymised queries can be omitted). Comparisons below are based on measured query-page results, not promises of rankings.

| GSC query | Matching URL | Impressions | Clicks | Mean position | Decision |
|---|---|---:|---:|---:|---|
| erasmus course catalogue 2026 | /blog/erasmus-mundus-course-catalogue-guide/ | 50 | 0 | 51.4 | Improve existing page later, do not add a duplicate 2026 page |
| requirements for scholarship application | /blog/scholarship-eligibility-checklist/ | 34 | 0 | 44.7 | Already expanded; measure after enough crawl time |
| scholarship criteria | /blog/scholarship-eligibility-checklist/ | 18 | 0 | 50.4 | Same intent cluster; no separate page |
| scholarship eligibility requirements | /blog/scholarship-eligibility-checklist/ | 16 | 0 | 18.4 | Near top 20; monitor CTR and position |
| erasmus mundus catalogue | /blog/erasmus-mundus-course-catalogue-guide/ | 15 | 0 | 50.9 | Focus existing article and accurate official programme catalogue |
| resume template for scholarship | /blog/scholarship-cv-format-for-students/ | 11 | 0 | 28.5 | Check currently noindex/editorial quality gate before promotion |
| overseas student placement | /blog/international-internships-graduate-placements/ | 10 | 0 | 75.8 | Lower priority until content intent is clearer |
| how to write statement of purpose for scholarship | /blog/scholarship-statement-of-purpose-examples/ | 10 | 0 | 89.4 | Lower-priority broad intent; avoid generic essay inflation |

## Keyword research: remote internships, US estimates
The connected OpenSEO keyword-ideas endpoint returned **149** suggestions for the seed “remote internships”. Filtered to four or more words, on-topic, and nominal keyword difficulty <= 20 where available.

| Keyword | Estimated monthly searches (US) | Difficulty (0–100) | Action |
|---|---:|---:|---|
| remote public health internships | 210 | 0 | **Published** official-source workstream guide |
| remote non profit internships | 70 | 2 | Research a distinct employer comparison; avoid duplicating broad remote guide |
| part time remote internships | 110 | 1 | Existing general remote-internship guide can answer schedule questions; new article only if distinct intent confirmed |
| remote computer science internships | 170 | 0 | Verify specific provider pathways before content |
| cyber security internships remote | 720 | 0 | High potential; verify official programmes and access rules first |
| graphic design internships remote | 480 | 0 | High potential; look for credible portfolio evidence and official hiring sources |
| data science internships remote | 210 | 0 | Research internship-specific entry criteria and project evidence |
| remote psychology internships for undergraduates | 70 | 0 | Exercise extra care: clinical supervision and placement credit differ from remote office roles |
| remote social work internships | 210 | 0 | Distinguish remote administrative work from supervised clinical or field placements |
| remote internships summer 2026 | 390 | 0 | **Do not target** as current 2026 dates have largely passed |
| online jobs no experience | 8,100 | 18 | **Exclude**: jobs, not internships; wrong content cluster |
| high paying jobs with no experience | 9,900 | 0 | **Exclude**: unrelated and misleading for our applicant niche |

**Important:** The head keyword “remote internships” had a previously saved US estimate of 4,400 searches and KD 4, while “remote internships for international students” returned about 20 monthly US searches and KD 29. These are different queries; do not transfer the head-term KD to the long tail.

An additional bulk metrics check found `application fee waiver for international students` US volume 10, KD **70**. The fee-waiver article is published for verified applicant usefulness, **not** because its measured KD is low.

## Search-result review on 16 November 2026
For **remote public health internships**, OpenSEO's blended Google SERP returned broad commercial job-board pages (Indeed, ZipRecruiter), a Reddit discussion about virtual internship credit, an Instagram result claiming implausible salary ranges, plus actual programme sites (SOPHE, NRHA and IMR). That suggests a useful opportunity for a fact-checked programme comparison. **It does not establish low domain rating**: DR/DA were not measured, and the multi-read SERP positions varied. Do not assert specific top-5 ranks as fixed.

## Changes committed in this sprint
- New: `/blog/application-fee-waiver-international-students/` — source-backed fee-waiver decision guide; 3 university policy sources; original SVG.
- Upgraded: `/blog/remote-internships-international-students/` — full official-source content replaced short editorial version; indexable, original SVG, published in index and sitemap.
- New: `/blog/remote-public-health-internships/` — official SOPHE, NRHA and IMR comparison; original SVG, indexable, published in index and sitemap.
- Internal linking: `/blog/`, `/internships/remote/`, `/blog/scholarship-application-documents/` and a contextual link from the remote international-student guide.
- All three updated pages date-modified **2026-11-16**; blog sitemap lastmod updated after new cards.

## Next operating rule
1. Research by actual applicant question, not a keyword count target. Reject unrelated or expired-year terms, unverifiable openings and content that would duplicate an existing page.
2. Check KD, search intent and SERP title specificity where supported; label unknown when unavailable. Do not claim a weak DR without real measurements.
3. Before publishing, use 2+ appropriate primary sources for programme-specific claims, one useful original comparison or worked example, a clear H1 and H2 hierarchy, accurate meta and canonical, meaningful original figure if explanatory, descriptive alt, and at least two relevant internal links.
4. A rushed 1,000-word draft is not sufficient by itself. Do not publish thin or unreviewed text just to accelerate indexing. For important financial, visa, eligibility or immigration claims, name the source and caveats.
5. Preserve honest `open/closed/unknown` status, country rules, `noindex` quality gates, `ads.txt` policy and AdSense load-once behaviour. Update sitemap `lastmod` only after substantive edits.
6. Run automated SEO and public-content quality checks and v5 public release QA after commits. Record any failures before claiming success. Live deployment needs separate confirmation.
7. Compare the same query-page data after 28–60 days. A page appearing in Search Console with impressions does not mean it is indexed for every keyword or moving up because of a single edit.

**Monitoring:** A separate weekly SEO Review automation is configured in ChatGPT for Monday mornings, Europe/London; it supplements the existing daily discovery reporting and should not change vacancy verification rules.
