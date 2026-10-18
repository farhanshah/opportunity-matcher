import { chromium } from 'playwright';

const preview='https://oppmatcher.tech/integration-preview-v2.html';
const browser=await chromium.launch({headless:true});
const results=[];
for(const [device,width,height] of [['desktop',1366,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});
 try{
   const response=await page.goto(preview,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>typeof window.showApp==='function'&&typeof window.setView==='function',{timeout:45000});
   await page.evaluate(()=>{window.showApp();window.setView('tracker')});
   await page.locator('.omBridgeHero').waitFor({state:'visible',timeout:15000});
   await page.waitForTimeout(350);
   const before=await page.evaluate(()=>({
     pathname:location.pathname,
     previewBanner:!!document.querySelector('.integrationPreviewNotice'),
     scopedStyle:document.documentElement.classList.contains('omTurquoisePreview'),
     trackerView:!document.querySelector('#tracker')?.classList.contains('hide')
   }));
   const lastUrl=page.url();
   await page.reload({waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForTimeout(250);
   const after=await page.evaluate(()=>({
     pathname:location.pathname,
     previewBanner:!!document.querySelector('.integrationPreviewNotice'),
     scopedStyle:document.documentElement.classList.contains('omTurquoisePreview')
   }));
   const ok=before.trackerView&&before.scopedStyle&&after.scopedStyle&&after.previewBanner;
   results.push({device,ok,before,after,lastUrl});
 }catch(e){results.push({device,ok:false,error:String(e.message).slice(0,650)})}
 finally{await page.close()}
}
await browser.close();
console.log(JSON.stringify({checks:results,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length},null,2));
if(results.some(x=>!x.ok))process.exitCode=1;
