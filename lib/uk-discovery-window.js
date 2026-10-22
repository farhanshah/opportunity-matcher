// Cron schedules use UTC; the product's promised discovery time uses UK civil time.
// Resolve via IANA timezone so GMT/BST changes never require a manual cron edit.
export function isEightAmUK(now=new Date()){
  const hour=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'
  }).format(now);
  return Number(hour)===8;
}
