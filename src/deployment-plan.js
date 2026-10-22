import proj4 from 'proj4';
import {validateGeometry} from './domain.js';

const MAX_TRACKS=200,MAX_WAYPOINTS=500,MAX_VERTICES=120,EPS=1e-6;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const subtract=(a,b)=>[a[0]-b[0],a[1]-b[1]];
function parameter(value,name,min,max){if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${name} must be a finite number between ${min} and ${max}.`);return value;}

function contains(point,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[j],b=ring[i],edge=subtract(b,a),offset=subtract(point,a);
    if(Math.abs(cross(edge,offset))<=EPS*Math.max(1,distance(a,b))&&point[0]>=Math.min(a[0],b[0])-EPS&&point[0]<=Math.max(a[0],b[0])+EPS&&point[1]>=Math.min(a[1],b[1])-EPS&&point[1]<=Math.max(a[1],b[1])+EPS)return true;
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}

// Intersections split a connector into intervals. Checking every interval also
// rejects connectors that cross a narrow concave notch between inside endpoints.
function segmentInside(a,b,ring){
  if(!contains(a,ring)||!contains(b,ring))return false;
  const direction=subtract(b,a),length2=direction[0]**2+direction[1]**2;
  if(length2<=EPS**2)return true;
  const cuts=[0,1];
  for(let i=0;i<ring.length-1;i++){
    const c=ring[i],edge=subtract(ring[i+1],c),offset=subtract(c,a),denominator=cross(direction,edge);
    if(Math.abs(denominator)>EPS){
      const t=cross(offset,edge)/denominator,u=cross(offset,direction)/denominator;
      if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
    }else if(Math.abs(cross(offset,direction))<=EPS*Math.sqrt(length2)){
      for(const p of [c,ring[i+1]]){const delta=subtract(p,a),t=(delta[0]*direction[0]+delta[1]*direction[1])/length2;if(t>0&&t<1)cuts.push(t);}
    }
  }
  cuts.sort((x,y)=>x-y);
  for(let i=1;i<cuts.length;i++)if(cuts[i]-cuts[i-1]>1e-12){const t=(cuts[i]+cuts[i-1])/2;if(!contains([a[0]+direction[0]*t,a[1]+direction[1]*t],ring))return false;}
  return true;
}

function connectorFinder(ring){
  const vertices=ring.slice(0,-1);let graph=null;
  return (start,end)=>{
    if(segmentInside(start,end,ring))return [end];
    if(!graph){
      graph=vertices.map(()=>[]);
      for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++)if(segmentInside(vertices[i],vertices[j],ring)){
        const length=distance(vertices[i],vertices[j]);graph[i].push([j,length]);graph[j].push([i,length]);
      }
    }
    const count=vertices.length,cost=Array(count).fill(Infinity),previous=Array(count).fill(-1),visited=Array(count).fill(false);
    const endVisible=vertices.map(v=>segmentInside(v,end,ring));
    for(let i=0;i<count;i++)if(segmentInside(start,vertices[i],ring))cost[i]=distance(start,vertices[i]);
    let best=Infinity,last=-1;
    for(let step=0;step<count;step++){
      let current=-1;
      for(let i=0;i<count;i++)if(!visited[i]&&(current<0||cost[i]<cost[current]))current=i;
      if(current<0||!Number.isFinite(cost[current])||cost[current]>best)break;
      visited[current]=true;
      if(endVisible[current]){const total=cost[current]+distance(vertices[current],end);if(total<best){best=total;last=current;}}
      for(const [next,length] of graph[current])if(!visited[next]&&cost[current]+length<cost[next]){cost[next]=cost[current]+length;previous[next]=current;}
    }
    if(last<0)return null;
    const path=[];for(let index=last;index>=0;index=previous[index])path.push(vertices[index]);
    return [...path.reverse(),end];
  };
}

function terrainSamples(context,project){
  if(context?.state!=='connected'||!Array.isArray(context.samples))return [];
  return context.samples.filter(sample=>Number.isFinite(sample.longitude)&&Number.isFinite(sample.latitude)&&Math.abs(sample.longitude)<=180&&Math.abs(sample.latitude)<=85&&Number.isFinite(sample.elevationM)&&sample.elevationM>=-12000&&sample.elevationM<=10000).map(sample=>({point:project([sample.longitude,sample.latitude]),elevationM:sample.elevationM}));
}
function terrainFor(point,samples){
  let nearest=1,ground=null;
  for(const sample of samples){
    const separation=distance(point,sample.point);
    if(separation<=nearest){nearest=separation;ground=sample.elevationM;}
  }
  return ground;
}

/** Deterministic diagram and route estimate only. Never emits flight commands. */
export function buildDeploymentPreview({geometry,altitudeM=50,spacingM=100,speedMps=5,context=null}={}){
  parameter(altitudeM,'Preview altitude (m AGL)',5,500);parameter(spacingM,'Track spacing (m)',5,1000);parameter(speedMps,'Preview speed (m/s)',0.1,30);
  const areaM2=validateGeometry(geometry),target=structuredClone(geometry),coordinates=target.coordinates[0];
  const longitudes=coordinates.map(p=>p[0]),latitudes=coordinates.map(p=>p[1]);
  const west=Math.min(...longitudes),east=Math.max(...longitudes),south=Math.min(...latitudes),north=Math.max(...latitudes);
  if(south < -80||north > 80||east-west>180)throw new Error('Preview requires an area between 80° south and 80° north without a date-line crossing.');
  const centre=[(west+east)/2,(south+north)/2],zone=Math.max(1,Math.min(60,Math.floor((centre[0]+180)/6)+1));
  const definition=`+proj=utm +zone=${zone} ${centre[1]<0?'+south ':''}+datum=WGS84 +units=m +no_defs`;
  const converter=proj4('EPSG:4326',definition),origin=converter.forward(coordinates[0]),project=p=>subtract(converter.forward(p),origin);
  const ring=coordinates.map(project),projection={calculationCrs:'EPSG:'+((centre[1]<0?32700:32600)+zone),definition,origin,originPosition:[...coordinates[0]],units:'metres'};
  const warnings=['Preview only. No flight or material-release command is sent.','Home is assumed at the first boundary vertex for this diagram. It is not a verified launch or landing site.','Two-dimensional survey estimate. Wind, obstacles, turns, battery limits and flight clearance have not been assessed.','Transit connectors may follow the selected boundary. Review the route and site conditions before operational planning.'];
  const base={schema:'xedo-deployment-preview/1',schema_version:'1.0',status:'blocked',target,home:{position:[...coordinates[0]],assumption:'First boundary vertex; preview only'},parameters:{altitudeM,spacingM,speedMps},projection,localTarget:{type:'Polygon',coordinates:[ring.map(p=>[...p])]},localWaypoints:[],waypoints:[],segments:[],estimates:{distanceM:null,durationS:null,areaM2},warnings,hardwareControl:false,releaseControl:false,sourceMode:'preview',valueKind:'estimated',limits:{maxTracks:MAX_TRACKS,maxWaypoints:MAX_WAYPOINTS,maxVertices:MAX_VERTICES}};
  const blocked=(code,message)=>({...base,code,message,reason:message});
  if(coordinates.length-1>MAX_VERTICES)return blocked('AREA_TOO_COMPLEX','This boundary has too many vertices for the preview. Simplify or split the area.');
  if(Math.max(...ring.map(p=>p[0]))-Math.min(...ring.map(p=>p[0]))>100000||Math.max(...ring.map(p=>p[1]))-Math.min(...ring.map(p=>p[1]))>100000)return blocked('AREA_TOO_LARGE','The preview is limited to a 100 km extent. Split the area.');
  // Choose an edge direction with the smallest perpendicular extent. Stable
  // input order breaks ties, making the same selection produce the same route.
  let angle=0,smallestWidth=Infinity;
  for(let i=0;i<ring.length-1;i++){
    const candidate=Math.atan2(ring[i+1][1]-ring[i][1],ring[i+1][0]-ring[i][0]),ys=ring.map(p=>-Math.sin(candidate)*p[0]+Math.cos(candidate)*p[1]),width=Math.max(...ys)-Math.min(...ys);
    if(width<smallestWidth-1e-6){smallestWidth=width;angle=candidate;}
  }
  const cosine=Math.cos(angle),sine=Math.sin(angle),rotate=p=>[cosine*p[0]+sine*p[1],-sine*p[0]+cosine*p[1]],unrotate=p=>[cosine*p[0]-sine*p[1],sine*p[0]+cosine*p[1]],rotated=ring.map(rotate);
  const low=Math.min(...rotated.map(p=>p[1])),high=Math.max(...rotated.map(p=>p[1])),trackCount=Math.ceil((high-low)/spacingM);
  if(trackCount>MAX_TRACKS)return blocked('TOO_MANY_TRACKS','The preview exceeds 200 survey tracks. Increase spacing or split the area.');
  const work=[];
  for(let row=0;row<trackCount;row++){
    const y=low+(row+0.5)*(high-low)/trackCount,xs=[];
    for(let i=0;i<rotated.length-1;i++){const a=rotated[i],b=rotated[i+1];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
    xs.sort((a,b)=>a-b);if(xs.length%2)return blocked('UNRESOLVED_GEOMETRY','The scanline intersections could not be resolved. Adjust or split the area.');
    const pairs=[];for(let i=0;i<xs.length;i+=2)if(xs[i+1]-xs[i]>EPS)pairs.push([unrotate([xs[i],y]),unrotate([xs[i+1],y])]);
    if(row%2)pairs.reverse().forEach(pair=>pair.reverse());work.push(...pairs);
    if(work.length*2+1>MAX_WAYPOINTS)return blocked('TOO_MANY_WAYPOINTS','The preview exceeds 500 waypoints. Increase spacing or split the area.');
  }
  if(!work.length)return blocked('NO_SURVEY_SEGMENTS','No survey segments could be generated. Adjust the area or spacing.');
  const findConnector=connectorFinder(ring),points=[{point:ring[0],purpose:'transit'}];
  const append=(point,purpose)=>{if(distance(points.at(-1).point,point)>EPS)points.push({point,purpose});};
  for(const [start,end] of work){
    const connector=findConnector(points.at(-1).point,start);if(!connector)return blocked('NO_INTERIOR_CONNECTOR','An interior route could not be found. Split the area.');
    connector.forEach(p=>append(p,'transit'));append(end,'survey');
    if(points.length>MAX_WAYPOINTS)return blocked('TOO_MANY_WAYPOINTS','Interior connectors exceed 500 waypoints. Increase spacing or split the area.');
  }
  const homeConnector=findConnector(points.at(-1).point,ring[0]);if(!homeConnector)return blocked('NO_INTERIOR_CONNECTOR','An interior return route could not be found. Split the area.');
  homeConnector.forEach(p=>append(p,'return'));
  if(points.length>MAX_WAYPOINTS)return blocked('TOO_MANY_WAYPOINTS','The return route exceeds 500 waypoints. Increase spacing or split the area.');
  const toPosition=point=>{const vertex=ring.findIndex(p=>distance(p,point)<EPS);return vertex>=0?[...coordinates[vertex]]:converter.inverse([point[0]+origin[0],point[1]+origin[1]]);};
  const samples=terrainSamples(context,project);
  const waypoints=points.map(({point,purpose},sequence)=>{const groundElevationM=terrainFor(point,samples);return {sequence,position:toPosition(point),altitudeM,altitudeReference:'AGL',groundElevationM,estimatedAltitudeMSLM:groundElevationM==null?null:groundElevationM+altitudeM,purpose,dispenser:'off'};});
  const segments=points.slice(1).map((entry,index)=>({from:index,to:index+1,purpose:entry.purpose,distanceM:distance(points[index].point,entry.point)}));
  if(segments.some(segment=>!segmentInside(points[segment.from].point,points[segment.to].point,ring)))return blocked('NO_INTERIOR_CONNECTOR','A route segment leaves the selected area. Adjust or split the area.');
  const distanceM=segments.reduce((sum,segment)=>sum+segment.distanceM,0),sampledWaypointCount=waypoints.filter(p=>p.groundElevationM!=null).length;
  warnings.push(sampledWaypointCount?'Dataset elevations are sampled estimates. MSL estimates add the preview AGL altitude to matching samples; missing terrain remains unknown.':'Terrain data is unavailable at the route points. The 3D diagram uses relative height above a local reference; MSL altitude is unknown.');
  return {...base,status:'generated',code:'PREVIEW_GENERATED',message:'Survey preview generated within the exact selected polygon.',reason:'Survey preview generated within the exact selected polygon.',waypoints,segments,localWaypoints:points.map(({point})=>[...point]),estimates:{distanceM,durationS:distanceM/speedMps,areaM2},trackCount,terrain:{mode:sampledWaypointCount?'gee_sampled':'relative',sampledWaypointCount,totalWaypointCount:waypoints.length}};
}
