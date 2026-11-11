import {db} from '../lib/db.js';
import {preparedListings} from '../lib/latest-directory.js';
import {isProgrammePage} from '../lib/source-listings.js';
const BASE='https://oppmatcher.tech';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?
 new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(d):''};
const cats={all:'All opportunities',scholarships:'Scholarships',internships:'Internships',fellowships:'Fellowships',grants:'Grants and awards',other:'Other programmes'};
const note=x=>x.level===3?'Individual vacancy and deadline recently confirmed by the official provider. Eligibility is not personally assessed.':
 x.level===2?'The provider advertised applications as open at its last check. Check nationality and further requirements.':
 'This named official programme page exists. Opening status, deadline and eligibility for this cycle are not confirmed.';
const css='*{box-sizing:border-box}body{margin:0;background:#f4faf8;color:#163b3b;font:15px/1.6 system-ui,Arial,sans-serif}a{color:#047b70}header{background:#0b3036;color:white;padding:20px max(18px,calc((100vw - 1150px)/2));display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px}header a{color:#dbfff8;text-decoration:none}header nav{display:flex;flex-wrap:wrap;gap:17px;font-size:13px}main{max-width:1180px;margin:auto;padding:26px 20px 75px}.hero{padding:35px clamp(20px,5vw,55px);border-radius:20px;color:#ecfff9;background:linear-gradient(125deg,#12484a,#0a2735)}h1{font-size:clamp(32px,5vw,55px);line-height:1.12;letter-spacing:-.05em;margin:8px 0 14px}h2{font-size:26px;letter-spacing:-.03em;margin:25px 0 15px}h3{font-size:18px;line-height:1.3;margin:14px 0 6px}.hero p{max-width:74ch;color:#c5e6e0}.hero small{color:#87e9dc;text-transform:uppercase;letter-spacing:.12em;font-weight:800}.counters{display:flex;flex-wrap:wrap;gap:9px;margin-top:16px}.counters span{border:1px solid #377d76;border-radius:12px;padding:8px 13px;background:#1e5050;color:#d7fff6;font-size:12px}.filters{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0 10px}.filters a{border:1px solid #c5ded8;background:white;border-radius:99px;padding:9px 14px;text-decoration:none;font-size:12px;font-weight:750}.filters a.selected{background:#087d70;border-color:#087d70;color:white}.search{display:flex;gap:8px;margin:10px 0 25px}.search input{width:min(500px,100%);padding:12px 15px;border:1px solid #bed9d2;border-radius:10px;font:inherit}.search button{background:#0c716b;color:white;padding:0 18px;border:0;border-radius:10px;font-weight:700;cursor:pointer}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.card{background:white;border:1px solid #d1e5df;border-radius:15px;padding:20px;display:flex;flex-direction:column;min-width:0}.card h3{overflow-wrap:anywhere}.card p{color:#526e69;font-size:13px;line-height:1.65}.card .small{font-size:11px;color:#59736c}.card .provider{font-weight:750;color:#376761}.level{align-self:flex-start;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:800;background:#e7f4ed;color:#075f57}.level.open{background:#e0f1fb;color:#125b79}.level.source{background:#f0eee3;color:#64551c}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:auto;padding-top:15px}.actions a{font-size:12px;font-weight:800}.empty{background:white;padding:24px;border:1px solid #d1e5df;border-radius:13px}.disclosure{margin-top:30px;background:#e7f4ef;padding:17px 20px;border-radius:14px;color:#3a6960;font-size:13px}footer{background:#0d3036;color:#d5f1ec;padding:21px;text-align:center;font-size:12px}footer a{color:inherit}@media(max-width:900px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.cards{grid-template-columns:1fr}main{padding:15px 13px 45px}.hero{padding:28px 20px}.search{flex-wrap:wrap}.search input{flex:1 1 210px}.search button{min-height:45px}}';
const programmeResearchLinks=[
  [/\brhodes\b/i,'/programmes/rhodes-scholarship/'],
  [/\beiffel\b/i,'/programmes/eiffel-excellence-scholarship/'],
  [/stipendium\s+hungaricum/i,'/programmes/stipendium-hungaricum/'],
  [/swiss government excellence/i,'/programmes/swiss-government-excellence-scholarships/'],
  [/commonwealth shared/i,'/programmes/commonwealth-shared-scholarship/'],
  [/joint japan.{0,20}world bank/i,'/programmes/joint-japan-world-bank-scholarship/'],
  [/cern.{0,35}summer/i,'/programmes/cern-summer-student-programme/'],
  [/(?:asian development bank|ADB).{0,30}internship/i,'/programmes/adb-internship-programme/'],
  [/world bank treasury.{0,35}internship/i,'/programmes/world-bank-treasury-summer-internship/'],
  [/newton international fellowship/i,'/programmes/newton-international-fellowship/'],
  [/rotary peace fellowship/i,'/programmes/rotary-peace-fellowship/'],
  [/daad.{0,12}epos|development.related postgraduate courses/i,'/programmes/daad-epos-scholarship/'],
  [/humboldt research fellowship/i,'/programmes/humboldt-research-fellowship/'],
  [/erasmus\+/i,'/programmes/erasmus-plus/'],
  [/united nations volunteers|UN volunteers/i,'/programmes/un-volunteers/']
];
const programmeResearchPath=item=>programmeResearchLinks.find(([pattern])=>pattern.test(item.title||''))?.[1]||'';

