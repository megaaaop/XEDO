"""Outbound local CPU worker. Machine credentials only; never an admin key.

No public listener or cloud compute provisioning. Normal mode permits only
the existing XEDO Supabase URL.
An explicit --local-qa flag enables the single loopback QA endpoint.
"""
from __future__ import annotations
import argparse
import ctypes
import getpass
import hashlib
import json
import os
from pathlib import Path
import queue
import re
import subprocess
import sys
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone
from urllib.parse import urlparse

PRODUCTION_URL = 'https://tstmjnlhwidwtzetqxbu.supabase.co'
QA_URL = 'http://127.0.0.1:5193'
MAX_JSON_BYTES = 524288
UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', re.I)
STAGES = {'searching','downloading','validating_input','loading_model','inferencing','packaging','publishing'}
ENTROPY = b'XEDO local machine worker session v1'

class WorkerError(Exception):
    def __init__(self, code, message, *, retryable=False, status=None):
        super().__init__(message)
        self.code, self.retryable, self.status = code, retryable, status

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',',':'), ensure_ascii=False, allow_nan=False).encode('utf-8')

def save_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix+'.tmp')
    temporary.write_bytes(canonical(value))
    temporary.replace(path)

def contained(path, root):
    path, root = Path(path).resolve(), Path(root).resolve()
    if not path.is_relative_to(root):
        raise WorkerError('LOCAL_PATH_INVALID','The local artifact path is outside the current attempt.')
    return path

class WindowsProtector:
    """Current Windows user DPAPI, never machine-wide encryption."""
    def _crypt(self, data, decrypt=False):
        if os.name != 'nt':
            raise WorkerError('DPAPI_REQUIRED','Use Windows protected storage for the machine session.')
        from ctypes import wintypes
        class Blob(ctypes.Structure):
            _fields_ = [('size',wintypes.DWORD),('data',ctypes.POINTER(ctypes.c_ubyte))]
        raw = ctypes.create_string_buffer(data)
        extra = ctypes.create_string_buffer(ENTROPY)
        source = Blob(len(data),ctypes.cast(raw,ctypes.POINTER(ctypes.c_ubyte)))
        entropy = Blob(len(ENTROPY),ctypes.cast(extra,ctypes.POINTER(ctypes.c_ubyte)))
        result = Blob()
        crypt = ctypes.WinDLL('crypt32',use_last_error=True)
        kernel = ctypes.WinDLL('kernel32',use_last_error=True)
        kernel.LocalFree.argtypes=[ctypes.c_void_p]
        kernel.LocalFree.restype=ctypes.c_void_p
        if decrypt:
            function = crypt.CryptUnprotectData
            function.argtypes=[ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.c_void_p,wintypes.DWORD,ctypes.POINTER(Blob)]
            ok=function(ctypes.byref(source),None,ctypes.byref(entropy),None,None,1,ctypes.byref(result))
        else:
            function = crypt.CryptProtectData
            function.argtypes=[ctypes.POINTER(Blob),wintypes.LPCWSTR,ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.c_void_p,wintypes.DWORD,ctypes.POINTER(Blob)]
            ok=function(ctypes.byref(source),'XEDO machine worker session',ctypes.byref(entropy),None,None,1,ctypes.byref(result))
        if not ok:
            raise WorkerError('DPAPI_FAILED','Windows could not protect or open this machine session.')
        try:
            return ctypes.string_at(result.data,result.size)
        finally:
            kernel.LocalFree(ctypes.cast(result.data,ctypes.c_void_p))

    def protect(self,data): return self._crypt(data)
    def unprotect(self,data): return self._crypt(data,True)

