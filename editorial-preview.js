'use strict';
/* Static, factual guide index from OppMatcher's currently published blog.
   No scraping of private sources, no user data or writes. */
const EditorialPreviewModel=(()=>{
  const items=[
    {slug:'fully-funded-scholarships-international-students',topic:'scholarships',
      category:'Scholarships',title:'How to find fully funded scholarships for international students',
      summary:'Learn what fully funded can include, where to search, how to compare awards and which rules to verify before applying.',
      glyph:'✦',number:'01',published:'15 October 2026',
      intro:'A funding label is only a starting point. Understand what an award actually covers, whether you fit its rules, and whether the application route is still current.',
      headings:[
        ['Check what fully funded includes','Compare tuition, living costs, travel, insurance and other study expenses. Award packages differ even when they share the same funding label.'],
        ['Start with the official provider','Search the university, scholarship body, government programme or foundation that owns the application. Use copied lists as discovery leads, not conclusive evidence.'],
        ['Read the current eligibility requirements','Check nationality, residence, education, subject, language and other hard rules against the provider before preparing lengthy documents.'],
        ['Look for this year’s application call','An older cycle may remain online. Confirm that an advertised deadline and application path are for the intended intake.']
      ]},
    {slug:'scholarship-eligibility-checklist',topic:'eligibility',
      category:'Eligibility',title:'Scholarship eligibility checklist before you apply',
      summary:'Check nationality, residence, degree timing, grades, field of study, experience, language and admission routes in a practical order.',
      glyph:'◎',number:'02',published:'15 October 2026',
      intro:'Eligibility is rarely decided by one detail alone. Read the official conditions in a clear order before committing time to an application.',
      headings:[
        ['Nationality and residence','Check citizenship, permanent residence and any special country routes as separate requirements. Living somewhere does not necessarily create eligibility.'],
        ['Degree level and graduation timing','Compare your current academic stage and award date with the specified applicant category and graduation window.'],
        ['Grades, field and professional experience','Where a provider imposes academic, subject or work-experience requirements, use precise evidence instead of assumed equivalence.'],
        ['Language, route and deadline','Check tests, course admission, nominations, programme commitments and the active application cycle at the original source.']
      ]},
    {slug:'scholarship-application-documents',topic:'applications',
      category:'Applications',title:'Scholarship application documents and when to prepare them',
      summary:'Prepare a reliable evidence pack covering transcripts, degree certificates, CVs, statements, references and programme-specific forms.',
      glyph:'▦',number:'03',published:'15 October 2026',
      intro:'Documents matter after the programme route makes sense. Prepare the evidence the provider actually requests, not a generic package copied from another scholarship.',
      headings:[
        ['Identity and academic evidence','Confirm whether the provider wants a passport, academic transcript, degree certificate or a specific equivalent.'],
        ['CV and motivation materials','Tailor your CV, statement and essays to the opportunity while respecting length and formatting instructions.'],
        ['References and language evidence','Allow enough time for referees and identify which language tests, waivers or translations the provider accepts.'],
        ['Keep files organized','Use clear names and versions. Check all programme-specific forms, format limits and uploads before submitting.']
      ]},
    {slug:'international-internships-graduate-placements',topic:'internships',
      category:'Internships',title:'International internships and graduate placements',
      summary:'Compare pay, candidate status, work permission, host location, duration and the actual application route before choosing an overseas role.',
      glyph:'↗',number:'04',published:'15 October 2026',
      intro:'An exciting international role is useful only if it fits your stage, work rights and goals. Read the actual employer or provider requirements.',
      headings:[
        ['Internship, placement or graduate route?','These labels may describe different candidate stages and programmes. Check who may apply and whether graduation has to be complete.'],
        ['Right to work and location','Understand whether work authorization is required, supported or left entirely to the candidate. Never assume sponsorship from an international title.'],
        ['Payment and living costs','Distinguish wages, stipends, travel grants, accommodation assistance and unpaid positions to estimate the true cost of participation.'],
        ['Role quality and timing','Read the role tasks, team, supervision, duration, start dates and deadlines before submitting an application.']
      ]}
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
  const livePath=item=>'/blog/'+encodeURIComponent(item.slug)+'/';
  const previewPath=item=>'/guide-preview.html?guide='+encodeURIComponent(item.slug);
  const findGuide=slug=>items.find(x=>x.slug===slug)||items[0];
  const find=(query='',topic='all')=>items.filter(x=>
    (topic==='all'||x.topic===topic)&&
    [x.title,x.summary,x.category].join(' ').toLowerCase().includes(String(query||'').trim().toLowerCase()));
  const card=x=>'<article class="guide"><div class="guideArt" data-topic="'+esc(x.topic)+'">'+
    '<span class="artNo">THE JOURNAL / '+esc(x.number)+'</span>'+
    '<span class="artGlyph" aria-hidden="true">'+esc(x.glyph)+'</span></div>'+
    '<div class="guideBody"><span class="kind">'+esc(x.category)+'</span><h3>'+esc(x.title)+'</h3>'+
    '<p>'+esc(x.summary)+'</p><div class="guideBottom"><span>Published '+esc(x.published)+'</span>'+
    '<a href="'+previewPath(x)+'">Explore reading layout ↗</a></div></div></article>';
  const section=(title,body,i)=>'<section class="articleSection" id="chapter'+i+'"><h3>'+
    esc(title)+'</h3><p>'+esc(body)+'</p></section>';
  return {items,esc,find,findGuide,card,section,livePath,previewPath};
})();
if(typeof document!=='undefined')(()=>{
  const M=EditorialPreviewModel;
  const $=id=>document.getElementById(id);
  const menu=$('menuToggle'),nav=$('navLinks');
  if(menu&&nav){
    menu.addEventListener('click',()=>{
      const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));
      menu.setAttribute('aria-label',open?'Close menu':'Open menu');menu.textContent=open?'×':'☰';
    });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';
    }));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){
      nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';}});
  }
  if($('guidesGrid')){
    const input=$('guideSearch');
    let category='all';
    function update(){
      const filtered=M.find(input.value,category);
      $('guidesGrid').innerHTML=filtered.map(M.card).join('');
      $('guideCount').textContent='Showing '+filtered.length+' of '+M.items.length+' published guide topics';
      $('guidesEmpty').hidden=filtered.length!==0;
    }
    document.querySelectorAll('.filterBtn[data-category]').forEach(button=>{
      button.addEventListener('click',()=>{
        category=button.dataset.category;
        document.querySelectorAll('.filterBtn[data-category]').forEach(b=>{
          const selected=b===button;b.classList.toggle('active',selected);
          b.setAttribute('aria-pressed',String(selected));
        });
        update();
      });
    });
    input.addEventListener('input',update);
    $('resetGuides').addEventListener('click',()=>{
      input.value='';category='all';
      document.querySelectorAll('.filterBtn[data-category]').forEach(b=>{
        const chosen=b.dataset.category==='all';b.classList.toggle('active',chosen);
        b.setAttribute('aria-pressed',String(chosen));
      });
      update();input.focus();
    });
    update();
  }
  if($('articleHeading')){
    const raw=new URLSearchParams(window.location.search).get('guide')||'';
    const x=M.findGuide(raw);
    document.title=x.title+' · OppMatcher reading concept';
    $('articleCrumb').textContent=x.category;
    $('articleHeading').textContent=x.title;
    $('articleDeck').textContent=x.summary;
    $('articleKind').textContent=x.category.toUpperCase()+' / PUBLISHED '+x.published;
    $('articleSubhead').textContent=x.title;
    $('articleOpening').textContent=x.intro;
    $('articleSections').innerHTML=x.headings.map(([head,body],i)=>M.section(head,body,i)).join('');
    $('articleToc').innerHTML=x.headings.map(([head],i)=>'<a href="#chapter'+i+'">'+M.esc(head)+'</a>').join('');
    $('articleLiveLink').href=M.livePath(x);
    $('relatedGuides').innerHTML=M.items.filter(y=>y.slug!==x.slug).slice(0,3).map(y=>
      '<a class="relatedLink" href="'+M.previewPath(y)+'"><small>'+M.esc(y.category.toUpperCase())+
      '</small>'+M.esc(y.title)+' ↗</a>').join('');
  }
  const elements=document.querySelectorAll('[data-reveal]');
  if('IntersectionObserver'in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}});
    },{threshold:.07});
    elements.forEach(e=>observer.observe(e));
  }else elements.forEach(e=>e.classList.add('visible'));
})();
