(()=>{
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const escHtml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const strip=v=>String(v||'').replace(/\[([^\]]+)\]\(mailto:[^)]+\)/gi,'$1').replace(/\*\*/g,'').replace(/^#{1,6}\s*/gm,'').replace(/\r/g,'').trim();
  const slug=v=>String(v||'document').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,72)||'document';
  function rowFromShell(shell=document.getElementById('prepShell')){
    if(!shell||typeof tracks!=='object'||!tracks)return null;
    const stored=shell.dataset?.exactTrackId;if(stored&&tracks[stored]?.exactVacancy)return{id:stored,t:tracks[stored],m:tracks[stored].exactVacancy};
    const href=shell.querySelector('a.prepBtn.official')?.href;if(href){const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);if(entry)return{id:entry[0],t:entry[1],m:entry[1].exactVacancy}}
    return null;
  }
  function state(row){const p=row.t.preparation||{},role=p.rolePack||{},f=role.finalApplication||{};return{p,role,f,cv:strip(f.cvFinalDraft||f.cvSourceText||''),cover:strip(role.coverLetterCandidate||role.motivationDraftText||'')}}
  function blobDownload(name,html){const blob=new Blob(['\ufeff',html],{type:'application/msword;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
  function toast(msg){document.querySelector('.polishedExportToast')?.remove();const t=document.createElement('div');t.className='polishedExportToast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2300)}
  function baseCss(){return `@page WordSection1{size:595.3pt 841.9pt;margin:32pt 40pt 34pt 40pt}body{font-family:Aptos,Arial,sans-serif;color:#171b24;font-size:9.8pt;line-height:1.24;margin:0;mso-line-height-rule:at-least}div.WordSection1{page:WordSection1}.name{font-size:18.5pt;font-weight:800;letter-spacing:.01em;margin:0;color:#111827;line-height:1.05}.tagline{font-size:8.6pt;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#384152;margin:3pt 0 0}.contact{font-size:8.4pt;color:#566070;margin:5pt 0 10pt}.section{font-size:9.1pt;font-weight:800;letter-spacing:.075em;text-transform:uppercase;color:#202736;border-bottom:.75pt solid #c9ced8;padding-bottom:2.5pt;margin:9pt 0 4.5pt;page-break-after:avoid}.role{font-size:9.8pt;font-weight:800;margin:5.5pt 0 1pt;page-break-after:avoid}.meta{font-size:8.3pt;color:#667080;margin:0 0 3pt;page-break-after:avoid}.bullet{font-size:9.35pt;line-height:1.22;margin:1.4pt 0 1.4pt 12pt;text-indent:-8pt;page-break-inside:avoid}.para{font-size:9.45pt;line-height:1.24;margin:0 0 4.5pt}.compactLine{font-size:9.1pt;line-height:1.24;margin:0 0 4.5pt;color:#252b35}.coverDate{text-align:right;color:#687283;font-size:9pt;margin-bottom:16pt}.letterTitle{font-size:10.5pt;font-weight:800;margin:0 0 12pt}.signature{margin-top:13pt}.note{font-size:8pt;color:#7a8492;margin-top:14pt}.pageBreak{page-break-before:always}`}
  function wordDoc(title,body){return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${baseCss()}</style></head><body><div class="WordSection1">${body}</div></body></html>`}
  function cvBody(text){
    const lines=strip(text).split('\n').map(x=>x.trim()).filter(Boolean);if(!lines.length)return '<p class="para">No CV content available.</p>';
    let html='',seenName=false,currentSection='';
    const headings=/^(professional profile|profile|core strengths|core skills|skills|professional experience|experience|education|certifications?|projects?|technical skills|additional information|languages?)$/i;
    const isBullet=x=>/^[*•\-]\s+/.test(x);
    for(let i=0;i<lines.length;i++){
      const original=lines[i];
      let line=original.replace(/^[*•\-]\s*/,'').trim();
      if(!seenName){html+=`<h1 class="name">${escHtml(line)}</h1>`;seenName=true;continue}
      if(i===1&&/\|/.test(line)){html+=`<div class="tagline">${escHtml(line)}</div>`;continue}
      if(i<=3&&(/@/.test(line)||/\+\d/.test(line)||/United Kingdom|Pakistan|London|Middlesbrough/i.test(line))){html+=`<div class="contact">${escHtml(line)}</div>`;continue}
      if(headings.test(line)||(/^[A-Z][A-Z &/\-]{4,}$/.test(line)&&line.length<55)){currentSection=line.toLowerCase();html+=`<div class="section">${escHtml(line)}</div>`;continue}
      if(isBullet(original)){html+=`<div class="bullet">• ${escHtml(line)}</div>`;continue}
      if(/^(core strengths|core skills|skills|technical skills)$/.test(currentSection)&&(/[|•]/.test(line)||line.length>85)){const compact=line.replace(/\s*[|•]\s*/g,' · ').replace(/\s{2,}/g,' ');html+=`<div class="compactLine">${escHtml(compact)}</div>`;continue}
      if(/\b(19|20)\d{2}\b/.test(line)&&(/–|-|to/.test(line))&&line.length<100){html+=`<div class="meta">${escHtml(line)}</div>`;continue}
      if(i>2&&line.length<78&&!/[.!?]$/.test(line)){html+=`<div class="role">${escHtml(line)}</div>`;continue}
      html+=`<p class="para">${escHtml(line)}</p>`;
    }
    return html;
  }
  function coverBody(text,row){const paras=strip(text).split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);const today=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'long',year:'numeric'}).format(new Date());return `<div class="coverDate">${escHtml(today)}</div>${paras.map((p,i)=>{const x=escHtml(p).replace(/\n/g,'<br>');if(i===0&&/^Dear /i.test(p))return `<p class="para">${x}</p>`;if(/^Yours /i.test(p))return `<p class="signature">${x}</p>`;return `<p class="para">${x}</p>`}).join('')}<div class="note">Prepared for: ${escHtml(row.m?.title||'the selected opportunity')} · Review all details against the official vacancy before submission.</div>`}
  function preview(row,s){const w=window.open('','_blank');if(!w){toast('Pop-up blocked. Allow pop-ups to open the polished preview.');return}const body=`<div class="toolbar"><button onclick="window.print()">Print / Save PDF</button><span>CV + cover preview only — attach the original writing sample separately if required.</span></div><section class="sheet">${coverBody(s.cover,row)}</section><section class="sheet pageBreak">${cvBody(s.cv)}</section>`;w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(row.m?.title||'Application documents')}</title><style>${baseCss()}body{background:#edf0f5;padding:28px}.sheet{box-sizing:border-box;width:210mm;min-height:297mm;margin:0 auto 22px;background:#fff;padding:13mm 15mm;box-shadow:0 12px 35px rgba(0,0,0,.14)}.toolbar{position:sticky;top:0;z-index:2;max-width:210mm;margin:0 auto 18px;display:flex;justify-content:space-between;gap:14px;align-items:center;background:#111827;color:#fff;padding:10px 12px;border-radius:10px;font:12px Aptos,Arial,sans-serif}.toolbar button{border:0;border-radius:7px;background:#d8ff69;color:#111827;padding:8px 12px;font-weight:800;cursor:pointer}@media print{body{background:#fff;padding:0}.toolbar{display:none}.sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.pageBreak{page-break-before:always}}</style></head><body>${body}</body></html>`);w.document.close()}
  function relabel(){document.querySelectorAll('.submissionStudio .submissionBtn').forEach(btn=>{const t=btn.textContent.trim();if(/^Download CV text$/i.test(t))btn.textContent='Download CV (.doc)';else if(/^Download cover letter$/i.test(t))btn.textContent='Download cover (.doc)';else if(/^Print CV \+ cover$/i.test(t))btn.textContent='Preview / Save PDF'})}
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.submissionStudio .submissionBtn');if(!btn)return;const text=btn.textContent.trim(),row=rowFromShell();if(!row)return;const s=state(row);
    if(/^Download CV \(\.doc\)$/i.test(text)){e.preventDefault();e.stopImmediatePropagation();if(s.cv.length<200)return toast('The CV draft is too short to export yet.');blobDownload(`${slug(row.m?.title)}-tailored-CV.doc`,wordDoc('Tailored CV',cvBody(s.cv)));toast('Compact ATS-ready Word CV downloaded.');return}
    if(/^Download cover \(\.doc\)$/i.test(text)){e.preventDefault();e.stopImmediatePropagation();if(s.cover.length<180)return toast('The cover letter is too short to export yet.');blobDownload(`${slug(row.m?.title)}-cover-letter.doc`,wordDoc('Cover letter',coverBody(s.cover,row)));toast('Polished Word-compatible cover letter downloaded.');return}
    if(/^Preview \/ Save PDF$/i.test(text)){e.preventDefault();e.stopImmediatePropagation();preview(row,s);return}
  },true);
  const style=document.createElement('style');style.textContent='.polishedExportToast{position:fixed;right:18px;bottom:18px;z-index:100000;background:#111827;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;font-size:8px;font-weight:800;box-shadow:0 14px 34px rgba(0,0,0,.3)}';document.head.appendChild(style);
  const mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(relabel,80)});mo.observe(document.body,{subtree:true,childList:true});setInterval(relabel,1200);setTimeout(relabel,500);
  window.OpportunityPolishedExports={refresh:relabel};
})();