"""Explicit bounded XEDO production API acceptance, never a browser test.

No flag => zero session reads/network. Reuses current qualification Actor's DPAPI
and supported refresh; no passwords, new Auth grant, machine claim, SQL or deploy.
The operator must run the existing local CPU daemon separately.
"""
from __future__ import annotations
import argparse
from copy import deepcopy
from datetime import datetime,timedelta,timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import time
import uuid

ORIGIN='https://xedo-eight.vercel.app'
BASE='https://tstmjnlhwidwtzetqxbu.supabase.co'
DEFAULT_ROOT=Path('C:/mega/codex/iENA/github-publish/XEDO-hardware-release')
ROOT_OUTPUT=Path('C:/mega/codex/iENA/outputs/XEDO_Local_AI_Phase7_2026-10-30')
TERMINAL={'succeeded','failed','cancelled'}

def load_module(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec);sys.modules[name]=module
    spec.loader.exec_module(module);return module

def stamp():return datetime.now(timezone.utc).isoformat()
def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=True,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()

class ProductionActor:
    def __init__(self,base,transport,q):self.base,self.transport,self.q=base,transport,q;self.uid=base.uid
    def call(self,path,body=None,expected=(200,)):
        self.q.require(isinstance(path,str)and len(path)<=220 and re.fullmatch(r'[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*',path)is not None,'BFF_PATH_INVALID')
        token=self.base.access()
        self.q.require(re.fullmatch(r'[A-Za-z0-9_.-]{1,9999}',token)is not None,'SESSION_INVALID')
        data,_=self.transport.call('POST'if body is not None else'GET',ORIGIN+'/api/v1/inspector/'+path,
          headers={'Origin':ORIGIN,'X-XEDO-Inspector':self.uid,'Cookie':'__Host-xedo_inspector='+token,
                   **({'Content-Type':'application/json'}if body is not None else{})},body=body,expected=expected)
        return data

