import {database,record,records,unpack,insertStatement,updateStatement} from './storage.js';
import {providers,searchCatalogue,remoteFetch,assetAllowed} from './catalogue.js';
import {validateGeometry,pointWithin,statuses,observationStatuses,surveyStatuses,geojsonFor,csvFor} from './domain.js';
import proofScene from './fixtures/proof-scene.json' with {type:'json'};
import {operations,operationsBootstrap,planNeedsReview} from './operations.js';
import {probeGEE} from './gee-connection.js';
import {deploymentPreviewAPI} from './deployment-api.js';
import {planningTrialAPI} from './trial-api.js';
const now=()=>new Date().toISOString(),uuid=()=>crypto.randomUUID();
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const text=(v,max=3000)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail('Complete all required text fields and stay within the character limits.');return v.trim();};
const date=v=>{if(!v||!Number.isFinite(Date.parse(v)))fail('Invalid timestamp');return new Date(v).toISOString();};
const kinds=['area','incident','observation','revision','review','evidence','survey','event','profile','plan','run','asset','capture','processing','device','device_state','lab_import','lab_result','lab_revision'];
async function body(req){if(Number(req.headers.get('content-length'))>150000)fail('Data exceeds the size limit',413);return req.json();}
async function scene(db,id){const row=await db.first('SELECT * FROM scenes WHERE id = ?',id);if(!row)fail('Source image not found',404);return JSON.parse(row.metadata);}
function sceneStatement(s){if(s.id===proofScene.id)s={...s,localPreview:proofScene.localPreview,previewExtent:proofScene.previewExtent,previewFootprint:proofScene.previewFootprint,previewResolution:proofScene.previewResolution,accessProof:proofScene.accessProof};return ['INSERT INTO scenes (id,provider,acquired_at,metadata,fetched_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata,fetched_at=excluded.fetched_at',[s.id,s.provider,s.acquiredAt,JSON.stringify(s),now()]];}
async function saveScene(db,s){const [sql,values]=sceneStatement(s);await db.run(sql,...values);}
// Reuse successful setup by binding, never a user's response or records.
const workspaceSetup=new WeakMap();
async function ensureWorkspace(env,db){
  let task=workspaceSetup.get(env.DB);
  if(!task){
    task=(async()=>{await bootstrap(db);await operationsBootstrap(db);const proof=await db.first('SELECT metadata FROM scenes WHERE id=?',proofScene.id);if(!proof||!JSON.parse(proof.metadata).previewFootprint)await saveScene(db,proofScene);})().catch(error=>{workspaceSetup.delete(env.DB);throw error;});
    workspaceSetup.set(env.DB,task);
  }
  await task;
}
async function bootstrap(db){const bbox=[101.05,12.49,101.4,12.72];const area={id:'rayong',kind:'area',name:'Rayong coast',bbox,timezone:'Asia/Bangkok',geometry:{type:'Polygon',coordinates:[[[bbox[0],bbox[1]],[bbox[2],bbox[1]],[bbox[2],bbox[3]],[bbox[0],bbox[3]],[bbox[0],bbox[1]]]]},dataType:'user_annotation'};await db.run('INSERT INTO records (id,kind,data,revision,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',area.id,area.kind,JSON.stringify(area),1,now(),now());}
function event(target,action,actor,reason,extra={}){return {id:uuid(),kind:'event',target,action,actor,reason,...extra};}
async function update(db,item,expected,actor,reason,extras=[]) {
  if(item.revision!==expected)fail('The record has changed. Reload the latest data before saving.',409);
  const time=now(),e=event(item.id,'update',actor,reason,{fromRevision:expected,toRevision:expected+1});
  const ei=insertStatement(e,time),conditional=[ei[0].replace('VALUES (?,?,?,?,?,?)','SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM records WHERE id = ? AND revision = ? AND updated_at = ?)'),ei[1].concat(item.id,expected+1,time)];
  const guarded=extras.map(x=>{const s=insertStatement(x,time);return [s[0].replace('VALUES (?,?,?,?,?,?)','SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM records WHERE id = ? AND revision = ? AND updated_at = ?)'),s[1].concat(item.id,expected+1,time)];});
  const result=await db.batch([updateStatement(item,expected,time),conditional,...guarded]);
  if(!result[0].meta.changes)fail('Concurrent update detected. Reload the latest data.',409);
  return record(db,item.id);
}
async function getRange(env,s,range,ctx) {
  if(!assetAllowed(s.visual))fail('This image has no COG publicly available. Configure the imagery service on the server.',422);
  const m=/^bytes=(\d+)-(\d+)$/.exec(range||'');if(!m||Number(m[2])<Number(m[1])||Number(m[2])-Number(m[1])>8388608)fail('Invalid range request',416);
  const key=`cache/${encodeURIComponent(s.id)}/${m[1]}-${m[2]}`;
  const cached=await env.BUCKET.get(key);
  if(cached)return new Response(cached.body,{status:206,headers:{'Content-Type':'image/tiff','Content-Range':cached.customMetadata.contentRange,'Accept-Ranges':'bytes','Cache-Control':'private,max-age=86400','X-XEDO-Cache':'hit'}});
  const r=await remoteFetch(s.visual,{headers:{Range:range}});if(r.status!==206)fail('The imagery source does not support range requests.',502);
  const bytes=await r.arrayBuffer();if(bytes.byteLength>8388609)fail('Image range exceeds the size limit',502);
  const contentRange=r.headers.get('Content-Range');const cacheWrite=env.BUCKET.put(key,bytes,{customMetadata:{contentRange,sceneId:s.id}});if(ctx?.waitUntil)ctx.waitUntil(cacheWrite.catch(error=>console.warn('Imagery cache write failed',error.message)));else await cacheWrite;
  return new Response(bytes,{status:206,headers:{'Content-Type':'image/tiff','Content-Range':contentRange,'Accept-Ranges':'bytes','Cache-Control':'private,max-age=86400','X-XEDO-Cache':'miss'}});
}
async function runJob(env,id) {
  const db=database(env),row=await db.first('SELECT * FROM jobs WHERE id = ?',id);if(!row||row.state==='succeeded')return;
  const claim=await db.run('UPDATE jobs SET state=?,attempts=attempts+1,updated_at=? WHERE id=? AND state IN (?,?)','running',now(),id,'queued','failed');if(!claim.meta.changes)return;
  try{const s=await scene(db,row.scene_id);await getRange(env,s,'bytes=0-65535');await db.run('UPDATE jobs SET state=?,data=?,updated_at=? WHERE id=?','succeeded',JSON.stringify({sceneId:s.id,asset:s.visual,range:'0-65535',method:'COG range cache; display tiles fetched on demand',parameterVersion:1}),now(),id);}
  catch(e){await db.run('UPDATE jobs SET state=?,data=?,updated_at=? WHERE id=?','failed',JSON.stringify({message:e.message,sceneId:row.scene_id}),now(),id);}
}
function magic(bytes,mime){const b=new Uint8Array(bytes);return mime==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:mime==='image/png'?b.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':mime==='image/webp'?new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP':mime==='application/pdf'?new TextDecoder().decode(b.slice(0,5))==='%PDF-':false;}
async function api(req,env,ctx,url) {
  if(url.pathname==='/api/v1/gee/ping') {
    if(req.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
    const nonce=url.searchParams.get('nonce');
    if(!nonce||!/^[A-Za-z0-9_-]{1,80}$/.test(nonce))fail('Invalid latency measurement request',422);
    const result=await probeGEE(env);
    return json({schema_version:'1.0',service:'gee',nonce,serverTime:now(),measurement:'http_round_trip_via_xedo',...result});
  }
  if(url.pathname==='/api/v1/ping') {
    if(req.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
    const nonce=url.searchParams.get('nonce');
    if(!nonce||!/^[A-Za-z0-9_-]{1,80}$/.test(nonce))fail('Invalid latency measurement request',422);
    return json({schema_version:'1.0',service:'xedo',nonce,serverTime:now(),measurement:'http_round_trip'});
  }
  if(!['GET','HEAD'].includes(req.method)) {
    const origin=req.headers.get('origin');if((origin&&origin!==url.origin)||req.headers.get('sec-fetch-site')==='cross-site')fail('Requests from other websites are not permitted.',403);
  }
  const db=database(env),actor=req.headers.get('oai-authenticated-user-id')||'private-workspace';
  const deployment=await deploymentPreviewAPI(req,env,db,url);if(deployment)return deployment;
  const trial=await planningTrialAPI(req,env,db,url);if(trial)return trial;
  if(url.pathname.startsWith('/api/v1/devices/')&&url.pathname.endsWith('/auth-check'))await ensureWorkspace(env,db);
  const handled=await operations(req,env,db,actor,url);if(handled)return handled;
  if(url.pathname.startsWith('/api/v1/')){url=new URL(url);url.pathname=url.pathname.replace('/api/v1/','/api/');}
  const path=url.pathname.split('/').filter(Boolean);
  if(path[1]==='study-areas')return json({items:await records(db,'area'),next_cursor:null,coverage:'complete'});
  if(['incidents','observations','survey-requests'].includes(path[1])){
    const k={incidents:'incident',observations:'observation','survey-requests':'survey'}[path[1]];
    if(req.method==='GET'&&!path[2])return json({items:await records(db,k),next_cursor:null,coverage:'complete'});
    if(req.method==='POST'&&!path[2]){const b=await body(req);req=new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify({...b,kind:k})});}
    if(path[1]==='incidents'&&path[3]==='reviews'){req=new Request(req.url,{method:'PATCH',headers:req.headers,body:JSON.stringify(await body(req))});}
    else if(path[1]==='incidents'&&path[3]==='evidence'&&req.method==='POST'){const form=await req.formData();form.set('incidentId',path[2]);req=new Request(req.url,{method:'POST',body:form,headers:Object.fromEntries([...req.headers].filter(([k])=>!['content-type','content-length'].includes(k)))});path[1]='evidence';path[2]=undefined;}
    else if(path[3])fail('Not found: API',404);if(path[1]!=='evidence')path[1]='records';
  }
  if(path[1]==='state') {
    const started=performance.now(),scope=url.searchParams.get('scope')||'full';
    if(!['full','satellite'].includes(scope))fail('Unknown workspace scope',422);
    await ensureWorkspace(env,db);
    const [recordRows,sceneRows,jobs]=await Promise.all([
      scope==='satellite'?db.all('SELECT * FROM records WHERE kind IN (?,?,?) ORDER BY created_at DESC','area','incident','observation'):db.all('SELECT * FROM records WHERE kind != ? ORDER BY created_at DESC','device_state'),
      scope==='satellite'?db.all("SELECT metadata FROM scenes WHERE id=? OR id IN (SELECT json_extract(data,'$.sceneId') FROM records WHERE kind=?)",proofScene.id,'observation'):db.all('SELECT metadata FROM scenes'),
      scope==='satellite'?Promise.resolve([]):db.all('SELECT * FROM jobs ORDER BY updated_at DESC LIMIT 20')
    ]);
    const rows=recordRows.map(unpack);
    for(const r of rows){if(r.kind==='plan')r.needsReview=planNeedsReview(r,rows);r.origin||=r.kind==='observation'?'user_annotation':r.kind==='evidence'?'user_annotation':null;r.sourceMode||='live';r.verificationState||='unreviewed';}
    const response=json({schema_version:'1.0',scope,records:rows,scenes:sceneRows.map(r=>JSON.parse(r.metadata)),jobs,storage:'server',providers:Object.entries(providers).map(([id,p])=>({id,label:p.label})),cdseProcessConfigured:false,piConfigured:Boolean(env.XEDO_PI_TOKEN),hardwareTested:false,ai:{state:'not_configured',reason:'Training data, test data, and an evaluated model are not available yet.'},user:actor});response.headers.set('Server-Timing',`workspace;dur=${(performance.now()-started).toFixed(1)}`);return response;
  }
  if(path[1]==='scenes'&&req.method==='GET') {
    const area=await record(db,url.searchParams.get('area')||'rayong');if(!area||area.kind!=='area')fail('Study area not found');
    const start=url.searchParams.get('start'),end=url.searchParams.get('end');date(start);date(end);if(start>end||Date.parse(end)-Date.parse(start)>366*86400000)fail('Select a date range of up to 366 days');
    const key=JSON.stringify({adapterVersion:3,area:area.id,revision:area.revision,start,end,provider:url.searchParams.get('provider')||'earth',cursor:url.searchParams.get('cursor')||null});
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))),x=>x.toString(16).padStart(2,'0')).join('');
    const cached=await env.BUCKET.get('catalogue/'+hash);let result;
    if(cached&&Date.now()-Number(cached.customMetadata?.at)<900000)result={...await cached.json(),cache:true};
    else{result=await searchCatalogue({...JSON.parse(key),bbox:area.bbox});if(result.scenes.length)await db.batch(result.scenes.map(sceneStatement));await env.BUCKET.put('catalogue/'+hash,JSON.stringify(result),{customMetadata:{at:String(Date.now())}});}
    result.scenes=result.scenes.map(s=>s.id===proofScene.id?{...s,localPreview:proofScene.localPreview,previewExtent:proofScene.previewExtent,previewResolution:proofScene.previewResolution,previewFootprint:proofScene.previewFootprint,accessProof:proofScene.accessProof}:s);return json(result);
  }
  if(path[1]==='jobs') {
    if(req.method==='POST') {
      const b=await body(req),s=await scene(db,b.sceneId);if(!s.visual)fail('This image has no COG publicly available',422);
      const id='prepare:'+s.id+':v1';let row=await db.first('SELECT * FROM jobs WHERE id=?',id);
      if(!row)await db.run('INSERT INTO jobs (id,scene_id,state,attempts,data,updated_at) VALUES (?,?,?,?,?,?)',id,s.id,'queued',0,'{}',now());
      else if(b.retry&&row.state==='failed'){if(row.attempts>=5)fail('Retry limit reached: 5 attempts');await db.run('UPDATE jobs SET state=?,updated_at=? WHERE id=?','queued',now(),id);}
      const current=await db.first('SELECT * FROM jobs WHERE id=?',id);if(current.state==='queued')ctx.waitUntil(runJob(env,id));return json(current,202);
    }
    const id=decodeURIComponent(path.slice(2).join('/')),row=await db.first('SELECT * FROM jobs WHERE id=?',id);if(!row)fail('Job not found',404);
    if(['queued','running'].includes(row.state)&&Date.now()-Date.parse(row.updated_at)>60000){if(row.attempts>=5)await db.run('UPDATE jobs SET state=?,data=?,updated_at=? WHERE id=?','failed',JSON.stringify({message:'The job stopped during processing and has reached its retry limit.'}),now(),id);else{await db.run('UPDATE jobs SET state=?,updated_at=? WHERE id=?','queued',now(),id);ctx.waitUntil(runJob(env,id));}}
    return json(await db.first('SELECT * FROM jobs WHERE id=?',id));
  }
  if(path[1]==='assets') {
    const s=await scene(db,decodeURIComponent(path[2]));
    if(req.method==='HEAD'){const r=await getRange(env,s,'bytes=0-65535');return new Response(null,{headers:{'Content-Type':'image/tiff','Accept-Ranges':'bytes','Content-Length':r.headers.get('Content-Range').split('/')[1]}});}
    return getRange(env,s,req.headers.get('Range'),ctx);
  }
  if(path[1]==='records') {
    const id=path[2];
    if(req.method==='POST') {
      const b=await body(req);if(!['area','incident','observation','survey'].includes(b.kind))fail('Invalid record type');
      if(!/^[a-zA-Z0-9_-]{5,80}$/.test(b.id||''))fail('Invalid record ID');
      const existing=await record(db,b.id);if(existing){if(existing.kind!==b.kind)fail('The ID already belongs to another record type.',409);return json(existing);}
      const item={id:b.id,kind:b.kind,dataType:'user_annotation',actor},extra=[];
      if(b.kind==='area'){item.name=text(b.name,100);validateGeometry(b.geometry);item.geometry=b.geometry;const r=b.geometry.coordinates[0];item.bbox=[Math.min(...r.map(p=>p[0])),Math.min(...r.map(p=>p[1])),Math.max(...r.map(p=>p[0])),Math.max(...r.map(p=>p[1]))];item.timezone='Asia/Bangkok';}
      if(b.kind==='incident'){const a=await record(db,b.areaId);if(a?.kind!=='area')fail('Invalid study area');item.title=text(b.title,160);item.areaId=b.areaId;item.status='suspicious';item.reason=text(b.reason);item.owner=text(b.owner,100);}
      if(b.kind==='observation') {
        const s=await scene(db,b.sceneId),inc=await record(db,b.incidentId);if(inc?.kind!=='incident')fail('Select an incident.');
        item.areaM2=validateGeometry(b.geometry);item.geometry=b.geometry;item.sceneId=s.id;item.incidentId=inc.id;item.sourceKind='manual';item.note=text(b.note);item.reviewer=text(b.reviewer,100);item.status='draft';
        item.assetKind=b.assetKind==='cached_preview'?'cached_preview':'cog';item.displayGrid=item.assetKind==='cached_preview'?s.accessProof?.output:{epsg:s.epsg,transform:s.transform,shape:s.shape,resolution:s.resolution};
        if(b.geometry.coordinates[0].some(p=>!pointWithin(p,s.footprint)||(item.assetKind==='cached_preview'&&s.previewFootprint&&!pointWithin(p,s.previewFootprint))))fail('The boundary is outside the source image used for review.');
        const a=await record(db,inc.areaId),r=b.geometry.coordinates[0];if(r.some(p=>!pointWithin(p,a.geometry)))fail('The boundary is outside the selected study area.');
        extra.push({id:uuid(),kind:'revision',observationId:item.id,geometry:item.geometry,sceneId:s.id,areaM2:item.areaM2,version:1,reason:item.note,actor});
      }
      if(b.kind==='survey'){const inc=await record(db,b.incidentId);if(inc?.kind!=='incident')fail('Incident not found');const obs=(await records(db,'observation')).filter(o=>o.incidentId===inc.id);if(!obs.length)fail('Save a boundary before creating a survey request.');item.incidentId=inc.id;item.title=text(b.title,160);item.note=text(b.note);item.status='draft';item.boundarySnapshot=geojsonFor(inc,obs,(await db.all('SELECT metadata FROM scenes')).map(r=>JSON.parse(r.metadata)));}
      await db.batch([insertStatement(item),...extra.map(x=>insertStatement(x)),insertStatement(event(item.id,'create',actor,b.note||b.reason||'Record created'))]);return json(await record(db,item.id),201);
    }
    if(req.method==='PATCH') {
      const old=await record(db,id);if(!old)fail('Record not found',404);const b=await body(req),reason=text(b.reason),reviewer=text(b.reviewer,100),item={...old},extra=[];
      if(old.kind==='observation') {
        if(b.geometry){const s=await scene(db,old.sceneId);if(b.geometry.coordinates[0].some(p=>!pointWithin(p,s.footprint)||(old.assetKind==='cached_preview'&&s.previewFootprint&&!pointWithin(p,s.previewFootprint))))fail('The boundary is outside the source image.');}
        if(b.geometry){item.areaM2=validateGeometry(b.geometry);item.geometry=b.geometry;const inc=await record(db,old.incidentId),a=await record(db,inc.areaId);if(b.geometry.coordinates[0].some(p=>p[0]<a.bbox[0]||p[0]>a.bbox[2]||p[1]<a.bbox[1]||p[1]>a.bbox[3]))fail('The boundary is outside the study area.');extra.push({id:uuid(),kind:'revision',observationId:id,geometry:b.geometry,sceneId:old.sceneId,areaM2:item.areaM2,version:old.revision+1,reason,actor,reviewer});}
        if(b.status){if(!observationStatuses[b.status])fail('Invalid observation status');item.status=b.status;}
        if(b.incidentId){const next=await record(db,b.incidentId);const prev=await record(db,old.incidentId);if(next?.kind!=='incident'||next.areaId!==prev.areaId)fail('Observations can only be reassigned to incidents in the same study area.');item.incidentId=next.id;if(next.id!==prev.id){const details={observationId:old.id,fromIncidentId:prev.id,toIncidentId:next.id,reviewer};extra.push(event(prev.id,'observation_moved',actor,reason,details),event(next.id,'observation_moved',actor,reason,details));}}
        if(b.note)item.note=text(b.note);
      } else if(old.kind==='incident') {
        if(b.status){if(!statuses[b.status])fail('Invalid incident status');if(b.status==='confirmed') {
          text(b.method,200);if(!['field','independent'].includes(b.level))fail('Confirmation requires field or independent evidence.');
          const ev=(await records(db,'evidence')).filter(e=>e.incidentId===id);if(!ev.some(e=>e.level===b.level))fail('Attach matching field or independent evidence before confirming the incident.');
        }item.status=b.status;extra.push({id:uuid(),kind:'review',incidentId:id,previousStatus:old.status,status:b.status,reviewer,actor,reason,method:b.method||'human-review',level:b.level||'image_interpretation',timeAssociation:text(b.timeAssociation,1000)});}
        if(b.title)item.title=text(b.title,160);item.reason=reason;
      } else if(old.kind==='survey'){if(!surveyStatuses[b.status])fail('Invalid request status');item.status=b.status;item.note=reason;}
      else fail('This record cannot be edited directly.');
      return json(await update(db,item,b.revision,actor,reason,extra));
    }
    return json(await record(db,id));
  }
  if(path[1]==='evidence'&&req.method==='POST') {
    const f=await req.formData(),inc=await record(db,f.get('incidentId'));if(inc?.kind!=='incident')fail('Incident not found');
    const file=f.get('file');if(!file||file.size<1||file.size>8*1024*1024)fail('Evidence files must not exceed 8 MB');
    const bytes=await file.arrayBuffer();if(!magic(bytes,file.type))fail('Supported images: JPG, PNG, WebP and PDF valid files only');
    const lon=f.get('longitude'),lat=f.get('latitude');let position=null;if(lon||lat){position=[Number(lon),Number(lat)];if(!lon||!lat||!position.every(Number.isFinite)||Math.abs(position[0])>180||Math.abs(position[1])>90)fail('Invalid evidence coordinates');}
    const evidenceId=f.get('id');if(!/^[a-zA-Z0-9_-]{5,80}$/.test(evidenceId||''))fail('Invalid evidence ID');const previous=await record(db,evidenceId);if(previous){if(previous.kind!=='evidence'||previous.incidentId!==inc.id)fail('Duplicate evidence ID',409);return json(previous);}
    const item={id:evidenceId,kind:'evidence',incidentId:inc.id,sceneId:f.get('sceneId')||null,name:text(file.name,240),mime:file.type,size:file.size,fieldAt:date(f.get('fieldAt')),position,method:text(f.get('method'),200),note:text(f.get('note')),reviewer:text(f.get('reviewer'),100),actor,dataType:'actual',level:f.get('level')};
    if(!['field','independent','image_interpretation'].includes(item.level))fail('Invalid evidence level');if(item.sceneId){await scene(db,item.sceneId);if(!(await records(db,'observation')).some(o=>o.incidentId===inc.id&&o.sceneId===item.sceneId))fail('The evidence image must link to an observation in this incident.');}
    item.key='evidence/'+item.id;item.sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
    await env.BUCKET.put(item.key,bytes,{httpMetadata:{contentType:item.mime}});
    await db.batch([insertStatement(item),insertStatement(event(inc.id,'evidence',actor,item.note,{evidenceId:item.id}))]);return json(await record(db,item.id),201);
  }
  if(path[1]==='files') {
    const item=await record(db,path[2]);if(item?.kind!=='evidence')fail('File not found',404);const file=await env.BUCKET.get(item.key);if(!file)fail('File not found in storage',404);
    return new Response(file.body,{headers:{'Content-Type':item.mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(item.name)}`,'X-Content-Type-Options':'nosniff','Cache-Control':'private,max-age=3600'}});
  }
  if(path[1]==='survey-export') {
    const s=await record(db,path[2]);if(s?.kind!=='survey'||!s.boundarySnapshot)fail('Survey request area not found',404);const fc=structuredClone(s.boundarySnapshot);fc.metadata.surveyRequest={...s,boundarySnapshot:undefined};const csv=url.searchParams.get('format')==='csv';return new Response(csv?csvFor(fc):JSON.stringify(fc,null,2),{headers:{'Content-Type':csv?'text/csv;charset=utf-8':'application/geo+json','Content-Disposition':`attachment; filename="XEDO-${s.id}.${csv?'csv':'geojson'}"`,'Cache-Control':'no-store'}});
  }
  if(path[1]==='export') {
    const inc=await record(db,path[2]);if(inc?.kind!=='incident')fail('Incident not found',404);
    const observations=(await records(db,'observation')).filter(o=>o.incidentId===inc.id),scenes=(await db.all('SELECT metadata FROM scenes')).map(r=>JSON.parse(r.metadata));
    const fc=geojsonFor(inc,observations,scenes,(await records(db,'review')).filter(r=>r.incidentId===inc.id).reverse(),(await records(db,'evidence')).filter(e=>e.incidentId===inc.id));
    fc.metadata.surveyRequests=(await records(db,'survey')).filter(s=>s.incidentId===inc.id);fc.metadata.boundaryRevisions=(await records(db,'revision')).filter(r=>observations.some(o=>o.id===r.observationId));
    fc.metadata.auditHistory=(await records(db,'event')).filter(e=>e.target===inc.id||observations.some(o=>o.id===e.target));
    const csv=url.searchParams.get('format')==='csv';return new Response(csv?csvFor(fc):JSON.stringify(fc,null,2),{headers:{'Content-Type':csv?'text/csv;charset=utf-8':'application/geo+json','Content-Disposition':`attachment; filename="XEDO-${inc.id}.${csv?'csv':'geojson'}"`,'Cache-Control':'no-store'}});
  }
  if(path[1]==='backup'&&req.method==='GET') {
    const all=(await db.all('SELECT * FROM records')).map(unpack),files=[];let total=0;
    if(all.length>500)fail('Browser backups are limited to 500 records Ask an administrator to back up the database.',413);
    for(const e of all.filter(x=>['evidence','asset'].includes(x.kind))){const f=await env.BUCKET.get(e.key);if(!f)fail('Evidence file or log is missing. A complete backup cannot be created.',500);const data=new Uint8Array(await f.arrayBuffer());total+=data.length;if(total>24*1024*1024)fail('Total file size exceeds 24 MB Ask an administrator to create the backup.',413);let encoded='';for(let i=0;i<data.length;i+=8192)encoded+=String.fromCharCode(...data.subarray(i,i+8192));files.push({key:e.key,base64:btoa(encoded),mime:e.mime});}
    const telemetry=await db.all('SELECT * FROM telemetry LIMIT 5001');if(telemetry.length>5000)fail('telemetry exceeds 5,000 events Ask an administrator to back up the database.',413);
    const data=JSON.stringify({schema:'xedo-backup/1',schema_version:'1.0',createdAt:now(),records:all,scenes:(await db.all('SELECT metadata FROM scenes')).map(s=>JSON.parse(s.metadata)),telemetry,jobs:await db.all('SELECT * FROM jobs'),files});if(new TextEncoder().encode(data).length>34*1024*1024)fail('Total backup size exceeds 34 MB',413);
    const fresh=(await db.all('SELECT * FROM records')).map(unpack);if(JSON.stringify(fresh.map(r=>[r.id,r.revision,r.updatedAt]).sort())!==JSON.stringify(all.map(r=>[r.id,r.revision,r.updatedAt]).sort())||(await db.first('SELECT COUNT(*) AS n FROM telemetry')).n!==telemetry.length)fail('Data changed during backup. Retry when ingestion is paused.',409);
    return new Response(data,{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="xedo-backup.json"','Cache-Control':'no-store'}});
  }
  if(path[1]==='restore'&&req.method==='POST') {
    if(Number(req.headers.get('content-length'))>35*1024*1024)fail('Backup file exceeds the size limit.',413);const b=await req.json();if(b.schema!=='xedo-backup/1'||!Array.isArray(b.records)||!Array.isArray(b.scenes)||!Array.isArray(b.files)||b.records.length>500)fail('The backup is invalid or exceeds 500 records');
    if((await records(db,'incident')).length||(await records(db,'observation')).length||(await records(db,'plan')).length||(await db.first('SELECT COUNT(*) AS n FROM telemetry')).n)fail('Restore requires a database with no incidents or mission data to prevent existing records from being overwritten.',409);
    const ids=new Set();for(const r of b.records){if(!kinds.includes(r.kind)||typeof r.id!=='string'||!/^[a-zA-Z0-9_-]{5,100}$/.test(r.id)||ids.has(r.id))fail('Invalid record in the backup');ids.add(r.id);if(r.geometry)validateGeometry(r.geometry);if(!Number.isInteger(r.revision)||r.revision<1)fail('Revision invalid');}
    for(const s of b.scenes){if(!providers[s.provider]||s.dataType!=='actual'||!s.id||!s.acquiredAt||(s.visual&&!assetAllowed(s.visual))||!s.sourceUrl?.startsWith(providers[s.provider].endpoint+'/collections/')||(s.localPreview&&s.id!==proofScene.id))fail('Invalid imagery source in the backup');}
    let total=0;const decoded=[];
    for(const f of b.files){const e=b.records.find(r=>['evidence','asset'].includes(r.kind)&&r.key===f.key);if(!e||f.key!==(e.kind==='evidence'?`evidence/${e.id}`:`assets/${e.id}`))fail('The evidence file has no linked record.');let bytes;try{bytes=Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0));}catch{fail('Invalid file data');}total+=bytes.length;let valid=magic(bytes,e.mime);if(e.kind==='asset'&&['application/json','text/csv'].includes(e.mime)){try{const value=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(e.mime==='application/json')JSON.parse(value);valid=true;}catch{valid=false;}}if(bytes.length>8*1024*1024||total>24*1024*1024||!valid)fail('The backup exceeds the size limit or contains an invalid file type.');decoded.push({key:f.key,bytes,mime:e.mime});}
    for(const e of b.records.filter(r=>['evidence','asset'].includes(r.kind)))if(!decoded.some(f=>f.key===e.key))fail('The backup is missing evidence files.');
    for(const o of b.records.filter(r=>r.kind==='observation'))if(!b.scenes.some(s=>s.id===o.sceneId)||!b.records.some(i=>i.id===o.incidentId&&i.kind==='incident'))fail('The observation is missing its source image or incident.');
    for(const r of b.records.filter(r=>['plan','capture','processing','run'].includes(r.kind))){if(!b.records.some(i=>i.kind==='incident'&&i.id===r.incidentId))fail('Mission data is missing its source incident.');if(r.kind==='plan'&&(!b.records.some(i=>i.id===r.profileId&&i.kind==='profile')||!b.records.some(i=>i.id===r.surveyId&&i.kind==='survey')))fail('The plan is missing profile or survey request');if(r.kind==='run'&&!b.records.some(i=>i.id===r.logAssetId&&i.kind==='asset'))fail('run missing log');if(r.kind==='capture'&&!b.records.some(i=>i.id===r.imageAssetId&&i.kind==='asset'))fail('capture Original image missing');if(r.kind==='processing'&&!b.records.some(i=>i.id===r.captureId&&i.kind==='capture'))fail('Processing results are missing their source image.');}
    if(b.telemetry&&(!Array.isArray(b.telemetry)||b.telemetry.length>5000))fail('telemetry Invalid backup');const eventIds=new Set(),eventSequences=new Set();for(const r of b.telemetry||[]){let e;try{e=JSON.parse(r.payload);}catch{fail('telemetry payload invalid');}const seq=[r.device_id,r.mode,r.boot_id,r.sequence].join('|');if(!/^[a-f0-9]{64}$/.test(r.id)||eventIds.has(r.id)||eventSequences.has(seq)||!['live','replay'].includes(r.mode)||!b.records.some(d=>d.kind==='device'&&d.id===r.device_id)||!Number.isInteger(r.sequence)||r.sequence<0||e.device_id!==r.device_id||e.boot_id!==r.boot_id||e.sequence!==r.sequence||e.source_mode!==r.mode||!Number.isFinite(Date.parse(r.received_at))||!Number.isFinite(Date.parse(r.observed_at)))fail('telemetry is invalid in the backup');eventIds.add(r.id);eventSequences.add(seq);}
    if(b.jobs&&(!Array.isArray(b.jobs)||b.jobs.length>500))fail('jobs Invalid backup');for(const j of b.jobs||[])if(typeof j.id!=='string'||!['queued','running','succeeded','failed','cancelled'].includes(j.state)||!Number.isInteger(j.attempts)||j.attempts<0||!Number.isFinite(Date.parse(j.updated_at))||!b.scenes.some(s=>s.id===j.scene_id)&&!b.records.some(p=>p.kind==='plan'&&p.id===j.scene_id))fail('job missing source or invalid status');
    for(const f of decoded){const e=b.records.find(r=>r.key===f.key);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',f.bytes)),x=>x.toString(16).padStart(2,'0')).join('');if(hash!==e.sha256||f.bytes.length!==e.size)fail('Checksum or the evidence file size does not match the backup');}
    for(const f of decoded)await env.BUCKET.put(f.key,f.bytes,{httpMetadata:{contentType:f.mime}});
    for(const s of b.scenes)await saveScene(db,s);
    await db.batch(b.records.map(r=>{const s=insertStatement(r,r.createdAt);s[0]+=' ON CONFLICT(id) DO NOTHING';return s;}));
    for(let i=0;i<(b.telemetry||[]).length;i+=500){const rows=b.telemetry.slice(i,i+500);await db.run('INSERT INTO telemetry(id,device_id,mode,boot_id,sequence,observed_at,received_at,payload) SELECT json_extract(value,\'$.id\'),json_extract(value,\'$.device_id\'),json_extract(value,\'$.mode\'),json_extract(value,\'$.boot_id\'),json_extract(value,\'$.sequence\'),json_extract(value,\'$.observed_at\'),json_extract(value,\'$.received_at\'),json_extract(value,\'$.payload\') FROM json_each(?)',JSON.stringify(rows));}
    if(b.jobs?.length)await db.batch(b.jobs.map(j=>['INSERT INTO jobs (id,scene_id,state,attempts,data,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',[j.id,j.scene_id,j.state,j.attempts,j.data,j.updated_at]]));
    await db.batch([insertStatement(event('workspace','restore',actor,'Complete backup restored.'))]);return json({restored:b.records.length,files:decoded.length});
  }
  fail('Not found: API',404);
}
export default {async fetch(req,env,ctx){const url=new URL(req.url);try{if(url.pathname.startsWith('/api/'))return await api(req,env,ctx,url);if(env.ASSETS){const response=await env.ASSETS.fetch(req);if(response.ok&&/^\/(?:app-[A-Z0-9]{8}\.(?:js|css)|chunks\/[^/]+-[A-Z0-9]{8}\.js)$/.test(url.pathname)){const headers=new Headers(response.headers);headers.set('Cache-Control','public,max-age=31536000,immutable');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}return response;}return new Response('Static assets unavailable',{status:503});}catch(e){console.error('XEDO request failed',url.pathname,e.message);const status=e.status||503;return json({code:e.code||(status===409?'REVISION_CONFLICT':status===404?'NOT_FOUND':status===503?'SERVICE_UNAVAILABLE':'VALIDATION_ERROR'),message:e.message||'Service unavailable',details:e.details||{},retryable:[429,502,503,504].includes(status),request_id:crypto.randomUUID(),error:e.message||'Service unavailable'},status);}}};
