export const OPPORTUNITY_BASE='https://oppmatcher.tech';
export const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const isoDay=value=>{
  if(!value)return '';
  const date=new Date(value);
  return Number.isFinite(date.getTime())?date.toISOString().slice(0,10):'';
};
export const publicSlug=row=>{
  const provider=String(row?.provider||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const jobId=String(row?.provider_job_id||'');
  return provider&&/^\d{3,15}$/.test(jobId)?provider+'-'+jobId:'';
};
export const categoryType=row=>{
  const type=String(row?.opportunity_type||'').toLowerCase();
  if(/intern/.test(type))return 'internships';
  if(/fellow/.test(type))return 'fellowships';
  if(/scholar/.test(type))return 'scholarships';
  return 'other';
};
export const publishedState=(row,now=Date.now())=>{
  if(!row)return 'unavailable';
  const deadline=row.deadline_at?new Date(row.deadline_at).getTime():NaN;
  if(String(row.status||'').toLowerCase()==='closed'||row.closed_at||
     (Number.isFinite(deadline)&&deadline<=now))return 'closed';
  const checked=row.last_verified_at?new Date(row.last_verified_at).getTime():NaN;
  const sourceValid=Boolean(safePublicSource(row.source_url));
  const meaningfulIdentity=String(row.title||'').trim().length>=8 &&
    String(row.provider||'').trim().length>0 && /^\d{3,15}$/.test(String(row.provider_job_id||''));
  const active=meaningfulIdentity && String(row.status||'').toLowerCase()==='open'&&
    row.status_verified===true&&row.verification_level==='exact'&&
    Number.isFinite(deadline)&&deadline>now&&sourceValid&&
    Number.isFinite(checked)&&checked>=now-7*86400000&&checked<=now+300000;
  return active?'open':'needs-recheck';
};
export function safePublicSource(raw){
  try{
    const url=new URL(String(raw||''));
    return url.protocol==='https:'&&!url.username&&!url.password&&url.hostname.includes('.')?url.href:'';
  }catch{return ''}
}
// Only return verbatim, explicit restrictions from a verified posting title.
// Never infer unrestricted eligibility from the absence of such a phrase.
export function restrictionFromTitle(title=''){
 const value=String(title||'').replace(/\s+/g,' ').trim();
 const patterns=[
   /\b(?:open to|only for)\s+([A-Za-z][A-Za-z ]{2,72}?(?:\s+only|\s+living with disabilit(?:y|ies)))(?=[,;:.)-]|$)/i,
   /\b([A-Za-z][A-Za-z -]{2,45}\s+nationals?\s+only)\b/i,
   /\b(only for [A-Za-z][A-Za-z ]{2,70})\b/i
 ];
 for(const re of patterns){const found=value.match(re);if(found)return found[0].trim().slice(0,115)}
 return '';
}

export const narrowFacts=row=>{
  const raw=row?.raw_payload||{};
  const high=raw.detail_evidence_quality==='high';
  // Fields must come from high-quality exact official vacancy evidence, not
  // programme-wide policy excerpts or unverified generative summaries.
  const asText=v=>typeof v==='string'&&v.trim().length>1&&v.trim().length<=360?v.trim():'';
  return {
    education:high?asText(raw.minimum_education):'',
    language:high?asText(raw.required_language):'',
    // The verified title itself may explicitly restrict nationality.
    titleRestriction:restrictionFromTitle(row?.title||'')
  };
};
