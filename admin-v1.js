(()=>{
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const state={secret:sessionStorage.getItem('oppAdminSecret')||'',data:null,sourceFilter:'all',partialFilter:'all',reviewFilter:'high'};
  const TITLES={overview:['Freshness overview','Monitor coverage, rule depth and anything that needs a human decision.'],sources:['Official-source monitors','Inspect every monitored source, its latest success and any fetch issue.'],reviews:['Source evidence alerts','Automated source checks hold any change that lacks confirmed provider evidence.'],partials:['Partially normalized records','See exactly which records are waiting on cycle evidence, route logic or provider-specific detail.']};

  const fmtTime=v=>{if(!v)return'Never';const d=new Date(v);if(Number.isNaN(d.getTime()))return'—';return d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})};
  const ago=v=>{if(!v)return'Never';const d=new Date(v).getTime();if(!Number.isFinite(d))return'—';const m=Math.max(0,Math.round((Date.now()-d)/60000));if(m<2)return'just now';if(m<60)return`${m}m ago`;const h=Math.round(m/60);if(h<36)return`${h}h ago`;return`${Math.round(h/24)}d ago`};
  const interval=m=>{m=Number(m||0);if(!m)return'—';if(m%1440===0)return`${m/1440}d`;if(m%60===0)return`${m/60}h`;return`${m}m`};
  function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2600)}
  function authHeaders(){return{Authorization:`Bearer ${state.secret}`,Accept:'application/json'}}

  async function load(){
    $('refreshBtn').disabled=true;$('refreshBtn').textContent='Refreshing…';
    try{
      const r=await fetch('/api/admin-health?ts='+Date.now(),{headers:authHeaders(),cache:'no-store'});
      if(r.status===401)throw Object.assign(new Error('That operations key was not accepted.'),{auth:true});
      if(!r.ok)throw new Error(`Admin API returned ${r.status}`);
      state.data=await r.json();
      sessionStorage.setItem('oppAdminSecret',state.secret);
      $('lockScreen').classList.add('hidden');$('console').classList.remove('hidden');
      renderAll();
    }catch(e){
      if(e.auth){sessionStorage.removeItem('oppAdminSecret');state.secret='';$('lockScreen').classList.remove('hidden');$('console').classList.add('hidden');$('lockError').textContent=e.message}
      else toast(e.message||'Could not refresh operations data.');
    }finally{$('refreshBtn').disabled=false;$('refreshBtn').textContent='Refresh data'}
  }

  function renderAll(){if(!state.data)return;renderSummary();renderSources();renderPartials();renderReviews();renderPulse()}
  function renderSummary(){
    const s=state.data.summary||{};const pct=s.total_opportunities?Math.round((s.normalized_opportunities/s.total_opportunities)*100):0;
    $('coveragePct').textContent=pct+'%';$('coverageRing').style.setProperty('--p',pct);
    $('memberRegistered').textContent=s.registered_accounts??'—';
    $('memberNew7d').textContent=s.accounts_7d??'—';
    $('memberPassports').textContent=s.linked_passports??'—';
    $('memberCompleted').textContent=s.completed_passports??'—';
    $('normalizedCount').textContent=s.normalized_opportunities??'—';$('totalOppCount').textContent=s.total_opportunities??'—';
    $('monitorSuccess').textContent=`${s.successful_monitors_7d??0}/${s.active_monitors??0}`;$('monitorTotal').textContent=`successful official fetches in 7 days`;$('monitorFailPill').textContent=`${s.blocked_monitors??0} access blocks · ${s.other_monitor_errors??0} other errors`;
    $('ruleCount').textContent=s.total_rules??'—';$('nonCountryRules').textContent=`${s.non_country_rules??0} non-country`;$('uncertainRules').textContent=`${s.uncertain_rules??0} uncertain`;
    $('pendingCount').textContent=s.pending_review??0;$('snapshotCount').textContent=`${s.total_snapshots??0} snapshots`;
    $('priorityReviewCount').textContent=String(s.high_risk_pending??0)+' high-risk events · '+String(s.pending_review_groups??0)+' review groups';
    $('navSourceCount').textContent=s.active_monitors??'—';$('navReviewCount').textContent=s.pending_review??0;$('navPartialCount').textContent=s.partial_opportunities??'—';
    $('lastRefresh').textContent=fmtTime(state.data.generated_at);
    $('discoveryTodaySources').textContent=String(s.discovery_scanned_today??'—')+' / '+String(s.active_monitors??'—');
    $('discoveryWindowNote').textContent=!Number(s.discovery_scanned_today||0)
      ?'No main discovery scan has finished today yet. Scheduled UTC windows are 06:00–06:45 and 18:00–18:45, plus a separate 8 AM UK run. Other official feeds may already have published source-confirmed pages.'
      :'Scheduled discovery is running. Fully verified open calls, exact vacancies, and source-confirmed programme pages are reported separately.';
    $('discoveryTodayHeld').textContent=s.discovery_new_held_today??'—';
    $('discoveryTodayPublished').textContent=s.discovery_new_published_today??'—';
    $('sourceConfirmedToday').textContent=s.source_confirmed_published_today??'—';
    $('exactOpenToday').textContent=s.exact_open_published_today??'—';
    $('discoveryCandidateTotals').textContent=(Number(s.discovered_published||0)+Number(s.discovered_withheld||0)+Number(s.discovered_existing||0));
    $('discoveryLastPass').textContent=ago(s.last_discovery_run);
    const latestWebRun=(state.data.worldwide_runs||[])[0];
    $('worldwideSearchStatus').textContent=!latestWebRun
      ?'Worldwide search is awaiting its first scheduled execution (04:30 UTC).'
      :latestWebRun.status==='not_configured'
      ?'Web-search API key not configured. Existing official-source discovery remains active.'
      :'Last '+latestWebRun.status+' pass: '+fmtTime(latestWebRun.started_at)+' · '+
       String(latestWebRun.queries_attempted||0)+' searches · '+
       String(latestWebRun.new_leads||0)+' new leads · '+
       String(latestWebRun.matched_official_hosts||0)+' known official-source hosts.';
    $('worldVerifiedCount').textContent=String(s.worldwide_verified_published??0)+' worldwide leads published';
    $('worldSourceReviewCount').textContent=String(s.worldwide_source_review??0)+' provider domains need review';
    $('worldEvidenceCount').textContent=String(s.worldwide_needs_evidence??0)+' leads need evidence';
    const verifiedRun=(state.data.worldwide_verification_runs||[])[0];
    $('worldVerifierActivity').textContent=verifiedRun
      ?'Verifier: '+fmtTime(verifiedRun.started_at)+' · '+esc(verifiedRun.status)+
        ' · '+Number(verifiedRun.inspected||0)+' checked · '+Number(verifiedRun.published_new||0)+' new published · '+
        Number(verifiedRun.needs_source_review||0)+' source reviews'
      :'First official-domain verification pass scheduled daily at 07:15 UTC.';
    const worldLeads=state.data.worldwide_leads||[];
    $('worldwideLeadList').innerHTML=worldLeads.length
      ?worldLeads.slice(0,8).map(item=>'<div><strong>'+esc(item.title)+'</strong>'+
        '<span>'+esc(item.search_region||'Worldwide')+
        (item.matched_official_host?' · known provider host':' · domain needs review')+ ' · '+esc(item.verification_status||'pending')+
        '</span></div>').join('')
      :'<span>No worldwide web-search leads collected yet.</span>';
    const passes=state.data.discovery_runs||[];
    $('discoveryRunSummary').innerHTML=passes.length?'<strong>Recent search passes</strong>'+
      passes.slice(0,8).map(pass=>
      '<div class="discoveryRunRow"><span>'+esc(fmtTime(pass.started_at))+'</span>'+
      '<span>'+esc(pass.status)+'</span><span>'+Number(pass.scanned_sources||0)+' sources</span>'+
      '<span>'+Number(pass.found_links||0)+' links</span>'+
      '<span>'+Number(pass.new_published||0)+' published</span>'+
      '<span>'+Number(pass.withheld||0)+' held</span>'+
      '<span>'+Number(pass.source_errors||0)+' errors</span></div>').join(''):
      'Individual pass logging starts with the next scheduled search. Historical checks are counted above.';
    const ratio=(n,d)=>String(n??'—')+' / '+String(d??'—');
    $('freshProgrammeCount').textContent=ratio(s.verified_records_30d,s.total_opportunities);
    $('freshRoutesCount').textContent=ratio(s.verified_routes_30d,s.active_country_routes);
    $('freshRulesCount').textContent=ratio(s.verified_rules_30d,s.total_rules);
    const issues=Number(s.failing_monitors||0),due=Number(s.due_monitors||0);
    $('sideStatusText').textContent=issues||due?`${s.blocked_monitors??0} provider access blocks · ${s.other_monitor_errors??0} other errors · ${due} due`:'All scheduled source checks current';
    const dot=document.querySelector('.statusDot');if(dot)dot.style.background=issues?'var(--amber)':'var(--green)';

    const total=Number(s.active_monitors||0)||1,healthy=Number(s.successful_monitors_7d||0),issue=issues,awaiting=Number(s.due_without_error||0);
    $('healthBars').innerHTML=[['Fetched · 7d',healthy,'healthy'],['Current issues',issue,'issue'],['Due · no error',awaiting,'due']].map(([label,n,cls])=>`<div class="healthRow"><span>${label}</span><div class="healthTrack"><i class="${cls}" style="width:${Math.min(100,(n/total)*100)}%"></i></div><b>${n}</b></div>`).join('');
    $('sourceIntervalNote').textContent=String(s.healthy_monitors??0)+' within their scheduled check interval; '+String(due)+' eligible for retry now; '+String(s.cooling_down_monitors??0)+' access-blocked sources in provider cooldown. A 403 means access refused, 429 means rate limited, and 503 means upstream unavailable. They cannot be declared verified without new source evidence. Source monitors run at 03:00, 05:00, 11:00, 17:00 and 23:00 UTC.';
    const failing=(state.data.sources||[]).filter(x=>x.health==='error').slice(0,4);
    $('sourceIssuePreview').innerHTML=failing.length?failing.map(x=>`<div class="issueLine"><i></i><div><b>${esc(x.provider)}</b><span>${esc(x.last_error||'Fetch issue')}${x.next_retry_at?' · next attempt '+fmtTime(x.next_retry_at):''}</span></div><span>${ago(x.last_checked_at)}</span></div>`).join(''):`<div class="issueLine"><i style="background:var(--green)"></i><div><b>All direct monitors healthy</b><span>No active fetch errors</span></div><span>current</span></div>`;
    const preview=(state.data.partials||[]).slice(0,5);
    $('partialPreview').innerHTML=preview.map(x=>`<div class="partialMini"><div><b>${esc(x.title)}</b><small>${esc(x.external_id)} · ${esc(x.provider)}</small></div><strong>${Number(x.uncertain_rules||0)?`${x.uncertain_rules} uncertain`:Number(x.route_blockers||0)?'route-specific':'confirmed rules'}</strong></div>`).join('');
  }

  function renderPulse(){const s=state.data.summary||{};$('pulseTimeline').innerHTML=[['Latest source success',ago(s.latest_monitor_success)],['Latest snapshot',ago(s.latest_snapshot_at)],['Latest opportunity update',ago(s.latest_opportunity_update)],['Source alerts',String(s.detected_changes??0)],['Fully verified programmes published',String(s.discovered_published??0)],['New source-confirmed pages today',String(s.source_confirmed_published_today??0)],['Held for evidence',String(s.discovered_withheld??0)],['Verified records (30d)',String(s.verified_records_30d??0)],['Rechecked (7d)',String(s.rechecked_records_7d??0)],['Exact open vacancies',String(s.verified_live_vacancies??0)],['Last discovery pass',ago(s.last_discovery_run)]].map(([k,v])=>`<div class="pulseItem"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}

  function healthBadge(h){const label={healthy:'Healthy',error:'Issue',due:'Due',waiting:'Waiting',paused:'Paused'}[h]||h;return`<span class="healthBadge ${esc(h)}"><i></i>${esc(label)}</span>`}
  function renderSources(){
    let rows=[...(state.data.sources||[])];const q=String($('sourceSearch')?.value||'').trim().toLowerCase();
    if(state.sourceFilter!=='all')rows=rows.filter(x=>x.health===state.sourceFilter);
    if(q)rows=rows.filter(x=>`${x.provider} ${x.source_key} ${x.source_url}`.toLowerCase().includes(q));
    $('sourceRows').innerHTML=rows.length?rows.map(x=>`<div class="tableRow sourcesGrid"><div class="sourceIdentity"><b>${esc(x.provider)}</b><span>${esc(x.source_key)}${x.last_error?` · ${esc(x.last_error)}`:''}${x.next_retry_at?` · retry eligible ${esc(fmtTime(x.next_retry_at))}`:''}</span></div><div>${healthBadge(x.health)}</div><div class="tableMeta">${Number(x.snapshot_count||0)}</div><div class="tableMeta">${ago(x.last_success_at)}<span class="tableSub">checked ${ago(x.last_checked_at)}</span></div><div class="tableMeta">${interval(x.check_interval_minutes)}</div><span class="sourceActions"><a class="rowLink" href="${esc(x.source_url)}" target="_blank" rel="noopener noreferrer" title="Open monitored provider page">↗</a>${x.recovery_url?`<a class="rowLink" href="${esc(x.recovery_url)}" target="_blank" rel="noopener noreferrer" title="Open alternative provider page (not automatically used to verify eligibility)">Alt ↗</a>`:''}</span></div>`).join(''):`<div class="emptyState"><strong>No sources match this view.</strong><p>Try a different health filter or search term.</p></div>`;
  }

  function renderPartials(){
    let rows=[...(state.data.partials||[])];const q=String($('partialSearch')?.value||'').trim().toLowerCase();
    if(state.partialFilter==='uncertain')rows=rows.filter(x=>Number(x.uncertain_rules||0)>0);
    if(state.partialFilter==='route')rows=rows.filter(x=>Number(x.route_blockers||0)>0);
    if(state.partialFilter==='confirmed')rows=rows.filter(x=>Number(x.uncertain_rules||0)===0&&Number(x.route_blockers||0)===0);
    if(q)rows=rows.filter(x=>`${x.external_id} ${x.title} ${x.provider}`.toLowerCase().includes(q));
    $('partialRows').innerHTML=rows.length?rows.map(x=>`<div class="tableRow partialsGrid"><div class="partialIdentity"><b>${esc(x.title)}</b><span>${esc(x.external_id)} · ${esc(x.provider)}</span></div><div><span class="statusBadge">${esc(x.status||'—')}</span></div><div class="tableMeta">${Number(x.rule_count||0)}</div><div>${Number(x.uncertain_rules||0)?`<span class="countBadge">${x.uncertain_rules}</span>`:'<span class="tableMeta">0</span>'}</div><div>${Number(x.route_blockers||0)?`<span class="countBadge">${x.route_blockers}</span>`:'<span class="tableMeta">—</span>'}</div><a class="rowLink" href="${esc(x.official_source_url||'#')}" ${x.official_source_url?'target="_blank" rel="noopener"':''}>↗</a></div>`).join(''):`<div class="emptyState"><strong>No partial records match this view.</strong><p>Try another filter or search term.</p></div>`;
  }

  function evidencePreview(x) {
    const samples=x.evidence_preview||{};
    const before=samples.previous||{}, after=samples.current||{};
    const fields=[...new Set(String(x.field_name||x.change_type||'').split(/[,+]/).map(v=>v.trim()).filter(Boolean))];
    const toText=value=>Array.isArray(value)?value.join(' | '):String(value??'No extracted evidence');
    const groups=fields.filter(field=>['dates','application','eligibility','funding'].includes(field));
    if(!groups.length)return '';
    return `<details class="reviewEvidence"><summary>View official-source before / after evidence</summary>
      <div class="reviewEvidenceGrid">${groups.map(field=>`<div class="evidenceGroup"><b>${esc(field)}</b><div><small>Previous</small><p>${esc(toText(before[field]).slice(0,430))}</p></div><div><small>Current</small><p>${esc(toText(after[field]).slice(0,430))}</p></div></div>`).join('')}</div>
      <p class="evidenceNotice">These excerpts may include website menus or navigation. Differences are signals for investigation, not proof of a changed eligibility rule. Only independently supported facts can update the published record.</p>
    </details>`;
  }
  function renderReviews(){
    const rows=[...(state.data.changes||[])];
    const pending=rows.filter(x=>x.status==='pending_review');
    const resolved=rows.filter(x=>x.status!=='pending_review');
    const list=[...pending,...resolved].slice(0,100);
    const s=state.data.summary||{};
    const grouped=Number(s.pending_review_groups??pending.length);
    const outstanding=Number(s.pending_review??0);
    const highRisk=Number(s.high_risk_pending??0);
    const summaryEl=$('reviewSummary');
    if(summaryEl)summaryEl.textContent=outstanding+' historical events in '+grouped+' evidence groups · '+highRisk+' high-risk events. Automated publishing never uses unresolved page-change alerts.';
    $('riskLegacyCount').textContent=String(s.high_risk_without_fingerprint??'—')+' high-risk events without fingerprint';
    $('riskUnlinkedCount').textContent=String(s.high_risk_without_opportunity??'—')+' high-risk events without linked opportunity';
    const selected=list.filter(x=>state.reviewFilter==='all'
      || state.reviewFilter==='high'&&x.status==='pending_review'&&x.risk_level==='high'
      || state.reviewFilter==='gaps'&&x.status==='pending_review'&&
          (Number(x.legacy_unfingerprinted_events||0)>0 || Number(x.events_without_opportunity||0)>0));
    $('reviewShowing').textContent=selected.length+' groups shown · original events retained';
    if(!selected.length){$('reviewQueue').innerHTML='<div class="emptyState"><strong>No alert groups match this filter.</strong><p>Try All groups to see other historical events.</p></div>';return}
    $('reviewQueue').innerHTML=selected.map(x=>{
      const title=x.opportunity_title||String(x.source_key||'Official provider').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      return `<article class="reviewCard"><div><div class="reviewTop"><span class="reviewRisk ${esc(x.risk_level||'medium')}">${esc(x.risk_level||'review')}</span><span class="reviewDate">${ago(x.detected_at)} · ${esc(x.provider)}</span></div>
        <h3>${esc(title)}</h3><p>${esc(x.diff_summary||x.change_type||'Source text changed')}</p>
        <p class="reviewGroupHint">${Number(x.related_events||1)} related event(s) · ${Number(x.legacy_unfingerprinted_events||0)} without legacy fingerprint · ${Number(x.events_without_opportunity||0)} without direct opportunity link. Original event records are retained.</p>
        ${(Number(x.legacy_unfingerprinted_events||0)>0 || Number(x.events_without_opportunity||0)>0)?'<p class="reviewEvidenceWarning">Evidence gap: inspect this source manually. Do not infer a changed eligibility rule from navigation text or a missing fingerprint.</p>':''}
        ${evidencePreview(x)}</div>
        <div class="reviewActions"><span class="statusBadge">${x.status==='pending_review'?'Held for automatic verification':esc(x.status)}</span>
          <a class="rowLink" href="${esc(x.source_url||'#')}" target="_blank" rel="noopener noreferrer" title="Official provider page">↗</a></div>
      </article>`;
    }).join('');
  }

  async function review(id,action){
    let note='';if(action==='approve')note='Reviewed in Opportunity operations console.';if(action==='ignore')note='Ignored in Opportunity operations console.';if(action==='investigate')note='Kept pending for further investigation.';
    try{const r=await fetch('/api/admin-review',{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({id,action,note})});if(!r.ok)throw new Error(`Review action returned ${r.status}`);toast(action==='approve'?'Review approved':action==='ignore'?'Change ignored':'Kept in review');await load()}catch(e){toast(e.message||'Review action failed')}
  }

  function setView(name){document.querySelectorAll('.opsNavBtn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));const [t,s]=TITLES[name]||TITLES.overview;$('viewTitle').textContent=t;$('viewSubtitle').textContent=s;window.scrollTo({top:0,behavior:'smooth'})}
  function bind(){
    $('unlockBtn').onclick=()=>{const v=$('adminSecret').value.trim();if(!v){$('lockError').textContent='Enter the protected operations key.';return}state.secret=v;$('lockError').textContent='';load()};
    $('adminSecret').addEventListener('keydown',e=>{if(e.key==='Enter')$('unlockBtn').click()});
    $('refreshBtn').onclick=load;$('lockBtn').onclick=()=>{sessionStorage.removeItem('oppAdminSecret');state.secret='';state.data=null;$('adminSecret').value='';$('console').classList.add('hidden');$('lockScreen').classList.remove('hidden')};
    document.querySelectorAll('.opsNavBtn').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>setView(b.dataset.jump));
    $('sourceSearch').addEventListener('input',renderSources);$('partialSearch').addEventListener('input',renderPartials);
    document.querySelectorAll('#sourceFilters button').forEach(b=>b.onclick=()=>{state.sourceFilter=b.dataset.filter;document.querySelectorAll('#sourceFilters button').forEach(x=>x.classList.toggle('active',x===b));renderSources()});
    document.querySelectorAll('#partialFilters button').forEach(b=>b.onclick=()=>{state.partialFilter=b.dataset.filter;document.querySelectorAll('#partialFilters button').forEach(x=>x.classList.toggle('active',x===b));renderPartials()});
    document.querySelectorAll('#reviewFilters button').forEach(b=>b.onclick=()=>{
      state.reviewFilter=b.dataset.filter;
      document.querySelectorAll('#reviewFilters button').forEach(x=>{
        x.classList.toggle('active',x===b);
        x.setAttribute('aria-pressed',String(x===b));
      });
      renderReviews();
    });
  }
  window.Ops={review};bind();if(state.secret){$('adminSecret').value=state.secret;load()}
})();
