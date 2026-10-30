"""Explicit, bounded real API protocol qualification after qualify-real-ai.py.

Default invocation performs zero network/session reads. --run-real
uses existing user-connected DPAPI sessions; never provisions, deletes, revokes,
changes SQL/registry, downloads GEE pixels, runs inference, or deploys anything.
The producer analysis is a labelled protocol replay of a prior actual run.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime,timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import time
import uuid

DEFAULT_ROOT=Path('C:/mega/codex/iENA/github-publish/XEDO-hardware-release')
MAX_NEW_JOBS=2

def load_module(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec);sys.modules[name]=module;spec.loader.exec_module(module);return module

class PostRunner:
    def __init__(self,q,context,previous,quiet_seconds):
        self.q,self.c,self.previous,self.quiet_seconds=q,context,previous,quiet_seconds
        self.created=[];self.binding=None;self.pending_create=None;self.pending_publish=None
        self.private_state=context.work/'post-run-checkpoint.json'
        context.report_file=context.output/('post-run-'+context.run_id+'.json')
        context.report.update(schemaVersion='xedo-post-run-protocol-qualification/1',mode='protocol_replay_not_new_inference',
          parentQualificationRunId=previous['runId'],stage='preflight',createdJobs=[],logicalJobsCreated=0,
          maxLogicalJobs=MAX_NEW_JOBS,noFreshInference=True,noGEERequests=True,sqlOrAccountChangesByRunner=False,
          sessionsRevoked=False,destructiveDeletes=False,pushDeploy=False,cases=[])
        context.report['helperSourceSha256']=hashlib.sha256(Path(q.__file__).read_bytes()).hexdigest()
        context.report['postRunnerSourceSha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
        self.report=context.report
    def emit(self,stage,**metadata):
        self.report['stage']=stage;self.report['updatedAt']=self.q.stamp();self.c.checkpoint()
        self.q.write_json(self.private_state,{'schemaVersion':'xedo-post-run-checkpoint/1','stage':stage,'startedAt':self.report['startedAt'],
          'updatedAt':self.report['updatedAt'],'runId':self.c.run_id,'createdJobs':self.created,'activeBinding':self.binding,
          'pendingCreate':self.pending_create,'pendingPublish':self.pending_publish,
          'protocolReplayPath':str(self.analysis_path)if hasattr(self,'analysis_path')else None,
          'protocolReplaySha256':self.report.get('protocolReplay',{}).get('sha256')})
        print(json.dumps({'stage':stage,'at':self.report['updatedAt'],**metadata}),flush=True)
    def check(self,name):self.c.check(name)
    def require(self,condition,code):self.q.require(condition,code)
    def prepare(self):
        self.emit('preflight');self.c.preflight();self.report['status']='running'
        self.require(self.previous.get('status')=='passed'and self.previous.get('realSupabase')is True and self.previous.get('projectRef')=='tstmjnlhwidwtzetqxbu','PASSED_REAL_QUALIFICATION_REQUIRED')
        case=next((x for x in self.previous.get('cases',[])if x.get('name')=='historical-positive'and x.get('status')=='passed'),None)
        self.require(case is not None and case.get('result',{}).get('candidateCount')==14,'HISTORICAL_CASE_REQUIRED')
        self.original=case;self.result_id=case['result']['resultId'];self.original_mission=case['missionId']
        self.require(self.previous.get('actorIds',{}).get('primary')==self.c.a.uid and self.previous.get('actorIds',{}).get('machine')==self.c.machine.uid,'PARENT_ACTORS_MISMATCH')
        parent_run=self.previous['runId'];self.require(re.fullmatch(r'\d{8}T\d{6}Z_[a-f0-9]{8}',parent_run)is not None,'PARENT_RUN_ID_INVALID')
        old_job=self.c.a.bff(self.c.transport,'analysis-jobs/'+case['jobId'])
        self.require(old_job.get('status')=='succeeded'and old_job.get('resultId')==self.result_id,'PARENT_JOB_NOT_SUCCEEDED')
        self.dates={key:old_job[key]for key in ('start','end')}
        owned=self.c.a.bff(self.c.transport,'analyses/'+self.result_id)
        self.require(owned.get('analysisRef')==case['result']['analysisRef'],'PARENT_RESULT_REF_MISMATCH')
        attempt_id=self.q.safe_uuid(case['concurrentClaim']['attemptId']);job_id=self.q.safe_uuid(case['jobId'])
        attempt=self.c.folder/'qualification-runs'/parent_run/'cpu'/job_id/attempt_id
        paths=list(attempt.glob('pipeline/*/model-outputs/*/analysis.local.json'))
        self.require(len(paths)==1,'EXACT_PRODUCER_ANALYSIS_REQUIRED');self.analysis_path=paths[0].resolve()
        self.require(self.analysis_path.is_relative_to(attempt.resolve())and self.analysis_path.stat().st_size<=524288,'PRODUCER_ANALYSIS_PATH_INVALID')
        raw=self.analysis_path.read_bytes();self.analysis=json.loads(raw)
        self.require(self.analysis.get('schemaVersion')=='xedo-local-analysis/1'and self.analysis.get('kind')=='local_sar','PRODUCER_SCHEMA_INVALID')
        self.require(self.analysis.get('resultId')==owned.get('manifest',{}).get('producerRunId'),'PRODUCER_RUN_MISMATCH')
        self.require(self.analysis.get('searchGeometry')==old_job.get('geometry')and self.analysis.get('acquiredAt')==owned.get('acquiredAt'),'PRODUCER_SOURCE_MISMATCH')
        self.report['protocolReplay']={'label':'Prior actual producer result replayed for API protocol tests only; no new GEE/inference',
          'parentJobId':job_id,'parentResultId':self.result_id,'producerRunId':self.analysis['resultId'],'sha256':hashlib.sha256(raw).hexdigest(),
          'acquiredAt':self.analysis['acquiredAt'],'candidateCount':len(self.analysis['candidates']['features'])}
        doc=deepcopy(json.loads((self.c.root/'contracts/examples/inspector-save-draft.json').read_text())['document'])
        geometry=deepcopy(old_job['geometry'])
        doc.update(title='QA Phase6 Postrunner '+self.c.run_id,inputMode='mission',searchGeometry=geometry,imageSelection=None,
          analysisRef=owned['analysisRef'],riskDraft={'baseReviewRevision':None,'decisions':[],'areas':[],'selectedAreaId':None},
          planningInputs={'geometry':geometry,'driftEnabled':False})
        self.saved=self.c.save(doc);self.document=doc;self.report['qaMissionId']=self.saved['missionId'];self.report['inputRevision']=self.saved['revision']
        self.emit('qa_mission_saved')
        # Attempt only a new secondary-owned draft; no existing mission is touched.
        denied=deepcopy(doc);denied['title']='QA denied foreign result '+self.c.run_id
        payload={'schemaVersion':'xedo-inspector-save/1','intent':'save_draft','missionId':None,'expectedRevision':0,'mutationId':str(uuid.uuid4()),'document':denied}
        self.c.b.bff(self.c.transport,'missions',body=payload,expected=(422,))
        self.check('Secondary cannot save a primary-owned analysisRef through the real BFF/authoritative resolver')
    def new_job(self):
        self.require(len(self.created)<MAX_NEW_JOBS,'POST_RUN_JOB_LIMIT')
        body={'missionId':self.saved['missionId'],'expectedRevision':self.saved['revision'],'mutationId':str(uuid.uuid4()),**self.dates}
        self.pending_create=deepcopy(body);self.emit('creating_qa_job')
        job=self.c.a.bff(self.c.transport,'analysis-jobs',body=body,expected=(202,));jid=self.q.safe_uuid(job['jobId'])
        self.created.append(jid);self.pending_create=None
        self.report['createdJobs']=list(self.created);self.report['logicalJobsCreated']=len(self.created);self.emit('qa_job_created')
        self.require(job.get('status')=='queued','QA_JOB_NOT_QUEUED');return job
    def claim_job(self,jid):
        claim=self.c.remote.validate_claim(self.c.machine.client.rpc('claim',{}))
        self.require(claim is not None and claim.get('jobId')==jid,'CLAIM_WRONG_QA_JOB')
        self.binding={key:claim[key]for key in ('jobId','attemptId','fence')};self.emit('qa_job_claimed');return claim
    def owned_for_job(self,jid):
        return [x for x in self.c.a.bff(self.c.transport,'analyses').get('analyses',[])if x.get('manifest',{}).get('jobId')==jid]
    def race(self):
        self.emit('cancel_publish_race_preparing');job=self.new_job();jid=job['jobId']
        self.c.b.bff(self.c.transport,'analysis-jobs/'+jid+'/cancel',body={},expected=(404,))
        self.c.transport.rpc(self.c.b.access(),'xedo_inspector','cancel_job',{'jobId':jid},expected=(404,))
        self.require(self.c.a.bff(self.c.transport,'analysis-jobs/'+jid).get('status')=='queued','CROSS_OWNER_CANCEL_CHANGED_JOB')
        self.check('Secondary cannot cancel the primary QA job through BFF or direct PostgREST')
        self.claim_job(jid);payload={**self.binding,'mutationId':str(uuid.uuid4()),'analysis':self.analysis}
        self.pending_publish={'jobId':jid,'attemptId':self.binding['attemptId'],'fence':self.binding['fence'],'mutationId':payload['mutationId']}
        self.emit('cancel_publish_race')
        machine_access=self.c.machine.access();self.c.a.access()
        def cancel():return self.c.a.bff(self.c.transport,'analysis-jobs/'+jid+'/cancel',body={})
        def publish():return self.c.transport.rpc(machine_access,'xedo_local_worker','publish',payload,expected=(200,409))
        with ThreadPoolExecutor(max_workers=2)as pool:
            cf=pool.submit(cancel);pf=pool.submit(publish);cancelled=cf.result();published,status=pf.result()
        final=self.c.a.bff(self.c.transport,'analysis-jobs/'+jid)
        observation={'name':'cross_session_cancel_publish','jobId':jid,'publishHttpStatus':status,'cancelResponseStatus':cancelled.get('status'),'status':'passed'}
        if status==200:
            self.require(published.get('status')=='succeeded'and published.get('jobId')==jid and final.get('status')=='succeeded'and final.get('resultId')==published.get('resultId'),'PUBLISH_WIN_INVALID')
            self.require(cancelled.get('status')=='succeeded','CANCEL_AND_PUBLISH_BOTH_WON')
            again,_=self.c.transport.rpc(machine_access,'xedo_local_worker','publish',payload)
            self.require(self.q.stable(again)==self.q.stable(published),'PUBLISH_RETRY_RECEIPT_CHANGED')
            self.require(len(self.owned_for_job(jid))==1,'PUBLISH_WIN_RESULT_COUNT')
            observation.update(winner='publish',resultId=published['resultId'],identicalPublishRetry=True)
        else:
            code=self.q.safe_code(published.get('message'))
            self.require(code in ('CANCEL_REQUESTED','LEASE_LOST')and final.get('cancelRequested')is True and final.get('resultId')is None,'CANCEL_WIN_INVALID')
            if final.get('status')=='running':self.c.machine.client.rpc('fail',{**self.binding,'errorCode':'worker_cancelled','errorMessage':'QA cancellation protocol complete.'})
            final=self.c.a.bff(self.c.transport,'analysis-jobs/'+jid)
            self.require(final.get('status')=='cancelled'and final.get('resultId')is None and len(self.owned_for_job(jid))==0,'CANCEL_WIN_RESULT_CREATED')
            observation.update(winner='cancel',rejectionCode=code)
        self.report['cases'].append(observation);self.pending_publish=None;self.binding=None;self.emit('cancel_publish_race_complete')
        self.check('One cross-session cancel/publish interleaving has one lawful terminal outcome; no duplicated owned result')
    def quiet_and_fence(self):
        job=self.new_job();jid=job['jobId'];first=self.claim_job(jid);old=deepcopy(self.binding)
        self.report['quietWindow']={'startedAt':self.q.stamp(),'seconds':self.quiet_seconds,'reason':'No machine RPC: natural lease and presence expiry; Inspector read-only/browser acceptance may proceed','leaseExpiresAt':first.get('leaseExpiresAt')}
        self.emit('quiet_window_started',quietSeconds=self.quiet_seconds)
        started=time.monotonic();last_poll=-30
        while time.monotonic()-started<self.quiet_seconds:
            elapsed=time.monotonic()-started
            if elapsed-last_poll>=30:
                # Inspector job polling does not extend worker lease/presence.
                current=self.c.a.bff(self.c.transport,'analysis-jobs/'+jid)
                self.require(current.get('status')=='running'and current.get('cancelRequested')is False,'QUIET_JOB_CHANGED_EXTERNALLY')
                last_poll=elapsed
            self.emit('quiet_window_waiting',elapsedSeconds=round(elapsed),remainingSeconds=max(0,round(self.quiet_seconds-elapsed)))
            time.sleep(min(10,max(.1,self.quiet_seconds-(time.monotonic()-started))))
        self.emit('checking_offline_before_any_machine_rpc')
        presence=self.c.a.bff(self.c.transport,'analysis-worker');self.require(presence.get('online')is False,'MACHINE_NOT_OFFLINE_STOP_OTHER_WORKER_RPC')
        before={j['jobId']for j in self.c.a.bff(self.c.transport,'analysis-jobs').get('jobs',[])}
        blocked={'missionId':self.saved['missionId'],'expectedRevision':self.saved['revision'],'mutationId':str(uuid.uuid4()),**self.dates}
        failure=self.c.a.bff(self.c.transport,'analysis-jobs',body=blocked,expected=(503,))
        self.require(failure.get('code')=='WORKER_OFFLINE','OFFLINE_REJECTION_INVALID')
        after={j['jobId']for j in self.c.a.bff(self.c.transport,'analysis-jobs').get('jobs',[])}
        self.require(before==after,'OFFLINE_SUBMIT_CREATED_A_JOB')
        prior=self.c.a.bff(self.c.transport,'analyses/'+self.result_id)
        history=self.c.a.bff(self.c.transport,'missions/'+self.original_mission+'/history').get('revisions',[])
        self.require(prior.get('analysisRef')==self.original['result']['analysisRef']and any(r.get('revision')==self.original['savedRevision']for r in history),'OFFLINE_RESULT_HISTORY_READBACK_FAILED')
        self.c.b.bff(self.c.transport,'analyses/'+self.result_id,expected=(404,));self.c.b.bff(self.c.transport,'missions/'+self.original_mission+'/history',expected=(404,))
        self.report['cases'].append({'name':'natural_offline_presence','status':'passed','quietSeconds':self.quiet_seconds,'workerOnline':False,'blockedCreateStatus':503,'newJobsFromBlockedCreate':0,'oldOwnedResultAndHistoryReadable':True})
        self.check('Natural worker presence expiry blocks new work without creating a job; prior result/history remain private and readable')
        second=self.claim_job(jid);new=deepcopy(self.binding)
        self.require(second['attemptId']!=first['attemptId']and second['fence']==first['fence']+1,'RECLAIM_FENCE_NOT_INCREMENTED')
        errors=[]
        attempts=[('heartbeat',old),('progress',{**old,'stage':'searching'}),('publish',{**old,'mutationId':str(uuid.uuid4()),'analysis':self.analysis})]
        for action,body in attempts:
            response,status=self.c.transport.rpc(self.c.machine.access(),'xedo_local_worker',action,body,expected=(409,))
            self.require(response.get('message')=='LEASE_LOST','OLD_WRITER_REJECTION_INVALID');errors.append({'action':action,'status':status,'code':'LEASE_LOST'})
        self.c.machine.client.rpc('heartbeat',new)
        current=self.c.a.bff(self.c.transport,'analysis-jobs/'+jid);self.require(current.get('attempt')==2 and current.get('resultId')is None,'RECLAIM_STATE_INVALID')
        self.c.a.bff(self.c.transport,'analysis-jobs/'+jid+'/cancel',body={})
        self.c.machine.client.rpc('fail',{**new,'errorCode':'worker_cancelled','errorMessage':'QA lease fencing protocol complete.'})
        final=self.c.a.bff(self.c.transport,'analysis-jobs/'+jid)
        self.require(final.get('status')=='cancelled'and final.get('resultId')is None and len(self.owned_for_job(jid))==0,'FENCED_JOB_CLEANUP_INVALID')
        self.report['cases'].append({'name':'natural_lease_reclaim_and_fencing','status':'passed','jobId':jid,'firstAttemptId':first['attemptId'],'secondAttemptId':second['attemptId'],'firstFence':first['fence'],'secondFence':second['fence'],'oldWriterRejections':errors,'finalStatus':'cancelled'})
        self.binding=None;self.emit('fencing_complete')
        self.check('Natural expired lease reclaims with a new fence; all old writes fail and only the current attempt can finish cancellation')
    def run(self):
        self.prepare();self.race();self.quiet_and_fence()
        self.report.update(status='passed',completedAt=self.q.stamp(),remainingQualification=['One observed cancel/publish schedule, not statistical stress','No separate machine-session global-claim race','No forced30minute hosted deadline wait','No new acquisition/inference in these protocol replay tests','Browser/mobile/field/100jobsoak remain separate evidence'])
        self.emit('completed',logicalJobsCreated=len(self.created));return self.c.report_file

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-real',action='store_true');parser.add_argument('--qualification-report');parser.add_argument('--root',default=str(DEFAULT_ROOT));parser.add_argument('--quiet-seconds',type=int,default=183)
    args=parser.parse_args()
    if not args.run_real:
        print('{"status":"not_run","code":"RUN_REAL_REQUIRED","networkRequests":0,"protectedSessionReads":0}');return 0
    post=None
    try:
        root=Path(args.root).resolve();q=load_module('xedo_qualification_helpers',root/'scripts/qualify-real-ai.py')
        q.require(181<=args.quiet_seconds<=210,'QUIET_INTERVAL_INVALID')
        q.require(bool(args.qualification_report),'PARENT_QUALIFICATION_REPORT_REQUIRED')
        report_root=(root.parent.parent/'outputs/XEDO_Local_AI_Phase6_2026-10-30').resolve()
        report_path=Path(args.qualification_report).resolve();q.require(report_path.is_relative_to(report_root),'PARENT_REPORT_PATH_INVALID')
        previous=json.loads(report_path.read_text(encoding='utf-8'));q.require(previous.get('status')=='passed','PASSED_PARENT_REQUIRED')
        folder=root/'local-data/live-ai-qualification'
        missing=[r for r in q.ROLES if not(folder/(r+'.session.dpapi')).is_file()or not(folder/(r+'.account.json')).is_file()]
        if missing:print(json.dumps({'status':'pending','code':'CONNECT_THREE_ACCOUNTS_FIRST','missingRoles':missing,'networkRequests':0}));return 0
        public_source=(root/'src/inspector-project.js').read_text()
        fixed=re.search(r'INSPECTOR_PROJECT_URL\s*=\s*[\'\"]([^\'\"]+)[\'\"]',public_source)
        key=re.search(r'INSPECTOR_PUBLISHABLE_KEY\s*=\s*[\'\"](sb_publishable_[A-Za-z0-9_-]+)[\'\"]',public_source)
        q.require(fixed is not None and fixed.group(1)==q.BASE=='https://tstmjnlhwidwtzetqxbu.supabase.co'and key is not None,'PUBLIC_KEY_CONFIGURATION_INVALID')
        sys.path.insert(0,str(root/'workers/local-ai'));import remote_worker as remote;import requests
        context=q.Runner(root,folder,report_root/'qualification',remote,key.group(1),requests)
        post=PostRunner(q,context,previous,args.quiet_seconds);path=post.run()
        print(json.dumps({'status':'passed','report':str(path),'logicalJobsCreated':len(post.created),'newInferenceRuns':0,'productionWebsiteDeployed':False}));return 0
    except KeyboardInterrupt:
        if post:
            post.report.update(status='interrupted',code='OPERATOR_INTERRUPTED');post.emit('interrupted_preserve_checkpoint')
        print('{"status":"interrupted","code":"OPERATOR_INTERRUPTED","message":"Inspect only the recorded QA jobs/checkpoint before retrying. No session was revoked."}');return 130
    except Exception as error:
        code=getattr(error,'code',None);code=code if isinstance(code,str)and re.fullmatch(r'[A-Z0-9_]{1,80}',code)else'POST_RUN_FAILED'
        if post:
            post.report.update(status='failed',code=code,httpStatus=getattr(error,'status',None));post.emit('failed_preserve_checkpoint')
        print(json.dumps({'status':'failed','code':code,'httpStatus':getattr(error,'status',None),'message':'Inspect sanitized checkpoint and recorded QA jobs before retrying. No secrets, SQL or deletion performed.'}));return 2

if __name__=='__main__':sys.exit(main())
