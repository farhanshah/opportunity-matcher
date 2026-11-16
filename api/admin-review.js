import { db } from '../lib/db.js';
import { authorisedAdmin } from '../lib/operations-auth.js';



const ACTIONS = {
  approve: 'approved',
  ignore: 'ignored',
  investigate: 'pending_review'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorisedAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = String(body.id || '');
    const action = String(body.action || '');
    const note = String(body.note || '').trim().slice(0, 2000);
    const status = ACTIONS[action];

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !status)
      return res.status(400).json({ error: 'Valid change id and action are required' });

    const sql = db();
    const reviewedAt = action === 'investigate' ? null : new Date().toISOString();
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
    console.error('Admin review API failed');
    return res.status(503).json({ ok: false, error: 'Review service temporarily unavailable' });
  }
}
