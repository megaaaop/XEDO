import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[3]
HERE=ROOT/'scripts'
TEMP=ROOT/'output/local-ai-browser-session-tests'
TEMP.mkdir(parents=True,exist_ok=True);tempfile.tempdir=str(TEMP)
spec=importlib.util.spec_from_file_location('browser_resume',HERE/'local-ai-browser-session.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
PRIMARY_ID='7bc42db4-0801-49c7-a19d-d85f7ce60872'
PRIMARY_EMAIL='primary@example.test'
KEY='sb_publishable_fixture_only'
FAKE_TOKEN='fixture.access.only'
NOW=1000000

class Response:
    def __init__(self,status=200,value=None):self.status_code=status;self.value=value
    def json(self):return self.value

class Client:
    def __init__(self,session):
        self.session=session;self.refreshes=0;self.requests=[];self.transport=self
        self.responses=[Response(200,{'id':PRIMARY_ID,'email':PRIMARY_EMAIL})]
        self.rpc={'id':PRIMARY_ID,'role':'Inspector'}
    def refresh(self):
        self.refreshes+=1
        self.session={**self.session,'access_token':'refreshed.fixture.only','expires_at':NOW+3600}
    def request(self,*args,**kwargs):
        self.requests.append((args,kwargs));return self.responses.pop(0)
    def _request(self,path,body,access,retries=0):
        self.requests.append((path,body,access,retries));return self.rpc

class Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.folder=self.root/'local-data/live-ai-qualification';self.folder.mkdir(parents=True)
        self.metadata={'role':'primary','userId':PRIMARY_ID,'email':PRIMARY_EMAIL}
        (self.folder/'account-identities.json').write_text(json.dumps({'primaryUserId':PRIMARY_ID,'primaryEmail':PRIMARY_EMAIL}),encoding='utf-8')
        self.write_metadata()
        self.client=Client({'user_id':PRIMARY_ID,'email':PRIMARY_EMAIL,'access_token':FAKE_TOKEN,'expires_at':NOW+600})
    def write_metadata(self):
        (self.folder/'primary.account.json').write_text(json.dumps(self.metadata),encoding='utf-8')
    def run_resume(self,key=KEY):
        return mod.resume(key,self.root,self.folder,store_factory=lambda *_:object(),client_factory=lambda _:self.client,clock=lambda:NOW)
    def test_valid_existing_session_checks_real_paths_without_login_or_new_grants(self):
        result=self.run_resume();self.assertTrue(result['ok']);self.assertEqual(result['accessToken'],FAKE_TOKEN)
        self.assertEqual(result['expiresAt'],(NOW+600)*1000);self.assertEqual(self.client.refreshes,0)
        call=self.client.requests[0];self.assertEqual(call[0],('GET',mod.BASE+'/auth/v1/user'));self.assertFalse(call[1]['allow_redirects'])
        self.assertEqual(self.client.requests[1][0],'/rest/v1/rpc/xedo_inspector')
        self.assertEqual(self.client.requests[1][1],{'p_action':'session','p_payload':{}})
        self.assertNotIn('refresh_token',result)
    def test_expired_session_refreshes_normally_then_validates_user(self):
        self.client.session['expires_at']=NOW-1;self.assertTrue(self.run_resume()['ok']);self.assertEqual(self.client.refreshes,1)
    def test_getuser_401_refreshes_once(self):
        self.client.responses.insert(0,Response(401,{}));self.assertTrue(self.run_resume()['ok']);self.assertEqual(self.client.refreshes,1)
    def test_bad_getuser_identity_fails_before_inspector_rpc(self):
        self.client.responses=[Response(200,{'id':'other','email':PRIMARY_EMAIL})]
        with self.assertRaises(mod.SafeFailure):self.run_resume()
        self.assertEqual(len(self.client.requests),1)
    def test_metadata_mismatch_reads_no_session_or_network(self):
        self.metadata['role']='machine';self.write_metadata()
        with self.assertRaises(mod.SafeFailure):self.run_resume()
        self.assertEqual(self.client.requests,[])
    def test_dpapi_identity_mismatch_has_no_network(self):
        self.client.session['user_id']='other'
        with self.assertRaises(mod.SafeFailure):self.run_resume()
        self.assertEqual(self.client.requests,[])
    def test_inspector_revocation_or_disabled_roster_never_emits_token(self):
        self.client.rpc={'id':PRIMARY_ID,'role':'Other'}
        with self.assertRaises(mod.SafeFailure):self.run_resume()
    def test_token_header_injection_rejected_before_network(self):
        self.client.session['access_token']='x\r\nSet-Cookie: evil'
        with self.assertRaises(mod.SafeFailure):self.run_resume()
        self.assertEqual(self.client.requests,[])
    def test_secret_key_and_outside_folder_rejected(self):
        for key in ['sb_secret_forbidden','eyJ.legacy.key']:
            with self.assertRaises(mod.SafeFailure):self.run_resume(key)
        with self.assertRaises(mod.SafeFailure):mod.resume(KEY,self.root,self.root/'outside')
    def test_errors_are_sanitized_without_private_provider_text(self):
        self.client.request=lambda *_args,**_kw:(_ for _ in ()).throw(RuntimeError('providerSecret '+FAKE_TOKEN))
        with self.assertRaises(mod.SafeFailure) as caught:self.run_resume()
        self.assertNotIn(FAKE_TOKEN,str(caught.exception));self.assertNotIn('providerSecret',str(caught.exception))
    def test_refresh_cannot_switch_primary_identity(self):
        self.client.session['expires_at']=NOW-1
        def bad_refresh():self.client.session={**self.client.session,'user_id':'other'}
        self.client.refresh=bad_refresh
        with self.assertRaises(mod.SafeFailure):self.run_resume()
        self.assertEqual(self.client.requests,[])
    def test_cli_is_disabled_without_private_child_env_and_never_reads_real_sessions(self):
        import os
        env={k:v for k,v in os.environ.items() if not k.startswith('XEDO_')}
        process=subprocess.run([sys.executable,'-B',str(HERE/'local-ai-browser-session.py')],input='{}',capture_output=True,text=True,env=env)
        self.assertEqual(process.returncode,2);self.assertEqual(json.loads(process.stdout)['code'],'BROWSER_SESSION_DISABLED');self.assertEqual(process.stderr,'')

    def test_missing_identity_config_fails_before_session_or_network(self):
        (self.folder/'account-identities.json').unlink()
        with self.assertRaises(mod.SafeFailure) as error:self.run_resume()
        self.assertEqual(error.exception.code,'LOCAL_IDENTITY_REQUIRED');self.assertEqual(self.client.requests,[])
    def test_invalid_identity_config_fails_closed(self):
        (self.folder/'account-identities.json').write_text(json.dumps({'primaryUserId':'bad','primaryEmail':PRIMARY_EMAIL}),encoding='utf-8')
        with self.assertRaises(mod.SafeFailure):self.run_resume()
        self.assertEqual(self.client.requests,[])
    def test_oversized_identity_config_fails_closed(self):
        (self.folder/'account-identities.json').write_text('x'*4097,encoding='utf-8')
        with self.assertRaises(mod.SafeFailure):self.run_resume()
        self.assertEqual(self.client.requests,[])

if __name__=='__main__':unittest.main()
