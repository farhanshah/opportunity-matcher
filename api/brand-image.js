import sharp from 'sharp';

// Public, non-personalised image assets. SVG paths reproduce the site's original emblem.
const mark=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 48 48" role="img" aria-label="OppMatcher logo">
<defs><linearGradient id="om-ring" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d8ff69"/><stop offset="1" stop-color="#7458ff"/></linearGradient></defs>
<rect width="48" height="48" rx="14" fill="#10131c"/>
<rect x="2" y="2" width="44" height="44" rx="14" fill="#171a22" stroke="#ffffff" stroke-opacity=".14"/>
<circle cx="24" cy="24" r="11.5" fill="none" stroke="url(#om-ring)" stroke-width="4"/>
<path d="M29.5 14.5 33.8 14l-.5 4.3" fill="none" stroke="#d8ff69" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M33 14.8 26.8 21" fill="none" stroke="#d8ff69" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;
const logoBody=mark.match(/<defs>[\s\S]*?<\/svg>/)?.[0]?.replace(/<\/svg>$/,'')||'';
const social=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <linearGradient id="back" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b1019"/><stop offset=".62" stop-color="#15172a"/><stop offset="1" stop-color="#201a44"/></linearGradient>
  <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d8ff69"/><stop offset="1" stop-color="#7458ff"/></linearGradient>
</defs>
<rect width="1200" height="630" fill="url(#back)"/>
<circle cx="1060" cy="120" r="330" fill="none" stroke="#7458ff" stroke-opacity=".12" stroke-width="64"/>
<circle cx="170" cy="575" r="290" fill="none" stroke="#d8ff69" stroke-opacity=".065" stroke-width="46"/>
<g transform="translate(70 184) scale(5.5)">${logoBody}</g>
<text x="370" y="266" fill="#f8f9fc" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="80">OppMatcher</text>
<rect x="372" y="295" width="315" height="6" rx="3" fill="url(#accent)"/>
<text x="370" y="366" fill="#dce2f1" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="36">Your next move shouldn't</text>
<text x="370" y="409" fill="#dce2f1" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="36">depend on luck.</text>
<text x="370" y="486" fill="#b8c1d6" font-family="Arial, Helvetica, sans-serif" font-weight="500" font-size="21" letter-spacing="1">SCHOLARSHIPS  ·  INTERNSHIPS  ·  FELLOWSHIPS</text>
<text x="72" y="578" fill="#d8ff69" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="21">oppmatcher.tech</text>
</svg>`;
const sizes={favicon:64,email:144,apple:180,pwa192:192,pwa512:512,logo:512};
export async function renderBrandPng(kind){
  if(kind!=='social'&&!Object.prototype.hasOwnProperty.call(sizes,kind))throw Error('Unknown image');
  return sharp(Buffer.from(kind==='social'?social:mark))
    .resize(kind==='social'?1200:sizes[kind],kind==='social'?630:sizes[kind])
    .png({compressionLevel:9,effort:7}).toBuffer();
}
export default async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).end();
  const kind=String(req.query.kind||'favicon');
  if(kind!=='social'&&!Object.prototype.hasOwnProperty.call(sizes,kind))
    return res.status(400).json({error:'Unknown image'});
  try{
    const buffer=await renderBrandPng(kind);
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Length',String(buffer.length));
    return req.method==='HEAD'?res.status(200).end():res.status(200).end(buffer);
  }catch(error){
    console.error('Public OppMatcher brand asset render error',String(error?.message||error).slice(0,120));
    return res.status(500).json({error:'Brand image unavailable'});
  }
}
