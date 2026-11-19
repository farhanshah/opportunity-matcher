// Publication of programmes verified by lib/verification-v2.js.
//
// v2 reads visible page text, so its eligibility facts are descriptive, not
// machine-exact. The matching UI treats an unknown nationality string, or an
// explicit country list without the user's country, as "not eligible". So:
//  - "All Nationalities" is stored only when the page says so explicitly;
//  - a stated restriction is stored as a review label, with the provider's
//    own wording kept in eligibility_notes (never widened, never invented);
//  - no hard eligibility rules are created from page text, except the
//    worldwide country scope when the page explicitly says so;
//  - degree levels mentioned are kept as notes, not as hard education rules.
import { discoveryId } from './auto-discovery.js';

export const COUNTRY_SPECIFIC_LABEL = 'Country-specific eligibility - see official page';

const STATUS_FOR = {
  VERIFIED_OPEN: 'Open',
  VERIFIED_UPCOMING: 'Opening Soon',
  VERIFIED_ROLLING: 'Rolling',
  EXPECTED_TO_REOPEN: 'Expected to Reopen'
};

export function v2Nationalities(result) {
  const n = result.record?.nationality || [];
  if (n.includes('All Nationalities') && !result.record?.nationality_restriction) return ['All Nationalities'];
  if (result.record?.nationality_restriction || n.length) return [COUNTRY_SPECIFIC_LABEL];
  return [];
}

export function v2Notes(result) {
  const r = result.record || {};
  const parts = [];
  if (r.nationality_restriction) parts.push('Nationality/residence (official wording): ' + r.nationality_restriction);
  if (r.education?.length) parts.push('Degree levels mentioned on the official page: ' + r.education.join(', '));
  const unsure = (result.uncertain || []).filter(u => !/^destination inferred/.test(u));
  if (unsure.length) parts.push('Not yet confirmed: ' + unsure.join('; '));
  parts.push('Always confirm eligibility on the official page before applying.');
  return parts.join(' | ').slice(0, 1800);
}

export function v2Evidence(result, url) {
  return {
    verifier: 'v2', decision: result.decision, source_url: url, checked_at: new Date().toISOString(),
    status_evidence: result.fields?.status?.evidence || '', deadline_evidence: result.fields?.deadline?.evidence || '',
    opening_evidence: result.fields?.openDate?.evidence || '', nationality_restriction: result.record?.nationality_restriction || '',
    education_mentioned: result.record?.education || [], uncertain: result.uncertain || []
  };
}

export function v2Status(result) { return STATUS_FOR[result.decision] || ''; }

export function v2Confidence(result) {
  return result.fields?.status?.confidence === 'high' ? 'high' : 'medium';
}

