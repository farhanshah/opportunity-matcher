import { db } from '../lib/db.js';

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
      SELECT external_id, title, provider, opportunity_type, destination_country,
             funding_type, status, application_open_date, application_close_date,
             expected_reopen_date, application_route, application_url,
             official_source_url, application_fee, last_verified_at,
             verification_confidence
      FROM opportunities
      ORDER BY external_id
    `;
    const opportunities = rows.map(row => ({
      Opportunity_ID: row.external_id,
      Opportunity_Name: row.title,
      Provider: row.provider,
      Type: row.opportunity_type,
      Destination: row.destination_country || '',
      Funding: row.funding_type || '',
      Status: row.status || '',
      Open_Date: isoDate(row.application_open_date),
      Close_Date: isoDate(row.application_close_date),
      Expected_Reopen: isoDate(row.expected_reopen_date),
      Application_Route: row.application_route || '',
      Application_URL: row.application_url || '',
      Official_Source_URL: row.official_source_url || '',
      Application_Fee: row.application_fee || '',
      Last_Verified: isoDate(row.last_verified_at),
      Verification_Confidence: prettyConfidence(row.verification_confidence)
    }));
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({ opportunities, count: opportunities.length, generated_at: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ error: 'Database query failed', detail: error.message });
  }
}
