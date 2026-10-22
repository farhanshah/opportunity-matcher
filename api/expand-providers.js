import {db} from '../lib/db.js';
import {canonicalUrl,officialHostMatches} from '../lib/auto-discovery.js';
const MAX_ADMISSIONS=8;
const authorised=req=>Boolean(process.env.CRON_SECRET)&&req.headers.authorization==='Bearer '+process.env.CRON_SECRET;
const unsafe=/\/(?:privacy|terms|contact|about|news|blog|login|signup|search)(?:\/|$)/i;
// Never register new hosts from search leads. Only reuse a trusted registry's hostname AND named provider.
export function eligibleSource(opp,registered){
  const url=canonicalUrl(opp?.official_source_url);
  if(!url||unsafe.test(new URL(url).pathname))return null;
  const matches=(registered||[]).filter(s=>s.is_active!==false&&
    String(s.provider||'').trim().toLowerCase()===String(opp?.provider||'').trim().toLowerCase()&&
    officialHostMatches(url,s.source_url||''));
  if(!matches.length)return null;
  return {url,provider:matches[0].provider,key:'catalogue_'+
    String(opp.external_id||'').toLowerCase().replace(/[^a-z0-9_-]/g,'_')};
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
  if(!authorised(req))return res.status(401).json({ok:false,error:'Unauthorized'});
  try{
    const sql=db();
    const sources=await sql`SELECT provider,source_url,is_active FROM monitored_sources WHERE is_active=true`;
    const rows=await sql`SELECT external_id,provider,official_source_url FROM opportunities
      WHERE official_source_url IS NOT NULL ORDER BY external_id`;
    const existing=new Set(sources.map(s=>canonicalUrl(s.source_url)).filter(Boolean));
    const candidates=[];
    for(const row of rows){
      const c=eligibleSource(row,sources);
      if(!c||existing.has(c.url))continue;
      existing.add(c.url);candidates.push(c);
      if(candidates.length>=MAX_ADMISSIONS)break;
    }
    let added=0;
    for(const entry of candidates){
      const rows=await sql`INSERT INTO monitored_sources
        (source_key,provider,source_url,source_type,check_interval_minutes,expected_terms,is_active)
        SELECT ${entry.key},${entry.provider},${entry.url},'official_page',1440,'[]'::jsonb,true
        WHERE NOT EXISTS (SELECT 1 FROM monitored_sources
          WHERE regexp_replace(source_url,'/+$','')=${entry.url.replace(/\/+$/,'')})
        ON CONFLICT(source_key) DO NOTHING RETURNING id`;
      added+=rows.length;
    }
    return res.status(200).json({ok:true,admitted:added,eligible_candidates:candidates.length,
      policy:'Trusted catalogue links on previously registered host with matching provider'});
  }catch(err){
    console.error('Provider admission failed',String(err?.message||err).slice(0,140));
    return res.status(500).json({ok:false,error:'Provider admission failed safely'});
  }
}
