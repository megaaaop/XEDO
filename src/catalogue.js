export const providers = {
  earth:{label:'Earth Search · Copernicus Sentinel-2',endpoint:'https://earth-search.aws.element84.com/v1',collection:'sentinel-2-l2a'},
  cdse:{label:'Copernicus Data Space',endpoint:'https://stac.dataspace.copernicus.eu/v1',collection:'sentinel-2-l2a'}
};
export function assetAllowed(url) { try { const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='sentinel-cogs.s3.us-west-2.amazonaws.com'||u.hostname==='e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com'); } catch {return false;} }
export async function remoteFetch(url,options={}) {
  let last;
  for(let n=0;n<3;n++) {
    try { const r=await fetch(url,{...options,signal:AbortSignal.timeout(18000)});if(r.ok)return r;last=new Error(`Imagery service returned HTTP ${r.status}`);if(![429,500,502,503,504].includes(r.status)) throw Object.assign(last,{permanent:true}); }
    catch(e){last=e;if(e.permanent)throw e;}
    if(n<2)await new Promise(r=>setTimeout(r,400*(n+1)));
  }
  throw last;
}
export function normalize(item,provider) {
  const p=item.properties,a=item.assets||{};
  return {id:`${provider}:${item.id}`,catalogueId:item.id,provider,providerLabel:providers[provider].label,collection:item.collection,productId:p['s2:product_uri']||p.productIdentifier||item.id,acquiredAt:p.datetime||p.start_datetime,footprint:item.geometry,bbox:item.bbox,cloudCover:p['eo:cloud_cover']??null,platform:p.platform||'Sentinel-2',epsg:p['proj:epsg']||a.visual?.['proj:epsg']||null,transform:a.visual?.['proj:transform']||p['proj:transform']||null,shape:a.visual?.['proj:shape']||p['proj:shape']||null,resolution:a.visual?.gsd||p.gsd||10,visual:assetAllowed(a.visual?.href)?a.visual.href:null,thumbnail:assetAllowed(a.thumbnail?.href)?a.thumbnail.href:null,scl:assetAllowed(a.scl?.href)?a.scl.href:null,sourceUrl:`${providers[provider].endpoint}/collections/${item.collection}/items/${encodeURIComponent(item.id)}`,dataType:'actual',aoiQuality:'unknown',raw:item};
}
export async function searchCatalogue({provider,bbox,start,end,cursor}) {
  const p=providers[provider];if(!p)throw new Error('Invalid data source');
  const url=new URL(p.endpoint+'/search');url.searchParams.set('collections',p.collection);url.searchParams.set('bbox',bbox.join(','));url.searchParams.set('datetime',`${start}T00:00:00Z/${end}T23:59:59Z`);url.searchParams.set('limit','30');
  url.searchParams.set('sortby',provider==='earth'?'-properties.datetime':'-datetime');
  if(cursor){if(cursor.length>4000)throw new Error('Pagination token invalid');const page=JSON.parse(cursor);if(!['token','next'].includes(page.parameter)||typeof page.value!=='string')throw new Error('Pagination token invalid');url.searchParams.set(page.parameter,page.value);}
  const data=await(await remoteFetch(url)).json();
  const next=data.links?.find(l=>l.rel==='next');let token=null;
  if(next?.href){const n=new URL(next.href);if(n.origin!==url.origin||n.pathname!==url.pathname)throw new Error('Catalogue pagination URL must belong to the original provider');for(const parameter of ['token','next'])if(n.searchParams.has(parameter)){token=JSON.stringify({parameter,value:n.searchParams.get(parameter)});break;}}
  if(!token&&next?.body?.token)token=JSON.stringify({parameter:'token',value:next.body.token});
  return {scenes:data.features.map(f=>normalize(f,provider)),next:token,partial:!!token,hasUnusableAssets:data.features.some(f=>!assetAllowed(f.assets?.visual?.href)),fetchedAt:new Date().toISOString()};
}
