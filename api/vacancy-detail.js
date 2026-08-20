const PROVIDERS={
  'INT-004':{name:'OECD',hosts:['oecd.org']},
  'INT-005':{name:'UNICEF',hosts:['jobs.unicef.org']},
  'INT-006':{name:'UNDP',hosts:['jobs.undp.org','undp.org']},
  'INT-013':{name:'WFP',hosts:['wfp.org']},
  'INT-014':{name:'ILO',hosts:['jobs.ilo.org','ilo.org']},
  'INT-018':{name:'EBRD',hosts:['jobs.ebrd.com','ebrd.com']},
  'INT-019':{name:'UNOPS',hosts:['jobs.unops.org','unops.org']},
  'INT-021':{name:'IFAD',hosts:['ifad.org']},
  'INT-022':{name:'IOM',hosts:['iom.int']},
  'FEL-015':{name:'WIPO',hosts:['wipo.int']}
};

const decode=s=>String(s||'')
  .replace(/&nbsp;/gi,' ')
  .replace(/&amp;/gi,'&')
  .replace(/&quot;/gi,'"')
  .replace(/&#39;/gi,"'")
  .replace(/&lt;/gi,'<')
  .replace(/&gt;/gi,'>')
  .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));

const clean=s=>decode(String(s||'')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/\s+/g,' ')
  .trim());

function allowedUrl(raw,cfg){
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:')return null;
    const host=u.hostname.toLowerCase().replace(/^www\./,'');
    const ok=cfg.hosts.some(h=>host===h||host.endsWith('.'+h));
    return ok?u:null;
  }catch{return null}
}

function pageTitle(html){
  const h1=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if(h1){const t=clean(h1[1]);if(t)return t.slice(0,240)}
  const title=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return title?clean(title[1]).slice(0,240):'';
}

function snippets(text,patterns,limit=4){
  const out=[];const seen=new Set();
  for(const p of patterns){
    p.lastIndex=0;let m;
    while((m=p.exec(text))&&out.length<limit){
      const start=Math.max(0,m.index-170),end=Math.min(text.length,m.index+m[0].length+230);
      const s=text.slice(start,end).replace(/\s+/g,' ').trim();
      const key=s.toLowerCase();if(!seen.has(key)){seen.add(key);out.push(s)}
      if(!p.global)break;
    }
    if(out.length>=limit)break;
  }
  return out;
}

function signals(text,title){
  const combined=`${title} ${text}`.slice(0,120000);
  const nationalPatterns=[
    /\b(?:only|must be|restricted to|open to)\s+(?:the\s+)?(?:nationals?|citizens?)\s+(?:of|from)\s+[^.;]{2,90}/ig,
    /\b[^.;()]{2,60}\s+nationals?\s+only\b/ig,
    /\b(?:national|local)\s+intern(?:ship)?\b/ig,
    /\bonly\s+for\s+(?:national|local)\s+(?:candidates?|applicants?)\b/ig
  ];
  const educationPatterns=[/\b(?:bachelor'?s?|undergraduate|graduate|master'?s?|postgraduate|doctoral|phd|degree|university student|enrolled)\b/ig];
  const languagePatterns=[/\b(?:English|French|Arabic|Spanish|Chinese|Russian|Khmer|Portuguese|Italian|German|Urdu|Hindi)\b/ig];
  const experiencePatterns=[/\b(?:years? of (?:relevant )?experience|professional experience|work experience|previous experience)\b/ig];
  return{
    national_restriction:snippets(combined,nationalPatterns,3),
    education:snippets(combined,educationPatterns,4),
    language:snippets(combined,languagePatterns,4),
    experience:snippets(combined,experiencePatterns,3)
  };
}

async function fetchVacancy(url){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
  try{
    const r=await fetch(url,{signal:controller.signal,redirect:'follow',headers:{
      'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36 OpportunityMatcher/1.0',
      'Accept':'text/html,application/xhtml+xml',
      'Accept-Language':'en-GB,en;q=0.9',
      'Cache-Control':'no-cache'
    }});
    if(!r.ok)throw new Error(`Official vacancy returned HTTP ${r.status}`);
    const type=String(r.headers.get('content-type')||'');if(type&&!/html|text/i.test(type))throw new Error('Official vacancy did not return a readable page');
    const html=(await r.text()).slice(0,750000);
    if(html.length<300)throw new Error('Official vacancy returned too little content');
    return{html,status:r.status,final_url:r.url||url};
  }finally{clearTimeout(timer)}
}

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const id=String(req.query?.opportunity_id||'').toUpperCase();const cfg=PROVIDERS[id];
  if(!cfg)return res.status(404).json({ok:false,error:'Vacancy inspection is not configured for this programme.'});
  const target=allowedUrl(String(req.query?.url||''),cfg);
  if(!target)return res.status(400).json({ok:false,error:'Only official provider vacancy URLs can be inspected.'});
  res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=1800');
  try{
    const fetched=await fetchVacancy(target.toString());
    const final=allowedUrl(fetched.final_url,cfg);if(!final)throw new Error('Official vacancy redirected outside the approved provider domain');
    const title=pageTitle(fetched.html);const plain=clean(fetched.html).slice(0,60000);
    const sig=signals(plain,title);
    return res.status(200).json({
      ok:true,opportunity_id:id,provider:cfg.name,url:final.toString(),title,
      fetched_at:new Date().toISOString(),http_status:fetched.status,
      signals:sig,search_text:plain.slice(0,30000),
      notice:'Vacancy text was read from the official provider page. Automated fit signals are conservative and do not replace the vacancy notice.'
    });
  }catch(e){
    return res.status(200).json({ok:true,opportunity_id:id,provider:cfg.name,url:target.toString(),fetched_at:new Date().toISOString(),signals:{},search_text:'',notice:'The vacancy page could not be read safely. Open the official posting and review its requirements directly.',fetch_error:e.message});
  }
}
