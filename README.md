# Opportunity Matcher

Production-oriented MVP for a global opportunity discovery, eligibility matching and application-tracking platform.

## What is included

- Public landing page and Opportunity Passport onboarding
- Conservative local matching UX with verified seed eligibility detail
- Live freshness overlay from Neon Postgres through `/api/opportunities`
- `/api/health` database health endpoint
- `/api/monitor` official-source monitoring endpoint
- Content snapshots, structured signal extraction, change detection and risk classification
- Vercel Cron configuration for scheduled checks

## Required environment variables

Set these in Vercel Project Settings → Environment Variables. Never commit the real values.

- `DATABASE_URL` — pooled Neon Postgres connection string
- `CRON_SECRET` — long random secret used to protect `/api/monitor`

## Monitoring behaviour

The monitor only processes sources that are due according to the interval stored in `monitored_sources`. Each run is capped to a small batch. It validates provider-specific expected terms before accepting a page, stores snapshots, compares structured deadline/application/eligibility/funding signals, and creates review events for meaningful changes.

- eligibility change → high risk → pending review
- deadline/application/funding change → medium risk → pending review
- low-risk structured change → auto accepted
- cookie wall, anti-bot page, broken/short page or expected-content failure → source error, not a content change

## Current data model note

The browser prototype still contains detailed eligibility seed rules as a safe fallback. The live API overlays freshness-sensitive fields from Neon (status, dates, URLs, verification). Eligibility normalization will progressively move into Postgres child-rule tables before the embedded seed is removed.

## Local development

```bash
npm install
cp .env.example .env.local
# Fill DATABASE_URL and CRON_SECRET
npx vercel dev
```

Then open the local URL and test:

- `/api/health`
- `/api/opportunities`
- `/api/monitor` with `Authorization: Bearer <CRON_SECRET>`

## Deployment

Import this GitHub repository into Vercel, add the two environment variables, and deploy. The `vercel.json` file configures the monitoring cron.

Deployment trigger: 2026-08-19
