import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import {join} from 'node:path';
const origin='https://oppmatcher.tech';
const issues=[];let passed=0;
const check=(ok,label,value)=>{if(ok)passed++;else issues.push({label,value})};
const browser=await chromium.launch({headless:true});
await mkdir('v5-screens',{recursive:true});
for(const width of [360,390,768,1100,1440]){
 const page=await browser.newPage({viewport:{width,height:850}});
 const errors=[];page.on('pageerror',x=>errors.push(x.message));
 try{
  const r=await page.goto(origin+'/nav-contrast-preview-v5.html',{waitUntil:'load',timeout:35000});
  check(r?.status()===200,width+' staging page 200',r?.status());
  await page.locator('#landing .omLandingMenu').waitFor({state:'visible',timeout:25000});
  await page.waitForFunction(()=>typeof window.showApp==='function',{timeout:40000});
  const pre=await page.evaluate(()=>{
   const d=document.querySelector('#landing .heroWrap>.nav');
   const sel=s=>d.querySelector(s),rect=x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};
   const account=sel('.cloudAccountBtn'),menu=sel('.omLandingMenu'),cta=sel('.btnPrimary'),brand=sel('.brandword');
   const secondary=document.querySelector('#landing .heroActions .btnGhost');
   return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,
    nav:rect(d),brand:rect(brand),menu:rect(menu),cta:rect(cta),
    account:account?rect(account):null,
    brandColor:getComputedStyle(brand).color,
    ctaColor:getComputedStyle(cta).color,
    secondaryColor:getComputedStyle(secondary).color,
    secondaryBg:getComputedStyle(secondary).backgroundColor,
    themeCount:[...d.querySelectorAll('button')].filter(x=>/(light|dark|auto)/i.test(x.textContent)).length
   };
  });
  check(pre.scroll<=width+5,width+' no document overflow',pre);
  check(pre.nav.h<=190,width+' compact nav',pre.nav);
  check(pre.brandColor==='rgb(244, 255, 253)',width+' readable white brand',pre.brandColor);
  check(pre.secondaryColor==='rgb(239, 255, 251)',width+' secondary button readable',pre.secondaryColor);
  check(pre.ctaColor==='rgb(8, 45, 46)',width+' primary CTA high contrast',pre.ctaColor);
  check(pre.menu.right<=pre.nav.right+3&&pre.menu.x>=pre.nav.x,width+' dropdown inside navbar',pre);
  const dropdown=page.locator('#landing .omLandingMenu');
  await dropdown.click();
  check(await page.locator('#landing .navlinks a[href="/blog/"]').isVisible(),width+' dropdown opens');
  check(await dropdown.getAttribute('aria-expanded')==='true',width+' aria expanded');
  await page.keyboard.press('Escape');
  check(await dropdown.getAttribute('aria-expanded')==='false',width+' escape closes');
  if(width>=1100){
   check(pre.menu.bottom>=pre.nav.y&&pre.menu.y<=pre.nav.bottom,width+' desktop menu baseline',pre);
   check(pre.brand.right<=pre.menu.x+5,width+' logo and menu do not overlap',pre);
  }
  if(width===390||width===1440)await page.screenshot({path:join('v5-screens',width+'-homepage.png'),fullPage:false,animations:'disabled'});
  check(errors.length===0,width+' no uncaught errors',errors);
 }catch(e){issues.push({label:width+' fatal',value:String(e.stack||e).slice(0,800)})}finally{await page.close()}
}
for(const [pageName,selector] of [['privacy','.content'],['admin','.lockCard'],['prepare','.topbar']]){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 try{
  let url=pageName==='privacy'?'/privacy':pageName==='admin'?'/admin':'/prepare';
  const r=await page.goto(origin+url,{waitUntil:'load',timeout:30000});
  check(r?.status()===200,pageName+' existing page reachable',r?.status());
  await page.evaluate(name=>{document.documentElement.classList.add('omSecondary');document.documentElement.setAttribute('data-page',name)},pageName);
  await page.addStyleTag({url:origin+'/secondary-turquoise-v5.css'});
  const d=await page.evaluate(({selector})=>{
   const el=document.querySelector(selector);
   return {exists:!!el,width:document.documentElement.scrollWidth,
     brand:getComputedStyle(document.documentElement).getPropertyValue('--brand-teal').trim()};
  },{selector});
  check(d.exists,pageName+' original content intact');
  check(d.width<=395,pageName+' 390px does not overflow',d);
  check(d.brand==='#51e7d6',pageName+' turquoise global variable',d);
 }catch(e){issues.push({label:pageName+' static check fatal',value:String(e).slice(0,700)})}finally{await page.close()}
}
await browser.close();
console.log(JSON.stringify({passed,failed:issues.length,issues},null,2));
if(issues.length)process.exitCode=1;
