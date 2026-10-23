// Manual investigation links to provider-run or provider-listed destinations.
// These URLs do NOT automatically replace a monitored URL, verified source,
// country eligibility, cycle deadline, or application route.
export const OFFICIAL_RECOVERY_LINKS=Object.freeze({
  "asia_foundation_fellows": "https://asiafoundation.org/fellowship/asia-foundation-development-fellows/",
  "catalogue_fel-005": "https://asiafoundation.org/fellowship/asia-foundation-development-fellows/",
  "clarendon": "https://www.ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon",
  "catalogue_sch-007": "https://www.ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon/applicants",
  "rotary_peace": "https://my-cms.rotary.org/en/peace-fellowship-application",
  "curated_int-003": "https://www.imf.org/en/about/careers",
  "new_oecd_internships": "https://careers.smartrecruiters.com/OECD/internships---en",
  "catalogue_int-015": "https://www.unhcr.org/careers-unhcr",
  "new_unhcr_internships": "https://www.unhcr.org/careers-unhcr",
  "community_college_initiative": "https://www.usefp.org/scholarships/ccip.cfm",
  "fulbright_foreign_student": "https://usefp.org/scholarships/fulbright-degree.cfm"
});
export function getRecoveryLink(sourceKey){
  return OFFICIAL_RECOVERY_LINKS[String(sourceKey||'')]||null;
}
