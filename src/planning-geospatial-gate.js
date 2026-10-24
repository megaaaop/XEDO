const samePoint=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===2&&b.length===2&&a.every((value,index)=>Number.isFinite(value)&&Number.isFinite(b[index])&&Math.abs(value-b[index])<1e-7);
/** Reviewed static DEM provenance is not a clearance or datum certificate. */
export function applyGeospatialExportGate(report,inputs,now=Date.now()){
 const evidence=inputs.export?.homeElevationEvidence;
 if(evidence?.mode!=='gee_estimate')return report;
 const errors=[],time=Date.parse(evidence.acceptedAt);
 if(evidence.reviewed!==true)errors.push('Review the GEE home-elevation estimate and its reference before export.');
 if(!samePoint(evidence.home,inputs.flight?.home))errors.push('The reviewed GEE elevation belongs to a different home position.');
 if(!Number.isFinite(evidence.valueM)||!Number.isFinite(inputs.export?.homeAmslM)||Math.abs(evidence.valueM-inputs.export.homeAmslM)>1e-6)errors.push('The home altitude no longer matches the reviewed GEE estimate.');
 if(evidence.datasetId!=='COPERNICUS/DEM/GLO30_2024_1'||evidence.verticalDatum!=='EGM2008'||!Number.isFinite(time)||time>now+60000)errors.push('The GEE home-elevation source or review timestamp is incomplete.');
 if(errors.length){report.pass=false;report.canExport=false;report.state='incomplete';report.missing.push(...errors);report.checks.push(...errors.map(message=>({id:'home-elevation-evidence',state:'incomplete',message})));}
 report.warnings.push('The reviewed Home altitude originated from a 30 m Copernicus DSM estimate in EGM2008. It is user-attested, not a surveyed launch elevation, terrain-following route or verified obstacle clearance.');
 return report;
}