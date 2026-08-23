(()=>{
  const style=document.createElement('style');
  style.id='opp-readability-v121';
  style.textContent=`
    :root{--opp-readable-floor:12px;--opp-readable-small:13px;--opp-readable-body:15px;--opp-readable-control:13px}
    body{line-height:1.5}
    .oppReadableFloor{font-size:var(--opp-readable-floor)!important;line-height:1.45!important}
    .oppReadableControl{font-size:var(--opp-readable-control)!important}

    /* Public site readability */
    .brandword small,.featureNum,.slideTag,.liveBadge,.statusPill,.tag,.liveBottom,.textBtn,.engineTop span,.risk,.engineStat span,.stepNo{font-size:var(--opp-readable-floor)!important;line-height:1.4!important}
    .navlinks a,.kicker,.microTrust,.slideInfo p,.sourceTrack,.feature p,.sectionLead,.liveCard .provider,.liveReason,.engine p,.step p{font-size:var(--opp-readable-body)!important;line-height:1.6!important}
    .eyebrow,.passportHint,.mockTitle,.checkRow,.trackerTop,.trackMini b,.trackMini small,.stagePill{font-size:var(--opp-readable-small)!important;line-height:1.45!important}

    /* Core workspace */
    .navbtn,.sideFoot,.appTop p,.passportGroupTitle,.formError,.editPassport,.summaryItem span,.summaryItem b,.privacyNote,.matchBadge,.matchWhy,.matchWhy span{font-size:var(--opp-readable-small)!important;line-height:1.45!important}

    /* Tracker + dashboard */
    .boardHead b,.boardHead span,.boardTitle,.boardProvider,.boardDeadline,.boardCard select,.miniChecklist label,.boardOpen,.boardEmpty,.dashHero span,.dashHero p,.dashHero button,.deadlineRow b,.deadlineRow span,.deadlineRow strong,.deadlineRow button{font-size:var(--opp-readable-small)!important;line-height:1.45!important}

    /* Detail drawer */
    .detailDeadline span,.detailSectionTitle,.eligibilityRow b,.eligibilityRow span,.eligibilityRow strong,.factGrid span,.factGrid b,.benefitWrap span,.sourceNotice,.detailActions .btn,.officialLink{font-size:var(--opp-readable-small)!important;line-height:1.5!important}

    /* Preparation workspace */
    .prepEy,.prepHead p,.prepPanel>p,.prepCheck b,.prepCheck span,.prepWhy,.prepFact span,.prepFact b,.prepStatus,.prepBtn,.prepCommandEy,.prepCommand p,.prepCommandStat span,.prepSignalChip,.prepStageBar div span,.prepStageBtn{font-size:var(--opp-readable-small)!important;line-height:1.5!important}
    .prepPanel h3,.prepCommand h3,.prepStageBar div b{font-size:14px!important;line-height:1.4!important}
    #prepModal textarea,#prepModal input,#prepModal select,#prepModal button{font-size:13px!important;line-height:1.5!important}
    #prepModal small,#prepModal .muted,#prepModal [class*="hint"],#prepModal [class*="meta"],#prepModal [class*="note"],#prepModal [class*="sub"]{font-size:12px!important;line-height:1.5!important}

    /* Official vacancy facts */
    .prepOfficialFactsHead b{font-size:14px!important}.prepOfficialFactsHead p{font-size:var(--opp-readable-small)!important;line-height:1.55!important}.prepOfficialBadge{font-size:var(--opp-readable-floor)!important}.prepOfficialCell span{font-size:var(--opp-readable-floor)!important}.prepOfficialCell b{font-size:var(--opp-readable-small)!important;line-height:1.45!important}.prepOfficialNote{font-size:var(--opp-readable-small)!important;line-height:1.55!important}

    /* Forms must remain readable and zoom-safe */
    input,select,textarea,button{font-size:max(13px,1em)}
    @media(max-width:700px){
      :root{--opp-readable-floor:13px;--opp-readable-small:14px;--opp-readable-body:16px;--opp-readable-control:16px}
      input,select,textarea{font-size:16px!important}
      button,.btn,.prepBtn,.prepStageBtn{font-size:14px!important}
      .heroCopy,.sectionLead,.feature p,.engine p,.step p{font-size:16px!important}
      #prepModal small,#prepModal .muted,#prepModal [class*="hint"],#prepModal [class*="meta"],#prepModal [class*="note"],#prepModal [class*="sub"]{font-size:13px!important}
    }
  `;
  document.head.appendChild(style);

  const roots=()=>['landing','app','prepModal','detail','onboard'].map(id=>document.getElementById(id)).filter(Boolean);
  const excluded=el=>el.matches?.('script,style,svg,path,circle,rect,line,polyline,polygon,.dot,.pulse,.progressRail,.checkProgress,.prepProgress,.passportPercent,.skeleton')||el.closest?.('svg');
  function hasOwnText(el){return [...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&String(n.textContent||'').trim())}
  function apply(el){
    if(!(el instanceof Element)||excluded(el)||!hasOwnText(el))return;
    const cs=getComputedStyle(el),px=parseFloat(cs.fontSize||'0');if(!Number.isFinite(px)||px<=0)return;
    const floor=window.matchMedia('(max-width:700px)').matches?13:12;
    if(px<floor)el.classList.add('oppReadableFloor');
    if(el.matches('button,input,select,textarea')&&px<(window.matchMedia('(max-width:700px)').matches?16:13))el.classList.add('oppReadableControl');
  }
  function scan(root){if(!root)return;apply(root);root.querySelectorAll('*').forEach(apply)}
  function refresh(){roots().forEach(scan)}
  let timer=null;
  const obs=new MutationObserver(records=>{
    clearTimeout(timer);timer=setTimeout(()=>{for(const r of records)for(const n of r.addedNodes)if(n instanceof Element)scan(n)},80)
  });
  obs.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(refresh,120)});
  setTimeout(refresh,80);setTimeout(refresh,900);
  window.OpportunityReadability={refresh};
})();
