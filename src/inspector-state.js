// UI epochs protect responses across account/mission changes; the server still
// enforces session, ownership, idempotency and revision checks independently.
export function createInspectorState(){
  let epoch=0,edit=0,clean=0,user=null,missionId=null,revision=0;
  const capture=()=>({epoch,edit,userId:user?.id||null,missionId});
  const matches=(t,edits=false)=>t.epoch===epoch&&t.userId===(user?.id||null)&&t.missionId===missionId&&(!edits||t.edit===edit);
  return {
    get user(){return user;},get missionId(){return missionId;},get revision(){return revision;},get dirty(){return edit!==clean;},
    capture,matches,key:()=>JSON.stringify(capture()),
    changed(){edit++;},
    account(value){epoch++;user=value;missionId=null;revision=0;edit=0;clean=0;},
    reauthenticate(value){epoch++;user=value;},
    newMission(){epoch++;missionId=null;revision=0;edit=0;clean=0;},
    expire(){epoch++;user=null;},
    opened(data,token){if(!matches(token,true))return false;epoch++;missionId=data.missionId;revision=data.revision;edit=0;clean=0;return true;},
    saved(data,token){if(!matches(token))return false;missionId=data.missionId;revision=data.revision;if(edit===token.edit)clean=edit;return true;}
  };
}
