"""Offline acceptance contract checks; fake tokens never come from Auth/DPAPI."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[3]
SCRIPT=ROOT/'scripts/qualify-production-ai.py'
spec=importlib.util.spec_from_file_location('draft_production_acceptance',SCRIPT)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
MID='11111111-1111-4111-8111-111111111111'
JID='22222222-2222-4222-8222-222222222222'
RID='XEDO_LOCAL_RESULT_TEST_FIXTURE'

class Stop(Exception):
    def __init__(self,code):self.code=code
def require(ok,code):
    if not ok:raise Stop(code)

class DraftTests(unittest.TestCase):
    def test_no_flag_guard_reads_no_sessions_or_network(self):
        result=subprocess.run([sys.executable,str(SCRIPT)],capture_output=True,text=True,check=True)
        data=json.loads(result.stdout)
        self.assertEqual((data['networkRequests'],data['sessionReads'],data['status']),(0,0,'not_run'))

    def test_fixed_production_cookie_origin_and_identity(self):
        calls=[];reads=[]
        base=types.SimpleNamespace(uid=MID,access=lambda:(reads.append(True)or'fixture.token.signature'))
        transport=types.SimpleNamespace(call=lambda *a,**kw:(calls.append((a,kw))or({'ok':True},200)))
        actor=m.ProductionActor(base,transport,types.SimpleNamespace(require=require))
        self.assertTrue(actor.call('session')['ok'])
        args,kw=calls[0]
        self.assertEqual(args,('GET',m.ORIGIN+'/api/v1/inspector/session'))
        self.assertEqual(kw['headers']['Origin'],m.ORIGIN)
        self.assertEqual(kw['headers']['Cookie'],'__Host-xedo_inspector=fixture.token.signature')
        self.assertNotIn('password',kw);self.assertEqual(len(reads),1)

    def test_path_injection_rejected_before_token_read(self):
        base=types.SimpleNamespace(uid=MID,access=lambda:self.fail('token should not be accessed'))
        actor=m.ProductionActor(base,None,types.SimpleNamespace(require=require))
        for path in ('https://elsewhere.invalid/','../foo?url=x','session#fragment','//evil.invalid'):
            with self.assertRaises(Stop):actor.call(path)

    def test_cross_owner_denies_all_four_resources_and_lists(self):
        calls=[]
        def call(path,expected=(200,)):
            calls.append((path,expected))
            return {'missions':[],'jobs':[],'analyses':[]}
        runner=m.Acceptance.__new__(m.Acceptance);runner.b=types.SimpleNamespace(call=call);runner.q=types.SimpleNamespace(require=require)
        runner.deny(MID,JID,RID)
        self.assertEqual(sum(expected==(404,)for _,expected in calls),4)
        self.assertEqual(len(calls),7)

    def test_one_job_and_mission_reused_on_resume(self):
        calls=[];polls=[];writes=[]
        def api(path,body=None,expected=(200,)):
            calls.append((path,body))
            if path=='missions':return {'missionId':MID,'revision':1}
            if path=='analysis-jobs':return {'jobId':JID,'status':'queued'}
            if path=='analysis-jobs/'+JID:
                polls.append(True)
                stage='searching'if len(polls)==1 else'succeeded'
                return {'status':'running'if stage=='searching'else'succeeded','stage':stage,'jobId':JID,'resultId':None if stage=='searching'else RID}
            if path=='analyses/'+RID:return {'serverRegistered':True,'accuracyValidatedOnGEE':False,'manifest':{'jobId':JID},
              'analysisRef':{'resultId':RID,'manifestSha256':'f'*64},'candidates':{'features':[]},'source':{'assetId':'fixture-scene'}}
            if path=='missions/'+MID:return {'document':{'analysisRef':None},'confirmedReview':None}
            raise AssertionError(path)
        runner=m.Acceptance.__new__(m.Acceptance);runner.root=ROOT
        runner.args=types.SimpleNamespace(html_sha256='a'*64,poll_seconds=30)
        def load_geometry(path):
            value=json.loads(path.read_text());return value.get('geometry',value)
        runner.q=types.SimpleNamespace(require=require,safe_uuid=lambda x:x,load_geometry=load_geometry,QualificationError=Stop)
        runner.a=types.SimpleNamespace(call=api);runner.state={'pollEvents':[]};runner.report={'checks':[]}
        runner.persist=lambda:writes.append(json.dumps(runner.state));runner.deny=lambda *args:None
        with patch.object(m.time,'sleep',lambda _:None):runner.run_job();runner.run_job()
        self.assertEqual(sum(p=='missions'for p,_ in calls),1)
        self.assertEqual(sum(p=='analysis-jobs'for p,_ in calls),1)
        self.assertEqual(runner.state['jobId'],JID)
        self.assertFalse(runner.report['newResult']['zeroCandidatesMeansNoOil'])
        self.assertFalse(runner.report['newResult']['confirmationCreated'])
        self.assertNotIn('access_token',''.join(writes));self.assertNotIn('password',''.join(writes))

    def test_html_hash_gate_stops_before_api_or_mutation(self):
        class Client:
            def __enter__(self):return self
            def __exit__(self,*a):pass
            def get(self,*a,**kw):return types.SimpleNamespace(status_code=200,headers={'Content-Type':'text/html'},content=b'wrong-build')
        runner=m.Acceptance.__new__(m.Acceptance);runner.a=types.SimpleNamespace(uid=MID);runner.b=types.SimpleNamespace(uid=JID)
        runner.q=types.SimpleNamespace(require=require,QualificationError=Stop)
        runner.args=types.SimpleNamespace(html_sha256='a'*64)
        runner.requests=types.SimpleNamespace(Session=Client,RequestException=RuntimeError)
        with self.assertRaises(Stop)as raised:runner.preflight()
        self.assertEqual(raised.exception.code,'DEPLOYED_HTML_HASH_MISMATCH')

if __name__=='__main__':unittest.main(verbosity=2)