class SessionStore:
    def __init__(self,path,base_url,protector=None):
        self.path, self.base_url, self.protector = Path(path),base_url,protector or WindowsProtector()

    def save(self,session):
        value={'baseUrl':self.base_url,'session':session}
        ciphertext=b'XEDO-DPAPI-1\0'+self.protector.protect(canonical(value))
        self.path.parent.mkdir(parents=True,exist_ok=True)
        temporary=self.path.with_suffix(self.path.suffix+'.tmp')
        temporary.write_bytes(ciphertext);temporary.replace(self.path)

    def load(self):
        if not self.path.exists(): return None
        if self.path.stat().st_size>32768:
            raise WorkerError('SESSION_INVALID','The protected machine session is invalid.')
        data=self.path.read_bytes()
        prefix=b'XEDO-DPAPI-1\0'
        if not data.startswith(prefix):
            raise WorkerError('SESSION_INVALID','The machine session must use Windows protected storage.')
        try:
            value=json.loads(self.protector.unprotect(data[len(prefix):]))
        except WorkerError: raise
        except Exception:
            raise WorkerError('SESSION_INVALID','The protected machine session could not be read.') from None
        if value.get('baseUrl')!=self.base_url or not isinstance(value.get('session'),dict):
            raise WorkerError('SESSION_INVALID','The machine session belongs to another endpoint.')
        return value['session']

    def clear(self): self.path.unlink(missing_ok=True)

@dataclass
class Config:
    base_url: str
    publishable_key: str
    session_file: Path
    work_root: Path
    pipeline: Path
    python: str = sys.executable
    model: str | None = None
    env_file: str | None = None
    heartbeat_seconds: float = 20
    poll_seconds: float = 10
    timeout_seconds: float = 1800
    max_rss_mib: float = 2048
    local_qa: bool = False

    def validate(self):
        permitted=QA_URL if self.local_qa else PRODUCTION_URL
        if self.base_url.rstrip('/')!=permitted:
            raise WorkerError('ENDPOINT_DENIED','Use the fixed XEDO HTTPS project, or explicit loopback QA mode.')
        self.base_url=permitted
        if not isinstance(self.publishable_key,str) or not self.publishable_key or len(self.publishable_key)>1024 or self.publishable_key.startswith(('sb_secret_','eyJ')):
            raise WorkerError('PUBLIC_KEY_REQUIRED','Configure the project publishable key, never a secret or service-role key.')
        if not self.local_qa and not self.publishable_key.startswith('sb_publishable_'):
            raise WorkerError('PUBLIC_KEY_REQUIRED','Configure the XEDO publishable key.')
        if not .1<=self.heartbeat_seconds<=30 or not .1<=self.poll_seconds<=60 or not 1<=self.timeout_seconds<=1800 or not 256<=self.max_rss_mib<=4096:
            raise WorkerError('WORKER_LIMIT_INVALID','Worker timing or memory limits are outside the allowed bounds.')
        self.work_root=self.work_root.resolve();self.pipeline=self.pipeline.resolve()
        self.session_file=self.session_file.resolve()
        self.work_root.mkdir(parents=True,exist_ok=True)
        return self

