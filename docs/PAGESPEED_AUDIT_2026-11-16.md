# OppMatcher homepage PageSpeed review, 16 November 2026

## Evidence
The user supplied a 5m24s Chrome screen recording of PageSpeed Insights for `https://oppmatcher.tech/`, captured at 19:36 GMT, with separate mobile and desktop results. Scores below are *lab results from that run*, not a measurement of the PR.

| Audit | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 40 | 44 |
| Accessibility | 94 | 94 |
| Best Practices | 100 | 100 |
| SEO | 92 | 92 |
| First Contentful Paint | 3.4 s | 0.4 s |
| Largest Contentful Paint | 10.1 s | 2.9 s |
| Total Blocking Time | 1,010 ms | 2,130 ms |
| Cumulative Layout Shift | 0.01 | 0.002 |

The mobile LCP element in the recording was the `Create my Opportunity Passport` button. The LCP breakdown attributed 3,720 ms to element render delay. The CSS in `feature-polish-v08.css` hides the whole page until the `omBootReady` class, while `app-v07.js` fetches and executes an entire array of account/tracker/workspace modules. That dependency is a larger issue than the optimized image bytes.

Additional recording evidence:
- Render-blocking requests: estimated 600 ms potential saving.
- Excessive JavaScript execution, unused JS and long main-thread tasks; `app-v07.js` accounted for substantial execution time.
- Forced reflow attributed to `app-v92-readability.js` (120 ms in the mobile trace).
- Larger-than-displayed Unsplash assets, duplicate font requests and an advisory about more than four preconnects.
- Contrast failures involving `.brandword`, its subtitle and the public footer.
- Missing main landmark in public landing.
- Uncrawlable link: dynamically created `a.omSourceOfficialLink.oppReadableFloor` without initial `href`.
- No field Core Web Vitals data in this report; scores may vary.

## Implemented on PR #10 (not a verified post-deployment speed result)
1. `index.html`: main landmark for public content; responsive `srcset`/sizes for seven carousel images.
2. `source-chips-v1.js`: initial canonical official-source href, updated to the selected source on interaction.
3. `orbital-v2.css` and `site-nav-contrast-v5.css`: higher-contrast branding/footer in the dark public landing; remove redundant DM Sans @import on homepage.
4. `app-v92-readability.js`: skip full public DOM computed-style scanning, limiting per-node work to visible workspace surfaces.
5. `app-v07.js`: remove the full-workspace boot as a prerequisite for painting the public homepage. Preserve the full boot for workspace and callback routes, and replay early Passport CTA clicks once ready.
6. `tests/pagespeed-homepage-audit.test.mjs` and v5 release workflow: regression checks and JS syntax checks.

## Must still be verified
- After a safe merge, rerun mobile and desktop PageSpeed Insights on the actual public URL and compare LCP/TBT/scores. Do not claim a new score from a static test.
- Browser-test sign-in, password recovery, Opportunity Passport, saved/tracker and all mobile/dark/light navigation routes.
- Refactor the large `app-v07.js` workspace script waterfall only after end-to-end behavioral tests. Avoid replacing real opportunity data with placeholders or hiding useful public content to improve lab scores.
- Inspect remaining render-blocking CSS, third-party AdSense/Neon code and image-host latency. Third-party cache TTLs are not controlled by OppMatcher.
- The legacy `tests/v5-staging-browser.mjs` suite targets `https://oppmatcher.tech/nav-contrast-preview-v5.html` directly and recorded six failures at 1100px. This tests an older staging page, not the PR preview, so do not represent it as an E2E result of this change.
- AdSense approval remains subject to Google's complete site/content/policy review. Publisher code is intentionally unchanged.
