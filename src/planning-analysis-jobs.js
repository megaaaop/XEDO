// Browser coordination only. Ownership, frozen inputs, queue and worker leases
// are enforced by the database, including direct RPC requests.
const terminal=status=>['succeeded','failed','cancelled'].includes(status);
const copy=value=>structuredClone(value);
const stageLabel={queued:'Waiting for the local processor',searching:'Searching Sentinel-1 images',downloading:'Downloading SAR data',validating_input:'Checking the downloaded data',loading_model:'Loading the AI model',inferencing:'Analyzing the area',packaging:'Preparing editable risk areas',publishing:'Saving your private result'};
const failureLabel={worker_timeout:'The processor did not finish before the deadline',worker_cancelled:'The analysis was cancelled',lease_lost:'The processor connection expired',pipeline_error:'The local analysis could not finish',result_invalid:'The returned result failed validation',gee_unavailable:'GEE data could not be reached',result_too_complex:'The result has too many boundaries; use a smaller area',input_invalid:'No usable SAR input was available for this area and period'};
export function createAnalysisJobs({inspector,getContext,openResult,onChange=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,isVisible=()=>true,idFactory=()=>crypto.randomUUID()}={}){
  let disposed=false,timer=null,epoch=0,busy=false,fetching=false,job=null,jobs=[],worker=null,message='Open the local AI worker, then analyze the selected area.',error=false,guard=null,pending=null,loadedResult=null,account=null;
  const identity=()=>inspector()?.accountId?.()||null;
  const current=()=>({account:identity(),context:inspector()?.contextKey?.(),geometry:JSON.stringify(getContext().geometry)});
  const matches=g=>g&&JSON.stringify(current())===JSON.stringify(g);
  const snapshot=()=>({busy:busy||fetching,job:copy(job),jobs:copy(jobs),worker:copy(worker),message,error,signedIn:!!inspector()?.isSignedIn?.()});
  const paint=()=>{if(!disposed){adoptAccount();onChange(snapshot());}};
  function schedule(delay=4000){if(timer)clearTimer(timer);if(!disposed)timer=setTimer(()=>poll(),delay);}
  function adoptAccount(){const next=identity();if(next!==account){epoch++;account=next;busy=false;fetching=false;job=null;jobs=[];worker=null;guard=null;pending=null;loadedResult=null;message=next?'Check the local processor before analyzing.':'Sign in to analyze an area and reopen your results.';error=false;}}
  function valid(token){adoptAccount();return token===epoch&&!disposed;}
  async function request(path,options){return inspector().analysisRequest(path,options);}
  async function refresh({passive=false}={}){
    adoptAccount();if(!inspector()?.isSignedIn?.()){paint();return;}if(busy||fetching)return;
    fetching=true;paint();
    const token=epoch;
    try{
      const presence=await request('analysis-worker');if(!valid(token))return;worker=presence;
      const data=await request('analysis-jobs');if(!valid(token))return;jobs=Array.isArray(data)?data:data.jobs||[];
      if(!job||terminal(job.status)){const active=jobs.find(j=>!terminal(j.status));if(active){job=active;guard=null;}}
      if(!passive||!error&&(!job||!terminal(job.status))){error=false;message=job&&!terminal(job.status)?'Analysis is in progress. You can keep working on this page.':worker.online?'Local processor ready.':'Local processor offline. Open the AI worker on your computer.';}
    }catch(e){if(valid(token)){message=e.message;error=true;}}
    finally{if(valid(token))fetching=false;paint();schedule(job&&!terminal(job.status)?4000:30000);}
  }
  async function poll(){
    timer=null;adoptAccount();
    if(disposed)return;
    if(!inspector()?.isSignedIn?.()||!isVisible()){paint();schedule(15000);return;}
    if(busy||fetching){schedule(1000);return;}
    if(!job||terminal(job.status)){await refresh({passive:true});return;}
    fetching=true;paint();
    const token=epoch,id=job.jobId;
    try{
      const data=await request('analysis-jobs/'+id);if(!valid(token))return;job=data.job||data;
      if(typeof job.workerOnline==='boolean')worker={online:job.workerOnline,lastSeenAt:job.workerLastSeenAt};
      const at=jobs.findIndex(j=>j.jobId===id);if(at>=0)jobs[at]=copy(job);else jobs.unshift(copy(job));
      error=false;
      if(job.status==='succeeded'){
        message='Analysis complete. Open the result to review and choose the inspection area.';
        if(job.resultId&&job.resultId!==loadedResult&&matches(guard)){
          // Set before awaiting the editor: a response can be retried safely.
          loadedResult=job.resultId;
          const opened=await openResult(job.resultId,{automatic:true,guard:copy(guard)});if(!valid(token))return;
          if(opened)message='New AI result loaded. Review and edit the inspection area.';
          else message='The result is saved in your analyses. Open it when you are ready.';
        }
      }else if(job.status==='failed'){message='Analysis stopped: '+(failureLabel[job.errorCode]||job.errorCode||'processing failed')+'. Your mission draft is kept.';error=true;}
      else if(job.status==='cancelled')message='Analysis cancelled. Your mission draft is kept.';
      else if(job.cancelRequested)message='Cancellation requested. Waiting for the processor to stop.';
      else if(job.workerOnline===false)message='Local processor offline. Your job and draft are kept. Reopen the AI worker to resume before the deadline.';
      else if(job.leaseExpiresAt&&Date.parse(job.leaseExpiresAt)<Date.now())message='Processor connection interrupted. Waiting to resume this job before its deadline.';
      else message=(stageLabel[job.stage]||String(job.stage||job.status).replaceAll('_',' '))+(job.totalTiles?' · '+job.processedTiles+'/'+job.totalTiles+' tiles':'');
    }catch(e){if(valid(token)){message=e.message;error=true;}}
    finally{if(valid(token))fetching=false;paint();schedule(job&&terminal(job.status)?30000:4000);}
  }
  async function analyze(){
    adoptAccount();if(busy||fetching||job&&!terminal(job.status))return;
    if(!getContext().geometry){message='Draw an inspection area before analyzing.';error=true;paint();return;}
    busy=true;error=false;message='Checking the local processor…';paint();const token=epoch;
    try{
      // This explicit action may open Login; passive polling never does.
      const presence=await request('analysis-worker');if(!valid(token))return;worker=presence;
      if(!worker.online)throw Error('Local processor offline. Open the AI worker on your computer, then try again.');
      if(!pending||!matches(pending.guard)){
        if(!await inspector().confirmChange('Save this area and analyze a new SAR acquisition? Your current AI review is kept until you open the new result.','Analyze area'))return;
        const originalGeometry=JSON.stringify(getContext().geometry);
        const saved=await inspector().prepareAnalysis();
        if(!valid(token))return;
        if(originalGeometry!==JSON.stringify(getContext().geometry))throw Error('The area changed while saving. Analyze the current area again.');
        pending={guard:current(),body:JSON.stringify({missionId:saved.missionId,expectedRevision:saved.expectedRevision,mutationId:idFactory()})};
      }
      guard=copy(pending.guard);message='Queuing analysis…';paint();
      const response=await request('analysis-jobs',{method:'POST',body:pending.body});
      if(!valid(token))return;job=response.job||response;pending=null;loadedResult=null;message='Analysis queued. The local processor will pick it up.';jobs.unshift(copy(job));schedule(100);
    }catch(e){if(valid(token)){if(e.status&&e.status<500)pending=null;message=e.message;error=true;}}
    finally{if(valid(token))busy=false;paint();}
  }
  async function cancel(){
    if(busy||fetching||!job||terminal(job.status))return;
    busy=true;message='Requesting cancellation…';paint();const token=epoch;
    try{const data=await request('analysis-jobs/'+job.jobId+'/cancel',{method:'POST',body:'{}'});if(valid(token)){job=data.job||data;message=job.status==='cancelled'?'Analysis cancelled.':'Cancellation requested. Waiting for the processor to stop.';schedule(100);}}
    catch(e){if(valid(token)){message=e.message;error=true;}}finally{if(valid(token))busy=false;paint();}
  }
  async function open(resultId){
    if(busy||fetching)return;busy=true;paint();const token=epoch;
    try{await openResult(resultId,{automatic:false});}catch(e){if(valid(token)){message=e.message;error=true;}}finally{if(valid(token))busy=false;paint();}
  }
  paint();schedule(1000);
  return {analyze,cancel,refresh,open,snapshot,poll,syncContext(){paint();},dispose(){disposed=true;epoch++;if(timer)clearTimer(timer);}};
}
