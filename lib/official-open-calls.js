export const CHEVENING_OPEN_CALLS=Object.freeze([
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
 if(!text.toLowerCase().includes(call.title.toLowerCase()))return false;
 if(/\bapplications are closed\b/i.test(text))return false;
 if(!/\b(?:applications are open|open for applications until)\b/i.test(text))return false;
 if(!/open for applications until\s+27\s+october\s+2026/i.test(text))return false;
 if(!call.countries.every(c=>new RegExp('\\b'+c+'\\b','i').test(text)))return false;
 return true;
}
