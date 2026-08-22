(()=>{
  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const style=document.createElement('style');
  style.textContent=`
    .proofFlow{border:1px solid #dfe4ea;border-radius:14px;background:#fff;padding:13px;display:grid;gap:10px}.proofFlowHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.proofFlowEy{font-size:6.6px;text-transform:uppercase;letter-spacing:.12em;font-weight:950;color:#7658ef}.proofFlowHead h4{margin:3px 0 2px;font-size:11px;color:#1c2330}.proofFlowHead p{margin:0;font-size:7.2px;line-height:1.45;color:#818996;max-width:650px}.proofFlowScore{white-space:nowrap;border-radius:999px;padding:6px 8px;background:#171c26;color:#fff;font-size:6.8px;font-weight:900}.proofFlowNote{padding:8px 9px;border-radius:9px;background:#f7f9ed;border:1px solid #e6eccf;color:#59633e;font-size:6.9px;line-height:1.45}.proofReq{border:1px solid #e2e6eb;border-radius:12px;background:#fbfbfc;overflow:hidden}.proofReq summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px}.proofReq summary::-webkit-details-marker{display:none}.proofReqTitle b{display:block;font-size:8.6px;color:#222936}.proofReqTitle span{display:block;margin-top:2px;font-size:7px;line-height:1.4;color:#818996}.proofReqState{font-size:6.4px;font-weight:900;border-radius:999px;padding:5px 7px;background:#fff4d9;color:#8b681c;border:1px solid #f0dda7}.proofReqState.ready{background:#edf8e6;color:#48742f;border-color:#d5e9c8}.proofReqState.partial{background:#eef4ff;color:#4f61a9;border-color:#d7e0f6}.proofReqState.drafted{background:#eef0ff;color:#5f56bf;border-color:#d9d7f8}.proofReqBody{padding:0 11px 11px;display:grid;gap:9px}.proofStep{display:grid;gap:5px}.proofStepTop{display:flex;align-items:center;justify-content:space-between;gap:8px}.proofStepTop b{font-size:7.6px;color:#2a303b}.proofStepTop span{font-size:6.6px;color:#8b929d}.proofText{width:100%;box-sizing:border-box;min-height:78px;resize:vertical;border:1px solid #dde2e8;border-radius:9px;background:#fff;padding:8px 9px;font:inherit;font-size:8px;line-height:1.45;color:#252b36}.proofText:focus{outline:2px solid rgba(117,89,239,.12);border-color:#b9aae9}.proofActions{display:flex;gap:6px;flex-wrap:wrap}.proofBtn{border:1px solid #dfe3e8;border-radius:8px;background:#fff;color:#282f39;padding:7px 9px;font-size:6.8px;font-weight:900;cursor:pointer}.proofBtn.primary{background:#171c26;color:#fff;border-color:#171c26}.proofBtn:disabled{opacity:.45;cursor:not-allowed}.proofMini{font-size:6.6px;line-height:1.4;color:#8d949f}.proofDivider{height:1px;background:#e6e9ed}.proofFlowFlash{position:fixed;left:50%;bottom:42px;z-index:13020;transform:translateX(-50%);padding:10px 14px;border-radius:10px;background:#171c26;color:#fff;font-size:8px;font-weight:900;box-shadow:0 12px 32px rgba(0,0,0,.22)}@media(max-width:780px){.proofFlowHead{flex-direction:column}.proofReq summary{align-items:flex-start}.proofActions{display:grid;grid-template-columns:1fr}.proofBtn{width:100%}}
  `;
  document.head.appendChild(style);

  let saveTimer=null;
  function flash(msg){document.querySelector('.proofFlowFlash')?.remove();const el=document.createElement('div');el.className='proofFlowFlash';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),1700)}
  function rowFromShell(shell=document.getElementById('prepShell')){
    const href=shell?.querySelector('a.prepBtn.official')?.href;if(!href||typeof tracks!=='object'||!tracks)return null;
    const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);
    return entry?{id:entry[0],t:entry[1],m:entry[1].exactVacancy}:null;
  }
  function packOf(row){
    row.t.preparation=row.t.preparation||{};
    const pack=row.t.preparation.rolePack||(row.t.preparation.rolePack={cvNotes:'',evidenceBank:'',motivationDraftText:'',gapsQuestions:'',requirementEvidence:{}});
    pack.cvNotes=String(pack.cvNotes||'');pack.evidenceBank=String(pack.evidenceBank||'');pack.motivationDraftText=String(pack.motivationDraftText||'');pack.gapsQuestions=String(pack.gapsQuestions||'');
    pack.requirementEvidence=pack.requirementEvidence||{};
    return pack;
  }
  function targetsFromIntel(shell){
    return [...shell.querySelectorAll('.appIntelTarget')].map(card=>{
      const btn=card.querySelector('[data-intel-add]'),id=btn?.dataset?.intelAdd,label=card.querySelector('b')?.textContent?.trim(),need=card.querySelector('div span')?.textContent?.trim();
      return id&&label?{id,label,need:need||''}:null;
    }).filter(Boolean);
  }
  const meaningful=v=>String(v||'').trim().replace(/^\[[^\]]+\]\s*/,'').length>=40;
  const drafted=v=>String(v||'').trim().length>=45;
  function stateFor(item){
    const ev=meaningful(item?.evidence),cv=drafted(item?.cvBullet),mot=drafted(item?.motivation);
    if(ev&&cv&&mot)return['Drafted','drafted'];
    if(ev&&cv)return['CV draft ready','partial'];
    if(ev&&mot)return['Motivation draft ready','partial'];
    if(ev)return['Evidence ready','ready'];
    return['Needs evidence',''];
  }
  function persistRow(row){
    row.t.preparation.updatedAt=new Date().toISOString();
    clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{if(typeof persist==='function')persist()}catch{};try{window.OpportunityExactTrackDurability?.save?.()}catch{};try{window.dispatchEvent(new CustomEvent('opportunity:statechange'))}catch{}},160);
  }
  function appendToRoleField(shell,key,label,text){
    const field=shell.querySelector(`[data-role-pack="${key}"]`);if(!field)return false;
    const block=`${label}:\n${String(text||'').trim()}`.trim(),current=String(field.value||'').trim();if(!block)return false;
    if(!current.includes(block))field.value=[current,block].filter(Boolean).join('\n\n');field.dispatchEvent(new Event('input',{bubbles:true}));return true;
  }
  const cap=s=>s?String(s).charAt(0).toUpperCase()+String(s).slice(1):'';
  function splitEvidence(evidence){
    let raw=String(evidence||'').trim().replace(/\s+/g,' '),context='';
    const m=raw.match(/^During\s+(.+?),\s*I\s+(.+)$/i);if(m){context=m[1].trim();raw=m[2].trim()}
    return{context,body:raw};
  }
  function evidenceToBullet(evidence){
    let {body}=splitEvidence(evidence);
    body=body.replace(/\bI\s+/gi,'').replace(/\bI['’]ve\s+/gi,'').replace(/\bI['’]d\s+/gi,'');
    body=body.replace(/compared the results to understand business performance/gi,'compared performance indicators')
      .replace(/turned the analysis into/gi,'translated findings into')
      .replace(/explaining the financial position and its business implications/gi,'of financial position and business implications');
    body=body.replace(/\.\s+(?=[A-Z])/g,'; ').replace(/\s*;\s*/g,'; ').replace(/[.]+$/,'').trim();
    return cap(body).replace(/\s+/g,' ').trim()+'.';
  }
  function scaffoldCv(label,evidence){return evidenceToBullet(evidence)}
  function scaffoldMotivation(label,evidence){
    const {context,body}=splitEvidence(evidence),clean=body.replace(/^I\s+/i,'').replace(/\s+/g,' ').replace(/[.]+$/,'');
    const capability={finance:'interpret financial information and turn analysis into business-relevant conclusions',private:'understand business and market problems and connect evidence to practical recommendations',research:'analyse and synthesise evidence into clear findings',strategy:'structure problems and translate analysis into practical recommendations',policy:'connect evidence to wider development and policy questions'};
    const key=String(label||'').toLowerCase().includes('finance')?'finance':String(label||'').toLowerCase().includes('private')?'private':String(label||'').toLowerCase().includes('research')?'research':String(label||'').toLowerCase().includes('strategy')?'strategy':String(label||'').toLowerCase().includes('policy')?'policy':'';
    const opening=context?`Through ${context}, I ${clean}.`:`I ${clean}.`;
    return `${opening} This experience strengthened my ability to ${capability[key]||'apply evidence and analysis to practical problems'}, which I would bring to this role.`;
  }
  function syncIntel(shell,row){
    const pack=packOf(row),items=pack.requirementEvidence||{};let linked=0,total=0;
    shell.querySelectorAll('.appIntelTarget').forEach(card=>{
      const id=card.querySelector('[data-intel-add]')?.dataset?.intelAdd,status=card.querySelector('.appIntelStatus');if(!id||!status)return;total++;
      const has=meaningful(items[id]?.evidence);if(has){linked++;status.textContent='Evidence linked';status.classList.add('covered');status.classList.remove('prompted')}
    });
    const score=shell.querySelector('.appIntelScore');if(score&&total)score.textContent=`Evidence linked ${linked}/${total}`;
  }
  function hydrateItems(section,items,targets){
    targets.forEach(t=>{
      const req=section.querySelector(`[data-proof-req="${t.id}"]`);if(!req)return;
      const current={...(items[t.id]||{})};
      ['evidence','cvBullet','motivation'].forEach(key=>{const el=req.querySelector(`[data-proof-field="${key}"]`);if(el)current[key]=String(el.value||'')});
      items[t.id]=current;
    });
  }
  function updateProgress(section,row){
    const pack=packOf(row),targets=targetsFromIntel(document.getElementById('prepShell')),items=pack.requirementEvidence||{};
    hydrateItems(section,items,targets);
    const mapped=targets.filter(t=>meaningful(items[t.id]?.evidence)).length,drafts=targets.filter(t=>drafted(items[t.id]?.cvBullet)&&drafted(items[t.id]?.motivation)).length;
    const score=section.querySelector('[data-proof-score]');if(score)score.textContent=`${mapped}/${targets.length} evidence mapped · ${drafts}/${targets.length} drafted`;
    targets.forEach(t=>{const req=section.querySelector(`[data-proof-req="${t.id}"]`),state=req?.querySelector('[data-proof-state]');if(!state)return;const [txt,cls]=stateFor(items[t.id]||{});state.textContent=txt;state.className=`proofReqState ${cls}`.trim()});
    syncIntel(document.getElementById('prepShell'),row);
  }
  function bind(section,row){
    const shell=document.getElementById('prepShell'),pack=packOf(row);
    section.querySelectorAll('[data-proof-field]').forEach(el=>el.addEventListener('input',()=>{
      const id=el.dataset.proofId,key=el.dataset.proofField;pack.requirementEvidence[id]={...(pack.requirementEvidence[id]||{}),[key]:String(el.value||''),updatedAt:new Date().toISOString()};persistRow(row);updateProgress(section,row)
    }));
    section.querySelectorAll('[data-proof-action]').forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.proofId,action=btn.dataset.proofAction,req=section.querySelector(`[data-proof-req="${id}"]`),e=req?.querySelector('[data-proof-field="evidence"]'),cv=req?.querySelector('[data-proof-field="cvBullet"]'),mot=req?.querySelector('[data-proof-field="motivation"]');
      const evidence=String(e?.value||'').trim();if(!meaningful(evidence)){flash('Add a real evidence example first.');e?.focus();return}
      pack.requirementEvidence[id]={...(pack.requirementEvidence[id]||{}),evidence,updatedAt:new Date().toISOString()};updateProgress(section,row);persistRow(row);
      if(action==='cv-scaffold'&&cv){cv.value=scaffoldCv(req.dataset.proofLabel,evidence);cv.dispatchEvent(new Event('input',{bubbles:true}));cv.focus();flash('CV draft shaped from your evidence ✓')}
      if(action==='mot-scaffold'&&mot){mot.value=scaffoldMotivation(req.dataset.proofLabel,evidence);mot.dispatchEvent(new Event('input',{bubbles:true}));mot.focus();flash('Motivation draft shaped from your evidence ✓')}
      if(action==='send-cv'&&cv){if(!drafted(cv.value)){flash('Write the CV bullet first.');cv.focus();return}appendToRoleField(shell,'cvNotes',req.dataset.proofLabel,cv.value);flash('Sent to CV tailoring notes ✓')}
      if(action==='send-mot'&&mot){if(!drafted(mot.value)){flash('Write the motivation proof first.');mot.focus();return}appendToRoleField(shell,'motivationDraftText',req.dataset.proofLabel,mot.value);flash('Sent to motivation draft ✓')}
    }));
  }
  function build(section,row,targets){
    const pack=packOf(row),items=pack.requirementEvidence||{};
    section.innerHTML=`<div class="proofFlowHead"><div><div class="proofFlowEy">Proof-to-draft workflow</div><h4>Turn each requirement into evidence, then into application language.</h4><p>Work one requirement at a time: prove it first, then shape that proof into a CV bullet and a motivation point.</p></div><span class="proofFlowScore" data-proof-score></span></div><div class="proofFlowNote">Draft helpers only reuse evidence you type here. They do not invent employers, responsibilities, achievements, numbers or outcomes.</div><div class="proofReqList">${targets.map((t,i)=>{const item=items[t.id]||{},[state,cls]=stateFor(item);return`<details class="proofReq" data-proof-req="${safe(t.id)}" data-proof-label="${safe(t.label)}" ${i===0?'open':''}><summary><div class="proofReqTitle"><b>${safe(t.label)}</b><span>${safe(t.need)}</span></div><span class="proofReqState ${cls}" data-proof-state>${safe(state)}</span></summary><div class="proofReqBody"><div class="proofStep"><div class="proofStepTop"><b>1. Your evidence</b><span>Context → action → method/tool → result</span></div><textarea class="proofText" data-proof-id="${safe(t.id)}" data-proof-field="evidence" placeholder="Write one real example you can substantiate. What was the situation or project? What did you personally do? What method/tool did you use? What changed or resulted?">${safe(item.evidence||'')}</textarea><div class="proofMini">Aim for one specific example. If you cannot prove a result, describe the output or responsibility without inventing a metric.</div></div><div class="proofDivider"></div><div class="proofStep"><div class="proofStepTop"><b>2. CV bullet</b><span>Action + work + method + proven result</span></div><textarea class="proofText" data-proof-id="${safe(t.id)}" data-proof-field="cvBullet" placeholder="Write the CV bullet here…">${safe(item.cvBullet||'')}</textarea><div class="proofActions"><button type="button" class="proofBtn" data-proof-id="${safe(t.id)}" data-proof-action="cv-scaffold">Build CV draft</button><button type="button" class="proofBtn primary" data-proof-id="${safe(t.id)}" data-proof-action="send-cv">Send to CV notes</button></div></div><div class="proofDivider"></div><div class="proofStep"><div class="proofStepTop"><b>3. Motivation proof</b><span>Requirement + evidence + relevance</span></div><textarea class="proofText" data-proof-id="${safe(t.id)}" data-proof-field="motivation" placeholder="Turn the same evidence into one motivation/cover point…">${safe(item.motivation||'')}</textarea><div class="proofActions"><button type="button" class="proofBtn" data-proof-id="${safe(t.id)}" data-proof-action="mot-scaffold">Build motivation draft</button><button type="button" class="proofBtn primary" data-proof-id="${safe(t.id)}" data-proof-action="send-mot">Send to motivation draft</button></div></div></div></details>`}).join('')}</div>`;
    bind(section,row);updateProgress(section,row)
  }
  function mount(){
    const modal=document.getElementById('prepModal'),shell=document.getElementById('prepShell');if(!modal||modal.classList.contains('hide')||!shell)return;
    const row=rowFromShell(shell),pack=shell.querySelector('.rolePack'),intel=pack?.querySelector('.appIntel');if(!row||!pack||!intel)return;
    const targets=targetsFromIntel(shell);if(!targets.length)return;
    let section=pack.querySelector('.proofFlow');if(!section){section=document.createElement('section');section.className='proofFlow';const grid=pack.querySelector('.rolePackGrid');pack.insertBefore(section,grid||null)}
    const sig=JSON.stringify({row:row.id,targets:targets.map(t=>[t.id,t.label,t.need])});if(section.dataset.sig!==sig){section.dataset.sig=sig;build(section,row,targets)}else updateProgress(section,row)
  }
  const obs=new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.classList?.contains('appIntel')||n.querySelector?.('.appIntel')))))setTimeout(mount,60)});obs.observe(document.body,{subtree:true,childList:true});
  document.addEventListener('input',e=>{if(e.target?.matches?.('#prepShell [data-role-pack],#prepShell [data-proof-field]'))setTimeout(mount,80)},true);
  window.addEventListener('opportunity:verifiedfeedchange',()=>setTimeout(mount,120));setTimeout(mount,700);setInterval(mount,1800);window.OpportunityProofToDraft={refresh:mount};
})();