class RpcClient:
    def __init__(self,config,store,transport=None,sleeper=time.sleep,clock=time.time):
        self.config,self.store,self.sleeper,self.clock=config.validate(),store,sleeper,clock
        if transport is None:
            import requests
            transport=requests.Session()
        self.transport=transport
        self.session=store.load()

    def _request(self,path,body,access=None,retries=1):
        headers={'apikey':self.config.publishable_key,'Content-Type':'application/json'}
        if access: headers['Authorization']='Bearer '+access
        for attempt in range(retries+1):
            try:
                response=self.transport.request('POST',self.config.base_url+path,json=body,headers=headers,timeout=(10,20),allow_redirects=False)
            except Exception:
                if attempt<retries:
                    self.sleeper(1+attempt);continue
                raise WorkerError('NETWORK_UNAVAILABLE','The worker connection did not complete.',retryable=True) from None
            if response.status_code in (429,500,502,503,504) and attempt<retries:
                self.sleeper(1+attempt);continue
            if response.status_code==204:return None
            try: value=response.json()
            except Exception:
                raise WorkerError('RESPONSE_INVALID','The worker endpoint returned an invalid response.',retryable=response.status_code>=500) from None
            if response.status_code<200 or response.status_code>=300:
                # Never echo arbitrary provider response bodies or credential data.
                code=value.get('code') if isinstance(value,dict) else None
                code=code if isinstance(code,str) and re.fullmatch(r'[A-Z0-9_]{1,80}',code) else 'RPC_REJECTED'
                raise WorkerError(code,'The worker request was rejected.',retryable=response.status_code in (429,500,502,503,504),status=response.status_code)
            return value

    def _accept_auth(self,value,expected_user=None):
        try:
            user=value['user']['id']
            if not UUID.fullmatch(user) or (expected_user and user!=expected_user): raise ValueError()
            duration=value['expires_in']
            if not isinstance(duration,int) or isinstance(duration,bool) or not 1<=duration<=86400:raise ValueError()
            session={'access_token':value['access_token'],'refresh_token':value['refresh_token'],
                     'expires_at':self.clock()+min(3600,duration),'user_id':user}
            if not all(isinstance(session[k],str) and 0<len(session[k])<12000 for k in ['access_token','refresh_token']):raise ValueError()
        except Exception:
            raise WorkerError('AUTH_RESPONSE_INVALID','Machine authentication returned an invalid session.') from None
        self.session=session;self.store.save(session)

    def login(self,email,password):
        value=self._request('/auth/v1/token?grant_type=password',{'email':email,'password':password},retries=0)
        self._accept_auth(value)
        try: result=self.rpc('presence',{})
        except Exception:
            self.session=None;self.store.clear();raise
        return {'signedIn':True,'machineUserId':self.session['user_id'],'presence':result}

    def refresh(self):
        if not self.session or not self.session.get('refresh_token'):
            raise WorkerError('MACHINE_SIGN_IN_REQUIRED','Sign in with the registered machine account first.')
        value=self._request('/auth/v1/token?grant_type=refresh_token',{'refresh_token':self.session['refresh_token']},retries=0)
        self._accept_auth(value,self.session.get('user_id'))

    def rpc(self,action,payload):
        if not self.session:
            raise WorkerError('MACHINE_SIGN_IN_REQUIRED','Sign in with the registered machine account first.')
        if self.clock()>=self.session.get('expires_at',0)-30:self.refresh()
        body={'p_action':action,'p_payload':payload}
        try:return self._request('/rest/v1/rpc/xedo_local_worker',body,self.session['access_token'])
        except WorkerError as error:
            if error.status!=401:raise
            self.refresh()
            return self._request('/rest/v1/rpc/xedo_local_worker',body,self.session['access_token'])

    def logout(self):
        if self.session:
            try:self._request('/auth/v1/logout?scope=local',{},self.session['access_token'],retries=0)
            finally:self.session=None;self.store.clear()

def validate_claim(value):
    if value is None:return None
    try:
        job=value['job'];job_id=value.get('jobId') or job['jobId']
        if not UUID.fullmatch(job_id) or not UUID.fullmatch(value['attemptId']) or not isinstance(value['fence'],int) or isinstance(value['fence'],bool) or value['fence']<1:raise ValueError()
        if job.get('jobId',job_id)!=job_id:raise ValueError()
        if not isinstance(job['geometry'],dict) or job['geometry'].get('type')!='Polygon':raise ValueError()
        for key in ['start','end']:
            if job.get(key) is not None:date.fromisoformat(job[key])
        return {**value,'jobId':job_id}
    except (KeyError,TypeError,ValueError):
        raise WorkerError('CLAIM_INVALID','The server returned an invalid bounded job claim.') from None

def claim_binding(claim):
    return {key:claim[key] for key in ['jobId','attemptId','fence']}

