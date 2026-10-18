import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const BASE='https://oppmatcher.tech';
const output='launch-browser-artifacts';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const issues=[];let passed=0;
const check=(yes,name,details='')=>{if(yes)passed++;else issues.push({name,details:String(details).slice(0,550)})};
for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});
 const jsErrors=[];
 page.on('pageerror',e=>jsErrors.push(e.message));
 try{
  const pre=await page.goto(BASE+'/launch-ready.html',{waitUntil:'domcontentloaded',timeout:30000});
  check(pre?.status()===200,label+' candidate responds 200',pre?.status());
  check((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'),label+' release candidate noindex');
  await page.waitForFunction(()=>typeof window.setView==='function'&&typeof window.showApp==='function',{timeout:45000});
  await page.evaluate(()=>{window.showApp();window.setView('tracker');});
  await page.locator('.omBridgeHero').waitFor({state:'visible',timeout:14000});
  check(/Every step|Forward/i.test(await page.locator('.omBridgeTitle').innerText()),label+' real tracker presentation');
  check(await page.locator('#tracker').count()===1,label+' tracker controls intact');
  const css=await page.evaluate(()=>{
   const h=document.documentElement,hero=document.querySelector('.omBridgeHero');
   return {theme:getComputedStyle(h).getPropertyValue('--om-v2-aqua').trim(),
    background:getComputedStyle(hero).backgroundImage,
    regularLiveRoute:location.pathname,
    nativeHistory:!history.pushState.toString().includes('previewFile')};
  });
  check(css.theme==='#51e7d6',label+' approved turquoise present',JSON.stringify(css));
  check(css.background.includes('linear-gradient'),label+' approved editorial layout');
  check(css.nativeHistory,label+' native history not intercepted');
  // App may navigate to /tracker through its native client router, but don't reload
  // until production index.html has been replaced.
  if(width<900){
   const menu=page.locator('.app .omMobileMenu');
   check(await menu.isVisible(),label+' navigation toggle visible');
   await menu.click();
   check(await page.locator('.app .side').evaluate(x=>x.classList.contains('omMobileOpen')),label+' mobile side opens');
   await page.keyboard.press('Escape');
   check(!(await page.locator('.app .side').evaluate(x=>x.classList.contains('omMobileOpen'))),label+' mobile side closes');
  }
  const overscroll=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  check(overscroll.scroll<=overscroll.width+6,label+' no horizontal viewport overflow',JSON.stringify(overscroll));
  await page.screenshot({path:join(output,label+'-tracker.png'),fullPage:true,animations:'disabled'});
  await page.evaluate(()=>window.OpportunityCloud?.openAuth?.());
  const modal=page.locator('#cloudAuthModal');
  await modal.waitFor({state:'visible',timeout:16000});
  const bg=await page.locator('#cloudAuthCard').evaluate(x=>getComputedStyle(x).backgroundColor);
  check(bg==='rgb(255, 255, 255)',label+' approved account popup visible',bg);
  await page.screenshot({path:join(output,label+'-account.png'),animations:'disabled'});
  await page.evaluate(()=>window.OpportunityCloud?.closeAuth?.());
  check(jsErrors.length===0,label+' no unexpected page errors',jsErrors.join('; '));
 }catch(e){issues.push({name:label+' fatal',details:String(e.stack||e).slice(0,800)})}
 finally{await page.close()}
}
await browser.close();
console.log(JSON.stringify({passed,failed:issues.length,issues,method:'Read-only browser QA; no sign-in or data writes'},null,2));
if(issues.length)process.exitCode=1;
