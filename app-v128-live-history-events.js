(()=>{
  const MAX_EVENTS=60;
  const snapshots=new Map();
  let ready=false,scheduled=false,writing=false;
  const source=()=>((typeof tracks==='object'&&tracks)||window.tracks||{});
  const now=()=>new Date().toISOString();
  const pretty=v=>{if(!v)return'';const d=new Date(`${v}T12:00:00`);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):String(v)};
  const clean=v=>String(v??'').trim();
  const obj=v=>v&&typeof v==='object'?v:{};
  const stable=v=>JSON.stringify(v||{});
  const meaningful=o=>Object.values(obj(o)).some(v=>clean(v));

  function ensureHistory(t){
    t.checklist??={documents:false,statement:false,references:false};
    if(!Array.isArray(t.checklist.history))t.checklist.history=[];
    return t.checklist.history;
  }
  function eventId(prefix='live'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
  function push(t,{type='system',label,detail='',fingerprint=''}){
    const list=ensureHistory(t);
    if(fingerprint&&list.some(e=>e?.fingerprint===fingerprint))return false;
    list.push({id:eventId(type),at:now(),type,label,detail,fingerprint});
    if(list.length>MAX_EVENTS)list.splice(0,list.length-MAX_EVENTS);
    return true;
  }

  function snapshot(t){
    const c=obj(t?.checklist),l=obj(c.lifecycle);
    return{
      stage:clean(t?.stage||'Saved'),
      submission:{
        submissionDate:clean(c.submission?.submissionDate),
        confirmationRef:clean(c.submission?.confirmationRef),
        note:clean(c.submission?.note),
        providerConfirmed:Boolean(c.submission?.providerConfirmed)
      },
      followUp:{date:clean(l.followUp?.date),contact:clean(l.followUp?.contact),note:clean(l.followUp?.note)},
      interview:{date:clean(l.interview?.date),time:clean(l.interview?.time),format:clean(l.interview?.format),location:clean(l.interview?.location),contact:clean(l.interview?.contact),notes:clean(l.interview?.notes)},
      offer:{date:clean(l.offer?.date),responseDeadline:clean(l.offer?.responseDeadline),notes:clean(l.offer?.notes)},
      unsuccessful:{date:clean(l.unsuccessful?.date),feedback:clean(l.unsuccessful?.feedback),learning:clean(l.unsuccessful?.learning)}
    };
  }

  function followDetail(x){
    const bits=[];
    if(x.date)bits.push(`Follow-up planned for ${pretty(x.date)}`);
    if(x.contact)bits.push(`via ${x.contact}`);
    if(x.note)bits.push('A follow-up note is saved');
    return bits.length?`${bits.join(' · ')}.`:'Follow-up details were updated.';
  }
  function interviewDetail(x){
    const bits=[];
    if(x.date)bits.push(pretty(x.date));
    if(x.time)bits.push(x.time);
    if(x.format)bits.push(x.format);
    if(x.location)bits.push(x.location);
    if(x.contact)bits.push(`Contact: ${x.contact}`);
    if(x.notes)bits.push('Preparation notes saved');
    return bits.length?`${bits.join(' · ')}.`:'Interview details were updated.';
  }
  function offerDetail(x){
    const bits=[];
    if(x.date)bits.push(`Offer recorded ${pretty(x.date)}`);
    if(x.responseDeadline)bits.push(`response due ${pretty(x.responseDeadline)}`);
    if(x.notes)bits.push('Decision notes saved');
    return bits.length?`${bits.join(' · ')}.`:'Offer details were updated.';
  }
  function outcomeDetail(x){
    const bits=[];
    if(x.date)bits.push(`Decision recorded ${pretty(x.date)}`);
    if(x.feedback)bits.push('Provider feedback saved');
    if(x.learning)bits.push('Learning notes saved');
    return bits.length?`${bits.join(' · ')}.`:'Outcome details were updated.';
  }
  function submissionDetail(x){
    const bits=[];
    if(x.submissionDate)bits.push(`Submission date ${pretty(x.submissionDate)}`);
    if(x.confirmationRef)bits.push(`reference ${x.confirmationRef}`);
    if(x.note)bits.push('submission note saved');
    return bits.length?`${bits.join(' · ')}.`:'Submission record details were updated.';
  }

  function captureOne(id,t,prev,next){
    let changed=false;
    const stageChanged=prev.stage!==next.stage;

    // Initial provider submission is already represented by the core stage event.
    // Only log later edits to an existing submission record.
    if(stable(prev.submission)!==stable(next.submission)&&meaningful(prev.submission)&&!stageChanged){
      const fp=`submission:${stable(next.submission)}`;
      changed=push(t,{type:'system',label:'Submission record updated',detail:submissionDetail(next.submission),fingerprint:fp})||changed;
    }

    if(stable(prev.followUp)!==stable(next.followUp)&&meaningful(next.followUp)){
      const existed=meaningful(prev.followUp),fp=`followup:${stable(next.followUp)}`;
      changed=push(t,{type:'system',label:existed?'Follow-up updated':'Follow-up planned',detail:followDetail(next.followUp),fingerprint:fp})||changed;
    }

    if(stable(prev.interview)!==stable(next.interview)&&meaningful(next.interview)){
      const existed=meaningful(prev.interview),fp=`interview:${stable(next.interview)}`;
      changed=push(t,{type:'milestone',label:existed?'Interview details updated':'Interview details recorded',detail:interviewDetail(next.interview),fingerprint:fp})||changed;
    }

    if(stable(prev.offer)!==stable(next.offer)&&meaningful(next.offer)){
      const existed=meaningful(prev.offer),fp=`offer:${stable(next.offer)}`;
      changed=push(t,{type:'milestone',label:existed?'Offer details updated':'Offer details recorded',detail:offerDetail(next.offer),fingerprint:fp})||changed;
    }

    if(stable(prev.unsuccessful)!==stable(next.unsuccessful)&&meaningful(next.unsuccessful)){
      const existed=meaningful(prev.unsuccessful),fp=`outcome:${stable(next.unsuccessful)}`;
      changed=push(t,{type:'system',label:existed?'Outcome notes updated':'Outcome details recorded',detail:outcomeDetail(next.unsuccessful),fingerprint:fp})||changed;
    }
    return changed;
  }

  function prime(){
    snapshots.clear();
    for(const [id,t] of Object.entries(source()))snapshots.set(id,snapshot(t));
  }

  function flush(){
    scheduled=false;if(!ready||writing)return;
    const all=source();let changed=false;
    for(const [id,t] of Object.entries(all)){
      const next=snapshot(t),prev=snapshots.get(id);
      if(prev)changed=captureOne(id,t,prev,next)||changed;
      snapshots.set(id,next);
    }
    for(const id of [...snapshots.keys()])if(!all[id])snapshots.delete(id);
    if(!changed)return;
    writing=true;
    try{
      try{typeof persist==='function'&&persist()}catch(e){console.warn('Live history persist failed',e)}
      try{window.OpportunityApplicationHistory?.refresh?.()}catch{}
      window.dispatchEvent(new CustomEvent('opportunity:statechange',{detail:{historyInternal:true}}));
    }finally{
      queueMicrotask(()=>{writing=false;prime()});
    }
  }
  function schedule(e){
    if(e?.detail?.historyInternal||writing||!ready)return;
    if(scheduled)return;scheduled=true;queueMicrotask(flush);
  }
  function hydrated(){prime();ready=true}

  window.addEventListener('opportunity:hydrated',hydrated);
  window.addEventListener('opportunity:statechange',schedule);
  // Local-only workspaces do not emit cloud hydration. Establish a quiet baseline
  // after startup, but never interpret the current state as a new event.
  setTimeout(()=>{if(!ready)hydrated()},1200);
  window.OpportunityLiveHistory={refresh:()=>{if(!ready)hydrated();else schedule()}};
})();