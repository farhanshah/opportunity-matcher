'use strict';

/* Read-only, standalone visual prototype. No user records, API calls or persistence. */
const WorkspacePreviewModel=(()=>{
  const STAGES=['Planning','Preparing','Submitted','Interview','Offer received'];
  const LANES=['Planning','Preparing','Submitted','Outcome'];
  const TASKS=['Documents','Personal statement','References'];
  const EXAMPLES=[
    {id:'demo-scholarship',title:'Illustrative graduate scholarship',provider:'Sample university · fictional',
      kind:'Scholarship',place:'Europe',funding:'Funding to confirm',stage:'Preparing',saved:true,
      tasks:{Documents:true,'Personal statement':false,References:false}},
    {id:'demo-fellowship',title:'Example research fellowship',provider:'Illustrative foundation · fictional',
      kind:'Fellowship',place:'International',funding:'See provider rules',stage:'Planning',saved:true,
      tasks:{Documents:false,'Personal statement':false,References:false}},
    {id:'demo-internship',title:'Sample early-career internship',provider:'Example organisation · fictional',
      kind:'Internship',place:'United Kingdom',funding:'Depends on vacancy',stage:'Submitted',saved:true,
      tasks:{Documents:true,'Personal statement':true,References:true}},
    {id:'demo-exchange',title:'Illustrative student exchange',provider:'Sample exchange scheme · fictional',
      kind:'Exchange',place:'Asia',funding:'Details unconfirmed',stage:'Interview',saved:false,
      tasks:{Documents:true,'Personal statement':true,References:false}},
    {id:'demo-award',title:'Example academic award',provider:'Fictional award committee',
      kind:'Scholarship',place:'North America',funding:'Provider terms required',stage:'Offer received',saved:true,
      tasks:{Documents:true,'Personal statement':true,References:true}}
  ];
  const copy=()=>{
    return EXAMPLES.map(o=>({...o,tasks:{...o.tasks}}));
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
  const laneOf=s=>s==='Planning'?'Planning':s==='Preparing'?'Preparing':
    s==='Offer received'?'Outcome':'Submitted';
  const isSubmitted=s=>['Submitted','Interview','Offer received'].includes(s);
  const stats=records=>{
    const saved=records.filter(x=>x.saved).length;
    const submitted=records.filter(x=>isSubmitted(x.stage)).length;
    const tasks=records.reduce((acc,x)=>acc+TASKS.filter(k=>x.tasks[k]).length,0);
    return {saved,tracked:records.length,submitted,tasks,totalTasks:records.length*TASKS.length};
  };
  const countByLane=(records,lane)=>records.filter(x=>laneOf(x.stage)===lane).length;
  const savedMatches=(records,term='',kind='all')=>records.filter(x=>x.saved&&
      (kind==='all'||x.kind===kind)&&
      [x.title,x.provider,x.place].join(' ').toLowerCase().includes(term.trim().toLowerCase()));
  const byId=(records,id)=>records.find(x=>x.id===id);
  const setStage=(records,id,stage)=>{
    const x=byId(records,id);
    if(!x||!STAGES.includes(stage))return false;
    x.stage=stage;return true;
  };
  const setTask=(records,id,key,checked)=>{
    const x=byId(records,id);
    if(!x||!TASKS.includes(key))return false;
    x.tasks[key]=Boolean(checked);return true;
  };
  const setSaved=(records,id,saved)=>{
    const x=byId(records,id);if(!x)return false;x.saved=Boolean(saved);return true;
  };
  const taskCount=r=>TASKS.filter(k=>r.tasks[k]).length;
  const filterTracker=(records,view)=>{
    if(view==='all')return records;
    if(view==='Planning'||view==='Preparing')return records.filter(x=>x.stage===view);
    if(view==='Submitted')return records.filter(x=>['Submitted','Interview'].includes(x.stage));
    if(view==='Outcome')return records.filter(x=>x.stage==='Offer received');
    return records;
  };
  return {EXAMPLES,STAGES,LANES,TASKS,copy,esc,laneOf,isSubmitted,stats,countByLane,savedMatches,
    byId,setStage,setTask,setSaved,taskCount,filterTracker};
})();

if(typeof document!=='undefined')(()=>{
  const M=WorkspacePreviewModel,$=id=>document.getElementById(id);
  let records=M.copy();
  let activeView='dashboard';
  const viewCopy={
    dashboard:{title:"A clearer view of<br><em>what's next.</em>",
      sub:'Your possibilities, priorities and progress — organized in one beautiful workspace.'},
    saved:{title:"Your shortlist.<br><em>Your possibilities.</em>",
      sub:'Keep track of the programmes worth a closer look.'},
    tracker:{title:"Every step.<br><em>Forward.</em>",
      sub:'Follow your application journey from research to outcome.'}
  };
  const cardSymbol={Scholarship:'✦',Internship:'↗',Fellowship:'◎',Exchange:'⌘'};
  const htmlValue=v=>M.esc(v);
  function renderView(){
    document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==activeView);
    document.querySelectorAll('[data-view]').forEach(link=>{
      const yes=link.dataset.view===activeView;link.classList.toggle('active',yes);
      if(yes)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
    $('pageHeading').innerHTML=viewCopy[activeView].title;
    $('pageSubheading').textContent=viewCopy[activeView].sub;
    renderDashboard();renderSaved();renderTracker();
  }
  function renderDashboard(){
    const metrics=M.stats(records);
    $('statSaved').textContent=String(metrics.saved);
    $('statTracked').textContent=String(metrics.tracked);
    $('statSubmitted').textContent=String(metrics.submitted);
    $('statTasks').textContent=metrics.tasks+'/'+metrics.totalTasks;
    const priority=records.filter(x=>M.taskCount(x)<M.TASKS.length&&
      x.stage!=='Offer received').slice(0,4);
    $('priorityActions').innerHTML=priority.length?priority.map(x=>{
      const pending=M.TASKS.find(t=>!x.tasks[t]);
      return '<div class="priorityItem"><span class="priorityIcon">✓</span><div><strong>'+
        htmlValue(pending+' · '+x.title)+'</strong><small>'+htmlValue(x.stage)+
        ' · sample task</small></div><a href="#tracker">Open ↗</a></div>';
    }).join(''):'<p class="microcopy">All example checklists are complete.</p>';
    const max=Math.max(1,...M.LANES.map(lane=>M.countByLane(records,lane)));
    $('pipelineBars').innerHTML=M.LANES.map(lane=>{
      const n=M.countByLane(records,lane),pct=Math.round(n/max*100);
      return '<div class="pipelineBar"><span>'+htmlValue(lane)+'</span><div class="bar"><i style="width:'+
        pct+'%"></i></div><b>'+n+'</b></div>';
    }).join('');
    $('recentActivity').innerHTML=records.slice(0,4).map(x=>
      '<div class="recentRow"><span class="recentIcon">'+htmlValue(cardSymbol[x.kind]||'✦')+'</span>'+
      '<div><strong>'+htmlValue(x.title)+'</strong><small>'+htmlValue(x.provider)+'</small></div>'+
      '<span class="stageChip">'+htmlValue(x.stage)+'</span><a href="#tracker">View ↗</a></div>').join('');
  }
  function renderSaved(){
    const items=M.savedMatches(records,$('savedSearch').value,$('savedType').value);
    const total=M.stats(records).saved;
    $('savedCountLabel').textContent=items.length+' shown · '+total+' saved examples';
    $('savedCards').innerHTML=items.map(x=>
      '<article class="savedCard"><div class="cardTopline"><span class="kindTag">'+
      htmlValue(x.kind)+'</span><button type="button" class="bookmarkButton" aria-pressed="true" '+
      'data-remove="'+htmlValue(x.id)+'" aria-label="Remove demo bookmark for '+htmlValue(x.title)+'">★</button></div>'+
      '<h3>'+htmlValue(x.title)+'</h3><p>'+htmlValue(x.provider)+'</p>'+
      '<div class="savedMeta"><span>'+htmlValue(x.place)+'</span><span>'+htmlValue(x.funding)+
      '</span></div><div class="savedBottom"><span>Sample · provider verification required</span>'+
      '<a href="#tracker">View tracker ↗</a></div></article>'
    ).join('');
    $('savedEmpty').hidden=items.length>0;
  }
  function renderTracker(){
    const shown=M.filterTracker(records,$('trackerFilter').value);
    $('trackedCount').textContent=shown.length+' sample applications';
    $('trackerBoard').innerHTML=M.LANES.map(lane=>{
      const entries=shown.filter(x=>M.laneOf(x.stage)===lane);
      return '<section class="lane" aria-label="'+htmlValue(lane)+' applications">'+
        '<div class="laneHead"><strong>'+htmlValue(lane)+'</strong><span>'+entries.length+'</span></div>'+
        (entries.length?entries.map(x=>{
          const done=M.taskCount(x);
          return '<article class="demoCard"><span>'+htmlValue(x.kind)+' · EXAMPLE</span>'+
            '<h3>'+htmlValue(x.title)+'</h3><p>'+htmlValue(x.provider)+'</p>'+
            '<div class="stageSelect"><label for="stage-'+htmlValue(x.id)+'">Stage</label>'+
            '<select id="stage-'+htmlValue(x.id)+'" data-stage="'+htmlValue(x.id)+'">'+
            M.STAGES.map(stage=>'<option value="'+htmlValue(stage)+'"'+
            (stage===x.stage?' selected':'')+'>'+htmlValue(stage)+'</option>').join('')+
            '</select></div><div class="taskList">'+
            M.TASKS.map(task=>'<label><input type="checkbox" data-task="'+htmlValue(x.id)+
              '" data-task-name="'+htmlValue(task)+'" '+(x.tasks[task]?'checked':'')+
              '><span>'+htmlValue(task)+'</span></label>').join('')+
            '<div class="taskProgress" aria-label="'+done+' of 3 demo tasks done">'+
            '<span style="width:'+Math.round(done/3*100)+'%"></span></div></div></article>';
        }).join(''):'<p class="laneEmpty">No example applications at this stage.</p>')+'</section>';
    }).join('');
    const totals=M.stats(records);
    $('checklistSummary').innerHTML='<div class="taskSummary"><span>Example checklist progress</span>'+
      '<div class="bar"><i style="width:'+Math.round(totals.tasks/Math.max(totals.totalTasks,1)*100)+
      '%"></i></div><strong>'+totals.tasks+' / '+totals.totalTasks+'</strong></div>';
  }
  function readHash(){
    const view=window.location.hash.replace('#','');
    activeView=['dashboard','saved','tracker'].includes(view)?view:'dashboard';
    renderView();
    closeSidebar();
  }
  const sidebar=$('sidebar'),overlay=$('sideScrim'),open=$('openMenu');
  function closeSidebar(){
    sidebar.classList.remove('open');overlay.hidden=true;
    open.setAttribute('aria-expanded','false');
  }
  function showSidebar(){
    sidebar.classList.add('open');overlay.hidden=false;
    open.setAttribute('aria-expanded','true');
  }
  function reset(){
    records=M.copy();
    $('savedSearch').value='';$('savedType').value='all';$('trackerFilter').value='all';
    renderView();
  }
  function init(){
    window.addEventListener('hashchange',readHash);
    $('resetDemo').addEventListener('click',reset);
    $('savedSearch').addEventListener('input',renderSaved);
    $('savedType').addEventListener('change',renderSaved);
    $('trackerFilter').addEventListener('change',renderTracker);
    $('clearSavedSearch').addEventListener('click',()=>{
      $('savedSearch').value='';$('savedType').value='all';renderSaved();
    });
    $('savedCards').addEventListener('click',event=>{
      const button=event.target.closest('[data-remove]');
      if(!button)return;
      if(M.setSaved(records,button.dataset.remove,false))renderView();
    });
    $('trackerBoard').addEventListener('change',event=>{
      const select=event.target.closest('[data-stage]');
      if(select){if(M.setStage(records,select.dataset.stage,select.value))renderView();return;}
      const check=event.target.closest('[data-task]');
      if(check)if(M.setTask(records,check.dataset.task,check.dataset.taskName,check.checked))renderView();
    });
    $('openMenu').addEventListener('click',showSidebar);
    $('closeMenu').addEventListener('click',closeSidebar);
    overlay.addEventListener('click',closeSidebar);
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSidebar()});
    readHash();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