function group(rows,heading){
 if(!rows.length)return '';
 return '<section><h2>'+esc(heading)+'</h2><div class="cards">'+rows.map(x=>
  '<article class="card"><span class="level '+(x.level===2?'open':x.level===1?'source':'')+'">'+esc(x.type)+'</span>'+
  '<h3>'+esc(x.title)+'</h3><p class="provider">'+esc(x.provider)+' · '+esc(cats[x.category]||'Opportunity')+'</p>'+
  '<p>'+esc(note(x))+'</p>'+ 
  (x.restriction?'<p class="small"><strong>Posting restriction: '+esc(x.restriction)+'</strong></p>':'')+
  (x.location?'<p class="small">Location: '+esc(x.location)+'</p>':'')+
  (x.deadline_at?'<p class="small">Recorded deadline: <strong>'+esc(date(x.deadline_at))+'</strong> (confirm local closing time)</p>':'')+
  '<p class="small">Source checked: '+esc(date(x.checked_at))+
    (x.first_seen_at?' · First recorded: '+esc(date(x.first_seen_at)):'')+'</p>'+
  '<div class="actions">'+(programmeResearchPath(x)?'<a href="'+programmeResearchPath(x)+'">OppMatcher programme research</a>':'')+(x.detail_url?'<a href="'+esc(x.detail_url)+'">Verified posting details</a>':'')+
  '<a href="'+esc(x.url)+'" rel="noopener noreferrer" target="_blank">Official provider ↗</a></div></article>').join('')+'</div></section>';
}
function render(rows,category,q){
 const selected=rows.filter(x=>(category==='all'||x.category===category)&&
   (!q||(x.title+' '+x.provider+' '+x.category+' '+(x.location||'')).toLowerCase().includes(q)));
 const counters=[selected.filter(x=>x.level===3).length,selected.filter(x=>x.level===2).length,selected.filter(x=>x.level===1).length];
 const cleanCategory=['scholarships','internships','fellowships','grants'].includes(category);
 const filtered=Boolean(q)||(category!=='all'&&!cleanCategory)||(category==='grants'&&selected.length===0);
 const canonical=cleanCategory?BASE+'/latest/'+category+'/':BASE+'/latest';
 const tabs=Object.entries(cats).map(([key,label])=>'<a href="/latest'+(key==='all'?'':(['scholarships','internships','fellowships','grants'].includes(key)?'/'+key+'/':'?category='+key))+'" class="'+(key===category?'selected':'')+'">'+esc(label)+'</a>').join('');
 const search='<form class="search" action="/latest" method="get">'+
  (category!=='all'?'<input type="hidden" name="category" value="'+esc(category)+'">':'')+
  '<input name="q" maxlength="80" aria-label="Search opportunities" placeholder="Search by programme, provider or location" value="'+esc(q)+'"><button type="submit">Search</button></form>';
 const body='<div class="hero"><small>Automatically updated official opportunities</small><h1>'+esc(category==='all'?'Latest opportunities to explore.':cats[category]+' to explore.')+'</h1>'+
  '<p>Find recently verified vacancies, explicitly open calls and named official programmes. Each listing shows what has been verified, so you can decide what to investigate without relying on outdated deadlines.</p>'+
  '<div class="counters"><span>'+counters[0]+' verified live vacancies</span><span>'+counters[1]+' official open calls</span><span>'+counters[2]+' named programme pages</span></div></div>'+
  '<nav class="filters" aria-label="Opportunity categories">'+tabs+'</nav>'+search+
  (selected.length?
    group(selected.filter(x=>x.level===3),'Recently verified live vacancies')+
    group(selected.filter(x=>x.level===2),'Officially advertised open calls')+
    group(selected.filter(x=>x.level===1),'Official programmes to investigate'):
    '<div class="empty">No qualifying listings match this search. Try another category or search.</div>')+
  '<div class="disclosure"><strong>How to read this directory:</strong> “Official programme page” does not mean that applications are currently open. Only exact-verified live vacancies have a recently checked individual posting and recorded future deadline. Each provider remains responsible for their application instructions. Rechecking an old listing is not counted as discovering a new one.</div>';
 const title=q?'Filtered search results':cleanCategory?cats[category]+' with official sources':'Latest verified and official opportunities';
 const meta='Official scholarships, internships, fellowships and open calls. Each record shows whether applications are confirmed open or need further verification.';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>'+title+' | OppMatcher</title><meta name="robots" content="'+(filtered?'noindex,follow':'index,follow')+'">'+
  '<meta name="description" content="'+esc(meta)+'"><link rel="canonical" href="'+canonical+'">'+
  '<link rel="icon" type="image/svg+xml" href="/brand-icon.svg">'+
  '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1916126969266611" crossorigin="anonymous"></script>'+
  '<style>'+css+'</style></head><body>'+
  '<header><a href="/"><strong>OppMatcher</strong></a><nav><a href="/scholarships/">Scholarships</a><a href="/internships/">Internships</a><a href="/fellowships/">Fellowships</a><a href="/exchange-programs/">Exchange</a><a href="/">Home</a><a href="/worldwide">Worldwide</a><a href="/opportunities">Verified postings</a><a href="/blog/">Guides</a><a href="/tools/application-readiness">Free checklist</a><a href="/about">About</a><a href="/contact">Contact</a></nav></header>'+
  '<main><nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/latest">Latest</a> › '+esc(cats[category])+'</nav>'+body+'</main><footer>OppMatcher · <a href="/blog/methodology/">Verification policy</a> · <a href="/tools/application-readiness">Free checklist</a> · <a href="/about">About</a> · <a href="/contact">Contact</a> · <a href="/privacy">Privacy</a></footer></body></html>';
}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).send('Method not allowed')}
 const category=String(req.query?.category||'all').toLowerCase(),q=String(req.query?.q||'').trim().toLowerCase().slice(0,80);
 if(!Object.hasOwn(cats,category)){res.setHeader('X-Robots-Tag','noindex');return res.status(404).send('Unknown category')}
 try{
  const sql=db();
  const [vacancies,calls,sources]=await Promise.all([
   sql`SELECT provider,provider_job_id,title,opportunity_type,location,source_url,status,
     verification_level,status_verified,deadline_at,last_verified_at,first_seen_at
     FROM exact_vacancies WHERE status='open' AND status_verified=true
       AND verification_level='exact' AND deadline_at>now()
       AND last_verified_at>=now()-interval '7 days'
     ORDER BY last_verified_at DESC LIMIT 150`,
   sql`SELECT title,provider,source_url,status,closing_at,last_checked_at,created_at
     FROM official_open_calls WHERE status='open' AND closing_at>now()
       AND last_checked_at>=now()-interval '48 hours'
     ORDER BY last_checked_at DESC LIMIT 45`,
   sql`SELECT title,provider,canonical_url,source_status,verified_page_at,created_at,
      evidence->>'opportunity_kind' AS opportunity_kind,
      evidence->>'application_deadline' AS application_deadline
     FROM worldwide_source_listings WHERE source_status='source_confirmed'
       AND verified_page_at>=now()-interval '30 days'
     ORDER BY verified_page_at DESC LIMIT 150`
  ]);
  const rows=preparedListings({vacancies,calls,sources:sources.filter(x=>
   x.opportunity_kind==='US federal grant'||isProgrammePage(x.title,x.canonical_url))});
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
  return res.status(200).send(render(rows,category,q));
 }catch(error){
  console.error('Latest directory unavailable',String(error?.message||error).slice(0,130));
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex');
  return res.status(503).send('Latest directory is temporarily unavailable');
 }
}
