import { normalizeHtml, extractSignals } from './monitor.js';

// Compare like with like. A page menu or footer changing cannot establish a
// scholarship eligibility change when the actual programme body is unchanged.
// Use one clearly delimited <main> (or a single <article>) only when BOTH
// versions have sufficiently substantive body content. Otherwise fail safely
// back to the previous full-page comparison.
function primaryContent(html){
  const document=String(html||'');
  if(!document)return null;
  let matches=[...document.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/gi)];
  if(matches.length!==1)matches=[...document.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/gi)];
  if(matches.length!==1)return null;
  const content=normalizeHtml(matches[0][1]);
  if(content.length<250 ||
    !/\b(scholarship|fellowship|internship|studentship|application|eligib|tuition|stipend|graduate|funding)\w*/i.test(content))
    return null;
  return content;
}

export function comparableSourceSignals(currentHtml,previousHtml=null,previousPayload=null){
  const currentPrimary=primaryContent(currentHtml);
  const previousPrimary=primaryContent(previousHtml);
  if(previousHtml&&currentPrimary&&previousPrimary){
    return {current:extractSignals(currentPrimary),previous:extractSignals(previousPrimary),
      extraction_mode:'paired-primary-content'};
  }
  if(!previousHtml&&!previousPayload&&currentPrimary){
    return {current:extractSignals(currentPrimary),previous:null,
      extraction_mode:'primary-content-baseline'};
  }
  const current=extractSignals(normalizeHtml(currentHtml));
  const previous=previousHtml
    ?extractSignals(normalizeHtml(previousHtml))
    :(previousPayload||null);
  return {current,previous,extraction_mode:'full-page-fallback'};
}
