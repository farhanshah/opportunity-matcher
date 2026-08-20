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

function recursiveJobPosting(value){
  if(!value)return null;
  if(Array.isArray(value)){for(const v of value){const x=recursiveJobPosting(v);if(x)return x}return null}
  if(typeof value!=='object')return null;
  const type=value['@type'];
  if(type==='JobPosting'||(Array.isArray(type)&&type.includes('JobPosting')))return value;
  for(const v of Object.values(value)){const x=recursiveJobPosting(v);if(x)return x}
  return null;
}
function jobPostingFrom(html){
  const scripts=[...String(html||'').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for(const m of scripts){
    try{const parsed=JSON.parse(decode(m[1]).trim());const job=recursiveJobPosting(parsed);if(job)return job}catch{}
  }
  return null;
}
function flattenJobPosting(job){
  if(!job)return'';
  const parts=[job.title,job.description,job.qualifications,job.responsibilities,job.skills,job.experienceRequirements,job.educationRequirements,job.incentiveCompensation,job.jobBenefits];
  return clean(parts.filter(Boolean).join(' '));
}
function scopedHtml(html){
  const candidates=[];
  const patterns=[
    /<main\b[^>]*>([\s\S]*?)<\/main>/ig,
    /<article\b[^>]*>([\s\S]*?)<\/article>/ig,
    /<(?:div|section)\b[^>]*(?:id|class)=["'][^"']*(?:job[-_ ]?(?:content|description|details)|vacancy[-_ ]?(?:content|description|details)|position[-_ ]?(?:content|description|details)|posting[-_ ]?(?:content|description|details))[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/ig
  ];
  for(const p of patterns){let m;while((m=p.exec(html))){const c=clean(m[1]);if(c.length>=400)candidates.push(c);if(candidates.length>=8)break}if(candidates.length>=8)break}
  candidates.sort((a,b)=>b.length-a.length);return candidates[0]||'';
}
function deadlineFrom(job,text){
  if(job?.validThrough){const d=new Date(job.validThrough);if(!Number.isNaN(d.getTime()))return d.toISOString().slice(0,10)}
  const s=String(text||'');const pats=[/Deadline\s*:?\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i,/Closing date\s*:?\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i,/Closes?\s*:?\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i,/Apply by\s*:?\s*([A-Za-z]{3,9}\s+[0-9]{1,2},?\s+20\d{2})/i];
  for(const p of pats){const m=s.match(p);if(!m)continue;const d=new Date(m[1]);if(!Number.isNaN(d.getTime()))return d.toISOString().slice(0,10)}return'';
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
    /\bonly\s+for\s+(?:national|local)\s+(?:candidates?|applicants?)\b/ig,
    /\b(?:applicants?|candidates?)\s+must\s+be\s+(?:a\s+)?(?:national|citizen)\s+of\s+[^.;]{2,90}/ig
  ];
  const educationPatterns=[/\b(?:bachelor'?s?|undergraduate|graduate|master'?s?|postgraduate|doctoral|phd|degree|university student|enrolled)\b/ig];
  const languagePatterns=[/\b(?:English|French|Arabic|Spanish|Chinese|Russian|Khmer|Portuguese|Italian|German|Urdu|Hindi|Sinhala|Tamil)\b/ig];
  const experiencePatterns=[/\b(?:years? of (?:relevant )?experience|professional experience|work experience|previous experience)\b/ig];
  return{
    national_restriction:snippets(combined,nationalPatterns,4),
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
    const job=jobPostingFrom(fetched.html);const structured=flattenJobPosting(job);const scoped=scopedHtml(fetched.html);const full=clean(fetched.html);
    let plain='',content_scope='',evidence_quality='low';
    if(structured.length>=300){plain=structured;content_scope='jobposting-jsonld';evidence_quality='high'}
    else if(scoped.length>=500){plain=scoped;content_scope='scoped-job-content';evidence_quality='medium'}
    else{plain=full.slice(0,60000);content_scope='full-page-fallback';evidence_quality='low'}
    const title=clean(job?.title)||pageTitle(fetched.html);const deadline=deadlineFrom(job,plain);const sig=signals(plain,title);
    return res.status(200).json({
      ok:true,opportunity_id:id,provider:cfg.name,url:final.toString(),title,
      fetched_at:new Date().toISOString(),http_status:fetched.status,deadline,
      content_scope,evidence_quality,signals:sig,search_text:plain.slice(0,30000),
      notice:`Vacancy text was read from the official provider page using ${content_scope}. Automated fit signals are conservative and do not replace the vacancy notice.`
    });
  }catch(e){
    return res.status(200).json({ok:true,opportunity_id:id,provider:cfg.name,url:target.toString(),fetched_at:new Date().toISOString(),signals:{},search_text:'',content_scope:'unreadable',evidence_quality:'none',notice:'The vacancy page could not be read safely. Open the official posting and review its requirements directly.',fetch_error:e.message});
  }
}
