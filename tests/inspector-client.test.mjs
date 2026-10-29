import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {createInspectorState} from '../src/inspector-state.js';
import {createActionFeedback,paintActionButton} from '../src/action-feedback.js';

const source=(await readFile(new URL('../src/inspector-client.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace('export function initializeInspector','function initializeInspector');
const settle=async()=>{for(let i=0;i<35;i++)await Promise.resolve();};
function harness(){
  const elements=[],requests=[],restored=[];let captured={title:'First draft'},cleared=0;
  class Element{
    constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.textContent='';this.value='';this.disabled=false;this.hidden=false;elements.push(this);}
    set innerHTML(html){for(const match of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)){const node=new Element(match[1]);node.id=match[2];node.parent=this;this.children.push(node);}}
    setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
    append(...nodes){this.children.push(...nodes);for(const node of nodes)node.parent=this;}prepend(node){this.children.unshift(node);}
    replaceChildren(...nodes){this.children=nodes;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
    querySelector(selector){return elements.find(x=>x.id===selector.slice(1));}querySelectorAll(selector){assert.equal(selector,'button');return elements.filter(x=>x.tagName==='button');}
    showModal(){this.open=true;}close(){this.open=false;this.onclose?.();}focus(){this.focused=true;}
  }
  const header=new Element('div'),body=new Element('body');
  const document={body,createElement:tag=>new Element(tag),querySelector:selector=>selector==='.mission-header-actions'?header:null};
  const context=vm.createContext({document,window:{confirm:()=>true},crypto:webcrypto,AbortSignal,createInspectorState,createActionFeedback,paintActionButton,
    fetch:async(path,options)=>new Promise((resolve,reject)=>requests.push({path,options,reject,reply(data,status=200){resolve({ok:status<400,status,json:async()=>data});}}))});
  vm.runInContext(source,context);
  const ui=context.initializeInspector({localFile:false,captureDocument:title=>({...captured,title}),restoreDocument:doc=>restored.push(doc),clearMission:()=>cleared++,invalidateContext(){}});
  const node=id=>elements.find(x=>x.id===id),status=()=>node('inspector-status').textContent;
  return {ui,node,requests,restored,status,async confirm(value=true){node('inspector-confirm-'+(value?'accept':'cancel')).onclick();await settle();},get cleared(){return cleared;},setCaptured(value){captured=value;ui.changed();},async guest(){await settle();requests.shift().reply({user:null});await settle();},async login(){node('inspector-email').value='alice@example.test';node('inspector-password').value='fixture-only';node('inspector-login').onsubmit({preventDefault(){}});await settle();requests.shift().reply({user:{id:'alice',email:'alice@example.test'}});await settle();requests.shift().reply({missions:[]});await settle();}};
}

test('Login publishes pending before fetch and deduplicates direct submits through loading the mission list',async()=>{
  const h=harness();await h.guest();h.node('inspector-email').value='alice@example.test';h.node('inspector-password').value='fixture-only';
  for(let i=0;i<10;i++)h.node('inspector-login').onsubmit({preventDefault(){}});
  assert.equal(h.status(),'Signing in…');assert.equal(h.node('inspector-sign-in').dataset.actionBusy,'true');assert.equal(h.node('inspector-password').value,'');
  await settle();assert.equal(h.requests.length,1);h.requests.shift().reply({user:{id:'alice',email:'alice@example.test'}});await settle();
  assert.equal(h.status(),'Signed in. Loading your missions…');assert.equal(h.node('inspector-sign-in').getAttribute('aria-busy'),'true');
  h.requests.shift().reply({missions:[]});await settle();assert.equal(h.node('inspector-sign-in').getAttribute('aria-busy'),'false');assert.match(h.status(),/Signed in.*private/);
});

test('Login failure ends feedback and permits a fresh retry without showing credentials',async()=>{
  const h=harness();await h.guest();h.node('inspector-email').value='alice@example.test';h.node('inspector-password').value='fixture-only';h.node('inspector-login').onsubmit({preventDefault(){}});await settle();
  h.requests.shift().reply({message:'Invalid email or password.'},401);await settle();assert.equal(h.status(),'Invalid email or password.');assert.equal(h.node('inspector-sign-in').disabled,false);assert.equal(h.node('inspector-sign-in').dataset.actionBusy,'false');assert(!h.status().includes('fixture-only'));
});

test('Sign out during Save clears private UI immediately, preserves queue and ignores old completion',async()=>{
  const h=harness();await h.guest();await h.login();h.ui.changed();h.node('inspector-save').onclick();await settle();const save=h.requests.shift();assert.match(save.path,/missions$/);
  h.node('inspector-logout').onclick();await h.confirm();assert.equal(h.node('inspector-missions').hidden,true);assert.equal(h.status(),'Signing out…');assert.equal(h.cleared,1);await settle();assert.equal(h.requests.length,0,'revocation must wait for Save');
  save.reply({missionId:'mission-a',revision:1});await settle();assert.equal(h.status(),'Signing out…');assert.equal(h.node('inspector-logout').dataset.actionBusy,'true');assert.equal(h.requests[0].options.headers['X-XEDO-Inspector'],'alice');
  h.requests.shift().reply({signedOut:true});await settle();assert.equal(h.status(),'Signed out.');assert.equal(h.node('inspector-logout').dataset.actionBusy,'false');assert.equal(h.node('inspector-missions').hidden,true);
});

test('A stale list failure cannot replace a newer sign-out result or restore private rows',async()=>{
  const h=harness();await h.guest();await h.login();h.node('inspector-refresh').onclick();await settle();const listing=h.requests.shift();h.node('inspector-logout').onclick();await h.confirm();listing.reject(Error('offline'));await settle();assert.equal(h.status(),'Signing out…');h.requests.shift().reply({});await settle();assert.equal(h.status(),'Signed out.');assert.equal(h.node('inspector-list').children.length,0);
});

test('Uncertain Save retry keeps exact mutation and earlier draft while preserving newer edits',async()=>{
  const h=harness();await h.guest();await h.login();h.node('inspector-save').onclick();await settle();const original=h.requests.shift();original.reply({message:'Temporary failure'},503);await settle();assert.equal(h.node('inspector-save').textContent,'Retry pending save');
  h.setCaptured({title:'newer',other:'newer edit'});h.node('inspector-save').onclick();await settle();const retry=h.requests.shift();assert.equal(retry.options.body,original.options.body);retry.reply({missionId:'mission-a',revision:1});await settle();h.requests.shift().reply({missions:[{title:'First draft',missionId:'mission-a',revision:1}]});await settle();assert.match(h.status(),/earlier draft.*newer edits/);assert.match(h.node('inspector-version').textContent,/Unsaved changes/);assert.equal(h.node('inspector-save').textContent,'Save mission');
});

test('Acknowledged Save followed by failed list refresh reports saved status and has no pending mutation',async()=>{
  const h=harness();await h.guest();await h.login();h.node('inspector-save').onclick();await settle();h.requests.shift().reply({missionId:'mission-a',revision:1});await settle();h.requests.shift().reply({message:'Unavailable'},503);await settle();assert.match(h.status(),/Mission saved privately as version 1.*list could not refresh/);assert.equal(h.node('inspector-save').textContent,'Save mission');assert.match(h.node('inspector-version').textContent,/Version 1.*Saved/);
});

test('Closing the account panel does not cancel or misreport an in-flight Save',async()=>{
  const h=harness();await h.guest();await h.login();h.node('inspector-open').onclick();await settle();h.requests.shift().reply({missions:[]});await settle();h.node('inspector-save').onclick();await settle();h.node('inspector-close').onclick();assert.equal(h.node('inspector-dialog').open,false);assert.equal(h.status(),'Saving mission…');h.requests.shift().reply({missionId:'mission-a',revision:1});await settle();h.requests.shift().reply({missions:[]});await settle();assert.match(h.status(),/Mission saved privately/);assert.equal(h.node('inspector-save').dataset.actionBusy,'false');
});

test('Declining Sign out keeps the draft and account and sends no revocation',async()=>{
  const h=harness();await h.guest();await h.login();const key=h.ui.contextKey();const pending=h.node('inspector-logout').onclick();assert.equal(h.node('inspector-confirm').open,true);assert.equal(h.node('inspector-confirm-cancel').focused,true);await h.confirm(false);await pending;assert.equal(h.ui.contextKey(),key);assert.equal(h.cleared,0);assert.equal(h.requests.length,0);assert.equal(h.node('inspector-missions').hidden,false);assert.equal(h.node('inspector-confirm').open,false);
});

test('Escape dismisses the draft confirmation and repeated action does not create another operation',async()=>{
  const h=harness();await h.guest();await h.login();const pending=h.ui.startNew();h.ui.startNew();let prevented=false;h.node('inspector-confirm').oncancel({preventDefault(){prevented=true;}});await pending;assert.equal(prevented,true);assert.equal(h.cleared,0);assert.equal(h.requests.length,0);assert.equal(h.node('inspector-confirm').open,false);
});

test('Repeated Sign out while confirmation is open still queues only one revocation',async()=>{
  const h=harness();await h.guest();await h.login();const first=h.node('inspector-logout').onclick();for(let i=0;i<10;i++)h.node('inspector-logout').onclick();await h.confirm();await first;assert.equal(h.cleared,1);assert.equal(h.requests.length,1);assert.match(h.requests[0].path,/logout$/);h.requests.shift().reply({});await settle();assert.equal(h.status(),'Signed out.');
});

test('A queued close event from an earlier confirmation cannot dismiss a newly opened confirmation',async()=>{
  const h=harness();await h.guest();await h.login();const first=h.ui.startNew(),oldClose=h.node('inspector-confirm').onclose;await h.confirm(false);await first;const second=h.ui.startNew();oldClose();assert.equal(h.node('inspector-confirm').open,true);await h.confirm(false);await second;assert.equal(h.cleared,0);
});

test('Unchanged readiness notifications do not turn a saved document into unsaved edits',async()=>{
  const h=harness();await h.guest();await h.login();h.setCaptured({title:'Stable draft'});h.node('inspector-save').onclick();await settle();h.requests.shift().reply({missionId:'m1',revision:1});await settle();h.requests.shift().reply({missions:[]});await settle();
  assert.equal(h.node('inspector-version').textContent,'Version 1 · Saved');const key=h.ui.contextKey();for(let i=0;i<20;i++)h.ui.changed();assert.equal(h.ui.contextKey(),key);assert.equal(h.node('inspector-version').textContent,'Version 1 · Saved');h.setCaptured({inputMode:'estimated_demo'});assert.match(h.node('inspector-version').textContent,/Unsaved/);
});

test('Starting a map edit prevents a late mission Open from replacing the active gesture',async()=>{
  const h=harness();await h.guest();await h.login();h.node('inspector-open').onclick();await settle();
  h.requests.shift().reply({missions:[{title:'Saved',missionId:'m1',revision:1}]});await settle();
  h.node('inspector-list').children[0].children[0].onclick();await settle();if(h.node('inspector-confirm').open)await h.confirm();const opening=h.requests.shift();
  h.node('inspector-close').onclick();h.ui.interactionStarted();opening.reply({missionId:'m1',revision:1,document:{title:'Saved'}});await settle();
  assert.equal(h.restored.length,0);assert.match(h.status(),/draft changed while opening/);
});
