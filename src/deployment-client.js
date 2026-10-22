import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import {Style,Stroke,Circle as CircleStyle,Fill,Text} from 'ol/style.js';

const $=selector=>document.querySelector(selector);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const distance=value=>value>=1000?(value/1000).toFixed(2)+' km':Math.round(value)+' m';
const duration=value=>value<3600?Math.ceil(value/60)+' min':(value/3600).toFixed(1)+' h';

export function createDeploymentPlanner({map,format,api,getSelection,setBusy,announce}) {
  const routes=new VectorSource();
  const routeLayer=new VectorLayer({source:routes,style:feature=>feature.getGeometry().getType()==='Point'?
    new Style({image:new CircleStyle({radius:7,fill:new Fill({color:'#ffcc7a'}),stroke:new Stroke({color:'#102b3e',width:2})}),text:new Text({text:'START',offsetY:-18,font:'600 11px sans-serif',fill:new Fill({color:'#ffffff'}),stroke:new Stroke({color:'#102b3e',width:3})})}):
    [new Style({stroke:new Stroke({color:'#0b2031bb',width:5})}),new Style({stroke:new Stroke({color:feature.get('purpose')==='survey'?'#ffcc7a':'#9aaefd',width:2.5,lineDash:feature.get('purpose')==='survey'?undefined:[5,6]})})]});
  map.addLayer(routeLayer);
  let active=false,working=false,mode='2d',result=null,renderer=null,rendererTask=null,requestToken=0,controller=null;
  const tabs=[$('#mission-view-2d'),$('#mission-view-3d')];
  const empty3DMarkup=$('#mission-3d-empty').innerHTML;

  function controls(){
    $('#mission-plan-generate').disabled=working||!active||!getSelection().saved;
    $('#mission-plan-download').disabled=working||!result||result.plan.status!=='generated';
    for(const input of document.querySelectorAll('#mission-plan-settings input'))input.disabled=working;
  }
  function status(message){$('#mission-plan-status').textContent=message;}
  function showContext(context){
    const state=context?.state;
    const label=state==='connected'?'GEE data received':state==='not_configured'?'GEE not connected':state==='disabled'?'Local preview':state==='error'?'GEE data unavailable':'GEE not checked';
    $('#mission-plan-data-state').textContent=label;
    $('#mission-plan-data-state').dataset.state=state||'unknown';
    const samples=context?.samples||[],elevations=samples.filter(s=>Number.isFinite(s.elevationM)),water=samples.filter(s=>Number.isFinite(s.waterOccurrencePct));
    const rows=[['Terrain & water',context?.message||'Generate a plan to check available GEE data.'],
      ['Ground samples',elevations.length?elevations.length+' samples · '+Math.min(...elevations.map(s=>s.elevationM)).toFixed(1)+' to '+Math.max(...elevations.map(s=>s.elevationM)).toFixed(1)+' m MSL. Gaps remain unknown.':'No ground elevation available. The 3D diagram uses a flat local reference.'],
      ['Historical water',water.length?water.filter(s=>s.waterOccurrencePct<50).length+' of '+water.length+' sampled points have water occurrence below 50%. Review shoreline and land exposure. This is historical context.':'Water occurrence is unknown. No shoreline or water-only route has been verified.'],
      ['Datasets',(context?.datasets||[]).map(d=>(d.label||d.id)+(d.period?' · '+d.period:'')+(Number.isFinite(d.resolutionM)?' · '+d.resolutionM+' m resolution':'')).join('; ')||'No GEE dataset has been read.'],
      ['Route source','Your saved polygon. Parallel survey tracks are estimates.'],
      ['Starting point','First boundary vertex, assumed for this preview.'],
      ['Height reference','Requested height above ground (AGL). Any MSL values are estimates at sampled points.'],
      ['Imagery',getSelection().scene?.productId||'Original survey image'],
      ['Checks still required','Wind, obstacles, airspace, battery capacity and physical drone setup.']];
    if(context?.sampledAt)rows.splice(3,0,['GEE retrieved',context.sampledAt]);
    $('#mission-plan-data-details').innerHTML='<dl>'+rows.map(([label,value])=>'<dt>'+escape(label)+'</dt><dd>'+escape(value)+'</dd>').join('')+'</dl>';
  }
  async function update3D(){
    const token=requestToken;
    if(mode!=='3d'||!active)return;
    const generated=result?.plan.status==='generated';
    $('#mission-3d-empty').innerHTML=empty3DMarkup;
    $('#mission-3d-empty').hidden=generated;$('#mission-3d-canvas').hidden=!generated;$('#mission-3d-tools').hidden=!generated;
    if(!generated){$('#mission-3d-description').textContent='';return;}
    try{
      if(!renderer){rendererTask??=import('./deployment-3d.js').then(({createDeployment3D})=>createDeployment3D($('#mission-3d-canvas'))).catch(error=>{rendererTask=null;throw error;});renderer=await rendererTask;}
      if(token!==requestToken||mode!=='3d'||!active)return;
      const info=renderer.setData({plan:result.plan,context:result.context});renderer.resize();
      const description=info?.description||renderer.getDescription?.()||'Drag to orbit. Scroll to zoom. Preview only.';
      $('#mission-3d-description').textContent=info?.displayNote||'Planning preview only. Terrain clearance is not verified.';$('#mission-map-caption').textContent=$('#mission-3d-description').textContent;$('#mission-3d-canvas').setAttribute('aria-label',description);
    }catch(error){
      if(token!==requestToken)return;
      const empty=$('#mission-3d-empty');empty.hidden=false;
      empty.innerHTML='<strong>The 3D view could not be loaded.</strong><p>Keep reviewing in 2D, or reload the page and generate the preview again. Your saved inspection area is retained.</p>';
      const reload=document.createElement('button');reload.type='button';reload.className='button secondary';reload.textContent='Reload page';reload.onclick=()=>location.reload();empty.append(reload);
      $('#mission-3d-canvas').hidden=true;$('#mission-3d-tools').hidden=true;$('#mission-3d-description').textContent='';
    }
  }
  function view(next){
    mode=next;tabs.forEach((tab,index)=>{const selected=(index===0?'2d':'3d')===mode;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    const three=active&&mode==='3d';$('#mission-map').hidden=three;$('#mission-3d').hidden=!three;$('#mission-fit').hidden=three;
    if(active){$('#mission-map-label').textContent=three?'3D mission preview · Estimated heights':'2D mission plan · Draft route';$('#mission-fit').setAttribute('aria-label',three?'Reset 3D view':'Fit selected area');if(result?.plan.status==='generated')$('#mission-map-caption').textContent=three?'3D height diagram · Same route as the 2D plan · Preview only':'Survey route in amber · Connecting route in violet · Preview only';}
    if(three)update3D();else requestAnimationFrame(()=>map.updateSize());
  }
  tabs.forEach((tab,index)=>{tab.onclick=()=>{if(active)view(index===0?'2d':'3d');};tab.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const index=event.key==='Home'?0:event.key==='End'?1:mode==='2d'?1:0;view(index===0?'2d':'3d');tabs[index].focus();}};});
  $('#mission-3d-reset').onclick=()=>renderer?.reset();
  function drawPlan(){
    routes.clear();if(result?.plan.status!=='generated')return;
    for(const segment of result.plan.segments){const from=result.plan.waypoints[segment.from],to=result.plan.waypoints[segment.to];routes.addFeature(format.readFeature({type:'Feature',geometry:{type:'LineString',coordinates:[from.position,to.position]},properties:{purpose:segment.purpose}},{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}));}
    const start=result.plan.waypoints[0];if(start)routes.addFeature(format.readFeature({type:'Feature',geometry:{type:'Point',coordinates:start.position}},{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}));
  }
  function invalidate(message='Generate a route to compare the 2D and 3D views.'){
    requestToken++;controller?.abort();controller=null;result=null;routes.clear();$('#mission-plan-summary').hidden=true;$('#mission-plan-warnings').hidden=true;$('#mission-plan-warnings').textContent='';$('#mission-3d-description').textContent='';
    status(message);showContext(null);controls();update3D();
  }
  for(const input of document.querySelectorAll('#mission-plan-settings input'))input.addEventListener('change',()=>{if(!working)invalidate('Settings changed. Generate the plan again to update both views.');});
  $('#mission-plan-generate').onclick=async()=>{
    const selection=getSelection();if(working||!active||!selection.saved)return;
    const form=$('#mission-plan-settings');if(!form.checkValidity()){form.closest('details').open=true;form.reportValidity();return;}
    invalidate('Generating survey route and checking planning data…');const token=requestToken;controller=new AbortController();const deadline=setTimeout(()=>controller?.abort(),25000);
    setBusy(true);announce('Generating a mission preview. No flight command is sent.');
    try{
      const data=await api('v1/deployment-preview',{method:'POST',signal:controller.signal,body:JSON.stringify({surveyId:selection.saved.surveyId,altitudeM:Number($('#mission-plan-altitude').value),spacingM:Number($('#mission-plan-spacing').value),speedMps:Number($('#mission-plan-speed').value),useGEE:$('#mission-plan-gee').checked})});
      if(token!==requestToken||getSelection().saved?.surveyId!==selection.saved.surveyId)return;
      result=data;showContext(data.context);drawPlan();
      if(data.plan.status==='generated'){
        const estimates=data.plan.estimates;$('#mission-plan-distance').textContent=distance(estimates.distanceM);$('#mission-plan-duration').textContent=duration(estimates.durationS);$('#mission-plan-height').textContent=$('#mission-plan-altitude').value+' m AGL';$('#mission-plan-waypoints').textContent=data.plan.waypoints.length;
        $('#mission-plan-summary').hidden=false;status(data.context?.state==='connected'?'Draft route ready. GEE samples are included where available.':'Draft route ready. GEE terrain is not included.');
        $('#mission-map-caption').textContent='Survey route in amber · Connecting route in violet · Preview only';
      }else status(data.plan.reason||'The route could not be generated. Adjust the settings or choose a smaller area.');
      const warnings=data.plan.warnings||[];$('#mission-plan-warnings').hidden=!warnings.length;$('#mission-plan-warnings').textContent=warnings.join(' ');controls();view(mode);announce($('#mission-plan-status').textContent);
    }catch(error){if(token!==requestToken)return;result=null;routes.clear();status(error.name==='AbortError'?'Planning timed out. Try again.':error.message||'Unable to generate the plan.');controls();update3D();announce($('#mission-plan-status').textContent);}
    finally{clearTimeout(deadline);if(token===requestToken){controller=null;setBusy(false);}}
  };
  $('#mission-plan-download').onclick=()=>{
    if(!result||result.plan.status!=='generated')return;
    const url=URL.createObjectURL(new Blob([JSON.stringify({...result,exportedAt:new Date().toISOString(),purpose:'planning_preview_only'},null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='XEDO-'+result.surveyId+'-preview.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const onHide=()=>{requestToken++;if(controller){controller.abort();controller=null;status('Planning cancelled. Generate a plan to try again.');setBusy(false);}};window.addEventListener('pagehide',onHide);
  $('#mission-plan-settings').addEventListener('submit',event=>event.preventDefault());
  showContext(null);controls();
  return {
    setActive(value){active=value;routeLayer.setVisible(value);if(!value)view('2d');else view(mode);controls();},
    busy(value){working=value;controls();},
    refresh(){if(active)view(mode);},
    reset(){invalidate();view('2d');renderer?.reset();},
    fit(){if(active&&mode==='3d'){renderer?.reset();return true;}return false;},
    destroy(){onHide();window.removeEventListener('pagehide',onHide);map.removeLayer(routeLayer);renderer?.destroy();},
  };
}
