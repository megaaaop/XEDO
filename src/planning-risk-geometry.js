import {validateGeometry} from './domain.js';

// Display/editor validation only. The authenticated server independently checks
// the immutable catalog, ownership, target and revision before confirmation.
const EPS=1e-12;
const clone=value=>structuredClone(value);

export function validateRiskTarget(geometry){
  if(geometry?.type!=='Polygon'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length!==1)
    throw Error('Choose one inspection Polygon with no holes.');
  if(!Array.isArray(geometry.coordinates[0])||geometry.coordinates[0].length>121)
    throw Error('Use at most 120 boundary points. Draw an inspection boundary for this detailed AI area.');
  return validateGeometry(geometry);
}

function canonicalRing(ring){
  if(!Array.isArray(ring))return ring;
  const points=clone(ring);
  if(points.length>1&&JSON.stringify(points[0])===JSON.stringify(points.at(-1)))points.pop();
  if(!points.length)return [];
  const rotations=orientation=>{
    let best=0;for(let i=1;i<orientation.length;i++)if(orientation[i][0]<orientation[best][0]||(orientation[i][0]===orientation[best][0]&&orientation[i][1]<orientation[best][1]))best=i;
    return orientation.slice(best).concat(orientation.slice(0,best));
  };
  const forward=rotations(points),reverse=rotations([...points].reverse());
  return JSON.stringify(forward)<JSON.stringify(reverse)?forward:reverse;
}
/** A deterministic coordinate identity; this is not a cryptographic hash. */
export function geometryKey(geometry){
  if(!geometry)return 'null';
  if(geometry.type==='Polygon')return JSON.stringify({type:'Polygon',coordinates:geometry.coordinates.map(canonicalRing)});
  if(geometry.type==='MultiPolygon')return JSON.stringify({type:'MultiPolygon',coordinates:geometry.coordinates.map(p=>p.map(canonicalRing)).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))});
  return JSON.stringify(geometry);
}
export const geometryEquals=(a,b)=>geometryKey(a)===geometryKey(b);

