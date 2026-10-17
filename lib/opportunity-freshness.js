// One source fetch is not proof that every programme, rule and country route is current.
export const FRESHNESS_WINDOW_DAYS=30;
export function evidenceIsCurrent(value,nowMs=Date.now()){
  if(!value)return false;
  const stamp=new Date(value).getTime();
  const cutoff=nowMs-FRESHNESS_WINDOW_DAYS*86400000;
  // Clock-skew tolerance avoids treating impossible future verification dates as current.
  return Number.isFinite(stamp)&&stamp>=cutoff&&stamp<=nowMs+300000;
}
export function recheckCategory(value){
  const text=String(value||'');
  if(text==='verified_current_cycle')return 'verified_current_cycle';
  if(text.startsWith('needs_evidence'))return 'needs_evidence';
  if(text.startsWith('retry_needed'))return 'retry_needed';
  return 'not_checked';
}
