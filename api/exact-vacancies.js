import { db } from '../lib/db.js';
import { publishedState } from '../lib/public-opportunity-seo.js';

function validSince(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const sql = db();
    const rows = await sql`
      SELECT provider, provider_job_id, programme_external_id, title, opportunity_type,
             location, work_mode, deadline_at, source_url, canonical_url, status,
             verification_level, status_verified, facts, first_seen_at, last_seen_at,
             last_verified_at, closed_at
      FROM exact_vacancies
      WHERE status='open' AND status_verified=true AND verification_level='exact'
        AND deadline_at > now()
        AND last_verified_at BETWEEN now()-INTERVAL '7 days' AND now()+INTERVAL '5 minutes'
      ORDER BY deadline_at ASC, first_seen_at DESC
      LIMIT 300
    `;

    const provider = String(req.query?.provider || '').trim().toUpperCase();
    const since = validSince(req.query?.since);
    const vacancies = rows
      // Do not expose historical, missing-title, stale or unconfirmed rows as
      // open via JSON when public pages correctly reject them.
      .filter(row => publishedState(row) === 'open')
      .filter(row => !provider || String(row.provider || '').toUpperCase() === provider)
      .map(row => ({
        provider: row.provider,
        job_id: row.provider_job_id,
        programmeId: row.programme_external_id || '',
        title: row.title,
        type: row.opportunity_type || '',
        location: row.location || '',
        work_mode: row.work_mode || '',
        deadline_at: row.deadline_at,
        url: row.source_url,
        canonical_url: row.canonical_url,
        status_verified: true,
        verification_level: 'exact',
        facts: row.facts || {},
        first_seen_at: row.first_seen_at,
        last_seen_at: row.last_seen_at,
        last_verified_at: row.last_verified_at,
        is_new: Boolean(since && row.first_seen_at && new Date(row.first_seen_at) > since)
      }));

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      ok: true,
      count: vacancies.length,
      provider: provider || null,
      since: since ? since.toISOString() : null,
      generated_at: new Date().toISOString(),
      vacancies
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Exact vacancy query failed', detail: error.message });
  }
}
