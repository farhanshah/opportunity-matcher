import { createClient } from 'https://esm.sh/@neondatabase/neon-js@0.7.0-beta?bundle&target=es2022';

const AUTH_URL='https://ep-empty-fog-aw7p1xu9.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const DATA_API_URL='https://ep-empty-fog-aw7p1xu9.apirest.c-12.us-east-1.aws.neon.tech/neondb/rest/v1';
const state=window.OpportunityState;
const client=createClient({auth:{url:AUTH_URL},dataApi:{url:DATA_API_URL}});
window.OpportunityCloudClient=client;

let session=null,passportId=null,ready=false,syncing=false,pending=false,syncTimer=null,mode='signin',sessionState='checking';
let enabledSocialProviders=new Set(['google']);
const css=document.createElement('link');css.rel='stylesheet';css.href='/cloud-v13.css';document.head.appendChild(css);

const initials=user=>String(user?.name||user?.email||'U').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const html=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const unwrap=result=>{if(result?.error)throw new Error(result.error.message||String(result.error));return result?.data??result};
const normalizeSession=result=>{
  const data=result?.data??result;
  const candidate=data?.session??data?.data??data;
  if(candidate?.user)return candidate;
  if(data?.user)return data;
  return null;
};

function mountUI(){
  if(!document.getElementById('cloudAuthModal')){
    document.body.insertAdjacentHTML('beforeend',`<div id="cloudAuthModal" class="cloudModal hide"><div id="cloudAuthCard" class="cloudAuthCard"></div></div><div id="cloudToast" class="cloudToast"></div>`);
    document.getElementById('cloudAuthModal').addEventListener('click',e=>{if(e.target.id==='cloudAuthModal')closeAuth()});
  }
  const topRight=document.querySelector('.topRight');
  if(topRight&&!document.getElementById('cloudSyncPill')){
    const pill=document.createElement('span');pill.id='cloudSyncPill';pill.className='cloudSyncPill';pill.textContent='Connecting…';topRight.insertBefore(pill,topRight.querySelector('.avatar'));
  }
  const avatar=document.querySelector('.topRight .avatar');
  if(avatar){avatar.id='cloudAccountEntry';avatar.onclick=()=>sessionState==='error'?refreshSession(true):openAuth();}
  const nav=document.querySelector('.landing .nav');
  if(nav&&!document.getElementById('cloudLandingAuth')){
    const primary=nav.querySelector('.btnPrimary');const b=document.createElement('button');b.id='cloudLandingAuth';b.className='cloudNavAuth';b.textContent='Sign in';b.onclick=()=>openAuth();if(primary)nav.insertBefore(b,primary);else nav.appendChild(b);
  }
  updateAccountUI();
}

function toast(title,message){const el=document.getElementById('cloudToast');if(!el)return;el.innerHTML=`<b>${html(title)}</b>${html(message)}`;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),4200)}
function setCloudStatus(text,kind=''){const el=document.getElementById('cloudSyncPill');if(!el)return;el.textContent=text;el.className='cloudSyncPill'+(kind?' '+kind:'')}
function updateAccountUI(){
  const entry=document.getElementById('cloudAccountEntry');const landing=document.getElementById('cloudLandingAuth');
  if(entry){
    if(session?.user){entry.className='cloudAccountBtn';entry.innerHTML=`<span class="cloudAvatar">${html(initials(session.user))}</span><span>${html((session.user.name||session.user.email||'Account').split(' ')[0])}</span>`}
    else if(sessionState==='checking'){entry.className='cloudAccountBtn signedOut';entry.innerHTML='<span>Checking…</span>'}
    else if(sessionState==='error'){entry.className='cloudAccountBtn signedOut';entry.innerHTML='<span>Reconnect</span>'}
    else{entry.className='cloudAccountBtn signedOut';entry.innerHTML='<span>Sign in</span>'}
  }
  if(landing)landing.textContent=session?.user?'My account':'Sign in';
  const side=document.querySelector('.sideFoot');
  if(side){
    if(session?.user)side.innerHTML=`<b>Cloud workspace</b>Signed in as ${html(session.user.email||session.user.name||'user')}. Changes sync across devices.`;
    else if(sessionState==='checking')side.innerHTML='<b>Cloud workspace</b>Restoring your signed-in session. Your browser copy remains available while we connect.';
    else if(sessionState==='error')side.innerHTML='<b>Cloud reconnect needed</b>Your browser workspace is safe. Select Reconnect to try the cloud session again.';
    else side.innerHTML='<b>Local workspace</b>Your profile, saves and tracker are stored in this browser until you sign in.';
  }
  if(session?.user)setCloudStatus(ready?'Cloud synced':'Connecting…',ready?'ok':'syncing');
  else if(sessionState==='checking')setCloudStatus('Connecting…','syncing');
  else if(sessionState==='error')setCloudStatus('Reconnect','error');
  else setCloudStatus('Local only');
}

