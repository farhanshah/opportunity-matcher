(()=>{
  const VERSION='v252';
  const norm=v=>String(v||'').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  const postSubmission=new Set(['Submitted','Interview','Offer received','Unsuccessful']);

  function stores(){
    let ts={};try{ts=(typeof tracks==='object'&&tracks)||window.tracks||{}}catch{ts=window.tracks||{}}
    let os=[];try{os=Array.isArray(opps)?opps:[]}catch{}
    return{ts,os};
  }

  function isExpired(o){
    try{if(typeof days==='function'){const d=Number(days(o));if(Number.isFinite(d))return d<0}}catch{}
    const raw=String(o?.Close_Date||o?.deadline||'').trim();
    if(!raw)return false;
    const end=new Date(`${raw}T23:59:59`);return Number.isFinite(end.getTime())&&end.getTime()<Date.now();
  }

  function rowsByTitle(){
    const {ts,os}=stores(),byId=new Map(os.map(o=>[String(o?.Opportunity_ID),o])),map=new Map();
    for(const [id,t] of Object.entries(ts)){
      let o=byId.get(String(id));
      if(!o&&t?.exactVacancy?.url){
        const m=t.exactVacancy;
        o={
          Opportunity_ID:id,
          Opportunity_Name:m.title||'Verified vacancy',
          Provider:m.provider||'Official provider',
          Close_Date:m.deadline||'',
          Application_URL:m.url||'',
          Official_Source_URL:m.url||'',
          Status:'Open'
        };
      }
      if(!o)continue;
      const title=norm(o.Opportunity_Name);if(title)map.set(title,{id,t,o});
    }
    return map;
  }

  function css(){
    if(document.getElementById('om-expired-tracker-v224-style'))return;
    const s=document.createElement('style');s.id='om-expired-tracker-v224-style';s.textContent=`
      #tracker .focusCard.omExpiredTrackV224{border-color:rgba(145,153,168,.24)!important;box-shadow:none!important;opacity:.88}
      #tracker .focusCard.omExpiredTrackV224:before{background:linear-gradient(180deg,#9aa3b2,#697386)!important}
      #tracker .focusCard.omExpiredTrackV224 .focusAction{background:rgba(120,128,143,.06)!important;border-color:rgba(145,153,168,.18)!important}
      #tracker .focusCard.omExpiredTrackV224 .focusAction span{color:#7e8797!important}
      #tracker .focusCard.omExpiredTrackV224 .focusAction b{color:inherit!important}
      #tracker .focusCard.omExpiredTrackV224 .focusTask{opacity:.55}
      #tracker .focusCard.omExpiredTrackV224 .focusTask input{cursor:not-allowed}
      #tracker .focusCard.omExpiredTrackV224 .prepOpen:disabled{background:#222a35!important;border-color:#3a4554!important;color:#8f99a8!important;box-shadow:none!important;opacity:.72!important;cursor:not-allowed!important}
    `;document.head.appendChild(s);
  }

  function closeCard(card,row){
    const {t}=row,stage=String(t?.stage||'Saved');
    if(!isExpired(row.o)||postSubmission.has(stage))return false;
    card.classList.add('omExpiredTrackV224');card.classList.remove('urgent');card.dataset.omExpired='true';

    const action=card.querySelector('.focusAction');
    if(action){
      const label=action.querySelector('span'),headline=action.querySelector('b'),small=action.querySelector('small');
      if(label)label.textContent='Do next · Closed opportunity';
      if(headline)headline.textContent='Deadline passed. No further application preparation is required.';
      if(small)small.textContent='Keep this record for reference or remove it from your tracker.';
    }

    const stageBox=card.querySelector('.focusStage');
    if(stageBox){
      const title=stageBox.querySelector('b'),sub=stageBox.querySelector('span'),select=stageBox.querySelector('select');
      if(title)title.textContent='Closed';
      if(sub)sub.textContent='Provider deadline passed';
      if(select){select.disabled=true;select.title='This opportunity is closed because the provider deadline has passed.'}
    }

    card.querySelectorAll('.focusTask input').forEach(input=>{input.disabled=true;input.setAttribute('aria-disabled','true')});
    const status=card.querySelector('.exactPackStatusV133,.exactPackStatusV132');
    if(status)status.innerHTML='<b>Application closed:</b> Provider deadline passed · preparation is no longer actionable.';

    // A tracked exact vacancy may already have reached "Ready to submit".
    // Keep historical tools available, but stop presenting them as live next actions.
    card.querySelectorAll('button,a').forEach(el=>{
      const txt=norm(el.textContent);
      if(txt.startsWith('record submission'))el.textContent='Record prior submission';
      if(txt.startsWith('view application pack'))el.textContent='View saved pack ↗';
    });
    const pctLeaves=[...card.querySelectorAll('*')].filter(el=>el.children.length===0&&/^\d+%$/.test(String(el.textContent||'').trim()));
    pctLeaves.forEach(el=>el.textContent='—');
    return true;
  }

  function decorate(){
    css();
    const tracker=document.getElementById('tracker');if(!tracker)return;
    const map=rowsByTitle(),queue=tracker.querySelector('.focusQueue');if(!queue)return;
    const expired=[];
    queue.querySelectorAll('.focusCard').forEach(card=>{
      const row=map.get(norm(card.querySelector('.focusTitle')?.textContent||''));
      if(row&&closeCard(card,row))expired.push(card);
    });
    expired.forEach(card=>queue.appendChild(card));

    const cards=[...queue.querySelectorAll('.focusCard')],active=cards.length-expired.length;
    const hero=tracker.querySelector('.focusSummaryHero');
    if(hero&&expired.length){
      const h=hero.querySelector('h2'),p=hero.querySelector('p');
      if(h)h.textContent=`${active} active ${active===1?'application':'applications'}, ranked by what needs attention next.`;
      if(p)p.textContent=`Deadline pressure, stage and unfinished preparation tasks determine the order. ${expired.length} closed ${expired.length===1?'record is':'records are'} kept below for reference.`;
    }
    const stats=[...tracker.querySelectorAll('.focusSummaryStat')];
    if(stats.length>=3){
      const activeCards=cards.filter(card=>!card.classList.contains('omExpiredTrackV224'));
      const ready=activeCards.reduce((n,card)=>{
        const row=map.get(norm(card.querySelector('.focusTitle')?.textContent||''));
        return n+(row&&['Ready to submit','Submitted','Interview','Offer received'].includes(String(row.t?.stage||''))?1:0);
      },0);
      const value=stats[2].querySelector('b'),label=stats[2].querySelector('span');
      if(value)value.textContent=String(ready);
      if(label)label.textContent='Ready / beyond';
    }

    try{window.OpportunityTrackerPrepSummary?.refresh?.()}catch{}

    document.documentElement.dataset.omExpiredTracker=VERSION;
  }

  let scheduled=false;
  function schedule(delay=80){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;decorate()},delay)}

  const previous=window.renderTracker;
  if(typeof previous==='function'&&!previous.__omExpiredV224){
    const wrapped=(...args)=>{const out=previous(...args);schedule(120);return out};wrapped.__omExpiredV224=true;
    try{renderTracker=wrapped}catch{}window.renderTracker=wrapped;
  }
  window.addEventListener('opportunity:statechange',()=>schedule(140));
  document.addEventListener('click',e=>{if(e.target.closest?.('.navbtn[data-v="tracker"],[data-v="tracker"],button[onclick*="setTrackerMode"]'))schedule(150)},true);
  schedule(100);
  window.OpportunityExpiredTracker={refresh:decorate,version:VERSION};
})();