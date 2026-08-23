(()=>{
  const canon=u=>{try{const x=new URL(String(u||''),location.origin);x.hash='';x.search='';return x.href.replace(/\/$/,'')}catch{return String(u||'').trim().replace(/[?#].*$/,'').replace(/\/$/,'')}};
  const escHtml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const strip=v=>String(v||'').replace(/\[([^\]]+)\]\(mailto:[^)]+\)/gi,'$1').replace(/\*\*/g,'').replace(/^#{1,6}\s*/gm,'').replace(/\r/g,'').trim();
  const slug=v=>String(v||'document').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,72)||'document';
  function rowFromShell(){
    const shell=document.getElementById('prepShell');
    if(!shell||typeof tracks!=='object'||!tracks)return null;
    const stored=shell.dataset?.exactTrackId;
    if(stored&&tracks[stored]?.exactVacancy)return{id:stored,t:tracks[stored],m:tracks[stored].exactVacancy};
    const href=shell.querySelector('a.prepBtn.official')?.href;
    if(href){const target=canon(href),entry=Object.entries(tracks).find(([,t])=>canon(t?.exactVacancy?.url)===target);if(entry)return{id:entry[0],t:entry[1],m:entry[1].exactVacancy}}
    return null;
  }
  function state(row){const p=row.t.preparation||{},role=p.rolePack||{},f=role.finalApplication||{};return{cv:strip(f.cvFinalDraft||f.cvSourceText||''),cover:strip(role.coverLetterCandidate||role.motivationDraftText||'')}}
  function toast(msg){document.querySelector('.exportGuardToast')?.remove();const el=document.createElement('div');el.className='exportGuardToast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2200)}
  function downloadDoc(name,html){const blob=new Blob(['\ufeff',html],{type:'application/msword;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800)}
  function css(){return `@page WordSection1{size:595.3pt 841.9pt;margin:32pt 40pt 34pt 40pt}body{font-family:Aptos,Arial,sans-serif;color:#171b24;font-size:9.8pt;line-height:1.24;margin:0}div.WordSection1{page:WordSection1}.name{font-size:18.5pt;font-weight:800;margin:0;color:#111827;line-height:1.05}.tagline{font-size:8.6pt;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#384152;margin:3pt 0 0}.contact{font-size:8.4pt;color:#566070;margin:5pt 0 10pt}.section{font-size:9.1pt;font-weight:800;letter-spacing:.075em;text-transform:uppercase;color:#202736;border-bottom:.75pt solid #c9ced8;padding-bottom:2.5pt;margin:9pt 0 4.5pt;page-break-after:avoid}.role{font-size:9.8pt;font-weight:800;margin:5.5pt 0 1pt;page-break-after:avoid}.meta{font-size:8.3pt;color:#667080;margin:0 0 3pt;page-break-after:avoid}.bullet{font-size:9.35pt;line-height:1.22;margin:1.4pt 0 1.4pt 12pt;text-indent:-8pt;page-break-inside:avoid}.para{font-size:9.45pt;line-height:1.24;margin:0 0 4.5pt}.compactLine{font-size:9.1pt;line-height:1.24;margin:0 0 4.5pt;color:#252b35}.coverDate{text-align:right;color:#687283;font-size:9pt;margin-bottom:16pt}.signature{margin-top:13pt}.note{font-size:8pt;color:#7a8492;margin-top:14pt}`}
  function doc(title,body){return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${css()}</style></head><body><div class="WordSection1">${body}</div></body></html>`}
  function cvBody(text){
    const lines=strip(text).split('\n').map(x=>x.trim()).filter(Boolean);let html='',seen=false,current='';
    const headings=/^(professional profile|profile|core strengths|core skills|skills|professional experience|experience|education|certifications?|projects?|technical skills|additional information|languages?)$/i;
    for(let i=0;i<lines.length;i++){
      const original=lines[i],bullet=/^[*•\-]\s+/.test(original),line=original.replace(/^[*•\-]\s*/,'').trim();
      if(!seen){html+=`<h1 class="name">${escHtml(line)}</h1>`;seen=true;continue}
      if(i===1&&/\|/.test(line)){html+=`<div class="tagline">${escHtml(line)}</div>`;continue}
      if(i<=3&&(/@/.test(line)||/\+\d/.test(line)||/United Kingdom|Pakistan|London|Middlesbrough/i.test(line))){html+=`<div class="contact">${escHtml(line)}</div>`;continue}
      if(headings.test(line)||(/^[A-Z][A-Z &/\-]{4,}$/.test(line)&&line.length<55)){current=line.toLowerCase();html+=`<div class="section">${escHtml(line)}</div>`;continue}
      if(bullet){html+=`<div class="bullet">• ${escHtml(line)}</div>`;continue}
      if(/^(core strengths|core skills|skills|technical skills)$/.test(current)&&(/[|•]/.test(line)||line.length>85)){html+=`<div class="compactLine">${escHtml(line.replace(/\s*[|•]\s*/g,' · ').replace(/\s{2,}/g,' '))}</div>`;continue}
      if(/\b(19|20)\d{2}\b/.test(line)&&(/–|-|to/.test(line))&&line.length<100){html+=`<div class="meta">${escHtml(line)}</div>`;continue}
      if(i>2&&line.length<78&&!/[.!?]$/.test(line)){html+=`<div class="role">${escHtml(line)}</div>`;continue}
      html+=`<p class="para">${escHtml(line)}</p>`;
    }
    return html||'<p class="para">No CV content available.</p>';
  }
  function coverBody(text,row){const paras=strip(text).split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean),today=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'long',year:'numeric'}).format(new Date());return `<div class="coverDate">${escHtml(today)}</div>${paras.map(p=>/^Yours /i.test(p)?`<p class="signature">${escHtml(p).replace(/\n/g,'<br>')}</p>`:`<p class="para">${escHtml(p).replace(/\n/g,'<br>')}</p>`).join('')}<div class="note">Prepared for: ${escHtml(row.m?.title||'the selected opportunity')} · Review all details against the official vacancy before submission.</div>`}
  function relabel(){document.querySelectorAll('.submissionStudio .submissionBtn').forEach(btn=>{const t=btn.textContent.trim();if(/^Download CV text$/i.test(t))btn.textContent='Download CV (.doc)';if(/^Download cover letter$/i.test(t))btn.textContent='Download cover (.doc)';if(/^Print CV \+ cover$/i.test(t))btn.textContent='Preview / Save PDF'})}
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.submissionStudio .submissionBtn');if(!btn)return;
    const label=btn.textContent.trim();
    const isCv=/^Download CV(?: text| \(\.doc\))$/i.test(label),isCover=/^Download cover(?: letter| \(\.doc\))$/i.test(label);
    if(!isCv&&!isCover)return;
    const row=rowFromShell();if(!row)return;const s=state(row);
    e.preventDefault();e.stopImmediatePropagation();
    if(isCv){if(s.cv.length<200)return toast('The CV draft is too short to export yet.');downloadDoc(`${slug(row.m?.title)}-tailored-CV.doc`,doc('Tailored CV',cvBody(s.cv)));toast('Formatted Word CV downloaded — plain-text export blocked.');return}
    if(s.cover.length<180)return toast('The cover letter is too short to export yet.');downloadDoc(`${slug(row.m?.title)}-cover-letter.doc`,doc('Cover letter',coverBody(s.cover,row)));toast('Formatted Word cover letter downloaded.');
  },true);
  const style=document.createElement('style');style.textContent='.exportGuardToast{position:fixed;right:18px;bottom:18px;z-index:100001;background:#111827;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;font-size:8px;font-weight:800;box-shadow:0 14px 34px rgba(0,0,0,.3)}';document.head.appendChild(style);
  new MutationObserver(()=>queueMicrotask(relabel)).observe(document.body,{subtree:true,childList:true,characterData:true});
  setInterval(relabel,350);setTimeout(relabel,0);setTimeout(relabel,250);
})();