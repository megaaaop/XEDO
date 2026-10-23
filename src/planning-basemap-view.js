const R=6378137,HALF_WORLD=Math.PI*R,MAX_SPAN=90000,DAY=86400000;
const fail=()=>{throw Error('The Earth Engine background map response is invalid. Retry the map.');};
const validBbox=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[0]<b[2]&&b[1]<b[3];
const validPadding=value=>Number.isFinite(value)&&value>=1&&value<=1.5;

/** Keep the complete padded viewport inside the server's bounded imagery area. */
export function basemapMinZoom(size,{padding=1.2}={}){
  if(!Array.isArray(size)||size.length!==2||!size.every(v=>Number.isFinite(v)&&v>0)||!validPadding(padding))throw Error('The satellite map viewport is invalid.');
  return Math.max(0,Math.log2(Math.max(...size)*(2*HALF_WORLD/256)*padding/MAX_SPAN));
}

/** A display rectangle is separate from the inspection polygon and never changes it. */
export function basemapViewport(extent,{padding=1.2}={}){
  if(!validBbox(extent)||!validPadding(padding))throw Error('The satellite map viewport is invalid.');
  const cx=(extent[0]+extent[2])/2,cy=(extent[1]+extent[3])/2,dx=(extent[2]-extent[0])*padding/2,dy=(extent[3]-extent[1])*padding/2;
  if(Math.max(dx,dy)*2>MAX_SPAN+1)throw Error('Zoom in to load the Earth Engine background map.');
  const lon=x=>x/R*180/Math.PI,lat=y=>(2*Math.atan(Math.exp(y/R))-Math.PI/2)*180/Math.PI;
  const bbox=[lon(cx-dx),lat(cy-dy),lon(cx+dx),lat(cy+dy)];
  if(bbox[0]<-180||bbox[2]>180||bbox[1]<-80||bbox[3]>80)throw Error('The satellite map covers longitudes within ±180° and latitudes within ±80°.');
  const [w,s,e,n]=bbox;
  return {bbox,geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}};
}

export function basemapContains(outer,inner){
  return validBbox(outer)&&validBbox(inner)&&outer[0]<=inner[0]&&outer[1]<=inner[1]&&outer[2]>=inner[2]&&outer[3]>=inner[3];
}

/** Only a same-origin, server-issued composite belongs in the background layer. */
export function bindGEEBasemap(manifest,geometry,{now=Date.now()}={}){
  if(!manifest||manifest.kind!=='gee_basemap'||manifest.provider!=='gee'||manifest.collection!=='COPERNICUS/S2_SR_HARMONIZED'||manifest.renderMode!=='pixels'||JSON.stringify(manifest.geometry)!==JSON.stringify(geometry))fail();
  const token=manifest.sessionId,expires=Date.parse(manifest.expiresAt),from=Date.parse(manifest.acquiredFrom),to=Date.parse(manifest.acquiredTo);
  if(typeof token!=='string'||!/^[A-Za-z0-9_-]{16,4096}$/.test(token)||manifest.tileUrl!=='/api/v1/gee/imagery/tiles/'+token+'/{z}/{x}/{y}'||!Number.isFinite(expires)||expires<=now||expires>now+31*60*1000)fail();
  if(!Number.isInteger(manifest.imageCount)||manifest.imageCount<1||manifest.imageCount>31||!Number.isFinite(from)||!Number.isFinite(to)||from>to)fail();
  const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
  if(!date(manifest.start)||!date(manifest.end)||manifest.start>manifest.end||Date.parse(manifest.end)-Date.parse(manifest.start)>=31*DAY||from<Date.parse(manifest.start)||to>=Date.parse(manifest.end)+DAY)fail();
  return structuredClone(manifest);
}
