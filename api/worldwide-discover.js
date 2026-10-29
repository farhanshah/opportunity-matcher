import {db} from '../lib/db.js';
import {worldwideQueries,normalizeWebLead,uniqueLeads} from '../lib/worldwide-search.js';

function authorised(req){
  const secret=process.env.CRON_SECRET;
  return Boolean(secret)&&req.headers.authorization==='Bearer '+secret;
}
async function searchBrave(query,secret,officialTarget=false,countryTarget=false){
  const url=new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q',query);
  url.searchParams.set('count','10');
  url.searchParams.set('search_lang','en');
  // Official programme pages can be older than a month yet still current.
  // General discovery retains freshness filtering to limit repeated results.
  if(!officialTarget&&!countryTarget)url.searchParams.set('freshness','pm');
  const response=await fetch(url,{signal:AbortSignal.timeout(9500),headers:{
    Accept:'application/json','X-Subscription-Token':secret
  }});
  if(!response.ok)throw Error('Search provider HTTP '+response.status);
  const data=await response.json();
  return Array.isArray(data?.web?.results)?data.web.results.slice(0,10):[];
}
export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  if(!authorised(req))return res.status(401).json({error:'Unauthorized'});
  res.setHeader('Cache-Control','no-store');
  const secret=process.env.BRAVE_SEARCH_API_KEY;
  let sql,runId;
  try{
    sql=db();
    const [started]=await sql`INSERT INTO opportunity_web_search_runs(status) VALUES('running') RETURNING id`;
    runId=started.id;
    if(!secret){
      await sql`UPDATE opportunity_web_search_runs SET status='not_configured',completed_at=now()
        WHERE id=${runId}`;
      return res.status(200).json({ok:true,configured:false,message:'Worldwide web search requires a search API key. Official-source discovery remains active.'});
    }
    const sources=await sql`SELECT source_url FROM monitored_sources WHERE is_active=true`;
    const officialHosts=[...new Set(sources.map(s=>{
      try{return new URL(s.source_url).hostname.toLowerCase().replace(/^www\./,'')}catch{return ''}
    }).filter(Boolean))];
    const tasks=worldwideQueries(new Date(),officialHosts);
    const leads=[];
    let queries=0,providerErrors=0,foundResults=0;
    for(let offset=0;offset<tasks.length;offset+=4){
      const batch=tasks.slice(offset,offset+4);
      const results=await Promise.all(batch.map(async task=>{
        try{return {task,items:await searchBrave(task.query,secret,task.officialTarget,task.countryTarget),ok:true}}
        catch(error){console.warn('Worldwide search query unavailable',task.region,String(error?.message||error).slice(0,70));
          return {task,items:[],ok:false}}
      }));
      for(const result of results){
        queries++;
        if(!result.ok){providerErrors++;continue;}
        foundResults+=result.items.length;
        for(const item of result.items){
          const lead=normalizeWebLead(item,result.task.region,result.task.query,officialHosts);
          if(lead)leads.push(lead);
        }
      }
    }
    const unique=uniqueLeads(leads);
    let newlyAdded=0;
    if(unique.length){
      const rows=await sql`
        INSERT INTO opportunity_web_leads(canonical_url,title,snippet,search_query,search_region,
          matched_official_host,review_status,verification_status,verification_reason)
        SELECT x.canonical_url,x.title,x.snippet,x.search_query,x.search_region,
          x.matched_official_host,'unverified',
          CASE WHEN x.matched_official_host THEN 'pending' ELSE 'source_review' END,
          CASE WHEN x.matched_official_host THEN NULL
             ELSE 'Provider hostname is not in the official-source registry' END
        FROM jsonb_to_recordset(${JSON.stringify(unique)}::jsonb) AS x(
          canonical_url text,title text,snippet text,search_query text,search_region text,matched_official_host boolean)
        ON CONFLICT (canonical_url) DO UPDATE SET
          last_seen_at=now(),matched_official_host=EXCLUDED.matched_official_host,
          verification_status=CASE
            WHEN EXCLUDED.matched_official_host
             AND opportunity_web_leads.verification_status='source_review'
             AND opportunity_web_leads.verification_reason='Provider hostname is not in the official-source registry'
            THEN 'pending' ELSE opportunity_web_leads.verification_status END,
          verification_reason=CASE
            WHEN EXCLUDED.matched_official_host
             AND opportunity_web_leads.verification_status='source_review'
             AND opportunity_web_leads.verification_reason='Provider hostname is not in the official-source registry'
            THEN NULL ELSE opportunity_web_leads.verification_reason END
        RETURNING (xmax=0) AS newly_added
      `;
      newlyAdded=rows.filter(r=>r.newly_added).length;
    }
    const matched=unique.filter(x=>x.matched_official_host).length;
    const complete=new Date().toISOString();
    await sql`
      UPDATE opportunity_web_search_runs SET completed_at=${complete},status='completed',
        queries_attempted=${queries},results_found=${foundResults},new_leads=${newlyAdded},
        matched_official_hosts=${matched},provider_errors=${providerErrors}
      WHERE id=${runId}
    `;
    return res.status(200).json({ok:true,configured:true,queries_attempted:queries,
      results_found:foundResults,new_leads:newlyAdded,official_host_matches:matched,
      provider_errors:providerErrors,publication:'unverified search leads are held for official evidence checks'});
  }catch(e){
    console.error('Worldwide search error',String(e?.message||e).slice(0,170));
    if(sql&&runId)try{
      await sql`UPDATE opportunity_web_search_runs SET completed_at=now(),status='failed',
        error_message=${String(e?.message||e).slice(0,150)} WHERE id=${runId}`;
    }catch{}
    return res.status(500).json({ok:false,error:'Worldwide search failed safely; no unverified leads published'});
  }
}
