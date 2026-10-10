(()=>{
  const STORAGE_KEY='oppEvidenceV42';
  let answers={};
  try{answers=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch{answers={}}
  const norm=v=>String(v||'').toLowerCase();
  const esc2=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const css=document.createElement('style');
  css.textContent=`
    .adaptiveEvidence{margin-top:14px;border:1px solid rgba(116,88,255,.14);border-radius:16px;background:linear-gradient(145deg,#fbfaff,#fff);padding:15px}
    .adaptiveEvidenceHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:12px}.adaptiveEvidenceHead h3{margin:4px 0 4px;font-size:16px;letter-spacing:-.025em}.adaptiveEvidenceHead p{margin:0;color:#7f8794;font-size:9px;line-height:1.5;max-width:600px}.evidenceCount{white-space:nowrap;border:1px solid #e5e1ff;background:#f7f5ff;color:#6952e8;border-radius:999px;padding:6px 9px;font-size:8px;text-transform:uppercase;letter-spacing:.08em}
    .evidenceQuestion{border:1px solid #e7e9ef;border-radius:13px;background:#fff;padding:12px;margin-top:8px}.evidenceQuestionTop{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}.evidenceQuestion b{display:block;color:#1d222b;font-size:10px}.evidenceQuestion small{display:block;color:#8b929e;font-size:8px;line-height:1.45;margin-top:4px}.evidenceSource{font-size:8px;color:#7458ff;text-decoration:none}.evidenceChoices{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}.evidenceChoices button{height:30px;border-radius:9px;border:1px solid #e2e5eb;background:#f9fafb;color:#555e6c;padding:0 11px;font-size:8px;font-weight:760;cursor:pointer}.evidenceChoices button.active{border-color:#191e28;background:#191e28;color:#fff}.evidenceChoices button.yes.active{border-color:#d8ff69;background:#d8ff69;color:#151912}.evidenceChoices button.no.active{border-color:#ffd8dc;background:#fff0f1;color:#a33844}.evidenceImpact{margin-top:9px;border-top:1px solid #eef0f4;padding-top:8px;color:#838a96;font-size:8px}.evidenceEmpty{padding:12px;border:1px dashed #e4e6ec;border-radius:12px;color:#8c939f;font-size:9px;line-height:1.5}.evidenceLocal{margin-top:10px;color:#9aa0aa;font-size:8px}
    @media(max-width:700px){.adaptiveEvidenceHead{display:grid}.evidenceCount{width:max-content}}
  `;
  document.head.appendChild(css);

  const keyFor=(oppId,check)=>`${oppId}|${check?.rule_code||check?.label||'rule'}`;
  function configFor(check){
    const t=norm(`${check?.rule_code||''} ${check?.label||''} ${check?.detail||''} ${check?.source_note||''}`);
    if(check?.status!=='review'||check?.hard===false)return null;
    if(/country eligibility|field of study|vacancy-specific|course-specific|programme-specific|program-specific|current cycle|cycle-specific/.test(t))return null;
    if(/family|relative|close-relative/.test(t))return{question:'Do you have a family or relative connection that falls inside this provider restriction?',pass:'no',noStatus:'pass',yesStatus:'fail',kind:'Applicant declaration'};
    if(/prior internship|prior-service|prior traineeship|previous wipo internship|previous cern participation|prior radcliffe|recent residential fellowship|previous commonwealth fellowship|previous .* scholarship|first job at|prior org/.test(t))return{question:'Have you previously participated in, worked for, or held the provider status that this rule excludes?',pass:'no',noStatus:'pass',yesStatus:'fail',kind:'Participation history'};
    if(/unable to afford|financial need|financial and home-country study need|significant financial need/.test(t))return{question:'Would you be unable to pursue this study route without the scholarship or meaningful financial support?',pass:'yes',yesStatus:'pass',noStatus:'fail',kind:'Financial evidence'};
    if(/no concurrent scholarship|another scholarship|another .* award|concurrent .* award/.test(t))return{question:'Will you hold another scholarship or grant at the same time where this rule prohibits it?',pass:'no',noStatus:'pass',yesStatus:'fail',kind:'Funding declaration'};
    if(/not already registered|already enrolled|current .* enrolment|current oxford student|degree-seeking exclusion|no completed master|not graduate student/.test(t))return{question:'Are you currently in the study/enrolment status that this rule excludes?',pass:'no',noStatus:'pass',yesStatus:'fail',kind:'Study history'};
    if(/nomination/.test(t))return{question:'Have you secured the nomination required for this opportunity?',pass:'yes',yesStatus:'pass',noStatus:'review',kind:'Application evidence'};
    if(/supervisor|supporting statement from a proposed .* supervisor/.test(t))return{question:'Have you secured the required academic supervisor or supporting letter?',pass:'yes',yesStatus:'pass',noStatus:'review',kind:'Application evidence'};
    if(/admission|offer required|graduate programme|master.s programme|course route/.test(t))return{question:'Have you already met or entered the required admission/application route for this opportunity?',pass:'yes',yesStatus:'pass',noStatus:'review',kind:'Application route'};
    if(/permanent residence in eligible country|permanently resident/.test(t))return{question:'Are you permanently resident in one of the eligible Commonwealth countries listed by the provider?',pass:'yes',yesStatus:'pass',noStatus:'fail',kind:'Permanent-residence declaration'};
    if(/visa|immigration status|residence eligibility|j-1/.test(t))return{question:'Do you currently meet the stated visa or immigration eligibility condition?',pass:'yes',yesStatus:'pass',noStatus:'fail',kind:'Immigration evidence'};
    if(/return home|return to .* country|home-country contribution|return to journalism|intend to return|living and working in home country/.test(t))return{question:'Can you make the return/home-country commitment required by this programme?',pass:'yes',yesStatus:'pass',noStatus:'fail',kind:'Commitment'};
    if(/military/.test(t))return{question:'Are you currently serving in the military where this programme restricts it?',pass:'no',noStatus:'pass',yesStatus:'fail',kind:'Applicant declaration'};
    if(/u\.s\. citizen|us citizen|permanent resident/.test(t))return{question:'Do you hold the U.S. citizenship/permanent-residence status excluded by this rule?',pass:'no',noStatus:'pass',yesStatus:'fail',kind:'Status declaration'};
    if(/full-time availability|available full-time|minimum internship availability/.test(t))return{question:'Can you meet the full-time or minimum availability stated by the provider?',pass:'yes',yesStatus:'pass',noStatus:'fail',kind:'Availability'};
    if(/ms office|computer systems|office-related software/.test(t))return{question:'Do you have the computer/office-software proficiency required by this programme?',pass:'yes',yesStatus:'pass',noStatus:'fail',kind:'Skills evidence'};
    if(/good academic standing/.test(t))return{question:'Are you in good academic standing and able to meet the concurrent-work restrictions stated here?',pass:'yes',yesStatus:'pass',noStatus:'fail',kind:'Academic declaration'};
    if(/minimum first-degree standard|first-degree standard|academic classification|degree classification|equivalency review|equivalent classification/.test(t))return{question:'Have you confirmed from the official scholarship guidance that your first degree meets the required academic classification or an accepted equivalent?',pass:'yes',yesStatus:'pass',noStatus:'review',kind:'Academic equivalency'};
    return null;
  }

  function applyEvidence(base,o){
    if(!o?.Opportunity_ID)return base;
    let changed=false;
    const checks=(base.checks||[]).map(c=>{
      const cfg=configFor(c);if(!cfg)return c;
      const ans=answers[keyFor(o.Opportunity_ID,c)];if(!ans||ans==='unknown')return c;
      const status=ans==='yes'?(cfg.yesStatus||'review'):(cfg.noStatus||'review');
      if(status===c.status)return c;changed=true;
      const detail=status==='pass'?`Your saved opportunity-specific answer resolves this check for matching. ${c.detail||''}`:status==='fail'?`Your saved opportunity-specific answer conflicts with this hard eligibility condition. ${c.detail||''}`:`Your answer is saved, but this still needs provider/application evidence. ${c.detail||''}`;
      return{...c,status,detail,evidenceAnswer:ans,evidenceResolved:true};
    });
    if(!changed)return base;
    const fails=checks.filter(c=>c.status==='fail'&&c.hard!==false).length;
    const reviews=checks.filter(c=>c.status==='review').length;
    const passes=checks.filter(c=>c.status==='pass').length;
    const hardReviews=checks.filter(c=>c.status==='review'&&c.hard!==false).length;
    let label='Needs review',cls='review',rank=1;
    if(fails){label='Not eligible';cls='ineligible';rank=0}
    else if(hardReviews){if(passes>=2){label='Possible match';cls='possible';rank=3}}
    else if(passes>=3){label=(base.relevance||0)>=1?'Strong match':'Likely eligible';cls='eligible';rank=4}
    else if(passes>=2){label='Possible match';cls='possible';rank=3}
    return{...base,checks,fails,reviews,passes,hardReviews,label,cls,rank,adaptiveEvidenceV42:true};
  }

  const priorEvaluate=evaluate;
  evaluate=function(o){return applyEvidence(priorEvaluate(o),o)};
  window.evaluate=evaluate;

  function questionMarkup(o,check){
    const cfg=configFor(check);if(!cfg)return'';
    const k=keyFor(o.Opportunity_ID,check),ans=answers[k]||'unknown';
    return `<div class="evidenceQuestion"><div class="evidenceQuestionTop"><div><b>${esc2(cfg.question)}</b><small>${esc2(check.detail||check.source_note||'This is an applicant-specific condition from the official rule set.')}</small></div>${check.source_url?`<a class="evidenceSource" target="_blank" rel="noopener" href="${esc2(check.source_url)}">source ↗</a>`:''}</div><div class="evidenceChoices"><button class="yes ${ans==='yes'?'active':''}" onclick="setEvidenceAnswer('${esc2(o.Opportunity_ID)}','${esc2(check.rule_code||check.label)}','yes')">Yes</button><button class="no ${ans==='no'?'active':''}" onclick="setEvidenceAnswer('${esc2(o.Opportunity_ID)}','${esc2(check.rule_code||check.label)}','no')">No</button><button class="${ans==='unknown'?'active':''}" onclick="setEvidenceAnswer('${esc2(o.Opportunity_ID)}','${esc2(check.rule_code||check.label)}','unknown')">Not sure</button></div><div class="evidenceImpact">${esc2(cfg.kind)} · answer is used only for this opportunity and this exact rule.</div></div>`;
  }
  function evidenceChecks(o){const ev=priorEvaluate(o);return (ev.checks||[]).filter(c=>configFor(c));}
  function mountEvidence(id){
    const o=opps.find(x=>x.Opportunity_ID===id),host=$('detailInner');if(!o||!host)return;
    host.querySelectorAll('.adaptiveEvidence').forEach(x=>x.remove());
    const checks=evidenceChecks(o);if(!checks.length)return;
    const section=document.createElement('section');section.className='adaptiveEvidence';
    section.innerHTML=`<div class="adaptiveEvidenceHead"><div><div class="eyebrow" style="color:#6c54ee">Opportunity-specific evidence</div><h3>Answer only what this route actually needs.</h3><p>These questions are generated from unresolved hard rules for this opportunity. They do not make provider-specific or cycle-specific assumptions.</p></div><span class="evidenceCount">${checks.length} question${checks.length===1?'':'s'}</span></div>${checks.map(c=>questionMarkup(o,c)).join('')}<div class="evidenceLocal">For this first release, these opportunity-specific answers are stored on this device. Your core Passport remains cloud-synced.</div>`;
    const left=host.querySelector('.detailColumns>div:first-child');if(left){const first=left.querySelector('.detailSection');if(first)first.insertAdjacentElement('afterend',section);else left.prepend(section)}else host.appendChild(section);
  }
  window.setEvidenceAnswer=function(oppId,ruleKey,value){
    answers[`${oppId}|${ruleKey}`]=value;localStorage.setItem(STORAGE_KEY,JSON.stringify(answers));
    try{renderAll()}catch{}
    try{openDetail(oppId)}catch{}
  };
  const previousOpenDetail=openDetail;
  openDetail=function(id){previousOpenDetail(id);mountEvidence(id)};
  window.openDetail=openDetail;

  window.OpportunityEvidence={answers,getQuestions:o=>evidenceChecks(o)};
  try{renderAll()}catch{}
})();
