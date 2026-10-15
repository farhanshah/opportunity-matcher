# OppMatcher authentication, emails and security launch checklist

Updated: 15 October 2026

## Current production truth
- Google OAuth uses **Neon Auth shared Google credentials**. Working end-to-end on a real browser.
- Neon Auth project display name is **OppMatcher**. Google OAuth consent may still say `neon.tech` until **OppMatcher-owned Google credentials** are configured.
- GitHub, Microsoft and LinkedIn OAuth **are not yet enabled**. The login screen only offers provider IDs that Neon Auth actually confirms are configured.
- The email/password reset flow is delegated to Neon Auth; it must not be replaced by a home-grown reset-token handler.
- Transactional welcome email code is ready with authenticated immediate triggering, idempotent sending and scheduled retry. It is **disabled until a verified sending domain and mail API key are configured**.

## Activate branded account messages (manual secure provider setup)
1. Create an account at https://resend.com/domains and verify control of `oppmatcher.tech` with the DNS records given by Resend. Confirm SPF and DKIM as required for your domain. Use a sender like `welcome@oppmatcher.tech` or `accounts@oppmatcher.tech`.
2. Generate a Resend key limited to sending from the verified domain. Put it in Vercel's **Production Environment Variables** as `RESEND_API_KEY`. Set `WELCOME_FROM_EMAIL=welcome@oppmatcher.tech`.
3. Redeploy production after adding env vars. The protected `POST /api/welcome-now` sends the one-time email after a verified Neon Auth sign-in. An hourly authorized cron retries verified accounts where delivery wasn't recorded. Never put the key in GitHub, chat, localStorage or browser JavaScript.
4. In **Neon Console → Auth → Email provider**, switch from shared Neon email to an OppMatcher sender using your verified custom SMTP credentials. For Resend SMTP, use `smtp.resend.com`, TLS-capable port `465`, username `resend`, SMTP password set privately to the relevant Resend sending key, sender name `OppMatcher` and sender address `accounts@oppmatcher.tech` (or another verified address).
5. Test actual reset and verification emails with a test account. Confirm that headers show OppMatcher as sender, the link returns to OppMatcher, and token expiry / one-time use work. Neon-managed password reset is still the security authority.
6. **Only after emails work**, enable verified email sign-up / sign-in for email/password users in Neon Auth settings. Do not abruptly lock out existing users without an account-recovery path.

## Own Google branding
Create a Google Cloud project and an OAuth **Web application** for OppMatcher. Set the consent-screen app name and domain branding. Add the exact callback URL shown by Neon Auth (do not guess). Replace the Neon shared Google OAuth configuration with the customer-owned client ID and secret directly in Neon Console. Test both returning and new users before switching broadly.

## Additional OAuth providers
- **GitHub:** Create a GitHub OAuth App in GitHub Developer Settings. Add the exact Neon Auth callback URL shown in Neon Console, then enter the client ID and secret in Neon Auth's GitHub provider settings. No credentials are sent to the browser. The GitHub button appears automatically when the managed provider configuration confirms it.
- **Microsoft:** The current managed Neon Auth provider API rejected Microsoft registration. Do not show an active button until Neon supports it or a separate audited provider integration and account-linking strategy is implemented.
- **LinkedIn:** Not supported directly by the current managed Neon Auth provider list. Requires independent OAuth/OpenID Connect development, linking safeguards and credentials. Avoid duplicate accounts and takeover via unverified email addresses.
- **Facebook:** Defer; not required for the initial student and graduate audience.

## Security and release checklist
- Keep Neon Auth session revocation enforced on sign-out; do not claim logout succeeded if revocation failed.
- Keep user_passports, saved_opportunities and application_tracker owner-only RLS policies.
- Treat personally identifying data as sensitive. Keep OAuth tokens, mail keys and password-reset tokens out of logs, source code and client storage.
- Enforce HTTPS, anti-clickjacking, MIME-sniffing protection, no-referrer and restrictive browser permissions.
- Audit and remove legacy inline-script/eval patterns before enforcing a complete script-src CSP. Current production security headers implement an initial CSP only, not an XSS-proof CSP.
- Perform staging penetration/security testing; review account linking, session fixation, CSRF, SSRF, injection, rate limiting, personal-data deletion/export, incident response and backup/restore.
- Complete an accurate privacy notice, account-deletion workflow and consent/unsubscribe policy before inviting public users.
- **Never claim a zero-risk system:** measure, monitor, patch and test continuously.

## Discovery checkpoint
The next automatic discovery run is scheduled for 16 October 2026 at 07:00 UTC / 08:00 BST. Check live results before making claims about newly published records.