class Worker:
    def __init__(self,config,client,emit=None,clock=time.monotonic,sleeper=time.sleep):
        self.config,self.client=config.validate(),client
        self.emit=emit or (lambda value:print(json.dumps(value,ensure_ascii=True),flush=True))
        self.clock,self.sleeper=clock,sleeper
        self.checkpoint=self.config.work_root/'active.json'

    def announce(self,event,**details):self.emit({'event':event,**details})

    def fail(self,claim,code):
        mapped={'WORKER_TIMEOUT':'worker_timeout','WORKER_CANCELLED':'worker_cancelled',
                'LEASE_LOST':'lease_lost','RESULT_INVALID':'result_invalid','RESULT_TOO_COMPLEX':'result_too_complex',
                'GEE_ACCESS_DENIED':'gee_unavailable','GEE_NETWORK':'gee_unavailable','NO_SAR_SCENE':'input_invalid',
                'NO_VALID_PIXELS':'input_invalid','AOI_INVALID':'input_invalid','INPUT_VALIDITY':'input_invalid'}
        public_code=mapped.get(code,'pipeline_error')
        return self.client.rpc('fail',{**claim_binding(claim),'errorCode':public_code,'errorMessage':'Local CPU worker did not complete this attempt.'})

    def _publish(self,state):
        claim=state['claim'];path=contained(state['analysisPath'],self.config.work_root)
        if not path.is_file() or path.stat().st_size>MAX_JSON_BYTES:
            raise WorkerError('RESULT_INVALID','The local result is unavailable or too large.')
        raw=path.read_bytes()
        if hashlib.sha256(raw).hexdigest()!=state['analysisSha256']:
            raise WorkerError('RESULT_INVALID','The local result changed after its publication checkpoint.')
        analysis=json.loads(raw)
        payload={**claim_binding(claim),'mutationId':state['mutationId'],'analysis':analysis}
        for attempt in range(3):
            try:
                receipt=self.client.rpc('publish',payload)
                if not isinstance(receipt,dict) or receipt.get('status')!='succeeded' or receipt.get('jobId')!=claim['jobId'] or not isinstance(receipt.get('resultId'),str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,160}',receipt['resultId']):
                    raise WorkerError('PUBLISH_RESPONSE_INVALID','The result publication receipt was invalid.',retryable=True)
                self.checkpoint.unlink(missing_ok=True)
                self.announce('published',jobId=claim['jobId'],resultId=receipt['resultId'])
                return receipt
            except WorkerError as error:
                if not error.retryable:raise
                if attempt<2:self.sleeper(1+attempt)
        raise WorkerError('PUBLISH_UNCERTAIN','Publication could not be confirmed. Its checkpoint is retained for the same idempotent retry.',retryable=True)

    def recover(self):
        if not self.checkpoint.exists():return None
        if self.checkpoint.stat().st_size>65536:
            raise WorkerError('CHECKPOINT_INVALID','The local attempt checkpoint is invalid.')
        state=json.loads(self.checkpoint.read_text(encoding='utf-8'))
        claim=validate_claim(state['claim'])
        if state.get('phase')=='publishing':
            return self._publish(state)
        # A prior parent may have died while its CPU child was still running.
        # Kill only the recorded process whose create-time AND command match.
        process_info=state.get('child')
        if process_info:
            import psutil
            try:
                child=psutil.Process(process_info['pid'])
                if abs(child.create_time()-process_info['created'])<.01 and child.cmdline()==process_info['command']:
                    child.terminate()
                    try:child.wait(5)
                    except psutil.TimeoutExpired:child.kill();child.wait(5)
            except psutil.NoSuchProcess:pass
        # Never restart a pipeline automatically from a stale local claim.
        # Let the DB decide whether its lease is current and when to reclaim.
        try:self.fail(claim,'WORKER_RESTARTED')
        except WorkerError as error:
            if error.retryable:raise
        self.checkpoint.unlink(missing_ok=True)
        return None

    def process(self,claim):
        import psutil
        claim=validate_claim(claim);binding=claim_binding(claim)
        attempt_root=contained(self.config.work_root/claim['jobId']/claim['attemptId'],self.config.work_root)
        attempt_root.mkdir(parents=True,exist_ok=True)
        area=attempt_root/'area.geojson';save_json(area,claim['job']['geometry'])
        command=[self.config.python,'-B',str(self.config.pipeline),'analyze','--area',str(area),'--output',str(attempt_root/'pipeline')]
        for key,option in [('start','--start'),('end','--end')]:
            if claim['job'].get(key):command.extend([option,claim['job'][key]])
        if self.config.model:command.extend(['--model',self.config.model])
        if self.config.env_file:command.extend(['--env-file',self.config.env_file])
        state={'phase':'processing','claim':claim,'attemptRoot':str(attempt_root),'startedAt':datetime.now(timezone.utc).isoformat()}
        save_json(self.checkpoint,state)
        flags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0
        child=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace',bufsize=1,
            creationflags=flags,env={**os.environ,'PYTHONIOENCODING':'utf-8','PYTHONDONTWRITEBYTECODE':'1'})
        native=psutil.Process(child.pid)
        state['child']={'pid':child.pid,'created':native.create_time(),'command':command}
        save_json(self.checkpoint,state)
        lines=queue.Queue(maxsize=256)
        def collect():
            for line in child.stdout:
                if len(line)>65536:continue
                try:value=json.loads(line)
                except (ValueError,TypeError):continue
                if isinstance(value,dict):
                    try:lines.put(value,timeout=1)
                    except queue.Full:pass
        reader=threading.Thread(target=collect,daemon=True);reader.start()
        started=self.clock();heartbeat_at=started
        terminal=None;error_code=None
        self.announce('processing',jobId=claim['jobId'])
        try:
            while child.poll() is None or reader.is_alive() or not lines.empty():
                if self.clock()-started>self.config.timeout_seconds:
                    raise WorkerError('WORKER_TIMEOUT','The local CPU attempt exceeded its deadline.')
                if self.clock()>=heartbeat_at:
                    heartbeat=self.client.rpc('heartbeat',binding)
                    if isinstance(heartbeat,dict) and heartbeat.get('cancelRequested'):
                        raise WorkerError('WORKER_CANCELLED','This analysis was cancelled.')
                    heartbeat_at=self.clock()+self.config.heartbeat_seconds
                try:
                    if native.is_running() and native.memory_info().rss>self.config.max_rss_mib*2**20:
                        raise WorkerError('WORKER_MEMORY_LIMIT','The CPU child exceeded the local memory watchdog limit.')
                except psutil.NoSuchProcess:pass
                try:value=lines.get(timeout=.1)
                except queue.Empty:continue
                stage=value.get('stage')
                if stage in STAGES:
                    progress={**binding,'stage':stage}
                    count,total=value.get('processedTiles'),value.get('totalTiles')
                    if isinstance(count,int) and isinstance(total,int) and 0<=count<=total<=100:
                        progress.update(processedTiles=count,totalTiles=total)
                    self.client.rpc('progress',progress)
                    self.announce('progress',jobId=claim['jobId'],stage=stage,**({k:progress[k] for k in ['processedTiles','totalTiles']} if 'processedTiles'in progress else {}))
                if stage=='failed':error_code=value.get('code')
                if 'receipt'in value:terminal=value
            child.wait(timeout=5)
            if child.returncode!=0 or not terminal or terminal.get('status')!='completed':
                raise WorkerError(error_code if isinstance(error_code,str) and re.fullmatch(r'[A-Z_]{1,64}',error_code) else 'PIPELINE_FAILED','The local CPU pipeline did not complete.')
            receipt_path=contained(terminal['receipt'],attempt_root)
            if not receipt_path.is_file() or receipt_path.stat().st_size>2_000_000:
                raise WorkerError('RESULT_INVALID','The local completion receipt is invalid.')
            receipt=json.loads(receipt_path.read_text(encoding='utf-8'))
            result_root=contained(receipt['resultDirectory'],attempt_root)
            analysis_path=contained(result_root/'analysis.local.json',attempt_root)
            if receipt.get('status')!='completed' or not analysis_path.is_file() or analysis_path.stat().st_size>MAX_JSON_BYTES:
                raise WorkerError('RESULT_INVALID','The completed local result is invalid or too large.')
            state.update(phase='publishing',analysisPath=str(analysis_path),analysisSha256=hashlib.sha256(analysis_path.read_bytes()).hexdigest(),mutationId=str(uuid.uuid4()))
            save_json(self.checkpoint,state)
            self.client.rpc('progress',{**binding,'stage':'publishing'})
            return self._publish(state)
        except WorkerError as error:
            if child.poll() is None:
                child.terminate()
                try:child.wait(5)
                except subprocess.TimeoutExpired:child.kill();child.wait(5)
            if state.get('phase')=='publishing' and error.retryable:
                # Unknown committed publication must be reconciled by retrying
                # the same payload, not converted into a failed/new attempt.
                self.announce('publication_pending',jobId=claim['jobId'],code=error.code)
                raise
            try:self.fail(claim,error.code)
            except WorkerError:pass
            self.checkpoint.unlink(missing_ok=True)
            self.announce('attempt_failed',jobId=claim['jobId'],code=error.code)
            if error.status in (401,403):raise
            return None
        finally:
            if child.poll() is None:
                child.terminate()
                try:child.wait(5)
                except subprocess.TimeoutExpired:child.kill();child.wait(5)
            child.stdout.close();reader.join(timeout=1)

    def loop(self,once=False):
        idle=0;failures=0
        while True:
            try:
                self.recover()
                self.client.rpc('presence',{})
                claim=validate_claim(self.client.rpc('claim',{}))
                if claim:
                    idle=0;self.process(claim)
                else:
                    idle+=1;self.announce('waiting')
                failures=0
            except WorkerError as error:
                if not error.retryable:raise
                failures+=1
                self.announce('connection_wait',code=error.code,retry=failures)
                if failures>=5 or once:raise
                self.sleeper(min(60,2**failures));continue
            if once:return 0
            self.sleeper(self.config.poll_seconds if idle<12 else min(60,self.config.poll_seconds*6))

