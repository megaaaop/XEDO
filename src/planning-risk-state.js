import {geometryEquals} from './planning-risk-geometry.js';

const copy=value=>structuredClone(value);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ownKeys=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.includes(k));
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const item of Object.values(value))freeze(item);}return value;}
function freshDraft(){return {baseReviewRevision:null,decisions:[],areas:[],selectedAreaId:null};}
function sketchRings(geometry){
  if(geometry?.type!=='Polygon'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length>64)throw Error('Edit one Polygon at a time.');
  if(geometry.coordinates.some(r=>!Array.isArray(r)||r.length>4097||r.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>85)))throw Error('The risk sketch has invalid coordinates or too many points.');
  return copy(geometry.coordinates);
}
function rawCandidates(analysis){
  const candidates=analysis?.candidates?.features||analysis?.candidates||analysis?.rawCandidates?.features||analysis?.features||[];
  if(!Array.isArray(candidates)||candidates.length>256)throw Error('This AI result has too many candidate areas.');
  return candidates;
}

/** Only draft editing state. A server confirmation is required for a planning target. */
export function createRiskState({analysis,idFactory=()=>crypto.randomUUID(),onChange=()=>{}}={}){
  const immutableAnalysis=freeze(copy(analysis||{})),candidates=new Map();
  for(const feature of rawCandidates(immutableAnalysis)){
    const id=feature?.properties?.candidateId||feature?.id;
    if(typeof id!=='string'||!id||id.length>120||candidates.has(id))throw Error('The AI result contains invalid or duplicate candidate IDs.');
    candidates.set(id,feature);
  }
  let draft=freshDraft(),version=0,undoStack=[],redoStack=[],transaction=null;
  const getDraft=()=>copy(draft);
  const getSelected=()=>{const area=draft.areas.find(a=>a.id===draft.selectedAreaId);return area?{...copy(area),geometry:{type:'Polygon',coordinates:copy(area.rings)}}:null;};
  const snapshot=()=>({draft:getDraft(),selected:getSelected(),version,canUndo:undoStack.length>0,canRedo:redoStack.length>0,editing:transaction!==null});
  const emit=type=>{version++;onChange(snapshot(),type);return getDraft();};
  const candidate=id=>{const feature=candidates.get(id);if(!feature)throw Error('The AI candidate is not part of this result.');return feature;};
  const newId=()=>{const id=idFactory();if(typeof id!=='string'||!uuid.test(id)||draft.areas.some(a=>a.id===id))throw Error('Could not create a unique risk-area ID.');return id;};
  const decision=(candidateId,action,areaId)=>{
    const index=draft.decisions.findIndex(d=>d.candidateId===candidateId),value={candidateId,action,areaId};
    if(index<0){if(draft.decisions.length>=256)throw Error('There are too many review decisions.');draft.decisions.push(value);}else draft.decisions[index]=value;
  };
  const validateDraft=value=>{
    if(!ownKeys(value,['baseReviewRevision','decisions','areas','selectedAreaId'])||(!Number.isInteger(value.baseReviewRevision)&&value.baseReviewRevision!==null)||(value.baseReviewRevision!==null&&value.baseReviewRevision<1)||!Array.isArray(value.decisions)||value.decisions.length>256||!Array.isArray(value.areas)||value.areas.length>128)throw Error('This saved risk draft is invalid.');
    const ids=new Set(),candidateDecisions=new Set();
    for(const area of value.areas){
      if(!ownKeys(area,['id','origin','sourceCandidateIds','rings'])||typeof area.id!=='string'||!uuid.test(area.id)||ids.has(area.id)||!['candidate','edited_candidate','manual'].includes(area.origin)||!Array.isArray(area.sourceCandidateIds)||area.sourceCandidateIds.length>256||new Set(area.sourceCandidateIds).size!==area.sourceCandidateIds.length)throw Error('This saved risk area is invalid.');
      ids.add(area.id);sketchRings({type:'Polygon',coordinates:area.rings});
      for(const id of area.sourceCandidateIds)candidate(id);
      if(area.origin==='manual'&&area.sourceCandidateIds.length)throw Error('A manual area cannot claim an AI source.');
      if(area.origin!=='manual'&&!area.sourceCandidateIds.length)throw Error('This edited AI area has no source candidate.');
      if(area.origin==='candidate'&&(area.sourceCandidateIds.length!==1||!geometryEquals({type:'Polygon',coordinates:area.rings},candidate(area.sourceCandidateIds[0]).geometry)))throw Error('An unchanged AI area must preserve its original boundary.');
    }
    for(const item of value.decisions){
      if(!ownKeys(item,['candidateId','action','areaId'])||!['accept','edit','reject'].includes(item.action)||candidateDecisions.has(item.candidateId))throw Error('This saved risk decision is invalid.');
      candidate(item.candidateId);candidateDecisions.add(item.candidateId);
      if(item.action==='reject'){if(item.areaId!==null)throw Error('A rejected candidate cannot select an inspection area.');}
      else {const area=value.areas.find(a=>a.id===item.areaId);if(!area||!area.sourceCandidateIds.includes(item.candidateId)||(item.action==='accept'&&area.origin!=='candidate')||(item.action==='edit'&&area.origin!=='edited_candidate'))throw Error('The saved risk decision does not match its area.');}
    }
    if(value.selectedAreaId!==null&&!ids.has(value.selectedAreaId))throw Error('The selected risk area is missing.');
    return copy(value);
  };
  const mutate=(type,operation,{history=true}={})=>{
    const before=getDraft();
    try{operation();validateDraft(draft);}catch(e){draft=before;throw e;}
    if(JSON.stringify(before)===JSON.stringify(draft))return getDraft();
    if(history&&!transaction){undoStack.push(before);if(undoStack.length>64)undoStack.shift();redoStack=[];}
    return emit(type);
  };
  const api={
    snapshot,getDraft,getSelected,getAnalysis:()=>immutableAnalysis,
    restore(value){const validated=validateDraft(value||freshDraft());draft=validated;undoStack=[];redoStack=[];transaction=null;return emit('restore');},
    setSelected(areaId){return mutate('selection',()=>{if(areaId!==null&&!draft.areas.some(a=>a.id===areaId))throw Error('Choose an existing risk area.');draft.selectedAreaId=areaId;},{history:false});},
    accept(candidateId){return mutate('accept',()=>{
      const feature=candidate(candidateId),rings=sketchRings(feature.geometry);
      const previous=draft.decisions.find(d=>d.candidateId===candidateId),existing=previous&&draft.areas.find(a=>a.id===previous.areaId);
      if(existing){existing.origin='candidate';existing.sourceCandidateIds=[candidateId];existing.rings=rings;draft.selectedAreaId=existing.id;decision(candidateId,'accept',existing.id);}
      else {if(draft.areas.length>=128)throw Error('This draft already has 128 risk areas.');const id=newId();draft.areas.push({id,origin:'candidate',sourceCandidateIds:[candidateId],rings});decision(candidateId,'accept',id);draft.selectedAreaId=id;}
    });},
    reject(candidateId){return mutate('reject',()=>{
      candidate(candidateId);const related=draft.areas.filter(a=>a.sourceCandidateIds.includes(candidateId));
      if(related.some(a=>a.sourceCandidateIds.length>1))throw Error('Separate this combined inspection area before rejecting a source candidate.');
      const removed=new Set(related.map(a=>a.id));draft.areas=draft.areas.filter(a=>!removed.has(a.id));if(removed.has(draft.selectedAreaId))draft.selectedAreaId=null;decision(candidateId,'reject',null);
    });},
    add(geometry){return mutate('add',()=>{if(draft.areas.length>=128)throw Error('This draft already has 128 risk areas.');const id=newId();draft.areas.push({id,origin:'manual',sourceCandidateIds:[],rings:sketchRings(geometry)});draft.selectedAreaId=id;});},
    update(areaId,geometry){return mutate('edit',()=>{
      const area=draft.areas.find(a=>a.id===areaId);if(!area)throw Error('Choose an existing risk area.');const rings=sketchRings(geometry);
      if(geometryEquals({type:'Polygon',coordinates:area.rings},{type:'Polygon',coordinates:rings}))return;
      area.rings=rings;if(area.origin==='candidate')area.origin='edited_candidate';for(const id of area.sourceCandidateIds)decision(id,'edit',area.id);draft.selectedAreaId=area.id;
    });},
    remove(areaId){return mutate('remove',()=>{const area=draft.areas.find(a=>a.id===areaId);if(!area)throw Error('Choose an existing risk area.');draft.areas=draft.areas.filter(a=>a.id!==areaId);for(const id of area.sourceCandidateIds)decision(id,'reject',null);if(draft.selectedAreaId===areaId)draft.selectedAreaId=null;});},
    begin(){if(transaction)throw Error('Finish or cancel the current risk edit first.');transaction=getDraft();return emit('begin');},
    commit(){if(!transaction)return getDraft();const previous=transaction;transaction=null;if(JSON.stringify(previous)!==JSON.stringify(draft)){undoStack.push(previous);if(undoStack.length>64)undoStack.shift();redoStack=[];}return emit('commit');},
    cancel(){if(!transaction)return getDraft();draft=transaction;transaction=null;return emit('cancel');},
    undo(){if(transaction)throw Error('Finish or cancel the current risk edit first.');if(!undoStack.length)return getDraft();redoStack.push(getDraft());draft=undoStack.pop();return emit('undo');},
    redo(){if(transaction)throw Error('Finish or cancel the current risk edit first.');if(!redoStack.length)return getDraft();undoStack.push(getDraft());draft=redoStack.pop();return emit('redo');},
    reset(){return mutate('reset',()=>{const baseReviewRevision=draft.baseReviewRevision;draft={...freshDraft(),baseReviewRevision};});},
    setBaseReviewRevision(revision){
      if(revision!==null&&(!Number.isInteger(revision)||revision<1))throw Error('Invalid risk review version.');
      // Server acknowledgement is not an editable geometry action. Undo/Cancel
      // must never resurrect an older optimistic-concurrency base revision.
      draft.baseReviewRevision=revision;for(const saved of [...undoStack,...redoStack])saved.baseReviewRevision=revision;if(transaction)transaction.baseReviewRevision=revision;
      return emit('review-version');
    }
  };
  return api;
}
