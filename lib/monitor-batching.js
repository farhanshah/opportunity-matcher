// Rate-conscious batching: no parallel requests to the same official host.
// A blocked provider is never retried here. Cooldowns are selected by SQL.
export function hostBatches(sources,limit=12){
 if(!Number.isInteger(limit)||limit<1||limit>30)throw Error('Invalid source concurrency');
 const batches=[];
 let pending=[...sources];
 while(pending.length){
  const hosts=new Set(),batch=[],deferred=[];
  for(const source of pending){
   let hostname;
   try { hostname=new URL(source.source_url).hostname.toLowerCase(); }
   catch { hostname='invalid-'+String(source.source_key||batch.length); }
   if(batch.length<limit&&!hosts.has(hostname)){
    batch.push(source);
    hosts.add(hostname);
   }else deferred.push(source);
  }
  if(!batch.length)throw Error('Could not schedule official host checks');
  batches.push(batch);pending=deferred;
 }
 return batches;
}
