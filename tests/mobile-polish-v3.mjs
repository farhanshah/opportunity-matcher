import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const origin='https://oppmatcher.tech/mobile-preview.html';
const folder='mobile-v3-screens';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true});
let passed=0;const failed=[];
const check=(condition,name,details='')=>{if(condition)passed++;else failed.push({name,details:String(details).slice(0,420)})};
for(const width of [320,360,390,430,768,1440]){
 const device=width<901?'mobile':'desktop';
 const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const response=await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000});
  check(response.status()===200,width+' stage HTTP 200');
  check((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'),width+' preview not indexed');
  await page.waitForFunction(()=>typeof window.showApp==='function'&&typeof window.setView==='function',{timeout:45000});
  const palette=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--om-v2-aqua').trim());
  check(palette==='#51e7d6',width+' turquoise token',palette);
  if(device==='mobile'){
    const menu=page.locator('#landing .omLandingMenu');
    await menu.waitFor({state:'visible',timeout:12000});
    await menu.click();
    check(await page.locator('#landing .heroWrap>.nav').evaluate(x=>x.classList.contains('omLandingMenuOpen')),width+' public mobile menu opens');
    check(await page.locator('#landing .navlinks a').first().isVisible(),width+' existing nav links accessible');
    await page.keyboard.press('Escape');
    check(!(await page.locator('#landing .heroWrap>.nav').evaluate(x=>x.classList.contains('omLandingMenuOpen'))),width+' mobile public menu closes');
  }else check(!(await page.locator('#landing .omLandingMenu').isVisible()),width+' no extra desktop menu');
  const home=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,viewport:innerWidth,
    navHeight:Math.round(document.querySelector('#landing .heroWrap>.nav').getBoundingClientRect().height),
    liveBadgeWidth:Math.round(document.querySelector('.liveBadge')?.getBoundingClientRect().width||0),
    headerText:getComputedStyle(document.querySelector('#landing .hero h1')).fontSize
  }));
  check(home.scroll<=home.viewport+4,width+' landing no horizontal overflow',JSON.stringify(home));
  if(width<=430)check(home.navHeight<190,width+' landing header usable height',JSON.stringify(home));
  if(width===320||width===390||width===768||width===1440)
   await page.screenshot({path:join(folder,width+'-home.png'),fullPage:true,animations:'disabled'});
  await page.evaluate(()=>window.showApp());
  for(const view of ['discover','saved','tracker','dashboard']){
    await page.evaluate(v=>window.setView(v),view);
    await page.locator('.omBridgeHero').waitFor({state:'visible',timeout:20000});
    await page.waitForTimeout(140);
    const state=await page.evaluate(()=>{
      const appTop=document.querySelector('.app .appTop');
      return {scroll:document.documentElement.scrollWidth,viewport:innerWidth,
       headerHeight:Math.round(appTop.getBoundingClientRect().height),
       heroText:document.querySelector('.omBridgeTitle')?.textContent||'',navBtn:!!document.querySelector('.app .omMobileMenu')};
    });
    check(state.scroll<=state.viewport+4,width+' '+view+' no horizontal overflow',JSON.stringify(state));
    if(device==='mobile'){
     check(state.headerHeight<=148,width+' '+view+' compact workspace header',JSON.stringify(state));
     check(state.navBtn,width+' '+view+' reachable workspace menu');
    }
    if(view==='discover'&&width<621){
      const cardActions=await page.locator('.oppCard .actions').first().evaluate(x=>{
        const r=x.getBoundingClientRect(),card=x.closest('.oppCard').getBoundingClientRect();
        return {right:r.right,cardRight:card.right,left:r.left,cardLeft:card.left}
      }).catch(()=>null);
      if(cardActions)check(cardActions.right<=cardActions.cardRight+3&&cardActions.left>=cardActions.cardLeft-3,
       width+' action buttons inside opportunity card',JSON.stringify(cardActions));
    }
    if(view==='tracker'&&(width===320||width===390||width===768||width===1440)){
     await page.screenshot({path:join(folder,width+'-tracker.png'),fullPage:true,animations:'disabled'});
    }
  }
  check(errors.length===0,width+' no runtime JS errors',errors.join('|'));
 }catch(e){failed.push({name:width+' fatal',details:String(e.stack||e).slice(0,780)})}finally{await page.close();}
}
await browser.close();
console.log(JSON.stringify({passed,failed:failed.length,issues:failed,screens:folder}));
if(failed.length)process.exitCode=1;
