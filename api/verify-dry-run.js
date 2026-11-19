// READ-ONLY dry run of the tiered verifier (lib/verification-v2.js).
// Runs only on Vercel preview deployments (which sit behind Vercel login).
// It never writes to the database. Not for merging into production.
import { db } from '../lib/db.js';
import { canonicalUrl, officialHostMatches } from '../lib/auto-discovery.js';
import { resolveOfficialRedirect } from '../lib/verification-redirects.js';
import { verifyOfficialPage } from '../lib/verification-v2.js';

const CONCURRENCY = 6;

async function fetchOfficial(url) {
  let next = canonicalUrl(url);
  if (!next) throw Error('Invalid official URL');
  const authority = next;
  const seen = new Set();
  for (let i = 0; i < 5; i++) {
    if (seen.has(next)) throw Error('Redirect loop');
    seen.add(next);
    const r = await fetch(next, { redirect: 'manual', signal: AbortSignal.timeout(8500),
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'OpportunityMatcher-OfficialSources/1.0' } });
    if ([301, 302, 303, 307, 308].includes(r.status)) { next = resolveOfficialRedirect(r.headers.get('location'), next, authority); continue; }
    if (!r.ok) throw Error('HTTP ' + r.status);
    if (!/text\/html|application\/xhtml\+xml/i.test(r.headers.get('content-type') || '')) throw Error('Not HTML');
    const html = (await r.text()).slice(0, 1000000);
    if (!officialHostMatches(next, authority)) throw Error('Host changed');
    return { html, url: next };
  }
  throw Error('Too many redirects');
}

export default async function handler(req, res) {
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).end('Not found');
  if (req.method !== 'GET') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const set = String(req.query.set || 'leads');
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 25));
  const sql = db();
  let rows;
  if (set === 'leads') rows = await sql`
    SELECT 'lead-'||id AS ref, canonical_url AS url, title, source_provider AS provider, NULL AS stored_status, NULL::date AS stored_close
    FROM opportunity_web_leads WHERE verification_status='needs_evidence' ORDER BY id LIMIT ${limit} OFFSET ${offset}`;
  else if (set === 'candidates') rows = await sql`
    SELECT 'cand-'||id AS ref, canonical_url AS url, title, provider, NULL AS stored_status, NULL::date AS stored_close
    FROM opportunity_discovery_candidates WHERE status='needs_evidence' ORDER BY id LIMIT ${limit} OFFSET ${offset}`;
  else if (set === 'catalogue') rows = await sql`
    SELECT external_id AS ref, official_source_url AS url, title, provider, status AS stored_status, application_close_date AS stored_close
    FROM opportunities WHERE coalesce(official_source_url,'')<>'' ORDER BY external_id LIMIT ${limit} OFFSET ${offset}`;
  else return res.status(400).json({ error: 'set must be leads, candidates or catalogue' });

  const out = [];
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    out.push(...await Promise.all(rows.slice(i, i + CONCURRENCY).map(async row => {
      const base = { ref: row.ref, url: row.url, stored_title: row.title, stored_status: row.stored_status, stored_close: row.stored_close };
      try {
        const page = await fetchOfficial(row.url);
        const r = verifyOfficialPage(page.html, page.url, row.provider || '');
        return { ...base, decision: r.decision, publishable: r.publishable, title: r.record?.title || r.fields?.title,
          type: r.record?.type, status: r.record?.status, deadline: r.record?.deadline, open_date: r.record?.openDate,
          funding: r.record?.funding, nationality: r.record?.nationality, restriction: r.record?.nationality_restriction,
          education: r.record?.education, destination: r.record?.destination,
          deadline_evidence: r.fields?.deadline?.evidence, status_evidence: r.fields?.status?.evidence,
          reasons: r.reasons, uncertain: r.uncertain, v1_verified: r.v1?.verified };
      } catch (e) {
        return { ...base, decision: 'FETCH_FAILED', publishable: false, reasons: [String(e.message || e).slice(0, 120)] };
      }
    })));
  }
  const tally = out.reduce((a, x) => (a[x.decision] = (a[x.decision] || 0) + 1, a), {});
  return res.status(200).json({ set, offset, limit, count: out.length, tally, results: out });
}
