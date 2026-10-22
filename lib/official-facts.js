// Accept only explicitly labelled, programme-scoped facts from the official page.
// Never derive deadlines from incidental dates, news cards, or navigation.
function visible(value){
  return String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/<[^>]+>/g,' ').replace(/[ \t]+/g,' ').trim();
}
function isoDate(value){
  const s=String(value||'').trim();
  let y,m,d;
  const iso=s.match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  if(iso){y=+iso[1];m=+iso[2];d=+iso[3]}
  else{
    // Accept explicitly written English month names in either UK or US order.
    // Never guess what an ambiguous all-numeric date means.
    const british=s.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(20\d{2})$/);
    const american=s.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(20\d{2})$/);
    if(!british&&!american)return '';
    const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
    const name=british?british[2]:american[1];
    const n=months.indexOf(name.toLowerCase());if(n<0)return '';
    y=+(british?british[3]:american[3]);
    m=n+1;d=+(british?british[1]:american[2]);
  }
  const date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d
    ? date.toISOString().slice(0,10):'';
}
function mainLines(html){
  const matched=String(html||'').match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)
    || String(html||'').match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if(!matched)return null;
  const body=matched[1];
  const heading=body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if(!heading)return null;
  const lineText=body.replace(/<\/(?:p|div|li|dd|dt|section|h[1-6]|tr|td|th)>/gi,'\n')
    .replace(/<br\s*\/?>/gi,'\n');
  const lines=lineText.split('\n').map(visible).filter(x=>x.length>0&&x.length<=450);
  // Official universities also present single-programme fact sheets in
  // accessible <dl><dt>/<dd> and <table><th>/<td> pairs. Recognise only
  // adjacent, complete label/value pairs within the main/article scope.
  // Ambiguous or unmatched definition lists are ignored.
  for(const dl of body.matchAll(/<dl\b[^>]*>([\s\S]*?)<\/dl>/gi)){
    const source=dl[1];
    const termCount=[...source.matchAll(/<dt\b/gi)].length;
    const definitionCount=[...source.matchAll(/<dd\b/gi)].length;
    if(!termCount||termCount!==definitionCount)continue;
    const pairs=[...source.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)];
    if(pairs.length!==termCount)continue;
    for(const pair of pairs){
      const label=visible(pair[1]).replace(/:\s*$/,'');
      const value=visible(pair[2]);
      if(label&&value&&label.length<=100&&value.length<=350)
        lines.push(label+': '+value);
    }
  }
  for(const table of body.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
    for(const row of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
      const th=[...row[1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)];
      const td=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
      if(th.length!==1||td.length!==1)continue;
      const label=visible(th[0][1]).replace(/:\s*$/,'');
      const value=visible(td[0][1]);
      if(label&&value&&label.length<=100&&value.length<=350)
        lines.push(label+': '+value);
    }
  }
  return {title:visible(heading[1]),lines};
}
// Exact country names only. Never turn regional groups or vague wording
// (e.g. "Commonwealth countries") into unrestricted nationality eligibility.
const regions=new Intl.DisplayNames(['en'],{type:'region'});
const countryNames=new Map();
for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){
 const code=String.fromCharCode(a,b);
 const name=regions.of(code);
 if(name&&name!==code&&name.length>=3&&!/^(?:World|European Union|Unknown Region)$/i.test(name))
  countryNames.set(name.toLowerCase(),name);
}
countryNames.set('united kingdom','United Kingdom');
countryNames.set('united states','United States');
export function declaredNationalityScope(value){
 const raw=String(value||'').trim();
 if(/^(?:all nationalities|open to all nationalities|worldwide)$/i.test(raw))
  return {scope:'worldwide',countries:[]};
 const candidate=raw.replace(/^(?:citizens of|nationals of|applicants from|students from)\s+/i,'')
  .replace(/\s+(?:citizens|nationals)\s*$/i,'').replace(/\s+only$/i,'').trim();
 const country=countryNames.get(candidate.toLowerCase());
 return country?{scope:'explicit_list',countries:[country]}:null;
}

// Accept explicit single-discipline names from the same controlled categories
// used by the Opportunity Passport. Mixed, conditional and unexplained lists
// require provider-specific rules rather than automatic matching.
const recognisedFields=new Map([
 ['computer science','Computer Science, AI & Data'],
 ['computer science, ai & data','Computer Science, AI & Data'],
 ['business & management','Business & Management'],
 ['business and management','Business & Management'],
 ['agriculture, food & forestry','Agriculture, Food & Forestry'],
 ['agriculture, food and forestry','Agriculture, Food & Forestry'],
 ['economics','Economics'],
 ['public health','Public Health'],
 ['law & legal studies','Law & Legal Studies'],
 ['mathematics & statistics','Mathematics & Statistics'],
 ['mathematics and statistics','Mathematics & Statistics'],
 ['international relations & development','International Relations & Development'],
 ['environmental & earth sciences','Environmental & Earth Sciences'],
 ['physics & astronomy','Physics & Astronomy'],
 ['psychology','Psychology'],
 ['education & teaching','Education & Teaching']
]);
export function declaredFieldScope(value){
 const text=String(value||'').trim();
 if(/^(?:all fields|all fields of study|any discipline)$/i.test(text))
   return {scope:'all',fields:['All fields']};
 const field=recognisedFields.get(text.toLowerCase());
 return field?{scope:'explicit_list',fields:[field]}:null;
}

