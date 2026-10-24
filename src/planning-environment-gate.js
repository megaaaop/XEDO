/** Prevent accidental use of expired automatic inputs in calculation/file export. */
export function applyEnvironmentExportGate(report,inputs,now=Date.now()){
  const evidence=inputs.flight?.environment;
  if(evidence?.mode!=='automatic')return report;
  const errors=[];
  if(JSON.stringify(evidence.geometry?.coordinates)!==JSON.stringify(inputs.geometry?.coordinates))errors.push('Automatic conditions do not match the selected inspection area.');
  if(evidence.sources?.flightWind?.freshness!=='fresh')errors.push('The flight-wind model update has not been verified.');
  const time=value=>typeof value==='string'?Date.parse(value):NaN;
  const start=time(report.plannedTakeoffAt||inputs.export?.plannedTakeoffAt),end=time(report.plannedEndAt);
  const fetched=time(evidence.fetchedAt),expires=time(evidence.expiresAt),from=time(evidence.startAt),to=time(evidence.endAt);
  if(evidence.ready!==true||!Number.isFinite(fetched)||fetched>now+60000||now-fetched>600000||!Number.isFinite(expires)||expires<=now)errors.push('Automatic mission conditions are missing or expired. Refresh conditions before export.');
  if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(from)||!Number.isFinite(to)||from>start||to<end)errors.push('Automatic conditions must cover the complete scheduled flight. Extend the condition window in Mission settings.');
  if(inputs.driftEnabled&&inputs.drift?.environment?.ready!==true)errors.push('Automatic drift needs current and wind coverage from the original observation through survey end.');
  if(errors.length){report.pass=false;report.canExport=false;report.state='incomplete';report.missing.push(...errors);report.checks.push(...errors.map(message=>({id:'environment',state:'incomplete',message})));}
  return report;
}
