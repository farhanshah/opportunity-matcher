
import { db } from '../lib/db.js';

const BASE='https://oppmatcher.tech';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):''};
const slug=row=>String(row.provider||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+String(row.provider_job_id||'');
const path=row=>'/opportunities/'+slug(row);
function safeSource(raw){
  try {const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')?u.href:''}
  catch{return ''}
}
function current(row,now=Date.now()){
  const checked=new Date(row.last_verified_at).getTime(),end=new Date(row.deadline_at).getTime();
  return row.status==='open'&&row.status_verified===true&&row.verification_level==='exact'&&
    /^[0-9]{3,15}$/.test(String(row.provider_job_id||''))&&
    String(row.provider||'').trim().length>0&&String(row.title||'').trim().length>=8&&
    safeSource(row.source_url)&&Number.isFinite(checked)&&checked>=now-7*86400000&&
    checked<=now+300000&&Number.isFinite(end)&&end>now;
}
async function getRows(){
  const sql=db();
  const rows=await sql`
    SELECT provider,provider_job_id,title,opportunity_type,location,work_mode,
           deadline_at,source_url,status,verification_level,status_verified,last_verified_at
    FROM exact_vacancies
    WHERE status='open' AND status_verified=true AND verification_level='exact'
      AND deadline_at>now() AND source_url IS NOT NULL
      AND last_verified_at BETWEEN now()-INTERVAL '7 days' AND now()+INTERVAL '5 minutes'
    ORDER BY deadline_at ASC, last_verified_at DESC LIMIT 300
  `;
  return rows.filter(row=>current(row));
}
const css='*{box-sizing:border-box}body{margin:0;background:#f5faf8;color:#13343a;font:16px/1.6 system-ui,Arial,sans-serif}a{color:#08767c}header,footer{background:#10353b;color:white;padding:18px max(18px,calc((100vw - 1100px)/2))}header{display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between}header a,footer a{color:white}nav{display:flex;flex-wrap:wrap;gap:15px}main{max-width:1050px;padding:40px 20px 80px;margin:auto}h1{font-size:clamp(2rem,4vw,3.1rem);line-height:1.12;margin:12px 0}h2{line-height:1.3}p{max-width:78ch}.lead{font-size:1.12rem;color:#46666a}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,295px),1fr));gap:18px;margin:28px 0}.card,.panel{background:#fff;border:1px solid #daeae7;border-radius:14px;padding:23px}.card h2{font-size:1.23rem}.tag{letter-spacing:.11em;text-transform:uppercase;font-size:.78rem;font-weight:bold;color:#08767c}.notice{padding:15px 19px;background:#e7f5f0;border-left:4px solid #08767c;margin:25px 0}.button{display:inline-block;background:#08767c;color:white;padding:10px 18px;text-decoration:none;border-radius:8px;font-weight:700}dt{font-weight:bold;margin-top:12px}dd{margin:0 0 14px}@media(max-width:600px){main{padding:25px 16px 50px}header,footer{padding:16px}}';
function shell(title,description,url,body,index=true){
  const structured=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:title,url:BASE+url,description,
      isPartOf:{'@type':'WebSite',name:'OppMatcher',url:BASE}}).replace(/</g,'\\u003c');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="'+(index?'index,follow':'noindex,follow')+'">'+
  '<link rel="canonical" href="'+esc(BASE+url)+'"><title>'+esc(title)+'</title>'+
  '<meta name="description" content="'+esc(description)+'">'+
  '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'">'+
  '<meta property="og:url" content="'+esc(BASE+url)+'">'+
  '<script type="application/ld+json">'+structured+'</script>'+
  '<link rel="icon" href="/brand-icon.svg" type="image/svg+xml"><style>'+css+'</style></head><body>'+
  '<header><a href="/"><strong>OppMatcher</strong></a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/opportunities">Verified opportunities</a><a href="/blog/">Guides</a></nav></header>'+
  '<main>'+body+'</main><footer>© OppMatcher · Always check the latest official provider posting. <a href="/blog/methodology/">How we verify</a></footer></body></html>';
}
function directory(rows){
  const cards=rows.map(row=>'<article class="card"><p class="tag">'+esc(row.provider)+' · '+esc(row.opportunity_type||'Opportunity')+'</p>'+
    '<h2><a href="'+esc(path(row))+'">'+esc(row.title)+'</a></h2>'+
    '<p>'+esc(row.location||'See provider')+' · Deadline: '+esc(day(row.deadline_at))+'</p>'+
    '<p>Posting last checked: '+esc(day(row.last_verified_at))+'</p>'+
    '<a href="'+esc(path(row))+'">See verified details and source →</a></article>').join('');
  const body='<p class="tag">Official posting checks</p><h1>Verified internships and opportunities</h1>'+
    '<p class="lead">Find open vacancies with recent exact-posting verification, published deadlines and direct links to their official providers.</p>'+
    '<div class="notice">These listings reflect the last successful posting check. The provider remains the final authority on applications, eligibility and deadlines.</div>'+
    (rows.length?'<p>'+rows.length+' currently qualifying listing(s).</p><div class="grid">'+cards+'</div>':
      '<div class="panel"><h2>No currently qualifying listings</h2><p>We only show postings with current exact-source evidence. New verified vacancies will appear here automatically.</p></div>')+
    '<p>Also see our <a href="/blog/scholarship-eligibility-checklist/">eligibility checklist</a> and <a href="/blog/international-internships-graduate-placements/">internship guide</a>.</p>';
  return shell('Verified Internships and Opportunities | OppMatcher','Current source-verified internships and vacancies with locations, published deadlines and official application links.','/opportunities',body,rows.length>0);
}
function detail(row){
  const body='<p class="tag"><a href="/opportunities">Verified opportunities</a> / '+esc(row.provider)+'</p>'+
    '<h1>'+esc(row.title)+'</h1><p class="lead">Recorded '+esc(row.opportunity_type||'vacancy')+
    ' from '+esc(row.provider)+'. Read the full eligibility rules and application instructions on the official provider website.</p>'+
    '<section class="panel"><h2>Recorded vacancy facts</h2><dl>'+
    '<dt>Provider</dt><dd>'+esc(row.provider)+'</dd>'+
    '<dt>Type</dt><dd>'+esc(row.opportunity_type||'Not stated')+'</dd>'+
    '<dt>Location</dt><dd>'+esc(row.location||'See provider')+'</dd>'+
    (row.work_mode?'<dt>Work mode</dt><dd>'+esc(row.work_mode)+'</dd>':'')+
    '<dt>Recorded deadline (UTC date)</dt><dd>'+esc(day(row.deadline_at))+'</dd>'+
    '<dt>Last exact-posting check</dt><dd>'+esc(day(row.last_verified_at))+'</dd></dl>'+
    '<a class="button" href="'+esc(safeSource(row.source_url))+'" rel="noopener noreferrer" target="_blank">Open official opportunity ↗</a></section>'+
    '<div class="notice">Check the provider for the exact deadline time zone, nationality and residence requirements, required documents and whether the vacancy is still accepting applications.</div>'+
    '<h2>Before you apply</h2><p>Review the role details, required education, experience, work permissions and language requirements directly with the provider. These rules are not automatically verified just because a vacancy is listed here.</p>'+
    '<p><a href="/blog/international-internships-graduate-placements/">Read our practical internship guide →</a></p>';
  return shell(row.title+' | '+row.provider+' | OppMatcher',
    'Verified vacancy details for '+row.title+' at '+row.provider+', including location, deadline and official source.',
    path(row),body);
}
function sitemap(rows){
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
    (rows.length?'<url><loc>'+BASE+'/opportunities</loc></url>\n':'')+
    rows.map(row=>'<url><loc>'+esc(BASE+path(row))+'</loc><lastmod>'+esc(day(row.last_verified_at))+'</lastmod></url>\n').join('')+'</urlset>\n';
}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end('Method not allowed')}
  const format=String(req.query?.format||''),id=String(req.query?.id||'');
  try{
    const rows=await getRows();
    if(format==='sitemap'){
      res.setHeader('Content-Type','application/xml; charset=utf-8');
      res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).send(sitemap(rows));
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=180');
    if(!id) {
      if(!rows.length)res.setHeader('X-Robots-Tag','noindex');
      return res.status(200).send(directory(rows));
    }
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{3,15}$/.test(id)) {
      res.setHeader('X-Robots-Tag','noindex'); return res.status(404).send('Opportunity not found');
    }
    const row=rows.find(item=>slug(item)===id);
    if(!row) {res.setHeader('X-Robots-Tag','noindex');return res.status(404).send('Opportunity no longer available as a current verified listing')}
    return res.status(200).send(detail(row));
  }catch(e){
    console.error('Public SEO opportunity page unavailable',e?.message);
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex');
    return res.status(503).send('Opportunity listings temporarily unavailable');
  }
}
