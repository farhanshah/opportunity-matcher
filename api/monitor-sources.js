import { db } from '../lib/db.js';
import { runDueSourceChecks } from './monitor.js';

// Source-only daily pass: runs after the primary monitor job.
// This job deliberately does not run exact-vacancy ingestion a second time.
const MAX_SOURCES_PER_RUN = 26;
const FETCH_CONCURRENCY = 16;

function authorised(req) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorized' });

  res.setHeader('Cache-Control', 'no-store');
  try {
    const startedAt = Date.now();
    const sql = db();
    const batch = await runDueSourceChecks(sql, MAX_SOURCES_PER_RUN, FETCH_CONCURRENCY);
    const counts = batch.results.reduce((result, row) => {
      result[row.result] = (result[row.result] || 0) + 1;
      return result;
    }, {});
    return res.status(200).json({
      ok: true,
      mode: 'sources-only',
      processed: batch.results.length,
      due_selected: batch.due_selected,
      max_sources_per_run: MAX_SOURCES_PER_RUN,
      concurrency: FETCH_CONCURRENCY,
      counts,
      duration_ms: Date.now() - startedAt,
      ran_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Secondary source monitor failed', error);
    return res.status(500).json({ ok: false, error: 'Source monitor failed' });
  }
}
