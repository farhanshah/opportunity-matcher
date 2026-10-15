import { db } from '../lib/db.js';
import { canonicalUrl, officialHostMatches, findOfficialLinks, verifyCandidate, discoveryId } from '../lib/auto-discovery.js';

const SOURCE_BATCH = 12;
const LINKS_PER_SOURCE = 16;
const DETAIL_CHECKS_PER_SOURCE = 2;
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
    SELECT id,external_id,title,opportunity_type,funding_type,eligible_nationalities,education_levels,fields_of_study
    FROM opportunities WHERE regexp_replace(official_source_url,'/+$','')=${url.replace(/\/+$/,'')} LIMIT 1
  `;
  if(existing.length) {
    const o=existing[0];
    const normalized=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    if(normalized(o.title)!==normalized(r.title)) return {status:'needs_evidence',reason:'Existing programme title conflicts with structured official evidence'};
    // If the page disagrees with the stored award type or funding, don't
    // falsely stamp the existing opportunity as verified.
    if(String(o.opportunity_type||'').toLowerCase()!==r.type.toLowerCase() ||
       String(o.funding_type||'').toLowerCase()!==r.funding.toLowerCase()) {
      return {status:'needs_evidence',reason:'Existing award type or funding differs from provider evidence'};
    }
    const [routeCheck]=await sql`
      SELECT count(*)::int AS total FROM opportunity_country_routes
      WHERE opportunity_id=${o.id} AND is_active=true
    `;
    if(routeCheck.total>0) return {
      status:'needs_evidence',reason:'Existing country-specific application routes cannot be overwritten from a general page'
    };
    // Preserve established nationality/route-specific rules. Never overwrite them.
    if(!String(o.external_id||'').startsWith('AUTO-')) {
      const exact=JSON.stringify(o.eligible_nationalities||[]).toLowerCase().includes('all nationalit')
        && JSON.stringify(o.education_levels||[]).toLowerCase().includes(r.education[0].toLowerCase());
      if(!exact) return {status:'needs_evidence',reason:'Existing eligibility or local routes require independent verification'};
    }
    const [row]=await sql`
      UPDATE opportunities SET application_close_date=${r.deadline},application_open_date=${r.openDate || null},status=${r.status},
        last_verified_at=now(),verification_confidence='high',updated_at=now()
      WHERE id=${o.id} RETURNING id
    `;
    return {status:'published',id:row.id};
  }
  // Do not create a second card for the same named programme when the
  // provider changes its application URL between cycles or page redesigns.
  const possibleDuplicate=await sql`
    SELECT id FROM opportunities
    WHERE lower(title)=lower(${r.title}) AND lower(provider)=lower(${r.provider})
    LIMIT 1
  `;
  if(possibleDuplicate.length) return {
    status:'needs_evidence',reason:'Possible existing programme with a different official URL; duplicate withheld'
  };
  const id=discoveryId(url);
  // Insert the opportunity and the mandatory country rule atomically.
  const [created]=await sql`
    WITH upserted AS (
      INSERT INTO opportunities(
        external_id,title,provider,opportunity_type,destination_country,funding_type,status,
        application_open_date,application_close_date,application_route,application_url,official_source_url,
        eligible_nationalities,education_levels,fields_of_study,benefits,eligibility_notes,
        last_verified_at,verification_confidence,raw_source_text,rule_normalization_status
      ) VALUES(
        ${id},${r.title},${r.provider},${r.type},${r.destination},${r.funding},${r.status},
        ${r.openDate || null},${r.deadline},'Official provider page',${url},${url},
        ${JSON.stringify(r.nationality)}::jsonb,${JSON.stringify(r.education)}::jsonb,
        ${JSON.stringify(r.fields)}::jsonb,${JSON.stringify(r.benefits ? [r.benefits] : [])}::jsonb,
        ${r.eligibility},now(),'high',${JSON.stringify(result.evidence)},'partially_normalized'
      )
      ON CONFLICT(external_id) DO UPDATE SET
        application_open_date=EXCLUDED.application_open_date,application_close_date=EXCLUDED.application_close_date,
        status=EXCLUDED.status,last_verified_at=now(),updated_at=now()
      WHERE opportunities.official_source_url=EXCLUDED.official_source_url
      RETURNING id
    ), ensured_rule AS (
      INSERT INTO opportunity_eligibility_rules(
        opportunity_id,rule_code,rule_label,operator,value_json,hard_rule,certainty,
        source_url,source_note,last_verified_at
      )
      SELECT upserted.id,'country_scope','Nationality eligibility','in',
        ${JSON.stringify({scope:'worldwide',countries:[]})}::jsonb,true,'confirmed',${url},
        'Explicit worldwide eligibility in official programme structured data',now()
      FROM upserted
      WHERE NOT EXISTS (
        SELECT 1 FROM opportunity_eligibility_rules r
        WHERE r.opportunity_id=upserted.id AND r.rule_code='country_scope'
      )
      RETURNING id
    ), source_registered AS (
      INSERT INTO monitored_sources(
        source_key,provider,source_url,source_type,check_interval_minutes,expected_terms,is_active
      )
      SELECT ${'discovered_'+id.slice(5).toLowerCase()},${r.provider},${url},
        'official_page',1440,'[]'::jsonb,true
      FROM upserted
      WHERE NOT EXISTS (
        SELECT 1 FROM monitored_sources m
        WHERE regexp_replace(m.source_url,'/+$','')=${url.replace(/\/+$/,'')}
      )
      ON CONFLICT(source_key) DO NOTHING
      RETURNING id
    )
    SELECT id FROM upserted
  `;
  if(!created)return {status:'needs_evidence',reason:'Programme identity conflict; public record withheld'};
  return {status:'published',id:created.id};
}

async function findKnownOfficialLink(sql,url){
  const [row]=await sql`
    SELECT id,title,external_id FROM opportunities
    WHERE regexp_replace(official_source_url,'/+$','')=${url.replace(/\/+$/,'')}
    LIMIT 1
  `;
  return row || null;
}
async function noteExistingLink(sql,source,link,known){
  await sql`
    INSERT INTO opportunity_discovery_candidates(
      canonical_url,source_id,provider,title,status,verification_reason,published_opportunity_id,evidence
    ) VALUES(
      ${link.url},${source.id},${source.provider},${known.title},
      'existing','Already present in the main catalogue; no duplicate published',
      ${known.id},${JSON.stringify({discovered_from:source.source_url,existing_id:known.external_id})}::jsonb
    ) ON CONFLICT(canonical_url) DO UPDATE SET
      status='existing',published_opportunity_id=EXCLUDED.published_opportunity_id,
      verification_reason=EXCLUDED.verification_reason,last_checked_at=now(),updated_at=now()
  `;
}
async function scanSource(sql,source) {
  const result={source:source.source_key,links:0,detail_checked:0,published:0,held:0,existing:0,used_monitor_snapshot:false,errors:[]};
  try{
    // Reuse the last accepted official monitor snapshot when a recent
    // successful recheck attests that the page has not changed.
    // Candidate detail pages are still fetched fresh before verification.
    const cached=source.last_success_at && source.snapshot_html
      && Date.now()-new Date(source.last_success_at).getTime() < 48*60*60*1000;
    const listing=cached
      ? {html:source.snapshot_html,url:source.source_url}
      : await fetchOfficial(source.source_url,source.source_url);
    result.used_monitor_snapshot=Boolean(cached);
    const links=findOfficialLinks(listing.html,listing.url,LINKS_PER_SOURCE);
    result.links=links.length;
    for(const link of links) {
      try {
        const known=await findKnownOfficialLink(sql,link.url);
        if(known){
          await noteExistingLink(sql,source,link,known);
          result.existing++;
          continue;
        }
        if(result.detail_checked>=DETAIL_CHECKS_PER_SOURCE)break;
        // Do not re-fetch an incomplete candidate every day. Once the
        // provider changes its page or the retry window passes, retry safely.
        const [previous]=await sql`
          SELECT status,last_checked_at FROM opportunity_discovery_candidates
          WHERE canonical_url=${link.url} LIMIT 1
        `;
        if(previous?.status==='needs_evidence' &&
           Date.now()-new Date(previous.last_checked_at).getTime()<7*24*60*60*1000)continue;
        result.detail_checked++;
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
    const sources=await sql`
      SELECT m.id,m.source_key,m.provider,m.source_url,m.last_success_at,
        LEFT(snapshot.raw_html,200000) AS snapshot_html
      FROM monitored_sources m
      LEFT JOIN LATERAL (
        SELECT s.raw_html FROM source_snapshots s
        WHERE s.source_id=m.id ORDER BY s.fetched_at DESC LIMIT 1
      ) snapshot ON true
      WHERE m.is_active=true
      ORDER BY m.last_discovery_at NULLS FIRST,m.source_key
      LIMIT ${SOURCE_BATCH}
    `;
    const results=[];
    for(let i=0;i<sources.length;i+=CONCURRENCY){
      results.push(...await Promise.all(sources.slice(i,i+CONCURRENCY).map(s=>scanSource(sql,s))));
    }
    return res.status(200).json({
      ok:true,scanned:sources.length,
      discovered_links:results.reduce((n,x)=>n+x.links,0),
      automatically_published:results.reduce((n,x)=>n+x.published,0),
      withheld:results.reduce((n,x)=>n+x.held,0),
      existing_programme_links:results.reduce((n,x)=>n+x.existing,0),
      sources_with_errors:results.filter(x=>x.errors.length).length,
      results,checked_at:new Date().toISOString()
    });
  }catch(e){console.error('Discovery failed',e);
    return res.status(500).json({ok:false,error:'Automatic discovery failed safely; no unverified opportunity approved'});
  }
}