function oneLabel(lines,regex){
  const matches=lines.map(x=>x.match(regex)).filter(Boolean).map(m=>m[1].trim());
  return matches.length===1?matches[0]:'';
}
// Rolling calls or institution-specific cycles are useful discovery evidence,
// but never establish that a vacancy is currently open. Those programmes
// remain source-confirmed, not eligible for strong automatic matching.
export function parseApplicationTiming(html){
 const doc=mainLines(html);
 if(!doc)return {type:'unknown',wording:null,current_open_verified:false};
 const text=oneLabel(doc.lines,/^(?:Application period|Application schedule|Applications|Application deadline|Closing date|Deadline to apply)\s*:\s*(.+)$/i);
 if(!text||text.length>180)return {type:'unknown',wording:null,current_open_verified:false};
 const rolling=/^(?:rolling applications?|applications? accepted on a rolling basis|rolling basis|open year-round|year-round applications?|no fixed deadline)$/i.test(text);
 const institution=/^(?:varies by (?:institution|university|department|programme|program)|institution-specific deadlines?|deadlines? vary by (?:institution|university|programme|program))$/i.test(text);
 return {type:rolling?'rolling':institution?'institution_specific':'unspecified',
   wording:text,current_open_verified:false};
}

export function parseOfficialFactSheet(html){
  const doc=mainLines(html);
  if(!doc)return {complete:false,reasons:['no structured programme fact sheet inside main/article']};
  const deadlineText=oneLabel(doc.lines,/^(?:Application deadline|Application closing date|Applications close|Closing date|Deadline to apply|Apply by)\s*:\s*(.+)$/i);
  const openText=oneLabel(doc.lines,/^(?:Applications open|Applications start|Application opens|Opening date)\s*:\s*(.+)$/i);
  const funding=oneLabel(doc.lines,/^(?:Funding|Scholarship funding)\s*:\s*(.+)$/i);
  const nationality=oneLabel(doc.lines,/^(?:Eligible nationality|Nationality eligibility|Eligible applicants)\s*:\s*(.+)$/i);
  const education=oneLabel(doc.lines,/^(?:Education requirement|Academic requirement|Required qualification)\s*:\s*(.+)$/i);
  const fields=oneLabel(doc.lines,/^(?:Fields of study|Eligible subjects)\s*:\s*(.+)$/i);
  const destination=oneLabel(doc.lines,/^(?:Host country|Destination country|Study country)\s*:\s*(.+)$/i);
  const deadline=isoDate(deadlineText),openDate=isoDate(openText);
  const reasons=[];
  if(!/\b(scholarship|fellowship|internship|studentship|exchange)\b/i.test(doc.title))reasons.push('programme title lacks an opportunity type');
  if(!deadline)reasons.push('explicit single application deadline missing');
  if(!openDate)reasons.push('explicit opening date missing');
  if(openDate&&deadline&&openDate>deadline)reasons.push('opening after closing');
  if(!/^(?:fully funded|full funding|funded|paid internship|paid fellowship)$/i.test(funding))
    reasons.push('explicit funding classification missing');
  const nationalityScope=declaredNationalityScope(nationality);
  if(!nationalityScope)reasons.push('explicit recognised-country or worldwide nationality statement missing');
  if(!/^(?:bachelor'?s? degree|bachelor degree|master'?s? degree|secondary school)$/i.test(education))
    reasons.push('explicit education requirement missing');
  const fieldScope=declaredFieldScope(fields);
  if(!fieldScope)reasons.push('explicit supported field-of-study scope missing');
  if(!/^[A-Za-z][A-Za-z .,&()-]{2,79}$/.test(destination))
    reasons.push('explicit destination country missing');
  // A generic eligibility summary must not conceal additional hard conditions
  // that the matching engine would otherwise treat as unrestricted.
  const labelLine = /^(?:Application deadline|Closing date|Apply by|Applications open|Application opens|Opening date|Funding|Scholarship funding|Eligible nationality|Nationality eligibility|Eligible applicants|Education requirement|Academic requirement|Required qualification|Fields of study|Eligible subjects|Host country|Destination country|Study country)\s*:/i;
  if(doc.lines.some(line => !labelLine.test(line) &&
      /\b(?:must|only applicants|minimum age|maximum age|at least|professional experience|work experience|IELTS|TOEFL|GPA|citizenship restriction|residency requirement|institutional nomination)\b/i.test(line)))
    reasons.push('additional eligibility restrictions need explicit structured rules');
  // Generic programme pages often mention school nominations or multiple routes.
  if(doc.lines.some(s=>/\b(?:school nomination|nominating institution|multiple application deadlines|deadlines vary by institution|institution-specific deadlines)\b/i.test(s)))
    reasons.push('application route requires institution-level evidence');
  return {complete:reasons.length===0,reasons,title:doc.title,deadline,openDate,
    funding:/^fully funded|^full funding/i.test(funding)?'Fully Funded':'Funded',
    nationality:nationalityScope?.scope==='worldwide'?['All Nationalities']:(nationalityScope?.countries||[]),
    nationalityScope,
    education:/^bachelor/i.test(education)?"Bachelor's degree":/^master/i.test(education)?"Master's degree":'Secondary school',
    fields:fieldScope?.fields||[],fieldScope,destination,evidence:{
      deadline:deadlineText,open:openText,funding,nationality,education,fields,destination,
      fact_labels_present:doc.lines.length
    }};
}