async function refreshSocialProviders(){
  try{
    const res=await fetch('/api/auth-providers',{cache:'no-store'});
    if(!res.ok)return;
    const data=await res.json();
    if(!Array.isArray(data.providers))return;
    enabledSocialProviders=new Set(data.providers.filter(p=>['google','github','microsoft'].includes(p)));
    const modal=document.getElementById('cloudAuthModal');
    if(modal && !modal.classList.contains('hide') && !session?.user &&
       !document.getElementById('cloudPassword'))return;
    if(modal && !modal.classList.contains('hide') && !session?.user)renderAuth();
  }catch{}
}
function availableSocialButtons(){
  const buttons=[{provider:'google',label:'Google',icon:'G'},
    {provider:'github',label:'GitHub',icon:'GH'},
    {provider:'microsoft',label:'Microsoft',icon:'M'}];
  return buttons.filter(x=>enabledSocialProviders.has(x.provider))
    .map(x=>`<button class="cloudGoogle cloudProvider-${x.provider}"
      onclick="window.OpportunityCloud.social('${x.provider}')"><i>${x.icon}</i>Continue with ${x.label}</button>`).join('');
}
function renderAuth(){
  const card=document.getElementById('cloudAuthCard');if(!card)return;
  if(session?.user){
    card.innerHTML=`<button class="cloudClose" onclick="window.OpportunityCloud.closeAuth()">×</button><div class="cloudEy">Opportunity account</div><h2>Your workspace follows you.</h2><p class="cloudLead">Passport, shortlist and application progress are protected by your account and synced to Neon.</p><div class="cloudAccountHero"><div class="cloudBigAvatar">${html(initials(session.user))}</div><div><b>${html(session.user.name||'Opportunity member')}</b><span>${html(session.user.email||'')}</span></div></div>${session.user.emailVerified===false?'<p class="cloudVerifyNotice">Your email is not verified yet. <button onclick="window.OpportunityCloud.verifyEmail()">Send verification email</button></p>':''}<div class="cloudStatusBox"><div><span>Passport</span><b>${passportId?'Cloud saved':'Connecting'}</b></div><div><span>Shortlist</span><b>${state.getSaved().length} saved</b></div><div><span>Tracker</span><b>${Object.keys(state.getTracks()).length} applications</b></div></div><div class="cloudAccountActions"><button onclick="window.OpportunityCloud.completePassport()">Profile &amp; email preferences</button><button onclick="window.OpportunityCloud.syncNow()">Sync now</button><button class="danger" onclick="window.OpportunityCloud.signOut()">Sign out</button></div>`;
    return;
  }
  card.innerHTML=`<button class="cloudClose" onclick="window.OpportunityCloud.closeAuth()">×</button><div class="cloudEy">Opportunity account</div><h2>${mode==='signin'?'Welcome back.':'Create your cloud workspace.'}</h2><p class="cloudLead">${mode==='signin'?'Sign in to restore your Passport, saved opportunities and tracker on this device.':'Your current browser workspace will be imported automatically after your first sign-in.'}</p><div class="cloudTabs"><button class="${mode==='signin'?'active':''}" onclick="window.OpportunityCloud.setMode('signin')">Sign in</button><button class="${mode==='signup'?'active':''}" onclick="window.OpportunityCloud.setMode('signup')">Create account</button></div>${availableSocialButtons()}<div class="cloudDivider">or use email</div>${mode==='signup'?'<div class="cloudField"><label>Name</label><input id="cloudName" autocomplete="name" placeholder="Your name"></div>':''}<div class="cloudField"><label>Email</label><input id="cloudEmail" type="email" autocomplete="email" placeholder="you@example.com"></div><div class="cloudField"><label>Password</label><input id="cloudPassword" type="password" autocomplete="${mode==='signin'?'current-password':'new-password'}" placeholder="At least 8 characters"></div><button id="cloudSubmit" class="cloudSubmit" onclick="window.OpportunityCloud.emailSubmit()">${mode==='signin'?'Sign in':'Create account'}</button><div id="cloudAuthFeedback"></div>`;
}
function openAuth(){renderAuth();document.getElementById('cloudAuthModal')?.classList.remove('hide')}
function closeAuth(){document.getElementById('cloudAuthModal')?.classList.add('hide')}
function feedback(text,error=false){const el=document.getElementById('cloudAuthFeedback');if(el)el.innerHTML=`<div class="${error?'cloudError':'cloudMessage'}">${html(text)}</div>`}
function setMode(next){mode=next;renderAuth()}

