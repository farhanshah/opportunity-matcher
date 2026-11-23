import { db } from '../lib/db.js';
import { adminAuthorised } from '../lib/admin-auth.js';

const authorised = req => adminAuthorised(req);

const ACTIONS = {
  approve: 'approved',
  ignore: 'ignored',
  investigate: 'pending_review'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorized' });

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = String(body.id || '');
    const sourceId = String(body.source_id || '');
    const through = String(body.through || '');
    const action = String(body.action || '');
    const note = String(body.note || '').trim().slice(0, 2000);
    const status = ACTIONS[action];
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const sql = db();
    const reviewedAt = action === 'investigate' ? null : new Date().toISOString();

    // Group decision: every pending alert for one monitored page, up to the
    // newest alert the reviewer was shown (alerts arriving later stay pending).
    if (sourceId) {
      if (!UUID.test(sourceId) || !status || action === 'investigate' || Number.isNaN(Date.parse(through)))
        return res.status(400).json({ error: 'Valid source_id, through timestamp and approve/ignore action are required' });
      const rows = await sql`
        UPDATE detected_changes
        SET status=${status}, reviewed_at=${reviewedAt},
            review_note=${'Group decision for this page (all pending alerts up to ' + new Date(through).toISOString() + '). ' + (note || '')}
        WHERE source_id=${sourceId} AND status='pending_review' AND detected_at <= ${new Date(through).toISOString()}
        RETURNING id
      `;
      return res.status(200).json({ ok: true, group: true, updated: rows.length, status });
    }

    if (!id || !status) return res.status(400).json({ error: 'Valid change id and action are required' });
    const rows = await sql`
      UPDATE detected_changes
      SET status=${status},
          reviewed_at=${reviewedAt},
          review_note=${note || null}
      WHERE id=${id}
      RETURNING id, status, reviewed_at, review_note
    `;

    if (!rows.length) return res.status(404).json({ error: 'Change not found' });
    return res.status(200).json({ ok: true, change: rows[0] });
  } catch (error) {
    console.error('Admin review API failed', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
