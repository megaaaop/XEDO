import './planning-risk.css';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import Collection from 'ol/Collection.js';
import Draw from 'ol/interaction/Draw.js';
import Modify from 'ol/interaction/Modify.js';
import Translate from 'ol/interaction/Translate.js';
import {Style,Stroke,Fill,Circle as CircleStyle} from 'ol/style.js';
import {unByKey} from 'ol/Observable.js';
import {createRiskState} from './planning-risk-state.js';
import {validateRiskTarget,coversGeometry,geometryEquals} from './planning-risk-geometry.js';

const RESULT='XEDO_SAR_20261011T130518Z_6152a5';
const copy=value=>structuredClone(value);
const shape=area=>({type:'Polygon',coordinates:copy(area.rings)});
const draftKey=draft=>JSON.stringify({...draft,baseReviewRevision:null});
const style=(color,fill)=>new Style({stroke:new Stroke({color,width:2}),fill:new Fill({color:fill}),image:new CircleStyle({radius:5,fill:new Fill({color})})});

/** Risk edits own separate vector sources. They never change the image/search AOI. */
export function initializeRiskEditor({map,inspector,getContext,useArea,onDraft,onTarget,verifyTargetPixels,prepareEdit}){
  const panel=document.createElement('section');panel.className='risk-panel';panel.setAttribute('aria-labelledby','risk-title');
  panel.innerHTML=`<div class="risk-heading"><h3 id="risk-title">AI risk areas</h3><button id="risk-load" class="button secondary" type="button">Open prepared AI area</button></div>
    <p id="risk-status" role="status" aria-live="polite">Open a prepared SAR result, then review and choose the area to inspect.</p>
    <div id="risk-content" hidden><p id="risk-source" class="muted"></p><div class="risk-layers"><label><input id="risk-raw" type="checkbox" checked> Show AI candidates</label><label><input id="risk-coverage" type="checkbox"> Show data coverage</label></div>
    <div class="risk-lists"><label>AI candidates<select id="risk-candidates" size="4" aria-label="AI candidates"></select></label><label>Inspector areas<select id="risk-areas" size="4" aria-label="Inspector areas"></select></label></div>
    <div class="risk-actions"><button id="risk-accept" type="button" class="button secondary">Use candidate</button><button id="risk-reject" type="button" class="button quiet">Reject candidate</button><button id="risk-edit" type="button" class="button secondary">Edit boundary</button><button id="risk-move" type="button" class="button secondary">Move area</button><button id="risk-add" type="button" class="button secondary">Draw inspection area</button></div>
    <div class="risk-actions"><button id="risk-finish" type="button" class="button secondary" hidden>Finish edit</button><button id="risk-cancel" type="button" class="button quiet" hidden>Cancel edit</button><button id="risk-undo" type="button" class="button quiet">Undo</button><button id="risk-redo" type="button" class="button quiet">Redo</button><button id="risk-reset" type="button" class="button quiet">Reset draft</button></div>
    <details><summary>Import an inspection boundary</summary><label class="risk-geometry-label">Selected inspection boundary (GeoJSON)<textarea id="risk-geometry" rows="3" spellcheck="false"></textarea></label><button id="risk-apply" type="button" class="button quiet">Apply boundary</button></details>
    <p id="risk-target-status" role="status"></p><button id="risk-confirm" type="button" class="button primary">Confirm inspection area</button></div>`;
  document.querySelector('.trial-map-panel').append(panel);
  const $=id=>panel.querySelector('#'+id),format=new GeoJSON(),raw=new VectorSource(),drafts=new VectorSource(),coverage=new VectorSource();
  const styles={raw:style('#edb977','#edb97718'),draft:style('#49d3d0','#49d3d028'),selected:style('#c0fc8e','#c0fc8e30'),coverage:style('#889cb6','#889cb60c')};
  const rawLayer=new VectorLayer({source:raw,style:styles.raw}),draftLayer=new VectorLayer({source:drafts,style:f=>f.get('selected')?styles.selected:styles.draft}),coverageLayer=new VectorLayer({source:coverage,style:styles.coverage,visible:false});
  rawLayer.setZIndex(22);coverageLayer.setZIndex(21);draftLayer.setZIndex(24);map.addLayer(coverageLayer);map.addLayer(rawLayer);map.addLayer(draftLayer);
  let analysis=null,state=null,confirmed=null,baseline=null,busy=false,epoch=0,interaction=null,editMode=null,keys=[],silent=false,restorePending=false;
  const message=(text,error=false)=>{$('risk-status').textContent=text;$('risk-status').dataset.error=String(error);};
  const readFeature=f=>format.writeGeometryObject(f.getGeometry(),{featureProjection:'EPSG:3857',dataProjection:'EPSG:4326'});
  const addFeature=(source,geometry,props={})=>{const f=format.readFeature({type:'Feature',geometry,properties:props},{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'});source.addFeature(f);return f;};
  function stop(){if(interaction)map.removeInteraction(interaction);interaction=null;for(const key of keys)unByKey(key);keys=[];editMode=null;}
  function blocked(){return restorePending||!!analysis&&(!confirmed||state?.snapshot().editing||draftKey(state.getDraft())!==baseline);}
  function render(){
    $('risk-content').hidden=!state;panel.setAttribute('aria-busy',String(busy));$('risk-load').disabled=busy;
    if(!state)return;
    const s=state.snapshot(),selected=state.getSelected();if(!interaction){drafts.clear();for(const area of s.draft.areas)addFeature(drafts,shape(area),{areaId:area.id,selected:area.id===s.draft.selectedAreaId});}
    const value=s.draft.selectedAreaId;$('risk-areas').replaceChildren();for(const [i,area] of s.draft.areas.entries())$('risk-areas').append(new Option((i+1)+'. '+area.origin.replaceAll('_',' '),area.id));$('risk-areas').value=value||'';
    for(const b of panel.querySelectorAll('button'))b.disabled=busy;
    for(const id of ['risk-edit','risk-move','risk-apply'])$(id).disabled=busy||!selected||s.editing;
    for(const id of ['risk-accept','risk-reject','risk-add','risk-reset','risk-candidates','risk-areas'])$(id).disabled=busy||s.editing;
    $('risk-undo').disabled=busy||s.editing||!s.canUndo;$('risk-redo').disabled=busy||s.editing||!s.canRedo;
    $('risk-finish').hidden=!s.editing;$('risk-cancel').hidden=!s.editing;
    $('risk-geometry').disabled=busy||s.editing||!selected;$('risk-geometry').value=selected?JSON.stringify(selected.geometry):'';
    let text=selected?'Review this inspection boundary, then confirm it.':'Choose a candidate or draw an inspection area.';
    let valid=false;try{if(selected){validateRiskTarget(selected.geometry);valid=true;}}catch(e){text=e.message+' Draw a new inspection boundary while retaining the original AI candidate.';}
    if(s.editing)text=editMode==='draw'?'Click each corner on the map, then double-click to finish. Cancel keeps the previous draft.':'Drag the boundary or its points, then choose Finish edit or Cancel edit.';
    else if(!blocked())text='Confirmed review v'+confirmed.reviewRevision+' · '+confirmed.target.origin.replaceAll('_',' ')+' · '+(confirmed.coverageState||'Coverage recorded');
    $('risk-target-status').textContent=text;$('risk-confirm').disabled=busy||s.editing||!valid;
    $('risk-confirm').textContent=busy?'Working…':'Confirm inspection area';
  }
  function changed(){render();if(!silent)onDraft?.();}
  function install(data,draft=null,envelope={}){
    if(!data?.analysisRef||!Array.isArray(data.candidates?.features)||data.candidates.features.length>256)throw Error('The AI result is invalid. Your current mission is kept.');
    const next=createRiskState({analysis:data,onChange:()=>{if(state===next)changed();}});if(draft)next.restore(draft);
    silent=true;stop();analysis=copy(data);state=next;confirmed=copy(envelope.confirmedReview||null);state.setBaseReviewRevision(envelope.latestReviewRevision??confirmed?.reviewRevision??draft?.baseReviewRevision??null);baseline=confirmed?draftKey(state.getDraft()):null;
    raw.clear();coverage.clear();for(const f of analysis.candidates.features)addFeature(raw,f.geometry,{candidateId:f.properties?.candidateId||f.id});for(const f of analysis.coverage.features)addFeature(coverage,f.geometry);
    $('risk-candidates').replaceChildren();for(const f of analysis.candidates.features){const id=f.properties?.candidateId||f.id,n=f.geometry.coordinates[0].length-1;$('risk-candidates').append(new Option(id+' · '+n+' points',id));}$('risk-candidates').value=analysis.candidates.features[0]?.id||'';
    $('risk-source').textContent='SAR acquisition: '+analysis.acquiredAt+' · Analysis: '+analysis.inferredAt+' · '+analysis.candidates.features.length+' candidates · '+(analysis.model?.architecture||'SAR model')+' · Checkpoint '+(analysis.model?.checkpointSha256?.slice(0,12)||'unavailable')+' · Threshold '+(analysis.threshold?.value??analysis.threshold??'unknown')+'. Context imagery has its own date. Model scores are uncalibrated; areas require Inspector review.';
    restorePending=false;silent=false;render();
  }
  async function action(label,run){if(busy)return;busy=true;message(label);render();const token=epoch;try{await run();if(token!==epoch)return;}catch(e){if(token===epoch)message(e.message,true);}finally{if(token===epoch){busy=false;render();}}}
  const attempt=run=>()=>{try{run();}catch(e){message(e.message,true);}};
  $('risk-load').onclick=()=>action('Loading prepared AI result…',async()=>{if(analysis?.resultId===RESULT){message('This AI result is already open. Your Inspector draft is kept.');return;}const token=epoch,data=await inspector()?.analysisRequest('analyses/'+RESULT);if(token!==epoch)return;if(!data)throw Error('Inspector accounts are available on the hosted website.');const current=getContext(),same=geometryEquals(current.geometry,data.searchGeometry);if(current.geometry&&!same&&!await inspector().confirmChange('Open the prepared SAR area and replace the current inspection boundary?','Open prepared area')){message('Opening cancelled. Your current area is kept.');return;}if(token!==epoch)return;if(!same)useArea(data.searchGeometry);install(data);message('AI result loaded. Review a covering context image and choose the area to inspect.');onDraft?.();});
  $('risk-candidates').onchange=()=>{const id=$('risk-candidates').value,f=raw.getFeatures().find(f=>f.get('candidateId')===id);if(f)map.getView().fit(f.getGeometry().getExtent(),{padding:[60,60,60,60],maxZoom:16,duration:200});};
  $('risk-areas').onchange=attempt(()=>state.setSelected($('risk-areas').value));
  $('risk-accept').onclick=attempt(()=>{state.accept($('risk-candidates').value);$('risk-candidates').onchange();message('Candidate copied into your Inspector draft.');});
  $('risk-reject').onclick=attempt(()=>{state.reject($('risk-candidates').value);message('Candidate rejected in your review. The original AI result is retained.');});
  $('risk-undo').onclick=attempt(()=>state.undo());$('risk-redo').onclick=attempt(()=>state.redo());
  $('risk-reset').onclick=()=>action('Reviewing reset…',async()=>{if(await inspector().confirmChange('Discard all risk draft changes and decisions for this result?','Reset risk draft')){state.reset();message('Risk draft reset. Original AI candidates retained.');}});
  $('risk-apply').onclick=attempt(()=>{const g=JSON.parse($('risk-geometry').value);state.update(state.getSelected().id,g);message('Boundary applied to the draft. Confirm it before planning.');});
  function edit(mode){
    if(busy||!state||interaction)return;if(getContext().working)throw Error('Wait for the current mission request to finish.');
    const selected=state.getSelected();if(mode!=='draw'&&!selected)throw Error('Choose an Inspector area first.');
    prepareEdit?.();document.querySelector('#trial-2d').click();state.begin();editMode=mode;
    if(selected&&mode!=='draw')map.getView().fit(format.readGeometry(selected.geometry,{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}).getExtent(),{padding:[65,65,65,65],maxZoom:19});
    if(mode==='draw'){
      interaction=new Draw({source:new VectorSource(),type:'Polygon',maxPoints:120});keys.push(interaction.on('drawend',event=>{try{state.add(readFeature(event.feature));stop();state.commit();message('Inspection area drawn. Review and confirm the boundary.');}catch(e){stop();state.cancel();message(e.message,true);}}));
    }else{
      const feature=drafts.getFeatures().find(f=>f.get('areaId')===selected.id),features=new Collection([feature]);
      interaction=mode==='move'?new Translate({features}):new Modify({features});keys.push(interaction.on(mode==='move'?'translateend':'modifyend',()=>{try{state.update(selected.id,readFeature(feature));}catch(e){message(e.message,true);}}));
    }
    map.addInteraction(interaction);render();map.getTargetElement().scrollIntoView({block:'center',behavior:'auto'});map.getTargetElement().focus({preventScroll:true});
  }
  $('risk-edit').onclick=attempt(()=>edit('edit'));$('risk-move').onclick=attempt(()=>edit('move'));$('risk-add').onclick=attempt(()=>edit('draw'));
  $('risk-finish').onclick=attempt(()=>{if(editMode==='draw')throw Error('Double-click the last corner to finish drawing, or cancel.');stop();state.commit();message('Edit completed. Confirm the inspection boundary.');});
  $('risk-cancel').onclick=attempt(()=>{stop();state.cancel();message('Edit cancelled. The previous draft is restored.');});
  $('risk-confirm').onclick=()=>action('Confirming inspection area…',async()=>{
    const selected=state.getSelected(),context=getContext();validateRiskTarget(selected.geometry);
    if(!context.imageReady)throw Error('Load and review a covering satellite image before confirming this area. Your draft is kept.');
    if(!coversGeometry(context.imageGeometry,selected.geometry))throw Error('The boundary extends beyond the reviewed image. Review imagery covering the whole inspection area.');
    const token=epoch,key=draftKey(state.getDraft());await verifyTargetPixels(selected.geometry);if(token!==epoch||key!==draftKey(state.getDraft()))return;
    const receipt=await inspector().confirmRisk({baseReviewRevision:state.getDraft().baseReviewRevision,target:{origin:selected.origin,areaId:selected.id,sourceCandidateIds:selected.sourceCandidateIds,geometry:selected.geometry}});
    if(token!==epoch||!state||key!==draftKey(state.getDraft()))return;
    if(context.imageKey!==getContext().imageKey){message('The image changed during confirmation. Your saved review is retained; review the current image before planning.',true);return;}
    if(!acceptReceipt(receipt))throw Error('An earlier risk draft was saved. Your current edits are kept; confirm the current inspection area again.');message('Inspection area confirmed and saved. Prepare the drone mission to calculate its route.');
  });
  function acceptReceipt(receipt){if(!analysis)return false;if(!receipt?.confirmedReview){silent=true;confirmed=null;baseline=null;state.setBaseReviewRevision(receipt?.latestReviewRevision??null);silent=false;render();return false;}const r=receipt.confirmedReview,s=state.getSelected();if(!s||!geometryEquals(s.geometry,r.target.geometry)||JSON.stringify(r.analysisRef)!==JSON.stringify(analysis.analysisRef))return false;const same=confirmed?.reviewId===r.reviewId;silent=true;confirmed=copy(r);state.setBaseReviewRevision(r.reviewRevision);baseline=draftKey(state.getDraft());silent=false;render();message('Inspection area confirmed and saved as review v'+r.reviewRevision+'.');if(!same)onTarget?.(copy(r));return true;}
  $('risk-raw').onchange=()=>rawLayer.setVisible($('risk-raw').checked);$('risk-coverage').onchange=()=>coverageLayer.setVisible($('risk-coverage').checked);
  const escape=event=>{if(event.key==='Escape'&&interaction){event.preventDefault();stop();state.cancel();message('Risk edit cancelled.');}};map.getTargetElement().addEventListener('keydown',escape);
  return {
    blocked,hasAnalysis:()=>!!analysis||restorePending,target:()=>!blocked()?copy(confirmed?.target.geometry||null):null,
    capture:()=>({analysisRef:copy(analysis?.analysisRef||null),riskDraft:state?.getDraft()||null}),
    backup:()=>analysis?{analysis:copy(analysis),draft:state.getDraft(),confirmedReview:copy(confirmed),latestReviewRevision:state.getDraft().baseReviewRevision}:null,
    restoreBackup(value){if(value)install(value.analysis,value.draft,value);else this.reset();},
    acceptReceipt,reset(){epoch++;busy=false;stop();analysis=null;state=null;confirmed=null;baseline=null;restorePending=false;raw.clear();drafts.clear();coverage.clear();message('Open a prepared SAR result, then review and choose the area to inspect.');render();},
    saved(receipt,{current}){if(!analysis)return;silent=true;state.setBaseReviewRevision(receipt.latestReviewRevision??receipt.confirmedReview?.reviewRevision??null);silent=false;if(current)acceptReceipt(receipt);else{confirmed=null;baseline=null;render();}},
    cancelEdit(){if(state?.snapshot().editing){stop();state.cancel();}},editing:()=>!!state?.snapshot().editing,
    validateRestore(doc,data){if(!doc.analysisRef)return;if(!data?.analysis||JSON.stringify(data.analysis.analysisRef)!==JSON.stringify(doc.analysisRef))throw Error('The saved AI source does not match its original hashes. Your current mission is kept.');const check=createRiskState({analysis:data.analysis});check.restore(doc.riskDraft);},
    restore(doc,data){if(!doc.analysisRef){this.reset();return;}install(data.analysis,doc.riskDraft,data);message('Saved AI review restored. Reload context imagery and review flight readiness.');},
    dispose(){stop();map.getTargetElement().removeEventListener('keydown',escape);map.removeLayer(rawLayer);map.removeLayer(draftLayer);map.removeLayer(coverageLayer);panel.remove();}
  };
}
