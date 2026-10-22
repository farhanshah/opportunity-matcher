import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const base='https://oppmatcher.tech';
const browser=await chromium.launch({headless:true});
await mkdir('mobile-v4-visual-screens',{recursive:true});
const failures=[];let passed=0;const measures=[];
function check(ok,msg,data){if(ok)passed++;else failures.push({msg,data});}
for(const width of [320,360,390,430,768,1280]){
 const page=await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
 const cssRequests=[];
 page.on('response',x=>{if(x.url().includes('blog.css')||x.url().includes('blog-turquoise-v4.css'))cssRequests.push({url:x.url(),status:x.status(),type:x.headers()['content-type']})});
 try{
  const resp=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:32000});
  check(resp.status()===200,width+' homepage v4 200',resp.status());
  const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');
  check(canonical==='https://oppmatcher.tech/',width+' public homepage canonical');
  const robots=await page.locator('meta[name="robots"]').getAttribute('content').catch(()=>null);
  check(!robots?.includes('noindex'),width+' public homepage indexable',robots);
  await page.waitForFunction(()=>document.documentElement.classList.contains('omBootReady'),{timeout:45000});
  const x=await page.evaluate(()=>{
   const rect=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
   const features=[...document.querySelectorAll('#difference .feature')].map(e=>{
     const p=e.querySelector('p'),mock=e.querySelector('.passportMock,.matchMock,.trackerMock');
     const text=p?.getBoundingClientRect(),panel=mock?.getBoundingClientRect(),card=e.getBoundingClientRect();
     return {bodyBottom:text?.bottom,panelTop:panel?.top,panelBottom:panel?.bottom,cardBottom:card.bottom,
       panelPosition:mock?getComputedStyle(mock).position:null,cardHeight:card.height};
   });
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,
     nav:rect('#landing .heroWrap>.nav'),sourceTrack:rect('#landing .sourceTrack'),
     sections:features,blogLink:document.querySelector('#landing .navlinks a[href="/blog/"]')!==null};
  });
  measures.push({width,mode:'homepage',...x});
  check(x.scroll<=width+4,width+' homepage no horizontal scroll',x);
  check(x.sections.length===3,width+' all three feature cards',x.sections.length);
  if(width<=900){
    for(const [i,v] of x.sections.entries()){
      check(v.panelPosition!=='absolute',width+' feature '+i+' panel in normal layout',v);
      check(v.panelTop>=v.bodyBottom+8,width+' feature '+i+' mock below descriptive copy',v);
      check(v.panelBottom<=v.cardBottom+3,width+' feature '+i+' mock contained by feature card',v);
    }
    check(x.nav.height<=170,width+' mobile header compact',x.nav);
  }
  if(width<=900){
    const menu=page.locator('#landing .omLandingMenu');
    check(await menu.isVisible(),width+' nav trigger visible');
    await menu.click();check(await page.locator('#landing .navlinks a[href="/blog/"]').isVisible(),width+' menu Blog link');
    await page.keyboard.press('Escape');
    check(!(await page.locator('#landing .navlinks a[href="/blog/"]').isVisible()),width+' menu closes');
  }
  if(width===390||width===320||width===1280)
    await page.screenshot({path:join('mobile-v4-visual-screens',width+'-homepage.png'),fullPage:true,animations:'disabled'});
  const blogResp=await page.goto(base+'/blog/',{waitUntil:'domcontentloaded',timeout:30000});
  check(blogResp.status()===200,width+' blog live 200');
  check((await page.locator('link[rel="canonical"]').getAttribute('href'))==='https://oppmatcher.tech/blog/',width+' blog canonical');
  check((await page.locator('meta[name="robots"]').getAttribute('content'))==='index,follow',width+' blog indexed');
  await page.waitForLoadState('load',{timeout:25000});
  const blog=await page.evaluate(()=>{
    const hero=document.querySelector('.blogHero'),card=document.querySelector('.blogCard'),nav=document.querySelector('.blogNav');
    const h=getComputedStyle(hero),c=getComputedStyle(card);
    const r=nav.getBoundingClientRect();
    return {scroll:document.documentElement.scrollWidth,viewport:innerWidth,cardBg:c.backgroundColor,
      cardText:c.color,heroBg:h.backgroundImage,navWidth:r.width,cardCount:document.querySelectorAll('.blogCard').length};
  });
  measures.push({width,mode:'blog',...blog,cssRequests,styleLinks:await page.locator('link[rel="stylesheet"]').count(),styleSheets:await page.evaluate(()=>document.styleSheets.length)});
  check(blog.scroll<=width+4,width+' blog no overflow',blog);
  check(blog.cardBg==='rgb(255, 255, 255)',width+' blog white readable cards',blog.cardBg);
  check(blog.heroBg.includes('gradient'),width+' blog turquoise hero',blog.heroBg);
  check(blog.cardCount===4,width+' real articles preserved',blog.cardCount);
  if(width===390||width===320||width===1280)
    await page.screenshot({path:join('mobile-v4-visual-screens',width+'-blog.png'),fullPage:true,animations:'disabled'});
  if(width===390||width===1280){
    const articleResp=await page.goto(base+'/blog/scholarship-eligibility-checklist/',{waitUntil:'load',timeout:30000});
    check(articleResp.status()===200,width+' real blog article responds 200');
    const article=await page.evaluate(()=>{
      const r=document.querySelector('.article'),head=document.querySelector('.articleHero h1'),style=r&&getComputedStyle(r);
      return {scroll:document.documentElement.scrollWidth,width:innerWidth,
        color:style?.color||'',heading:head?.textContent?.trim()||'',
        canonical:document.querySelector('link[rel="canonical"]')?.href||''};
    });
    check(article.scroll<=width+4,width+' article no horizontal overflow',article);
    check(article.color!=='rgb(215, 219, 226)',width+' article new readable theme',article);
    check(article.canonical.endsWith('/blog/scholarship-eligibility-checklist/'),width+' article SEO canonical unchanged');
  }
 }catch(e){failures.push({msg:width+' runtime error',data:String(e.stack||e).slice(0,750)})}
 finally{await page.close();}
}
await browser.close();
console.log(JSON.stringify({passed,failed:failures.length,failures,measures},null,2));
if(failures.length)process.exitCode=1;
