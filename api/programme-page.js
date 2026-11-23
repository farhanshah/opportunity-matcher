// Public, indexable programme pages: /opportunity and /opportunity/<slug>.
import { db } from '../lib/db.js';
import { renderProgramme, renderHub, externalIdFromSlug, slugFor, pathFor } from '../lib/programme-pages.js';

async function rows(sql) {
  return sql`
    SELECT external_id,title,provider,opportunity_type,destination_country,funding_type,status,
      application_open_date,application_close_date,expected_reopen_date,application_route,
      application_url,official_source_url,eligible_nationalities,education_levels,fields_of_study,
      minimum_gpa,minimum_age,maximum_age,work_experience_months,english_requirement,application_fee,
      benefits,eligibility_notes,last_verified_at,updated_at
    FROM opportunities
    WHERE coalesce(title,'')<>'' AND official_source_url ~ '^https://'
    ORDER BY external_id`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).end('Method not allowed'); }
  const slug = String(req.query?.slug || '').toLowerCase();
  try {
    const sql = db();
    const all = await rows(sql);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // CDN keeps serving the last good copy for a day if the database is briefly unavailable.
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    if (!slug) return res.status(200).send(renderHub(all));
    const id = externalIdFromSlug(slug);
    const row = id && all.find(r => r.external_id === id);
    if (!row) { res.setHeader('X-Robots-Tag', 'noindex'); return res.status(404).send('Programme not found'); }
    if (slugFor(row) !== slug) { res.setHeader('Location', pathFor(row)); return res.status(301).end(); }
    const related = all.filter(r => r !== row && r.opportunity_type === row.opportunity_type)
      .sort((a, b) => (a.destination_country === row.destination_country ? 0 : 1) - (b.destination_country === row.destination_country ? 0 : 1))
      .slice(0, 6);
    return res.status(200).send(renderProgramme(row, related));
  } catch (e) {
    console.error('Programme page unavailable', e?.message);
    // Temporary outage: tell crawlers to come back, never to de-index.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '900');
    return res.status(503).send('Temporarily unavailable – please try again shortly');
  }
}