def load_config(path,local_qa=False):
    path=Path(path).resolve()
    if path.stat().st_size>16384:raise WorkerError('CONFIG_INVALID','Worker configuration is too large.')
    value=json.loads(path.read_text(encoding='utf-8-sig'))
    allowed={'baseUrl','publishableKey','sessionFile','workRoot','pipelinePath','pythonPath','modelPath','envFile','heartbeatSeconds','pollSeconds','timeoutSeconds','maxRssMiB'}
    if not isinstance(value,dict) or set(value)-allowed:raise WorkerError('CONFIG_INVALID','Worker configuration contains unsupported settings.')
    base=path.parent
    return Config(base_url=value.get('baseUrl',PRODUCTION_URL),publishable_key=value.get('publishableKey',''),
        session_file=(base/value.get('sessionFile','machine-session.dpapi')),work_root=(base/value.get('workRoot','work')),
        pipeline=(base/value.get('pipelinePath',str(Path(__file__).with_name('pipeline.py')))),python=value.get('pythonPath',sys.executable),
        model=value.get('modelPath'),env_file=value.get('envFile'),heartbeat_seconds=value.get('heartbeatSeconds',20),
        poll_seconds=value.get('pollSeconds',10),timeout_seconds=value.get('timeoutSeconds',1800),max_rss_mib=value.get('maxRssMiB',2048),local_qa=local_qa).validate()

