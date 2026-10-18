'use strict';
/* Independent design preview. No authentication, storage or network writes. */
const PassportPreviewModel=(()=>{
const COUNTRIES=['Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Chad','Chile','China','Colombia','Costa Rica','Croatia','Cyprus','Czechia','Denmark','Ecuador','Egypt','Estonia','Ethiopia','Fiji','Finland','France','Georgia','Germany','Ghana','Greece','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Italy','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan','Latvia','Lebanon','Liberia','Libya','Lithuania','Luxembourg','Malaysia','Maldives','Malta','Mauritius','Mexico','Moldova','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nepal','Netherlands','New Zealand','Nigeria','North Macedonia','Norway','Oman','Pakistan','Palestine','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','Somalia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand','Tunisia','Türkiye','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe','Other / multiple nationality'];
const FIELDS=['Accounting & Finance','Agriculture, Food & Forestry','Architecture & Built Environment','Arts, Design & Creative Industries','Biological & Life Sciences','Business & Management','Chemistry & Materials Science','Communication, Media & Journalism','Computer Science, AI & Data','Economics','Education & Teaching','Engineering — Aerospace','Engineering — Chemical','Engineering — Civil','Engineering — Electrical & Electronic','Engineering — Mechanical','Engineering — Other','Environmental & Earth Sciences','Hospitality, Tourism & Events','History, Philosophy & Religion','International Relations & Development','Languages & Linguistics','Law & Legal Studies','Mathematics & Statistics','Medicine & Dentistry','Nursing & Allied Health','Pharmacy & Pharmaceutical Sciences','Physics & Astronomy','Politics & Public Policy','Psychology','Public Health','Social Sciences','Sports & Exercise Science','Veterinary Science','Other / Interdisciplinary'];
 const STEP_COUNT=5, REQUIRED=['nat','edu','field'];
 const value=x=>String(x??'').trim();
 const escapeHtml=x=>value(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const requiredByStep=[['nat'],['edu','field'],[],[],[]];
 const numeric={age:[14,99,0],gpa:[0,10,1],experienceYears:[0,40,2],workHours:[0,100000,2]};
 function validateStep(step,formValues){
  for(const name of requiredByStep[step]||[]){
   if(!value(formValues[name])){
    const message={nat:'Choose your nationality before continuing.',
     edu:'Choose your education level before continuing.',
     field:'Choose your field of study before continuing.'};
    return {ok:false,field:name,message:message[name]};
   }
  }
  for(const [name,[min,max,target]] of Object.entries(numeric)){
   if(step!==target||!value(formValues[name]))continue;
   const v=Number(formValues[name]);
   if(!Number.isFinite(v)||v<min||v>max)return {ok:false,field:name,
    message:'Enter a value between '+min+' and '+max+'.'};
   if(name==='workHours'&&!Number.isInteger(v))return {ok:false,field:name,message:'Work hours must be a whole number.'};
  }
  if(step===2&&value(formValues.graduationDate)){
   const day=value(formValues.graduationDate);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day+'T12:00:00Z'))||
    new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day)
    return {ok:false,field:'graduationDate',message:'Please enter a valid graduation date.'};
  }
  return {ok:true};
 }
 function verifyThrough(step,values){
  for(let i=0;i<=Math.min(step,3);i++){
   const result=validateStep(i,values);
   if(!result.ok)return {...result,step:i};
  }
  return {ok:true};
 }
 function reviewMarkup(v){
  const pairs=[['Nationality',v.nat],['Residence',v.residence],['Age',v.age],
   ['English readiness',v.english],['Education',v.edu],['Field of study',v.field],
   ['GPA / CGPA',v.gpa],['Degree / qualification',v.degreeName],
   ['Degree status',v.degreeStatus],['Degree country',v.degreeCountry],
   ['Graduation date',v.graduationDate],['Experience (years)',v.experienceYears],
   ['Post-degree work hours',v.workHours],['Preferred opportunity type',v.type||'Any'],
   ['Funding preference',v.fund||'Any']];
  const cells=pairs.map(([label,text])=>'<div class="reviewField"><span>'+escapeHtml(label)+
   '</span><strong>'+escapeHtml(value(text)||'Not provided')+'</strong></div>').join('');
  return '<div class="reviewHero"><span>YOUR OPPORTUNITY PASSPORT / CONCEPT</span>'+
   '<h3>One profile. Many directions.</h3>'+
   '<small>Preview only · This is not a saved Passport or eligibility assessment</small></div>'+
   '<div class="reviewGrid">'+cells+'</div>';
 }
 return {COUNTRIES,FIELDS,STEP_COUNT,REQUIRED,value,escapeHtml,validateStep,verifyThrough,reviewMarkup};
})();
if(typeof document!=='undefined')(()=>{
 const M=PassportPreviewModel,$=id=>document.getElementById(id);
 const form=$('passportForm'),panes=[...document.querySelectorAll('[data-pane]')],
  stepButtons=[...document.querySelectorAll('.stepLink')],next=$('nextStep'),
  back=$('backStep'),error=$('formError');
 let step=0;
 function opts(id,items){
  const el=$(id);
  items.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o);});
 }
 function values(){
  const data=new FormData(form),out={};
  for(const [key,v] of data.entries())out[key]=String(v).trim();
  return out;
 }
 function clearError(){
  error.hidden=true;error.textContent='';
  form.querySelectorAll('[aria-invalid="true"]').forEach(x=>x.removeAttribute('aria-invalid'));
 }
 function showError(result){
  error.hidden=false;error.textContent=result.message;
  const el=$(result.field);if(el){el.setAttribute('aria-invalid','true');el.focus();}
 }
 function showStep(nextStep,scroll=true){
  step=Math.max(0,Math.min(M.STEP_COUNT-1,nextStep));
  panes.forEach((p,i)=>p.hidden=i!==step);
  stepButtons.forEach((b,i)=>{
   const active=i===step;b.classList.toggle('active',active);
   if(active)b.setAttribute('aria-current','step');
   else b.removeAttribute('aria-current');
  });
  $('progressFill').style.width=((step+1)*20)+'%';
  $('progressText').textContent='Step '+(step+1)+' of 5';
  back.hidden=step===0;next.hidden=step===4;
  $('formHint').textContent=step===4?'Snapshot only. Nothing is saved.':
   (step===0||step===1?'Required fields are labelled.':'Optional fields can be left blank.');
  clearError();
  if(step===4)$('reviewCard').innerHTML=M.reviewMarkup(values());
  if(scroll){
   const element=$('passport-builder'),offset=element.getBoundingClientRect().top+window.scrollY-20;
   window.scrollTo({top:offset,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
 }
 function navigate(target){
  target=Math.max(0,Math.min(4,target));
  if(target>step){
   const check=M.verifyThrough(target-1,values());
   if(!check.ok){showStep(check.step,false);showError(check);return;}
  }
  showStep(target);
 }
 function sample(){
  form.reset();
  const v={nat:'Canada',residence:'Germany',age:'24',english:'Degree taught in English',
   edu:"Bachelor's degree",field:'Computer Science, AI & Data',gpa:'3.7',degreeName:'BSc Computer Science',
   degreeStatus:'Completed',degreeCountry:'Canada',graduationDate:'2025-06-15',
   experienceYears:'1.5',workHours:'1200',type:'Scholarship',fund:'Fully Funded'};
  for(const [key,val] of Object.entries(v)){
   if(key==='type'){form.querySelectorAll('[name="type"]').forEach(el=>el.checked=el.value===val);continue;}
   const el=$(key);if(el)el.value=val;
  }
  showStep(4);$('formHint').textContent='Example details only — not saved.';
 }
 function setup(){
  ['nat','residence','degreeCountry'].forEach(id=>opts(id,M.COUNTRIES));
  opts('field',M.FIELDS);
  form.addEventListener('submit',event=>event.preventDefault());
  form.addEventListener('input',()=>{
   if(!error.hidden)clearError();
   if(step===4)$('reviewCard').innerHTML=M.reviewMarkup(values());
  });
  form.addEventListener('change',()=>{
   if(!error.hidden)clearError();
   if(step===4)$('reviewCard').innerHTML=M.reviewMarkup(values());
  });
  next.addEventListener('click',()=>navigate(step+1));
  back.addEventListener('click',()=>showStep(step-1));
  stepButtons.forEach(b=>b.addEventListener('click',()=>navigate(Number(b.dataset.step))));
  $('sampleButton').addEventListener('click',sample);
  $('resetButton').addEventListener('click',()=>{form.reset();showStep(0);});
  const toggle=$('menuToggle'),nav=$('navLinks');
  toggle.addEventListener('click',()=>{
   const open=nav.classList.toggle('open');
   toggle.setAttribute('aria-expanded',String(open));
   toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
   toggle.textContent=open?'×':'☰';
  });
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
   nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.textContent='☰';
  }));
  const elements=document.querySelectorAll('[data-reveal]');
  if('IntersectionObserver'in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   const obs=new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}
   }),{threshold:.08});
   elements.forEach(e=>obs.observe(e));
  }else elements.forEach(e=>e.classList.add('visible'));
  showStep(0,false);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);
 else setup();
})();
