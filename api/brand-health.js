import { renderBrandPng } from './brand-image.js';

// Public diagnostic: tests only our non-sensitive logo renderer and returns no user data.
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  res.setHeader('Cache-Control','public, s-maxage=3600');
  try{
    const favicon=await renderBrandPng('favicon');
    const valid=favicon.length>128&&favicon.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if(!valid)return res.status(503).json({ready:false});
    return res.status(200).json({ready:true,format:'png',faviconPixels:64});
  }catch(e){
    console.error('Public brand health check failed',String(e?.message||e).slice(0,150));
    return res.status(503).json({ready:false});
  }
}
