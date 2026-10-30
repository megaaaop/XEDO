import importlib.util
import json
import os
from pathlib import Path
import tempfile
import time
import unittest
import uuid

HERE=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('remote_worker',HERE/'remote_worker.py')
worker=importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name]=worker
spec.loader.exec_module(worker)
TMP=HERE.parents[1]/'output/local-ai-worker-tests'
TMP.mkdir(exist_ok=True)
tempfile.tempdir=str(TMP)

class Protector:
    def protect(self,value):return bytes(v^0x5a for v in value)
    def unprotect(self,value):return bytes(v^0x5a for v in value)

class Response:
    def __init__(self,status,value):self.status_code,self.value=status,value
    def json(self):return self.value

class Transport:
    def __init__(self,responses):self.responses=list(responses);self.calls=[]
    def request(self,*args,**kwargs):
        self.calls.append((args,kwargs));response=self.responses.pop(0)
        if isinstance(response,Exception):raise response
        return response

def config(root,**kwargs):
    return worker.Config(worker.QA_URL,'qa-public-key',root/'session.bin',root/'work',root/'pipeline.py',heartbeat_seconds=.1,poll_seconds=.1,local_qa=True,**kwargs)

def session():return {'access_token':'access-secret','refresh_token':'refresh-secret','expires_at':time.time()+3000,'user_id':str(uuid.uuid4())}

def claim():
    job_id=str(uuid.uuid4())
    return {'jobId':job_id,'attemptId':str(uuid.uuid4()),'fence':1,'leaseExpiresAt':'2099-01-01T00:00:00Z',
            'job':{'jobId':job_id,'geometry':{'type':'Polygon','coordinates':[[[101,12],[101.01,12],[101.01,12.01],[101,12]]]},'start':'2026-10-01','end':'2026-10-30'}}

FIXTURE='''import argparse,json,pathlib,time
p=argparse.ArgumentParser();p.add_argument('cmd');p.add_argument('--area');p.add_argument('--output');p.add_argument('--start');p.add_argument('--end');p.add_argument('--model');p.add_argument('--env-file');a=p.parse_args()
out=pathlib.Path(a.output)/'fixture-run';out.mkdir(parents=True)
print(json.dumps({'stage':'searching'}),flush=True)
time.sleep(SLEEP)
print(json.dumps({'stage':'inferencing','processedTiles':1,'totalTiles':1}),flush=True)
result=out/'model-output';result.mkdir()
(result/'analysis.local.json').write_text(json.dumps({'schemaVersion':'local-fixture','resultId':'fixture-run','candidates':{'type':'FeatureCollection','features':[]}}))
r=out/'run-receipt.json';r.write_text(json.dumps({'status':'completed','resultDirectory':str(result)}))
print(json.dumps({'stage':'packaging'}),flush=True)
print(json.dumps({'receipt':str(r),'status':'completed'}),flush=True)
'''

class Client:
    def __init__(self,cancel=False,uncertain=0):self.calls=[];self.cancel=cancel;self.uncertain=uncertain
    def rpc(self,action,payload):
        self.calls.append((action,payload))
        if action=='heartbeat':return {'cancelRequested':self.cancel,'leaseExpiresAt':'2099-01-01T00:00:00Z'}
        if action=='publish':
            if self.uncertain:
                self.uncertain-=1
                raise worker.WorkerError('NETWORK_UNAVAILABLE','not confirmed',retryable=True)
            return {'status':'succeeded','resultId':'server-result','jobId':payload['jobId'],'analysisRef':{}}
        return {}

