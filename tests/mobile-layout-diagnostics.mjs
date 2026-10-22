import { chromium } from 'playwright';
const origin='https://oppmatcher.tech/';
const browser=await chromium.launch({headless:true});
const results=[];
for(const width of [320,360,390,430,768]){
 const page=await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>typeof window.showApp==='function'&&typeof window.setView==='function',{timeout:45000});
  for(const view of ['landing','discover','saved','tracker','dashboard','auth','passport']){
   if(view!=='landing'){
    await page.evaluate(v=>{
     window.showApp();
     if(['discover','saved','tracker','dashboard'].includes(v))window.setView(v);
     if(v==='auth')window.OpportunityCloud?.openAuth?.();
     if(v==='passport')window.openOnboard?.(false);
    },view);
   }
   if(view==='auth')await page.waitForFunction(()=>typeof window.OpportunityCloud?.openAuth==='function',{timeout:18000}).catch(()=>{});
   await page.waitForTimeout(200);
   let d=await page.evaluate(v=>{
    const root=document.documentElement;
    const screen=innerWidth;
    const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.height>0&&r.width>0};
    const overflowing=[...document.querySelectorAll('body *')].filter(e=>visible(e)).map(e=>{
      const r=e.getBoundingClientRect();
      if(r.right>screen+5||r.left< -5) return {tag:e.tagName.toLowerCase(),css: typeof e.className==='string'?e.className.slice(0,65):'',id:e.id,txt:(e.innerText||'').slice(0,44).replace(/\s+/g,' '),x:Math.round(r.x),right:Math.round(r.right),w:Math.round(r.width)};
    }).filter(x=>x&&x.w<10000).sort((a,b)=>b.right-a.right).slice(0,18);
    const get=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect(),st=getComputedStyle(e);return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),display:st.display,grid:st.gridTemplateColumns,overflow:st.overflowX}};
    return {view:v,scroll:root.scrollWidth,width:screen,overflowing,selectors:Object.fromEntries(['#landing .nav','#landing .navlinks','#landing .heroWrap>.nav .btnPrimary','#landing .hero','#landing .heroVisual','#landing .featureGrid','#landing .sourceMarquee','#landing .sourceTrack','#landing .liveGrid','#landing .guideGrid','.app .appTop','.app .topRight','.app .omMobileMenu','.app .appBody','.app .focusCard','.app .trackerBoard','.app .discoverLayout','#onboard .modalBox','#cloudAuthCard'].map(s=>[s,get(s)]).filter(x=>x[1]))};
   },view);
   results.push({width,...d});
   if(view==='auth')await page.evaluate(()=>window.OpportunityCloud?.closeAuth?.());
   if(view==='passport')await page.evaluate(()=>window.closeOnboard?.());
  }
 }catch(e){results.push({width,error:String(e).slice(0,400)});}
 await page.close();
}
await browser.close();
for(const x of results) console.log('MOBILE_DIAG '+JSON.stringify(x));
