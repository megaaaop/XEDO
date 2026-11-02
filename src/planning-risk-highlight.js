import {coversGeometry,validateRiskTarget} from './planning-risk-geometry.js';

/** Display feedback only. The existing pixel and server confirmation checks remain authoritative. */
export function riskImageCoverage(context,geometry){
  if(!geometry)return {state:'empty',error:false,message:'Choose an Inspector area to check its image coverage.'};
  try{validateRiskTarget(geometry);}catch{return {state:'invalid',error:true,message:'Finish a valid inspection boundary to check its image coverage.'};}
  if(!context.imageReady||!context.imageGeometry)return {state:'waiting',error:false,message:'Load and review a satellite image to check this boundary.'};
  const covered=coversGeometry(context.imageGeometry,geometry);
  return covered
    ? {state:'covered',error:false,message:'This boundary is inside the reviewed image. Review the area before confirming.'}
    : {state:'outside',error:true,message:'The red highlight is outside the reviewed image. Edit the boundary or review imagery covering the whole area.'};
}

/** Clip a display layer to the area outside a projected image polygon, including its holes.
 * Render-event pixel conversion keeps the mask aligned through pan, zoom, rotation and HiDPI.
 * This never clips or changes the saved inspection geometry.
 */
export function clipOutsideImage(context,rings,toPixel){
  const pixels=rings.map(ring=>ring.map(toPixel));
  if(!pixels.length||pixels.some(ring=>ring.length<4||ring.some(p=>!p||p.length!==2||!p.every(Number.isFinite))))return false;
  context.beginPath();context.rect(0,0,context.canvas.width,context.canvas.height);
  for(const ring of pixels){context.moveTo(...ring[0]);for(const point of ring.slice(1))context.lineTo(...point);context.closePath();}
  context.clip('evenodd');return true;
}