def main():
    parser=argparse.ArgumentParser(description='XEDO registered local CPU worker; outbound connections only.')
    parser.add_argument('command',choices=['login','run','status','logout'])
    parser.add_argument('--config',required=True)
    parser.add_argument('--local-qa',action='store_true',help='Allow only the explicit http://127.0.0.1:5193 QA endpoint.')
    parser.add_argument('--once',action='store_true')
    args=parser.parse_args()
    try:
        config=load_config(args.config,args.local_qa)
        client=RpcClient(config,SessionStore(config.session_file,config.base_url))
        if args.command=='login':
            email=input('Registered machine account email: ').strip()
            password=getpass.getpass('Machine account password (not the Inspector password): ')
            result=client.login(email,password);password=None
            print(json.dumps(result,ensure_ascii=True));return 0
        if args.command=='status':
            print(json.dumps(client.rpc('presence',{}),ensure_ascii=True));return 0
        if args.command=='logout':client.logout();print('{"signedOut":true}');return 0
        return Worker(config,client).loop(args.once)
    except KeyboardInterrupt:
        print('{"event":"stopped"}');return 130
    except WorkerError as error:
        print(json.dumps({'event':'worker_error','code':error.code,'message':str(error),'retryable':error.retryable},ensure_ascii=True));return 2
    except Exception:
        # Auth transport/file errors may contain secrets: no raw traceback.
        print('{"event":"worker_error","code":"WORKER_UNAVAILABLE","message":"The local worker could not continue. Check its configuration and protected session."}');return 2

if __name__=='__main__':sys.exit(main())
