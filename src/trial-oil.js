const absent=value=>value===undefined||value===null;
const defaults={densityGml:0.86,capacityGg:3.42,allowance:1.5,targetFraction:1};
const formulas={
  area:'areaM2 = pixelCount * gsdM * gsdYM, or an independently supplied manual oil area',
  volume:'volumeL = areaM2 * thicknessUm * 0.001 * oilFraction',
  oilMass:'oilMassKg = volumeL * densityGml',
  capsules:'capsulesKg = oilMassKg * targetFraction / capacityGg * allowance',
  units:'GSD: m/pixel; area: m²; thickness: µm; density: g/mL; capacity: g oil/g dry whole capsules; output capsules: kg'
};
const warnings=[
  'Trial calculation based on supplied values and project assumptions, not a validated oil-volume or capsule-dose recommendation.',
  'RGB appearance or an AOI alone cannot establish oil thickness, oil confirmation, density or sorbent performance. Supply independent thickness evidence.',
  'Pixel area assumes valid georeferencing and the supplied ground scale. Oblique imagery, glare, occlusion and duplicate images need independent treatment.',
  'Default project inputs are capacity 3.42 g oil/g dry whole capsules, density 0.86 g/mL and allowance 1.5, not verified performance. Supplied overrides are also unverified by this calculator. Allowance is a multiplier, not statistical confidence.',
  'Capacity must match oil type and conditions. Retained oil is not necessarily removed and recovered oil. Recovery and delivery losses must be calibrated without double counting.',
  'No capsule count, flight command or material-release command is generated.'
];
function number(value,name,min=0,max=Infinity,strictlyPositive=false){
  if(absent(value))return null;
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(strictlyPositive&&value<=0))throw new Error(`${name} must be a finite ${strictlyPositive?'positive ':''}number${max!==Infinity?` between ${min} and ${max}`:''}.`);
  return value;
}
function product(values,label){
  if(values.some(value=>value===null))return null;
  const value=values.reduce((total,entry)=>total*entry,1);
  if(!Number.isFinite(value))throw new Error(`${label} exceeds the supported numeric range.`);
  return value;
}

/** Pure dimensional estimator; no imagery inference, data fetching or control. */
export function calculateOil(settings={}){
  if(!settings||typeof settings!=='object'||Array.isArray(settings))throw new Error('Oil settings must be an object.');
  if(settings.emulsion!==undefined&&typeof settings.emulsion!=='boolean')throw new Error('emulsion must be true or false.');
  if(settings.gsdUnit!==undefined&&settings.gsdUnit!=='m'&&settings.gsdUnit!=='m/pixel')throw new Error('GSD must use m/pixel. Convert centimetres to metres before supplying gsdM.');
  const input={pixelCount:number(settings.pixelCount,'Oil pixel count'),gsdM:number(settings.gsdM,'GSD X (m/pixel)',0,Infinity,true),gsdYM:null,areaM2:number(settings.areaM2,'Manual oil area (m²)'),thicknessLowUm:number(settings.thicknessLowUm,'Minimum thickness (µm)'),thicknessHighUm:number(settings.thicknessHighUm,'Maximum thickness (µm)'),emulsion:settings.emulsion??false};
  if(input.pixelCount!==null&&!Number.isSafeInteger(input.pixelCount))throw new Error('Oil pixel count must be a non-negative safe integer.');
  input.gsdYM=number(settings.gsdYM===undefined?input.gsdM:settings.gsdYM,'GSD Y (m/pixel)',0,Infinity,true);
  for(const [key,value] of Object.entries(defaults))input[key]=number(settings[key]===undefined?value:settings[key],key,key==='allowance'?1:0,key==='targetFraction'?1:Infinity,key==='densityGml'||key==='capacityGg');
  input.oilFraction=number(settings.oilFraction===undefined?(input.emulsion?null:1):settings.oilFraction,'Oil volume fraction',0,1);
  if(input.areaM2!==null&&input.pixelCount!==null)throw new Error('Choose either manual oil area or oil pixel count, not both.');
  if(input.thicknessLowUm!==null&&input.thicknessHighUm!==null&&input.thicknessHighUm<input.thicknessLowUm)throw new Error('Maximum thickness must not be below minimum thickness.');
  const missing=[];
  if(input.areaM2===null&&input.pixelCount===null)missing.push('Oil pixel count or manual oil area (m²)');
  if(input.areaM2===null){if(input.gsdM===null)missing.push('GSD X (m/pixel)');if(input.gsdYM===null&&input.gsdM!==null)missing.push('GSD Y (m/pixel)');}
  if(input.thicknessLowUm===null)missing.push('Minimum thickness (µm)');
  if(input.oilFraction===null)missing.push(input.emulsion?'Measured oil fraction of emulsion':'Oil volume fraction');
  for(const [key,label] of [['densityGml','Oil density (g/mL)'],['capacityGg','Capacity (g oil/g dry whole capsules)'],['allowance','Allowance multiplier'],['targetFraction','Target oil fraction']])if(input[key]===null)missing.push(label);
  const areaM2=input.areaM2??product([input.pixelCount,input.gsdM,input.gsdYM],'Pixel area');
  const volumeLowL=product([areaM2,input.thicknessLowUm,0.001,input.oilFraction],'Minimum oil volume'),volumeHighL=product([areaM2,input.thicknessHighUm,0.001,input.oilFraction],'Maximum oil volume');
  const oilMassLowKg=product([volumeLowL,input.densityGml],'Minimum oil mass'),oilMassHighKg=product([volumeHighL,input.densityGml],'Maximum oil mass');
  const capsuleMass=mass=>product([mass,input.capacityGg===null?null:1/input.capacityGg,input.allowance,input.targetFraction],'Capsule mass');
  const assumptions={kind:'project_assumptions',calibrated:false,areaSource:input.areaM2!==null?'manual_oil_area':'supplied_oil_pixels',densityGml:input.densityGml,capacityGg:input.capacityGg,capacityBasis:'g oil / g dry whole capsules; recovery performance not verified',allowance:input.allowance,targetFraction:input.targetFraction,oilFraction:input.oilFraction,thicknessBasis:input.emulsion?'emulsion layer multiplied by supplied oil volume fraction':'supplied oil layer thickness',defaultedFields:Object.keys(defaults).filter(key=>settings[key]===undefined)};
  return {schema_version:'xedo-trial-oil/1',state:missing.length?'incomplete':'assumption_based',missing,inputs:input,areaM2,volumeLowL,volumeHighL,oilMassLowKg,oilMassHighKg,capsulesLowKg:capsuleMass(oilMassLowKg),capsulesHighKg:capsuleMass(oilMassHighKg),upperUnknown:input.thicknessHighUm===null,formulas:{...formulas},assumptions,warnings:[...warnings],hardwareControl:false,releaseControl:false};
}
