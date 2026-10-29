import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const TARGET='https://oppmatcher.tech/integration-preview-v2.html';
const OUT='browser-qa-artifacts';
await mkdir(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});
const issues=[];let passed=0;
function check(ok,label,detail=''){if(ok)passed++;else issues.push({label,detail:String(detail).slice(0,400)})}
for(const [name,width,height] of [['desktop',1365,850],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  try{
    const response=await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:30000});
    check(response.status()===200,name+' loaded');
    await page.waitForFunction(()=>window.OpportunityCloud&&typeof window.OpportunityCloud.openAuth==='function',{timeout:45000});
    await page.evaluate(()=>window.OpportunityCloud.openAuth());
    const modal=page.locator('#cloudAuthModal');
    await modal.waitFor({state:'visible',timeout:20000});
    check(await page.locator('#cloudAuthCard h2').count()===1,name+' account modal heading');
    check(await page.locator('#cloudEmail').count()===1,name+' sign-in email field visible');
    check(await page.locator('#cloudPassword').count()===1,name+' sign-in password field visible');
    check(await page.locator('#cloudSubmit').count()===1,name+' sign-in action visible');
    const details=await page.evaluate(()=>{
      const dialog=document.querySelector('#cloudAuthCard');
      const input=document.querySelector('#cloudEmail');
      const s=getComputedStyle(dialog);
      return {background:s.backgroundColor,color:s.color,radius:s.borderRadius,emailVisible:!!input?.getClientRects().length};
    });
    check(details.background==='rgb(255, 255, 255)',name+' light approved account design',JSON.stringify(details));
    check(details.emailVisible,name+' form accessible',JSON.stringify(details));
    await page.screenshot({path:join(OUT,name+'-account.png'),animations:'disabled'});
    await page.evaluate(()=>window.OpportunityCloud.setMode('signup'));
    check(await page.locator('#cloudName').count()===1,name+' sign-up form available');
    check(await page.locator('#cloudEmail').count()===1,name+' sign-up email field available');
    await page.evaluate(()=>window.OpportunityCloud.setMode('signin'));
    await page.evaluate(()=>window.OpportunityCloud.closeAuth());
    check(!(await modal.isVisible()),name+' closes account modal');
    // Only inspect guest Passport form; do not submit or persist any data.
    await page.evaluate(()=>{
      if(typeof window.openOnboard==='function')window.openOnboard(false);
    });
    if(await page.locator('#onboard').count()){
      check(!(await page.locator('#onboard').isVisible()),name+' guest Passport is locked');
      check(await page.locator('#cloudAuthModal').isVisible(),name+' account form appears first');
      check(await page.locator('#obNat').count()===1,name+' nationality form retained');
      check(await page.locator('#obEdu').count()===1,name+' education form retained');
      check(await page.locator('#obField').count()===1,name+' field of study retained');
      await page.screenshot({path:join(OUT,name+'-passport.png'),animations:'disabled'});
      await page.evaluate(()=>window.closeOnboard?.());
    }
  }catch(error){issues.push({label:name+' fatal browser issue',detail:String(error).slice(0,550)})}
  finally{await page.close()}
}
await browser.close();
console.log(JSON.stringify({passed,failed:issues.length,issues,method:'Guest-only UI smoke tests. No sign-in, saved changes, or submissions.'},null,2));
if(issues.length)process.exitCode=1;