async function emailSubmit(){
  const email=document.getElementById('cloudEmail')?.value.trim();const password=document.getElementById('cloudPassword')?.value||'';const name=document.getElementById('cloudName')?.value.trim();
  if(!email||!password){feedback('Enter your email and password.',true);return}if(mode==='signup'&&!name){feedback('Add your name to create the account.',true);return}if(password.length<8){feedback('Use a password with at least 8 characters.',true);return}
  const btn=document.getElementById('cloudSubmit');if(btn){btn.disabled=true;btn.textContent=mode==='signin'?'Signing in…':'Creating account…'}
  try{
    if(mode==='signin')unwrap(await client.auth.signIn.email({email,password}));
    else {
      unwrap(await client.auth.signUp.email({email,password,name}));
      // The welcome email is sent only after the address is verified.
      // Ask Neon Auth to send its first-party verification message.
      if(typeof client.auth.sendVerificationEmail==='function'){
        try{
          unwrap(await client.auth.sendVerificationEmail({email,callbackURL:window.location.origin+'/'}));
        }catch(e){console.warn('Email verification message could not be requested',e)}
      }
    }
    await refreshSession(true);
    if(session?.user){closeAuth();toast('Cloud workspace active',ready?'Your account data is synced.':'Signed in. Finishing cloud setup…')}
    else feedback(mode==='signup'?'Account created. Check your email for verification and sign in to finish your Passport.':'Sign-in needs one more step. Please try again.');
  }catch(e){feedback(e.message||'Authentication failed.',true)}finally{if(btn){btn.disabled=false;btn.textContent=mode==='signin'?'Sign in':'Create account'}}
}
async function social(provider){
  if(!['google','github','microsoft'].includes(provider) ||
     !enabledSocialProviders.has(provider)) {
    feedback('That sign-in provider is not connected to OppMatcher yet.',true);return;
  }
  const button=document.querySelector('.cloudProvider-'+provider);
  if(button){button.disabled=true;button.textContent='Opening secure sign-in…'}
  try{
    const params={provider,callbackURL:window.location.origin+'/',
      errorCallbackURL:window.location.origin+'/',disableRedirect:true};
    if(provider==='google')params.additionalParams={prompt:'select_account'};
    const response=await client.auth.signIn.social(params);
    const payload=unwrap(response),url=payload?.url||response?.url;
    if(!url)throw new Error('No secure sign-in destination was returned.');
    const target=new URL(url);
    const allowed=new Set([new URL(AUTH_URL).hostname,'accounts.google.com',
      'www.google.com','github.com','login.microsoftonline.com','login.live.com']);
    if(target.protocol!=='https:' || !allowed.has(target.hostname))
      throw new Error('Unexpected identity provider destination.');
    window.location.assign(target.href);
  }catch(e){
    feedback('Sign-in could not start: '+(e.message||'Unknown error')+
      '. Try your email or another available provider.',true);
    if(button){button.disabled=false;button.textContent='Continue with '+provider[0].toUpperCase()+provider.slice(1)}
  }
}
async function google(){return social('google')}


