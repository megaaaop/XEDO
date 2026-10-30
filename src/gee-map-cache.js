const BUCKET='xedo-gee-map-cache-v1',MAX_PNG=1048576;
const encoder=new TextEncoder();
const canonical=value=>{
  if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('CACHE_RECIPE');return Object.is(value,-0)?0:value;}
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
};
export const cacheHash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
export async function tileDescriptor(session,{z,x,y},pipeline,project,now=Date.now()) {
  const scale=40075016.68557849/(2**z*256),origin=20037508.342789244;
  const recipe={version:'gee-map-cache-v1',namespace:project,purpose:session.purpose,sourceEpoch:new Date(now).toISOString().slice(0,10),collection:'COPERNICUS/S2_SR_HARMONIZED',
    assets:session.purpose==='basemap'?session.assets.map(id=>'COPERNICUS/S2_SR_HARMONIZED/'+id):[session.sceneId.slice(4)],
    pipeline:pipeline+'-rgb-v1',algorithm:'ordered-last-wins-bbox-clip-v1',bands:['B4','B3','B2'],range:[0,3000],gamma:1.2,format:'PNG',clip:session.bbox,scope:'fixed-public-s2-imagery',
    grid:{crs:'EPSG:3857',width:256,height:256,z,x,y,affine:[scale,0,-origin+x*256*scale,0,-scale,origin-y*256*scale]}};
  const normalized=canonical(recipe);return {key:await cacheHash(encoder.encode(JSON.stringify(normalized))),recipe:normalized};
}

// Validate decompressed fixed-grid RGB/RGBA before persistence. Existing client
// AOI/coverage validation still determines whether an image can be reviewed.
export async function validCachePNG(bytes) {
  if(!(bytes instanceof Uint8Array)||bytes.length<45||bytes.length>MAX_PNG)return false;
  if(bytes.subarray(0,8).join(',')!=='137,80,78,71,13,10,26,10')return false;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint32(8)!==13||new TextDecoder().decode(bytes.subarray(12,16))!=='IHDR'||view.getUint32(16)!==256||view.getUint32(20)!==256||bytes[24]!==8||![2,6].includes(bytes[25])||bytes[26]||bytes[27]||bytes[28])return false;
  const crc=(start,end)=>{let value=0xffffffff;for(let i=start;i<end;i++){value^=bytes[i];for(let b=0;b<8;b++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;};
  const chunks=[];let pos=8,ended=false;
  while(pos+12<=bytes.length){const n=view.getUint32(pos);if(n>MAX_PNG||pos+12+n>bytes.length||crc(pos+4,pos+8+n)!==view.getUint32(pos+8+n))return false;
    const kind=new TextDecoder().decode(bytes.subarray(pos+4,pos+8));if(kind==='IDAT')chunks.push(bytes.slice(pos+8,pos+8+n));pos+=12+n;if(kind==='IEND'){ended=true;break;}}
  if(!ended||pos!==bytes.length||!chunks.length)return false;
  try{
    const channels=bytes[25]===6?4:3,stride=256*channels,maximum=256*(stride+1);
    const reader=new Blob(chunks).stream().pipeThrough(new DecompressionStream('deflate')).getReader();let size=0;const parts=[];
    try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>maximum)return false;parts.push(r.value);}}finally{await reader.cancel().catch(()=>{});}
    if(size!==maximum)return false;
    const data=new Uint8Array(size);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.length;}
    let previous=new Uint8Array(stride),visible=0;
    for(let row=0;row<256;row++){
      const mode=data[row*(stride+1)],line=data.slice(row*(stride+1)+1,(row+1)*(stride+1));if(mode>4)return false;
      for(let i=0;i<stride;i++){const a=i>=channels?line[i-channels]:0,b=previous[i],c=i>=channels?previous[i-channels]:0;let predictor=0;
        if(mode===1)predictor=a;else if(mode===2)predictor=b;else if(mode===3)predictor=Math.floor((a+b)/2);else if(mode===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);predictor=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
        line[i]=(line[i]+predictor)&255;}
      if(channels===3)visible+=256;else for(let i=3;i<stride;i+=4)if(line[i])visible++;
      previous=line;
    }
    return visible>0;
  }catch{return false;}
}

