import {db} from '../lib/db.js';
import {isProgrammePage} from '../lib/source-listings.js';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
 try{
  const sql=db();
  const countRaw=Number(req.query?.limit||36);
  const limit=Number.isInteger(countRaw)?Math.min(72,Math.max(1,countRaw)):36;
  const offRaw=Number(req.query?.offset||0);
  const offset=Number.isSafeInteger(offRaw)?Math.max(0,Math.min(10000,offRaw)):0;
  const rows=await sql`
    SELECT l.title,l.provider,l.canonical_url,l.verified_page_at,
      l.evidence->>'opportunity_kind' AS opportunity_kind,
      l.evidence->>'application_deadline' AS application_deadline,
      l.evidence->>'location' AS location
    FROM worldwide_source_listings l
    WHERE l.source_status='source_confirmed'
      AND l.verified_page_at>=now()-interval '30 days'
      AND (coalesce(l.evidence->>'opportunity_kind','')<>'official internship vacancy'
        OR (l.evidence->>'application_deadline'>=to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD')
          AND l.verified_page_at>=now()-interval '36 hours'))
      AND NOT EXISTS(
        SELECT 1 FROM opportunities o
        WHERE regexp_replace(o.official_source_url,'/+$','')=
              regexp_replace(l.canonical_url,'/+$','')
          AND o.last_verified_at>=now()-interval '30 days'
          AND o.verification_confidence='high'
      )
    ORDER BY l.verified_page_at DESC,l.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const allowed=rows.filter(row=>isProgrammePage(row.title,row.canonical_url));
  const [totals]=await sql`
    SELECT count(*)::int AS total FROM worldwide_source_listings l
    WHERE l.source_status='source_confirmed'
      AND l.verified_page_at>=now()-interval '30 days'
      AND (coalesce(l.evidence->>'opportunity_kind','')<>'official internship vacancy'
        OR (l.evidence->>'application_deadline'>=to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD')
          AND l.verified_page_at>=now()-interval '36 hours'))
      AND NOT EXISTS(
        SELECT 1 FROM opportunities o
        WHERE regexp_replace(o.official_source_url,'/+$','')=
              regexp_replace(l.canonical_url,'/+$','')
          AND o.last_verified_at>=now()-interval '30 days'
          AND o.verification_confidence='high'
      )
  `;
  return res.status(200).json({
    listings:allowed.map(row=>({
      title:row.title,provider:row.provider,official_url:row.canonical_url,
      source_confirmed_at:row.verified_page_at,
      publication_level:'source_confirmed',
      opportunity_kind:row.opportunity_kind||'official programme page',
      application_status:row.opportunity_kind==='official internship vacancy'?'open_from_exact_provider_record':'unknown',
      deadline:row.opportunity_kind==='official internship vacancy'?row.application_deadline:null,
      location:row.location||null,
      eligibility:'not_verified',personal_match:'not_assessed'
    })),
    count:allowed.length,
    total_source_confirmed:totals.total,
    next_offset:rows.length===limit?offset+rows.length:null,
    meaning:'Official programme pages found. Application status, deadlines, funding and eligibility are not verified at this level.',
    generated_at:new Date().toISOString()
  });
 }catch(error){
  console.error('Worldwide source listings temporarily unavailable',String(error?.message||error).slice(0,120));
  return res.status(503).json({error:'Worldwide source listings temporarily unavailable'});
 }
}
