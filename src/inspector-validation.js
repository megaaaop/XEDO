import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {readFileSync} from 'node:fs';
import {validateGeometry} from './domain.js';
import {validateRiskTarget,coversGeometry,geometryEquals} from './planning-risk-geometry.js';

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
  if(Buffer.byteLength(JSON.stringify(input.document))>1048576||Buffer.byteLength(JSON.stringify(input.document.planningInputs))>65536)
    throw Object.assign(Error('This mission exceeds the save size limit.'),{status:413,code:'MISSION_TOO_LARGE'});
  if(!input.document.title.trim())throw Object.assign(Error('Enter a mission title.'),{status:422,code:'MISSION_TITLE_REQUIRED'});
  validateInspectorDocument(input.document);
  if(input.intent==='confirm_risk'){
    const doc=input.document,target=input.confirmation?.target,area=doc.riskDraft?.areas?.find(a=>a.id===target?.areaId);
    try{
      if(!doc.analysisRef||!doc.imageSelection||!area||doc.riskDraft.selectedAreaId!==area.id||target.origin!==area.origin||JSON.stringify(target.sourceCandidateIds)!==JSON.stringify(area.sourceCandidateIds)||!geometryEquals(target.geometry,{type:'Polygon',coordinates:area.rings})||!geometryEquals(target.geometry,doc.planningInputs.geometry))throw Error('Select the risk draft area to confirm.');
      validateRiskTarget(target.geometry);
      if(!coversGeometry(doc.searchGeometry,target.geometry)||!coversGeometry(doc.imageSelection.selectionGeometry,target.geometry))throw Error('The inspection boundary is outside the reviewed image area.');
    }catch(e){throw Object.assign(Error(e.message),{status:422,code:'RISK_CONFIRMATION_INVALID'});}
  }
  return input;
}
