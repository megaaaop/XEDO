export const statuses = {suspicious:'Area of interest',pending:'Pending review',confirmed:'Confirmed',not_confirmed:'Not confirmed',uncertain:'Uncertain',monitoring:'Follow-up required',closed:'Closed'};
export const observationStatuses = {draft:'Draft',proposed:'Proposed for review',reviewed:'Image reviewed',uncertain:'Unable to assess'};
export const surveyStatuses = {draft:'Draft',ready:'Ready for survey',in_progress:'Survey in progress',results:'Findings received',closed:'Request closed'};
export function pointWithin(point,geometry){const rings=geometry?.type==='MultiPolygon'?geometry.coordinates:geometry?.type==='Polygon'?[geometry.coordinates]:[];return rings.some(poly=>{const ring=poly[0];let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j],cross=(b[0]-a[0])*(point[1]-a[1])-(b[1]-a[1])*(point[0]-a[0]);if(Math.abs(cross)<1e-10&&point[0]>=Math.min(a[0],b[0])&&point[0]<=Math.max(a[0],b[0])&&point[1]>=Math.min(a[1],b[1])&&point[1]<=Math.max(a[1],b[1]))return true;if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;});}
export function polygonArea(geometry) {
  // Chamberlain–Duquette spherical area, WGS84 mean radius; m², not display pixels.
  const radius=6371008.8, rad=Math.PI/180;
  return Math.abs(geometry.coordinates.reduce((sum,ring,index)=>{
    let a=0; for(let i=0;i<ring.length-1;i++) a+=(ring[i+1][0]-ring[i][0])*rad*(2+Math.sin(ring[i][1]*rad)+Math.sin(ring[i+1][1]*rad));
    return sum+(index===0?1:-1)*Math.abs(a*radius*radius/2);
  },0));
}
export function validateGeometry(g) {
  if(g?.type!=='Polygon'||!Array.isArray(g.coordinates)||g.coordinates.length!==1) throw new Error('Use Polygon with one ring and no holes');
  const r=g.coordinates[0];
  if(r.length<4||r.length>501||r.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>85)) throw new Error('Invalid WGS84 coordinates');
  if(r[0][0]!==r.at(-1)[0]||r[0][1]!==r.at(-1)[1]) throw new Error('Polygon must be a closed ring');
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const overlap=(a,b,c,d)=>{
    const z=[cross(a,b,c),cross(a,b,d),cross(c,d,a),cross(c,d,b)];
    if(z[0]*z[1]<0&&z[2]*z[3]<0) return true;
    const on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-12&&p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0])&&p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1]);
    return on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
  };
  for(let i=0;i<r.length-1;i++) {
    if(r[i][0]===r[i+1][0]&&r[i][1]===r[i+1][1]) throw new Error('The boundary contains consecutive duplicate points.');
    for(let j=i+2;j<r.length-1;j++) if(!(i===0&&j===r.length-2)&&overlap(r[i],r[i+1],r[j],r[j+1])) throw new Error('The boundary intersects itself. Correct its geometry.');
  }
  // Translate before the shoelace sum to avoid cancellation at large longitude.
  // This tolerance is well below the existing minimum area of 1 m².
  let planarTwiceArea=0;const [originX,originY]=r[0];
  for(let i=1;i<r.length-1;i++)planarTwiceArea+=(r[i][0]-originX)*(r[i+1][1]-originY)-(r[i+1][0]-originX)*(r[i][1]-originY);
  if(Math.abs(planarTwiceArea)<=1e-12)throw new Error('The boundary has no area. Select at least three non-collinear points.');
  const area=polygonArea(g); if(area<1||area>1e10) throw new Error('Area must be between 1 m² and 10,000 km²');
  return area;
}
export function geojsonFor(incident,observations,scenes,reviews=[],evidence=[]) {
  return {type:'FeatureCollection',name:incident.title,metadata:{schema:'xedo-export/1',schema_version:'1.0',exported_at:new Date().toISOString(),crs:'EPSG:4326',incident, reviews,evidence},features:observations.map(o=>{
    const s=scenes.find(x=>x.id===o.sceneId);
    return {type:'Feature',id:o.id,geometry:o.geometry,properties:{incident_id:incident.id,incident_status:incident.status,observation_id:o.id,observation_status:o.status,data_type:o.dataType,source_kind:o.sourceKind,revision:o.revision,scene_id:o.sceneId,product_id:s?.productId,provider:s?.provider,collection:s?.collection,acquired_at:s?.acquiredAt,source_url:s?.sourceUrl,asset_url:s?.visual,display_asset_kind:o.assetKind,display_grid:o.displayGrid,area_m2:o.areaM2,area_method:'spherical-WGS84-mean-radius',created_at:o.createdAt,reviewed_at:reviews.at(-1)?.createdAt,note:o.note}};
  })};
}
export function csvFor(collection) {
  const keys=['incident_id','incident_status','observation_id','observation_status','data_type','source_kind','revision','scene_id','product_id','provider','collection','acquired_at','source_url','area_m2','area_method','created_at','reviewed_at','note'];
  const quote=x=>{let s=String(x??'');if(typeof x==='string'&&/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return '\uFEFF'+[keys.concat('geometry_geojson').map(quote).join(','),...collection.features.map(f=>keys.map(k=>quote(f.properties[k])).concat(quote(JSON.stringify(f.geometry))).join(','))].join('\r\n');
}
