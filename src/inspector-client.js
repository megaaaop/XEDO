import './inspector.css';
import './action-feedback.css';
import {createInspectorState} from './inspector-state.js';
import {createActionFeedback,paintActionButton} from './action-feedback.js';

export function initializeInspector({localFile,captureDocument,restoreDocument,clearMission,invalidateContext,onSaved}){
  if(localFile)return null;
  const state=createInspectorState(),feedback=createActionFeedback();let loading=false,busy=0,chain=Promise.resolve(),pendingSave=null,sessionExpired=false,lastDocumentKey=null,interactionEpoch=0;
  const button=document.createElement('button');button.type='button';button.className='button secondary';button.id='inspector-open';button.textContent='Inspector account';
  document.querySelector('.mission-header-actions').prepend(button);
  const dialog=document.createElement('dialog');dialog.id='inspector-dialog';dialog.setAttribute('aria-labelledby','inspector-title');
  dialog.innerHTML=`<div class="dialog-top"><h2 id="inspector-title">Inspector account</h2><button type="button" class="icon-button" id="inspector-close" aria-label="Close account panel">✕</button></div>
  <div class="inspector-body"><p id="inspector-account" class="muted"></p><p id="inspector-status" role="status" aria-live="polite"></p>
  <form id="inspector-login"><label>Email<input id="inspector-email" type="email" autocomplete="username" maxlength="254" required></label><label>Password<input id="inspector-password" type="password" autocomplete="current-password" maxlength="512" required></label><button id="inspector-sign-in" class="button primary" type="submit">Sign in</button><p class="muted">Use the Inspector account provided by your team.</p></form>
  <section id="inspector-missions" hidden><div class="inspector-actions"><button id="inspector-logout" class="button quiet" type="button">Sign out</button><button id="inspector-new" class="button secondary" type="button">New mission</button></div>
  <label>Mission title<input id="inspector-mission-title" maxlength="160" value="Coastal inspection"></label><p id="inspector-version" class="muted"></p><div class="inspector-actions"><button id="inspector-save" class="button primary" type="button">Save mission</button><button id="inspector-copy" class="button secondary" type="button">Save a new copy</button><button id="inspector-refresh" class="button quiet" type="button">Refresh my missions</button></div>
  <h3>My missions</h3><ul id="inspector-list" class="inspector-list"></ul><h3 id="inspector-history-heading" hidden>Version history</h3><ul id="inspector-history" class="inspector-list"></ul></section></div>`;
  document.body.append(dialog);const $=id=>dialog.querySelector('#'+id),status=(text,error=false)=>{$('inspector-status').textContent=text;$('inspector-status').dataset.error=String(error);};
  const confirmation=document.createElement('dialog');confirmation.id='inspector-confirm';confirmation.setAttribute('aria-labelledby','inspector-confirm-title');confirmation.setAttribute('aria-describedby','inspector-confirm-message');
  confirmation.innerHTML='<div class="dialog-top"><h2 id="inspector-confirm-title">Keep your current draft?</h2></div><div class="inspector-body"><p id="inspector-confirm-message"></p><div class="inspector-actions"><button id="inspector-confirm-cancel" class="button secondary" type="button" autofocus>Keep current draft</button><button id="inspector-confirm-accept" class="button primary" type="button">Continue</button></div></div>';document.body.append(confirmation);
  let confirmPending=null;
  function confirmChange(message,label){
    if(confirmPending)return Promise.resolve(false);
    confirmation.querySelector('#inspector-confirm-message').textContent=message;confirmation.querySelector('#inspector-confirm-accept').textContent=label;
    return new Promise(resolve=>{
      confirmPending=resolve;
      const finish=value=>{if(!confirmPending)return;confirmPending=null;confirmation.onclose=null;confirmation.close();resolve(value);};
      confirmation.querySelector('#inspector-confirm-cancel').onclick=()=>finish(false);confirmation.querySelector('#inspector-confirm-accept').onclick=()=>finish(true);
      confirmation.oncancel=event=>{event.preventDefault();finish(false);};confirmation.onclose=()=>{if(!confirmation.open)finish(false);};
      confirmation.showModal();confirmation.querySelector('#inspector-confirm-cancel').focus();
    });
  }
  const title=()=>$('inspector-mission-title').value.trim()||'Coastal inspection';
  function render(){
    const signedIn=!!state.user&&!sessionExpired;$('inspector-login').hidden=signedIn;$('inspector-missions').hidden=!signedIn;
    $('inspector-account').textContent=signedIn?state.user.email+' · Inspector':'Sign in to save and reopen your private missions.';
    button.textContent=signedIn?'My missions':'Inspector account';
    $('inspector-version').textContent=state.missionId?'Version '+state.revision+(state.dirty?' · Unsaved changes':' · Saved'):'New mission'+(state.dirty?' · Unsaved changes':'');
    const operation=feedback.current;
    for(const [id,label] of [['inspector-sign-in','Sign in'],['inspector-save',pendingSave?'Retry pending save':'Save mission'],['inspector-copy','Save a new copy'],['inspector-refresh','Refresh my missions'],['inspector-logout','Sign out']])paintActionButton($(id),operation?.target===id,operation?.label,label);
    for(const b of dialog.querySelectorAll('button'))if(!['inspector-close','inspector-logout'].includes(b.id))b.disabled=busy>0;
    $('inspector-logout').disabled=operation?.action==='logout';
    $('inspector-status').dataset.actionBusy=String(Boolean(operation));
    dialog.setAttribute('aria-busy',String(busy>0));
  }
  function request(path,options={}){
    const expected=options.expectedUserId??state.user?.id;const {expectedUserId:unused,...fetchOptions}=options;
    const work=chain.then(async()=>{
      let response,data;
      try{response=await fetch('/api/v1/inspector/'+path,{...fetchOptions,credentials:'same-origin',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(18000),headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(expected?{'X-XEDO-Inspector':expected}:{})}});data=await response.json();}
      catch(e){throw Object.assign(Error(['TimeoutError','AbortError'].includes(e.name)?'The account request timed out. Your current draft is kept. Try again.':'The account service could not be reached. Your current draft is kept.'),{status:503});}
      if(!response.ok)throw Object.assign(Error(data.message||'The account request failed.'),{status:response.status,code:data.code});
      return data;
    });chain=work.catch(()=>{});return work;
  }
  async function task(action,label,run,{target=null,supersede=false}={}){
    if(busy&&!supersede)return;
    const operation=feedback.begin(action,label,target);busy++;status(label);render();
    const phase=message=>{if(feedback.update(operation,message)){status(message);render();}};
    try{await run(phase);}
    catch(e){if(feedback.owns(operation)){if((e.status===401||e.code==='ACCOUNT_CHANGED')&&state.user){sessionExpired=true;invalidateContext();}status(e.message,true);}}
    finally{busy--;feedback.end(operation);render();}
  }
  function clearList(){for(const id of ['inspector-list','inspector-history'])$(id).replaceChildren();$('inspector-history-heading').hidden=true;}
  function reset(){loading=true;try{clearMission();$('inspector-mission-title').value='Coastal inspection';pendingSave=null;clearList();}finally{loading=false;}}
  function appendAction(list,label,action,pending='Opening mission…'){const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.className='button secondary';b.textContent=label;b.onclick=()=>task('open',pending,action);li.append(b);list.append(li);return li;}
  async function listMissions(offset=0){
    const token=state.capture(),data=await request('missions?offset='+offset);if(!state.matches(token))return false;
    const list=$('inspector-list');if(!offset)list.replaceChildren();
    if(!data.missions.length&&!offset){const li=document.createElement('li');li.textContent='No saved missions yet.';list.append(li);}
    for(const mission of data.missions){const li=appendAction(list,mission.title+' · v'+mission.revision,()=>open(mission.missionId));const history=document.createElement('button');history.type='button';history.className='button quiet';history.textContent='History';history.onclick=()=>task('history','Loading history…',()=>showHistory(mission.missionId));li.append(history);}
    if(data.missions.length===50){const li=appendAction(list,'Load more missions',async()=>{await listMissions(offset+50);li.remove();},'Loading more missions…');}
    status(data.missions.length?'Your missions are up to date.':'No saved missions yet.');return true;
  }
  async function showHistory(id,offset=0){
    const token=state.capture(),data=await request('missions/'+id+'/history?offset='+offset);if(!state.matches(token))return;
    const list=$('inspector-history');if(!offset)list.replaceChildren();$('inspector-history-heading').hidden=false;
    for(const row of data.revisions)appendAction(list,'Version '+row.revision+' · '+new Date(row.createdAt).toLocaleString(),()=>open(id,row.revision));
    status(data.revisions.length?'Version history loaded.':'No earlier versions.');
    if(data.revisions.length===50){const li=appendAction(list,'Load older versions',async()=>{await showHistory(id,offset+50);li.remove();},'Loading older versions…');}
  }
  async function open(id,version){
    if(pendingSave)throw Error('Retry the pending save before opening another mission.');
    if(state.dirty&&!await confirmChange('Open this saved version and replace the current unsaved draft?','Open saved version')){status('Opening cancelled. Your current draft is kept.');return;}
    const token=state.capture(),interactionToken=interactionEpoch,data=await request('missions/'+id+(version?'?revision='+version:''));
    if(data.document?.analysisRef)data.analysis=await request('analyses/'+encodeURIComponent(data.document.analysisRef.resultId));
    if(!state.matches(token,true)||interactionToken!==interactionEpoch){if(state.matches(token))status('The draft changed while opening. Your current work is kept.');return;}
    loading=true;try{restoreDocument(data.document,data);$('inspector-mission-title').value=data.document.title;invalidateContext();}finally{loading=false;}
    if(!state.opened(data,token))return;lastDocumentKey=JSON.stringify(captureDocument(title()));
    status('Opened version '+data.revision+'. Reload satellite imagery and review flight readiness.'+(data.revision!==data.currentRevision?' This is an older version; save a new copy to keep it separately.':''));render();
  }
  async function save(copy=false,phase=()=>{},confirmation=null){
    if(!state.user)throw Error('Sign in before saving a mission.');
    if(copy&&pendingSave)throw Error('Retry the pending save before saving another copy.');
    if(confirmation&&pendingSave&&JSON.parse(pendingSave.body).intent!=='confirm_risk')throw Error('Retry the pending save before confirming a risk area.');
    if(!pendingSave){const token=state.capture(),document=captureDocument(title());if(confirmation)document.planningInputs.geometry=structuredClone(confirmation.target.geometry);pendingSave={token,body:JSON.stringify({schemaVersion:'xedo-inspector-save/1',missionId:copy?null:state.missionId,expectedRevision:copy?0:state.revision,mutationId:crypto.randomUUID(),intent:confirmation?'confirm_risk':'save_draft',document,...(confirmation?{confirmation}:{})})};}
    const pending=pendingSave;
    let data;try{data=await request('missions',{method:'POST',body:pending.body});}catch(e){if(e.status<500)pendingSave=null;throw e;}
    if(!state.saved(data,pending.token))return;pendingSave=null;onSaved?.(data,{current:!state.dirty});if(!state.dirty)lastDocumentKey=JSON.stringify(captureDocument(title()));
    const message=state.dirty?'Saved the earlier draft. Your newer edits are kept; choose Save mission again.':'Mission saved privately as version '+data.revision+'.';render();phase('Saved. Refreshing your missions…');
    const savedToken=state.capture();
    try{if(await listMissions())status(message);}catch(e){if(state.matches(savedToken)){if(confirmation)status(message+' The mission list could not refresh. Choose Refresh my missions.',true);else throw Object.assign(Error(message+' The mission list could not refresh. Choose Refresh my missions.'),{status:e.status,code:e.code});}}
    return data;
  }
  button.onclick=()=>{dialog.showModal();if(state.user)task('list','Loading your missions…',()=>listMissions(),{target:'inspector-refresh'});};$('inspector-close').onclick=()=>dialog.close();
  $('inspector-mission-title').oninput=()=>{state.changed();render();};
  $('inspector-login').onsubmit=e=>{e.preventDefault();if(busy)return;const input={email:$('inspector-email').value.trim(),password:$('inspector-password').value};$('inspector-password').value='';task('login','Signing in…',async phase=>{const token=state.capture();let data;try{data=await request('login',{method:'POST',body:JSON.stringify(input)});}finally{input.password='';}if(!state.matches(token))return;const same=state.user?.id===data.user.id,guest=!state.user;sessionExpired=false;if(same){state.reauthenticate(data.user);if(pendingSave)pendingSave.token={...state.capture(),edit:pendingSave.token.edit};}else{state.account(data.user);if(!guest)reset();else{pendingSave=null;clearList();state.changed();}}invalidateContext();phase('Signed in. Loading your missions…');if(await listMissions())status('Signed in. Your missions are private to this account.');},{target:'inspector-sign-in'});};
  $('inspector-logout').onclick=async()=>{if(feedback.current?.action==='logout'||confirmPending)return;if((state.dirty||pendingSave)&&!await confirmChange('Sign out and discard unsaved changes in this browser?','Sign out and discard'))return;const expectedUserId=state.user?.id;state.account(null);sessionExpired=false;reset();invalidateContext();render();task('logout','Signing out…',async()=>{await request('logout',{method:'POST',body:'{}',expectedUserId});status('Signed out.');},{target:'inspector-logout',supersede:true});};
  async function startNew(){if(confirmPending)return;if(busy){dialog.showModal();return;}if(pendingSave){status('Retry the pending save first.',true);dialog.showModal();return;}if(state.dirty&&!await confirmChange('Start a new mission and discard unsaved changes?','Start new mission'))return;state.newMission();reset();invalidateContext();status('New mission.');render();if(state.user)task('list','Loading your missions…',async()=>{if(await listMissions())status('New mission.');});}
  $('inspector-new').onclick=startNew;
  $('inspector-save').onclick=()=>task('save','Saving mission…',phase=>save(false,phase),{target:'inspector-save'});$('inspector-copy').onclick=()=>task('save','Saving a new copy…',phase=>save(true,phase),{target:'inspector-copy'});$('inspector-refresh').onclick=()=>task('list','Loading your missions…',()=>listMissions(),{target:'inspector-refresh'});
  task('session','Checking account…',async()=>{const token=state.capture(),data=await request('session');if(state.matches(token)){state.reauthenticate(data.user);status(data.user?'Account ready.':'');}render();});
  return {startNew,confirmChange,interactionStarted(){interactionEpoch++;},isSignedIn:()=>!!state.user&&!sessionExpired,accountId:()=>state.user?.id||null,
    async prepareAnalysis(){
      if(!state.user||sessionExpired){dialog.showModal();throw Error('Sign in before analyzing an area.');}
      if(busy)throw Error('Wait for the current account request to finish.');
      let receipt;await task('save','Saving analysis area…',async phase=>{receipt=await save(false,phase);});
      if(!receipt)throw Error($('inspector-status').textContent||'The analysis area could not be saved.');
      if(state.dirty)throw Error('The draft changed while saving. Analyze the current area again.');
      return {missionId:state.missionId,expectedRevision:state.revision,userId:state.user.id,contextKey:state.key()};
    },
    async analysisRequest(path,options={}){if(!state.user||sessionExpired){dialog.showModal();throw Error('Sign in with your Inspector account to open AI results.');}const token=state.capture(),data=await request(path,options);if(!state.matches(token))throw Error('The account or mission changed. Open the AI result again.');return data;},async confirmRisk(confirmation){if(busy)throw Error('An account request is still running. Try again when it finishes.');if(!state.user||sessionExpired){dialog.showModal();throw Error('Sign in before confirming a risk area.');}let receipt;await task('confirm','Confirming risk area…',async phase=>{receipt=await save(false,phase,confirmation);});if(!receipt)throw Error($('inspector-status').textContent||'Risk confirmation did not complete. Your draft is kept.');return receipt;},changed(){if(!loading){const next=JSON.stringify(captureDocument(title()));if(next!==lastDocumentKey){lastDocumentKey=next;state.changed();}render();}},contextKey:()=>state.key(),async ensureSession(){
    if(sessionExpired){dialog.showModal();return false;}
    if(!state.user){if(state.missionId){status('Sign in again before exporting this private mission.',true);dialog.showModal();return false;}return true;}
    const token=state.capture();try{const data=await request('session');if(!state.matches(token)||data.user?.id!==state.user?.id)throw Error('The account session changed.');return true;}catch(e){if(state.matches(token)){sessionExpired=true;invalidateContext();status(e.message,true);render();dialog.showModal();}return false;}
  }};
}
