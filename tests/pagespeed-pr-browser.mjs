/* Local branch browser smoke. Unlike the old live-site-only QA, this runs
   the checked-out PR files so it can detect a delayed auth-gate regression. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';

const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}
  catch{res.writeHead(400).end();return}
  if(pathname.startsWith('/api/')){
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'})
      .end(JSON.stringify({ok:true,count:0,monitored_sources:0,opportunities:[],data:[],records:[],calls:[],listings:[],sources:{}}));
    return;
  }
  if(pathname==='/'||['/discover','/saved','/tracker','/dashboard'].includes(pathname))pathname='/index.html';
  const target=resolve(root,'.'+pathname);
  if(!target.startsWith(root+sep)){res.writeHead(403).end();return}
  try{
    const bytes=await readFile(target);
    res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream'}).end(bytes);
  }catch{res.writeHead(404).end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname!=='127.0.0.1'){await route.abort();return}
    if(url.pathname==='/app-v08-base.js')await new Promise(resolve=>setTimeout(resolve,1500));
    await route.continue();
  });
  const response=await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:15000});
  if(response?.status()!==200)throw Error('Public homepage did not load');
  await page.waitForFunction(()=>document.documentElement.dataset.omPublicFirstPaint==='true',{timeout:12000});
  if(await page.evaluate(()=>Boolean(document.documentElement.dataset.omBootMs)))
    throw Error('Workspace finished before the intentionally delayed module, cannot test early interaction');
  await page.locator('#landing .heroActions .btnPrimary').first().click({timeout:10000});
  const onboardVisible=await page.locator('#onboard').evaluate(el=>!el.classList.contains('hide'));
  if(onboardVisible)throw Error('Public CTA exposed raw onboarding before auth gate');
  await page.waitForFunction(()=>Boolean(document.documentElement.dataset.omBootMs),{timeout:35000});
  const ok=await page.evaluate(()=>({
    authGate:typeof window.OpportunityAccountGate?.beginPassport==='function',
    workspace:typeof window.setView==='function',
    publicPaint:document.documentElement.dataset.omPublicFirstPaint==='true',
    onboardHidden:document.getElementById('onboard')?.classList.contains('hide')
  }));
  if(!ok.authGate||!ok.workspace||!ok.publicPaint||!ok.onboardHidden)
    throw Error('PR boot failed its account/workspace contract: '+JSON.stringify(ok));
  // Regression reported by live v5 QA: at 1440 the tracker demo floated
  // above its own heading instead of following the description.
  await page.setViewportSize({width:1440,height:900});
  const layout=await page.evaluate(()=>{
    const card=document.querySelector('#landing #difference .workspaceFeature');
    const heading=card?.querySelector('h3');
    const demo=card?.querySelector('.trackerMock');
    const h=heading?.getBoundingClientRect(),d=demo?.getBoundingClientRect();
    return {headingBottom:h?.bottom,demoTop:d?.top,
      position:demo?getComputedStyle(demo).position:null,
      cardHeight:card?.getBoundingClientRect().height};
  });
  if(!Number.isFinite(layout.headingBottom)||!Number.isFinite(layout.demoTop)||
     layout.demoTop<layout.headingBottom+4)
    throw Error('Desktop application demo overlaps heading: '+JSON.stringify(layout));
  console.log('PASS public paint, account gate and desktop feature layout',layout);
  await page.close();
}finally{
  await browser.close();
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}
