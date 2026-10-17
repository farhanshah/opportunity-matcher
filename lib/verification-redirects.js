import { canonicalUrl,officialHostMatches } from './auto-discovery.js';

// Validate HTTPS and the exact provider host without losing a significant path
// trailing slash. This does not permit cross-domain redirects or SSRF targets.
export function resolveOfficialRedirect(location,current,authority){
  if(typeof location!=='string'||!location.trim()||location.length>4096)
    throw Error('Official host redirect invalid');
  let target;
  try{target=new URL(location,current)}catch{throw Error('Official host redirect invalid')}
  const valid=canonicalUrl(target.href);
  if(!valid||!officialHostMatches(valid,authority))
    throw Error('Official host redirect invalid');
  target.hash='';
  return target.href;
}
