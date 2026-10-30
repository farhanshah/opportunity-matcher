/* OppMatcher public source chips: on desktop hover/focus, on touch tap.
   Source identity and destination are curated static facts, not an open-status feed. */
(()=>{
  'use strict';
  const strip=document.querySelector('#landing .sourceTrack');
  if(!strip)return;
  const SOURCES=Object.freeze({
    chevening:{name:'Chevening',type:'UK government scholarship programme',
      detail:'UK postgraduate scholarship information and application timelines.',
      url:'https://www.chevening.org/scholarships/application-timeline/'},
    worldbank:{name:'World Bank',type:'International development organisation',
      detail:'Scholarship and early-career programme information from the World Bank.',
      url:'https://www.worldbank.org/en/programs/scholarships/jj-wbgsp'},
    erasmus:{name:'Erasmus+',type:'European Union education programme',
      detail:'Erasmus Mundus Joint Masters and international study opportunities.',
      url:'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters'},
    oxford:{name:'University of Oxford',type:'University scholarship provider',
      detail:'Graduate funding information, including Clarendon scholarships.',
      url:'https://www.ox.ac.uk/clarendon'},
    rhodes:{name:'Rhodes Trust',type:'Postgraduate scholarship provider',
      detail:'Rhodes Scholarship programme information and eligibility routes.',
      url:'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/'},
    rotary:{name:'Rotary International',type:'International fellowship provider',
      detail:'Rotary Peace Fellowship programme and application information.',
      url:'https://www.rotary.org/en/our-programs/peace-fellowships'},
    swedish:{name:'Swedish Institute',type:'Swedish public-sector scholarship provider',
      detail:'Scholarships for Global Professionals and selected study programmes.',
      url:'https://si.se/en/apply/scholarships/swedish-institute-scholarships-for-global-professionals/'},
    daad:{name:'DAAD',type:'German academic exchange organisation',
      detail:'Scholarships and support for international study and research in Germany.',
      url:'https://www.daad.de/en/studying-in-germany/scholarships/daad-scholarships/'}
  });
  const pop=document.createElement('div');
  pop.id='omSourceDetails';
  pop.className='omSourcePopover';
  pop.setAttribute('role','dialog');
  pop.setAttribute('aria-label','Official provider information');
  pop.hidden=true;
  const heading=document.createElement('strong'),kind=document.createElement('span'),
    description=document.createElement('p'),note=document.createElement('p'),
    link=document.createElement('a');
  heading.className='omSourceTitle';
  kind.className='omSourceType';
  description.className='omSourceDescription';
  note.className='omSourceDisclaimer';
  note.textContent='Monitored official source. Check the provider for current application dates and eligibility.';
  link.className='omSourceOfficialLink';
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.textContent='Visit official source ↗';
  pop.append(heading,kind,description,note,link);
  document.body.appendChild(pop);

  const chips=[...strip.querySelectorAll('.omSourceChip')];
  let active=null,hideTimer=0;
  const fineHover=()=>window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clearHide=()=>{if(hideTimer){window.clearTimeout(hideTimer);hideTimer=0;}};
  function close(){
    clearHide();
    if(active)active.setAttribute('aria-expanded','false');
    active=null;
    pop.hidden=true;
  }
  function scheduleClose(){clearHide();hideTimer=window.setTimeout(()=>{
    if(!pop.matches(':hover')&&!(active&&active.matches(':focus-visible')))close();
  },180)}
  function position(chip){
    if(!fineHover()){pop.style.left='';pop.style.top='';pop.style.bottom='';return;}
    const rect=chip.getBoundingClientRect();
    const width=Math.min(320,window.innerWidth-24);
    const left=Math.max(12,Math.min(window.innerWidth-width-12,rect.left+rect.width/2-width/2));
    pop.style.width=width+'px';
    pop.style.left=left+'px';
    pop.style.bottom='auto';
    const height=pop.offsetHeight;
    const below=rect.bottom+12;
    pop.style.top=(below+height+12<=window.innerHeight?below:Math.max(12,rect.top-height-12))+'px';
  }
  function open(chip){
    const info=SOURCES[chip.dataset.source];
    if(!info)return;
    clearHide();
    if(active&&active!==chip)active.setAttribute('aria-expanded','false');
    active=chip;
    heading.textContent=info.name;
    kind.textContent=info.type;
    description.textContent=info.detail;
    link.href=info.url;
    pop.hidden=false;
    chip.setAttribute('aria-expanded','true');
    position(chip);
  }
  chips.forEach(chip=>{
    if(!Object.hasOwn(SOURCES,chip.dataset.source))return;
    chip.setAttribute('aria-controls',pop.id);
    chip.setAttribute('aria-haspopup','dialog');
    chip.setAttribute('aria-expanded','false');
    chip.addEventListener('pointerenter',()=>{if(fineHover())open(chip)});
    chip.addEventListener('pointerleave',()=>{if(fineHover())scheduleClose()});
    chip.addEventListener('focus',()=>open(chip));
    chip.addEventListener('click',event=>{
      event.preventDefault();
      if(active===chip&&!pop.hidden)close();else open(chip);
    });
  });
  pop.addEventListener('pointerenter',clearHide);
  pop.addEventListener('pointerleave',scheduleClose);
  document.addEventListener('pointerdown',event=>{
    if(!pop.contains(event.target)&&!chips.some(chip=>chip.contains(event.target)))close();
  });
  document.addEventListener('focusin',event=>{
    if(!pop.contains(event.target)&&!chips.some(chip=>chip.contains(event.target)))close();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!pop.hidden){
      const original=active;close();original?.focus();event.preventDefault();
    }
  });
  window.addEventListener('scroll',close,{passive:true,capture:true});
  window.addEventListener('resize',close,{passive:true});
})();