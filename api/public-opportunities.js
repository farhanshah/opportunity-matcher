
import { db } from '../lib/db.js';
import { publishedState, categoryType, narrowFacts, publicSlug, safePublicSource, restrictionFromTitle } from '../lib/public-opportunity-seo.js';

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
           deadline_at,source_url,status,verification_level,status_verified,last_verified_at,
           closed_at, first_seen_at,
           jsonb_build_object('detail_evidence_quality',raw_payload->>'detail_evidence_quality',
             'minimum_education',raw_payload->>'minimum_education',
             'required_language',raw_payload->>'required_language') AS raw_payload
    FROM exact_vacancies
    WHERE status='open' AND status_verified=true AND verification_level='exact'
      AND deadline_at>now() AND source_url IS NOT NULL
      AND last_verified_at BETWEEN now()-INTERVAL '7 days' AND now()+INTERVAL '5 minutes'
    ORDER BY deadline_at ASC, last_verified_at DESC LIMIT 300
  `;
  return rows.filter(row=>current(row)&&publishedState(row)==='open');
}
async function getHistoricalRow(id){
  const jobId=id.split('-').at(-1),sql=db();
  const rows=await sql`
    SELECT provider,provider_job_id,title,opportunity_type,location,work_mode,
      deadline_at,source_url,status,verification_level,status_verified,last_verified_at,
      closed_at,first_seen_at,
      jsonb_build_object('detail_evidence_quality',raw_payload->>'detail_evidence_quality',
        'minimum_education',raw_payload->>'minimum_education',
        'required_language',raw_payload->>'required_language') AS raw_payload
    FROM exact_vacancies
    WHERE provider_job_id=${jobId}
      AND (status_verified=true OR verification_level='exact')
    LIMIT 30
  `;
  return rows.find(row=>slug(row)===id && safePublicSource(row.source_url))||null;
}
const css='*{box-sizing:border-box}body{margin:0;background:#f5faf8;color:#13343a;font:16px/1.6 system-ui,Arial,sans-serif}a{color:#08767c}header,footer{background:#10353b;color:white;padding:18px max(18px,calc((100vw - 1100px)/2))}header{display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between}header a,footer a{color:white}nav{display:flex;flex-wrap:wrap;gap:15px}main{max-width:1050px;padding:40px 20px 80px;margin:auto}h1{font-size:clamp(2rem,4vw,3.1rem);line-height:1.12;margin:12px 0}h2{line-height:1.3}p{max-width:78ch}.lead{font-size:1.12rem;color:#46666a}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,295px),1fr));gap:18px;margin:28px 0}.card,.panel{background:#fff;border:1px solid #daeae7;border-radius:14px;padding:23px}.card h2{font-size:1.23rem}.tag{letter-spacing:.11em;text-transform:uppercase;font-size:.78rem;font-weight:bold;color:#08767c}.notice{padding:15px 19px;background:#e7f5f0;border-left:4px solid #08767c;margin:25px 0}.button{display:inline-block;background:#08767c;color:white;padding:10px 18px;text-decoration:none;border-radius:8px;font-weight:700} .state{display:inline-block;border-radius:99px;padding:6px 12px;font-size:.85rem;font-weight:750;background:#daf2e9;color:#00624a}.state.closed{background:#fff0dc;color:#855017}.state.unconfirmed{background:#eaf0f5;color:#3a5469}.related{margin-top:28px;padding:22px;border-radius:14px;background:#edf6f4}.related a{margin-right:18px}dt{font-weight:bold;margin-top:12px}dd{margin:0 0 14px}@media(max-width:600px){main{padding:25px 16px 50px}header,footer{padding:16px}}';
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
  '<link rel="icon" href="/brand-icon.svg" type="image/svg+xml">'+
  '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1916126969266611" crossorigin="anonymous"></script>'+
  '<style>'+css+'</style></head><body>'+
  '<header><a href="/"><strong>OppMatcher</strong></a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/opportunities">Verified opportunities</a><a href="/blog/">Guides</a></nav></header>'+
  '<main>'+body+'</main><footer>© OppMatcher · Always check the latest official provider posting. <a href="/blog/methodology/">How we verify</a></footer></body></html>';
}
function directory(rows, category=''){
  const catLabels={internships:'Internships',fellowships:'Fellowships',scholarships:'Scholarships',other:'Other opportunities'};
  const name=catLabels[category]||'Verified internships and opportunities';
  const relevant=category?rows.filter(row=>categoryType(row)===category):rows;
  const counts={};
  for(const row of rows)counts[categoryType(row)]=(counts[categoryType(row)]||0)+1;
  const nav='<nav aria-label="Opportunity categories"><a href="/opportunities">All current listings</a>'+
    Object.entries(catLabels).filter(([key])=>counts[key]).map(([key,label])=>
      '<a href="/opportunities/'+esc(key)+'">'+esc(label)+' ('+counts[key]+')</a>').join('')+'</nav>';
  const cards=relevant.map(row=>'<article class="card"><p class="tag">'+esc(row.provider)+' · '+esc(row.opportunity_type||'Opportunity')+'</p>'+
    '<h2><a href="'+esc(path(row))+'">'+esc(row.title)+'</a></h2>'+
    '<p>'+esc(row.location||'See provider')+' · Deadline: '+esc(day(row.deadline_at))+'</p>'+
    (restrictionFromTitle(row.title)?'<p><strong>Eligibility restriction: '+esc(restrictionFromTitle(row.title))+'</strong></p>':'')+
    '<p>Official vacancy last checked: '+esc(day(row.last_verified_at))+'</p>'+
    '<a href="'+esc(path(row))+'">See posting facts and official source →</a></article>').join('');
  const body='<p class="tag">Recently checked individual postings</p><h1>'+esc(name)+'</h1>'+
    '<p class="lead">Explore currently verified openings with recorded deadlines and direct links to the official provider. New exact-verified records are published automatically.</p>'+
    '<div class="notice">These are individual vacancy records, not the entire OppMatcher programme catalogue. Verify eligibility and the latest deadline at the official provider website.</div>'+
    nav+
    (relevant.length?'<p>'+relevant.length+' current listing(s).</p><div class="grid">'+cards+'</div>':
      '<div class="panel"><h2>No currently verified '+esc(name.toLowerCase())+'</h2><p>We do not publish unverified, expired, or stale postings as open. Newly verified records will appear here automatically.</p></div>')+
    '<div class="related"><h2>Application guidance</h2><p><a href="/blog/scholarship-eligibility-checklist/">Scholarship eligibility</a><a href="/blog/scholarship-application-documents/">Required documents</a><a href="/blog/international-internships-graduate-placements/">Internship applications</a></p></div>';
  return shell((category?name+' | ':'Verified Internships and Opportunities | ')+'OppMatcher',
    'Current source-verified '+(category||'internships and other opportunities')+' with locations, published deadlines and official application links.',
    category?'/opportunities/'+category:'/opportunities',body,!category||relevant.length>0);
}
function detail(row){
  const state=publishedState(row),open=state==='open';
  const closed=state==='closed',facts=narrowFacts(row);
  const heading=closed?'Closed':open?'Open, recently verified':'Verification needed';
  const className=closed?'closed':open?'':'unconfirmed';
  const category=categoryType(row);
  const evidence=[
    facts.titleRestriction?'<dt>Restriction stated in the posting title</dt><dd>'+esc(facts.titleRestriction)+'</dd>':'',
    facts.education?'<dt>Education requirement in captured official posting</dt><dd>'+esc(facts.education)+'</dd>':'',
    facts.language?'<dt>Language requirement in captured official posting</dt><dd>'+esc(facts.language)+'</dd>':''
  ].filter(Boolean).join('');
  const caution=closed
    ?'This opportunity is closed based on its recorded deadline or the provider status in our database. This is an archive of the earlier posting, not an invitation to apply.'
    :open
      ?'The individual official vacancy was checked recently. Requirements and the application link can still change, so confirm the latest details on the provider site.'
      :'This listing is awaiting a fresh provider check. It is not confirmed open and is not included in the live opportunities directory.';
  const sourceLabel=open?'Read full official posting and apply ↗':'View historical provider posting (may be unavailable) ↗';
  const source='<a class="'+(open?'button':'')+'" href="'+esc(safeSource(row.source_url))+'" target="_blank" rel="noopener noreferrer">'+sourceLabel+'</a>';
  const body='<p class="tag"><a href="/opportunities">Verified opportunities</a> / <a href="/opportunities/'+esc(category)+'">'+esc(category)+'</a></p>'+
    '<p class="state '+className+'">'+heading+'</p><h1>'+esc(row.title)+'</h1>'+
    '<p class="lead">'+esc(row.opportunity_type||'Opportunity')+' listing from '+esc(row.provider)+
    '. These are recorded vacancy facts, with the official provider remaining the source of truth.</p>'+
    '<div class="notice"><strong>'+heading+'.</strong> '+caution+'</div>'+
    '<section class="panel"><h2>Provider and application details</h2><dl>'+
    '<dt>Provider</dt><dd>'+esc(row.provider)+'</dd>'+
    '<dt>Reference</dt><dd>'+esc(row.provider_job_id)+'</dd>'+
    '<dt>Opportunity type</dt><dd>'+esc(row.opportunity_type||'Not stated')+'</dd>'+
    '<dt>Location</dt><dd>'+esc(row.location||'Check official notice')+'</dd>'+
    (row.work_mode?'<dt>Work arrangement on record</dt><dd>'+esc(row.work_mode)+'</dd>':'')+
    '<dt>Recorded deadline (UTC date; check provider time zone)</dt><dd>'+esc(day(row.deadline_at)||'Not established')+'</dd>'+
    '<dt>Last successful exact-posting check</dt><dd>'+esc(day(row.last_verified_at)||'Not recorded')+'</dd>'+
    evidence+'</dl>'+source+'</section>'+
    '<h2>Eligibility requirements</h2>'+
    (evidence?'<p>The specific requirements above were recorded in the posting evidence. Other eligibility rules may apply. </p>':'<p>Education, nationality, residence, language and work-authorisation requirements are not fully confirmed in the current record. We do not guess these conditions. </p>')+
    '<p>Check the official notice for programme-specific degree level, nationality and residence conditions, language skills and any experience requirements.</p>'+
    '<h2>How to apply</h2><ol><li>Check whether applications are still accepted by the official provider.</li>'+
    '<li>Read the specific vacancy instructions and confirm all eligibility rules.</li>'+
    '<li>Prepare the documents and complete the application on the provider website before its exact local deadline.</li></ol>'+
    '<p>'+(!open?'This archived or unconfirmed listing is retained for reference; do not treat it as currently accepting applications.':'OppMatcher does not accept applications on behalf of the provider.')+'</p>'+
    '<div class="related"><h2>Continue researching</h2><p><a href="/opportunities/'+esc(category)+'">More '+esc(category)+'</a><a href="/blog/scholarship-eligibility-checklist/">Eligibility checklist</a><a href="/blog/scholarship-application-documents/">Application documents</a><a href="/blog/international-internships-graduate-placements/">Internship guide</a></p></div>';
  return shell((closed?'Closed: ':open?'':'Unconfirmed: ')+row.title+' | '+row.provider+' | OppMatcher',
    (closed?'Archived listing: ':open?'Current verified posting: ':'Verification needed: ')+row.title+' at '+row.provider+', with dated provider evidence, recorded eligibility facts and application guidance.',
    path(row),body,open);
}
function sitemap(rows){
  const categories=[...new Set(rows.map(categoryType))];
  const prefix='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
    '<url><loc>'+BASE+'/opportunities</loc></url>\n'+
    '<url><loc>'+BASE+'/latest</loc></url>\n';
  return prefix+categories.map(category=>'<url><loc>'+BASE+'/opportunities/'+category+'</loc></url>\n').join('')+
    rows.map(row=>'<url><loc>'+esc(BASE+path(row))+'</loc><lastmod>'+esc(day(row.last_verified_at))+'</lastmod></url>\n').join('')+
    '</urlset>\n';
}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end('Method not allowed')}
  const format=String(req.query?.format||''),id=String(req.query?.id||''),category=String(req.query?.category||'');
  try{
    if(id){
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.setHeader('Cache-Control','public, s-maxage=90, stale-while-revalidate=120');
      if(!/^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{3,15}$/.test(id)){
        res.setHeader('X-Robots-Tag','noindex');return res.status(404).send('Opportunity not found');
      }
      const row=await getHistoricalRow(id);
      if(!row){res.setHeader('X-Robots-Tag','noindex');return res.status(404).send('No published opportunity record found')}
      if(publishedState(row)!=='open')res.setHeader('X-Robots-Tag','noindex');
      return res.status(200).send(detail(row));
    }
    if(category&&!['internships','fellowships','scholarships','other'].includes(category)){
      res.setHeader('X-Robots-Tag','noindex');return res.status(404).send('Category not found');
    }
    const rows=await getRows();
    if(format==='sitemap'){
      res.setHeader('Content-Type','application/xml; charset=utf-8');
      res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=300');
      return res.status(200).send(sitemap(rows));
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=180');
    if(category&&!rows.some(row=>categoryType(row)===category))res.setHeader('X-Robots-Tag','noindex');
    return res.status(200).send(directory(rows,category));
  }catch(e){
    console.error('Public SEO opportunity page unavailable',e?.message);
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex');
    return res.status(503).send('Opportunity listings temporarily unavailable');
  }
}
