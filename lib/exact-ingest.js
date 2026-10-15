import crypto from 'node:crypto';

const SOURCES = [
  { provider: 'UNDP', programme: 'INT-006', path: '/api/undp-openings' },
  { provider: 'UNICEF', programme: 'INT-005', path: '/api/unicef-openings' },
  { provider: 'WFP', programme: 'INT-013', path: '/api/wfp-openings' },
  { provider: 'UNOPS', programme: 'INT-019', path: '/api/unops-openings' },
  { provider: 'FAO', programme: 'INT-012', path: '/api/specific-openings?opportunity_id=INT-012' }
];

export function originFromRequest(req) {
  // Scheduled invocations can arrive on an SSO-protected *.vercel.app host.
  // Provider adapters are public on the custom production domain. Never
  // derive ingestion requests from the untrusted forwarded Host header.
  const configured = process.env.OPPMATCHER_PUBLIC_ORIGIN || 'https://oppmatcher.tech';
  const origin = new URL(configured);
  if (origin.protocol !== 'https:' || origin.hostname !== 'oppmatcher.tech' || origin.username || origin.password || origin.port) {
    throw new Error('OPPMATCHER_PUBLIC_ORIGIN must be the authorised public HTTPS domain');
  }
  return origin.origin;
}

function canonicalUrl(raw) {
  try {
    const u = new URL(String(raw || ''));
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(?:ts|utm_.+|fbclid|gclid)$/i.test(key)) u.searchParams.delete(key);
    }
    u.searchParams.sort();
    return u.toString().replace(/\/$/, '');
  } catch {
    return String(raw || '').trim().replace(/#.*$/, '').replace(/\/$/, '');
  }
}

function providerJobId(row) {
  if (row?.job_id) return String(row.job_id);
  const url = String(row?.url || '');
  try {
    const u = new URL(url);
    const queryJob = u.searchParams.get('job');
    if (queryJob) return String(queryJob);
    for (const pattern of [
      /\/requisitions\/job\/(\d+)/i,
      /\/job\/(\d{4,})/i,
      /\/JobDetail\/(?:[^/]+\/)?(\d+)(?:\/)?$/i
    ]) {
      const match = u.pathname.match(pattern);
      if (match) return match[1];
    }
  } catch {}
  return crypto.createHash('sha256').update(canonicalUrl(url)).digest('hex').slice(0, 24);
}

