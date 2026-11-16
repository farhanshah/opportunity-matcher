# OppMatcher security review, 13 November 2026

Scope: GitHub source (main branch), production Neon Auth configuration, database metadata and row-level security policies. The GitHub repository is currently public. The Vercel integration returned a project-not-found / access error, so deployed environment variables, runtime logs, WAF configuration and release status were **not** verified.

## Confirmed protections

- Personal tables user_passports, saved_opportunities, application_tracker and opportunity_evidence_answers have enabled owner-only row-level security policies for the authenticated role.
- The LinkedIn linking code verifies token signatures, one-time OAuth state and the signed-in account. Session tokens are checked server-side.
- Most scheduled discovery/monitoring routes require a server-side CRON_SECRET; their task authorization must stay separate from the browser admin credential.
- The active Neon Auth environment has email verification required and localhost origins disabled.

## Fixes included in this change

1. Added a distinct ADMIN_SECRET with minimum 32-character length and timing-safe comparison for /api/admin-health and /api/admin-review. This deliberately fails closed until the new server-side secret exists.
2. Removed operations-console secret persistence in sessionStorage. The key stays only in JavaScript memory until the page is closed or explicitly locked.
3. Replaced raw error messages in administrator endpoints and the monitor HTTP response with generic messages. Internal monitored-source error details remain in the restricted database for diagnosis.
4. Expanded .gitignore to cover all .env.* credential files, and added a credential-pattern scan in GitHub Actions. The scan does not print matching values.
5. Added regression checks for private endpoints and frontend credential storage. Admin review requires a UUID identifier.
6. Reduced exposure from the password recovery UI by removing the reset token from DOM attributes and stripping it from the URL as soon as its handler processes it. The homepage still loads external advertising JavaScript, so a dedicated first-party recovery page remains preferable.
7. Reduced raw client-side error-object logging in the cloud-workspace module.
8. On 13 November, the production Neon Auth setting revoke_sessions_on_password_reset was changed from false to true directly in the provider. This provider setting is not altered by the PR.

## Must complete BEFORE merging or deploying

- Rotate CRON_SECRET after switching the console to ADMIN_SECRET. The previous cron key was entered into browser code and persisted in sessionStorage; treat it as potentially exposed and do not reuse it for administration.
- In Vercel, add a unique randomly generated ADMIN_SECRET of at least 32 characters to the **production** environment. It must be different from CRON_SECRET, DATABASE_URL and OAuth/Resend keys. Restrict production values to server-only functions; do not use NEXT_PUBLIC_, VITE_ or browser files. Configure the same key in preview environments only if trusted previews need access.
- Resolve the Vercel integration's team/project access error, inspect existing variable names/scopes (without publishing their values), runtime logs and firewall/rate limit settings, then test the protected /api/admin-health and /api/admin-review routes.
- Verify a legitimate operations-console sign-in and confirm a wrong/absent key gets 401. Inspect CI results and deploy in a controlled release.
- Audit Git **history** and other branches with GitHub secret scanning / history-aware tooling, not merely current files. Rotate and revoke any exposed key immediately; deleting a string from a repository does not revoke it.
- Decide whether the public GitHub repository is intentional. If not, change visibility and review outside collaborators.
- Verify Neon Auth's managed signup/password rate limits, email abuse controls, CAPTCHA or other anti-bot protection; the source does not establish that login/signup abuse is limited. Neon Auth is a separate host, so Vercel edge rate limits alone will not protect its auth endpoints.
- Test a signed-in user's cross-account data access in an isolated staging environment (IDs, profile, saved, tracker and evidence tables) with two test identities. RLS metadata checks are **not** a substitute for a negative authorization test.

## Data flow and privacy review

- Browser profile, saved and tracker data are sent through Neon Auth and the Neon Data API with user-session authorization. The browser app also keeps some user data in localStorage for continuity; evaluate minimization and wipe-on-signout thoroughly.
- LinkedIn account linking stores signed provider subject IDs; its OAuth token exchange is server-side. Google OAuth is managed through Neon Auth.
- Resend receives address/name for transactional mail and notification emails according to feature settings.
- Public pages use Google AdSense and external assets (such as Google Fonts and Unsplash). The cloud client loads code from esm.sh, a third-party CDN. A production-hosted, pinned bundle with integrity controls would reduce supply-chain exposure.
- Review the privacy policy for legal basis, retention, processors, analytics consent, user export/deletion, backup retention, and marketing opt-in. Avoid printing full tokens, emails, passwords and raw personal-data payloads to logs. Review data-access logs under a restricted retention policy.

## Seven defensive test angles

1. **Secrets and supply chain:** scan tracked code and history, dependencies, scripts, GitHub Actions permissions and third-party bundles.
2. **Authentication and sessions:** password-reset revocation, email verification, OAuth state, token rotation and login throttling.
3. **Broken object-level authorization:** test ID swaps between two staging accounts; validate all four protected tables and server routes.
4. **Injection and browser security:** check SQL parameterization, HTML escaping, DOM sinks, effective CSP and input-size bounds.
5. **CSRF and origin controls:** test state-changing requests and whether cookies are accepted across origins.
6. **SSRF and network abuse:** test that administrator-controlled source URLs cannot fetch internal or cloud metadata addresses; preserve provider-specific source allowlists.
7. **Availability, privacy and errors:** test rate limiting, oversized input, safe errors, log redaction, data export and deletion under load.

## Payments

The inspected repository does not contain a checkout/payment handler or a payment-pricing calculation. No claim of payment security testing is made. If billing is added later, use server-side trusted price IDs and verify webhook signatures.

This report is a defensive code/configuration review, **not a completed penetration test or production security certification**.
