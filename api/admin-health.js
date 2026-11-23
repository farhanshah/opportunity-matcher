import { db } from '../lib/db.js';
import { adminAuthorised } from '../lib/admin-auth.js';
import {isProgrammePage} from '../lib/source-listings.js';
import { getRecoveryLink } from '../lib/official-recovery-links.js';

const authorised = req => adminAuthorised(req);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorized' });

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const sql = db();
    const [summary] = await sql`
      SELECT
        (SELECT count(*)::int FROM opportunities) AS total_opportunities,
        (SELECT count(*)::int FROM exact_vacancies
         WHERE status='open' AND status_verified=true AND verification_level='exact'
           AND deadline_at>now() AND last_verified_at BETWEEN now()-interval '7 days' AND now()+interval '5 minutes') AS current_exact_openings,
        (SELECT count(*)::int FROM official_open_calls
         WHERE status='open' AND closing_at>now() AND last_checked_at>=now()-interval '48 hours') AS current_official_open_calls,
        (SELECT count(*)::int FROM worldwide_source_listings
         WHERE source_status='source_confirmed' AND verified_page_at>=now()-interval '30 days') AS current_source_pages,
        (SELECT max(sent_at) FROM opportunity_daily_digest_delivery
         WHERE status='sent') AS latest_daily_digest_sent_at,
        (SELECT count(*)::int FROM neon_auth."user" WHERE banned IS DISTINCT FROM TRUE) AS registered_accounts,
        (SELECT count(*)::int FROM neon_auth."user" WHERE "createdAt">=now()-interval '7 days' AND banned IS DISTINCT FROM TRUE) AS accounts_7d,
        (SELECT count(*)::int FROM user_passports WHERE auth_user_id IS NOT NULL) AS linked_passports,
        (SELECT count(*)::int FROM user_passports WHERE auth_user_id IS NOT NULL AND onboarding_completed_at IS NOT NULL) AS completed_passports,
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
        (SELECT count(DISTINCT source_id)::int
          FROM detected_changes WHERE status='pending_review') AS pending_review_groups,
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
          WHERE status='published' AND (detected_at AT TIME ZONE 'Europe/London')::date=(now() AT TIME ZONE 'Europe/London')::date) AS discovery_new_published_today,
        (SELECT count(*)::int FROM worldwide_source_listings
          WHERE source_status='source_confirmed'
            AND (created_at AT TIME ZONE 'Europe/London')::date=(now() AT TIME ZONE 'Europe/London')::date) AS source_confirmed_published_today,
        (SELECT count(*)::int FROM exact_vacancies
          WHERE status='open' AND status_verified=true AND verification_level='exact'
            AND deadline_at>now()
            AND (first_seen_at AT TIME ZONE 'Europe/London')::date=(now() AT TIME ZONE 'Europe/London')::date) AS exact_open_published_today,
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

    // The raw database also retains FAQs and historical discovery evidence.
    // Count only actual discoverable named programme pages in the dashboard.
    const sourcePagesToday=await sql`
      SELECT title,canonical_url,evidence->>'opportunity_kind' AS opportunity_kind
      FROM worldwide_source_listings
      WHERE source_status='source_confirmed'
        AND (created_at AT TIME ZONE 'Europe/London')::date=(now() AT TIME ZONE 'Europe/London')::date
    `;
    summary.source_confirmed_published_today=sourcePagesToday.filter(page=>
      page.opportunity_kind==='US federal grant'||isProgrammePage(page.title,page.canonical_url)).length;

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

    // The review queue shows ONE card per monitored page: the newest pending
    // alert, plus the net evidence across the whole pending window (the oldest
    // pending alert's "before" snapshot vs the newest alert's "after" snapshot).
    // A reviewer decides once for the page; every original event is retained
    // and individually stamped (see api/admin-review.js group action).
    const changes = await sql`
      WITH pending AS (
        SELECT c.*,
          count(*) OVER w AS related_events,
          count(*) FILTER (WHERE c.risk_level='high') OVER w AS high_events,
          count(*) FILTER (WHERE c.evidence_fingerprint IS NULL) OVER w AS legacy_unfingerprinted_events,
          count(*) FILTER (WHERE c.opportunity_id IS NULL) OVER w AS events_without_opportunity,
          min(c.detected_at) OVER w AS first_detected_at,
          max(c.detected_at) OVER w AS last_detected_at,
          first_value(c.previous_snapshot_id) OVER (PARTITION BY c.source_id ORDER BY c.detected_at ASC, c.id) AS window_previous_snapshot_id,
          row_number() OVER (PARTITION BY c.source_id ORDER BY c.detected_at DESC, c.id) AS group_rank
        FROM detected_changes c
        WHERE c.status='pending_review'
        WINDOW w AS (PARTITION BY c.source_id)
      ), types AS (
        SELECT source_id, string_agg(DISTINCT change_type, ', ' ORDER BY change_type) AS group_change_types
        FROM detected_changes WHERE status='pending_review' GROUP BY source_id
      ), recent AS (
        SELECT c.*, 1::bigint AS related_events, (c.risk_level='high')::int::bigint AS high_events,
          (c.evidence_fingerprint IS NULL)::int::bigint AS legacy_unfingerprinted_events,
          (c.opportunity_id IS NULL)::int::bigint AS events_without_opportunity,
          c.detected_at AS first_detected_at, c.detected_at AS last_detected_at,
          c.previous_snapshot_id AS window_previous_snapshot_id, 1::bigint AS group_rank
        FROM detected_changes c WHERE c.status<>'pending_review'
        ORDER BY coalesce(c.reviewed_at,c.detected_at) DESC LIMIT 20
      ), cards AS (
        SELECT * FROM pending WHERE group_rank=1
        UNION ALL SELECT * FROM recent
      )
      SELECT
        c.id, c.source_id, c.change_type, c.risk_level, c.field_name, c.old_value, c.new_value,
        c.diff_summary, c.status, c.detected_at, c.reviewed_at, c.review_note,
        c.related_events::int, c.high_events::int, c.legacy_unfingerprinted_events::int,
        c.events_without_opportunity::int, c.first_detected_at, c.last_detected_at,
        t.group_change_types,
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
        jsonb_build_object(
          'dates', coalesce(wprev.extraction_payload->'dates','[]'::jsonb) IS DISTINCT FROM coalesce(curr.extraction_payload->'dates','[]'::jsonb),
          'application', coalesce(wprev.extraction_payload->'application','[]'::jsonb) IS DISTINCT FROM coalesce(curr.extraction_payload->'application','[]'::jsonb),
          'eligibility', coalesce(wprev.extraction_payload->'eligibility','[]'::jsonb) IS DISTINCT FROM coalesce(curr.extraction_payload->'eligibility','[]'::jsonb),
          'funding', coalesce(wprev.extraction_payload->'funding','[]'::jsonb) IS DISTINCT FROM coalesce(curr.extraction_payload->'funding','[]'::jsonb)
        ) AS net_changed,
        jsonb_build_object(
          'dates', wprev.extraction_payload->'dates',
          'application', wprev.extraction_payload->'application'->0,
          'eligibility', wprev.extraction_payload->'eligibility'->0,
          'funding', wprev.extraction_payload->'funding'->0
        ) AS window_previous,
        m.source_key, m.provider, m.source_url,
        o.external_id AS opportunity_external_id, o.title AS opportunity_title,
        o.status AS opportunity_status, o.application_close_date AS opportunity_close_date
      FROM cards c
      LEFT JOIN types t ON t.source_id=c.source_id AND c.status='pending_review'
      JOIN monitored_sources m ON m.id=c.source_id
      LEFT JOIN opportunities o ON o.id=c.opportunity_id
      LEFT JOIN source_snapshots prev ON prev.id=c.previous_snapshot_id
      LEFT JOIN source_snapshots curr ON curr.id=c.current_snapshot_id
      LEFT JOIN source_snapshots wprev ON wprev.id=c.window_previous_snapshot_id
      ORDER BY CASE WHEN c.status='pending_review' THEN 0 ELSE 1 END,
               CASE WHEN c.high_events>0 THEN 0 ELSE 1 END,
               c.related_events DESC, c.detected_at DESC
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
