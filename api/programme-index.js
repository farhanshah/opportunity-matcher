// Public, read-only catalogue index used to regenerate the static hub
// sections (tools/refresh-programme-index.mjs, daily GitHub Action).
// Only facts already shown publicly on /opportunity pages are returned.
import { db } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  try {
    const rows = await db()`
      SELECT external_id,title,provider,opportunity_type,destination_country,funding_type,
        education_levels,fields_of_study,
        (jsonb_array_length(coalesce(eligible_nationalities,'[]'))>0
          AND NOT eligible_nationalities ? 'All Nationalities') AS restricted
      FROM opportunities
      WHERE coalesce(title,'')<>'' AND official_source_url ~ '^https://'
      ORDER BY external_id`;
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    res.setHeader('X-Robots-Tag', 'noindex');
    return res.status(200).json(rows);
  } catch (e) {
    console.error('Programme index unavailable', e?.message);
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Retry-After', '900');
    return res.status(503).json({ error: 'Temporarily unavailable' });
  }
}