function deadlineTimestamp(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T23:59:59Z`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function workMode(row) {
  const hay = `${row?.title || ''} ${row?.location || ''}`;
  if (/\bhome[- ]?based\b|\bremote\b/i.test(hay)) return 'Home Based';
  if (/\bhybrid\b/i.test(hay)) return 'Hybrid';
  return row?.location ? 'On-site / location-based' : '';
}

function authoritative(data) {
  if (!data || data.ok !== true) return false;
  if (data.fetch_error) return false;
  if (['degraded','empty','unreadable'].includes(String(data.verification_health || '').toLowerCase())) return false;
  if (String(data.adapter_state || '').toLowerCase() === 'unreadable') return false;
  return true;
}

async function fetchJson(url, timeout = 32000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'OpportunityMatcher-Ingestion/1.0'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function ingestProvider(sql, origin, source) {
  const [run] = await sql`
    INSERT INTO exact_vacancy_ingest_runs(provider, run_status)
    VALUES(${source.provider}, 'running')
    RETURNING id
  `;

  try {
    const separator = source.path.includes('?') ? '&' : '?';
    const data = await fetchJson(`${origin}${source.path}${separator}ingest_ts=${Date.now()}`);
    const healthy = authoritative(data);
    const openings = (Array.isArray(data?.openings) ? data.openings : [])
      .filter(row => row?.status_verified === true && row?.verification_level === 'exact' && row?.url);
    const seen = new Set();

    if (healthy) {
      for (const row of openings) {
        const jobId = providerJobId(row);
        const url = canonicalUrl(row.url);
        if (!jobId || !url || seen.has(jobId)) continue;
        seen.add(jobId);
        const facts = {
          title: row.title || '',
          location: row.location || '',
          deadline: row.deadline || '',
          status_source: row.status_source || '',
          verification_basis: row.verification_basis || '',
          detail_scope: row.detail_scope || row.evidence_scope || '',
          adapter_state: data.adapter_state || '',
          board_url: data.board_url || ''
        };
        await sql`
          INSERT INTO exact_vacancies(
            provider, provider_job_id, programme_external_id, title, opportunity_type,
            location, work_mode, deadline_at, source_url, canonical_url, status,
            verification_level, status_verified, facts, raw_payload,
            first_seen_at, last_seen_at, last_verified_at, closed_at, updated_at
          ) VALUES(
            ${source.provider}, ${jobId}, ${source.programme}, ${String(row.title || `${source.provider} opportunity`)}, 'Internship',
            ${String(row.location || '')}, ${workMode(row)}, ${deadlineTimestamp(row.deadline)}, ${String(row.url)}, ${url}, 'open',
            'exact', true, ${JSON.stringify(facts)}::jsonb, ${JSON.stringify(row)}::jsonb,
            now(), now(), now(), NULL, now()
          )
          ON CONFLICT(provider, provider_job_id) DO UPDATE SET
            programme_external_id=EXCLUDED.programme_external_id,
            title=EXCLUDED.title,
            opportunity_type=EXCLUDED.opportunity_type,
            location=EXCLUDED.location,
            work_mode=EXCLUDED.work_mode,
            deadline_at=EXCLUDED.deadline_at,
            source_url=EXCLUDED.source_url,
            canonical_url=EXCLUDED.canonical_url,
            status='open',
            verification_level='exact',
            status_verified=true,
            facts=EXCLUDED.facts,
            raw_payload=EXCLUDED.raw_payload,
            last_seen_at=now(),
            last_verified_at=now(),
            closed_at=NULL,
            updated_at=now()
        `;
      }

      // Do not infer that a vacancy closed merely because a provider search
      // failed to return it. A complete, verified inventory is required.
      if (data.complete_inventory_verified === true && data.withheld_unverifiable === false) {
      const existing = await sql`
        SELECT provider_job_id
        FROM exact_vacancies
        WHERE provider=${source.provider}
          AND programme_external_id=${source.programme}
          AND status='open'
      `;
      for (const row of existing) {
        if (seen.has(String(row.provider_job_id))) continue;
        await sql`
          UPDATE exact_vacancies
          SET status='closed', closed_at=COALESCE(closed_at, now()), updated_at=now()
          WHERE provider=${source.provider}
            AND programme_external_id=${source.programme}
            AND provider_job_id=${String(row.provider_job_id)}
            AND status='open'
        `;
      }
      } else {
        // Expiration with an exact, stored closing timestamp is deterministic.
        await sql`
          UPDATE exact_vacancies SET status='closed',
            closed_at=COALESCE(closed_at,now()),updated_at=now()
          WHERE provider=${source.provider}
            AND programme_external_id=${source.programme}
            AND status='open' AND deadline_at IS NOT NULL AND deadline_at < now()
        `;
      }
    }

    const runStatus = healthy ? 'healthy' : 'degraded';
    const metadata = {
      programme: source.programme,
      adapter_state: data?.adapter_state || '',
      verification_health: data?.verification_health || '',
      board_url: data?.board_url || '',
      fetch_error: data?.fetch_error || ''
    };
    await sql`
      UPDATE exact_vacancy_ingest_runs
      SET finished_at=now(), run_status=${runStatus},
          candidate_count=${Number(data?.candidate_count ?? data?.dynamic_rows ?? 0) || 0},
          exact_count=${openings.length}, error_text=${data?.fetch_error ? String(data.fetch_error).slice(0, 1000) : null},
          metadata=${JSON.stringify(metadata)}::jsonb
      WHERE id=${run.id}
    `;
    return { provider: source.provider, status: runStatus, exact: openings.length, authoritative: healthy };
  } catch (error) {
    await sql`
      UPDATE exact_vacancy_ingest_runs
      SET finished_at=now(), run_status='degraded', error_text=${String(error.message || error).slice(0, 1000)}
      WHERE id=${run.id}
    `;
    return { provider: source.provider, status: 'degraded', exact: 0, authoritative: false, error: error.message };
  }
}

export async function ingestExactVacancies(sql, req) {
  const origin = originFromRequest(req);
  return Promise.all(SOURCES.map(source => ingestProvider(sql, origin, source)));
}

export const EXACT_INGEST_SOURCES = SOURCES.map(source => ({ ...source }));