function polygons(value,{validOnly=false}={}){
  if(!value)return [];
  if(value.type==='FeatureCollection'){
    const hasRoles=value.features.some(f=>f?.properties?.role==='valid_data');
    return value.features.filter(f=>!validOnly||!hasRoles||f?.properties?.role==='valid_data').flatMap(f=>polygons(f));
  }
  if(value.type==='Feature')return polygons(value.geometry);
  if(value.type==='Polygon')return [value.coordinates];
  if(value.type==='MultiPolygon')return value.coordinates;
  throw Error('Coverage must be a Polygon or MultiPolygon.');
}
function edgesFor(poly){
  return poly.flatMap(ring=>ring.slice(0,-1).map((a,i)=>({a,b:ring[i+1],xmin:Math.min(a[0],ring[i+1][0]),xmax:Math.max(a[0],ring[i+1][0]),ymin:Math.min(a[1],ring[i+1][1]),ymax:Math.max(a[1],ring[i+1][1])})));
}
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
function crossingY(a,b){
  if(a.xmax<b.xmin-EPS||b.xmax<a.xmin-EPS||a.ymax<b.ymin-EPS||b.ymax<a.ymin-EPS)return null;
  const r=[a.b[0]-a.a[0],a.b[1]-a.a[1]],s=[b.b[0]-b.a[0],b.b[1]-b.a[1]],den=cross(r,s);
  if(Math.abs(den)<1e-24)return null; // Collinear changes occur at vertex ordinates.
  const q=[b.a[0]-a.a[0],b.a[1]-a.a[1]],t=cross(q,s)/den,u=cross(q,r)/den;
  if(t<0||t>1||u<0||u>1)return null;
  return a.a[1]+t*r[1];
}
function intervals(poly,y){
  const xs=[];
  for(const ring of poly)for(let i=0;i<ring.length-1;i++){
    const a=ring[i],b=ring[i+1];
    if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
  }
  xs.sort((a,b)=>a-b);
  const result=[];for(let i=0;i+1<xs.length;i+=2)if(xs[i+1]-xs[i]>EPS)result.push([xs[i],xs[i+1]]);
  return result;
}
function mergedIntervals(polys,y){
  const list=polys.flatMap(poly=>intervals(poly,y)).sort((a,b)=>a[0]-b[0]),out=[];
  for(const item of list){const last=out.at(-1);if(last&&item[0]<=last[1]+EPS)last[1]=Math.max(last[1],item[1]);else out.push([...item]);}
  return out;
}
function scanRelationship(target,containers){
  const targetPolys=polygons(target);
  const targetEdges=targetPolys.flatMap(edgesFor);
  if(!targetEdges.length)return {covered:false,overlap:false};
  const ymin=Math.min(...targetEdges.map(e=>e.ymin)),ymax=Math.max(...targetEdges.map(e=>e.ymax));
  if(ymax-ymin<=EPS)return {covered:false,overlap:false};
  const containerEdges=containers.flatMap(edgesFor).filter(e=>e.ymax>=ymin-EPS&&e.ymin<=ymax+EPS);
  const allEdges=[...targetEdges,...containerEdges],ys=[ymin,ymax];
  for(const edge of allEdges)for(const y of [edge.a[1],edge.b[1]])if(y>ymin&&y<ymax)ys.push(y);
  // Between vertex/intersection ordinates, all boundary x positions vary linearly
  // without changing order. One scan line per strip therefore tests the entire
  // polygon interior, including enclosed holes and concave edge excursions.
  for(let i=0;i<allEdges.length;i++)for(let j=i+1;j<allEdges.length;j++){
    const y=crossingY(allEdges[i],allEdges[j]);if(y!==null&&y>ymin&&y<ymax)ys.push(y);
  }
  ys.sort((a,b)=>a-b);const levels=[];for(const y of ys)if(!levels.length||y-levels.at(-1)>EPS)levels.push(y);
  let covered=true,overlap=false,hasInterior=false,targetArea=0,overlapArea=0;
  for(let i=0;i<levels.length-1;i++){
    if(levels[i+1]-levels[i]<=EPS)continue;
    const height=levels[i+1]-levels[i],y=(levels[i]+levels[i+1])/2,ts=mergedIntervals(targetPolys,y),cs=mergedIntervals(containers,y);
    for(const [left,right]of ts){
      hasInterior=true;let cursor=left;targetArea+=(right-left)*height;
      for(const [a,b]of cs)overlapArea+=Math.max(0,Math.min(right,b)-Math.max(left,a))*height;
      for(const [a,b]of cs){
        if(Math.min(right,b)-Math.max(left,a)>EPS)overlap=true;
        if(b<cursor-EPS)continue;if(a>cursor+EPS)break;cursor=Math.max(cursor,b);if(cursor>=right-EPS)break;
      }
      if(cursor<right-EPS)covered=false;
    }
  }
  return {covered:hasInterior&&covered,overlap,targetArea,overlapArea};
}

/** Boundary-inclusive cover for valid closed polygons; no bbox shortcut. */
export function coversGeometry(container,target){return scanRelationship(target,polygons(container)).covered;}

/** Classifies positive-area overlap with valid SAR coverage. NoData is excluded. */
export function classifyCoverage(target,coverageFeatureCollection){
  const relationship=scanRelationship(target,polygons(coverageFeatureCollection,{validOnly:true}));
  return relationship.covered?'covered':relationship.overlap?'partial':'none';
}

export function coverageDiagnostics(target,coverage){return scanRelationship(target,polygons(coverage,{validOnly:true}));}

export function validateRiskCoverage(geometry,{searchGeometry,imageGeometry}={}){
  validateRiskTarget(geometry);
  if(searchGeometry&&!coversGeometry(searchGeometry,geometry))throw Error('The inspection boundary leaves the current search area. Review the new area before using it.');
  if(imageGeometry&&!coversGeometry(imageGeometry,geometry))throw Error('The inspection boundary leaves the reviewed satellite image. Load and review an image covering the new area.');
  return true;
}
