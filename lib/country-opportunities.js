// A vacancy country is a location, NOT citizenship eligibility.
export const COUNTRY_NAMES=Object.freeze([
 'Algeria','Argentina','Australia','Austria','Bangladesh','Belgium','Brazil','Canada',
 'Chile','China','Colombia','Czechia','Denmark','Djibouti','Egypt','Ethiopia','Finland',
 'France','Germany','Ghana','India','Indonesia','Ireland','Italy','Japan','Jordan',
 'Kazakhstan','Kenya','Lithuania','Malaysia','Mexico','Morocco','Nepal','Netherlands',
 'New Zealand','Nigeria','Norway','Pakistan','Peru','Philippines','Poland','Portugal',
 'Qatar','Romania','Rwanda','Saudi Arabia','Senegal','Singapore','South Africa',
 'South Korea','Spain','Sri Lanka','Sweden','Switzerland','Tanzania','Thailand',
 'Türkiye','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States',
 'Uzbekistan','Vietnam'
]);
const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const countrySlug=slug;
export function countryFromLocation(location){
 const t=String(location||'').trim();
 // Only explicit location facts can drive a public country page. Do not infer
 // nationality from title text, provider identity or country search results.
 if(!t||/\b(?:multiple|various|worldwide|remote|global)\b/i.test(t))return null;
 return COUNTRY_NAMES.find(name=>t===name||
  t.endsWith(', '+name)||t.endsWith(' · '+name))||null;
}
export function liveCountries(rows){
 const byCountry=new Map();
 for(const row of rows){
  const name=countryFromLocation(row.location);
  if(!name)continue;
  const list=byCountry.get(name)||[];list.push(row);byCountry.set(name,list);
 }
 return [...byCountry].map(([name,records])=>({name,slug:slug(name),records}))
   .sort((a,b)=>a.name.localeCompare(b.name));
}
