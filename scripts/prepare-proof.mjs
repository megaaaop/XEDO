// Reproducible real-image access proof. Run deliberately; never synthesizes scenes.
import {fromUrl} from 'geotiff';import proj4 from 'proj4';import {deflateSync} from 'node:zlib';import {writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {normalize} from '../src/catalogue.js';
const bbox=[101.05,12.49,101.4,12.72];
const url=new URL('https://earth-search.aws.element84.com/v1/search');
Object.entries({collections:'sentinel-2-l2a',bbox:bbox.join(','),datetime:'2026-09-04T00:00:00Z/2026-10-04T23:59:59Z',limit:'100',sortby:'properties.eo:cloud_cover'}).forEach(([k,v])=>url.searchParams.set(k,v));
const result=await(await fetch(url)).json();if(!result.features)throw new Error(JSON.stringify(result));
const raw=result.features.filter(s=>s.id.includes('47PQP')&&s.assets.visual?.href.startsWith('https://')).sort((a,b)=>a.properties['eo:cloud_cover']-b.properties['eo:cloud_cover'])[0];if(!raw)throw new Error('No public scene available');
const s=normalize(raw,'earth');proj4.defs('EPSG:32647','+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs');
const tiff=await fromUrl(s.visual),image=await tiff.getImage(),extent=image.getBoundingBox(),res=image.getResolution();
const corners=[[bbox[0],bbox[1]],[bbox[2],bbox[1]],[bbox[2],bbox[3]],[bbox[0],bbox[3]]].map(p=>proj4('EPSG:4326','EPSG:32647',p));
const minx=Math.max(extent[0],Math.min(...corners.map(p=>p[0]))),maxx=Math.min(extent[2],Math.max(...corners.map(p=>p[0]))),miny=Math.max(extent[1],Math.min(...corners.map(p=>p[1]))),maxy=Math.min(extent[3],Math.max(...corners.map(p=>p[1])));
const window=[Math.max(0,Math.floor((minx-extent[0])/res[0])),Math.max(0,Math.floor((extent[3]-maxy)/Math.abs(res[1]))),Math.min(image.getWidth(),Math.ceil((maxx-extent[0])/res[0])),Math.min(image.getHeight(),Math.ceil((extent[3]-miny)/Math.abs(res[1])))];
const cropExtent=[extent[0]+window[0]*res[0],extent[3]-window[3]*Math.abs(res[1]),extent[0]+window[2]*res[0],extent[3]-window[1]*Math.abs(res[1])];
const width=768,height=Math.round(width*(cropExtent[3]-cropExtent[1])/(cropExtent[2]-cropExtent[0]));
const rasters=await image.readRasters({window,width,height,interleave:true,samples:[0,1,2],resampleMethod:'bilinear'});
const scan=Buffer.alloc((width*3+1)*height);for(let y=0;y<height;y++){scan[y*(width*3+1)]=0;for(let x=0;x<width*3;x++)scan[y*(width*3+1)+1+x]=rasters[y*width*3+x];}
function crc(b){let c=0xffffffff;for(const x of b){c^=x;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,b){const head=Buffer.from(type),len=Buffer.alloc(4),end=Buffer.alloc(4);len.writeUInt32BE(b.length);end.writeUInt32BE(crc(Buffer.concat([head,b])));return Buffer.concat([len,head,b,end]);}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);
s.localPreview='/assets/sentinel-proof.png';s.previewExtent=cropExtent;s.previewResolution=Math.round((cropExtent[2]-cropExtent[0])/width*100)/100;s.accessProof={preparedAt:new Date().toISOString(),originalAsset:s.visual,window,originalGrid:{epsg:32647,extent,resolution:res,width:image.getWidth(),height:image.getHeight()},output:{epsg:32647,extent:cropExtent,width,height,resampling:'bilinear',sha256:createHash('sha256').update(png).digest('hex')},quality:'AOI cloud/nodata not computed'};
s.previewFootprint={type:'Polygon',coordinates:[[[cropExtent[0],cropExtent[1]],[cropExtent[2],cropExtent[1]],[cropExtent[2],cropExtent[3]],[cropExtent[0],cropExtent[3]],[cropExtent[0],cropExtent[1]]].map(p=>proj4('EPSG:32647','EPSG:4326',p))]};
await mkdir('public/assets',{recursive:true});await mkdir('src/fixtures',{recursive:true});await writeFile('public/assets/sentinel-proof.png',png);await writeFile('src/fixtures/proof-scene.json',JSON.stringify(s,null,2));await writeFile('public/assets/sentinel-proof.metadata.json',JSON.stringify(s,null,2));
console.log(JSON.stringify({id:s.id,acquiredAt:s.acquiredAt,cloud:s.cloudCover,extent:cropExtent,size:png.length,sha256:s.accessProof.output.sha256},null,2));