function showPostSignInOnboarding(user, passportRow={}, force=false){
  if(!passportId || !user)return;
  const p=state.getProfile()||{};
  if(!force && passportRow.onboarding_completed_at && p.nat && p.edu && p.field)return;
  const card=document.getElementById('cloudAuthCard');
  if(!card)return;
  const options=id=>document.getElementById(id)?.innerHTML||'<option value="">Select</option>';
  const storedName=passportRow.full_name||user.name||'';
  card.innerHTML=`
    <button class="cloudClose" onclick="window.OpportunityCloud.closeAuth()">×</button>
    <div class="cloudEy">Opportunity Passport · One-time setup</div>
    <h2>Make your matches personal.</h2>
    <p class="cloudLead">Your sign-in provides your name and email only. Tell us the remaining details needed for eligibility matching. You can edit these later.</p>
    <div class="cloudIdentity"><span>Account email</span><b>${html(user.email||'')}</b></div>
    <form id="cloudCompleteForm" class="cloudCompleteForm">
      <div class="cloudField"><label for="cloudFullName">Full name</label><input id="cloudFullName" maxlength="120" autocomplete="name" value="${html(storedName)}"></div>
      <div class="cloudField"><label for="cloudProfileNat">Nationality *</label><select id="cloudProfileNat" required>${options('obNat')}</select></div>
      <div class="cloudField"><label for="cloudProfileResidence">Country of residence</label><select id="cloudProfileResidence">${options('obResidence')}</select></div>
      <div class="cloudField"><label for="cloudProfileEducation">Education level *</label><select id="cloudProfileEducation" required>${options('obEdu')}</select></div>
      <div class="cloudField"><label for="cloudProfileField">Field of study *</label><select id="cloudProfileField" required>${options('obField')}</select></div>
      <div class="cloudField"><label for="cloudUniversityName">University or institution</label><input id="cloudUniversityName" maxlength="180" autocomplete="organization" placeholder="e.g. Teesside University" value="${html(passportRow.university_name||'')}"></div>
      <div class="cloudField"><label for="cloudDegreeName">Degree or qualification</label><input id="cloudDegreeName" maxlength="140" placeholder="e.g. BA Business Management" value="${html(passportRow.degree_name||'')}"></div>
      <div class="cloudField"><label for="cloudProfileAge">Age (optional)</label><input id="cloudProfileAge" type="number" min="14" max="99" value="${html(p.age??'')}"></div>
      <div class="cloudField"><label for="cloudProfileGpa">GPA / CGPA (optional)</label><input id="cloudProfileGpa" type="number" min="0" max="10" step=".01" value="${html(p.gpa??'')}"></div>
      <label class="cloudConsent"><input id="cloudMarketingConsent" type="checkbox" ${passportRow.marketing_opt_in?'checked':''}><span>Email me optional opportunity alerts and updates. I can unsubscribe at any time. This is separate from account/security emails.</span></label>
      <div id="cloudProfileFeedback" role="status" aria-live="polite"></div>
      <div class="cloudCompleteActions">
        <button class="cloudSubmit" type="submit">Save Passport and continue</button>
        <button class="cloudSkip" type="button" onclick="window.OpportunityCloud.closeAuth()">Finish later</button>
      </div>
    </form>`;
  const values={
    cloudProfileNat:p.nat||'',cloudProfileResidence:p.residence||'',
    cloudProfileEducation:p.edu||'',cloudProfileField:p.field||''
  };
  for(const [id,value] of Object.entries(values)){const input=document.getElementById(id);if(input)input.value=value}
  card.querySelector('#cloudCompleteForm')?.addEventListener('submit',event=>{
    event.preventDefault();
    savePostSignInOnboarding(passportRow).catch(e=>{
      const notice=document.getElementById('cloudProfileFeedback');
      if(notice)notice.textContent=e.message||'Unable to save. Please try again.';
    });
  });
  document.getElementById('cloudAuthModal')?.classList.remove('hide');
}
async function openProfileSettings(){
  if(!session?.user){openAuth();return}
  try{
    const rows=await query(client.from('user_passports').select('*').eq('auth_user_id',session.user.id).limit(1));
    showPostSignInOnboarding(session.user,rows?.[0]||{},true);
  }catch(e){toast('Account settings unavailable',e.message||'Please retry later.')}
}
async function savePostSignInOnboarding(prior={}){
  if(!session?.user||!passportId)throw new Error('Sign in to save your Passport.');
  const value=id=>document.getElementById(id)?.value?.trim()||'';
  const nat=value('cloudProfileNat'),residence=value('cloudProfileResidence');
  const edu=value('cloudProfileEducation'),field=value('cloudProfileField');
  if(!nat||!edu||!field)throw new Error('Nationality, education and field are required.');
  const name=value('cloudFullName').slice(0,120);
  const university=value('cloudUniversityName').slice(0,180);
  const degree=value('cloudDegreeName').slice(0,140);
  const age=value('cloudProfileAge'),gpa=value('cloudProfileGpa');
  const consent=Boolean(document.getElementById('cloudMarketingConsent')?.checked);
  const button=document.querySelector('#cloudCompleteForm .cloudSubmit');
  if(button){button.disabled=true;button.textContent='Saving securely…'}
  try{
    const payload={
      nationality:nat,education_level:edu,field_of_study:field,
      country_of_residence:residence||null,full_name:name||null,
      university_name:university||null,degree_name:degree||null,
      age:age?Number(age):null,gpa:gpa?Number(gpa):null,
      marketing_opt_in:consent,
      marketing_opt_in_at:consent?(prior.marketing_opt_in_at||new Date().toISOString()):null,
      onboarding_completed_at:new Date().toISOString()
    };
    await query(client.from('user_passports').update(payload).eq('auth_user_id',session.user.id));
    const current=state.getProfile()||{};
    state.setProfile({...current,nat,residence,edu,field,degreeName:degree,age:age?Number(age):'',gpa:gpa?Number(gpa):''});
    state.render();closeAuth();
    window.showApp?.();
    window.setView?.('discover',{replace:true});
    toast('Passport saved','Your matching profile is now connected to your account.');
    renderAuth();
  }finally{if(button){button.disabled=false;button.textContent='Save Passport and continue'}}
}
async function requestEmailVerification(){
  if(!session?.user?.email)throw Error('Sign in before requesting verification.');
  if(typeof client.auth.sendVerificationEmail!=='function'){
    toast('Verification unavailable','Please contact support to verify your account.');return;
  }
  try{
    unwrap(await client.auth.sendVerificationEmail({email:session.user.email,callbackURL:window.location.origin+'/'}));
    toast('Verification requested','Check your inbox for a message from the account provider.');
  }catch(e){toast('Verification could not be sent',e.message||'Try again later.')}
}
async function waitForOpportunityIds(){
  for(let i=0;i<40;i++){const list=state.getOpps();if(list.length&&list.some(o=>o.Database_ID))return list;await sleep(125)}
  try{const r=await fetch('/api/opportunities?cloud='+Date.now(),{cache:'no-store'});const j=await r.json();const map=new Map((j.opportunities||[]).map(o=>[o.Opportunity_ID,o.Database_ID]));state.getOpps().forEach(o=>{if(!o.Database_ID)o.Database_ID=map.get(o.Opportunity_ID)||''});}catch{}
  return state.getOpps();
}
function profileInsertPayload(p,user){return{user_key:`auth:${user.id}`,auth_user_id:user.id,nationality:p.nat||null,country_of_residence:p.residence||null,age:p.age||null,education_level:p.edu||null,degree_status:null,degree_name:null,field_of_study:p.field||null,gpa:p.gpa===''||p.gpa==null?null:Number(p.gpa),graduation_year:null,work_experience_months:Number(p.expMonths||0),english_readiness:p.english||null,desired_countries:[],desired_opportunity_types:p.type&&p.type!=='Any'?[p.type]:[],funding_preferences:p.fund&&p.fund!=='Any'?[p.fund]:[]}}
function profileUpdatePayload(p){const x=profileInsertPayload(p,{id:'unused'});delete x.user_key;delete x.auth_user_id;for(const field of ['degree_status','degree_name','graduation_year'])delete x[field];return x}
function rowToProfile(row){return{nat:row.nationality||'',residence:row.country_of_residence||'',age:row.age??'',english:row.english_readiness||'Not specified',edu:row.education_level||'',field:row.field_of_study||'',gpa:row.gpa??'',expMonths:Number(row.work_experience_months||0),type:Array.isArray(row.desired_opportunity_types)&&row.desired_opportunity_types[0]?row.desired_opportunity_types[0]:'Any',fund:Array.isArray(row.funding_preferences)&&row.funding_preferences[0]?row.funding_preferences[0]:'Any'}}
async function query(builder){const result=await builder;if(result?.error)throw new Error(result.error.message||String(result.error));return result?.data??[]}

