/* OppMatcher Orbital Command 2.0: original progressive visual enhancement, not a ThreeUI component. */
(()=>{
  'use strict';
  const root=document.documentElement;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const stage=document.getElementById('ovStage');
  const cards=stage?[...stage.querySelectorAll('.ovCard')]:[];
  const count=cards.length;
  let active=0;
  let paused=false;
  let stageVisible=true;
  let rotationTimer=null;
  const prev=document.getElementById('ovPrev'), next=document.getElementById('ovNext'), pause=document.getElementById('ovPause');
  const counter=document.getElementById('ovCounter');
  function drawCards(){
    cards.forEach((card,i)=>{
      let delta=(i-active+count)%count;
      if(delta>count/2)delta-=count;
      card.dataset.offset=String(delta);
      const visible=Math.abs(delta)<=1;
      card.setAttribute('aria-hidden',visible?'false':'true');
      card.tabIndex=visible?0:-1;
      card.setAttribute('aria-current',delta===0?'true':'false');
    });
    if(counter)counter.textContent=String(active+1).padStart(2,'0')+' / '+String(count).padStart(2,'0');
  }
  function go(index){
    if(!count)return;
    active=(Number(index)+count)%count;
    drawCards();
    schedule();
  }
  function schedule(){
    if(rotationTimer){clearTimeout(rotationTimer);rotationTimer=null;}
    if(!count||reduce.matches||paused||document.hidden||!stageVisible)return;
    rotationTimer=setTimeout(()=>go(active+1),6800);
  }
  if(count){
    drawCards();
    prev?.addEventListener('click',()=>go(active-1));
    next?.addEventListener('click',()=>go(active+1));
    pause?.addEventListener('click',()=>{
      paused=!paused;
      pause.textContent=paused?'▶':'Ⅱ';
      pause.setAttribute('aria-label',paused?'Resume rotating photographs':'Pause rotating photographs');
      pause.setAttribute('aria-pressed',String(paused));
      schedule();
    });
    cards.forEach((card,i)=>card.addEventListener('click',e=>{
      if(Math.abs(Number(card.dataset.offset))>0){e.preventDefault();go(i);}
    }));
    stage?.addEventListener('pointermove',e=>{
      if(reduce.matches||e.pointerType==='touch')return;
      const b=stage.getBoundingClientRect();
      stage.style.setProperty('--ov-mx',((e.clientX-b.left)/b.width-.5).toFixed(2));
      stage.style.setProperty('--ov-my',((e.clientY-b.top)/b.height-.5).toFixed(2));
    },{passive:true});
    stage?.addEventListener('pointerleave',()=>{
      stage.style.setProperty('--ov-mx','0');
      stage.style.setProperty('--ov-my','0');
    });
    stage?.addEventListener('focusin',()=>{stageVisible=true;schedule()});
    stage?.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'){e.preventDefault();go(active+1);}
      if(e.key==='ArrowLeft'){e.preventDefault();go(active-1);}
    });
    if('IntersectionObserver' in window){
      new IntersectionObserver(entries=>{stageVisible=entries[0]?.isIntersecting??true;schedule()},{threshold:.05}).observe(stage);
    }
    document.addEventListener('visibilitychange',schedule);
    reduce.addEventListener('change',schedule);
    schedule();
  }
  // Transparent page-position indicator, independent of all application navigation.
  const rail=document.createElement('div');
  rail.className='ovScrollProgress';rail.setAttribute('aria-hidden','true');document.body.appendChild(rail);
  let progressQueued=false;
  function updateProgress(){
    progressQueued=false;
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    rail.style.transform='scaleX('+Math.max(0,Math.min(1,scrollY/max))+')';
    rail.hidden=Boolean(document.getElementById('app')&&!document.getElementById('app').classList.contains('hide'));
  }
  addEventListener('scroll',()=>{if(!progressQueued){progressQueued=true;requestAnimationFrame(updateProgress)}},{passive:true});
  addEventListener('resize',updateProgress,{passive:true});
  updateProgress();
  // Motion on entry is visual only. Content is never hidden waiting for JavaScript.
  if(!reduce.matches&&'IntersectionObserver' in window){
    const observed=document.querySelectorAll('#landing .omTrustCard,#landing .omSeoExplore .card,#landing .feature,#landing .guideCard');
    const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{
      if(!e.isIntersecting)return;
      reveal.unobserve(e.target);
      if(typeof e.target.animate==='function'){
        e.target.animate([{transform:'translateY(18px)',filter:'blur(2px)'},{transform:'none',filter:'none'}],{duration:550,easing:'cubic-bezier(.16,1,.3,1)'});
      }
    }),{rootMargin:'0px 0px -36px 0px',threshold:.08});
    observed.forEach(el=>reveal.observe(el));
  }
  // A canvas globe makes a useful destination illustration without claiming real-time availability.
  const canvas=document.getElementById('ovGlobe');
  if(canvas){
    const ctx=canvas.getContext('2d',{alpha:true});
    if(ctx){
      let width=0,height=0,angle=-0.7,drag=false,lastX=0,frame=0,globeVisible=true;
      const spots=[];
      // Hand-designed low-poly geography approximation. This is decorative only; country links are HTML.
      const polygons=[
        [[-165,60],[-150,70],[-125,72],[-111,62],[-96,51],[-83,49],[-77,35],[-95,14],[-107,22],[-121,33],[-128,47]],
        [[-78,12],[-64,9],[-50,-2],[-47,-15],[-56,-37],[-68,-55],[-76,-35],[-80,-10]],
        [[-15,36],[7,36],[37,30],[48,11],[40,-10],[28,-34],[12,-35],[-1,-15],[-16,11]],
        [[-11,57],[9,71],[43,68],[69,75],[112,64],[147,57],[164,47],[143,24],[114,5],[90,14],[69,23],[51,35],[36,30],[14,41],[3,56]],
        [[110,-10],[152,-11],[154,-27],[138,-40],[116,-35]],
        [[-45,60],[-42,81],[-19,84],[-18,62]]
      ];
      function inside(pt,poly){
        let c=false;
        for(let i=0,j=poly.length-1;i<poly.length;j=i++){
          const yi=poly[i][1], yj=poly[j][1], xi=poly[i][0],xj=poly[j][0];
          if((yi>pt[1])!==(yj>pt[1]) && pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)c=!c;
        }
        return c;
      }
      for(let lat=-78;lat<=80;lat+=4){
        for(let lon=-175;lon<=180;lon+=4){
          if(polygons.some(poly=>inside([lon,lat],poly)))spots.push([lat*Math.PI/180,lon*Math.PI/180]);
        }
      }
      const rad=Math.PI/180;
      function resize(){
        const dpr=Math.min(2,window.devicePixelRatio||1);
        const bounds=canvas.getBoundingClientRect();
        width=Math.max(1,bounds.width);height=Math.max(1,bounds.height);
        canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
        ctx.setTransform(dpr,0,0,dpr,0,0);
      }
      const project=(lat,lon,r,cx,cy)=>{
        const lambda=lon+angle;
        const cos=Math.cos(lat);
        return [cx+r*cos*Math.sin(lambda),cy-r*Math.sin(lat),cos*Math.cos(lambda)];
      };
      function render(){
        ctx.clearRect(0,0,width,height);
        const cx=width/2,cy=height/2,r=Math.min(width,height)*.405;
        const halo=ctx.createRadialGradient(cx-r*.2,cy-r*.25,r*.1,cx,cy,r*1.35);
        halo.addColorStop(0,'#3ce1d42d');halo.addColorStop(.55,'#0c678452');halo.addColorStop(1,'#06344200');
        ctx.fillStyle=halo;ctx.beginPath();ctx.arc(cx,cy,r*1.28,0,Math.PI*2);ctx.fill();
        const sphere=ctx.createRadialGradient(cx-r*.35,cy-r*.4,0,cx,cy,r);
        sphere.addColorStop(0,'#17596a');sphere.addColorStop(.63,'#092c43');sphere.addColorStop(1,'#021520');
        ctx.fillStyle=sphere;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
        ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
        ctx.lineWidth=.65;ctx.strokeStyle='#5de8dd38';
        for(let lat=-75;lat<=75;lat+=15){
          ctx.beginPath();let on=false;
          for(let lon=-180;lon<=180;lon+=3){
            const p=project(lat*rad,lon*rad,r,cx,cy);
            if(p[2]>0){if(!on){ctx.moveTo(p[0],p[1]);on=true}else ctx.lineTo(p[0],p[1]);}else on=false;
          }ctx.stroke();
        }
        for(let lon=-180;lon<180;lon+=15){
          ctx.beginPath();let on=false;
          for(let lat=-88;lat<=88;lat+=3){
            const p=project(lat*rad,lon*rad,r,cx,cy);
            if(p[2]>0){if(!on){ctx.moveTo(p[0],p[1]);on=true}else ctx.lineTo(p[0],p[1]);}else on=false;
          }ctx.stroke();
        }
        for(const pt of spots){
          const p=project(pt[0],pt[1],r,cx,cy);
          if(p[2]<=0)continue;
          ctx.fillStyle=p[2]>.5?'#89f9df':'#3cb7b7';
          ctx.globalAlpha=.3+.7*p[2];
          ctx.beginPath();ctx.arc(p[0],p[1],Math.max(.55,1.1*p[2]),0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;ctx.restore();
        ctx.lineWidth=1.5;ctx.strokeStyle='#65f9df80';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='#a0ffff49';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(cx,cy,r*1.15,r*.42,-.31,0,Math.PI*2);ctx.stroke();
        // Fiction-free destination points: illustrative geography labels are in real accessible links.
        [[51,-.1],[35,139],[40,-74],[-33,151]].forEach(([lat,lon])=>{
          const p=project(lat*rad,lon*rad,r,cx,cy);
          if(p[2]>.12){
            ctx.strokeStyle='#85ffdb77';ctx.lineWidth=1;
            ctx.beginPath();ctx.arc(p[0],p[1],6.5,0,Math.PI*2);ctx.stroke();
            ctx.fillStyle='#c0ffe9';ctx.beginPath();ctx.arc(p[0],p[1],2.4,0,Math.PI*2);ctx.fill();
          }
        });
        if(globeVisible&&!document.hidden&&!reduce.matches&&!drag){angle+=.0018;}
        if(globeVisible&&!document.hidden&&!reduce.matches){frame=requestAnimationFrame(render)}else{frame=0;}
      }
      function start(){
        if(frame||!globeVisible)return;
        resize();render();
      }
      canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;canvas.setPointerCapture?.(e.pointerId)});
      canvas.addEventListener('pointermove',e=>{if(!drag)return;angle+=(e.clientX-lastX)*.006;lastX=e.clientX;if(reduce.matches){resize();render()}});
      canvas.addEventListener('pointerup',()=>{drag=false});canvas.addEventListener('pointercancel',()=>{drag=false});
      addEventListener('resize',()=>{resize();if(reduce.matches)render()},{passive:true});
      if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
        globeVisible=Boolean(entries[0]?.isIntersecting);
        if(globeVisible)start();else if(frame){cancelAnimationFrame(frame);frame=0}
      },{threshold:.02}).observe(canvas);
      document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0}else start()});
      reduce.addEventListener('change',()=>{if(frame){cancelAnimationFrame(frame);frame=0}if(reduce.matches){resize();render()}else start()});
      resize();if(reduce.matches)render();else start();
    }
  }
})();
