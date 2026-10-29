// Official programme pages or provider-linked recruitment platforms.
// Historical source IDs are retained. A successor must pass a real monitor check
// before an inaccessible original can be retired, with no eligibility publication.
export const OFFICIAL_SOURCE_SUCCESSORS=Object.freeze([
  {
    "original_key": "catalogue_prg-001",
    "successor_key": "successor_csp_irex",
    "provider": "IREX / Community Solutions",
    "source_url": "https://www.irex.org/project/community-solutions",
    "expected_terms": [
      "Community Solutions"
    ],
    "external_id": "PRG-001"
  },
  {
    "original_key": "fulbright_foreign_student",
    "successor_key": "successor_fulbright_global",
    "provider": "Fulbright Program",
    "source_url": "https://fulbrightprogram.org/apply/",
    "expected_terms": [
      "Fulbright Foreign Student Program"
    ],
    "external_id": "PRG-009"
  },
  {
    "original_key": "yes_program",
    "successor_key": "successor_yes_official",
    "provider": "YES Programs",
    "source_url": "https://www.yesprograms.org/about/about-us",
    "expected_terms": [
      "YES Program"
    ],
    "external_id": "PRG-005"
  },
  {
    "original_key": "onebeat",
    "successor_key": "successor_onebeat_direct",
    "provider": "OneBeat",
    "source_url": "https://1beat.org/programs/onebeat/",
    "expected_terms": [
      "OneBeat"
    ],
    "external_id": "PRG-007"
  },
  {
    "original_key": "global_ugrad",
    "successor_key": "successor_worldlearning_ugrad",
    "provider": "World Learning / Global UGRAD",
    "source_url": "https://www.worldlearning.org/program/global-undergraduate-exchange-program/",
    "expected_terms": ["Global Undergraduate Exchange Program"],
    "external_id": null
  },
  {
    "original_key": "rotary_peace",
    "successor_key": "successor_rotary_current_official_page",
    "provider": "Rotary International",
    "source_url": "https://www.rotary.org/get-involved/our-programs/peace-fellowships",
    "expected_terms": ["Peace Fellowship"],
    "external_id": null
  },
  {
    "original_key": "rotary_peace",
    "successor_key": "successor_rotary_fellowships",
    "provider": "Rotary International",
    "source_url": "https://my-cms.rotary.org/en/peace-fellowship-application",
    "expected_terms": ["Peace Fellowship"],
    "external_id": null
  },
  {
    "original_key": "new_who_internships",
    "successor_key": "successor_who_internship_programme",
    "provider": "World Health Organization",
    "source_url": "https://www.who.int/careers/internship-programme",
    "expected_terms": ["Internship Programme"],
    "external_id": null
  },
  {
    "original_key": "ucl_global_masters",
    "successor_key": "successor_ucl_masters_funding",
    "provider": "University College London",
    "source_url": "https://www.ucl.ac.uk/study/prospective-students/graduate/funding-your-masters/fund-your-masters-global-masters-scholarship",
    "expected_terms": ["Global Masters Scholarship"],
    "external_id": null
  },
  {
    "original_key": "new_unhcr_internships",
    "successor_key": "successor_unhcr_uk_internships",
    "provider": "UNHCR",
    "source_url": "https://www.unhcr.org/uk/get-involved/work-us/careers-unhcr/types-contracts-and-appointments/internships",
    "expected_terms": ["Internships"],
    "external_id": null
  },
  {
    "original_key": "new_oecd_internships",
    "successor_key": "successor_oecd_applications",
    "provider": "OECD / SmartRecruiters",
    "source_url": "https://careers.smartrecruiters.com/OECD/internships---en",
    "expected_terms": [
      "OECD Internship Programme"
    ],
    "external_id": null
  }
]);
export function safeSuccessors(rows=OFFICIAL_SOURCE_SUCCESSORS){
 const keys=new Set(),urls=new Set();
 return rows.map(row=>{
  const {original_key,successor_key,provider,source_url,expected_terms,external_id}=row;
  const parsed=new URL(source_url);
  if(!/^successor_[a-z_]+$/.test(successor_key)||!original_key||!provider||
    parsed.protocol!=='https:'||parsed.username||parsed.password||!parsed.hostname.includes('.')||
    parsed.hostname.endsWith('.local')||/^d+.d+.d+.d+$/.test(parsed.hostname)||
    !Array.isArray(expected_terms)||!expected_terms.length||
    expected_terms.some(v=>typeof v!=='string'||v.length<3)||keys.has(successor_key)||
    urls.has(source_url))throw Error('Invalid official successor');
  keys.add(successor_key);urls.add(source_url);
  return {original_key,successor_key,provider,source_url,expected_terms,external_id};
 });
}