export function createMapCache(env,{fetchImpl=fetch,defer,deadline,now=Date.now,onTiming=()=>{},onEvent=()=>{}}={}) {
  if(env.GEE_CACHE_ENABLED!=='1'||!env.GEE_CACHE_SERVER_KEY||env.GEE_CACHE_URL!=='https://tstmjnlhwidwtzetqxbu.supabase.co')return null;
  const base=env.GEE_CACHE_URL,key=env.GEE_CACHE_SERVER_KEY;
  const auth={apikey:key,Authorization:'Bearer '+key};
  const report=(name,start)=>{try{onTiming(name,performance.now()-start);}catch{}};
  const event=name=>{try{onEvent(name);}catch{}};
  async function call(path,{method='GET',body,type='application/json',timeout=6000,signal}={}) {
    return fetchImpl(base+path,{method,redirect:'error',cache:'no-store',headers:{...auth,...(body===undefined?{}:{'Content-Type':type}),'x-upsert':'false'},body:body===undefined?undefined:body instanceof Uint8Array?body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout)});
  }
  async function rpc(op,payload={},timeout=6000,signal) {
    const response=await call('/rest/v1/rpc/xedo_cache_v1',{method:'POST',body:{op,payload},timeout,signal});if(!response.ok)throw new Error('CACHE_UNAVAILABLE');
    const text=await response.text();if(text.length>32768)throw new Error('CACHE_RESPONSE');const value=JSON.parse(text);
    if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('CACHE_RESPONSE');return value;
  }
  const safeRpc=async(...args)=>{try{return await rpc(...args);}catch{return null;}};
  const bindClaim=(claim,descriptor,generation)=>{
    if(claim.state==='leader'&&(claim.generation!==generation||claim.path!==`v1/${descriptor.key}/${generation}.png`))return {state:'bypass'};
    if(claim.state==='hit'&&claim.path!==`v1/${descriptor.key}/${claim.generation}.png`)return {state:'bypass'};
    return claim;
  };
  function later(run){let accepted=false;const task=Promise.resolve().then(()=>accepted?run():undefined).catch(()=>{});try{defer(task);accepted=true;}catch{}return accepted;}
  async function cleanup() {
    const candidate=await safeRpc('cleanup');if(candidate?.state!=='deleting')return;
    if(!/^v1\/[a-f0-9]{64}\/[a-f0-9-]{36}\.png$/.test(candidate.path))return;
    const response=await call('/storage/v1/object/'+BUCKET,{method:'DELETE',body:{prefixes:[candidate.path]}});
    if(response.ok)await safeRpc('deleted',{key:candidate.key,generation:candidate.generation});
  }
  async function readHit(claim,signal) {
    if(!/^v1\/[a-f0-9]{64}\/[a-f0-9-]{36}\.png$/.test(claim.path)||!Number.isSafeInteger(claim.bytes)||claim.bytes<1||claim.bytes>MAX_PNG)throw new Error('CACHE_RESPONSE');
    const start=performance.now(),response=await call('/storage/v1/object/authenticated/'+BUCKET+'/'+claim.path,{signal});report('gee_cache_read',start);
    if(!response.ok){
      let absent=response.status===404;
      if(response.status===400)try{const text=await response.text();if(text.length<=2048){const body=JSON.parse(text);absent=String(body.statusCode)==='404'||body.code==='NoSuchKey';}}catch{}
      throw Object.assign(new Error('CACHE_RESPONSE'),{corrupt:absent});
    }
    if(!/^image\/png(?:;|$)/i.test(response.headers.get('content-type')||'')||Number(response.headers.get('content-length'))>MAX_PNG)throw Object.assign(new Error('CACHE_RESPONSE'),{corrupt:true});
    const reader=response.body.getReader(),parts=[];let size=0;
    try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>MAX_PNG)throw Object.assign(new Error('CACHE_RESPONSE'),{corrupt:true});parts.push(r.value);}}finally{await reader.cancel().catch(()=>{});}
    const bytes=new Uint8Array(size);let off=0;for(const p of parts){bytes.set(p,off);off+=p.length;}
    const check=performance.now(),valid=size===claim.bytes&&await cacheHash(bytes)===claim.hash&&await validCachePNG(bytes);report('gee_cache_validate',check);
    if(!valid)throw Object.assign(new Error('CACHE_RESPONSE'),{corrupt:true});return bytes;
  }
  async function persist(descriptor,claim,bytes) {
    let startedWrite=false,settled=false;const started=performance.now();
    const token={key:descriptor.key,generation:claim.generation};
    try{
      if(!await validCachePNG(bytes)||typeof deadline!=='function'||deadline()-now()<5000){await safeRpc('release_build',token);return;}
      const hash=await cacheHash(bytes),begin=await rpc('begin_write',{...token,bytes:bytes.length,hash});
      if(begin.state!=='uploading')return;
      const remaining=deadline()-now();
      if(!Number.isFinite(remaining)||remaining<5000){await safeRpc('cancel_unstarted',{...token,hash});return;}
      startedWrite=true;
      const response=await call('/storage/v1/object/'+BUCKET+'/'+claim.path,{method:'POST',body:bytes,type:'image/png',timeout:Math.min(12000,Math.max(1,deadline()-now()-1000))});
      if(!response.ok)throw new Error('CACHE_UPLOAD');
      await readHit({...claim,hash,bytes:bytes.length});
      settled=true;
      await rpc('publish',token);
    }catch{
      event('write-not-completed');
      if(startedWrite)await safeRpc('uncertain',{...token,settled});
      else await safeRpc('release_build',token);
    }finally{report('gee_cache_write',started);}
  }
  return {
    rpc,cleanup,
    async tile(descriptor,produce,{signal}={}) {
      let claim;const start=performance.now();
      const remaining=typeof deadline==='function'?deadline()-now():0;
      const canWrite=typeof defer==='function'&&Number.isFinite(remaining)&&remaining>=5000;
      if(!canWrite){event('admission-unavailable');return {bytes:await produce(),status:'bypass'};}
      try{
        // A read-only lookup still needs no writer capability; admission is only
        // enabled with a supported request lifetime and sufficient headroom.
        // Calibrated from fresh-process live reads: 600ms caused false bypasses.
        // This remains bounded and does not start speculative GEE computation.
        const generation=crypto.randomUUID();claim=bindClaim(await rpc('claim',{...descriptor,generation},1200,signal),descriptor,generation);
      }catch(error){event(error.name==='TimeoutError'?'lookup-timeout':'lookup-unavailable');claim={state:'bypass'};}finally{report('gee_cache_lookup',start);}
      if(claim.state==='hit'){
        try{return {bytes:await readHit(claim,signal),status:'hit'};}
        catch(error){event(error.corrupt?'hit-invalid':'hit-read-unavailable');if(signal?.aborted)throw error;if(error.corrupt){await safeRpc('discard',{key:descriptor.key,generation:claim.generation});later(cleanup);}}
      }
      if(claim.state==='follower'){
        // Allow the leader a short opportunity to publish without starting a
        // speculative compute. Polling is bounded; no new writer is created.
        const until=now()+2000;
        for(const delay of [100,200,400,600]){
          if(now()+delay>=until)break;
          await new Promise(resolve=>setTimeout(resolve,delay));
          if(signal?.aborted)throw new Error('CACHE_CANCELLED');
          let next;try{const generation=crypto.randomUUID();next=bindClaim(await rpc('claim',{...descriptor,generation},Math.max(1,Math.min(600,until-now())),signal),descriptor,generation);}catch{break;}
          if(next.state==='hit')try{return {bytes:await readHit(next,signal),status:'hit'};}catch{break;}
          if(next.state==='leader'){claim=next;break;}
          if(next.state!=='follower')break;
        }
      }
      if(claim.state==='follower'){
        return {bytes:await produce(),status:'follower'};
      }
      let bytes;
      try{bytes=await produce();}catch(error){if(claim.state==='leader')await safeRpc('release_build',{key:descriptor.key,generation:claim.generation});throw error;}
      if(signal?.aborted){if(claim.state==='leader')await safeRpc('release_build',{key:descriptor.key,generation:claim.generation});throw new Error('CACHE_CANCELLED');}
      if(claim.state==='leader'){if(!later(()=>persist(descriptor,claim,bytes)))await safeRpc('release_build',{key:descriptor.key,generation:claim.generation});}
      else later(cleanup);
      return {bytes,status:claim.state==='leader'?'miss':'bypass'};
    },
  };
}
