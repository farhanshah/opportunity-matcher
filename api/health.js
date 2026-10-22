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
        (SELECT count(*)::int FROM opportunities WHERE last_recheck_at >= now() - INTERVAL '7 days') AS rechecked_records_7d,
        (SELECT count(*)::int FROM opportunities WHERE last_verified_at IS NULL OR last_verified_at < now() - INTERVAL '30 days') AS programme_needs_recheck,
        (SELECT count(*)::int FROM opportunity_country_routes WHERE is_active=true) AS country_route_total,
        (SELECT count(*)::int FROM opportunity_country_routes WHERE is_active=true AND
          (last_verified_at IS NULL OR last_verified_at < now() - INTERVAL '30 days')) AS country_route_needs_recheck,
        (SELECT count(*)::int FROM opportunity_eligibility_rules) AS eligibility_rule_total,
        (SELECT count(*)::int FROM opportunity_eligibility_rules WHERE last_verified_at IS NULL OR last_verified_at < now() - INTERVAL '30 days') AS eligibility_rule_needs_recheck,
        (SELECT count(*)::int FROM monitored_sources WHERE is_active=true AND last_success_at>=now()-interval '7 days') AS sources_successful_7d,
        (SELECT count(*)::int FROM monitored_sources WHERE is_active=true AND last_error IS NOT NULL) AS sources_current_error,
        (SELECT count(*)::int FROM opportunities WHERE last_recheck_outcome LIKE 'needs_evidence:%') AS recheck_needs_evidence,
        (SELECT count(*)::int FROM opportunities WHERE last_recheck_outcome LIKE 'retry_needed:%') AS recheck_retry_needed
    `;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, database: 'connected', ...stats, checked_at: new Date().toISOString() });
  } catch (error) {
    console.error('Public health endpoint unavailable');
    return res.status(503).json({ ok: false, database: 'unavailable', error: 'Service temporarily unavailable' });
  }
}
