import {canonicalUrl} from './auto-discovery.js';
const REGIONS=[
  ['Europe',"2027 international scholarships funded universities application deadline Europe"],
  ['Africa',"2027 scholarships fellowships funded African universities official applications"],
  ['South Asia',"2027 funded scholarships graduate research internships South Asia official"],
  ['East Asia',"2027 fully funded scholarships university fellowships East Asia official"],
  ['North America',"2027 international fellowships funded research university scholarships North America"],
  ['South America',"2027 international scholarships grants fellowships universities Latin America"],
  ['Oceania',"2027 research scholarships Australia New Zealand Pacific application funded"],
  ['Middle East',"2027 fully funded international scholarship graduate programmes Middle East"],
  ['Global internships',"2027 funded internships international organizations apply official"],
  ['Global fellowships',"2027 international professional fellowship application funded official"],
  ['Student exchanges',"2027 global student exchange programmes funded application official"],
  ['Research opportunities',"2027 international research grant fellowship studentships funded official"]
];
export const WORLDWIDE_DAILY_QUERY_LIMIT=12;
export function worldwideQueries(now=new Date(),officialHosts=[]){
  const nextYear=now.getUTCFullYear()+1;
  const regional=REGIONS.map(([region,search])=>({
    region,query:search.replace(/2027/g,String(nextYear)),officialTarget:false
  }));
  // A search result is still only a lead. Restrict targeted searches to domains
  // already approved in the monitored-source registry; never approve a new host
  // just because a search provider returned it.
  const hosts=[...new Set(officialHosts.map(x=>String(x||'').toLowerCase()
    .replace(/^www\./,'').trim()).filter(x=>
      /^[a-z0-9][a-z0-9.-]{3,251}\.[a-z]{2,63}$/.test(x)&&
      !x.includes('..')&&!x.includes('localhost'))) ].sort();
  if(!hosts.length)return regional.slice(0,WORLDWIDE_DAILY_QUERY_LIMIT);
  const day=Math.floor(now.getTime()/86400000);
  const count=Math.min(6,hosts.length);
  const offset=(day*count)%hosts.length;
  const targeted=Array.from({length:count},(_,i)=>{
    const host=hosts[(offset+i)%hosts.length];
    return {region:'Official provider: '+host,
      query:'site:'+host+' '+now.getUTCFullYear()+' '+nextYear+
        ' scholarship fellowship internship application deadline',
      officialTarget:true};
  });
  // Rotate the regional half too, so none of the eight continents/other
  // categories disappear from the search calendar.
  const remaining=WORLDWIDE_DAILY_QUERY_LIMIT-targeted.length;
  const regionStart=(day*remaining)%regional.length;
  const broad=Array.from({length:remaining},(_,i)=>regional[(regionStart+i)%regional.length]);
  return [...broad,...targeted];
}
const IGNORE=/^(?:www\.)?(?:facebook\.com|instagram\.com|linkedin\.com|youtube\.com|tiktok\.com|x\.com|twitter\.com|pinterest\.com)$/i;
export function normalizeWebLead(item,region,query,officialHosts=[]){
  const url=canonicalUrl(item?.url);
  if(!url)return null;
  const host=new URL(url).hostname.toLowerCase().replace(/^www\./,'');
  if(IGNORE.test(host))return null;
  const title=String(item?.title||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,220);
  if(title.length<12)return null;
  const snippet=String(item?.description||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,700);
  return {canonical_url:url,title,snippet,search_query:query,search_region:region,
    matched_official_host:officialHosts.includes(host)};
}
export function uniqueLeads(items){
  const results=new Map();
  for(const x of items)if(x&&!results.has(x.canonical_url))results.set(x.canonical_url,x);
  return [...results.values()];
}
