import discover from './discover.js';
import {isEightAmUK} from '../lib/uk-discovery-window.js';

// Invoked at 07:00 and 08:00 UTC. Exactly one invocation falls in the
// 08:00 Europe/London hour, including both BST and GMT.
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
  const secret=process.env.CRON_SECRET;
  if(!secret||req.headers.authorization!=='Bearer '+secret)
    return res.status(401).json({ok:false,error:'Unauthorized'});
  if(!isEightAmUK())return res.status(200).json({
    ok:true,skipped:true,reason:'Not 08:00 in Europe/London'
  });
  return discover(req,res);
}
