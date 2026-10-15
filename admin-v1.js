(()=>{
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const state={secret:sessionStorage.getItem('oppAdminSecret')||'',data:null,sourceFilter:'all',partialFilter:'all'};
  const TITLES={overview:['Freshness overview','Monitor coverage, rule depth and anything that needs a human decision.'],sources:['Official-source monitors','Inspect every monitored source, its latest success and any fetch issue.'],reviews:['Change review queue','Human review stays between source changes and user-facing eligibility.'],partials:['Partially normalized records','See exactly which records are waiting on cycle evidence, route logic or provider-specific detail.']};

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
    $('normalizedCount').textContent=s.normalized_opportunities??'—';$('totalOppCount').textContent=s.total_opportunities??'—';
    $('monitorSuccess').textContent=`${s.successful_monitors??0}/${s.active_monitors??0}`;$('monitorTotal').textContent=`${s.active_monitors??0} active`;$('monitorFailPill').textContent=`${s.failing_monitors??0} issues`;
    $('ruleCount').textContent=s.total_rules??'—';$('nonCountryRules').textContent=`${s.non_country_rules??0} non-country`;$('uncertainRules').textContent=`${s.uncertain_rules??0} uncertain`;
    $('pendingCount').textContent=s.pending_review??0;$('snapshotCount').textContent=`${s.total_snapshots??0} snapshots`;
    $('navSourceCount').textContent=s.active_monitors??'—';$('navReviewCount').textContent=s.pending_review??0;$('navPartialCount').textContent=s.partial_opportunities??'—';
    $('lastRefresh').textContent=fmtTime(state.data.generated_at);
    const issues=Number(s.failing_monitors||0),due=Number(s.due_monitors||0);
    $('sideStatusText').textContent=issues?`${issues} source${issues===1?'':'s'} need attention`:due?`${due} source${due===1?'':'s'} due`:'Freshness checks are current';
    const dot=document.querySelector('.statusDot');if(dot)dot.style.background=issues?'var(--amber)':'var(--green)';

    const total=Number(s.active_monitors||0)||1,healthy=Math.max(0,Number(s.successful_monitors||0)-issues),issue=issues;
    $('healthBars').innerHTML=[['Healthy',healthy,'healthy'],['Issues',issue,'issue'],['Due now',Number(s.due_monitors||0),'due']].map(([label,n,cls])=>`<div class="healthRow"><span>${label}</span><div class="healthTrack"><i class="${cls}" style="width:${Math.min(100,(n/total)*100)}%"></i></div><b>${n}</b></div>`).join('');
    const failing=(state.data.sources||[]).filter(x=>x.health==='error').slice(0,4);
    $('sourceIssuePreview').innerHTML=failing.length?failing.map(x=>`<div class="issueLine"><i></i><div><b>${esc(x.provider)}</b><span>${esc(x.last_error||'Fetch issue')}</span></div><span>${ago(x.last_checked_at)}</span></div>`).join(''):`<div class="issueLine"><i style="background:var(--green)"></i><div><b>All direct monitors healthy</b><span>No active fetch errors</span></div><span>current</span></div>`;
    const preview=(state.data.partials||[]).slice(0,5);
    $('partialPreview').innerHTML=preview.map(x=>`<div class="partialMini"><div><b>${esc(x.title)}</b><small>${esc(x.external_id)} · ${esc(x.provider)}</small></div><strong>${Number(x.uncertain_rules||0)?`${x.uncertain_rules} uncertain`:Number(x.route_blockers||0)?'route-specific':'confirmed rules'}</strong></div>`).join('');
  }

  function renderPulse(){const s=state.data.summary||{};$('pulseTimeline').innerHTML=[['Latest source success',ago(s.latest_monitor_success)],['Latest snapshot',ago(s.latest_snapshot_at)],['Latest opportunity update',ago(s.latest_opportunity_update)],['Change events',String(s.detected_changes??0)]].map(([k,v])=>`<div class="pulseItem"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}

  function healthBadge(h){const label={healthy:'Healthy',error:'Issue',due:'Due',waiting:'Waiting',paused:'Paused'}[h]||h;return`<span class="healthBadge ${esc(h)}"><i></i>${esc(label)}</span>`}
  function renderSources(){
    let rows=[...(state.data.sources||[])];const q=String($('sourceSearch')?.value||'').trim().toLowerCase();
    if(state.sourceFilter!=='all')rows=rows.filter(x=>x.health===state.sourceFilter);
    if(q)rows=rows.filter(x=>`${x.provider} ${x.source_key} ${x.source_url}`.toLowerCase().includes(q));
    $('sourceRows').innerHTML=rows.length?rows.map(x=>`<div class="tableRow sourcesGrid"><div class="sourceIdentity"><b>${esc(x.provider)}</b><span>${esc(x.source_key)}${x.last_error?` · ${esc(x.last_error)}`:''}</span></div><div>${healthBadge(x.health)}</div><div class="tableMeta">${Number(x.snapshot_count||0)}</div><div class="tableMeta">${ago(x.last_success_at)}<span class="tableSub">checked ${ago(x.last_checked_at)}</span></div><div class="tableMeta">${interval(x.check_interval_minutes)}</div><a class="rowLink" href="${esc(x.source_url)}" target="_blank" rel="noopener" title="Open official source">↗</a></div>`).join(''):`<div class="emptyState"><strong>No sources match this view.</strong><p>Try a different health filter or search term.</p></div>`;
  }

  function renderPartials(){
    let rows=[...(state.data.partials||[])];const q=String($('partialSearch')?.value||'').trim().toLowerCase();
    if(state.partialFilter==='uncertain')rows=rows.filter(x=>Number(x.uncertain_rules||0)>0);
    if(state.partialFilter==='route')rows=rows.filter(x=>Number(x.route_blockers||0)>0);
    if(state.partialFilter==='confirmed')rows=rows.filter(x=>Number(x.uncertain_rules||0)===0&&Number(x.route_blockers||0)===0);
    if(q)rows=rows.filter(x=>`${x.external_id} ${x.title} ${x.provider}`.toLowerCase().includes(q));
    $('partialRows').innerHTML=rows.length?rows.map(x=>`<div class="tableRow partialsGrid"><div class="partialIdentity"><b>${esc(x.title)}</b><span>${esc(x.external_id)} · ${esc(x.provider)}</span></div><div><span class="statusBadge">${esc(x.status||'—')}</span></div><div class="tableMeta">${Number(x.rule_count||0)}</div><div>${Number(x.uncertain_rules||0)?`<span class="countBadge">${x.uncertain_rules}</span>`:'<span class="tableMeta">0</span>'}</div><div>${Number(x.route_blockers||0)?`<span class="countBadge">${x.route_blockers}</span>`:'<span class="tableMeta">—</span>'}</div><a class="rowLink" href="${esc(x.official_source_url||'#')}" ${x.official_source_url?'target="_blank" rel="noopener"':''}>↗</a></div>`).join(''):`<div class="emptyState"><strong>No partial records match this view.</strong><p>Try another filter or search term.</p></div>`;
  }

  function renderReviews(){
    const rows=[...(state.data.changes||[])];const pending=rows.filter(x=>x.status==='pending_review');const resolved=rows.filter(x=>x.status!=='pending_review');const list=[...pending,...resolved].slice(0,100);
    const summary=state.data.summary||{};
    const grouped=Number(summary.pending_review_groups??pending.length);
    const outstanding=Number(summary.pending_review??0);
    const highRisk=Number(summary.high_risk_pending??0);
    const countNote=`${outstanding} pending events in ${grouped} review groups · ${highRisk} high-risk events. Reviewing a card handles only that individual event.`;
    const summaryEl=$('reviewSummary');if(summaryEl)summaryEl.textContent=countNote;
    if(!list.length){$('reviewQueue').innerHTML=`<div class="emptyState"><strong>No source changes are waiting for review.</strong><p>The baseline is quiet. When the monitor detects a meaningful deadline, country or eligibility shift, it will appear here before high-impact data changes silently.</p></div>`;return}
    $('reviewQueue').innerHTML=list.map(x=>`<article class="reviewCard"><div><div class="reviewTop"><span class="reviewRisk ${esc(x.risk_level||'medium')}">${esc(x.risk_level||'review')}</span><span class="reviewDate">${ago(x.detected_at)} · ${esc(x.provider)}</span></div><h3>${esc(x.opportunity_title||x.source_key||'Source change')}</h3><p>${esc(x.diff_summary||`${x.change_type||'Change'} detected in ${x.field_name||'source evidence'}.`)}</p>${Number(x.related_events||1)>1?`<p class="reviewGroupHint">${Number(x.related_events)} pending alerts of this type. This card shows the latest event; older alerts remain available for individual review.</p>`:''}</div><div class="reviewActions">${x.status==='pending_review'?`<button onclick="window.Ops.review('${esc(x.id)}','investigate')">Keep investigating</button><button onclick="window.Ops.review('${esc(x.id)}','ignore')">Ignore</button><button class="approve" onclick="window.Ops.review('${esc(x.id)}','approve')">Mark this reviewed</button>`:`<span class="statusBadge">${esc(x.status)}</span>`}<a class="rowLink" href="${esc(x.source_url||'#')}" target="_blank" rel="noopener">↗</a></div></article>`).join('');
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
  }
  window.Ops={review};bind();if(state.secret){$('adminSecret').value=state.secret;load()}
})();
