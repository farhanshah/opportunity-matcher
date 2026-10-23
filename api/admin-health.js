import { db } from '../lib/db.js';
import { getRecoveryLink } from '../lib/official-recovery-links.js';

function authorised(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorized' });

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const sql = db();
    const [summary] = await sql`
      SELECT
        (SELECT count(*)::int FROM opportunities) AS total_opportunities,
        (SELECT count(*)::int FROM opportunities WHERE rule_normalization_status='normalized') AS normalized_opportunities,
        (SELECT count(*)::int FROM opportunities WHERE rule_normalization_status='partially_normalized') AS partial_opportunities,
        (SELECT count(*)::int FROM opportunity_eligibility_rules) AS total_rules,
        (SELECT count(*)::int FROM opportunity_eligibility_rules WHERE rule_code <> 'country_scope') AS non_country_rules,
        (SELECT count(*)::int FROM opportunity_eligibility_rules WHERE certainty <> 'confirmed') AS uncertain_rules,
        (SELECT count(*)::int FROM monitored_sources WHERE is_active=true) AS active_monitors,
        (SELECT count(*)::int FROM monitored_sources WHERE is_active=true AND last_success_at IS NOT NULL) AS successful_monitors,
        (SELECT count(*)::int FROM monitored_sources WHERE is_active=true AND last_success_at >= now()-interval '7 days') AS successful_monitors_7d,
        (SELECT count(*)::int FROM monitored_sources
          WHERE is_active=true AND last_error IS NULL AND last_success_at IS NOT NULL
            AND last_checked_at > now() - (check_interval_minutes * interval '1 minute')) AS healthy_monitors,
        (SELECT count(*)::int FROM monitored_sources WHERE is_active=true AND last_error IS NOT NULL) AS failing_monitors,
        (SELECT count(*)::int FROM monitored_sources
          WHERE is_active=true AND last_error IS NULL
            AND (last_checked_at IS NULL OR last_checked_at <= now() - (check_interval_minutes * interval '1 minute'))) AS due_without_error,
        (SELECT count(*)::int FROM monitored_sources WHERE is_active=true
           AND (last_checked_at IS NULL OR last_checked_at <= now() - (check_interval_minutes * interval '1 minute'))
           AND (last_http_status IS NULL OR last_http_status NOT IN (403,429,503)
             OR last_checked_at < now() - CASE
               WHEN last_http_status=403 THEN interval '7 days'
               WHEN last_http_status=429 THEN interval '2 days'
               WHEN last_http_status=503 THEN interval '24 hours'
               ELSE interval '24 hours' END)
           AND NOT EXISTS (
             SELECT 1 FROM monitored_sources blocked
             WHERE blocked.is_active=true
               AND lower(split_part(blocked.source_url,'/',3))=lower(split_part(monitored_sources.source_url,'/',3))
             GROUP BY lower(split_part(blocked.source_url,'/',3))
             HAVING count(*) FILTER (WHERE blocked.last_http_status=429 AND blocked.last_checked_at > now()-interval '2 days') >= 1
                OR count(*) FILTER (WHERE blocked.last_http_status=403 AND blocked.last_checked_at > now()-interval '7 days') >= 2
                OR count(*) FILTER (WHERE blocked.last_http_status=503 AND blocked.last_checked_at > now()-interval '24 hours') >= 3
           )) AS due_monitors,
         (SELECT count(*)::int FROM monitored_sources WHERE is_active=true
           AND last_error IS NOT NULL AND last_http_status IN(403,429,503)) AS blocked_monitors,
         (SELECT count(*)::int FROM monitored_sources WHERE is_active=true
           AND last_error IS NOT NULL AND (last_http_status IS NULL OR last_http_status NOT IN(403,429,503))) AS other_monitor_errors,
         (SELECT count(*)::int FROM monitored_sources WHERE is_active=true
           AND last_http_status IN (403,429,503) AND last_checked_at >= now() - CASE
             WHEN last_http_status=403 THEN interval '7 days'
             WHEN last_http_status=429 THEN interval '2 days'
             WHEN last_http_status=503 THEN interval '24 hours'
             ELSE interval '24 hours' END) AS cooling_down_monitors,
        (SELECT count(*)::int FROM source_snapshots) AS total_snapshots,
        (SELECT count(*)::int FROM detected_changes) AS detected_changes,
        (SELECT count(*)::int FROM detected_changes WHERE status='pending_review') AS pending_review,
        (SELECT count(*)::int FROM detected_changes WHERE status='pending_review' AND risk_level='high') AS high_risk_pending,
        (SELECT count(*)::int FROM detected_changes WHERE status='pending_review' AND risk_level='high'
          AND evidence_fingerprint IS NULL) AS high_risk_without_fingerprint,
        (SELECT count(*)::int FROM detected_changes WHERE status='pending_review' AND risk_level='high'
          AND opportunity_id IS NULL) AS high_risk_without_opportunity,
        (SELECT count(*)::int FROM (
          SELECT DISTINCT source_id, risk_level, change_type
          FROM detected_changes WHERE status='pending_review'
        ) grouped) AS pending_review_groups,
        (SELECT count(*)::int FROM opportunity_discovery_candidates WHERE status='published') AS discovered_published,
        (SELECT count(*)::int FROM opportunity_discovery_candidates WHERE status='needs_evidence') AS discovered_withheld,
        (SELECT count(*)::int FROM opportunity_discovery_candidates WHERE status='existing') AS discovered_existing,
        (SELECT count(*)::int FROM opportunity_web_leads) AS worldwide_leads_total,
        (SELECT count(*)::int FROM opportunity_web_leads WHERE first_seen_at>=CURRENT_DATE) AS worldwide_leads_today,
        (SELECT count(*)::int FROM opportunity_web_leads WHERE matched_official_host) AS worldwide_known_provider_leads,
        (SELECT count(*)::int FROM opportunity_web_leads WHERE verification_status='published') AS worldwide_verified_published,
        (SELECT count(*)::int FROM opportunity_web_leads WHERE verification_status='source_review') AS worldwide_source_review,
        (SELECT count(*)::int FROM opportunity_web_leads WHERE verification_status='needs_evidence') AS worldwide_needs_evidence,
        (SELECT count(*)::int FROM opportunity_web_leads WHERE verification_status='retry_needed') AS worldwide_retry_needed,
        (SELECT count(*)::int FROM monitored_sources WHERE is_active=true AND last_discovery_at >= CURRENT_DATE) AS discovery_scanned_today,
        (SELECT count(*)::int FROM monitored_sources WHERE is_active=true AND last_discovery_at >= now()-interval '24 hours') AS discovery_scanned_24h,
        (SELECT count(*)::int FROM opportunity_discovery_candidates
          WHERE status='needs_evidence' AND detected_at>=CURRENT_DATE) AS discovery_new_held_today,
        (SELECT count(*)::int FROM opportunity_discovery_candidates
          WHERE status='published' AND detected_at>=CURRENT_DATE) AS discovery_new_published_today,
        (SELECT count(*)::int FROM exact_vacancies WHERE status='open' AND status_verified=true) AS verified_live_vacancies,
        (SELECT count(*)::int FROM opportunities WHERE last_verified_at >= now()-INTERVAL '30 days') AS verified_records_30d,
        (SELECT count(*)::int FROM opportunity_country_routes WHERE is_active) AS active_country_routes,
        (SELECT count(*)::int FROM opportunity_country_routes WHERE is_active AND last_verified_at >= now()-interval '30 days') AS verified_routes_30d,
        (SELECT count(*)::int FROM opportunity_eligibility_rules WHERE last_verified_at >= now()-interval '30 days') AS verified_rules_30d,
        (SELECT count(*)::int FROM opportunities WHERE last_recheck_at >= now()-INTERVAL '7 days') AS rechecked_records_7d,
        (SELECT max(last_discovery_at) FROM monitored_sources) AS last_discovery_run,
        (SELECT max(last_recheck_at) FROM opportunities) AS last_recheck_run,
        (SELECT max(last_success_at) FROM monitored_sources WHERE is_active=true) AS latest_monitor_success,
        (SELECT max(fetched_at) FROM source_snapshots) AS latest_snapshot_at,
        (SELECT max(updated_at) FROM opportunities) AS latest_opportunity_update
    `;

    const worldwideVerificationRuns=await sql`
      SELECT id,started_at,completed_at,status,inspected,published_new,verified_existing,
             needs_evidence,needs_source_review,provider_errors
      FROM opportunity_web_verification_runs ORDER BY started_at DESC LIMIT 8
    `;
    const webSearchRuns=await sql`
      SELECT id,started_at,completed_at,status,queries_attempted,results_found,new_leads,
             matched_official_hosts,provider_errors
      FROM opportunity_web_search_runs ORDER BY started_at DESC LIMIT 5
    `;
    const webSearchLeads=await sql`
      SELECT title,canonical_url,search_region,matched_official_host,first_seen_at,verification_status,verification_reason,verification_checked_at
      FROM opportunity_web_leads WHERE review_status='unverified'
      ORDER BY first_seen_at DESC LIMIT 10
    `;
    const discoveryRuns=await sql`
      SELECT id,started_at,completed_at,status,scanned_sources,found_links,checked_details,
             new_published,withheld,already_existing,source_errors,error_message
      FROM opportunity_discovery_runs ORDER BY started_at DESC LIMIT 12
    `;
    const sources = await sql`
      SELECT
        m.id, m.source_key, m.provider, m.source_url, m.source_type,
        m.check_interval_minutes, m.is_active, m.last_checked_at, m.last_success_at,
        m.last_http_status, m.last_error,
        CASE
          WHEN m.last_http_status=403 THEN m.last_checked_at+interval '7 days'
          WHEN m.last_http_status=429 THEN m.last_checked_at+interval '2 days'
          WHEN m.last_http_status=503 THEN m.last_checked_at+interval '24 hours'
          ELSE null END AS next_retry_at,
        count(s.id)::int AS snapshot_count,
        max(s.fetched_at) AS latest_snapshot_at,
        CASE
          WHEN NOT m.is_active THEN 'paused'
          WHEN m.last_error IS NOT NULL THEN 'error'
          WHEN m.last_checked_at IS NULL OR m.last_checked_at <= now() - (m.check_interval_minutes * interval '1 minute') THEN 'due'
          WHEN m.last_success_at IS NOT NULL THEN 'healthy'
          ELSE 'waiting'
        END AS health
      FROM monitored_sources m
      LEFT JOIN source_snapshots s ON s.source_id=m.id
      GROUP BY m.id
      ORDER BY
        CASE
          WHEN m.last_error IS NOT NULL THEN 0
          WHEN m.last_checked_at IS NULL OR m.last_checked_at <= now() - (m.check_interval_minutes * interval '1 minute') THEN 1
          WHEN m.last_success_at IS NULL THEN 2
          ELSE 3
        END,
        m.provider, m.source_key
    `;

    const partials = await sql`
      SELECT
        o.external_id, o.title, o.provider, o.status, o.official_source_url,
        o.rule_normalization_status, o.last_verified_at, o.updated_at,
        count(r.id)::int AS rule_count,
        count(r.id) FILTER (WHERE r.rule_code <> 'country_scope')::int AS non_country_rules,
        count(r.id) FILTER (WHERE r.certainty <> 'confirmed')::int AS uncertain_rules,
        count(r.id) FILTER (
          WHERE r.rule_code='country_scope'
            AND coalesce(r.value_json->>'scope','') IN ('provider_country_group','provider_explicit_list','cycle_specific_country_list','vacancy_specific')
        )::int AS route_blockers
      FROM opportunities o
      LEFT JOIN opportunity_eligibility_rules r ON r.opportunity_id=o.id
      WHERE o.rule_normalization_status='partially_normalized'
      GROUP BY o.id
      ORDER BY
        count(r.id) FILTER (WHERE r.certainty <> 'confirmed') DESC,
        count(r.id) FILTER (
          WHERE r.rule_code='country_scope'
            AND coalesce(r.value_json->>'scope','') IN ('provider_country_group','provider_explicit_list','cycle_specific_country_list','vacancy_specific')
        ) DESC,
        o.external_id
    `;

    // The review queue presents one recent representative per source, risk and
    // change type. Every original event remains pending until reviewed individually.
    const changes = await sql`
      WITH ranked AS (
        SELECT c.id,
          count(*) OVER (
            PARTITION BY CASE WHEN c.status='pending_review'
              THEN c.source_id::text || '/' || c.risk_level || '/' || c.change_type
              ELSE c.id::text END
          )::int AS related_events,
          count(*) FILTER (WHERE c.evidence_fingerprint IS NULL) OVER (
            PARTITION BY CASE WHEN c.status='pending_review'
              THEN c.source_id::text || '/' || c.risk_level || '/' || c.change_type
              ELSE c.id::text END
          )::int AS legacy_unfingerprinted_events,
          count(*) FILTER (WHERE c.opportunity_id IS NULL) OVER (
            PARTITION BY CASE WHEN c.status='pending_review'
              THEN c.source_id::text || '/' || c.risk_level || '/' || c.change_type
              ELSE c.id::text END
          )::int AS events_without_opportunity,
          row_number() OVER (
            PARTITION BY CASE WHEN c.status='pending_review'
              THEN c.source_id::text || '/' || c.risk_level || '/' || c.change_type
              ELSE c.id::text END
            ORDER BY c.detected_at DESC, c.id
          ) AS group_rank
        FROM detected_changes c
      )
      SELECT
        c.id, c.change_type, c.risk_level, c.field_name, c.old_value, c.new_value,
        c.diff_summary, c.status, c.detected_at, c.reviewed_at, c.review_note,
        ranked.related_events,ranked.legacy_unfingerprinted_events,ranked.events_without_opportunity,
        jsonb_build_object(
          'previous', jsonb_build_object(
            'dates', prev.extraction_payload->'dates',
            'application', prev.extraction_payload->'application'->0,
            'eligibility', prev.extraction_payload->'eligibility'->0,
            'funding', prev.extraction_payload->'funding'->0
          ),
          'current', jsonb_build_object(
            'dates', curr.extraction_payload->'dates',
            'application', curr.extraction_payload->'application'->0,
            'eligibility', curr.extraction_payload->'eligibility'->0,
            'funding', curr.extraction_payload->'funding'->0
          )
        ) AS evidence_preview,
        m.source_key, m.provider, m.source_url,
        o.external_id AS opportunity_external_id, o.title AS opportunity_title
      FROM ranked
      JOIN detected_changes c ON c.id=ranked.id
      JOIN monitored_sources m ON m.id=c.source_id
      LEFT JOIN opportunities o ON o.id=c.opportunity_id
      LEFT JOIN source_snapshots prev ON prev.id=c.previous_snapshot_id
      LEFT JOIN source_snapshots curr ON curr.id=c.current_snapshot_id
      WHERE ranked.group_rank = 1
      ORDER BY CASE WHEN c.status='pending_review' THEN 0 ELSE 1 END,
               CASE WHEN c.risk_level='high' THEN 0 ELSE 1 END,
               c.detected_at DESC
      LIMIT 100
    `;

    return res.status(200).json({
      ok: true,
      generated_at: new Date().toISOString(),
      summary,
      discovery_runs:discoveryRuns,
      worldwide_runs:webSearchRuns,
      worldwide_verification_runs:worldwideVerificationRuns,
      worldwide_leads:webSearchLeads,
      sources:sources.map(source=>({
        ...source,
        recovery_url: source.last_error ? getRecoveryLink(source.source_key) : null
      })),
      partials,
      changes
    });
  } catch (error) {
    console.error('Admin health API failed', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
