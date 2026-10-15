import { db } from '../lib/db.js';

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  res.setHeader('Cache-Control','public, max-age=120, stale-while-revalidate=300');
  res.setHeader('X-Content-Type-Options','nosniff');
  try{
    const sql=db();
    const rows=await sql`
      SELECT DISTINCT x.id
      FROM neon_auth.project_config c
      CROSS JOIN LATERAL jsonb_array_elements(c.social_providers) AS provider
      CROSS JOIN LATERAL (SELECT provider->>'id' AS id) x
      WHERE jsonb_typeof(c.social_providers)='array'
        AND x.id IN ('google','github','microsoft')
    `;
    const providers=[...new Set(rows.map(r=>r.id).filter(Boolean))];
    return res.status(200).json({providers});
  }catch(e){
    console.error('OAuth configuration visibility unavailable');
    return res.status(200).json({providers:['google']});
  }
}
