import {db} from '../lib/db.js';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
 try{
  const sql=db();
  const countRaw=Number(req.query?.limit||36);
  const limit=Number.isInteger(countRaw)?Math.min(72,Math.max(1,countRaw)):36;
  const rows=await sql`
    SELECT l.title,l.provider,l.canonical_url,l.verified_page_at
    FROM worldwide_source_listings l
    WHERE l.source_status='source_confirmed'
      AND l.verified_page_at>=now()-interval '30 days'
      AND NOT EXISTS(
        SELECT 1 FROM opportunities o
        WHERE regexp_replace(o.official_source_url,'/+
    ORDER BY l.verified_page_at DESC,l.id DESC
    LIMIT ${limit}
  `;
  return res.status(200).json({
    listings:rows.map(r=>({
      title:r.title,provider:r.provider,official_url:r.canonical_url,
      source_confirmed_at:r.verified_page_at,
      publication_level:'source_confirmed',application_status:'unknown',
      deadline:null,eligibility:'not_verified',personal_match:'not_assessed'
    })),
    count:rows.length,
    meaning:'Official programme pages found. Application status, deadlines, funding and eligibility are not verified at this level.',
    generated_at:new Date().toISOString()
  });
 }catch(error){
  console.error('World source-listing API failed',String(error?.message||error).slice(0,120));
  return res.status(503).json({error:'Worldwide source listings temporarily unavailable'});
 }
}
,'')=
              regexp_replace(l.canonical_url,'/+
    ORDER BY l.verified_page_at DESC,l.id DESC
    LIMIT ${limit}
  `;
  return res.status(200).json({
    listings:rows.map(r=>({
      title:r.title,provider:r.provider,official_url:r.canonical_url,
      source_confirmed_at:r.verified_page_at,
      publication_level:'source_confirmed',application_status:'unknown',
      deadline:null,eligibility:'not_verified',personal_match:'not_assessed'
    })),
    count:rows.length,
    meaning:'Official programme pages found. Application status, deadlines, funding and eligibility are not verified at this level.',
    generated_at:new Date().toISOString()
  });
 }catch(error){
  console.error('World source-listing API failed',String(error?.message||error).slice(0,120));
  return res.status(503).json({error:'Worldwide source listings temporarily unavailable'});
 }
}
,'')
          AND o.last_verified_at>=now()-interval '30 days'
          AND o.verification_confidence='high'
      )
    ORDER BY l.verified_page_at DESC,l.id DESC
    LIMIT ${limit}
  `;
  return res.status(200).json({
    listings:rows.map(r=>({
      title:r.title,provider:r.provider,official_url:r.canonical_url,
      source_confirmed_at:r.verified_page_at,
      publication_level:'source_confirmed',application_status:'unknown',
      deadline:null,eligibility:'not_verified',personal_match:'not_assessed'
    })),
    count:rows.length,
    meaning:'Official programme pages found. Application status, deadlines, funding and eligibility are not verified at this level.',
    generated_at:new Date().toISOString()
  });
 }catch(error){
  console.error('World source-listing API failed',String(error?.message||error).slice(0,120));
  return res.status(503).json({error:'Worldwide source listings temporarily unavailable'});
 }
}
