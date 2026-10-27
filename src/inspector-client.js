import './inspector.css';
import {createInspectorState} from './inspector-state.js';

export function initializeInspector({localFile,captureDocument,restoreDocument,clearMission,invalidateContext}){
  if(localFile)return null;
  const state=createInspectorState();let loading=false,busy=0,chain=Promise.resolve(),pendingSave=null,sessionExpired=false;
  const button=document.createElement('button');button.type='button';button.className='button secondary';button.id='inspector-open';button.textContent='Inspector account';
  document.querySelector('.mission-header-actions').prepend(button);
  const dialog=document.createElement('dialog');dialog.id='inspector-dialog';dialog.setAttribute('aria-labelledby','inspector-title');
  dialog.innerHTML=`<div class="dialog-top"><h2 id="inspector-title">Inspector account</h2><button type="button" class="icon-button" id="inspector-close" aria-label="Close account panel">✕</button></div>
  <div class="inspector-body"><p id="inspector-account" class="muted"></p><p id="inspector-status" role="status" aria-live="polite"></p>
  <form id="inspector-login"><label>Email<input id="inspector-email" type="email" autocomplete="username" maxlength="254" required></label><label>Password<input id="inspector-password" type="password" autocomplete="current-password" maxlength="512" required></label><button class="button primary" type="submit">Sign in</button><p class="muted">Use the Inspector account provided by your team.</p></form>
  <section id="inspector-missions" hidden><div class="inspector-actions"><button id="inspector-logout" class="button quiet" type="button">Sign out</button><button id="inspector-new" class="button secondary" type="button">New mission</button></div>
  <label>Mission title<input id="inspector-mission-title" maxlength="160" value="Coastal inspection"></label><p id="inspector-version" class="muted"></p><div class="inspector-actions"><button id="inspector-save" class="button primary" type="button">Save mission</button><button id="inspector-copy" class="button secondary" type="button">Save a new copy</button><button id="inspector-refresh" class="button quiet" type="button">Refresh my missions</button></div>
  <h3>My missions</h3><ul id="inspector-list" class="inspector-list"></ul><h3 id="inspector-history-heading" hidden>Version history</h3><ul id="inspector-history" class="inspector-list"></ul></section></div>`;
  document.body.append(dialog);const $=id=>dialog.querySelector('#'+id),status=(text,error=false)=>{$('inspector-status').textContent=text;$('inspector-status').dataset.error=String(error);};
  const title=()=>$('inspector-mission-title').value.trim()||'Coastal inspection';
  function render(){
    const signedIn=!!state.user&&!sessionExpired;$('inspector-login').hidden=signedIn;$('inspector-missions').hidden=!signedIn;
    $('inspector-account').textContent=signedIn?state.user.email+' · Inspector':'Sign in to save and reopen your private missions.';
    button.textContent=signedIn?'My missions':'Inspector account';
    $('inspector-version').textContent=state.missionId?'Version '+state.revision+(state.dirty?' · Unsaved changes':' · Saved'):'New mission'+(state.dirty?' · Unsaved changes':'');
    $('inspector-save').textContent=pendingSave?'Retry pending save':'Save mission';
    for(const b of dialog.querySelectorAll('button'))if(!['inspector-close','inspector-logout'].includes(b.id))b.disabled=busy>0;
    dialog.setAttribute('aria-busy',String(busy>0));
  }
  function request(path,options={}){
    const expected=options.expectedUserId??state.user?.id;const {expectedUserId:unused,...fetchOptions}=options;
    const work=chain.then(async()=>{
      let response,data;
      try{response=await fetch('/api/v1/inspector/'+path,{...fetchOptions,credentials:'same-origin',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(18000),headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(expected?{'X-XEDO-Inspector':expected}:{})}});data=await response.json();}
      catch{throw Object.assign(Error('The account service could not be reached. Your current draft is kept.'),{status:503});}
      if(!response.ok)throw Object.assign(Error(data.message||'The account request failed.'),{status:response.status,code:data.code});
      return data;
    });chain=work.catch(()=>{});return work;
  }
  async function task(run){busy++;render();try{await run();}catch(e){if((e.status===401||e.code==='ACCOUNT_CHANGED')&&state.user){sessionExpired=true;invalidateContext();}status(e.message,true);}finally{busy--;render();}}
  function clearList(){for(const id of ['inspector-list','inspector-history'])$(id).replaceChildren();$('inspector-history-heading').hidden=true;}
  function reset(){loading=true;try{clearMission();$('inspector-mission-title').value='Coastal inspection';pendingSave=null;clearList();}finally{loading=false;}}
  function appendAction(list,label,action){const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.className='button secondary';b.textContent=label;b.onclick=()=>task(action);li.append(b);list.append(li);return li;}
  async function listMissions(offset=0){
    const token=state.capture(),data=await request('missions?offset='+offset);if(!state.matches(token))return;
    const list=$('inspector-list');if(!offset)list.replaceChildren();
    if(!data.missions.length&&!offset){const li=document.createElement('li');li.textContent='No saved missions yet.';list.append(li);}
    for(const mission of data.missions){const li=appendAction(list,mission.title+' · v'+mission.revision,()=>open(mission.missionId));const history=document.createElement('button');history.type='button';history.className='button quiet';history.textContent='History';history.onclick=()=>task(()=>showHistory(mission.missionId));li.append(history);}
    if(data.missions.length===50){const li=appendAction(list,'Load more missions',async()=>{li.remove();await listMissions(offset+50);});}
  }
  async function showHistory(id,offset=0){
    const token=state.capture(),data=await request('missions/'+id+'/history?offset='+offset);if(!state.matches(token))return;
    const list=$('inspector-history');if(!offset)list.replaceChildren();$('inspector-history-heading').hidden=false;
    for(const row of data.revisions)appendAction(list,'Version '+row.revision+' · '+new Date(row.createdAt).toLocaleString(),()=>open(id,row.revision));
    if(data.revisions.length===50){const li=appendAction(list,'Load older versions',async()=>{li.remove();await showHistory(id,offset+50);});}
  }
  async function open(id,version){
    if(pendingSave)throw Error('Retry the pending save before opening another mission.');
    if(state.dirty&&!window.confirm('Open this saved version and replace the current unsaved draft?'))return;
    const token=state.capture(),data=await request('missions/'+id+(version?'?revision='+version:''));
    if(!state.matches(token,true)){status('The draft changed while opening. Your current work is kept.');return;}
    loading=true;try{restoreDocument(data.document);$('inspector-mission-title').value=data.document.title;invalidateContext();}finally{loading=false;}
    if(!state.opened(data,token))return;
    status('Opened version '+data.revision+'. Reload satellite imagery and review flight readiness.'+(data.revision!==data.currentRevision?' This is an older version; save a new copy to keep it separately.':''));render();
  }
  async function save(copy=false){
    if(!state.user)throw Error('Sign in before saving a mission.');
    if(copy&&pendingSave)throw Error('Retry the pending save before saving another copy.');
    if(!pendingSave){const token=state.capture();pendingSave={token,body:JSON.stringify({schemaVersion:'xedo-inspector-save/1',missionId:copy?null:state.missionId,expectedRevision:copy?0:state.revision,mutationId:crypto.randomUUID(),intent:'save_draft',document:captureDocument(title())})};}
    const pending=pendingSave;
    let data;try{data=await request('missions',{method:'POST',body:pending.body});}catch(e){if(e.status<500)pendingSave=null;throw e;}
    if(!state.saved(data,pending.token))return;pendingSave=null;
    status(state.dirty?'Saved the earlier draft. Your newer edits are kept; choose Save mission again.':'Mission saved privately as version '+data.revision+'.');render();await listMissions();
  }
  button.onclick=()=>{dialog.showModal();if(state.user)task(()=>listMissions());};$('inspector-close').onclick=()=>dialog.close();
  $('inspector-mission-title').oninput=()=>{state.changed();render();};
  $('inspector-login').onsubmit=e=>{e.preventDefault();const input={email:$('inspector-email').value.trim(),password:$('inspector-password').value};$('inspector-password').value='';task(async()=>{const token=state.capture(),data=await request('login',{method:'POST',body:JSON.stringify(input)});input.password='';if(!state.matches(token))return;const same=state.user?.id===data.user.id,guest=!state.user;sessionExpired=false;if(same){state.reauthenticate(data.user);if(pendingSave)pendingSave.token={...state.capture(),edit:pendingSave.token.edit};}else{state.account(data.user);if(!guest)reset();else{pendingSave=null;clearList();state.changed();}}invalidateContext();status('Signed in. Your missions are private to this account.');render();await listMissions();});};
  $('inspector-logout').onclick=()=>{if((state.dirty||pendingSave)&&!window.confirm('Sign out and discard unsaved changes in this browser?'))return;const expectedUserId=state.user?.id;state.account(null);sessionExpired=false;reset();invalidateContext();render();task(async()=>{await request('logout',{method:'POST',body:'{}',expectedUserId});status('Signed out.');});};
  function startNew(){if(pendingSave){status('Retry the pending save first.',true);dialog.showModal();return;}if(state.dirty&&!window.confirm('Start a new mission and discard unsaved changes?'))return;state.newMission();reset();invalidateContext();status('New mission.');render();if(state.user)task(()=>listMissions());}
  $('inspector-new').onclick=startNew;
  $('inspector-save').onclick=()=>task(()=>save());$('inspector-copy').onclick=()=>task(()=>save(true));$('inspector-refresh').onclick=()=>task(()=>listMissions());
  task(async()=>{const token=state.capture(),data=await request('session');if(state.matches(token))state.reauthenticate(data.user);render();});
  return {startNew,changed(){if(!loading){state.changed();render();}},contextKey:()=>state.key(),async ensureSession(){
    if(sessionExpired){dialog.showModal();return false;}
    if(!state.user){if(state.missionId){status('Sign in again before exporting this private mission.',true);dialog.showModal();return false;}return true;}
    const token=state.capture();try{const data=await request('session');if(!state.matches(token)||data.user?.id!==state.user?.id)throw Error('The account session changed.');return true;}catch(e){if(state.matches(token)){sessionExpired=true;invalidateContext();status(e.message,true);render();dialog.showModal();}return false;}
  }};
}
