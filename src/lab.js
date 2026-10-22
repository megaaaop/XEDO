import {invalid,utc,bounded} from './planning.js';
export const labHeaders=['sample_id','incident_id','mission_id','batch_id','treatment_group','collected_at','metric','value','unit','matrix','method','source_file','replicate','qualifier','detection_limit'];
export const labTemplate='\uFEFF'+labHeaders.join(',')+'\r\n';
export function parseCSV(text){
  const rows=[];let row=[],field='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;}
    else if(c==='"'){if(field||closed)invalid('INVALID_CSV','Character quote invalid');quoted=true;}
    else if(c===','||c==='\n'||c==='\r'){row.push(field);field='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v!==''))rows.push(row);row=[];}}
    else {if(closed)invalid('INVALID_CSV','Unexpected text after closing quote');field+=c;}}
  if(quoted)invalid('INVALID_CSV','CSV contains quote is not closed');row.push(field);if(row.some(v=>v!==''))rows.push(row);
  if(!rows.length)invalid('INVALID_CSV','CSV blank');rows[0][0]=rows[0][0].replace(/^\uFEFF/,'');return rows;
}
export function validateLabRow(r){
  for(const k of ['sample_id','batch_id','treatment_group','metric','unit','matrix','method','source_file'])if(typeof r[k]!=='string'||!r[k].trim()||r[k].length>300)invalid('INVALID_LAB_ROW',`required: ${k}`);
  if(!r.incident_id&&!r.mission_id)invalid('UNKNOWN_REFERENCE','Specify incident_id or mission_id');utc(r.collected_at);
  const units={water:['mg/L','%'],sediment:['mg/kg','g/kg','%'],material:['kg','g','%'],other:['m²','kg','g','%']};
  if(!units[r.matrix]?.includes(r.unit))invalid('INVALID_UNITS',`Unit ${r.unit} is incompatible with matrix ${r.matrix}`);
  const qualifier=r.qualifier||'=',value=r.value===''||r.value==null?null:Number(r.value),limit=r.detection_limit===''||r.detection_limit==null?null:Number(r.detection_limit),replicate=Number(r.replicate||1);
  if(!['=','<','ND','unknown'].includes(qualifier))invalid('INVALID_QUALIFIER','qualifier Use =, <, ND, unknown');
  if(!Number.isInteger(replicate)||replicate<1||replicate>1000)invalid('INVALID_LAB_ROW','replicate must be an integer 1–1000');
  if(value!=null)bounded(value,'Measurement',0,r.unit==='%'?100:1e12);if(limit!=null)bounded(limit,'detection_limit',0,1e12);
  if(qualifier==='='&&value==null)invalid('INVALID_LAB_ROW','Measurements require value or use qualifier unknown');
  if(qualifier==='<'&&(!(limit>0)||(value!=null&&value>limit)))invalid('INVALID_QUALIFIER','Values below the detection limit require detection_limit');
  if(['ND','unknown'].includes(qualifier)&&value!=null)invalid('INVALID_QUALIFIER','ND/unknown must leave blank value');
  return {...r,collected_at:utc(r.collected_at),value,detection_limit:limit,qualifier,replicate,origin:'lab_measurement',valueKind:'measured',verificationState:'unreviewed'};
}
export function previewLab(text,existing,incidents,plans,sourceMode){
  if(!['live','simulated'].includes(sourceMode))invalid('INVALID_SOURCE_MODE','Specify actual or simulated results');
  const parsed=parseCSV(text),header=parsed.shift();if(new Set(header).size!==header.length||labHeaders.some(k=>!header.includes(k))||header.some(k=>!labHeaders.includes(k)))invalid('INVALID_CSV','Use the headers in template XEDO');
  if(!parsed.length||parsed.length>500)invalid('INVALID_CSV','Import up to 1–500 rows');
  const keys=new Set(existing.map(r=>`${r.sourceMode}|${r.sample_id}|${r.metric}|${r.replicate}`)),rows=[],errors=[];
  for(let i=0;i<parsed.length;i++){try{if(parsed[i].length!==header.length)invalid('INVALID_CSV','Column count mismatch');const r=validateLabRow(Object.fromEntries(header.map((k,j)=>[k,parsed[i][j].trim()])));
    const inc=incidents.find(x=>x.id===r.incident_id),plan=plans.find(x=>x.id===r.mission_id);if(r.incident_id&&!inc||r.mission_id&&!plan||plan&&r.incident_id&&plan.incidentId!==r.incident_id)invalid('UNKNOWN_REFERENCE','incident/mission not found or belongs to another incident');
    const key=`${sourceMode}|${r.sample_id}|${r.metric}|${r.replicate}`;if(keys.has(key))invalid('DUPLICATE_RESULT','sample_id/metric/replicate duplicate');keys.add(key);rows.push({...r,incident_id:r.incident_id||plan.incidentId,sourceMode,schema_version:'1.0'});
  }catch(e){errors.push({row:i+2,code:e.code||'INVALID_LAB_ROW',message:e.message});}}
  return {rows,errors,rowCount:parsed.length,sourceMode,valid:errors.length===0};
}
