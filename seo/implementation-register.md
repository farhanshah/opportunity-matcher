# OppMatcher 2027 SEO keyword and source verification register

**Audited 11 November 2026** against the supplied keyword map and staged GitHub content.

- Search phrases mapped: **366**
- Keyword intent rows: **124**
- Implemented intent groups: **90**
- Further provider and eligibility checks: **34**
- Editorial review-stage guide pages deliberately excluded from indexable sitemap: **20**

## Remaining work that cannot be truthfully published without evidence

- **Scholarships for developing countries**: /scholarships/for/ (requires-individual-source-verification)
- **Scholarships by nationality**: /scholarships/for/ and /scholarships/countries/ (requires-individual-source-verification)
- **Clarendon Scholarship Oxford 2027**: One /programmes/<name>/ page each (requires-individual-source-verification)
- **DAAD EPOS Scholarship 2027**: /programmes/daad-epos-scholarship/ (requires-individual-source-verification)
- **Fulbright Scholarship 2027**: /programmes/fulbright-foreign-student-program/ (requires-individual-source-verification)
- **ETH Zurich ESOP Scholarship 2027**: /programmes/eth-zurich-esop-scholarship/ (requires-individual-source-verification)
- **Swedish Institute Scholarship 2027**: One /programmes/<name>/ page each (requires-individual-source-verification)
- **KAIST Scholarship 2027**: One /programmes/<name>/ page each (requires-individual-source-verification)
- **ADB Japan Scholarship 2027**: One /programmes/<name>/ page each (requires-individual-source-verification)
- **Rotary Peace Fellowship 2027 (also "Rotary Peace Fellowship" in S5)**: /programmes/rotary-peace-fellowship/ (requires-individual-source-verification)
- **University of Miami Stamps Scholarship 2027**: One /programmes/<name>/ page each (requires-individual-source-verification)
- **EPFL Summer Internship 2027**: One /programmes/<name>/ page each (requires-individual-source-verification)
- **Google Summer of Code 2027**: /internships/tech/ hub, one /programmes/<name>/ page each (requires-individual-source-verification)
- **WFP Internship Programme 2027**: One /programmes/<name>/ page each (requires-individual-source-verification)
- **Humboldt Research Fellowship**: /programmes/humboldt-research-fellowship/ (requires-individual-source-verification)
- **Rockefeller University Summer Fellowship 2027**: One /programmes/<name>/ page each (requires-individual-source-verification)
- **Yale World Fellows 2027**: One /programmes/<name>/ page each (requires-individual-source-verification)
- **GovAI Summer Fellowship 2027**: /programmes/govai-fellowship/ (requires-individual-source-verification)
- **FASPE Fellowship 2027**: One /programmes/<name>/ page each (requires-individual-source-verification)
- **Rotary Peace Fellowship**: See the S3 rows for Rotary Peace and Erasmus Mundus (requires-individual-source-verification)
- **Stanford Summer Research Program 2027**: One /programmes/<name>/ page each (requires-individual-source-verification)
- **One Young World Scholarships**: One /programmes/<name>/ page each (One Young World shares one page) (requires-individual-source-verification)
- **Scholarships for Pakistani students 2027**: One page each under /scholarships/for/, for example /scholarships/for/pakistani-students/ (unbuilt-evidence-gated)
- **Scholarships for international students from developing countries (and the S1 developing-countries and low-income keywords)**: /scholarships/for/developing-countries/ (unbuilt-evidence-gated)
- **Scholarships open to all nationalities**: /scholarships/for/all-nationalities/, no-age-limit/, no-work-experience/, recent-graduates/, low-gpa/ (unbuilt-evidence-gated)
- **Scholarships for women in STEM**: /scholarships/for/women/ (unbuilt-evidence-gated)
- **Scholarships for students with disabilities**: /scholarships/for/students-with-disabilities/ (unbuilt-evidence-gated)
- **Scholarships for teachers**: /scholarships/for/teachers/ and /scholarships/for/working-professionals/ (unbuilt-evidence-gated)
- **Scholarships for engineering students**: /scholarships/subject/engineering/ (unbuilt-evidence-gated)
- **Computer science scholarships 2027**: /scholarships/subject/technology/ (unbuilt-evidence-gated)
- **Public health scholarships 2027**: /scholarships/subject/health/ (unbuilt-evidence-gated)
- **Business management scholarships**: /scholarships/subject/business/ (unbuilt-evidence-gated)
- **Agriculture scholarships 2027**: /scholarships/subject/environment-agriculture/ (unbuilt-evidence-gated)
- **Law scholarships for international students**: /scholarships/subject/law/ (unbuilt-evidence-gated)

### Editorial rules

These remaining items are not automatically-open opportunities. Provider research pages require official programme evidence. Audience and subject pages need at least five sufficiently checked relevant programmes before being indexed. The verified-vacancy feed and source monitoring should supply that evidence, not arbitrary SEO text.

Google Search Console URL inspection, sitemap submission and ranking measurement require property access and have not been confirmed. The sitemap and links can be delivered without spending GitHub Actions minutes.

## 12 November 2026: Search Console-led editorial review

- Improved the scholarship eligibility requirements page with an eligibility worksheet and FAQ.
- Clarified the documents guide: hard eligibility rules are distinct from evidence to upload.
- Rebuilt the Erasmus Mundus catalogue guide, correcting malformed FAQ content and adding the official catalogue application route and programme-specific funding checks.
- Rebuilt the MSCA mobility guide, correcting malformed FAQ content and adding the 12-in-36-month test, European/Global differences and current call caution.
- Both updated guides changed from noindex,follow to index,follow after review and were added to the sitemap. Google indexing has not been confirmed.
- OpenSEO's page cap required additional section-scoped crawl runs.

## 12 November 2026: review-stage FAQ integrity

Audited all 20 remaining review-stage guide pages for two-character FAQ fragments. Eleven had malformed one-letter questions and one-letter answers. Replaced those fragments with complete topic-specific eligibility, application, or preparation answers. These eleven pages **remain noindex**: correcting malformed FAQs does not by itself establish that the whole guide is ready for indexing.

Related dynamic SEO audit: country-directory pages had repeated meta descriptions and short explanations; exact-vacancy pages had long metadata despite legitimate full job titles. These are now handled centrally in the public opportunity renderer, with applicant restrictions retained in the page body and relevant metadata.

The OpenSEO account caps each crawl at 50 pages. Four section-entry crawls covered 64 unique URLs in total, rather than all 114 sitemap URLs. The remaining URLs require a different audit method or increased crawl allowance before a complete-site claim is justified.
