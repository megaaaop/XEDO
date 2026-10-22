const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.XEDO_PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:5190';
const cwd=path.resolve(__dirname,'..');
const output=path.join(cwd,'output','race-audit');
const results={checks:[],errors:[]};
function gate(){
  let arrive,release;const requested=new Promise(r=>arrive=r),released=new Promise(r=>release=r);
  return {get requested(){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Expected request did not arrive')),10000);requested.then(()=>{clearTimeout(timer);resolve();});});},release,async hold(route,response){arrive();await released;await route.fulfill(response).catch(()=>{});}};
}
async function startServer(){
  const server=spawn(process.execPath,['server.mjs'],{cwd,windowsHide:true,env:{...process.env,PORT:'5190',XEDO_DATA_DIR:'output/race-audit/data'},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server did not start')),15000);server.stdout.on('data',b=>{if(b.toString().includes('preview ready')){clearTimeout(timer);resolve();}});server.on('error',reject);});
  return server;
}
async function api(method,route,body){const r=await fetch(origin+'/api/'+route,{method,headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert(r.ok,JSON.stringify(data));return data;}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const server=await startServer();let browser;
  try {
    const state=await api('GET','state'),proof=state.scenes.find(s=>s.localPreview);
    const geometry={type:'Polygon',coordinates:[[[101.20,12.60],[101.202,12.60],[101.202,12.602],[101.20,12.602],[101.20,12.60]]]};
    await api('POST','records',{id:'INC_race_A',kind:'incident',areaId:'rayong',title:'Race fixture A',owner:'Browser QA',reason:'Local test only'});
    await api('POST','records',{id:'INC_race_B',kind:'incident',areaId:'rayong',title:'Race fixture B',owner:'Browser QA',reason:'Local test only'});
    await api('POST','records',{id:'OBS_race',kind:'observation',incidentId:'INC_race_A',sceneId:proof.id,geometry,note:'Local test only',reviewer:'Browser QA',assetKind:'cached_preview'});
    await api('POST','records',{id:'SUR_race',kind:'survey',incidentId:'INC_race_A',title:'Browser race test survey',note:'Local test only'});
    await api('POST','records',{id:'area_race_B',kind:'area',name:'Second test area',geometry:{type:'Polygon',coordinates:[[[100.5,13.7],[100.51,13.7],[100.51,13.71],[100.5,13.71],[100.5,13.7]]]}});
    const plan=await api('POST','v1/mission-plans',{id:'MSN_race',surveyId:'SUR_race',observationId:'OBS_race',profileId:state.records.find(r=>r.kind==='profile'&&r.sourceMode==='simulated').id,home:[101.2,12.6],spacingM:50,purpose:'survey'});
    const run=await api('POST','v1/runs',{id:'SIM_race',planId:plan.id,scenario:'success',seed:51,startedAt:'2026-10-04T03:00:00Z'});
    const log=await api('GET','v1/runs/'+run.id+'/log');
    browser=await chromium.launch({headless:true,...(process.env.XEDO_CHROME_PATH?{executablePath:process.env.XEDO_CHROME_PATH}:{}),args:['--no-proxy-server','--enable-unsafe-swiftshader']});
    async function check(name,test){
      const context=await browser.newContext({viewport:{width:1440,height:960}});
      await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
      const page=await context.newPage();page.setDefaultTimeout(10000);
      page.on('pageerror',e=>results.errors.push({check:name,message:e.message}));
      const open=async target=>{await page.goto(origin+'/dashboard.html#'+target);await page.waitForFunction(n=>{const el=document.getElementById(n+'-page');return performance.getEntriesByName('xedo:workspace-ready','measure').length&&!el.hidden&&!el.inert;},target);if(target==='satellite')await page.waitForFunction(()=>!document.getElementById('draw').disabled);};
      try {await test({page,context,open});results.checks.push({name,passed:true});console.log('PASS '+name);}
      catch(e){results.checks.push({name,passed:false,error:e.message});console.log('FAIL '+name+' '+e.message);await page.screenshot({path:path.join(output,name.replaceAll(/[^a-z0-9]/gi,'-')+'.png')}).catch(()=>{});}
      finally {await context.close();}
    }
    const live={configured:true,connection:'connected',last_seen:'2026-10-04T03:00:00Z',latest:{observed_at:'2026-10-04T03:00:00Z',position:{valid:true,longitude:100.501,latitude:13.753},battery:{percent:80}}};
    const mockLive=page=>page.route('**/api/v1/devices/pi-001/state?mode=live',r=>r.fulfill({json:live}));
    const settle=page=>page.waitForTimeout(300);
    await check('Changing area rejects the pending old catalogue',async({page,open})=>{
      await open('satellite');const pending=gate();
      await page.route('**/api/scenes?*',r=>pending.hold(r,{json:{scenes:[{...proof,id:'old-area-scene',productId:'Old area image'}],next:null,fetchedAt:new Date().toISOString()}}));
      await page.locator('#latest').click();await pending.requested;await page.locator('#satellite-dialog-close').click();
      await page.locator('#area-select').selectOption('area_race_B');pending.release();await settle(page);
      assert.equal(await page.locator('#scene-count').textContent(),'0');
      assert.equal(await page.locator('#raster-status').textContent(),'No image selected');
      assert(await page.locator('#search-button').isEnabled());
      assert.equal(await page.locator('#scene-list').getAttribute('inert'),null);
    });
    await check('Delayed Replay log cannot replace Live',async({page,open})=>{
      await open('monitor');await mockLive(page);await page.locator('[data-monitor-mode="replay"]').click();await page.locator('#replay-run').selectOption(run.id);
      const pending=gate();await page.route('**/api/v1/runs/'+run.id+'/log',r=>pending.hold(r,{json:log}));
      await page.locator('#open-replay').click();await pending.requested;await page.locator('[data-monitor-mode="live"]').click();
      await page.waitForFunction(()=>document.getElementById('monitor-summary').textContent.includes('Last contact Pi'));pending.release();await settle(page);
      assert.match(await page.locator('#monitor-summary').textContent(),/Last contact Pi/);
      assert.doesNotMatch(await page.locator('#monitor-summary').textContent(),/Simulated progress/);
    });
    await check('Simulation save cannot replace a later Live selection',async({page,context,open})=>{
      await open('monitor');await mockLive(page);await page.locator('#sim-plan').selectOption(plan.id);const pending=gate();
      let savedId;await page.route('**/api/v1/runs',async r=>{const saved=await context.request.post(origin+'/api/v1/runs',{data:r.request().postDataJSON()});assert(saved.ok());const data=await saved.json();savedId=data.id;await pending.hold(r,{status:saved.status(),json:data});});
      await page.locator('#simulation-form button').click();await pending.requested;await page.locator('[data-monitor-mode="live"]').click();pending.release();
      await page.waitForFunction(()=>!document.querySelector('#simulation-form button').disabled);await settle(page);
      assert.match(await page.locator('#monitor-summary').textContent(),/Last contact Pi/);
      assert(savedId);const savedState=await context.request.get(origin+'/api/state');assert(savedState.ok());assert((await savedState.json()).records.some(record=>record.id===savedId));
    });
    await check('Delayed import cannot replace a newer Replay log',async({page,context,open})=>{
      await open('monitor');await page.locator('[data-monitor-mode="replay"]').click();const pending=gate();let importedId;
      await page.route('**/api/v1/runs/import',async r=>{const saved=await context.request.post(origin+'/api/v1/runs/import',{data:r.request().postDataJSON()});assert(saved.ok());const data=await saved.json();importedId=data.id;await pending.hold(r,{status:saved.status(),json:data});});
      await page.locator('#import-log-file').setInputFiles({name:'replay.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(log))});
      await pending.requested;await page.locator('#replay-run').selectOption(run.id);await page.locator('#open-replay').click();await page.waitForFunction(()=>!document.getElementById('replay-play').disabled);
      pending.release();await page.waitForFunction(()=>document.getElementById('import-log-file').value==='');await settle(page);
      assert.equal(await page.locator('#monitor-summary a[download]').getAttribute('href'),'/api/v1/assets/'+run.logAssetId);
      assert(importedId);const state=await (await context.request.get(origin+'/api/state')).json();assert(state.records.some(record=>record.id===importedId));
    });
    await check('A stale Live failure cannot replace Replay',async({page,open})=>{
      await open('monitor');const pending=gate();await page.route('**/api/v1/devices/pi-001/state?mode=live',r=>pending.hold(r,{status:503,json:{message:'Old live request failed'}}));
      await page.locator('[data-monitor-mode="live"]').click();await pending.requested;await page.locator('[data-monitor-mode="replay"]').click();
      await page.locator('#replay-run').selectOption(run.id);await page.locator('#open-replay').click();await page.waitForFunction(()=>!document.getElementById('replay-play').disabled);
      pending.release();await settle(page);assert.match(await page.locator('#monitor-summary').textContent(),/Simulated progress/);
      assert.doesNotMatch(await page.locator('#monitor-summary').textContent(),/Old live request failed/);
    });
    await check('First Live GPS recenters after Replay',async({page,open})=>{
      await open('monitor');await mockLive(page);await page.locator('[data-monitor-mode="replay"]').click();await page.locator('#replay-run').selectOption(run.id);await page.locator('#open-replay').click();
      await page.waitForFunction(()=>!document.getElementById('replay-play').disabled);
      const centerHasMarker=()=>[...document.querySelectorAll('#monitor-map canvas')].some(canvas=>{const ctx=canvas.getContext('2d');if(!ctx)return false;const p=ctx.getImageData(Math.floor(canvas.width/2)-2,Math.floor(canvas.height/2)-2,5,5).data;for(let i=0;i<p.length;i+=4)if(p[i]>245&&p[i+1]>245&&p[i+2]>245&&p[i+3]>230)return true;return false;});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.evaluate(centerHasMarker),false);
      await page.locator('[data-monitor-mode="live"]').click();
      await page.waitForFunction(()=>document.getElementById('monitor-summary').textContent.includes('Last contact Pi'));
      await page.waitForFunction(()=>[...document.querySelectorAll('#monitor-map canvas')].some(canvas=>{
        const ctx=canvas.getContext('2d');if(!ctx)return false;const x=Math.floor(canvas.width/2),y=Math.floor(canvas.height/2),p=ctx.getImageData(x-2,y-2,5,5).data;
        for(let i=0;i<p.length;i+=4)if(p[i]>245&&p[i+1]>245&&p[i+2]>245&&p[i+3]>230)return true;return false;
      }),null,{timeout:2500});
    });
    await check('Live Replay Live ignores the first Live response',async({page,open})=>{
      await open('monitor');const pending=gate();let first=true;
      await page.route('**/api/v1/devices/pi-001/state?mode=live',r=>{if(first){first=false;return pending.hold(r,{json:{...live,connection:'obsolete-live-response'}});}return r.fulfill({json:live});});
      await page.locator('[data-monitor-mode="live"]').click();await pending.requested;await page.locator('[data-monitor-mode="replay"]').click();await page.locator('[data-monitor-mode="live"]').click();
      await page.waitForFunction(()=>document.getElementById('monitor-summary').textContent.includes('connected'));pending.release();await settle(page);
      assert.doesNotMatch(await page.locator('#monitor-summary').textContent(),/obsolete-live-response/);
      assert.match(await page.locator('#monitor-summary').textContent(),/connected/);
    });
    await check('Old report failure cannot replace a new filter',async({page,open})=>{
      await open('results');const pending=gate();await page.route('**/api/v1/incidents/INC_race_A/report',r=>pending.hold(r,{status:503,json:{message:'Old report request failed'}}));
      await page.locator('#result-incident').selectOption('INC_race_A');await pending.requested;await page.locator('#result-incident').selectOption('INC_race_B');
      await page.waitForFunction(()=>document.getElementById('results-content').textContent.includes('Race fixture B'));pending.release();await settle(page);
      assert.match(await page.locator('#results-content').textContent(),/Race fixture B/);
    });
    await check('Old same-filter refresh cannot replace the latest report',async({page,context,open})=>{
      await open('results');const pending=gate();let first=true;
      const old=await (await context.request.get(origin+'/api/v1/incidents/INC_race_A/report')).json();old.incident.title='Old report snapshot';
      await page.route('**/api/v1/incidents/INC_race_A/report',r=>{if(first){first=false;return pending.hold(r,{json:old});}return r.continue();});
      await page.locator('#result-incident').selectOption('INC_race_A');await pending.requested;await page.locator('#refresh-report').click();
      await page.waitForFunction(()=>document.getElementById('results-content').textContent.includes('Race fixture A'));pending.release();await settle(page);
      assert.doesNotMatch(await page.locator('#results-content').textContent(),/Old report snapshot/);
    });
    await check('Missing operations module has working reload recovery',async({page,context,open})=>{
      const stateGate=gate(),moduleGate=gate(),fullState=await (await context.request.get(origin+'/api/state')).json();
      const missing='**/chunks/operations-client-*.js';await page.route(missing,r=>{moduleGate.release();return moduleGate.hold(r,{status:404,body:'Not found'});});
      await page.route('**/api/state',r=>stateGate.hold(r,{json:fullState}));
      await open('satellite');await page.locator('nav [data-page="planner"]').click();await stateGate.requested;await moduleGate.requested;await settle(page);stateGate.release();await page.locator('#global-error').waitFor({state:'visible'});
      assert.match(await page.locator('#global-error').textContent(),/Reload/);
      await page.unroute(missing);await page.locator('#reload-workspace').click();
      await page.waitForFunction(()=>document.getElementById('planner-profile').options.length>1&&!document.getElementById('planner-page').inert);
      assert.equal(await page.locator('#global-error').isVisible(),false);
    });
    await check('Missing TIFF module has working reload recovery',async({page,open})=>{
      await open('satellite');const missing='**/chunks/raster-cog-*.js';await page.route(missing,r=>r.fulfill({status:404,body:'Not found'}));
      await page.route('**/api/scenes?*',r=>r.fulfill({json:{scenes:[{...proof,id:'missing-decoder-scene',localPreview:null,visual:'https://example.test/image.tif'}],next:null}}));
      await page.route('**/api/jobs',r=>r.fulfill({json:{id:'missing-module-job',state:'succeeded'}}));
      await page.locator('#latest').click();await page.locator('#satellite-dialog-close').click();await page.locator('#global-error').waitFor({state:'visible'});
      assert.match(await page.locator('#global-error').textContent(),/Reload/);assert.equal(await page.locator('#draw').isEnabled(),false);
      await page.unroute(missing);await page.locator('#reload-workspace').click();await page.waitForFunction(()=>!document.getElementById('draw').disabled);
      assert.equal(await page.locator('#global-error').isVisible(),false);
    });
    fs.writeFileSync(path.join(output,(process.argv[2]||'latest')+'.json'),JSON.stringify(results,null,2));
    assert.equal(results.checks.filter(c=>!c.passed).length,0,JSON.stringify(results.checks.filter(c=>!c.passed)));
    assert.deepEqual(results.errors,[]);
  } finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
