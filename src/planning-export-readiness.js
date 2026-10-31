import {checkPlanningReference,serializeQGCPlan} from './trial-export.js';
import {applyPlanningGeospatialGate} from './planning-geospatial-gate.js';
import {applyEnvironmentExportGate} from './planning-environment-gate.js';
import {planningRouteSamples} from './planning-route-samples.js';

/** Recompute reference-file checks from the same inputs as the strict report. */
export function checkPlanningExport(flight,inputs,now=Date.now()){
 const settings={...inputs.export,home:inputs.flight?.home};
 const report=checkPlanningReference(flight,settings,now);
 applyPlanningGeospatialGate(report,inputs,now);
 applyEnvironmentExportGate(report,inputs,now);
 if(inputs.export?.terrainMode==='automatic'&&JSON.stringify(inputs.export?.terrainAssessment?.routePoints)!==JSON.stringify(planningRouteSamples(flight))){
   const message='GEE terrain samples do not match the recalculated sortie routes. Refresh GEE data.';report.missing.push(message);report.checks.push({id:'terrain-route-context',state:'incomplete',message});
 }
 if(inputs.driftEnabled){
   const start=Date.parse(report.plannedTakeoffAt),end=Date.parse(report.plannedEndAt);
   if(!Number.isFinite(start)||!Number.isFinite(end)||start<Date.parse(inputs.drift?.arriveAt)||end>Date.parse(inputs.drift?.endAt)){
     const message='The drift envelope must cover the complete scheduled flight.';report.missing.push(message);report.checks.push({id:'drift-window',state:'incomplete',message});
   }
 }
 const budget=inputs.flight?.usableWh-inputs.flight?.reserveWh;
 if(flight?.battery?.state==='pass'&&(!Number.isFinite(budget)||budget<=0||flight.battery.sorties.some(sortie=>sortie.energyWh>budget+1e-6))){
   const message='A sortie exceeds the explicit energy budget after landing reserve.';report.errors.push(message);report.checks.push({id:'energy-budget',state:'blocked',message});
 }
 report.state=report.errors.length?'blocked':report.missing.length?'incomplete':'pass';report.pass=report.canExport=report.state==='pass';
 report.airspaceStatus=inputs.export?.noGo==null?'not_assessed':'supplied_polygons_only';
 report.planningProfile=structuredClone(inputs.flight?.planningProfile??null);
 report.terrainAssessment=structuredClone(inputs.export?.terrainAssessment??null);
 return report;
}
export function buildPlanningQGCPlan(flight,inputs,sortieIndex=0,now=Date.now()){
 const report=checkPlanningExport(flight,inputs,now);
 if(!report.canExport)throw Object.assign(new Error([...report.errors,...report.missing].join(' ')||'Planning file checks are incomplete.'),{code:'PLANNING_EXPORT_BLOCKED',status:422,report});
 return serializeQGCPlan(flight,report,sortieIndex);
}
