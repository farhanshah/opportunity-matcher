import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';

const ROOT='https://oppmatcher.tech';
const output='public-launch-artifacts';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const issues=[];let passed=0;
function check(ok,name,detail=''){if(ok)passed++;else issues.push({name,detail:String(detail).slice(0,650)})}
const cases=[
 {path:'/',view:'dashboard',device:'desktop',width:1440,height:900},
 {path:'/tracker',view:'tracker',device:'desktop',width:1440,height:900},
 {path:'/saved',view:'saved',device:'desktop',width:1440,height:900},
 {path:'/discover',view:'discover',device:'desktop',width:1440,height:900},
 {path:'/dashboard',view:'dashboard',device:'desktop',width:1440,height:900},
 {path:'/tracker',view:'tracker',device:'mobile',width:390,height:844},
 {path:'/',view:'dashboard',device:'mobile',width:390,height:844}
];
for(const entry of cases){
 const page=await browser.newPage({viewport:{width:entry.width,height:entry.height}});
 const label=entry.device+entry.path,errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 try{
  const response=await page.goto(ROOT+entry.path,{waitUntil:'domcontentloaded',timeout:30000});
  check(response?.status()===200,label+' 200 status',response?.status());
  const metadata=await page.evaluate(()=>{
   const root=document.documentElement;
   return {turquoise:root.classList.contains('omTurquoisePreview'),
    noindex:document.querySelector('meta[name="robots"]')?.getAttribute('content')||'',
    canonical:document.querySelector('link[rel="canonical"]')?.getAttribute('href')||'',
    banners:document.querySelectorAll('.integrationPreviewNotice,.integrationWarning').length};
  });
  check(metadata.turquoise,label+' turquoise root',JSON.stringify(metadata));
  check(!metadata.noindex.includes('noindex'),label+' publicly indexable',JSON.stringify(metadata));
  check(metadata.canonical==='https://oppmatcher.tech/',label+' canonical intact',metadata.canonical);
  check(metadata.banners===0,label+' no staging warnings',metadata.banners);
  await page.waitForFunction(()=>Boolean(window.OpportunityAccountGate&&window.OpportunityCloud?.openAuth),{timeout:45000});
  await page.evaluate(view=>{window.showApp();window.setView(view)},entry.view);
  await page.locator('#cloudAuthModal').waitFor({state:'visible',timeout:14000});
  check(!(await page.locator('#app').isVisible()),label+' anonymous workspace blocked');
  check(await page.locator('#landing').isVisible(),label+' public homepage stays open');
  check(!(await page.locator('#onboard').isVisible()),label+' anonymous Passport form blocked');
  check(await page.locator('#cloudName').count()===1,label+' free sign-up shown first');
  const theme=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--om-v2-aqua').trim());
  check(theme==='#51e7d6',label+' approved teal theme',theme);
  if(entry.device==='mobile'){
   const menu=page.locator('.omLandingMenu');
   check(await menu.isVisible(),label+' public mobile navigation');
   await menu.click();
   check(await menu.getAttribute('aria-expanded')==='true',label+' menu opens');
   await page.keyboard.press('Escape');
   check(await menu.getAttribute('aria-expanded')==='false',label+' menu closes');
  }
  const horizontal=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  check(horizontal.scroll<=horizontal.width+6,label+' no viewport overflow',JSON.stringify(horizontal));
  // Refresh on actual deep links; no staging history interception on public site.
  if(entry.path!=='/'){
   await page.reload({waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>typeof window.setView==='function',{timeout:45000});
   const post=await page.evaluate(()=>({
    url:location.pathname,theme:document.documentElement.classList.contains('omTurquoisePreview')
   }));
   check(post.url===entry.path&&post.theme,label+' refresh retains public route and theme',JSON.stringify(post));
  }
  if(entry.path==='/tracker'){
   // Cloud auth is loaded asynchronously after app shell. Wait for its API
   // rather than silently optional-calling before the module is ready.
   await page.waitForFunction(()=>typeof window.OpportunityCloud?.openAuth==='function',{timeout:45000});
   await page.evaluate(()=>window.OpportunityCloud.openAuth());
   await page.locator('#cloudAuthModal').waitFor({state:'visible',timeout:14000});
   const bg=await page.locator('#cloudAuthCard').evaluate(node=>getComputedStyle(node).backgroundColor);
   check(bg==='rgb(255, 255, 255)',label+' account popup redesigned',bg);
   await page.evaluate(()=>window.OpportunityCloud?.closeAuth?.());
  }
  if(entry.path==='/'||entry.path==='/tracker')
   await page.screenshot({path:join(output,entry.device+'-'+(entry.path==='/'?'home':'tracker')+'.png'),
    animations:'disabled',fullPage:true});
  check(errors.length===0,label+' no uncaught JS error',errors.join(' | '));
 }catch(e){issues.push({name:label+' fatal browser check',detail:String(e.stack||e).slice(0,950)})}
 finally{await page.close()}
}
await browser.close();
console.log(JSON.stringify({passed,failed:issues.length,issues,checks:cases.length,
  note:'Read-only public-route QA: no login, account edits, saves or submissions'},null,2));
if(issues.length)process.exitCode=1;
