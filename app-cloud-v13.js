import { createClient } from 'https://esm.sh/@neondatabase/neon-js@0.7.0-beta?bundle&target=es2022';

const AUTH_URL='https://ep-empty-fog-aw7p1xu9.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const DATA_API_URL='https://ep-empty-fog-aw7p1xu9.apirest.c-12.us-east-1.aws.neon.tech/neondb/rest/v1';
const state=window.OpportunityState;
const client=createClient({auth:{url:AUTH_URL},dataApi:{url:DATA_API_URL}});
window.OpportunityCloudClient=client;

let session=null,passportId=null,ready=false,syncing=false,pending=false,syncTimer=null,mode='signin';
const css=document.createElement('link');css.rel='stylesheet';css.href='/cloud-v13.css';document.head.appendChild(css);

const initials=user=>String(user?.name||user?.email||'U').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const html=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const unwrap=result=>{if(result?.error)throw new Error(result.error.message||String(result.error));return result?.data??result};
const normalizeSession=result=>{const data=result?.data??result;if(data?.user)return data;return null};

function mountUI(){
  if(!document.getElementById('cloudAuthModal')){
    document.body.insertAdjacentHTML('beforeend',`<div id="cloudAuthModal" class="cloudModal hide"><div id="cloudAuthCard" class="cloudAuthCard"></div></div><div id="cloudToast" class="cloudToast"></div>`);
    document.getElementById('cloudAuthModal').addEventListener('click',e=>{if(e.target.id==='cloudAuthModal')closeAuth()});
  }
  const topRight=document.querySelector('.topRight');
  if(topRight&&!document.getElementById('cloudSyncPill')){
    const pill=document.createElement('span');pill.id='cloudSyncPill';pill.className='cloudSyncPill';pill.textContent='Local only';topRight.insertBefore(pill,topRight.querySelector('.avatar'));
  }
  const avatar=document.querySelector('.topRight .avatar');
  if(avatar){avatar.id='cloudAccountEntry';avatar.onclick=()=>openAuth();}
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
    else{entry.className='cloudAccountBtn signedOut';entry.innerHTML='<span>Sign in</span>'}
  }
  if(landing)landing.textContent=session?.user?'My account':'Sign in';
  const side=document.querySelector('.sideFoot');if(side)side.innerHTML=session?.user?`<b>Cloud workspace</b>Signed in as ${html(session.user.email||session.user.name||'user')}. Changes sync across devices.`:'<b>Local workspace</b>Your profile, saves and tracker are stored in this browser until you sign in.';
  if(session?.user)setCloudStatus(ready?'Cloud synced':'Connecting…',ready?'ok':'syncing');else setCloudStatus('Local only');
}

function renderAuth(){
  const card=document.getElementById('cloudAuthCard');if(!card)return;
  if(session?.user){
    card.innerHTML=`<button class="cloudClose" onclick="window.OpportunityCloud.closeAuth()">×</button><div class="cloudEy">Opportunity account</div><h2>Your workspace follows you.</h2><p class="cloudLead">Passport, shortlist and application progress are protected by your account and synced to Neon.</p><div class="cloudAccountHero"><div class="cloudBigAvatar">${html(initials(session.user))}</div><div><b>${html(session.user.name||'Opportunity member')}</b><span>${html(session.user.email||'')}</span></div></div><div class="cloudStatusBox"><div><span>Passport</span><b>${passportId?'Cloud saved':'Connecting'}</b></div><div><span>Shortlist</span><b>${state.getSaved().length} saved</b></div><div><span>Tracker</span><b>${Object.keys(state.getTracks()).length} applications</b></div></div><div class="cloudAccountActions"><button onclick="window.OpportunityCloud.syncNow()">Sync now</button><button class="danger" onclick="window.OpportunityCloud.signOut()">Sign out</button></div>`;
    return;
  }
  card.innerHTML=`<button class="cloudClose" onclick="window.OpportunityCloud.closeAuth()">×</button><div class="cloudEy">Opportunity account</div><h2>${mode==='signin'?'Welcome back.':'Create your cloud workspace.'}</h2><p class="cloudLead">${mode==='signin'?'Sign in to restore your Passport, saved opportunities and tracker on this device.':'Your current browser workspace will be imported automatically after your first sign-in.'}</p><div class="cloudTabs"><button class="${mode==='signin'?'active':''}" onclick="window.OpportunityCloud.setMode('signin')">Sign in</button><button class="${mode==='signup'?'active':''}" onclick="window.OpportunityCloud.setMode('signup')">Create account</button></div><button class="cloudGoogle" onclick="window.OpportunityCloud.google()"><i>G</i>Continue with Google</button><div class="cloudDivider">or use email</div>${mode==='signup'?'<div class="cloudField"><label>Name</label><input id="cloudName" autocomplete="name" placeholder="Your name"></div>':''}<div class="cloudField"><label>Email</label><input id="cloudEmail" type="email" autocomplete="email" placeholder="you@example.com"></div><div class="cloudField"><label>Password</label><input id="cloudPassword" type="password" autocomplete="${mode==='signin'?'current-password':'new-password'}" placeholder="At least 8 characters"></div><button id="cloudSubmit" class="cloudSubmit" onclick="window.OpportunityCloud.emailSubmit()">${mode==='signin'?'Sign in':'Create account'}</button><div id="cloudAuthFeedback"></div>`;
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
    if(mode==='signin')unwrap(await client.auth.signIn.email({email,password}));else unwrap(await client.auth.signUp.email({email,password,name}));
    await refreshSession(true);
    if(session?.user){closeAuth();toast('Cloud workspace active',ready?'Your account data is synced.':'Signed in. Finishing cloud setup…')}
    else feedback(mode==='signup'?'Account created. If verification is required, check your email, then sign in.':'Sign-in needs one more step. Please try again.');
  }catch(e){feedback(e.message||'Authentication failed.',true)}finally{if(btn){btn.disabled=false;btn.textContent=mode==='signin'?'Sign in':'Create account'}}
}
async function google(){try{unwrap(await client.auth.signIn.social({provider:'google',callbackURL:window.location.origin+window.location.pathname}))}catch(e){feedback(e.message||'Google sign-in could not start.',true)}}

