/** Editable calculation assumptions; these are not measured aircraft limits. */
export const PLANNING_FLIGHT_PROFILE=Object.freeze({
  id:'xedo-flight-planning-v1',
  values:Object.freeze({windLimitMps:8,maxAirspeedMps:12,usableWh:177.6,reserveWh:44.4,powerW:600,takeoffS:30,landingS:30,turnS:5})
});
const keys=Object.keys(PLANNING_FLIGHT_PROFILE.values);
const valueOf=value=>value==null||value===''?null:value;
export function createPlanningFlightProfile(){
  let automatic=Object.fromEntries(keys.map(key=>[key,true])),last={};
  function reconcile(settings={}){
    const patch={};
    for(const key of keys){
      if(!automatic[key])continue;
      const current=valueOf(settings[key]);
      if(Object.hasOwn(last,key)?current!==last[key]:current!==null){automatic[key]=false;continue;}
      const desired=PLANNING_FLIGHT_PROFILE.values[key];
      if(current!==desired)patch[key]=desired;
      last[key]=desired;
    }
    return patch;
  }
  function edited(key){if(keys.includes(key))automatic[key]=false;}
  function reset(settings={}){automatic=Object.fromEntries(keys.map(key=>[key,true]));last=Object.fromEntries(keys.map(key=>[key,valueOf(settings[key])]));}
  function metadata(settings={}){reconcile(settings);return {version:1,profileId:PLANNING_FLIGHT_PROFILE.id,source:'XEDO editable planning assumptions',fields:Object.fromEntries(keys.map(key=>[key,{mode:automatic[key]?'automatic':'manual',value:valueOf(settings[key])}]))};}
  function restore(settings={}){
    last={};const saved=settings.planningProfile;
    for(const key of keys){const current=valueOf(settings[key]),record=saved?.fields?.[key];automatic[key]=saved==null?current===null:saved.version===1&&saved.profileId===PLANNING_FLIGHT_PROFILE.id&&record?.mode==='automatic'&&valueOf(record.value)===current;if(automatic[key])last[key]=current;}
  }
  return {reconcile,edited,reset,metadata,restore};
}
