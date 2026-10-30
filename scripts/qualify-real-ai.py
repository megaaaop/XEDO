"""Gated real Supabase/API + local CPU qualification, never a provisioning tool.

Requires three existing, user-connected DPAPI sessions and root-provisioned
Inspector/worker bindings. No password, admin key, SQL, fake JWT or user deletion.
This is API/worker evidence; it does not establish browser or field acceptance.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import time
import uuid

BASE='https://tstmjnlhwidwtzetqxbu.supabase.co'
BFF='http://127.0.0.1:5193'
ROLES=('primary','secondary','machine')
TERMINAL={'succeeded','failed','cancelled'}
MAX_CASES=3

class QualificationError(Exception):
    def __init__(self,code,status=None):self.code,self.status=code,status

def stamp():return datetime.now(timezone.utc).isoformat()
def stable(value):return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)
def write_json(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_suffix(path.suffix+'.tmp');temp.write_text(json.dumps(value,ensure_ascii=True,indent=2),encoding='utf-8');temp.replace(path)
def require(condition,code):
    if not condition:raise QualificationError(code)
def safe_code(value):return value if isinstance(value,str) and re.fullmatch(r'[A-Z0-9_]{1,80}',value) else 'QUALIFICATION_FAILED'
def safe_uuid(value):
    try:return str(uuid.UUID(value))
    except Exception:raise QualificationError('IDENTITY_INVALID') from None
def load_geometry(path):
    value=json.loads(path.read_text(encoding='utf-8-sig'))
    if value.get('type')=='Feature':value=value.get('geometry')
    require(isinstance(value,dict) and value.get('type')=='Polygon','CASE_GEOMETRY_INVALID')
    # Match the web document contract exactly; no geodesic/CRS extension fields.
    return {'type':'Polygon','coordinates':value['coordinates']}

class Transport:
    """Every call has its own HTTP session/connection; no shared cookie jar."""
    def __init__(self,requests,public_key):self.requests,self.key=requests,public_key
    def call(self,method,url,*,headers=None,body=None,expected=(200,)):
        try:
            with self.requests.Session()as client:
                response=client.request(method,url,headers=headers or {},json=body,timeout=(10,30),allow_redirects=False)
        except self.requests.RequestException:raise QualificationError('NETWORK_UNAVAILABLE') from None
        status=response.status_code
        if status not in expected:raise QualificationError('HTTP_UNEXPECTED',status)
        if status==204:return None,status
        try:data=response.json()
        except Exception:raise QualificationError('RESPONSE_INVALID',status) from None
        return data,status
    def rpc(self,access,name,action,payload=None,*,expected=(200,)):
        require(name in ('xedo_inspector','xedo_local_worker'),'RPC_NAME_INVALID')
        return self.call('POST',BASE+'/rest/v1/rpc/'+name,headers={'apikey':self.key,'Authorization':'Bearer '+access,'Content-Type':'application/json'},body={'p_action':action,'p_payload':{} if payload is None else payload},expected=expected)

class Actor:
    def __init__(self,role,root,folder,remote,key,requests):
        self.role,self.folder=role,folder
        self.store=remote.SessionStore(folder/(role+'.session.dpapi'),BASE)
        loaded=self.store.load();require(isinstance(loaded,dict),'CONNECTED_SESSION_REQUIRED')
        self.uid=safe_uuid(loaded.get('user_id'))
        self.meta=json.loads((folder/(role+'.account.json')).read_text(encoding='utf-8'))
        require(self.meta.get('role')==role and self.meta.get('userId')==self.uid,'CONNECTED_IDENTITY_MISMATCH')
        self.config=remote.Config(base_url=BASE,publishable_key=key,session_file=folder/(role+'.session.dpapi'),work_root=folder/'auth-clients'/role,pipeline=root/'workers/local-ai/pipeline.py',python=sys.executable,model=None,env_file=str(root/'.env'))
        self.client=remote.RpcClient(self.config,self.store,transport=requests.Session())
    def access(self):
        # Refresh is the supported existing grant, never a new password flow.
        if time.time()>=self.client.session.get('expires_at',0)-120:self.client.refresh()
        require(self.client.session.get('user_id')==self.uid,'REFRESH_IDENTITY_CHANGED')
        return self.client.session['access_token']
    def bff(self,transport,path,*,body=None,expected=(200,)):
        access=self.access()
        require(re.fullmatch(r'[A-Za-z0-9_.-]{1,11999}',access) is not None,'SESSION_INVALID')
        # Same cookie name/semantics as the actual localhost BFF. Real JWT from
        # DPAPI only; no cookie is fabricated as an Auth identity or fake claims.
        return transport.call('POST'if body is not None else'GET',BFF+'/api/v1/inspector/'+path,headers={'Origin':BFF,'X-XEDO-Inspector':self.uid,'Cookie':'xedo_inspector_dev='+access,**({'Content-Type':'application/json'}if body is not None else{})},body=body,expected=expected)[0]

class ConcurrentPublishClient:
    """Delegate normal lifecycle RPC; race only identical publication payloads."""
    def __init__(self,base_client,transport,audit,remote):self.base,self.transport,self.audit,self.remote=base_client,transport,audit,remote
    def rpc(self,action,payload):
        if action!='publish':return self.base.rpc(action,payload)
        if time.time()>=self.base.session.get('expires_at',0)-120:self.base.refresh()
        access=self.base.session['access_token']
        encoded=stable(payload);original_hash=hashlib.sha256(encoded.encode()).hexdigest()
        self.audit.setdefault('publishBatches',[])
        def one(_):return self.transport.rpc(access,'xedo_local_worker','publish',json.loads(encoded))[0]
        try:
            with ThreadPoolExecutor(max_workers=3)as pool:receipts=list(pool.map(one,range(3)))
            require(len(receipts)==3 and len({stable(r)for r in receipts})==1,'PUBLISH_RECEIPTS_DIFFER')
            receipt=receipts[0]
            require(receipt.get('status')=='succeeded' and receipt.get('jobId')==payload['jobId'],'PUBLISH_RECEIPT_INVALID')
            self.audit['publishBatches'].append({'requestCount':3,'requestSha256':original_hash,'identicalReceipts':True,'jobId':receipt['jobId'],'resultId':receipt.get('resultId'),'analysisRef':receipt.get('analysisRef')})
            return receipt
        except Exception:
            # Some concurrent requests may already have committed. Keep the
            # existing worker checkpoint and its exact mutation/body for retry.
            self.audit['publishBatches'].append({'requestCount':3,'requestSha256':original_hash,'identicalReceipts':False,'uncertain':True})
            raise self.remote.WorkerError('PUBLISH_UNCERTAIN','Concurrent publication could not be confirmed; preserve the checkpoint.',retryable=True)from None

class Runner:
    def __init__(self,root,folder,output,remote,key,requests):
        self.root,self.folder,self.output,self.remote=root,folder,output,remote
        self.run_id=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'_'+uuid.uuid4().hex[:8]
        self.work=folder/'qualification-runs'/self.run_id
        self.transport=Transport(requests,key)
        self.actors={role:Actor(role,root,folder,remote,key,requests)for role in ROLES}
        self.a,self.b,self.machine=(self.actors[r]for r in ROLES)
        self.report={'schemaVersion':'xedo-real-ai-qualification/1','runId':self.run_id,'startedAt':stamp(),'status':'preflight','projectRef':'tstmjnlhwidwtzetqxbu','frontendOrigin':BFF,'realSupabase':True,'simulatedAuth':False,'browserProof':False,'sqlOrAccountChangesByRunner':False,'billingOrSubscriptionChanged':False,'pushDeploy':False,'checks':[],'cases':[],'actorIds':{k:a.uid for k,a in self.actors.items()}}
        hashed=['api/inspector.mjs','db/inspector-local-jobs.sql','db/inspector-local-jobs-status.sql','workers/local-ai/remote_worker.py','workers/local-ai/pipeline.py','workers/local-ai/vendor/gee_sar_inference.py','dist/index.html']
        self.report['sourceHashes']={name:hashlib.sha256((root/name).read_bytes()).hexdigest()for name in hashed}
        self.report_file=output/('qualification-'+self.run_id+'.json')
    def checkpoint(self):write_json(self.report_file,self.report)
    def check(self,name):self.report['checks'].append({'name':name,'status':'passed','at':stamp()});self.checkpoint()
    def preflight(self):
        require(len({actor.uid for actor in self.actors.values()})==3,'THREE_DISTINCT_IDENTITIES_REQUIRED')
        receipt,_=self.transport.call('GET',BFF+'/qa/receipt')
        require(receipt.get('realSupabase')is True and receipt.get('simulatedAuth')is False and receipt.get('projectRef')=='tstmjnlhwidwtzetqxbu','REAL_HARNESS_REQUIRED')
        for actor in (self.a,self.b):
            session=actor.bff(self.transport,'session');require(session.get('user',{}).get('id')==actor.uid and session['user'].get('role')=='Inspector','INSPECTOR_NOT_READY')
            jobs=actor.bff(self.transport,'analysis-jobs').get('jobs',[])
            require(not any(j.get('status')not in TERMINAL for j in jobs),'PREEXISTING_ACTIVE_JOBS_STOP')
        presence=self.machine.client.rpc('presence',{})
        require(presence.get('online')is True and presence.get('ownerId')==self.a.uid,'MACHINE_BINDING_NOT_READY')
        self.transport.rpc(self.machine.access(),'xedo_inspector','session',expected=(403,))
        self.machine.bff(self.transport,'session',expected=(403,))
        self.transport.rpc(self.a.access(),'xedo_local_worker','presence',expected=(403,))
        require(self.a.bff(self.transport,'analysis-worker').get('online')is True,'WORKER_PRESENCE_NOT_VISIBLE')
        self.check('Real Inspector A/B and dedicated owner-bound machine are ready; roles are separated; no pre-existing active jobs')
    def save(self,document,receipt=None):
        payload={'schemaVersion':'xedo-inspector-save/1','intent':'save_draft','missionId':receipt['missionId']if receipt else None,'expectedRevision':receipt['revision']if receipt else 0,'mutationId':str(uuid.uuid4()),'document':document}
        return self.a.bff(self.transport,'missions',body=payload)
    def deny_other_owner(self,job_id,mission_id,result_id=None):
        paths=['analysis-jobs/'+job_id,'missions/'+mission_id,'missions/'+mission_id+'/history']
        if result_id:paths.append('analyses/'+result_id)
        for path in paths:self.b.bff(self.transport,path,expected=(404,))
        direct=[('job',{'jobId':job_id}),('get',{'missionId':mission_id}),('history',{'missionId':mission_id})]
        if result_id:direct.append(('analysis',{'resultId':result_id}))
        for action,payload in direct:self.transport.rpc(self.b.access(),'xedo_inspector',action,payload,expected=(404,))
        require(not any(j.get('jobId')==job_id for j in self.b.bff(self.transport,'analysis-jobs').get('jobs',[])),'OTHER_OWNER_JOB_LIST_LEAK')
        require(not any(m.get('missionId')==mission_id for m in self.b.bff(self.transport,'missions').get('missions',[])),'OTHER_OWNER_MISSION_LIST_LEAK')
    def run_case(self,definition):
        case={'name':definition['name'],'startedAt':stamp(),'status':'running','expected':definition['expected'],'events':[]}
        self.report['cases'].append(case);self.checkpoint()
        try:
            geometry=load_geometry(self.root/'workers/local-ai/examples'/definition['area'])
            doc=deepcopy(json.loads((self.root/'contracts/examples/inspector-save-draft.json').read_text(encoding='utf-8'))['document'])
            doc.update(title='QA Phase6 '+self.run_id+' '+definition['name'],inputMode='mission',searchGeometry=geometry,imageSelection=None,analysisRef=None,riskDraft=None,planningInputs={'geometry':geometry,'driftEnabled':False})
            saved=self.save(doc);case['missionId']=saved['missionId'];case['inputRevision']=saved['revision'];self.checkpoint()
            self.machine.client.rpc('presence',{})
            body={'missionId':saved['missionId'],'expectedRevision':saved['revision'],'mutationId':str(uuid.uuid4()),'start':definition['start'],'end':definition['end']}
            before={j['jobId']for j in self.a.bff(self.transport,'analysis-jobs').get('jobs',[])}
            # Each transport call creates a distinct requests.Session/connection.
            self.a.access()
            with ThreadPoolExecutor(max_workers=3)as pool:submissions=list(pool.map(lambda _:self.a.bff(self.transport,'analysis-jobs',body=deepcopy(body),expected=(202,)),range(3)))
            ids={j.get('jobId')for j in submissions};require(len(ids)==1 and None not in ids,'DUPLICATE_SUBMIT_CREATED_MULTIPLE_JOBS')
            job_id=next(iter(ids));case['jobId']=job_id;case['concurrentSubmit']={'requests':3,'identicalJobId':True,'mutationId':body['mutationId']};self.checkpoint()
            listed=self.a.bff(self.transport,'analysis-jobs').get('jobs',[])
            require({j['jobId']for j in listed}-before=={job_id},'UNEXPECTED_NEW_JOBS_STOP')
            job=self.a.bff(self.transport,'analysis-jobs/'+job_id)
            require(job.get('inputRevision')==saved['revision']and job.get('geometry')==geometry,'FROZEN_INPUT_MISMATCH')
            self.deny_other_owner(job_id,saved['missionId'])
            access=self.machine.access()
            with ThreadPoolExecutor(max_workers=3)as pool:claims=list(pool.map(lambda _:self.transport.rpc(access,'xedo_local_worker','claim',{})[0],range(3)))
            claimed=[c for c in claims if c is not None]
            require(len(claimed)==1 and claimed[0].get('jobId')==job_id,'CONCURRENT_CLAIM_NOT_EXACTLY_ONE')
            claim=self.remote.validate_claim(claimed[0]);case['concurrentClaim']={'requests':3,'nonNullClaims':1,'attemptId':claim['attemptId'],'fence':claim['fence']};self.checkpoint()
            worker_config=self.remote.Config(base_url=BASE,publishable_key=self.transport.key,session_file=self.machine.config.session_file,work_root=self.work/'cpu',pipeline=self.root/'workers/local-ai/pipeline.py',python=sys.executable,model=None,env_file=str(self.root/'.env'),heartbeat_seconds=10,poll_seconds=10,timeout_seconds=1800,max_rss_mib=2048)
            require(not (worker_config.work_root/'active.json').exists(),'ACTIVE_CHECKPOINT_REQUIRES_RECONCILIATION')
            def event(value):
                item={k:value[k]for k in ('event','jobId','stage','processedTiles','totalTiles','resultId','code')if k in value}
                # Actual worker emits only allowlisted fields; no child output,
                # provider exception, signed URL, Cookie or Authorization copied.
                case['events'].append(item)
                self.checkpoint()
            proxy=ConcurrentPublishClient(self.machine.client,self.transport,case,self.remote)
            worker=self.remote.Worker(worker_config,proxy,emit=event)
            started=time.monotonic();publication=worker.process(claim);case['workerWallSeconds']=time.monotonic()-started
            final=self.a.bff(self.transport,'analysis-jobs/'+job_id)
            case['jobStatus']=final.get('status');case['errorCode']=final.get('errorCode');case['jobCreatedAt']=final.get('createdAt');case['jobUpdatedAt']=final.get('updatedAt')
            if definition['expected']=='input_invalid':
                require(final.get('status')=='failed'and final.get('errorCode')=='input_invalid'and final.get('resultId')is None and publication is None,'NO_SAR_EXPECTATION_FAILED')
                case['noResultPublished']=True
            else:
                require(final.get('status')=='succeeded'and isinstance(publication,dict)and final.get('resultId')==publication.get('resultId'),'WORKER_NOT_SUCCEEDED')
                rid=final['resultId'];analysis=self.a.bff(self.transport,'analyses/'+rid)
                require(analysis.get('resultId')==rid and analysis.get('serverRegistered')is True and analysis.get('accuracyValidatedOnGEE')is False,'OWNED_RESULT_INVALID')
                count=len(analysis['candidates']['features'])
                if definition.get('expectedAssetId')is not None:require(analysis.get('source',{}).get('assetId')==definition['expectedAssetId'],'BASELINE_SOURCE_SCENE_CHANGED')
                if definition.get('expectedCandidates')is not None:require(count==definition['expectedCandidates'],'BASELINE_CANDIDATE_COUNT_CHANGED')
                case['result']={'resultId':rid,'analysisRef':analysis['analysisRef'],'acquiredAt':analysis.get('acquiredAt'),'inferredAt':analysis.get('inferredAt'),'sourceAssetId':analysis.get('source',{}).get('assetId'),'checkpointSha256':analysis.get('model',{}).get('checkpointSha256'),'candidateCount':count,'grid':analysis.get('grid'),'coverageSummary':analysis.get('coverageSummary'),'compactApiBytes':len(json.dumps(analysis,separators=(',',':'),ensure_ascii=False).encode())}
                require(analysis.get('analysisRef')==publication.get('analysisRef'),'PUBLISHED_REF_MISMATCH')
                require(len([a for a in self.a.bff(self.transport,'analyses').get('analyses',[])if a.get('resultId')==rid])==1,'OWNED_RESULT_DUPLICATED')
                doc['analysisRef']=analysis['analysisRef'];doc['riskDraft']={'baseReviewRevision':None,'decisions':[],'areas':[],'selectedAreaId':None}
                second=self.save(doc,saved)
                reopened=self.a.bff(self.transport,'missions/'+saved['missionId']);history=self.a.bff(self.transport,'missions/'+saved['missionId']+'/history').get('revisions',[])
                require(reopened['document']['analysisRef']==analysis['analysisRef']and reopened['document']['riskDraft']==doc['riskDraft']and reopened['document']['imageSelection']is None,'REOPEN_DRAFT_MISMATCH')
                require(reopened.get('confirmedReview')is None and second['revision']>saved['revision']and len(history)>=2,'UNREVIEWED_SAVE_HISTORY_INVALID')
                case['savedRevision']=second['revision'];case['historyRevisions']=[r['revision']for r in history];case['unreviewedEmptyDraft']=True
                self.deny_other_owner(job_id,saved['missionId'],rid)
            # The actual local pipeline receipt provides child RAM/grid/timing.
            attempt=self.work/'cpu'/job_id/claim['attemptId']
            receipts=list(attempt.glob('pipeline/*/run-receipt.json'))
            if len(receipts)==1:
                local=json.loads(receipts[0].read_text(encoding='utf-8'))
                case['localPipeline']={'status':local.get('status'),'totalElapsedSeconds':local.get('totalElapsedSeconds'),'runnerProcessingSeconds':local.get('runnerProcessingSeconds'),'memory':local.get('memory'),'result':local.get('result')}
            case['status']='passed';case['completedAt']=stamp();self.checkpoint()
        except Exception as error:
            case['status']='failed';case['code']=safe_code(getattr(error,'code',None));case['httpStatus']=getattr(error,'status',None);case['completedAt']=stamp();self.checkpoint();raise
    def run(self):
        self.checkpoint();self.preflight();self.report['status']='running';self.checkpoint()
        utc_today=datetime.now(timezone.utc).date()
        cases=[
            # A broad historical window can select a different valid scene.
            # Match the audited baseline acquisition, not just its AOI/count.
            {'name':'historical-positive','area':'historical-baseline.geojson','start':'2026-10-09','end':'2026-10-09','expected':'succeeded','expectedCandidates':14,'expectedAssetId':'COPERNICUS/S1_GRD/S1D_IW_GRDH_1SDV_20261009T112805_20261009T112830_004938_0094E6_233B'},
            {'name':'near-limit-current','area':'rayong-near-limit.geojson','start':(utc_today-timedelta(days=30)).isoformat(),'end':utc_today.isoformat(),'expected':'succeeded'},
            {'name':'deterministic-no-sar','area':'rayong-small.geojson','start':'1900-01-01','end':'1900-01-01','expected':'input_invalid'},
        ]
        require(len(cases)<=MAX_CASES,'CASE_LIMIT')
        for definition in cases:self.run_case(definition)
        self.report['status']='passed';self.report['completedAt']=stamp();self.report['logicalJobsCreated']=len(cases);self.report['confirmedReviewCreated']=False
        self.report['remainingQualification']=['Actual browser acceptance is separate','No100jobs-month long soak or physical touch/device qualification','No deletion/revocation of primary or test identities by this runner','No SQL/account/registry changes and no website deployment by this runner']
        self.checkpoint();return self.report_file

def main():
    parser=argparse.ArgumentParser(description='Explicit real XEDO qualification with already connected DPAPI identities; no provisioning.')
    parser.add_argument('--run-real',action='store_true');parser.add_argument('--root',default=str(Path(__file__).resolve().parents[1]));parser.add_argument('--output')
    args=parser.parse_args()
    if not args.run_real:print('{"status":"not_run","code":"RUN_REAL_REQUIRED","networkRequests":0}');return 0
    root=Path(args.root).resolve();folder=root/'local-data/live-ai-qualification'
    missing=[r for r in ROLES if not (folder/(r+'.session.dpapi')).is_file()or not(folder/(r+'.account.json')).is_file()]
    if missing:print(json.dumps({'status':'pending','code':'CONNECT_THREE_ACCOUNTS_FIRST','missingRoles':missing,'networkRequests':0}));return 0
    try:
        source=(root/'src/inspector-project.js').read_text(encoding='utf-8')
        fixed=re.search(r'INSPECTOR_PROJECT_URL\s*=\s*[\'"]([^\'"]+)[\'"]',source)
        public=re.search(r'INSPECTOR_PUBLISHABLE_KEY\s*=\s*[\'"](sb_publishable_[A-Za-z0-9_-]+)[\'"]',source)
        require(fixed is not None and fixed.group(1)==BASE and public is not None,'PUBLIC_PROJECT_CONFIGURATION_INVALID')
        sys.path.insert(0,str(root/'workers/local-ai'))
        import remote_worker as remote
        import requests
        report_root=(root.parent.parent/'outputs/XEDO_Local_AI_Phase6_2026-10-30').resolve()
        output=Path(args.output).resolve()if args.output else report_root/'qualification'
        require(output.is_relative_to(report_root),'REPORT_PATH_INVALID')
        runner=Runner(root,folder,output,remote,public.group(1),requests)
        path=runner.run()
        print(json.dumps({'status':'passed','report':str(path),'logicalJobsCreated':3,'productionWebsiteDeployed':False,'browserProof':False}));return 0
    except KeyboardInterrupt:
        if'runner'in locals():runner.report.update(status='interrupted',completedAt=stamp(),code='OPERATOR_INTERRUPTED');runner.checkpoint()
        print('{"status":"interrupted","code":"OPERATOR_INTERRUPTED","message":"Preserve local worker checkpoint and inspect listed jobs before retrying."}');return 130
    except Exception as error:
        code=safe_code(getattr(error,'code',None));status=getattr(error,'status',None)
        if'runner'in locals():runner.report.update(status='failed',completedAt=stamp(),code=code,httpStatus=status);runner.checkpoint()
        print(json.dumps({'status':'failed','code':code,'httpStatus':status,'message':'Qualification stopped. Inspect the sanitized report and existing job/checkpoint before retrying; no passwords or tokens are printed.'}));return 2

if __name__=='__main__':sys.exit(main())
