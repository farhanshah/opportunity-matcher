(()=>{
  const ANSWERS_KEY='oppEvidenceV42';
  const META_KEY='oppEvidenceMetaV43';
  const evidence=()=>window.OpportunityEvidence;
  const client=()=>window.OpportunityCloudClient;
  const state=()=>window.OpportunityState;
  let passportId=null,userId=null,ready=false,syncing=false,pending=false,syncTimer=null;
  let meta={};try{meta=JSON.parse(localStorage.getItem(META_KEY)||'{}')||{}}catch{meta={}}

  const hash=input=>{let h=2166136261;const s=String(input||'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return('00000000'+(h>>>0).toString(16)).slice(-8)};
  const ruleKey=c=>String(c?.rule_code||c?.label||'rule');
  const fingerprint=c=>hash([ruleKey(c),c?.label||'',c?.detail||'',c?.source_note||'',c?.source_url||'',c?.hard===false?'soft':'hard'].join('|'));
  const persistLocal=()=>{const e=evidence();if(!e)return;try{localStorage.setItem(ANSWERS_KEY,JSON.stringify(e.answers||{}));localStorage.setItem(META_KEY,JSON.stringify(meta))}catch{}};
  const unwrap=r=>{if(r?.error)throw new Error(r.error.message||String(r.error));return r?.data??r};

  function currentRuleMap(){
    const e=evidence(),s=state();const map=new Map();if(!e||!s)return map;
    for(const o of s.getOpps()||[]){if(!o?.Opportunity_ID||!o?.Database_ID)continue;let checks=[];try{checks=e.getQuestions(o)||[]}catch{}
      for(const c of checks){const rk=ruleKey(c),localKey=`${o.Opportunity_ID}|${rk}`;map.set(localKey,{localKey,opportunityId:o.Database_ID,externalId:o.Opportunity_ID,ruleKey:rk,fingerprint:fingerprint(c),questionSnapshot:c?.label||rk,evidenceKind:'Applicant evidence',sourceUrl:c?.source_url||null})}
    }
    return map;
  }

  function sanitizeLocal(){
    const e=evidence();if(!e)return false;const rules=currentRuleMap();let changed=false;
    for(const key of Object.keys(e.answers||{})){
      const current=rules.get(key);if(!current)continue;
      if(meta[key]&&meta[key]!==current.fingerprint){delete e.answers[key];delete meta[key];changed=true}
      else if(!meta[key]){meta[key]=current.fingerprint;changed=true}
    }
    if(changed)persistLocal();return changed;
  }

  async function authContext(){
    const c=client();if(!c)return null;
    try{const session=unwrap(await c.auth.getSession());const user=session?.user;if(!user)return null;const rows=unwrap(await c.from('user_passports').select('id').eq('auth_user_id',user.id).limit(1));const row=rows?.[0];if(!row)return null;return{user,passportId:row.id}}catch{return null}
  }

  async function writeOne(item,answer){
    const c=client();if(!c||!passportId)return;
    const existing=unwrap(await c.from('opportunity_evidence_answers').select('id').eq('user_passport_id',passportId).eq('opportunity_id',item.opportunityId).eq('rule_key',item.ruleKey).limit(1));
    const payload={rule_fingerprint:item.fingerprint,answer,question_snapshot:item.questionSnapshot,evidence_kind:item.evidenceKind,source_url:item.sourceUrl,updated_at:new Date().toISOString()};
    if(existing?.length)unwrap(await c.from('opportunity_evidence_answers').update(payload).eq('id',existing[0].id));
    else unwrap(await c.from('opportunity_evidence_answers').insert({user_passport_id:passportId,opportunity_id:item.opportunityId,rule_key:item.ruleKey,...payload}));
  }

  async function performSync(){
    const e=evidence();if(!ready||!passportId||!e)return;if(syncing){pending=true;return}syncing=true;
    try{sanitizeLocal();const rules=currentRuleMap();for(const [key,answer] of Object.entries(e.answers||{})){if(!['yes','no','unknown'].includes(answer))continue;const item=rules.get(key);if(!item)continue;meta[key]=item.fingerprint;await writeOne(item,answer)}persistLocal();patchStatus()}
    catch(err){console.warn('Evidence cloud sync skipped',err)}finally{syncing=false;if(pending){pending=false;performSync()}}
  }
  function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(performSync,450)};

  async function hydrate(){
    const e=evidence(),c=client(),s=state();if(!e||!c||!s)return false;
    const ctx=await authContext();if(!ctx)return false;passportId=ctx.passportId;userId=ctx.user.id;
    try{
      const rules=currentRuleMap();sanitizeLocal();
      const rows=unwrap(await c.from('opportunity_evidence_answers').select('opportunity_id,rule_key,rule_fingerprint,answer,updated_at').eq('user_passport_id',passportId));
      const byCloud=new Map();for(const item of rules.values())byCloud.set(`${item.opportunityId}|${item.ruleKey}`,item);
      let changed=false;
      for(const row of rows||[]){const current=byCloud.get(`${row.opportunity_id}|${row.rule_key}`);if(!current||row.rule_fingerprint!==current.fingerprint)continue;const key=current.localKey;if(e.answers[key]!==row.answer){e.answers[key]=row.answer;changed=true}meta[key]=current.fingerprint}
      persistLocal();ready=true;
      if(changed){try{window.renderAll?.()}catch{try{state().render()}catch{}}}
      await performSync();patchStatus();return true;
    }catch(err){console.warn('Evidence cloud restore skipped',err);return false}
  }

  function patchStatus(){
    document.querySelectorAll('.adaptiveEvidence .evidenceLocal').forEach(el=>{el.textContent=ready?'Cloud-synced to your Opportunity account. These answers follow you across signed-in devices.':'Stored on this device for now. Sign in to sync opportunity-specific evidence across devices.'});
  }

  function wrapAnswerSetter(){
    if(window.setEvidenceAnswer?.__cloudWrapped)return true;
    const original=window.setEvidenceAnswer;if(typeof original!=='function')return false;
    const wrapped=function(oppId,rk,value){const result=original.apply(this,arguments);const rules=currentRuleMap(),item=rules.get(`${oppId}|${rk}`);if(item){meta[item.localKey]=item.fingerprint;persistLocal()}scheduleSync();setTimeout(patchStatus,0);return result};
    wrapped.__cloudWrapped=true;window.setEvidenceAnswer=wrapped;try{setEvidenceAnswer=wrapped}catch{}return true;
  }

  function wrapDetail(){
    if(window.openDetail?.__evidenceCloudWrapped)return true;const original=window.openDetail;if(typeof original!=='function')return false;
    const wrapped=function(){const r=original.apply(this,arguments);setTimeout(patchStatus,0);return r};wrapped.__evidenceCloudWrapped=true;window.openDetail=wrapped;try{openDetail=wrapped}catch{}return true;
  }

  function wrapSignOut(){
    const cloud=window.OpportunityCloud;if(!cloud||cloud.signOut?.__evidenceCloudWrapped)return !!cloud;const original=cloud.signOut;if(typeof original!=='function')return false;
    const wrapped=async function(){try{return await original.apply(this,arguments)}finally{const e=evidence();if(e){for(const k of Object.keys(e.answers||{}))delete e.answers[k]}meta={};passportId=null;userId=null;ready=false;try{localStorage.removeItem(ANSWERS_KEY);localStorage.removeItem(META_KEY)}catch{}patchStatus()}};wrapped.__evidenceCloudWrapped=true;cloud.signOut=wrapped;return true;
  }

  let tries=0;const boot=setInterval(async()=>{tries++;wrapAnswerSetter();wrapDetail();wrapSignOut();if(await hydrate()||tries>60)clearInterval(boot)},300);
  window.addEventListener('focus',()=>{wrapSignOut();hydrate()});
  window.OpportunityEvidenceCloud={syncNow:performSync,hydrate,status:()=>({ready,passportId,userId})};
})();