class RemoteWorkerTests(unittest.TestCase):
    def test_endpoint_requires_explicit_loopback_qa(self):
        with tempfile.TemporaryDirectory() as d:
            c=config(Path(d));c.local_qa=False
            with self.assertRaises(worker.WorkerError):c.validate()
            c.local_qa=True;c.base_url='http://localhost:5193'
            with self.assertRaises(worker.WorkerError):c.validate()
            c.base_url='https://evil.example'
            with self.assertRaises(worker.WorkerError):c.validate()

    def test_no_secret_or_service_role_key(self):
        with tempfile.TemporaryDirectory() as d:
            c=config(Path(d));c.publishable_key='sb_secret_forbidden'
            with self.assertRaises(worker.WorkerError):c.validate()

    def test_store_is_protected_and_endpoint_bound(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'protected.bin';store=worker.SessionStore(path,worker.QA_URL,Protector())
            original=session();store.save(original)
            self.assertNotIn(b'access-secret',path.read_bytes());self.assertNotIn(b'refresh-secret',path.read_bytes())
            self.assertEqual(store.load(),original)
            with self.assertRaises(worker.WorkerError):worker.SessionStore(path,worker.PRODUCTION_URL,Protector()).load()

    @unittest.skipUnless(os.name=='nt','Windows DPAPI only')
    def test_actual_current_user_dpapi_roundtrip(self):
        p=worker.WindowsProtector();cipher=p.protect(b'software-fixture-not-a-password')
        self.assertNotEqual(cipher,b'software-fixture-not-a-password')
        self.assertEqual(p.unprotect(cipher),b'software-fixture-not-a-password')

    def test_refresh_then_rpc_preserves_machine_identity(self):
        with tempfile.TemporaryDirectory() as d:
            c=config(Path(d));store=worker.SessionStore(c.session_file,c.base_url,Protector());auth=session();auth['expires_at']=0;store.save(auth)
            t=Transport([Response(200,{'access_token':'new-access','refresh_token':'new-refresh','expires_in':3600,'user':{'id':auth['user_id']}}),Response(200,{'online':True})])
            client=worker.RpcClient(c,store,t,sleeper=lambda value:None)
            self.assertEqual(client.rpc('presence',{}),{'online':True})
            self.assertEqual(t.calls[1][1]['headers']['Authorization'],'Bearer new-access')
            self.assertEqual(t.calls[1][1]['json'],{'p_action':'presence','p_payload':{}})

    def test_wrong_machine_identity_during_refresh_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            c=config(Path(d));store=worker.SessionStore(c.session_file,c.base_url,Protector());auth=session();auth['expires_at']=0;store.save(auth)
            t=Transport([Response(200,{'access_token':'new','refresh_token':'refresh','expires_in':3600,'user':{'id':str(uuid.uuid4())}})])
            with self.assertRaises(worker.WorkerError):worker.RpcClient(c,store,t).rpc('presence',{})

    def test_rejected_refresh_requires_machine_reconnect_without_leaking_response(self):
        for status in [400,401,403]:
            with self.subTest(status=status), tempfile.TemporaryDirectory() as d:
                c=config(Path(d));store=worker.SessionStore(c.session_file,c.base_url,Protector())
                auth=session();auth['expires_at']=0;store.save(auth)
                t=Transport([Response(status,{'code':'refresh_token_not_found','message':'private-refresh-secret'})])
                with self.assertRaises(worker.WorkerError) as caught:worker.RpcClient(c,store,t).rpc('presence',{})
                self.assertEqual(caught.exception.code,'MACHINE_SIGN_IN_REQUIRED')
                self.assertNotIn('private-refresh',str(caught.exception))

    def test_explicit_reconnect_can_replace_unreadable_old_session(self):
        with tempfile.TemporaryDirectory() as d:
            c=config(Path(d));store=worker.SessionStore(c.session_file,c.base_url,Protector())
            c.session_file.write_bytes(b'invalid-old-protected-session')
            user=str(uuid.uuid4());t=Transport([Response(200,{'access_token':'new-access','refresh_token':'new-refresh','expires_in':3600,'user':{'id':user}}),Response(200,{'online':True})])
            client=worker.RpcClient(c,store,t,load_session=False)
            client.login('cpu@example.invalid','fixture-password')
            self.assertEqual(store.load()['user_id'],user)
            self.assertNotIn(b'new-refresh',c.session_file.read_bytes())

    def test_wrong_account_on_reconnect_preserves_previous_protected_session(self):
        with tempfile.TemporaryDirectory() as d:
            c=config(Path(d));store=worker.SessionStore(c.session_file,c.base_url,Protector())
            store.save(session());before=c.session_file.read_bytes()
            t=Transport([Response(200,{'access_token':'inspector-access','refresh_token':'inspector-refresh','expires_in':3600,'user':{'id':str(uuid.uuid4())}}),Response(403,{'code':'MACHINE_NOT_REGISTERED'})])
            client=worker.RpcClient(c,store,t,load_session=False)
            with self.assertRaises(worker.WorkerError):client.login('wrong@example.invalid','fixture-password')
            self.assertEqual(c.session_file.read_bytes(),before)

    def test_reconnect_short_token_or_401_cannot_persist_before_registry_verification(self):
        for duration,status in [(10,403),(3600,401)]:
            with self.subTest(duration=duration,status=status), tempfile.TemporaryDirectory() as d:
                c=config(Path(d));store=worker.SessionStore(c.session_file,c.base_url,Protector());store.save(session());before=c.session_file.read_bytes()
                t=Transport([Response(200,{'access_token':'unverified-access','refresh_token':'unverified-refresh','expires_in':duration,'user':{'id':str(uuid.uuid4())}}),Response(status,{'code':'REJECTED'})])
                client=worker.RpcClient(c,store,t,load_session=False)
                with self.assertRaises(worker.WorkerError):client.login('wrong@example.invalid','fixture-password')
                self.assertEqual(len(t.calls),2)
                self.assertEqual(c.session_file.read_bytes(),before)

    def test_transient_request_bounded_and_same_body(self):
        with tempfile.TemporaryDirectory() as d:
            c=config(Path(d));store=worker.SessionStore(c.session_file,c.base_url,Protector());store.save(session())
            t=Transport([ConnectionError('secret should not be logged'),Response(200,{'online':True})])
            client=worker.RpcClient(c,store,t,sleeper=lambda value:None)
            self.assertEqual(client.rpc('presence',{}),{'online':True})
            self.assertEqual(t.calls[0][1]['json'],t.calls[1][1]['json'])
            self.assertFalse(t.calls[0][1]['allow_redirects'])

    def test_no_auth_or_arbitrary_server_error_leak(self):
        with tempfile.TemporaryDirectory() as d:
            c=config(Path(d));store=worker.SessionStore(c.session_file,c.base_url,Protector())
            with self.assertRaises(worker.WorkerError):worker.RpcClient(c,store,Transport([])).rpc('claim',{})
            store.save(session());t=Transport([Response(403,{'code':'bad value https://secret','message':'bearer secret'})])
            with self.assertRaises(worker.WorkerError) as caught:worker.RpcClient(c,store,t).rpc('claim',{})
            self.assertNotIn('secret',str(caught.exception));self.assertEqual(caught.exception.code,'RPC_REJECTED')

    def test_logout_accepts_empty_204_and_clears_protected_session(self):
        with tempfile.TemporaryDirectory() as d:
            c=config(Path(d));store=worker.SessionStore(c.session_file,c.base_url,Protector());store.save(session())
            client=worker.RpcClient(c,store,Transport([Response(204,None)]));client.logout()
            self.assertIsNone(client.session);self.assertFalse(store.path.exists())

    def test_claim_rejects_remote_command_and_bad_binding(self):
        value=claim();self.assertEqual(worker.validate_claim(value)['fence'],1)
        for field,bad in [('jobId','../escape'),('attemptId','bad'),('fence',True)]:
            value=claim();value[field]=bad
            with self.assertRaises(worker.WorkerError):worker.validate_claim(value)
        value=claim();value['job']['jobId']=str(uuid.uuid4())
        with self.assertRaises(worker.WorkerError):worker.validate_claim(value)

    def test_artifact_path_must_remain_inside_attempt(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            with self.assertRaises(worker.WorkerError):worker.contained(root/'..'/'escape',root)

    def test_real_child_progress_heartbeat_and_publication(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/'pipeline.py').write_text(FIXTURE.replace('SLEEP','.35'))
            client=Client();events=[];instance=worker.Worker(config(root),client,events.append)
            receipt=instance.process(claim())
            self.assertEqual(receipt['resultId'],'server-result')
            self.assertGreaterEqual(sum(action=='heartbeat' for action,payload in client.calls),2)
            progress=[p for action,p in client.calls if action=='progress']
            self.assertTrue(any(p.get('processedTiles')==1 for p in progress))
            self.assertFalse(instance.checkpoint.exists())
            self.assertTrue(any(e['event']=='published' for e in events))

    def test_cancel_terminates_child_and_never_publishes(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/'pipeline.py').write_text(FIXTURE.replace('SLEEP','10'))
            client=Client(cancel=True);instance=worker.Worker(config(root),client,lambda event:None)
            started=time.monotonic();self.assertIsNone(instance.process(claim()))
            self.assertLess(time.monotonic()-started,5)
            self.assertFalse(any(a=='publish' for a,p in client.calls))
            self.assertTrue(any(a=='fail' and p['errorCode']=='worker_cancelled' for a,p in client.calls))

    def test_deadline_terminates_child(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/'pipeline.py').write_text(FIXTURE.replace('SLEEP','10'))
            client=Client();instance=worker.Worker(config(root,timeout_seconds=1),client,lambda event:None)
            self.assertIsNone(instance.process(claim()))
            self.assertTrue(any(a=='fail' and p['errorCode']=='worker_timeout' for a,p in client.calls))
            self.assertFalse(any(a=='publish' for a,p in client.calls))

    def test_publication_retries_same_mutation_and_payload(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/'pipeline.py').write_text(FIXTURE.replace('SLEEP','0'))
            client=Client(uncertain=2);instance=worker.Worker(config(root),client,lambda event:None,sleeper=lambda duration:None)
            receipt=instance.process(claim());self.assertEqual(receipt['status'],'succeeded')
            writes=[p for a,p in client.calls if a=='publish']
            self.assertEqual(len(writes),3);self.assertTrue(all(p==writes[0] for p in writes))

    def test_uncertain_publication_survives_restart_without_new_pipeline(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/'pipeline.py').write_text(FIXTURE.replace('SLEEP','0'))
            client=Client(uncertain=3);instance=worker.Worker(config(root),client,lambda event:None,sleeper=lambda duration:None)
            with self.assertRaises(worker.WorkerError):instance.process(claim())
            self.assertTrue(instance.checkpoint.exists())
            value=json.loads(instance.checkpoint.read_text());self.assertEqual(value['phase'],'publishing')
            mutation=value['mutationId'];receipt=instance.recover();self.assertEqual(receipt['status'],'succeeded')
            writes=[p for a,p in client.calls if a=='publish'];self.assertTrue(all(p['mutationId']==mutation for p in writes))
            self.assertFalse(any(a=='fail' for a,p in client.calls))

    def test_recovery_detects_changed_result_file(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/'pipeline.py').write_text(FIXTURE.replace('SLEEP','0'))
            client=Client(uncertain=3);instance=worker.Worker(config(root),client,lambda event:None,sleeper=lambda duration:None)
            with self.assertRaises(worker.WorkerError):instance.process(claim())
            state=json.loads(instance.checkpoint.read_text());Path(state['analysisPath']).write_text('{}')
            with self.assertRaises(worker.WorkerError) as caught:instance.recover()
            self.assertEqual(caught.exception.code,'RESULT_INVALID')

if __name__=='__main__':unittest.main()