let welcomeTriggeredFor='';
async function triggerWelcomeOnAuthenticatedSignIn(){
  if(!session?.user?.id || !session?.user?.emailVerified)return;
  const bearer=session.session?.token||session.token;
  if(typeof bearer!=='string'||bearer.length<20)return;
  if(welcomeTriggeredFor===session.user.id)return;
  welcomeTriggeredFor=session.user.id;
  try{
    const result=await fetch('/api/welcome-now',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+bearer},
      body:'{}',cache:'no-store',credentials:'same-origin'
    });
    if(!result.ok){welcomeTriggeredFor='';return}
    const payload=await result.json();
    if(payload.configured===false)welcomeTriggeredFor='';
    // The mail provider may accept delivery asynchronously. Never tell users
    // an email has arrived just because this trigger returned successfully.
  }catch{welcomeTriggeredFor=''}
}
async function bootstrapCloud(user){
  let postSignInRow=null;
  ready=false;updateAccountUI();setCloudStatus('Connecting…','syncing');await waitForOpportunityIds();
  try{
    const rows=await query(client.from('user_passports').select('*').eq('auth_user_id',user.id).limit(1));
    if(rows?.length){postSignInRow=rows[0];passportId=rows[0].id;await loadCloudState(rows[0]);toast('Workspace restored','Your cloud Passport, shortlist and tracker are loaded on this device.')}
    else{const local=state.getProfile();const created=await query(client.from('user_passports').insert(profileInsertPayload(local,user)).select('*'));if(!created?.length)throw new Error('Could not create your cloud Passport.');passportId=created[0].id;postSignInRow=created[0];await importLocalChildren();toast('Browser workspace imported','Your existing Passport, saves and tracker are now attached to your account.')}
    ready=true;sessionState='signedin';updateAccountUI();setCloudStatus('Cloud synced','ok');state.render();renderAuth();void triggerWelcomeOnAuthenticatedSignIn();showPostSignInOnboarding(user,postSignInRow||{});
  }catch(e){console.error('Cloud bootstrap failed',e);setCloudStatus('Sync issue','error');toast('Cloud sync needs attention',e.message||'Please try signing in again.')}
}
async function loadCloudState(passportRow){
  const list=await waitForOpportunityIds();const uuidToExternal=new Map(list.filter(o=>o.Database_ID).map(o=>[String(o.Database_ID),o.Opportunity_ID]));
  const savedRows=await query(client.from('saved_opportunities').select('opportunity_id').eq('user_passport_id',passportRow.id));
  const trackRows=await query(client.from('application_tracker').select('opportunity_id,stage,notes,checklist').eq('user_passport_id',passportRow.id));
  const savedIds=savedRows.map(r=>uuidToExternal.get(String(r.opportunity_id))).filter(Boolean);const cloudTracks={};
  for(const r of trackRows){const external=uuidToExternal.get(String(r.opportunity_id));if(external){cloudTracks[external]={stage:r.stage||'Saved',notes:r.notes||'',checklist:r.checklist||{documents:false,statement:false,references:false}};if(!savedIds.includes(external))savedIds.push(external)}}
  state.setProfile(rowToProfile(passportRow));state.setSaved(savedIds);state.setTracks(cloudTracks);state.render();
}
async function importLocalChildren(){await replaceChildren()}
async function replaceChildren(){
  if(!passportId)return;const list=await waitForOpportunityIds();const externalToUuid=new Map(list.filter(o=>o.Database_ID).map(o=>[o.Opportunity_ID,o.Database_ID]));
  await query(client.from('saved_opportunities').delete().eq('user_passport_id',passportId));
  const savedRows=state.getSaved().map(id=>externalToUuid.get(id)).filter(Boolean).map(uuid=>({user_passport_id:passportId,opportunity_id:uuid}));if(savedRows.length)await query(client.from('saved_opportunities').insert(savedRows));
  await query(client.from('application_tracker').delete().eq('user_passport_id',passportId));
  const trackRows=Object.entries(state.getTracks()).map(([id,t])=>{const uuid=externalToUuid.get(id);return uuid?{user_passport_id:passportId,opportunity_id:uuid,stage:t.stage||'Saved',notes:t.notes||null,checklist:t.checklist||{}}:null}).filter(Boolean);if(trackRows.length)await query(client.from('application_tracker').insert(trackRows));
}
async function performSync(){
  if(!session?.user||!passportId||!ready)return;if(syncing){pending=true;return}syncing=true;setCloudStatus('Syncing…','syncing');
  try{await query(client.from('user_passports').update(profileUpdatePayload(state.getProfile())).eq('id',passportId));await replaceChildren();setCloudStatus('Cloud synced','ok')}
  catch(e){console.error('Cloud sync failed',e);setCloudStatus('Sync issue','error')}
  finally{syncing=false;if(pending){pending=false;performSync()}}
}
function scheduleSync(){if(!session?.user||!ready)return;clearTimeout(syncTimer);syncTimer=setTimeout(performSync,700)}
async function syncNow(){await performSync();toast('Sync complete','Your current workspace is saved to the cloud.');renderAuth()}
async function signOut(){
  try{if(ready)await performSync();await client.auth.signOut()}catch(e){console.warn(e)}
  session=null;passportId=null;welcomeTriggeredFor='';ready=false;sessionState='signedout';state.clear();updateAccountUI();closeAuth();try{window.showLanding?.()}catch{}toast('Signed out','The browser copy was cleared. Sign back in to restore your workspace.')
}
async function refreshSession(bootstrap=false){
  sessionState='checking';updateAccountUI();
  let lastError=null;
  for(let attempt=0;attempt<4;attempt++){
    try{
      const restored=normalizeSession(await client.auth.getSession());
      session=restored;
      sessionState=restored?.user?'signedin':'signedout';
      updateAccountUI();
      if(session?.user&&(bootstrap||!ready))await bootstrapCloud(session.user);
      return session;
    }catch(e){
      lastError=e;
      console.warn(`Session check failed (attempt ${attempt+1}/4)`,e);
      if(attempt<3){setCloudStatus('Reconnecting…','syncing');await sleep(350*(attempt+1));}
    }
  }
  sessionState='error';
  updateAccountUI();
  console.warn('Session restore unavailable after retries',lastError);
  toast('Cloud reconnect needed','Your browser workspace is safe. Select Reconnect to try again.');
  return null;
}

window.OpportunityCloud={openAuth,closeAuth,setMode,emailSubmit,google,social,signOut,syncNow,completePassport:openProfileSettings,verifyEmail:requestEmailVerification,retrySession:()=>refreshSession(true)};
window.addEventListener('opportunity:statechange',scheduleSync);
mountUI();
void refreshSocialProviders();
await refreshSession(true);
const socialError=new URLSearchParams(window.location.search).get('error');
if(socialError && !session?.user){
  const knownErrors={
    access_denied:'Google sign-in was cancelled.',
    invalid_callback:'Google returned an invalid callback. Please try again.',
    oauth_error:'The identity provider could not complete sign-in.',
    state_mismatch:'The sign-in session expired. Please try again in this browser.'
  };
  openAuth();
  feedback(knownErrors[socialError]||'Social sign-in could not be completed. Please try again.',true);
  const clean=new URL(window.location.href);clean.searchParams.delete('error');
  window.history.replaceState(null,'',clean.pathname+clean.search+clean.hash);
}

