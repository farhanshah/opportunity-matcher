const PROVIDERS={
  'INT-004':{name:'OECD',hosts:['oecd.org']},
  'INT-005':{name:'UNICEF',hosts:['jobs.unicef.org','careers.pageuppeople.com']},
  'INT-006':{name:'UNDP',hosts:['jobs.undp.org','undp.org']},
  'INT-013':{name:'WFP',hosts:['wfp.org']},
  'INT-014':{name:'ILO',hosts:['jobs.ilo.org','ilo.org']},
  'INT-018':{name:'EBRD',hosts:['jobs.ebrd.com','ebrd.com']},
  'INT-019':{name:'UNOPS',hosts:['jobs.unops.org','unops.org']},
  'INT-021':{name:'IFAD',hosts:['ifad.org']},
  'INT-022':{name:'IOM',hosts:['iom.int']},
  'FEL-015':{name:'WIPO',hosts:['wipo.int']}
};

const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const clean=s=>decode(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
function allowed(raw,cfg){try{const u=new URL(raw);if(u.protocol!=='https:')return null;const h=u.hostname.toLowerCase().replace(/^www\./,'');return cfg.hosts.some(x=>h===x||h.endsWith('.'+x))?u:null}catch{return null}}
function parseDate(raw){const d=new Date(String(raw||'').replace(/\s+/g,' ').trim());return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)}
function pageTitle(html){const h1=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);if(h1){const t=clean(h1[1]);if(t)return t.slice(0,240)}const t=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);return t?clean(t[1]).slice(0,240):''}
function titleContext(full,title){const f=String(full||''),t=String(title||'').trim();if(!t)return'';const probes=[t,t.slice(0,150),t.split(',').slice(0,2).join(',').trim()].filter(x=>x.length>12);for(const p of probes){const i=f.toLowerCase().indexOf(p.toLowerCase());if(i>=0)return f.slice(Math.max(0,i-900),Math.min(f.length,i+p.length+3200))}return''}
function recursiveJobPosting(v){if(!v)return null;if(Array.isArray(v)){for(const x of v){const j=recursiveJobPosting(x);if(j)return j}return null}if(typeof v!=='object')return null;const t=v['@type'];if(t==='JobPosting'||(Array.isArray(t)&&t.includes('JobPosting')))return v;for(const x of Object.values(v)){const j=recursiveJobPosting(x);if(j)return j}return null}
function jobPosting(html){for(const m of String(html||'').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const j=recursiveJobPosting(JSON.parse(decode(m[1]).trim()));if(j)return j}catch{}}return null}
function deadlineFromText(text){
  const s=String(text||'');
  const date='([0-9]{1,2}\\s+[A-Za-z]{3,9}\\s+20\\d{2}|[A-Za-z]{3,9}\\s+[0-9]{1,2},?\\s+20\\d{2})';
  const labels=[
    'deadline','closing\\s+date','closes?','apply\\s+by',
    'applications?\\s+(?:close|closes|closing)','closing\\s+applications?',
    'applications?\\s+closing','application\\s+deadline',
    '关闭申请','应用\\s*关闭'
  ];
  for(const label of labels){const re=new RegExp(label+'\\s*[:：-]?\\s*'+date,'i');const m=s.match(re);if(m){const d=parseDate(m[1]);if(d)return d}}
  return'';
}
function explicitClosed(text){return /applications? (?:are|is) (?:now )?closed|this vacancy is closed|no longer accepting applications|applications? (?:are|is) no longer being accepted|application period (?:has )?closed|position has been filled|applications? closed|关闭申请/.test(String(text||'').toLowerCase())}
async function fetchPage(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36 OpportunityMatcher/1.0','Accept':'text/html,application/xhtml+xml','Accept-Language':'en-GB,en;q=0.9','Cache-Control':'no-cache'}});if(!r.ok)throw new Error(`Official vacancy returned HTTP ${r.status}`);const html=(await r.text()).slice(0,750000);if(html.length<300)throw new Error('Official vacancy returned too little content');return{html,url:r.url||url,status:r.status}}finally{clearTimeout(timer)}}
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const id=String(req.query?.opportunity_id||'').toUpperCase(),cfg=PROVIDERS[id];if(!cfg)return res.status(404).json({ok:false,error:'Vacancy status verification is not configured for this programme.'});
  const target=allowed(String(req.query?.url||''),cfg);if(!target)return res.status(400).json({ok:false,error:'Only approved official provider URLs can be verified.'});
  res.setHeader('Cache-Control','public, s-maxage=180, stale-while-revalidate=600');
  try{
    const f=await fetchPage(target.toString()),final=allowed(f.url,cfg);if(!final)throw new Error('Official vacancy redirected outside the approved provider domain');
    const full=clean(f.html),job=jobPosting(f.html),title=clean(job?.title)||pageTitle(f.html),context=titleContext(full,title),valid=job?.validThrough?parseDate(job.validThrough):'';
    const deadline=valid||deadlineFromText(context)||deadlineFromText(full),today=new Date().toISOString().slice(0,10),closed=!!((deadline&&deadline<today)||explicitClosed(context));
    return res.status(200).json({ok:true,opportunity_id:id,provider:cfg.name,url:final.toString(),title,deadline,closed,reason:deadline&&deadline<today?'deadline_passed':closed?'explicitly_closed':'',fetched_at:new Date().toISOString(),http_status:f.status});
  }catch(e){return res.status(200).json({ok:true,opportunity_id:id,provider:cfg.name,url:target.toString(),deadline:'',closed:false,reason:'unreadable',fetch_error:e.message,fetched_at:new Date().toISOString()})}
}
