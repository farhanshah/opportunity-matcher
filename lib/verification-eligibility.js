// The catalogue may already contain complex country/subject/degree restrictions.
// A re-verification job must not replace them with more permissive conditions
// or stamp them freshly verified after comparing a substring.
export function exactVerifiedEligibility(stored,extracted){
  if(!Array.isArray(stored)||!stored.length||
     !Array.isArray(extracted)||!extracted.length)return false;
  const normal=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  const sorted=values=>[...new Set(values.map(normal))].sort();
  const a=sorted(stored),b=sorted(extracted);
  return a.length===b.length&&a.every((v,i)=>v===b[i]);
}
export function eligibilityRecheckCompatible(oldRecord,newRecord){
  return exactVerifiedEligibility(oldRecord.eligible_nationalities,newRecord.nationality) &&
   exactVerifiedEligibility(oldRecord.education_levels,newRecord.education) &&
   exactVerifiedEligibility(oldRecord.fields_of_study,newRecord.fields);
}
