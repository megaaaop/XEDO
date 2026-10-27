import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {readFileSync} from 'node:fs';
import {validateGeometry} from './domain.js';

const ajv=new Ajv2020({strict:false,allErrors:false});addFormats(ajv);
for(const name of ['planning-trial-request','inspector-mission-document','inspector-mission-save']){
  ajv.addSchema(JSON.parse(readFileSync(new URL('../contracts/'+name+'.schema.json',import.meta.url),'utf8')),name+'.schema.json');
}
const validate=ajv.getSchema('inspector-mission-save.schema.json');
const validateDocument=ajv.getSchema('inspector-mission-document.schema.json');
export function validateInspectorDocument(document){
  if(!validateDocument(document))throw Object.assign(Error('This saved mission has invalid data. The current mission has been kept.'),{status:422,code:'MISSION_INVALID'});
  for(const geometry of [document.searchGeometry,document.imageSelection?.selectionGeometry,document.planningInputs?.geometry])if(geometry){try{validateGeometry(geometry);}catch{throw Object.assign(Error('The saved boundary must be a valid closed Polygon.'),{status:422,code:'MISSION_GEOMETRY_INVALID'});}}
  return document;
}
export function validateInspectorSave(input){
  if(!validate(input))throw Object.assign(Error('Check the mission data before saving.'),{status:422,code:'MISSION_INVALID'});
  if(input.intent!=='save_draft')throw Object.assign(Error('Risk confirmation is not available yet. Save the draft instead.'),{status:422,code:'RISK_CONFIRMATION_UNAVAILABLE'});
  if(Buffer.byteLength(JSON.stringify(input.document))>1048576||Buffer.byteLength(JSON.stringify(input.document.planningInputs))>65536)
    throw Object.assign(Error('This mission exceeds the save size limit.'),{status:413,code:'MISSION_TOO_LARGE'});
  if(!input.document.title.trim())throw Object.assign(Error('Enter a mission title.'),{status:422,code:'MISSION_TITLE_REQUIRED'});
  validateInspectorDocument(input.document);
  return input;
}
