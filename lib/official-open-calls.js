export const OFFICIAL_OPEN_CALLS=Object.freeze([
 {slug:'campus-france-mopga-2027',
  provider:'Campus France',
  title:'MOPGA 2027: Visiting Fellowship Program for Early Career Researchers',
  url:'https://www.campusfrance.org/en/mopga-2027',
  // Official Campus France SMApply shows closing at 23:59 CET (UTC+1).
  portal_url:'https://campusfrance.smapply.io/prog/mopga_2027/',
  deadline:'2026-12-15T22:59:00Z',
  countries:[],
  requirement:'Nationality: non-French only. Applicants must have defended a PhD between December 2021 and December 2026, not be residing and professionally active in France, and not have previously received MOPGA funding. Eligible climate/environmental research and a French host laboratory are required. This is a 12-month research fellowship, not a masters or PhD studentship; international travel costs are not covered. Closing date: 15 December 2026, 23:59 CET (verified on the official Campus France application portal).' },
 {slug:'chevening-british-library-southeast-asian-fellowship',
  title:'Chevening British Library Southeast Asian Fellowship',
  url:'https://www.chevening.org/fellowship/chevening-british-library-southeast-asian-fellowship/',
  deadline:'2026-10-27T12:00:00Z',
  countries:['Cambodia','Laos','Thailand'],
  requirement:'Mid-career professionals; postgraduate-level qualification or equivalent, at least five years of relevant research experience and specified language skills'},
 {slug:'chevening-british-library-coptic-collections-fellowship',
  title:'Chevening British Library Coptic Collections Fellowship',
  url:'https://www.chevening.org/fellowship/chevening-british-library-coptic-collections-fellowship/',
  deadline:'2026-10-27T12:00:00Z',
  countries:['Egypt','Palestine','Sudan'],
  requirement:'Mid-career researchers with Coptic collection expertise; postgraduate-level qualification or equivalent and at least five years of relevant experience'}
 ,
 {slug:'royal-society-dorothy-hodgkin-fellowship',
  title:'Dorothy Hodgkin Fellowship',
  url:'https://royalsociety.org/grants/dorothy-hodgkin-fellowship/',
  deadline:'2026-10-29T00:00:00Z',countries:[],
  requirement:'Early-career researchers needing flexibility due to personal circumstances; Royal Society and host-institution conditions apply'},
 {slug:'royal-society-leverhulme-senior-research',
  title:'Royal Society Leverhulme Trust Senior Research Fellowship',
  url:'https://royalsociety.org/grants/leverhulme-trust-senior-research/',
  deadline:'2026-11-04T00:00:00Z',countries:[],
  requirement:'Experienced senior or mid-career researchers; see Royal Society conditions and eligible appointment types'},
 {slug:'royal-society-career-development-fellowship',
  title:'Career Development Fellowship',
  url:'https://royalsociety.org/grants/career-development-fellowship/',
  deadline:'2026-11-18T00:00:00Z',countries:[],
  requirement:'Early-career STEM researchers from specified underrepresented groups; UK research career and eligibility rules apply'},
 {slug:'royal-society-yusuf-hamied-visiting-fellowships',
  title:'The Royal Society Yusuf Hamied Visiting Fellowships',
  url:'https://www.royalsociety.org/grants/yusuf-hamied-visiting-fellowships/',
  deadline:'2026-11-06T23:59:59Z',countries:[],
  requirement:'Only Fellows of the Royal Society may apply; the visit is to India, with additional programme requirements'},
 {slug:'royal-society-partnership-grants-2026',
  title:'Partnership Grants',
  url:'https://royalsociety.org/grants/partnership-grants/application/',
  deadline:'2026-12-01T23:59:59Z',countries:[],
  requirement:'Only eligible schools and colleges working with STEM professionals; institutional grant, not a personal student scholarship'},
 {slug:'royal-society-ispf-international-collaboration-awards',
  title:'International Science Partnerships Fund International Collaboration Awards',
  url:'https://royalsociety.org/grants/international-collaboration-awards-ispf/',
  deadline:'2026-12-03T00:00:00Z',countries:[],
  requirement:'Newly independent UK-based researchers collaborating with eligible overseas independent researchers; country-specific calls and institutional requirements apply'}

]);
export function officialPageSaysOpen(html,call,now=new Date()){
 if(!(new Date(now).getTime()<Date.parse(call.deadline)))return false;
 const original=String(html||'');
 if(original.length<450||original.length>2500000)return false;
 const text=original
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]*>/g,' ')
  .replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
  .replace(/\s+/g,' ').trim();
 const host=new URL(call.url).hostname;
 if(host==='www.campusfrance.org'&&new URL(call.url).pathname==='/en/mopga-2027'&&call.slug==='campus-france-mopga-2027'){
   if(new Date(now).getTime()<Date.parse('2026-09-15T00:00:00Z'))return false;
   if(/\b(?:applications are closed|call for applications is closed|no longer accepting applications|status:\s*closed)\b/i.test(text))return false;
   // A current programme-specific provider page must confirm both dates,
   // doctoral eligibility and the French-nationality exclusion. Do not
   // accept aggregator summaries, a generic programme page or stale calls.
   return /\bMOPGA\s+2027\b/i.test(text)
     && /visiting fellowship program for early career researchers/i.test(text)
     && /15\s+September\s+2026\s*:\s*Applications\s+open/i.test(text)
     && /15\s+December\s+2026\s*:\s*Application\s+deadline/i.test(text)
     && /(?:doctoral degree|PhD)\b/i.test(text)
     && /December\s+2021\s+and\s+December\s+2026/i.test(text)
     && /all nationalities are eligible except French nationality/i.test(text)
     && /not be residing and professionally active in France/i.test(text)
     && /not have previously received a MOPGA fellowship/i.test(text);
 }

 if(!text.toLowerCase().includes(call.title.toLowerCase()))return false;
 if(/\bapplications are closed\b/i.test(text))return false;
 if(!/\b(?:applications are open|open for applications until)\b/i.test(text)&&!/\bStatus:\s*Open\b/i.test(text))return false;
 const day=new Date(call.deadline);
 const expected=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(day);
 const dateRx=expected.replace(/\s+/g,'\\s+');
 const isChevening=host==='www.chevening.org';

 if(isChevening){
   if(!new RegExp('open for applications until\\s+'+dateRx,'i').test(text))return false;
 }else if(host==='royalsociety.org'||host==='www.royalsociety.org'){
   if(!/\bStatus:\s*Open\b/i.test(text))return false;
   if(!new RegExp('\\bDeadline:\\s*'+dateRx,'i').test(text))return false;
 }else return false;
 if(!call.countries.every(c=>new RegExp('\\b'+c+'\\b','i').test(text)))return false;
 return true;
}

export function officialMopgaPortalSaysOpen(html,call,now=new Date()){
 if(call?.slug!=='campus-france-mopga-2027'||
    call?.portal_url!=='https://campusfrance.smapply.io/prog/mopga_2027/')return false;
 const time=new Date(now).getTime();
 if(!Number.isFinite(time)||time<Date.parse('2026-09-15T04:00:00Z')||time>=Date.parse(call.deadline))return false;
 const plain=String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
 if(plain.length<150||plain.length>1500000)return false;
 return /MOPGA 2027\s*:\s*Visiting Fellowship Program for Early Career Researchers/i.test(plain)
  && /(?:Opens|Apply Opens)\s+15\s+Sep\s+2026\s+06:00\s*\(?CEST\)?/i.test(plain)
  && /Deadline\s+15\s+Dec\s+2026\s+23:59\s*\(?CET\)?/i.test(plain)
  && /(?:www[.]campusfrance[.]org|campusfrance[.]org)\/en\/mopga-2027/i.test(plain)
  && !/(?:applications?|programme)\s+(?:are|is)\s+(?:closed|suspended)|no longer accepting applications/i.test(plain);
}
