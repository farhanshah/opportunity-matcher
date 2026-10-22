import { db } from '../lib/db.js';
import { evidenceIsCurrent,FRESHNESS_WINDOW_DAYS,recheckCategory } from '../lib/opportunity-freshness.js';

function isoDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function prettyConfidence(value) {
  if (!value) return '';
  return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const sql = db();
    const rows = await sql`
      SELECT id, external_id, title, provider, opportunity_type, destination_country,
             funding_type, status, application_open_date, application_close_date,
             expected_reopen_date, application_route, application_url,
             official_source_url, application_fee, last_verified_at,
             verification_confidence, eligible_nationalities, education_levels,
             fields_of_study, minimum_gpa, minimum_age, maximum_age,
             work_experience_months, english_requirement, eligibility_notes, benefits,
             rule_normalization_status, rule_normalized_at,last_recheck_at,last_recheck_outcome
      FROM opportunities
      ORDER BY external_id
    `;

    const ruleRows = await sql`
      SELECT opportunity_id, rule_code, rule_label, operator, value_json, hard_rule,
             certainty, source_url, source_note, effective_cycle, last_verified_at
      FROM opportunity_eligibility_rules
      ORDER BY opportunity_id, rule_code
    `;
    const nowMs=Date.now();
    const isStale=value=>!evidenceIsCurrent(value,nowMs);
    const ruleMap = new Map();
    for (const rule of ruleRows) {
      const key = String(rule.opportunity_id);
      if (!ruleMap.has(key)) ruleMap.set(key, []);
      ruleMap.get(key).push({
        code: rule.rule_code,
        label: rule.rule_label,
        operator: rule.operator,
        value: rule.value_json || {},
        hard: Boolean(rule.hard_rule),
        certainty: rule.certainty || 'confirmed',
        source_url: rule.source_url || '',
        source_note: rule.source_note || '',
        cycle: rule.effective_cycle || '',
        last_verified: isoDate(rule.last_verified_at),
        verification_stale: isStale(rule.last_verified_at),
        freshness_status: isStale(rule.last_verified_at)?'needs_source_recheck':'recently_verified'
      });
    }

    const routeRows = await sql`
      SELECT opportunity_id, country_name, route_name, route_type, cycle, status,
             application_open_date, application_close_date, local_deadline_text,
             application_url, official_source_url, application_channel,
             eligibility_overrides, route_notes, verification_confidence,
             last_verified_at
      FROM opportunity_country_routes
      WHERE is_active = true
      ORDER BY opportunity_id, country_name, application_close_date DESC NULLS LAST, cycle DESC
    `;
    const routeMap = new Map();
    for (const route of routeRows) {
      const key = String(route.opportunity_id);
      if (!routeMap.has(key)) routeMap.set(key, []);
      routeMap.get(key).push({
        country: route.country_name || '',
        route_name: route.route_name || '',
        route_type: route.route_type || '',
        cycle: route.cycle || '',
        status: route.status || '',
        open_date: isoDate(route.application_open_date),
        close_date: isoDate(route.application_close_date),
        deadline_text: route.local_deadline_text || '',
        application_url: route.application_url || '',
        official_source_url: route.official_source_url || '',
        application_channel: route.application_channel || '',
        eligibility_overrides: route.eligibility_overrides || {},
        notes: route.route_notes || '',
        confidence: prettyConfidence(route.verification_confidence),
        last_verified: isoDate(route.last_verified_at),
        verification_stale: isStale(route.last_verified_at),
        freshness_status: isStale(route.last_verified_at)?'needs_source_recheck':'recently_verified'
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const opportunities = rows.map(row => ({
      Database_ID: row.id,
      Opportunity_ID: row.external_id,
      Opportunity_Name: row.title,
      Provider: row.provider,
      Type: row.opportunity_type,
      Destination: row.destination_country || '',
      Funding: row.funding_type || '',
      Status: row.application_close_date && isoDate(row.application_close_date) < today ? 'Closed' : (row.status || ''),
      Open_Date: isoDate(row.application_open_date),
      Close_Date: isoDate(row.application_close_date),
      Expected_Reopen: isoDate(row.expected_reopen_date),
      Application_Route: row.application_route || '',
      Application_URL: row.application_url || '',
      Official_Source_URL: row.official_source_url || '',
      Application_Fee: row.application_fee || '',
      Last_Verified: isoDate(row.last_verified_at),
      // Historical provider confidence must not be mistaken for current evidence.
      Verification_Confidence: prettyConfidence(row.verification_confidence),
      Verification_Confidence_Current: isStale(row.last_verified_at)?'Needs source recheck':prettyConfidence(row.verification_confidence),
      Verification_Stale: isStale(row.last_verified_at),
      Verification_Status: isStale(row.last_verified_at)?'Reverification overdue':'Recently source-verified',
      Last_Recheck: isoDate(row.last_recheck_at),
      Recheck_Category: recheckCategory(row.last_recheck_outcome),
      Eligible_Nationalities: Array.isArray(row.eligible_nationalities) ? row.eligible_nationalities : [],
      Education_Levels: Array.isArray(row.education_levels) ? row.education_levels : [],
      Fields_of_Study: Array.isArray(row.fields_of_study) ? row.fields_of_study : [],
      Minimum_GPA: row.minimum_gpa,
      Minimum_Age: row.minimum_age,
      Maximum_Age: row.maximum_age,
      Work_Experience_Months: row.work_experience_months,
      English_Requirement: row.english_requirement || '',
      Eligibility_Notes: row.eligibility_notes || '',
      Benefits: Array.isArray(row.benefits) ? row.benefits : [],
      Rule_Normalization_Status: row.rule_normalization_status || 'unreviewed',
      Rule_Normalized_At: isoDate(row.rule_normalized_at),
      Eligibility_Rules: ruleMap.get(String(row.id)) || [],
      Country_Routes: routeMap.get(String(row.id)) || []
    }));

    const freshness={
      window_days:FRESHNESS_WINDOW_DAYS,
      programme_total:rows.length,
      programme_needs_recheck:rows.filter(row=>isStale(row.last_verified_at)).length,
      rule_total:ruleRows.length,
      rule_needs_recheck:ruleRows.filter(row=>isStale(row.last_verified_at)).length,
      country_route_total:routeRows.length,
      country_route_needs_recheck:routeRows.filter(row=>isStale(row.last_verified_at)).length,
      meaning:'Official-source monitoring does not prove individual programme, rule or route details are current.'
    };
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ opportunities, count: opportunities.length, freshness, generated_at: new Date(nowMs).toISOString() });
  } catch (error) {
    console.error('Public catalogue endpoint unavailable');
    return res.status(503).json({ error: 'Catalogue temporarily unavailable' });
  }
}
