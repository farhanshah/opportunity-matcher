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
      SELECT id, external_id, title, provider, opportunity_type, destination_country,
             funding_type, status, application_open_date, application_close_date,
             expected_reopen_date, application_route, application_url,
             official_source_url, application_fee, last_verified_at,
             verification_confidence, eligible_nationalities, education_levels,
             fields_of_study, minimum_gpa, minimum_age, maximum_age,
             work_experience_months, english_requirement, eligibility_notes, benefits
      FROM opportunities
      ORDER BY external_id
    `;
    const opportunities = rows.map(row => ({
      Database_ID: row.id,
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
      Verification_Confidence: prettyConfidence(row.verification_confidence),
      Eligible_Nationalities: Array.isArray(row.eligible_nationalities) ? row.eligible_nationalities : [],
      Education_Levels: Array.isArray(row.education_levels) ? row.education_levels : [],
      Fields_of_Study: Array.isArray(row.fields_of_study) ? row.fields_of_study : [],
      Minimum_GPA: row.minimum_gpa,
      Minimum_Age: row.minimum_age,
      Maximum_Age: row.maximum_age,
      Work_Experience_Months: row.work_experience_months,
      English_Requirement: row.english_requirement || '',
      Eligibility_Notes: row.eligibility_notes || '',
      Benefits: Array.isArray(row.benefits) ? row.benefits : []
    }));
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({ opportunities, count: opportunities.length, generated_at: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ error: 'Database query failed', detail: error.message });
  }
}