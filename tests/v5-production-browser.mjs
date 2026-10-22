import { chromium } from 'playwright';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const base='https://oppmatcher.tech';
const publisher='ca-pub-1916126969266611';
const errors=[];let passed=0;
const check=(ok,label,info='')=>{if(ok)passed++;else errors.push({label,info:String(typeof info==='string'?info:JSON.stringify(info)).slice(0,500)})};
await mkdir('v5-public-screens',{recursive:true});
const browser=await chromium.launch({headless:true});
for(const width of [360,390,768,1280,1440]){
 const page=await browser.newPage({viewport:{width,height:844}});
 const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
 try{
  const r=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
  check(r?.status()===200,width+' public homepage 200',r?.status());
  await page.locator('.omLandingMenu').waitFor({state:'visible',timeout:45000});
  await page.waitForFunction(()=>typeof window.setView==='function',{timeout:45000});
  const state=await page.evaluate(()=>{
   const n=document.querySelector('#landing .heroWrap>.nav');
   const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};
   const brand=n.querySelector('.brandword');
   const cta=n.querySelector('button.btnPrimary');
   const secondary=document.querySelector('.hero .heroActions .btnGhost');
   const menu=n.querySelector('.omLandingMenu');
   return {nav:box(n),brand:box(brand),menu:box(menu),cta:box(cta),
    scroll:document.documentElement.scrollWidth,viewport:innerWidth,
    brandColor:getComputedStyle(brand).color,ctaColor:getComputedStyle(cta).color,
    secondaryColor:getComputedStyle(secondary).color,
    googleScripts:[...document.scripts].filter(s=>s.src.includes('pagead2.googlesyndication.com')).length,
    publisherFound:[...document.scripts].some(s=>s.src.includes('client=ca-pub-1916126969266611')),
    themeControls:n.querySelectorAll('.omThemeToggle').length
   };
  });
  check(state.scroll<=width+6,width+' no horizontal overflow',state);
  check(state.nav.h<=192,width+' navigation compact',state.nav);
  check(state.brandColor==='rgb(244, 255, 253)',width+' brand readable',state.brandColor);
  check(state.secondaryColor==='rgb(239, 255, 251)',width+' secondary button readable',state.secondaryColor);
  check(state.ctaColor==='rgb(8, 45, 46)',width+' CTA contrast',state.ctaColor);
  check(state.publisherFound&&state.googleScripts===1,width+' AdSense present exactly once');
  check(state.menu.right<=state.nav.right+4,width+' menu within nav');
  const drop=page.locator('.omLandingMenu');
  await drop.click();
  check(await page.locator('#landing .navlinks a[href="/blog/"]').isVisible(),width+' dropdown opens');
  await page.keyboard.press('Escape');
  check(await drop.getAttribute('aria-expanded')==='false',width+' escape dismisses menu');
  if(width===390||width===1440)await page.screenshot({path:join('v5-public-screens',width+'-home.png'),animations:'disabled'});
  // Existing theme system cycles Auto -> Light -> Dark (or equivalent).
  const btn=page.locator('#landing .nav .omThemeToggle').first();
  if(await btn.count()){
   let colors=[];
   for(let i=0;i<3;i++){
    await btn.click();
    colors.push(await page.locator('#landing .heroActions .btnGhost').evaluate(e=>getComputedStyle(e).color));
   }
   check(colors.every(c=>c==='rgb(239, 255, 251)'),width+' clear secondary CTA in all three themes',colors);
  }
  check(jsErrors.length===0,width+' no uncaught JS exceptions',jsErrors);
 }catch(e){errors.push({label:width+' home fatal',info:String(e.stack||e).slice(0,900)})}finally{await page.close();}
}
const paths=[
['/blog/','blog'],['/blog/fully-funded-scholarships-international-students/','article'],
['/blog/international-internships-graduate-placements/','article'],
['/blog/methodology/','article'],
['/blog/scholarship-application-documents/','article'],
['/blog/scholarship-eligibility-checklist/','article'],
['/privacy','privacy'],['/admin','admin'],['/prepare','prepare']
];
for(const [url,type] of paths){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 try{
  const r=await page.goto(base+url,{waitUntil:'load',timeout:30000});
  check(r?.status()===200,url+' public route reachable',r?.status());
  const state=await page.evaluate(()=>{
   const root=document.documentElement,ads=[...document.scripts].filter(x=>x.src.includes('pagead2.googlesyndication.com'));
   return {scroll:root.scrollWidth,viewport:innerWidth,ads:ads.length,
    googleId:ads[0]?.src.includes('ca-pub-1916126969266611')||false,
    companion:root.classList.contains('omSecondary'),
    secondaryBrand:getComputedStyle(root).getPropertyValue('--brand-teal').trim(),
    navMenu:!!document.querySelector('.omAuxMenu'),
    canonical:document.querySelector('link[rel="canonical"]')?.href||''};
  });
  check(state.scroll<=state.viewport+8,url+' no horizontal overflow',state);
  check(state.ads===(type==='admin'||type==='prepare'?0:1),url+' ads only on public pages',state);
  if(state.ads)check(state.googleId,url+' expected AdSense publisher ID');
  if(['admin','prepare','privacy'].includes(type))check(state.companion&&state.secondaryBrand==='#51e7d6',url+' shared companion theme',state);
  if(type==='article'||type==='blog'||type==='privacy'){
   const menu=page.locator('.omAuxMenu');
   await menu.waitFor({state:'visible',timeout:9000});
   await menu.click();
   check(await menu.getAttribute('aria-expanded')==='true',url+' companion dropdown works');
   await page.keyboard.press('Escape');
   check(await menu.getAttribute('aria-expanded')==='false',url+' dropdown dismisses');
  }
  if(url==='/blog/'||url==='/privacy'||url==='/admin'||url==='/prepare')
   await page.screenshot({path:join('v5-public-screens',type+'-phone.png'),animations:'disabled',fullPage:false});
 }catch(e){errors.push({label:url+' route fatal',info:String(e.stack||e).slice(0,800)})}finally{await page.close()}
}
await browser.close();
console.log(JSON.stringify({passed,failed:errors.length,errors},null,2));
if(errors.length)process.exitCode=1;
