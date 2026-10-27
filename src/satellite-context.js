import {validateGeometry} from './domain.js';

export const SATELLITE_CONTEXT_BUFFER_M=1000;
const EARTH_RADIUS_M=6371008.8;
const DEGREES_PER_RADIAN=180/Math.PI;

/** A bounded rectangular display context, separate from the inspection polygon.
 * Padding uses a mean-earth-radius angular distance and the highest latitude
 * in the padded box, so east/west padding is at least approximately 1 km.
 * This is a display extent, not a surveyed or model-derived oil boundary.
 */
export function satelliteDisplayContext(geometry){
  validateGeometry(geometry);
  const ring=geometry.coordinates[0],xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
  const west=Math.min(...xs),south=Math.min(...ys),east=Math.max(...xs),north=Math.max(...ys);
  if(east-west>180||south< -80||north>80)throw new Error('Satellite context needs an area between 80° south and north without crossing the date line.');
  const latitudePadding=SATELLITE_CONTEXT_BUFFER_M/EARTH_RADIUS_M*DEGREES_PER_RADIAN;
  const paddedSouth=Math.max(-80,south-latitudePadding),paddedNorth=Math.min(80,north+latitudePadding);
  const latitude=Math.max(Math.abs(paddedSouth),Math.abs(paddedNorth));
  const longitudePadding=latitudePadding/Math.cos(latitude/DEGREES_PER_RADIAN);
  const paddedWest=Math.max(-180,west-longitudePadding),paddedEast=Math.min(180,east+longitudePadding);
  return {type:'Polygon',coordinates:[[[paddedWest,paddedSouth],[paddedEast,paddedSouth],[paddedEast,paddedNorth],[paddedWest,paddedNorth],[paddedWest,paddedSouth]]]};
}
