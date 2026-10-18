import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';

const URL = 'https://oppmatcher.tech/integration-preview-v2.html';
const OUT = 'browser-qa-artifacts';
await mkdir(OUT,{recursive:true});
const browser = await chromium.launch({headless:true});
const issues=[];
let passed=0;
const check = (cond,name,details='') => {if(!cond)issues.push({name,details});else passed++};
function reportPageErrors(page,label){
  page.on('pageerror',err => issues.push({name:label+' uncaught JS error',details:String(err.message).slice(0,500)}));
}
async function checkView(width,height,label){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 reportPageErrors(page,label);
 try{
  let response=null;
  for(let attempt=0;attempt<3;attempt++){
    try{response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:25000});break}
    catch(err){if(attempt===2)throw err;await new Promise(r=>setTimeout(r,2000))}
  }
  check(response?.status()===200,label+' HTTP status',String(response?.status()));
  await page.locator('.integrationPreviewNotice').waitFor({state:'visible',timeout:15000});
  const headerText=await page.locator('.integrationPreviewNotice').innerText();
  check(headerText.includes('VERSION 2'),label+' correct preview version',headerText.slice(0,100));
  const robots=await page.locator('meta[name="robots"]').getAttribute('content');
  check(robots?.includes('noindex'),label+' noindex',robots);
  const overlay=await page.locator('.integrationWarning').innerText();
  check(overlay.includes('actual data'),label+' real data disclosure');
  check(await page.locator('#landing').count()===1,label+' original app landing preserved');
  const cssInfo=await page.evaluate(()=>{
    const html=document.documentElement,link=document.querySelector('link[href^="/integration-turquoise-v2.css"]');
    return {class:html.className,loaded:!!link,
      aqua:getComputedStyle(html).getPropertyValue('--om-v2-aqua').trim()};
  });
  check(cssInfo.class.includes('omTurquoisePreview'),label+' candidate styling scope',JSON.stringify(cssInfo));
  check(cssInfo.loaded&&cssInfo.aqua==='#51e7d6',label+' approved turquoise token',JSON.stringify(cssInfo));
  await page.screenshot({path:join(OUT,label+'-landing.png'),fullPage:true,animations:'disabled'});
  await page.waitForFunction(()=>typeof window.showApp==='function'&&typeof window.setView==='function',{timeout:40000});
  // Read-only navigation. No account editing, saves, checklist changes or real submissions.
  await page.evaluate(()=>{window.showApp();window.setView('tracker');});
  const hero=page.locator('.omBridgeHero');
  await hero.waitFor({state:'visible',timeout:10000});
  const heading=await hero.locator('.omBridgeTitle').innerText();
  check(/Every step|Forward/i.test(heading),label+' tracker editorial hero',heading);
  const v2Computed=await page.evaluate(()=>{
    const hero=document.querySelector('.omBridgeHero'),side=document.querySelector('.app .side');
    return {hero:hero?getComputedStyle(hero).backgroundImage:'',side:side?getComputedStyle(side).backgroundImage:''};
  });
  check(v2Computed.hero.includes('linear-gradient'),label+' real layout hero gradient');
  check(await page.locator('#tracker').count()===1,label+' actual tracker DOM retained');
  if(width<900){
    const menu=page.locator('.app .omMobileMenu');
    check(await menu.isVisible(),label+' responsive workspace menu visible');
    await menu.click();
    const sidebar=page.locator('.app .side');
    check(await sidebar.evaluate(el=>el.classList.contains('omMobileOpen')),label+' sidebar opens');
    await page.keyboard.press('Escape');
    check(!(await sidebar.evaluate(el=>el.classList.contains('omMobileOpen'))),label+' sidebar keyboard dismissal');
  }
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
  check(overflow.scroll<=overflow.inner+5,label+' no viewport-level horizontal overflow',JSON.stringify(overflow));
  await page.screenshot({path:join(OUT,label+'-tracker.png'),fullPage:true,animations:'disabled'});
 }catch(err){
  issues.push({name:label+' critical test error',details:String(err.stack||err).slice(0,800)});
 }finally{await page.close();}
}
await checkView(1440,900,'desktop');
await checkView(390,844,'mobile');
await browser.close();
console.log(JSON.stringify({passed,failed:issues.length,issues,preview:URL},null,2));
if(issues.length)process.exitCode=1;
