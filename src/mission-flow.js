import {pointWithin,validateGeometry} from './domain.js';

export function selectionMetrics(geometry) {
  const areaM2=validateGeometry(geometry),ring=geometry.coordinates[0];
  const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
  const bbox=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  const point=[(bbox[0]+bbox[2])/2,(bbox[1]+bbox[3])/2],metresPerRadian=6371008.8,rad=Math.PI/180;
  return {bbox,point,widthM:(bbox[2]-bbox[0])*rad*metresPerRadian*Math.cos(point[1]*rad),heightM:(bbox[3]-bbox[1])*rad*metresPerRadian,areaM2};
}
function validateSelection(geometry) {
  const metrics=selectionMetrics(geometry),[west,south,east,north]=metrics.bbox;
  if(south < -80||north > 80||east-west > 180)throw new Error('Select an area between 80° south and 80° north that does not cross the date line.');
  return metrics;
}
export function inspectionRectangle(extent) {
  if(!Array.isArray(extent)||extent.length!==4||!extent.every(Number.isFinite))throw new Error('Select a valid rectangle on the map.');
  const west=Math.min(extent[0],extent[2]),east=Math.max(extent[0],extent[2]),south=Math.min(extent[1],extent[3]),north=Math.max(extent[1],extent[3]);
  if(west===east||south===north)throw new Error('Drag an area with both width and height.');
  const geometry={type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]};
  validateSelection(geometry);return geometry;
}
export function inspectionZone(point,halfWidth=500) {
  if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||Math.abs(point[0])>179.8||Math.abs(point[1])>80)throw new Error('Choose a point between 80° south and 80° north, away from the date line.');
  if(![250,500,1000].includes(halfWidth))throw new Error('Choose a supported inspection size.');
  const dy=halfWidth/111320,dx=dy/Math.cos(point[1]*Math.PI/180),[x,y]=point;
  const geometry={type:'Polygon',coordinates:[[[x-dx,y-dy],[x+dx,y-dy],[x+dx,y+dy],[x-dx,y+dy],[x-dx,y-dy]]]};
  validateGeometry(geometry);return geometry;
}
function componentCovers(component,geometry) {
  if(!Array.isArray(component)||!component.length||component.some(r=>!Array.isArray(r)||r.length<4||r.some(p=>!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite))||r[0][0]!==r.at(-1)[0]||r[0][1]!==r.at(-1)[1]))return false;
  const polygon=ring=>({type:'Polygon',coordinates:[ring]}),selection=geometry.coordinates[0];
  const inside=p=>pointWithin(p,polygon(component[0]))&&!component.slice(1).some(hole=>pointWithin(p,polygon(hole)));
  if(!selection.every(inside))return false;
  // Split selected edges at footprint intersections: corners alone can straddle
  // a concave edge or a gap. Each open interval must remain in this component.
  const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],minus=(a,b)=>[a[0]-b[0],a[1]-b[1]];
  for(let i=0;i<selection.length-1;i++) {
    const a=selection[i],b=selection[i+1],direction=minus(b,a),length2=direction[0]**2+direction[1]**2,cuts=[0,1];
    for(const ring of component)for(let j=0;j<ring.length-1;j++) {
      const c=ring[j],d=ring[j+1],edge=minus(d,c),offset=minus(c,a),denominator=cross(direction,edge);
      if(denominator!==0) {
        const t=cross(offset,edge)/denominator,u=cross(offset,direction)/denominator;
        if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
      } else if(cross(offset,direction)===0) {
        for(const p of [c,d]){const delta=minus(p,a),t=(delta[0]*direction[0]+delta[1]*direction[1])/length2;if(t>0&&t<1)cuts.push(t);}
      }
    }
    cuts.sort((a,b)=>a-b);
    for(let j=0;j<cuts.length-1;j++)if(cuts[j+1]-cuts[j]>1e-12){const t=(cuts[j]+cuts[j+1])/2;if(!inside([a[0]+direction[0]*t,a[1]+direction[1]*t]))return false;}
  }
  // A hole wholly inside the selected area never intersects its boundary.
  return !component.slice(1).some(hole=>hole.some(p=>pointWithin(p,geometry)));
}
function footprintCovers(footprint,geometry) {
  const components=footprint?.type==='Polygon'?[footprint.coordinates]:footprint?.type==='MultiPolygon'?footprint.coordinates:[];
  return Array.isArray(components)&&components.some(component=>componentCovers(component,geometry));
}
export function coveringScenes(scenes,geometry) {
  return scenes.filter(s=>s.visual||s.localPreview).filter(s=>footprintCovers(s.footprint,geometry)&&(!s.localPreview||!s.previewFootprint||footprintCovers(s.previewFootprint,geometry))).sort((a,b)=>Date.parse(b.acquiredAt)-Date.parse(a.acquiredAt));
}
export function recentDates(now=new Date()) {const end=new Date(now),start=new Date(end);start.setUTCDate(start.getUTCDate()-30);return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};}
export function newMissionIds() {const key=crypto.randomUUID().replaceAll('-','');return {area:'AREA_'+key,incident:'INC_'+key,observation:'OBS_'+key,survey:'SUR_'+key};}