async function waitForOpportunityIds(){
  for(let i=0;i<40;i++){const list=state.getOpps();if(list.length&&list.some(o=>o.Database_ID))return list;await sleep(125)}
  try{const r=await fetch('/api/opportunities?cloud='+Date.now(),{cache:'no-store'});const j=await r.json();const map=new Map((j.opportunities||[]).map(o=>[o.Opportunity_ID,o.Database_ID]));state.getOpps().forEach(o=>{if(!o.Database_ID)o.Database_ID=map.get(o.Opportunity_ID)||''});}catch{}
  return state.getOpps();
}
function profileInsertPayload(p,user){return{user_key:`auth:${user.id}`,auth_user_id:user.id,nationality:p.nat||null,country_of_residence:p.residence||null,age:p.age||null,education_level:p.edu||null,degree_status:null,degree_name:null,field_of_study:p.field||null,gpa:p.gpa===''||p.gpa==null?null:Number(p.gpa),graduation_year:null,work_experience_months:Number(p.expMonths||0),english_readiness:p.english||null,desired_countries:[],desired_opportunity_types:p.type&&p.type!=='Any'?[p.type]:[],funding_preferences:p.fund&&p.fund!=='Any'?[p.fund]:[]}}
function profileUpdatePayload(p){const x=profileInsertPayload(p,{id:'unused'});delete x.user_key;delete x.auth_user_id;return x}
function rowToProfile(row){return{nat:row.nationality||'',residence:row.country_of_residence||'',age:row.age??'',english:row.english_readiness||'Not specified',edu:row.education_level||'',field:row.field_of_study||'',gpa:row.gpa??'',expMonths:Number(row.work_experience_months||0),type:Array.isArray(row.desired_opportunity_types)&&row.desired_opportunity_types[0]?row.desired_opportunity_types[0]:'Any',fund:Array.isArray(row.funding_preferences)&&row.funding_preferences[0]?row.funding_preferences[0]:'Any'}}
async function query(builder){const result=await builder;if(result?.error)throw new Error(result.error.message||String(result.error));return result?.data??[]}

async function bootstrapCloud(user){
  ready=false;updateAccountUI();setCloudStatus('Connecting…','syncing');await waitForOpportunityIds();
  try{
    const rows=await query(client.from('user_passports').select('*').eq('auth_user_id',user.id).limit(1));
    if(rows?.length){passportId=rows[0].id;await loadCloudState(rows[0]);toast('Workspace restored','Your cloud Passport, shortlist and tracker are loaded on this device.')}
    else{const local=state.getProfile();const created=await query(client.from('user_passports').insert(profileInsertPayload(local,user)).select('*'));if(!created?.length)throw new Error('Could not create your cloud Passport.');passportId=created[0].id;await importLocalChildren();toast('Browser workspace imported','Your existing Passport, saves and tracker are now attached to your account.')}
    ready=true;updateAccountUI();setCloudStatus('Cloud synced','ok');state.render();renderAuth();
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
  session=null;passportId=null;ready=false;state.clear();updateAccountUI();closeAuth();try{window.showLanding?.()}catch{}toast('Signed out','The browser copy was cleared. Sign back in to restore your workspace.')
}
async function refreshSession(bootstrap=false){
  try{session=normalizeSession(await client.auth.getSession());updateAccountUI();if(session?.user&&(bootstrap||!ready))await bootstrapCloud(session.user)}catch(e){console.warn('Session check failed',e);session=null;updateAccountUI()}
}

window.OpportunityCloud={openAuth,closeAuth,setMode,emailSubmit,google,signOut,syncNow};
window.addEventListener('opportunity:statechange',scheduleSync);
mountUI();
await refreshSession(true);
