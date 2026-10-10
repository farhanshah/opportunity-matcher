(async()=>{
  const BUILD='20261010-v260';
  document.documentElement.dataset.omBuild=BUILD;
  const files=[
    '/app-v08-base.js','/app-v08-match.js','/app-v08-views.js','/app-v08-tracker.js','/app-v08-boot.js',
    '/app-v10-post.js','/app-v11-polish.js','/app-v12-tracker.js','/app-cloud-bridge.js','/app-v116-passport-cloud-canonical.js','/app-cloud-routefix.js','/premium-v14-loader.js',
    '/app-v15-consistency.js','/app-v16-public.js','/app-v16-rules.js','/app-v17-profile-signals.js','/app-v18-country.js','/app-v19-country-routes.js',
    '/app-v20-fellowship-rules.js','/app-v21-internship-rules.js','/app-v22-scholarship-rules.js','/app-v23-final-rules.js','/app-v24-precision-rules.js',
    '/app-v25-fellowship-precision.js','/app-v26-org-internship-precision.js','/app-v27-internship-scholarship-precision.js','/app-v28-scholarship-depth.js',
    '/app-v29-blocker-precision.js','/app-v30-umbrella-routes.js','/app-v31-current-cycle-precision.js','/app-v32-country-route-precision.js',
    '/app-v33-passport-v2.js','/app-v34-passport-v2-polish.js','/app-v35-match-intelligence.js','/app-v36-dashboard-intel-mount.js','/app-v36-passport-cloud-fix.js',
    '/app-v37-review-drivers.js','/app-v38-country-route-resolution.js','/app-v39-dimension-cleanup.js','/app-v40-profile-resolvers.js','/app-v41-route-work-queue.js',
    '/app-v42-adaptive-evidence.js','/app-v43-evidence-cloud.js','/app-v44-live-openings.js','/app-v45-vacancy-fit.js','/app-v46-best-live-feed.js','/app-v143-live-quality-guard-v209.js','/app-v145-location-integrity-v210.js',
    '/app-v47-live-feed-guard.js','/app-v48-deep-vacancy-ranking.js','/app-v49-vacancy-status-guard.js','/app-v50-provider-verification-policy.js',
    '/app-v51-exact-provider-adapters.js','/app-v52-exact-feed-authority.js','/app-v53-country-cycle-routing.js','/app-v54-specific-opening-coverage.js',
    '/app-v55-opening-authority-sync.js','/app-v56-specific-feed-bridge.js','/app-v57-deep-ranking-v2.js','/app-v66-unicef-exact-bridge.js',
    '/app-v58-undp-exact-bridge.js','/app-v59-ranking-title-fix.js','/app-v60-wfp-exact-bridge.js','/app-v61-unops-exact-bridge.js',
    '/app-v62-eligibility-aware-ranking.js','/app-v63-readiness-labels.js','/app-v64-action-workflow.js','/app-v65-exact-tracker-polish.js',
    '/app-v66-exact-track-durability.js','/app-v67-preparation-workspace.js','/app-v68-exact-track-freshness.js','/app-v70-exact-board-bridge.js',
    '/app-v91-official-vacancy-facts.js','/app-v93-exact-feed-awareness.js','/app-v92-readability.js','/app-v94-theme-system.js','/app-v95-motion.js',
    '/app-v96-route-ux.js','/app-v97-product-ux.js','/app-v98-workspace-integrity.js',
    '/app-v109-studio-truth-sync.js','/app-v71-password-recovery-v2.js','/app-v103-boot-finalize.js','/app-v108-prepare-route.js',
    '/app-v110-tracker-pack-status.js','/app-v111-tracker-status-hardfix.js','/app-v113-tracker-prep-summary.js','/app-v114-submission-stage.js','/app-v122-post-submission-lifecycle.js','/app-v115-dashboard-momentum.js','/app-v117-dashboard-momentum-pill.js','/app-v118-live-tracked-context.js','/app-v119-dashboard-actionable-priority.js','/app-v120-dashboard-convergence.js','/app-v121-dashboard-pipeline-truth.js','/app-v123-light-tracker-contrast.js','/app-v124-application-history.js','/app-v125-history-cloud-repair.js','/app-v126-history-milestone-reconcile.js','/app-v127-exact-history-durability.js','/app-v128-live-history-events.js','/app-v138-radar-order-v204.js','/app-v139-smart-next-action-v205.js','/app-v140-journey-hardening-v206.js','/app-v141-submission-deeplink-v207.js','/app-v142-submission-refresh-guard-v208.js','/app-v146-live-action-bridge-v211.js','/app-v147-live-action-v2-bridge-v212.js','/app-v148-official-source-truth-v213.js'
  ];

  try{
    const mode=localStorage.getItem('oppThemeModeV1')||'auto';
    const hour=new Date().getHours();
    const theme=mode==='auto'?(hour>=7&&hour<19?'light':'dark'):mode;
    if(theme==='light'||theme==='dark'){
      document.documentElement.dataset.omTheme=theme;
      document.documentElement.dataset.omThemeMode=mode;
    }
  }catch{}

  function criticalCss(href,attr){
    if(document.querySelector(`link[${attr}]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`${href}?build=${BUILD}`;
    link.setAttribute(attr,'true');
    document.head.appendChild(link);
  }
  criticalCss('/theme-v2.css','data-om-theme-css');
  criticalCss('/hotfix-v133.css','data-om-hotfix-v133');

  const started=performance.now();
  const sources=await Promise.all(files.map(async src=>{
    const url=`${src}?build=${BUILD}`;
    const r=await fetch(url,{cache:'no-cache',credentials:'same-origin'});
    if(!r.ok)throw new Error(`Failed to load ${src} (HTTP ${r.status})`);
    return r.text();
  }));

  for(let i=0;i<files.length;i++){
    const s=document.createElement('script');
    s.textContent=`${sources[i]}\n//# sourceURL=${files[i]}?build=${BUILD}`;
    document.body.appendChild(s);
  }
  document.documentElement.dataset.omBootMs=String(Math.round(performance.now()-started));
})().catch(err=>{
  console.error('Opportunity workspace failed to start',err);
  document.documentElement.classList.add('omBootReady');
  const pill=document.getElementById('apiStatus');
  if(pill)pill.textContent='App failed to load';
});