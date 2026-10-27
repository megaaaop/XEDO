import {getIntersection, getRotatedViewport} from 'ol/extent.js';

// Determine the required AOI tiles independently of tileloadstart: OpenLayers
// can leave tiles in its queue before that event is fired. Public view/grid
// inputs are sufficient; no renderer or frame-state internals are inspected.
export function expectedInspectionTileKeys({tileGrid, inspectionExtent, viewExtent, resolution, rotation=0, center, size, maxTiles=512}) {
  if (!Number.isFinite(resolution) || resolution<=0) return [];
  const extent=getIntersection(inspectionExtent,viewExtent);
  if (!extent.every(Number.isFinite) || extent[0]>=extent[2] || extent[1]>=extent[3]) return [];
  const z=tileGrid.getZForResolution(resolution),range=tileGrid.getTileRangeForExtentAndZ(extent,z);
  if ((range.maxX-range.minX+1)*(range.maxY-range.minY+1)>maxTiles) throw Error('The image view contains too many tiles. Zoom out and reload the selected image.');
  const viewport=rotation?getRotatedViewport(center,resolution,rotation,size):null,keys=[];
  for(let x=range.minX;x<=range.maxX;x++)for(let y=range.minY;y<=range.maxY;y++){
    const coordinate=[z,x,y];
    if(!viewport||tileGrid.tileCoordIntersectsViewport(coordinate,viewport))keys.push(coordinate.join('/'));
  }
  return keys;
}

// Surrounding display imagery is not evidence for the inspection polygon.
// All expected inspection tiles must settle, including not-yet-started tiles.
export function createInspectionTileReadiness() {
  const loaded = new Map(), failures = new Set();
  let expected = null;
  return {
    expect(keys) { expected=new Set(keys); },
    start(tile, inspection) {
      if (!inspection) return;
      loaded.delete(tile);
      failures.delete(tile);
    },
    complete(tile, inspection, hasVisiblePixels) {
      if (!inspection) return;
      loaded.set(tile,Boolean(hasVisiblePixels));
    },
    fail(tile, inspection) {
      if (!inspection) return false;
      loaded.delete(tile);
      failures.add(tile);
      return true;
    },
    getState() {
      const keys=expected?[...expected]:[],complete=keys.filter(key=>loaded.has(key)).length,failed=keys.some(key=>failures.has(key)),hasVisiblePixels=keys.some(key=>loaded.get(key)===true);
      const pending=keys.length-complete;
      return {ready:keys.length>0&&!failed&&pending===0&&hasVisiblePixels,pending,loaded:complete,expected:keys.length,hasVisiblePixels,failed};
    },
  };
}