// Uses the existing records and catalogue APIs. Retries retain IDs, so a
// partially saved request can resume without duplicating its incident.
export class QuickMission {
  constructor(api){this.api=api;this.busy=false;this.point=null;this.scene=null;this.imageReady=false;this.saved=null;}
  selectArea(geometry){
    if(this.busy)throw new Error('Wait for the current request to finish.');
    const metrics=validateSelection(geometry),selected=structuredClone(geometry);
    Object.assign(this,{...metrics,geometry:selected,halfWidth:null,ids:newMissionIds(),area:null,scene:null,imageReady:false,saved:null,preparationStarted:false});
    return this.geometry;
  }
  mark(point,halfWidth=500){
    if(this.busy)throw new Error('Wait for the current request to finish.');
    const geometry=inspectionZone(point,halfWidth),metrics=selectionMetrics(geometry);
    Object.assign(this,{...metrics,point:[...point],halfWidth,geometry,ids:newMissionIds(),area:null,scene:null,imageReady:false,saved:null,preparationStarted:false});
  }
  restore(incidentId,state,surveyId=null){
    if(this.busy)throw new Error('Wait for the current request to finish.');
    const incident=state.records.find(r=>r.kind==='incident'&&r.id===incidentId);
    const expected=surveyId||'SUR_'+incidentId.replace(/^INC_/,'');
    const request=state.records.find(r=>r.kind==='survey'&&r.incidentId===incidentId&&r.id===expected);
    const feature=request?.boundarySnapshot?.features?.find(f=>f.properties?.observation_id==='OBS_'+incidentId.replace(/^INC_/,''));
    const scene=state.scenes.find(s=>s.id===feature?.properties?.scene_id);
    if(!incident||!request||!feature||!scene)throw new Error('This saved inspection snapshot could not be restored. Open Advanced workspace to review its records.');
    const metrics=selectionMetrics(feature.geometry),geometry=structuredClone(feature.geometry);
    const halfWidth=Math.round((metrics.bbox[3]-metrics.bbox[1])*111320/2);
    Object.assign(this,{...metrics,halfWidth,geometry,area:null,scene:structuredClone(scene),imageReady:false,preparationStarted:true,
      ids:{area:incident.areaId,incident:incidentId,observation:feature.properties.observation_id,survey:request.id},
      saved:{incidentId,surveyId:request.id}});
    // An edited observation is a new revision. Reopen the frozen survey image
    // and boundary, which are also used by planner, reports and export.
    if(feature.properties.display_asset_kind==='cog')this.scene.localPreview=null;
    return this.saved;
  }
  async survey({archivedScene=null,now=new Date()}={}) {
    if(this.busy||!this.geometry)throw new Error('Select an inspection area first.');
    if(this.saved)throw new Error('This inspection is saved. Reload its original image or start a new inspection.');
    if(this.preparationStarted)throw new Error('Resume saving this request, or change the area to start a new inspection.');
    this.busy=true;this.imageReady=false;this.scene=null;
    try {
      const area=await this.api('records',{method:'POST',body:JSON.stringify({id:this.ids.area,kind:'area',name:'Quick inspection '+this.point.map(n=>n.toFixed(4)).join(', '),geometry:this.geometry})});
      this.area=area;
      let scenes;
      if(archivedScene)scenes=coveringScenes([archivedScene],this.geometry);
      else {const response=await this.api('scenes?'+new URLSearchParams({area:area.id,provider:'earth',...recentDates(now)}));scenes=coveringScenes(response.scenes,this.geometry);}
      if(!scenes.length)throw new Error(archivedScene?'The archived image does not cover this inspection area.':'No usable Sentinel-2 image covers the whole inspection area in the last 30 days. Select a smaller or nearby area, or open Advanced workspace.');
      this.scene=scenes[0];return this.scene;
    } finally {this.busy=false;}
  }
  async prepare(owner='Workspace operator') {
    if(this.busy||!this.scene||!this.imageReady)throw new Error('Wait until the satellite image is ready for review.');
    if(this.saved)return this.saved;
    this.preparationStarted=true;
    this.busy=true;
    try {
      const position=this.point.map(n=>n.toFixed(5)).join(', '),note='User-selected inspection area from Quick mission. Not a detected or confirmed oil boundary. Satellite image acquired '+this.scene.acquiredAt+'.';
      const save=body=>this.api('records',{method:'POST',body:JSON.stringify(body)});
      await save({id:this.ids.incident,kind:'incident',title:'Inspection at '+position,areaId:this.ids.area,reason:note,owner:String(owner).slice(0,100)});
      await save({id:this.ids.observation,kind:'observation',incidentId:this.ids.incident,sceneId:this.scene.id,geometry:this.geometry,assetKind:this.scene.localPreview?'cached_preview':'cog',note,reviewer:'Quick mission operator'});
      const survey=await save({id:this.ids.survey,kind:'survey',incidentId:this.ids.incident,title:'Drone inspection at '+position,note:'Prepared inspection request. Flight and microcapsule release have not been commanded.'});
      this.saved={incidentId:this.ids.incident,surveyId:survey.id};return this.saved;
    } finally {this.busy=false;}
  }
}
