import { db } from '../lib/db.js';
import { SOURCE_OPPORTUNITY_MAP, normalizeHtml, sha256, extractSignals, meaningfulChange, expectedContentPresent } from '../lib/monitor.js';

const MAX_SOURCES_PER_RUN = 10;
const FETCH_CONCURRENCY = 5;

function authorised(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}

async function fetchSource(source) {
  const headers = {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'en-GB,en;q=0.9',
    'cache-control': 'no-cache',
    'pragma': 'no-cache'
  };
  if (source.etag) headers['if-none-match'] = source.etag;
  if (source.last_modified) headers['if-modified-since'] = source.last_modified;
  const response = await fetch(source.source_url, { headers, redirect: 'follow', signal: AbortSignal.timeout(25000) });
  if (response.status === 304) return { notModified: true, status: 304, response };
  const html = await response.text();
  return { notModified: false, status: response.status, html, response };
}

async function processSource(sql, source) {
  const checkedAt = new Date().toISOString();
  try {
    const fetched = await fetchSource(source);
    if (fetched.notModified) {
      await sql`UPDATE monitored_sources SET last_checked_at=${checkedAt}, last_success_at=${checkedAt}, last_http_status=304, last_error=NULL, updated_at=now() WHERE id=${source.id}`;
      return { source: source.source_key, result: 'not-modified' };
    }
    if (fetched.status < 200 || fetched.status >= 400) throw new Error(`HTTP ${fetched.status}`);
    const text = normalizeHtml(fetched.html);
    if (text.length < 300) throw new Error('Fetched page was unexpectedly short');
    if (!expectedContentPresent(text, source.expected_terms)) throw new Error('Expected-content guard failed');

    const contentHash = sha256(text);
    const signals = extractSignals(text);
    const [previous] = await sql`
      SELECT id, content_hash, extraction_payload
      FROM source_snapshots WHERE source_id=${source.id}
      ORDER BY fetched_at DESC LIMIT 1
    `;

    if (previous?.content_hash === contentHash) {
      await sql`UPDATE monitored_sources SET last_checked_at=${checkedAt}, last_success_at=${checkedAt}, last_http_status=${fetched.status}, last_error=NULL, etag=${fetched.response.headers.get('etag')}, last_modified=${fetched.response.headers.get('last-modified')}, updated_at=now() WHERE id=${source.id}`;
      return { source: source.source_key, result: 'unchanged' };
    }

    const [snapshot] = await sql`
      INSERT INTO source_snapshots(source_id, content_hash, http_status, page_title, extracted_text, raw_html, extraction_payload)
      VALUES(${source.id}, ${contentHash}, ${fetched.status}, ${source.provider}, ${text.slice(0, 120000)}, ${fetched.html.slice(0, 500000)}, ${JSON.stringify(signals)}::jsonb)
      ON CONFLICT(source_id, content_hash) DO UPDATE SET fetched_at=now()
      RETURNING id
    `;

    const change = previous ? meaningfulChange(previous.extraction_payload || {}, signals) : null;
    let reviewEvent = null;
    if (change) {
      const externalId = SOURCE_OPPORTUNITY_MAP[source.source_key] || null;
      let opportunityId = null;
      if (externalId) {
        const [opp] = await sql`SELECT id FROM opportunities WHERE external_id=${externalId} LIMIT 1`;
        opportunityId = opp?.id || null;
      }
      const status = change.risk === 'low' ? 'auto_accepted' : 'pending_review';
      const [event] = await sql`
        INSERT INTO detected_changes(source_id, opportunity_id, previous_snapshot_id, current_snapshot_id, change_type, risk_level, field_name, diff_summary, status)
        VALUES(${source.id}, ${opportunityId}, ${previous.id}, ${snapshot.id}, ${change.change_type}, ${change.risk}, ${change.changed.join(',')}, ${`Structured source signals changed: ${change.changed.join(', ')}`}, ${status})
        RETURNING id, risk_level, status
      `;
      reviewEvent = event;
    }

    await sql`UPDATE monitored_sources SET last_checked_at=${checkedAt}, last_success_at=${checkedAt}, last_http_status=${fetched.status}, last_error=NULL, etag=${fetched.response.headers.get('etag')}, last_modified=${fetched.response.headers.get('last-modified')}, updated_at=now() WHERE id=${source.id}`;
    return { source: source.source_key, result: previous ? (change ? 'meaningful-change' : 'non-semantic-change') : 'baseline-created', review: reviewEvent };
  } catch (error) {
    await sql`UPDATE monitored_sources SET last_checked_at=${checkedAt}, last_http_status=NULL, last_error=${String(error.message || error).slice(0, 1000)}, updated_at=now() WHERE id=${source.id}`;
    return { source: source.source_key, result: 'error', error: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const sql = db();
    const due = await sql`
      SELECT id, source_key, provider, source_url, expected_terms, etag, last_modified,
             check_interval_minutes, last_checked_at
      FROM monitored_sources
      WHERE is_active=true
        AND (last_checked_at IS NULL OR last_checked_at <= now() - (check_interval_minutes * interval '1 minute'))
      ORDER BY last_checked_at NULLS FIRST, check_interval_minutes ASC, source_key
      LIMIT ${MAX_SOURCES_PER_RUN}
    `;

    const results = [];
    for (let i = 0; i < due.length; i += FETCH_CONCURRENCY) {
      const batch = due.slice(i, i + FETCH_CONCURRENCY);
      const batchResults = await Promise.all(batch.map(source => processSource(sql, source)));
      results.push(...batchResults);
    }

    return res.status(200).json({ ok: true, processed: results.length, results, ran_at: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
