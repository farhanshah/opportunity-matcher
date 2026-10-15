import { db } from '../lib/db.js';
import { canonicalUrl, officialHostMatches, findOfficialLinks, verifyCandidate, discoveryId } from '../lib/auto-discovery.js';

const SOURCE_BATCH = 6;
const LINKS_PER_SOURCE = 2;
const CONCURRENCY = 6;
function authorised(req) {
  return Boolean(process.env.CRON_SECRET) && req.headers.authorization === 'Bearer ' + process.env.CRON_SECRET;
}

async function fetchOfficial(url, authority) {
  let next = canonicalUrl(url);
  if (!next || !officialHostMatches(next, authority)) throw Error('Not an authorised source');
  for (let i=0; i<3; i++) {
    const r = await fetch(next, {redirect:'manual',signal:AbortSignal.timeout(8500),
      headers:{Accept:'text/html,application/xhtml+xml', 'User-Agent':'OpportunityMatcher-OfficialSources/1.0'}});
    if ([301,302,303,307,308].includes(r.status)) {
      next = canonicalUrl(r.headers.get('location'), next);
      if (!next || !officialHostMatches(next, authority)) throw Error('Off-provider redirect blocked');
      continue;
    }
    if (!r.ok) throw Error('Provider HTTP '+r.status);
    if (!/text\/html|application\/xhtml\+xml/i.test(r.headers.get('content-type') || '')) throw Error('Not an HTML opportunity page');
    if (Number(r.headers.get('content-length') || 0) > 1600000) throw Error('HTML too large');
    const html=(await r.text()).slice(0,1000000);
    if(html.length<350) throw Error('Unexpectedly short HTML');
    return {html,url:next};
  }
  throw Error('Too many provider redirects');
}

async function saveCandidate(sql,source,url,title,result,status,reason) {
  const r=result.record;
  const evidence=JSON.stringify({...result.evidence, discovered_from:source.source_url});
  await sql`
    INSERT INTO opportunity_discovery_candidates(canonical_url,source_id,provider,title,opportunity_type,deadline_date,status,verification_reason,evidence)
    VALUES(${url},${source.id},${source.provider},${r.title || title},${r.type || null},${r.deadline || null},${status},${reason.slice(0,900)},${evidence}::jsonb)
    ON CONFLICT(canonical_url) DO UPDATE SET
      last_checked_at=now(),provider=EXCLUDED.provider,title=EXCLUDED.title,
      opportunity_type=EXCLUDED.opportunity_type,deadline_date=EXCLUDED.deadline_date,
      verification_reason=EXCLUDED.verification_reason,evidence=EXCLUDED.evidence,updated_at=now(),
      status=CASE WHEN opportunity_discovery_candidates.status='published' AND EXCLUDED.status <> 'published'
        THEN 'published' ELSE EXCLUDED.status END
  `;
}