class Acceptance:
    def __init__(self,args,q,remote,requests,key):
        self.args,self.q,self.requests=args,q,requests;self.root=args.root
        self.folder=self.root/'local-data/live-ai-qualification'
        self.transport=q.Transport(requests,key)
        self.a=ProductionActor(q.Actor('primary',self.root,self.folder,remote,key,requests),self.transport,q)
        self.b=ProductionActor(q.Actor('secondary',self.root,self.folder,remote,key,requests),self.transport,q)
        self.state_path=self.folder/('production-acceptance-'+args.html_sha256[:20]+'.json')
        self.lock_path=self.state_path.with_suffix('.lock')
        self.state=json.loads(self.state_path.read_text())if self.state_path.exists()else{
          'schemaVersion':'xedo-production-acceptance-state/1','htmlSha256':args.html_sha256,
          'primaryId':self.a.uid,'secondaryId':self.b.uid,'startedAt':stamp(),'pollEvents':[]}
        q.require(self.state.get('htmlSha256')==args.html_sha256 and self.state.get('primaryId')==self.a.uid and
          self.state.get('secondaryId')==self.b.uid,'RESUME_IDENTITY_MISMATCH')
        self.report_path=ROOT_OUTPUT/'acceptance'/('production-'+args.html_sha256[:20]+'.json')
        self.report={'schemaVersion':'xedo-production-ai-acceptance/1','startedAt':stamp(),'status':'preflight',
          'origin':ORIGIN,'htmlSha256Expected':args.html_sha256,'realSupabase':True,'simulatedAuth':False,
          'browserProof':False,'loginFlowTested':False,'credentialsSource':'existing DPAPI sessions only',
          'workerStartedOrClaimedByRunner':False,'maxNewMissions':1,'maxNewJobs':1,
          'sqlAccountRegistryChanges':False,'billingSubscriptionChanges':False,'deployPerformedByRunner':False,
          'actorIds':{'primary':self.a.uid,'secondary':self.b.uid},'checks':[],
          'runnerSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'qualificationHelperSha256':hashlib.sha256(Path(q.__file__).read_bytes()).hexdigest()}
    def require(self,condition,code):self.q.require(condition,code)
    def persist(self):
        self.q.write_json(self.state_path,self.state)
        self.report.update(missionId=self.state.get('missionId'),jobId=self.state.get('jobId'),
          logicalJobsCreated=int('jobId'in self.state),pollEvents=self.state['pollEvents'])
        self.q.write_json(self.report_path,self.report)
    def check(self,name,**evidence):
        self.report['checks'].append({'name':name,'status':'passed','at':stamp(),**evidence});self.persist()
    def deny(self,mission_id,job_id,result_id):
        for path in ('missions/'+mission_id,'missions/'+mission_id+'/history','analysis-jobs/'+job_id,'analyses/'+result_id):
            self.b.call(path,expected=(404,))
        self.require(not any(x.get('missionId')==mission_id for x in self.b.call('missions').get('missions',[])),'PRIVATE_MISSION_LIST_LEAK')
        self.require(not any(x.get('jobId')==job_id for x in self.b.call('analysis-jobs').get('jobs',[])),'PRIVATE_JOB_LIST_LEAK')
        self.require(not any(x.get('resultId')==result_id for x in self.b.call('analyses').get('analyses',[])),'PRIVATE_RESULT_LIST_LEAK')
    def preflight(self):
        self.require(self.a.uid!=self.b.uid,'DISTINCT_INSPECTORS_REQUIRED')
        try:
            with self.requests.Session()as client:
                response=client.get(ORIGIN+'/',timeout=(10,30),allow_redirects=False)
        except self.requests.RequestException:raise self.q.QualificationError('PRODUCTION_HTML_UNAVAILABLE')from None
        self.require(response.status_code==200 and 'text/html'in response.headers.get('Content-Type',''),'PRODUCTION_HTML_INVALID')
        actual=hashlib.sha256(response.content).hexdigest()
        self.require(actual==self.args.html_sha256,'DEPLOYED_HTML_HASH_MISMATCH')
        self.check('Deployed HTML identity matches reviewed build',htmlSha256Actual=actual,htmlBytes=len(response.content))
        guest,_=self.transport.call('GET',ORIGIN+'/api/v1/inspector/session')
        self.require(guest.get('user')is None,'GUEST_SESSION_INVALID')
        denied,_=self.transport.call('GET',ORIGIN+'/api/v1/inspector/analysis-jobs',expected=(401,))
        self.require(denied.get('code')=='SESSION_REQUIRED','NEW_JOB_ROUTE_NOT_DEPLOYED')
        for actor in (self.a,self.b):
            session=actor.call('session');self.require(session.get('user',{}).get('id')==actor.uid and session['user'].get('role')=='Inspector','PRODUCTION_INSPECTOR_NOT_READY')
        jobs=self.a.call('analysis-jobs').get('jobs',[])
        self.require(not any(j.get('status')not in TERMINAL and j.get('jobId')!=self.state.get('jobId')for j in jobs),'UNRELATED_ACTIVE_JOB_STOP')
        presence=self.a.call('analysis-worker')
        self.require(presence.get('online')is True,'CPU_DAEMON_NOT_ONLINE')
        self.check('Guest guards, new job/status routes and A/B Inspector sessions work',workerOnline=True)
        prior=json.loads(self.args.prior_report.read_text(encoding='utf-8'))
        self.require(prior.get('status')=='passed'and prior.get('realSupabase')is True and prior.get('actorIds',{}).get('primary')==self.a.uid,'PASSED_PRIOR_QUALIFICATION_REQUIRED')
        previous=next((x for x in prior.get('cases',[])if x.get('name')=='historical-positive'and x.get('status')=='passed'),None)
        self.require(previous is not None,'PRIOR_OWNED_RESULT_REQUIRED')
        result=previous['result'];owned=self.a.call('analyses/'+result['resultId'])
        self.require(owned.get('analysisRef')==result['analysisRef'],'PRIOR_OWNED_RESULT_CHANGED')
        opened=self.a.call('missions/'+previous['missionId'])
        history=self.a.call('missions/'+previous['missionId']+'/history')
        self.require(opened.get('missionId')==previous['missionId']and len(history.get('revisions',[]))>=2,'PRIOR_PRIVATE_HISTORY_UNAVAILABLE')
        self.deny(previous['missionId'],previous['jobId'],result['resultId'])
        self.check('Existing owned result/private mission/history read through production; B is denied',
          priorResultId=result['resultId'],analysisRef=result['analysisRef'],canonicalApiSha256=digest(owned))
        no_sar=next((x for x in prior.get('cases',[])if x.get('name')=='deterministic-no-sar'),None)
        self.report['noSarEvidence']={'mode':'prior_phase6_only_no_new_no_sar_job','priorReportSha256':hashlib.sha256(self.args.prior_report.read_bytes()).hexdigest(),
          'priorRunId':prior.get('runId'),'priorCasePassed':bool(no_sar and no_sar.get('status')=='passed'and no_sar.get('noResultPublished')is True)}
        self.persist()
    def run_job(self):
        # One dedicated mission and one mutation are reused on resume, including
        # uncertain HTTP commits. No creation retry uses a new mutation/body.
        if 'missionBody'not in self.state:
            geometry=self.q.load_geometry(self.root/'workers/local-ai/examples/rayong-small.geojson')
            document=deepcopy(json.loads((self.root/'contracts/examples/inspector-save-draft.json').read_text())['document'])
            document.update(title='QAProduction '+self.args.html_sha256[:12],inputMode='mission',searchGeometry=geometry,
              imageSelection=None,analysisRef=None,riskDraft=None,planningInputs={'geometry':geometry,'driftEnabled':False})
            self.state['missionBody']={'schemaVersion':'xedo-inspector-save/1','intent':'save_draft','missionId':None,
              'expectedRevision':0,'mutationId':str(uuid.uuid4()),'document':document};self.persist()
        if 'missionId'not in self.state:
            saved=self.a.call('missions',self.state['missionBody'])
            self.state.update(missionId=self.q.safe_uuid(saved['missionId']),inputRevision=saved['revision']);self.persist()
        if 'jobBody'not in self.state:
            today=datetime.now(timezone.utc).date()
            self.state['jobBody']={'missionId':self.state['missionId'],'expectedRevision':self.state['inputRevision'],
              'mutationId':str(uuid.uuid4()),'start':(today-timedelta(days=30)).isoformat(),'end':today.isoformat()};self.persist()
        if 'jobId'not in self.state:
            submitted=self.a.call('analysis-jobs',self.state['jobBody'],expected=(202,))
            self.state.update(jobId=self.q.safe_uuid(submitted['jobId']),submittedAt=stamp());self.persist()
        started=time.monotonic();deadline=started+self.args.poll_seconds;last=None;polls=0
        while time.monotonic()<deadline:
            job=self.a.call('analysis-jobs/'+self.state['jobId']);polls+=1
            event={k:job.get(k)for k in ('status','stage','processedTiles','totalTiles','attempt','resultId','errorCode','createdAt','updatedAt','workerOnline')}
            self.require(event['status']in {'queued','running','succeeded','failed','cancelled'},'JOB_STATUS_INVALID')
            self.require(event.get('stage')in {'queued','searching','downloading','validating_input','loading_model','inferencing','packaging','publishing','succeeded','failed','cancelled','cancelling'},'JOB_STAGE_INVALID')
            if event!=last:
                self.state['pollEvents'].append({'observedAt':stamp(),'elapsedThisRunSeconds':round(time.monotonic()-started,3),**event});self.persist();last=event
            if job['status']in TERMINAL:break
            time.sleep(2)
        else:raise self.q.QualificationError('BOUNDED_POLL_TIMEOUT_PRESERVE_JOB')
        self.require(job['status']=='succeeded'and isinstance(job.get('resultId'),str),'PRODUCTION_JOB_NOT_SUCCEEDED')
        analysis=self.a.call('analyses/'+job['resultId'])
        self.require(analysis.get('serverRegistered')is True and analysis.get('accuracyValidatedOnGEE')is False and
          analysis.get('manifest',{}).get('jobId')==self.state['jobId'],'PRODUCTION_OWNED_RESULT_INVALID')
        self.deny(self.state['missionId'],self.state['jobId'],job['resultId'])
        reopened=self.a.call('missions/'+self.state['missionId'])
        self.require(reopened['document'].get('analysisRef')is None and reopened.get('confirmedReview')is None,'QA_MISSION_UNEXPECTED_CONFIRMATION')
        self.report['newResult']={'resultId':job['resultId'],'analysisRef':analysis.get('analysisRef'),
          'canonicalApiSha256':digest(analysis),'sourceAssetId':analysis.get('source',{}).get('assetId'),
          'acquiredAt':analysis.get('acquiredAt'),'candidateCount':len(analysis['candidates']['features']),
          'grid':analysis.get('grid'),'coverageSummary':analysis.get('coverageSummary'),
          'pollRequestsThisRun':polls,'pollElapsedThisRunSeconds':round(time.monotonic()-started,3),
          'confirmationCreated':False,'zeroCandidatesMeansNoOil':False}
        self.check('One production BFF job completed on separately run CPU daemon; owned result sealed; B denied')
    def run(self):
        self.persist();self.preflight();self.report['status']='running';self.persist();self.run_job()
        self.report.update(status='passed',completedAt=stamp(),browserAcceptance='pending_separate_real_signed_browser_test')
        self.persist();return self.report_path

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-real',action='store_true');parser.add_argument('--root',type=Path,default=DEFAULT_ROOT)
    parser.add_argument('--html-sha256');parser.add_argument('--prior-report',type=Path)
    parser.add_argument('--poll-seconds',type=int,default=600)
    args=parser.parse_args()
    if not args.run_real:print('{"status":"not_run","code":"RUN_REAL_REQUIRED","networkRequests":0,"sessionReads":0}');return 0
    runner=None;lock=None
    try:
        args.root=args.root.resolve()
        if not re.fullmatch(r'[a-f0-9]{64}',args.html_sha256 or'')or not 30<=args.poll_seconds<=900 or args.prior_report is None:
            print('{"status":"pending","code":"VALID_HASH_PRIOR_REPORT_AND_BOUNDED_TIMEOUT_REQUIRED","networkRequests":0,"sessionReads":0}');return 2
        missing=[role for role in ('primary','secondary')if any(not(args.root/'local-data/live-ai-qualification'/(role+suffix)).is_file()for suffix in ('.session.dpapi','.account.json'))]
        if missing:print(json.dumps({'status':'pending','code':'EXISTING_DPAPI_SESSIONS_REQUIRED','missingRoles':missing,'networkRequests':0,'sessionReads':0}));return 0
        q=load_module('xedo_production_qualification_helpers',args.root/'scripts/qualify-real-ai.py')
        q.require(args.prior_report.resolve().is_relative_to(args.root.parent.parent/'outputs/XEDO_Local_AI_Phase6_2026-10-30'),'PRIOR_REPORT_PATH_INVALID')
        source=(args.root/'src/inspector-project.js').read_text()
        project=re.search(r'INSPECTOR_PROJECT_URL\s*=\s*[\'\"]([^\'\"]+)[\'\"]',source)
        key=re.search(r'INSPECTOR_PUBLISHABLE_KEY\s*=\s*[\'\"](sb_publishable_[A-Za-z0-9_-]+)[\'\"]',source)
        q.require(project is not None and project.group(1)==BASE and key is not None,'FIXED_PUBLIC_PROJECT_REQUIRED')
        sys.path.insert(0,str(args.root/'workers/local-ai'));import remote_worker as remote;import requests
        lock_path=args.root/'local-data/live-ai-qualification'/('production-acceptance-'+args.html_sha256[:20]+'.lock')
        try:lock=lock_path.open('x',encoding='utf-8');lock.write('Production API acceptance is active; contains no credentials.\n');lock.flush()
        except FileExistsError:raise q.QualificationError('ACCEPTANCE_LOCK_REQUIRES_OPERATOR_RECONCILIATION')from None
        runner=Acceptance(args,q,remote,requests,key.group(1));report=runner.run()
        print(json.dumps({'status':'passed','report':str(report),'browserProof':False,'maxNewJobs':1}));return 0
    except KeyboardInterrupt:
        if runner:runner.report.update(status='interrupted',code='OPERATOR_INTERRUPTED',completedAt=stamp());runner.persist()
        print('{"status":"interrupted","code":"OPERATOR_INTERRUPTED_PRESERVE_QA_STATE"}');return 130
    except Exception as error:
        code=getattr(error,'code',None);code=code if isinstance(code,str)and re.fullmatch(r'[A-Z0-9_]{1,100}',code)else'PRODUCTION_ACCEPTANCE_FAILED'
        status=getattr(error,'status',None);status=status if isinstance(status,int)else None
        if runner:runner.report.update(status='failed',code=code,httpStatus=status,completedAt=stamp());runner.persist()
        print(json.dumps({'status':'failed','code':code,'httpStatus':status,'message':'Inspect sanitized report and preserved QA job; do not submit a new mutation.'}));return 2
    finally:
        if lock:lock.close();lock_path.unlink(missing_ok=True)

if __name__=='__main__':sys.exit(main())