export async function publishV2(sql, source, url, result) {
  if (!result.publishable || !v2Status(result))
    return { status: 'needs_evidence', reason: (result.reasons || []).join('; ') || result.decision };
  const r = result.record;
  const clean = url.replace(/\/+$/, '');
  const [existing] = await sql`
    SELECT id FROM opportunities WHERE regexp_replace(official_source_url,'/+$','')=${clean} LIMIT 1`;
  // Existing records are refreshed only by the re-verification job, which
  // never overwrites their eligibility rules.
  if (existing) return { status: 'existing', id: existing.id, reason: 'Already in the catalogue' };
  const [duplicate] = await sql`
    SELECT id FROM opportunities WHERE lower(title)=lower(${r.title}) AND lower(provider)=lower(${r.provider}) LIMIT 1`;
  if (duplicate) return { status: 'needs_evidence', reason: 'Possible existing programme with a different official URL; duplicate withheld' };

  const id = discoveryId(url);
  const status = v2Status(result);
  const nationalities = v2Nationalities(result);
  const worldwide = nationalities[0] === 'All Nationalities';
  const close = result.decision === 'VERIFIED_OPEN' || result.decision === 'VERIFIED_UPCOMING' ? (r.deadline || null) : null;
  const open = r.openDate || null;
  const reopen = result.decision === 'EXPECTED_TO_REOPEN' ? (r.openDate || null) : null;
  const evidence = v2Evidence(result, url);
  const [created] = await sql`
    WITH upserted AS (
      INSERT INTO opportunities(
        external_id,title,provider,opportunity_type,destination_country,funding_type,status,
        application_open_date,application_close_date,expected_reopen_date,application_route,application_url,official_source_url,
        eligible_nationalities,education_levels,fields_of_study,benefits,eligibility_notes,
        last_verified_at,verification_confidence,raw_source_text,rule_normalization_status
      ) VALUES(
        ${id},${r.title},${r.provider},${r.type},${r.destination || null},${r.funding || 'See official page'},${status},
        ${open},${close},${reopen},'Official provider page',${url},${url},
        ${JSON.stringify(nationalities)}::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,
        ${v2Notes(result)},now(),${v2Confidence(result)},${JSON.stringify(evidence)},'partially_normalized'
      )
      ON CONFLICT(external_id) DO NOTHING
      RETURNING id
    ), ensured_rule AS (
      INSERT INTO opportunity_eligibility_rules(
        opportunity_id,rule_code,rule_label,operator,value_json,hard_rule,certainty,source_url,source_note,last_verified_at)
      SELECT upserted.id,'country_scope','Nationality eligibility','country_scope',
        ${JSON.stringify({ scope: 'worldwide', countries: [] })}::jsonb,true,'confirmed',${url},
        'Official page explicitly states all nationalities are eligible',now()
      FROM upserted WHERE ${worldwide}::boolean
      RETURNING id
    ), source_registered AS (
      INSERT INTO monitored_sources(source_key,provider,source_url,source_type,check_interval_minutes,expected_terms,is_active)
      SELECT ${'discovered_' + id.slice(5).toLowerCase()},${r.provider},${url},'official_page',1440,'[]'::jsonb,true
      FROM upserted
      WHERE NOT EXISTS (SELECT 1 FROM monitored_sources m WHERE regexp_replace(m.source_url,'/+$','')=${clean})
      ON CONFLICT(source_key) DO NOTHING
      RETURNING id
    ), candidate_registered AS (
      INSERT INTO opportunity_discovery_candidates(
        canonical_url,source_id,provider,title,opportunity_type,deadline_date,status,verification_reason,evidence,published_opportunity_id)
      SELECT ${url},${source.id},${source.provider},${r.title},${r.type},${close},
        'published',${'Verified (v2): ' + result.decision},${JSON.stringify({ ...evidence, discovered_from: source.source_url })}::jsonb,upserted.id
      FROM upserted
      ON CONFLICT(canonical_url) DO UPDATE SET
        status='published',verification_reason=EXCLUDED.verification_reason,evidence=EXCLUDED.evidence,
        published_opportunity_id=EXCLUDED.published_opportunity_id,last_checked_at=now(),updated_at=now()
      RETURNING id
    )
    SELECT id FROM upserted`;
  if (!created) return { status: 'needs_evidence', reason: 'Programme identity conflict; public record withheld' };
  return { status: 'published', id: created.id, candidateStored: true };
}

// Status update for an existing catalogue record re-checked against its own
// official URL. Returns null when the record must be left unchanged.
export function recheckUpdate(stored, result) {
  const s = String(stored.status || '');
  if (/varies/i.test(s)) return null; // country/programme-varying records need route evidence
  const r = result.record || {};
  switch (result.decision) {
    case 'VERIFIED_OPEN': return { status: 'Open', close: r.deadline || null, open: r.openDate || null };
    case 'VERIFIED_UPCOMING': return { status: 'Opening Soon', close: r.deadline || null, open: r.openDate || null };
    case 'VERIFIED_ROLLING': return { status: /^rolling/i.test(s) ? s : 'Rolling', close: null, open: null, keepClose: true };
    case 'EXPECTED_TO_REOPEN': return { status: /^expected to reopen/i.test(s) ? s : 'Expected to Reopen', close: null, open: null, keepClose: true, reopen: r.openDate || null };
    // A closed page keeps a richer "Expected to Reopen" label rather than downgrading it.
    case 'CLOSED': return { status: /^expected to reopen/i.test(s) ? s : 'Closed', close: null, open: null, keepClose: true };
    default: return null;
  }
}
