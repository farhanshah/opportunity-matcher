// Manually selected, official programme and careers pages. Admission does not imply
// an application is open or that a candidate meets eligibility requirements.
export const CURATED_PROVIDER_SOURCES = Object.freeze([
  {
    "source_key": "new_unesco_internships",
    "provider": "UNESCO",
    "source_url": "https://careers.unesco.org/content/Internship-Programme/"
  },
  {
    "source_key": "new_unesco_internship_jobs",
    "provider": "UNESCO",
    "source_url": "https://careers.unesco.org/search/?q=internships"
  },
  {
    "source_key": "new_oecd_internships",
    "provider": "OECD",
    "source_url": "https://www.oecd.org/en/about/careers/internships.html"
  },
  {
    "source_key": "new_unido_internships",
    "provider": "UNIDO",
    "source_url": "https://careers.unido.org/content/Internship/"
  },
  {
    "source_key": "new_unhcr_internships",
    "provider": "UNHCR",
    "source_url": "https://www.unhcr.org/pages/49c3646c49d.html"
  },
  {
    "source_key": "new_who_internships",
    "provider": "World Health Organization",
    "source_url": "https://careers.who.int/"
  },
  {
    "source_key": "new_humboldt_fellowship",
    "provider": "Alexander von Humboldt Foundation",
    "source_url": "https://www.humboldt-foundation.de/en/apply/sponsorship-programmes/humboldt-research-fellowship"
  },
  {
    "source_key": "new_humboldt_programmes",
    "provider": "Alexander von Humboldt Foundation",
    "source_url": "https://www.humboldt-foundation.de/en/apply/sponsorship-programmes"
  },
  {
    "source_key": "new_royalsociety_portfolio",
    "provider": "Royal Society",
    "source_url": "https://royalsociety.org/grants/"
  },
  {
    "source_key": "new_royalsociety_research",
    "provider": "Royal Society",
    "source_url": "https://royalsociety.org/grants/university-research/"
  },
  {
    "source_key": "new_royalsociety_calendar",
    "provider": "Royal Society",
    "source_url": "https://www.royalsociety.org/grants/application-dates/"
  },
  {
    "source_key": "new_wellcome_early_career",
    "provider": "Wellcome",
    "source_url": "https://wellcome.org/research-funding/schemes/wellcome-early-career-awards"
  },
  {
    "source_key": "new_wellcome_funding",
    "provider": "Wellcome",
    "source_url": "https://wellcome.org/research-funding/schemes"
  },
  {
    "source_key": "new_msca_postdoc",
    "provider": "European Commission / MSCA",
    "source_url": "https://marie-sklodowska-curie-actions.ec.europa.eu/actions/postdoctoral-fellowships"
  },
  {
    "source_key": "new_erasmus_traineeships",
    "provider": "European Commission",
    "source_url": "https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/traineeships-abroad-for-students"
  },
  {
    "source_key": "new_australian_rtp",
    "provider": "Australian Government Department of Education",
    "source_url": "https://www.education.gov.au/research-block-grants/research-training-program"
  },
  {
    "source_key": "new_schwarzman_admissions",
    "provider": "Schwarzman Scholars",
    "source_url": "https://www.schwarzmanscholars.org/admissions/"
  },
  {
    "source_key": "new_europe_scholarship_funding",
    "provider": "European Commission",
    "source_url": "https://education.ec.europa.eu/study-in-europe/planning-your-studies/scholarships-and-funding"
  }
]);
export function validatedCuratedProviders(items=CURATED_PROVIDER_SOURCES){
 const keys=new Set(),urls=new Set();
 return items.map(entry=>{
  const source_key=String(entry.source_key||'');
  const provider=String(entry.provider||'').trim();
  const source_url=String(entry.source_url||'');
  const u=new URL(source_url);
  if(!/^new_[a-z0-9_]+$/.test(source_key)||!provider||
    u.protocol!=='https:'||u.username||u.password||
    !u.hostname.includes('.')||u.hostname.startsWith('[')||
    /^(?:localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(u.hostname)||
    u.hostname.endsWith('.local')||keys.has(source_key)||urls.has(source_url))
   throw Error('Invalid or repeated vetted source');
  keys.add(source_key);urls.add(source_url);
  return {source_key,provider,source_url};
 });
}
