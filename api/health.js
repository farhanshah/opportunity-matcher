import { db } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const sql = db();
    const [stats] = await sql`
      SELECT
        (SELECT count(*)::int FROM opportunities) AS opportunities,
        (SELECT count(*)::int FROM monitored_sources WHERE is_active = true) AS monitored_sources,
        (SELECT count(*)::int FROM detected_changes WHERE status = 'pending_review') AS pending_reviews,
        (SELECT count(*)::int FROM opportunity_discovery_candidates WHERE status = 'published') AS discovered_published,
        (SELECT count(*)::int FROM opportunity_discovery_candidates WHERE status = 'needs_evidence') AS discovered_withheld,
        (SELECT count(*)::int FROM exact_vacancies WHERE status = 'open' AND status_verified=true) AS verified_live_vacancies,
        (SELECT count(*)::int FROM opportunities WHERE last_verified_at >= now() - INTERVAL '30 days') AS verified_records_30d,
        (SELECT count(*)::int FROM opportunities WHERE last_recheck_at >= now() - INTERVAL '7 days') AS rechecked_records_7d
    `;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, database: 'connected', ...stats, checked_at: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ ok: false, database: 'error', error: error.message });
  }
}
