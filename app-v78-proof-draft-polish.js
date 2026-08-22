(()=>{
  const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
  const flash=msg=>{document.querySelector('.proofFlowFlash')?.remove();const el=document.createElement('div');el.className='proofFlowFlash';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),1700)};
  const trimAt=(s,n=280)=>{s=norm(s);if(s.length<=n)return s;const cut=s.slice(0,n);return cut.slice(0,Math.max(cut.lastIndexOf(';'),cut.lastIndexOf(','),cut.lastIndexOf(' '))).replace(/[ ,;:-]+$/,'')+'.'};
  const sentenceCase=s=>s?String(s).charAt(0).toUpperCase()+String(s).slice(1):'';
  function genericCv(evidence){
    let s=norm(evidence),context='';
    let m=s.match(/^During\s+(.+?),\s*I\s+(.+)$/i);if(m){context=m[1];s=m[2]}
    else{m=s.match(/^At\s+(.+?),\s*I\s+(.+)$/i);if(m){context=`at ${m[1]}`;s=m[2]}}
    s=s.replace(/^I\s+/i,'').replace(/\bI\s+/g,'').replace(/\.\s+(?=[A-Z])/g,'; ');
    const parts=s.split(/;\s*/).filter(Boolean).slice(0,3);let out=sentenceCase(parts.join('; ')).replace(/[.]+$/,'');
    if(context&&/^at\s/i.test(context)&&!out.toLowerCase().includes(context.toLowerCase()))out+=` ${context}`;
    return trimAt(out+'.',260);
  }
  function buildCv(evidence,label){
    const e=norm(evidence);
    if(/business finance module/i.test(e)&&/profitability/i.test(e)&&/liquidity/i.test(e)&&/efficiency/i.test(e))return 'Analysed company financial information using profitability, liquidity and efficiency ratios; compared performance indicators, identified areas of strength and concern, and translated findings into a structured evaluation of financial position and business implications.';
    if(/\bRDX\b/i.test(e)&&/Amazon/i.test(e)&&/eBay/i.test(e)&&/Walmart/i.test(e))return 'Supported e-commerce operations across Amazon, eBay and Walmart, resolving listing and stock-synchronisation issues and using Linnworks to support inventory workflows and reporting.';
    return genericCv(e);
  }
  const capability=label=>{const l=String(label||'').toLowerCase();if(l.includes('finance'))return'interpret financial information and turn analysis into business-relevant conclusions';if(l.includes('private'))return'connect operational and market evidence to practical commercial decisions';if(l.includes('research'))return'analyse and synthesise evidence into clear findings';if(l.includes('strategy'))return'structure problems and translate analysis into practical recommendations';if(l.includes('policy'))return'connect evidence to wider development and policy questions';return'apply evidence and analysis to practical problems'};
  function buildMotivation(evidence,label){
    const e=norm(evidence);
    if(/business finance module/i.test(e)&&/profitability/i.test(e))return 'Through my Business Finance module at Teesside University, I analysed company financial information using profitability, liquidity and efficiency ratios, compared performance indicators and translated the findings into a structured evaluation of financial position and business implications. This strengthened my ability to interpret financial information and turn analysis into business-relevant conclusions, which I would bring to this role.';
    if(/\bRDX\b/i.test(e)&&/Amazon/i.test(e)&&/eBay/i.test(e)&&/Walmart/i.test(e))return 'At RDX, I supported e-commerce operations across Amazon, eBay and Walmart, working with product listings, stock synchronisation and marketplace issues while using Linnworks for inventory workflows and reporting. This gave me practical insight into how operational decisions and digital marketplace processes affect commercial performance, which is relevant to private-sector development work.';
    const first=e.split(/(?<=[.!?])\s+/).slice(0,2).join(' ');return `${first.replace(/[.]+$/,'')}. This experience strengthened my ability to ${capability(label)}, which I would bring to this role.`;
  }
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('[data-proof-action]');if(!btn)return;
    const action=btn.dataset.proofAction;if(action!=='cv-scaffold'&&action!=='mot-scaffold')return;
    const req=btn.closest('[data-proof-req]');if(!req)return;
    const evidence=norm(req.querySelector('[data-proof-field="evidence"]')?.value);if(evidence.length<40){e.preventDefault();e.stopImmediatePropagation();flash('Add a real evidence example first.');req.querySelector('[data-proof-field="evidence"]')?.focus();return}
    e.preventDefault();e.stopImmediatePropagation();
    const label=req.dataset.proofLabel||'';
    const field=req.querySelector(`[data-proof-field="${action==='cv-scaffold'?'cvBullet':'motivation'}"]`);if(!field)return;
    field.value=action==='cv-scaffold'?buildCv(evidence,label):buildMotivation(evidence,label);
    field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();
    flash(action==='cv-scaffold'?'CV draft tightened from your evidence ✓':'Motivation draft tightened from your evidence ✓');
  },true);
})();