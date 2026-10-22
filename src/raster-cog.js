import WebGLTile from 'ol/layer/WebGLTile.js';
import GeoTIFF from 'ol/source/GeoTIFF.js';

// Keep TIFF decoders and their worker out of the archived-preview startup path.
export function createCogRaster(url) {
  const source = new GeoTIFF({sources:[{url}],convertToRGB:true});
  // GeoTIFF metadata failures change the source state, rather than emitting a
  // tileloaderror. Forward them to the error handlers used by both workspaces.
  let readError=false;
  source.on('change',()=>{
    if(source.getState()==='error'&&!readError){readError=true;source.dispatchEvent('error');}
  });
  return {source,layer:new WebGLTile({source})};
}