async function publish(sql,source,url,result) {
  if(!result.verified) return {status:'needs_evidence',reason:result.reasons.join('; ')};
  const r=result.record;
  const existing=await sql`
    SELECT id,external_id,title,eligible_nationalities,education_levels,fields_of_study
    FROM opportunities WHERE regexp_replace(official_source_url,'/+$','')=${url.replace(/\/+$/,'')} LIMIT 1
  `;
  if(existing.length) {
    const o=existing[0];
    const normalized=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    if(normalized(o.title)!==normalized(r.title)) return {status:'needs_evidence',reason:'Existing programme title conflicts with structured official evidence'};
    // Preserve established nationality/route-specific rules. Never overwrite them.
    if(!String(o.external_id||'').startsWith('AUTO-')) {
      const exact=JSON.stringify(o.eligible_nationalities||[]).toLowerCase().includes('all nationalit')
        && JSON.stringify(o.education_levels||[]).toLowerCase().includes(r.education[0].toLowerCase());
      if(!exact) return {status:'needs_evidence',reason:'Existing eligibility or local routes require independent verification'};
    }
    const [row]=await sql`
      UPDATE opportunities SET application_close_date=${r.deadline},status='Open',
        last_verified_at=now(),verification_confidence='high',updated_at=now()
      WHERE id=${o.id} RETURNING id
    `;
    return {status:'published',id:row.id};
  }
  const id=discoveryId(url);
  const [created]=await sql`
    INSERT INTO opportunities(
      external_id,title,provider,opportunity_type,destination_country,funding_type,status,
      application_close_date,application_route,application_url,official_source_url,
      eligible_nationalities,education_levels,fields_of_study,benefits,eligibility_notes,
      last_verified_at,verification_confidence,raw_source_text,rule_normalization_status
    ) VALUES(
      ${id},${r.title},${r.provider},${r.type},${r.destination},${r.funding},'Open',
      ${r.deadline},'Official provider page',${url},${url},
      ${JSON.stringify(r.nationality)}::jsonb,${JSON.stringify(r.education)}::jsonb,
      ${JSON.stringify(r.fields)}::jsonb,${JSON.stringify(r.benefits ? [r.benefits] : [])}::jsonb,
      ${r.eligibility},now(),'high',${JSON.stringify(result.evidence)},'partially_normalized'
    )
    ON CONFLICT(external_id) DO UPDATE SET
      application_close_date=EXCLUDED.application_close_date,status='Open',
      last_verified_at=now(),updated_at=now()
    WHERE opportunities.official_source_url=EXCLUDED.official_source_url
    RETURNING id
  `;
  if(!created) return {status:'needs_evidence',reason:'Programme identity already belongs to another provider URL'};
  await sql`
    INSERT INTO opportunity_eligibility_rules(
      opportunity_id,rule_code,rule_label,operator,value_json,hard_rule,certainty,source_url,source_note,last_verified_at
    )
    SELECT ${created.id},'country_scope','Nationality eligibility','in',
      ${JSON.stringify({scope:'worldwide',countries:[]})}::jsonb,true,'confirmed',${url},
      'Explicit worldwide eligibility in official programme structured data',now()
    WHERE NOT EXISTS(SELECT 1 FROM opportunity_eligibility_rules WHERE opportunity_id=${created.id} AND rule_code='country_scope')
  `;
  return {status:'published',id:created.id};
}

async function scanSource(sql,source) {
  const result={source:source.source_key,links:0,published:0,held:0,errors:[]};
  try{
    const listing=await fetchOfficial(source.source_url,source.source_url);
    const links=findOfficialLinks(listing.html,listing.url,LINKS_PER_SOURCE);
    result.links=links.length;
    for(const link of links) {
      try {
        const page=await fetchOfficial(link.url,source.source_url);
        const verified=verifyCandidate(page.html,page.url,source.provider);
        const published=await publish(sql,source,page.url,verified);
        const reason=published.reason|| (published.status==='published' ? 'Verified on official provider page' : verified.reasons.join('; '));
        await saveCandidate(sql,source,page.url,link.title,verified,published.status,reason);
        if(published.status==='published'){
          await sql`UPDATE opportunity_discovery_candidates SET published_opportunity_id=${published.id} WHERE canonical_url=${page.url}`;
          result.published++;
        } else result.held++;
      }catch(e){result.errors.push(String(e.message||e).slice(0,140))}
    }
  }catch(e){result.errors.push(String(e.message||e).slice(0,140))}
  finally {await sql`UPDATE monitored_sources SET last_discovery_at=now() WHERE id=${source.id}`}
  return result;
}

export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  if(!authorised(req))return res.status(401).json({error:'Unauthorized'});
  res.setHeader('Cache-Control','no-store');
  try{
    const sql=db();
    const sources=await sql`SELECT id,source_key,provider,source_url FROM monitored_sources
      WHERE is_active=true ORDER BY last_discovery_at NULLS FIRST,source_key LIMIT ${SOURCE_BATCH}`;
    const results=[];
    for(let i=0;i<sources.length;i+=CONCURRENCY){
      results.push(...await Promise.all(sources.slice(i,i+CONCURRENCY).map(s=>scanSource(sql,s))));
    }
    return res.status(200).json({
      ok:true,scanned:sources.length,
      discovered_links:results.reduce((n,x)=>n+x.links,0),
      automatically_published:results.reduce((n,x)=>n+x.published,0),
      withheld:results.reduce((n,x)=>n+x.held,0),
      sources_with_errors:results.filter(x=>x.errors.length).length,
      results,checked_at:new Date().toISOString()
    });
  }catch(e){console.error('Discovery failed',e);
    return res.status(500).json({ok:false,error:'Automatic discovery failed safely; no unverified opportunity approved'});
  }
}
