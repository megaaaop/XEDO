"""Offline contract checks only: fake GoTrue and storage; no actual credentials."""
import importlib.util
import io
import json
import contextlib
from pathlib import Path
import sys
import runpy
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[3]
HERE=ROOT/'scripts'
spec=importlib.util.spec_from_file_location('connect_helper',HERE/'local-ai-account-connect.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
TEMP=ROOT/'output/local-ai-account-tests';TEMP.mkdir(parents=True,exist_ok=True);tempfile.tempdir=str(TEMP)
PRIMARY_ID='7bc42db4-0801-49c7-a19d-d85f7ce60872'
PRIMARY_EMAIL='primary@example.test'
UID='a7f0087b-d29d-4720-9413-cb083dba7f85'

class Response:
    def __init__(self,status,value):self.status_code,self.value=status,value
    def json(self):return self.value

class HelperTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.saved=[];self.calls=[]
        folder=self.root/'local-data/live-ai-qualification';folder.mkdir(parents=True,exist_ok=True)
        (folder/'account-identities.json').write_text(json.dumps({'primaryUserId':PRIMARY_ID,'primaryEmail':PRIMARY_EMAIL}),encoding='utf-8')
        self.body={'role':'machine','email':'machine@example.test','password':'fixture-password-only','publishableKey':'sb_publishable_fixture'}
        self.auth=Response(200,{'user':{'id':UID,'email':'machine@example.test'},'access_token':'fixture-access-token','refresh_token':'fixture-refresh-token','expires_in':3600})
        self.user=Response(200,{'id':UID,'email':'machine@example.test'})
        owner=self
        class HTTP:
            def post(self,url,**kwargs):owner.calls.append(('POST',url,kwargs));return owner.auth
            def get(self,url,**kwargs):owner.calls.append(('GET',url,kwargs));return owner.user
        class Store:
            def __init__(self,path,base):self.path,self.base=path,base
            def save(self,value):owner.saved.append((self.path,self.base,value))
        self.requests=types.SimpleNamespace(Session=HTTP,RequestException=RuntimeError)
        self.worker=types.SimpleNamespace(SessionStore=Store,save_json=lambda p,v:p.write_text(json.dumps(v),encoding='utf-8'))
    def tearDown(self):self.tmp.cleanup()
    def run_body(self,body=None,**environment):
        encoded=json.dumps(self.body if body is None else body).encode()
        with patch.dict('os.environ',{'XEDO_QA_ROOT':str(self.root),'XEDO_LIVE_QA_DATA':str(self.root/'local-data/live-ai-qualification'),**environment}),patch.object(sys,'stdin',types.SimpleNamespace(buffer=io.BytesIO(encoded))),patch.dict(sys.modules,{'requests':self.requests,'remote_worker':self.worker}):return helper.run()
    def test_password_grant_and_get_user_then_store_delegation_no_presence(self):
        result=self.run_body();self.assertTrue(result['ok']);self.assertEqual(result['account']['userId'],UID)
        self.assertEqual([c[:2]for c in self.calls],[('POST',helper.BASE+'/auth/v1/token?grant_type=password'),('GET',helper.BASE+'/auth/v1/user')])
        self.assertEqual(self.calls[0][2]['json']['password'],'fixture-password-only');self.assertFalse(self.calls[0][2]['allow_redirects'])
        self.assertEqual(self.saved[0][0].name,'machine.session.dpapi');self.assertEqual(self.saved[0][1],helper.BASE)
        self.assertEqual(self.saved[0][2]['refresh_token'],'fixture-refresh-token')
        self.assertEqual(set(self.saved[0][2]),{'access_token','refresh_token','expires_at','user_id','email'})
        metadata=json.loads((self.root/'local-data/live-ai-qualification/machine.account.json').read_text())
        self.assertNotIn('password',json.dumps(metadata));self.assertNotIn('token',json.dumps(metadata));self.assertEqual(metadata,result['account'])
    def test_invalid_input_and_admin_key_never_reach_auth(self):
        for body in [{**self.body,'role':'admin'},{**self.body,'publishableKey':'service_role_fixture'},{**self.body,'ownerId':UID},{**self.body,'baseUrl':'https://other.example'},{**self.body,'password':'x'*513},{**self.body,'role':'primary'}]:
            with self.assertRaises(helper.SafeFailure):self.run_body(body)
        self.assertEqual(self.calls,[]);self.assertEqual(self.saved,[])
    def test_existing_primary_cannot_be_machine(self):
        with self.assertRaises(helper.SafeFailure)as found:self.run_body({**self.body,'email':PRIMARY_EMAIL})
        self.assertEqual(found.exception.code,'ACCOUNT_ROLE_MISMATCH');self.assertEqual(self.calls,[])
    def test_other_role_metadata_prevents_reusing_same_account(self):
        folder=self.root/'local-data/live-ai-qualification';folder.mkdir(parents=True,exist_ok=True)
        (folder/'secondary.account.json').write_text(json.dumps({'email':self.body['email'],'userId':UID}))
        with self.assertRaises(helper.SafeFailure)as found:self.run_body()
        self.assertEqual(found.exception.code,'ACCOUNT_ROLE_MISMATCH');self.assertEqual(self.calls,[])
    def test_bad_auth_and_rate_limit_have_safe_codes_no_store(self):
        for status,code in [(400,'LOGIN_FAILED'),(401,'LOGIN_FAILED'),(429,'RATE_LIMITED'),(500,'AUTH_UNAVAILABLE')]:
            self.auth=Response(status,{'message':'secret fixture provider detail'})
            with self.assertRaises(helper.SafeFailure)as found:self.run_body()
            self.assertEqual(found.exception.code,code)
        self.assertEqual(self.saved,[])
    def test_verified_identity_must_match_and_no_storage_on_failure(self):
        self.user=Response(200,{'id':'4f3f591a-f2fb-429b-8ad5-5842f55db6f0','email':self.body['email']})
        with self.assertRaises(helper.SafeFailure)as found:self.run_body()
        self.assertEqual(found.exception.code,'ACCOUNT_VERIFY_FAILED');self.assertEqual(self.saved,[])
    def test_sessions_cannot_escape_ignored_local_data(self):
        with self.assertRaises(helper.SafeFailure)as found:self.run_body(XEDO_LIVE_QA_DATA=str(self.root/'public'))
        self.assertEqual(found.exception.code,'LOCAL_PATH_INVALID');self.assertEqual(self.calls,[])
    def test_cli_redacts_upstream_error_body_and_password(self):
        self.auth=Response(400,{'message':'fixture-password-only private provider detail fixture-access-token'})
        output=io.StringIO()
        with patch.dict('os.environ',{'XEDO_QA_ROOT':str(self.root),'XEDO_LIVE_QA_DATA':str(self.root/'local-data/live-ai-qualification')}),patch.object(sys,'stdin',types.SimpleNamespace(buffer=io.BytesIO(json.dumps(self.body).encode()))),patch.dict(sys.modules,{'requests':self.requests,'remote_worker':self.worker}),contextlib.redirect_stdout(output):
            with self.assertRaises(SystemExit)as exited:runpy.run_path(str(HERE/'local-ai-account-connect.py'),run_name='__main__')
        self.assertEqual(exited.exception.code,2)
        self.assertEqual(json.loads(output.getvalue()),{'ok':False,'code':'LOGIN_FAILED','status':401})
        self.assertNotIn('fixture-password-only',output.getvalue());self.assertNotIn('provider detail',output.getvalue());self.assertNotIn('fixture-access-token',output.getvalue());self.assertEqual(self.saved,[])
    @unittest.skipUnless(sys.platform=='win32','Windows DPAPI only')
    def test_cli_fake_auth_actual_current_user_dpapi_stores_session_only(self):
        checkout=ROOT
        remote_spec=importlib.util.spec_from_file_location('remote_worker_helper_contract',checkout/'workers/local-ai/remote_worker.py')
        remote=importlib.util.module_from_spec(remote_spec);sys.modules[remote_spec.name]=remote;remote_spec.loader.exec_module(remote)
        output=io.StringIO()
        folder=self.root/'local-data/live-ai-qualification'
        with patch.dict('os.environ',{'XEDO_QA_ROOT':str(self.root),'XEDO_LIVE_QA_DATA':str(folder)}),patch.object(sys,'stdin',types.SimpleNamespace(buffer=io.BytesIO(json.dumps(self.body).encode()))),patch.dict(sys.modules,{'requests':self.requests,'remote_worker':remote}),contextlib.redirect_stdout(output):
            runpy.run_path(str(HERE/'local-ai-account-connect.py'),run_name='__main__')
        public=json.loads(output.getvalue());self.assertTrue(public['ok']);self.assertEqual(public['account']['userId'],UID)
        for secret in ['fixture-password-only','fixture-access-token','fixture-refresh-token']:self.assertNotIn(secret,output.getvalue())
        encrypted=(folder/'machine.session.dpapi').read_bytes();self.assertTrue(encrypted.startswith(b'XEDO-DPAPI-1\0'))
        for secret in [b'fixture-password-only',b'fixture-access-token',b'fixture-refresh-token']:self.assertNotIn(secret,encrypted)
        session=remote.SessionStore(folder/'machine.session.dpapi',helper.BASE).load()
        self.assertEqual(set(session),{'access_token','refresh_token','expires_at','user_id','email'});self.assertEqual(session['access_token'],'fixture-access-token');self.assertNotIn('password',session)
        self.assertEqual(len(self.calls),2,'No worker presence/RPC called')

    def test_missing_identity_config_prevents_auth_request(self):
        (self.root/'local-data/live-ai-qualification/account-identities.json').unlink()
        with self.assertRaises(helper.SafeFailure) as error:self.run_body()
        self.assertEqual(error.exception.code,'LOCAL_IDENTITY_REQUIRED');self.assertEqual(self.calls,[])
    def test_unknown_identity_config_keys_prevent_auth_request(self):
        (self.root/'local-data/live-ai-qualification/account-identities.json').write_text(json.dumps({'primaryUserId':PRIMARY_ID,'primaryEmail':PRIMARY_EMAIL,'adminKey':'fixture'}),encoding='utf-8')
        with self.assertRaises(helper.SafeFailure):self.run_body()
        self.assertEqual(self.calls,[])
    def test_primary_uid_must_match_config_not_just_email(self):
        self.body.update(role='primary',email=PRIMARY_EMAIL)
        self.auth=Response(200,{'user':{'id':UID,'email':PRIMARY_EMAIL},'access_token':'fixture-access-token','refresh_token':'fixture-refresh-token','expires_in':3600})
        with self.assertRaises(helper.SafeFailure) as error:self.run_body()
        self.assertEqual(error.exception.code,'AUTH_RESPONSE_INVALID');self.assertEqual(self.saved,[])

if __name__=='__main__':unittest.main(verbosity=2)
