const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));

export function ukDeliveryWindow(now=new Date()){
  const options={timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',hourCycle:'h23'};
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',options).formatToParts(now)
    .filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return {day:parts.year+'-'+parts.month+'-'+parts.day,hour:Number(parts.hour),
    shouldRun:Number(parts.hour)>=9&&Number(parts.hour)<=12};
}

const number=x=>Number.isFinite(Number(x))?Number(x):0;
const total=(runs,key)=>runs.filter(x=>x.status==='completed')
  .reduce((sum,x)=>sum+number(x[key]),0);
const section=(label,value)=>'<div style="padding:15px 14px;border:1px solid #dfe4eb;'+
  'border-radius:10px;background:#f6f8fb"><div style="font-size:12px;color:#526277">'+
  esc(label)+'</div><div style="font-size:25px;font-weight:800;margin-top:5px;color:#151c29">'+
  esc(value)+'</div></div>';

export function discoveryDigest({day,officialRuns=[],worldRuns=[],verificationRuns=[],officialCandidates=[],publishedOpportunities=[],worldLeads=[],catalogueHealth=null,sourceListingStats=null,governmentFeedStats=null,supplementalFeedStats=null}){
  const completedOfficial=officialRuns.filter(x=>x.status==='completed');
  const completedWorld=worldRuns.filter(x=>x.status==='completed');
  const latestWorld=worldRuns[0]||null;
  const completedVerification=verificationRuns.filter(x=>x.status==='completed');
  const officialMissing=!completedOfficial.length;
  const worldMissing=!completedWorld.length;
  const verifierMissing=!completedVerification.length;
  const publishedFromOfficial=total(completedOfficial,'new_published');
  const publishedFromWeb=total(completedVerification,'published_new');
  const publishedMissing=officialMissing&&verifierMissing;
  const pub=publishedFromOfficial+publishedFromWeb;
  const held=total(completedOfficial,'withheld');
  const worldNew=total(completedWorld,'new_leads');
  const officialHostLeads=total(completedWorld,'matched_official_hosts');
  const sourceCount=sourceListingStats?number(sourceListingStats.published_pages):null;
  const sourceAdded=sourceListingStats?number(sourceListingStats.added_last_24h):null;
  const fedRuns=governmentFeedStats?number(governmentFeedStats.runs):null;
  const fedRecorded=governmentFeedStats?number(governmentFeedStats.official_source_records):null;
  const fedErrors=governmentFeedStats?number(governmentFeedStats.errors):null;
  const officialLinkRuns=supplementalFeedStats?number(supplementalFeedStats.official_links_runs):null;
  const officialLinkLeads=supplementalFeedStats?number(supplementalFeedStats.new_official_link_leads):null;
  const internshipRuns=supplementalFeedStats?number(supplementalFeedStats.internship_runs):null;
  const internshipPublished=supplementalFeedStats?number(supplementalFeedStats.new_internship_publications):null;
  const firstLine='Daily opportunity discovery · '+day;
  const catalogueRecorded=Boolean(catalogueHealth)&&Number.isSafeInteger(Number(catalogueHealth.total_records));
  const catalogueTotal=catalogueRecorded?number(catalogueHealth.total_records):0;
  const rechecked24h=catalogueRecorded?number(catalogueHealth.rechecked_24h):0;
  const verified30d=catalogueRecorded?number(catalogueHealth.verified_30d):0;
  const statusOfficial=officialMissing
    ?'No successfully completed official-source discovery run recorded for this date.'
    :completedOfficial.length+' completed official-source passes; '+
      total(completedOfficial,'scanned_sources')+' sources scanned; '+
      total(completedOfficial,'found_links')+' links discovered.';
  const statusWorld=worldMissing
    ?latestWorld?.status==='not_configured'
       ?'Worldwide search not configured at the time of this run.'
       :'No successfully completed worldwide search run recorded for this date.'
    :completedWorld.length+' completed worldwide-search passes; '+
      total(completedWorld,'queries_attempted')+' searches; '+
      total(completedWorld,'results_found')+' results.';
  const failures=officialRuns.filter(x=>x.status==='failed').length+
    worldRuns.filter(x=>x.status==='failed').length+
    verificationRuns.filter(x=>x.status==='failed').length;
  const providerErrors=total(completedWorld,'provider_errors')+
    total(completedOfficial,'source_errors')+total(completedVerification,'provider_errors');
  const missingCount=(officialMissing?1:0)+(worldMissing?1:0)+(verifierMissing?1:0);
  const list=arr=>arr.slice(0,6).map(x=>
    '<li style="margin-bottom:8px">'+esc(x.title||'Unnamed programme')+
    ' <span style="color:#697586">('+esc(x.provider||x.search_region||'World')+')</span></li>').join('');
  const intro= '<p style="margin:0 0 16px;color:#45546a;font-size:14px;line-height:1.6">'+
    'This is your automated morning report. Search leads are not verified opportunities.'+
    ' Check official provider pages before applying.</p>';
  const metrics=section('Official sources scanned',officialMissing?'Not recorded':total(completedOfficial,'scanned_sources'))+
    section('Official-source links found',officialMissing?'Not recorded':total(completedOfficial,'found_links'))+
    section('New opportunities published',publishedMissing?'Not recorded':pub)+
    section('Source-confirmed pages (NOT eligibility verified)',sourceCount===null?'Not recorded':sourceCount)+
    section('New source-confirmed pages · last 24h',sourceAdded===null?'Not recorded':sourceAdded)+
    section('New official-provider links queued',officialLinkLeads===null?'Not recorded':officialLinkLeads)+
    section('New exact internship pages published',internshipPublished===null?'Not recorded':internshipPublished)+
    section('Official Grants.gov feed (source-only)',fedRuns===null?'Not recorded':fedRuns+' runs; '+fedRecorded+' records')+
    section('Worldwide search leads added',worldMissing?'Not recorded':worldNew)+
    section('Official-host matches (unverified)',worldMissing?'Not recorded':officialHostLeads)+
    section('Catalogue rechecked · last 24h',catalogueRecorded?rechecked24h+' / '+catalogueTotal:'Not recorded')+
    section('Verified catalogue · last 30d',catalogueRecorded?verified30d+' / '+catalogueTotal:'Not recorded');
  const alerts='<p style="font-size:13px;color:#39495d;line-height:1.65">'+
    '<b>Official-source search:</b> '+esc(statusOfficial)+'<br>'+
    '<b>Worldwide web search:</b> '+esc(statusWorld)+'<br>'+
    '<b>Official-host candidate matches:</b> '+(worldMissing?'Not recorded':officialHostLeads)+' (not yet verified)<br>'+
    '<b>Catalogue verification:</b> '+(catalogueRecorded
      ?esc(rechecked24h)+' checked in the last 24h; '+esc(verified30d)+
        ' verified within 30d; '+esc(number(catalogueHealth.never_checked))+
        ' never checked; '+esc(number(catalogueHealth.needs_evidence))+
        ' need stronger evidence; '+esc(number(catalogueHealth.retry_needed))+
        ' need provider retry.'
      :'Not recorded')+'<br>'+
    '<b>Worldwide verifier published:</b> '+(verifierMissing?'Not recorded':publishedFromWeb)+'<br>'+
    '<b>Official-provider link discovery:</b> '+(officialLinkRuns===null?'Not recorded':officialLinkRuns+' runs; '+officialLinkLeads+' new queued programme leads')+'<br>'+
    '<b>Exact internship feeds:</b> '+(internshipRuns===null?'Not recorded':internshipRuns+' runs; '+internshipPublished+' newly published source-only vacancies')+'<br>'+
    '<b>Source-confirmed programmes:</b> '+(sourceCount===null?'Not recorded':sourceCount)+' (not eligible for automatic matching)<br>'+
    '<b>Held for evidence:</b> '+(officialMissing?'Not recorded':held)+
    '<br><b>Already listed:</b> '+(officialMissing?'Not recorded':total(completedOfficial,'already_existing'))+
    '<br><b>Reported source/provider errors:</b> '+providerErrors+
    '<br><b>Failed run records:</b> '+failures+
    (missingCount?'<br><b>Missing successful runs:</b> '+missingCount:'')+
    '</p>';
  const publishedItems=publishedOpportunities.length?'<h3 style="font-size:15px;color:#1e2735">Newly published opportunities</h3>'+' <ul style="font-size:13px;line-height:1.55">'+list(publishedOpportunities)+'</ul>':'';
  const candidates=officialCandidates.length?'<h3 style="font-size:15px;color:#1e2735">New candidates awaiting evidence</h3>'+
    '<ul style="font-size:13px;line-height:1.55">'+list(officialCandidates)+'</ul>':'';
  const leads=worldLeads.length?'<h3 style="font-size:15px;color:#1e2735">Worldwide leads to verify</h3>'+
    '<ul style="font-size:13px;line-height:1.55">'+list(worldLeads)+'</ul>':'';
  const html='<!doctype html><html><body style="margin:0;padding:24px;background:#eef1f6;'+
    'font-family:Arial,Helvetica,sans-serif;color:#1d2733">'+
    '<div style="max-width:630px;margin:auto;background:white;border:1px solid #e0e5eb;'+
    'border-radius:14px;overflow:hidden"><div style="background:#10323a;color:#fff;padding:24px">'+
    '<div style="font-weight:800;font-size:22px">OppMatcher <span style="color:#60e8d4">↗</span></div>'+
    '<p style="color:#c6d0e0;margin:8px 0 0;font-size:13px">Daily global opportunity discovery</p></div>'+
    '<div style="padding:24px"><h1 style="font-size:24px;margin:0 0 16px">'+esc(firstLine)+'</h1>'+
    intro+'<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">'+metrics+'</div>'+
    alerts+publishedItems+candidates+leads+
    '<p style="margin-top:24px;font-size:13px"><a href="https://oppmatcher.tech/admin" '+
    'style="color:#08766b">Open OppMatcher Operations</a></p>'+
    '<p style="margin-top:18px;border-top:1px solid #e5e9f0;padding-top:16px;font-size:12px;'+
    'line-height:1.6;color:#697586">Report generated from OppMatcher stored discovery results.'+
    ' A missing or failed run is never treated as zero new opportunities. '+
    'Worldwide search results are held privately until independently verified.</p>'+
    '</div></div></body></html>';
  const text=[
    firstLine,statusOfficial,statusWorld,
    'New opportunities published: '+(publishedMissing?'Not recorded':pub),
    'Source-confirmed programme pages: '+(sourceCount===null?'Not recorded':sourceCount),
    'Official government feed: '+(fedRuns===null?'Not recorded':fedRuns+' runs, '+fedRecorded+' source-only records, '+fedErrors+' errors'),
    'New source-confirmed pages in 24h: '+(sourceAdded===null?'Not recorded':sourceAdded),
    'New official-provider programme links queued: '+(officialLinkLeads===null?'Not recorded':officialLinkLeads),
    'New exact internship vacancies published: '+(internshipPublished===null?'Not recorded':internshipPublished),
    'Programme records checked, last 24h: '+(catalogueRecorded?rechecked24h+' / '+catalogueTotal:'Not recorded'),
    'Programme records verified in last 30d: '+(catalogueRecorded?verified30d+' / '+catalogueTotal:'Not recorded'),
    'Never checked / need evidence / need retry: '+(catalogueRecorded
      ?[number(catalogueHealth.never_checked),number(catalogueHealth.needs_evidence),number(catalogueHealth.retry_needed)].join(' / ')
      :'Not recorded'),
    'Held candidates: '+(officialMissing?'Not recorded':held),
    'Worldwide verifier published: '+(verifierMissing?'Not recorded':publishedFromWeb),
    'Newly published: '+(publishedOpportunities.length?publishedOpportunities.map(x=>x.title).join('; '):'No named new programmes reported'),
    'New worldwide leads: '+(worldMissing?'Not recorded':worldNew),
    'Official-host matches needing verification: '+(worldMissing?'Not recorded':officialHostLeads),
    'Source/provider errors: '+providerErrors,
    'Failed runs: '+failures,
    'Official evidence is required before publication.',
    'https://oppmatcher.tech/admin'
  ].join('\n');
  return {subject:'OppMatcher daily discovery · '+day,html,text,
    statistics:{published:pub,publishedFromWeb,worldNew,officialHostLeads,sourceCount,sourceAdded,officialLinkLeads,officialLinkRuns,internshipRuns,internshipPublished,governmentFeedRuns:fedRuns,governmentSourceRecords:fedRecorded,held,providerErrors,missingCount,
      catalogueChecked24h:catalogueRecorded?rechecked24h:null,
      catalogueVerified30d:catalogueRecorded?verified30d:null,
      catalogueTotal:catalogueRecorded?catalogueTotal:null}};
}
