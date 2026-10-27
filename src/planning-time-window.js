export const MISSION_WINDOW_LIMITS=Object.freeze({durationMs:24*3600000,pastMs:5*86400000,futureMs:7*86400000});

function durationLabel(ms){
  const seconds=Math.ceil(ms/1000),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);
  return `${hours} h ${minutes} min ${seconds%60} s`;
}

/** Shared planning limits. Keep the real schedule intact; never clamp its end. */
export function missionWindowProblem(startAt,endAt,{now=Date.now(),checkForecastDates=true}={}){
  const empty=value=>value==null||value==='';
  if(empty(startAt)&&empty(endAt))return null;
  if(empty(startAt)||empty(endAt))return {code:'TIME_PAIR',message:'Set both takeoff and mission end times before requesting a forecast.'};
  const instant=value=>typeof value==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(value)?Date.parse(value):NaN;
  const start=instant(startAt),end=instant(endAt),at=typeof now==='function'?now():now;
  if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(at))return {code:'TIME_FORMAT',message:'Choose valid mission dates, clock times and a timezone.'};
  if(end<start)return {code:'TIME_ORDER',message:'Mission end must be later than takeoff.'};
  const durationMs=end-start;
  if(durationMs>MISSION_WINDOW_LIMITS.durationMs)return {code:'TIME_DURATION',durationMs,message:`The mission spans ${durationLabel(durationMs)}; the maximum supported window is 24 hours. Reduce the inspection area or split it into shorter missions.`};
  if(!checkForecastDates)return null;
  if(start<at-MISSION_WINDOW_LIMITS.pastMs)return {code:'TIME_PAST',message:'The mission start is more than five days in the past. Replan or choose a current mission time.'};
  if(end>at+MISSION_WINDOW_LIMITS.futureMs)return {code:'TIME_FUTURE',message:'The mission end is more than seven days ahead. Choose a nearer mission time.'};
  return null;
}
