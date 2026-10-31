const samePoint=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===2&&b.length===2&&a.every((value,index)=>Number.isFinite(value)&&Number.isFinite(b[index])&&Math.abs(value-b[index])<1e-7);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const DEM='COPERNICUS/DEM/GLO30_2024_1';
const validSource=source=>source?.datasetId===DEM&&source?.verticalDatum==='EGM2008'&&source?.resolutionM===30;
const fresh=(value,now)=>{const fetched=Date.parse(value?.fetchedAt),expires=Date.parse(value?.expiresAt);return Number.isFinite(fetched)&&fetched<=now+60000&&now-fetched<=600000&&Number.isFinite(expires)&&expires>now&&expires<=fetched+600000;};
function block(report,errors,id){if(errors.length){report.pass=false;report.canExport=false;report.state='incomplete';report.missing.push(...errors);report.checks.push(...errors.map(message=>({id,state:'incomplete',message})));}}
function modelGate(report,inputs,now,reference=false){
 const assessment=inputs.export?.terrainAssessment,evidence=inputs.export?.homeElevationEvidence,context=inputs.flight?.geospatialEvidence,errors=[];
 if(assessment?.mode!=='gee_model'||!(reference?['ready','review']:['ready']).includes(assessment.state))errors.push(reference?'Complete GEE model evidence for the inspection area, route and Home is required.':'A ready GEE model assessment for the inspection area, route and Home is required.');
 if(!same(assessment?.geometry,inputs.geometry)||!samePoint(assessment?.home,inputs.flight?.home)||context?.mode!=='gee_context'||!same(assessment?.geometry,context.geometry)||!samePoint(assessment?.home,context.home)||!same(assessment?.routePoints||[],context.routePoints||[]))errors.push('The GEE model assessment no longer matches the current area, route or Home.');
 const route=assessment?.routePoints;
 if(!Array.isArray(route)||route.length>24||route.some(point=>!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||point[0]<97||point[0]>106||point[1]<5||point[1]>21))errors.push('The GEE model route sample set is invalid.');
 if(!validSource(assessment?.source)||assessment?.verticalDatum!=='EGM2008'||!fresh(assessment,now)||!fresh(context,now)||assessment?.fetchedAt!==context?.fetchedAt||assessment?.expiresAt!==context?.expiresAt)errors.push('Fresh Copernicus DSM model evidence with its EGM2008 reference is required.');
 const {coverage,toleranceM,terrainRangeM,homeOffsetM,minElevationM,maxElevationM,homeElevationM}=assessment||{};
 if(!Number.isInteger(coverage?.known)||!Number.isInteger(coverage?.total)||coverage.total<1||coverage.total>80||coverage.known!==coverage.total||coverage.fraction!==1)errors.push('Every requested inspection, route and Home sample must be known; missing elevations cannot pass as zero.');
 if(![toleranceM,terrainRangeM,homeOffsetM,minElevationM,maxElevationM,homeElevationM].every(Number.isFinite)||toleranceM<=0||terrainRangeM<0||homeOffsetM<0||maxElevationM<minElevationM||Math.abs(terrainRangeM-(maxElevationM-minElevationM))>1e-6||Math.abs(homeOffsetM-Math.max(Math.abs(minElevationM-homeElevationM),Math.abs(maxElevationM-homeElevationM)))>1e-6||(!reference&&(terrainRangeM>toleranceM||homeOffsetM>toleranceM)))errors.push(reference?'Complete and internally consistent surface elevations are required.':'Sampled surface range and Home offset must satisfy the configured model tolerance.');
 const accepted=Date.parse(evidence?.acceptedAt);
 if(evidence?.mode!=='gee_model'||!samePoint(evidence.home,inputs.flight?.home)||!Number.isFinite(evidence.valueM)||!Number.isFinite(inputs.export?.homeAmslM)||Math.abs(evidence.valueM-inputs.export.homeAmslM)>1e-6||evidence.valueM!==homeElevationM||!validSource(evidence)||!Number.isFinite(accepted)||accepted>now+60000||evidence.fetchedAt!==assessment?.fetchedAt||evidence.expiresAt!==assessment?.expiresAt)errors.push('Use the matching GEE model Home elevation or select the separately reviewed manual mode.');
 block(report,errors,'terrain-model-evidence');
 if(reference&&errors.length===0){
   const altitude=inputs.export.homeAmslM+inputs.export.relativeHeightM;
   if(!Number.isFinite(altitude)||altitude<=maxElevationM){report.pass=false;report.canExport=false;report.state='blocked';const message='The relative-Home route height is at or below a known DSM surface sample. Revise the route height or Home reference.';report.errors.push(message);report.checks.push({id:'known-surface-conflict',state:'blocked',message});}
   else report.checks.push({id:'terrain-reference',state:assessment.state==='review'?'review':'pass',message:`GEE surface ${minElevationM}–${maxElevationM} m; range ${terrainRangeM} m / tolerance ${toleranceM} m. Relative-Home route ${altitude} m AMSL; sparse samples do not establish actual clearance.`});
 }
 report.warnings.push('GEE model assessment uses sparse historical 30 m DSM samples in EGM2008 and an unverified model tolerance. It does not certify actual launch level, ground flatness, obstacles, terrain clearance or permission to fly.');
 return report;
}
export function applyPlanningGeospatialGate(report,inputs,now=Date.now()){
 if(inputs.export?.terrainMode==='automatic'||inputs.export?.terrainAssessment?.mode==='gee_model'||inputs.export?.homeElevationEvidence?.mode==='gee_model')return modelGate(report,inputs,now,true);
 return applyGeospatialExportGate(report,inputs,now);
}
/** Reviewed static DEM provenance is not a clearance or datum certificate. */
export function applyGeospatialExportGate(report,inputs,now=Date.now()){
 const evidence=inputs.export?.homeElevationEvidence;
 if(inputs.export?.terrainAssessment?.mode==='gee_model'||evidence?.mode==='gee_model')return modelGate(report,inputs,now);
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
