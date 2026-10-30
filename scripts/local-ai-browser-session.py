"""PRIVATE CHILD PIPE ONLY: resume the already connected primary local session.

Never execute manually with real sessions or print the successful return value.
Only the local qualification server consumes stdout and formats an HttpOnly cookie.
No password, grants, new Auth session, custom JWT, admin key or production edit.
"""
from __future__ import annotations
import json
import math
import os
from pathlib import Path
import re
import sys
import time

BASE='https://tstmjnlhwidwtzetqxbu.supabase.co'

class SafeFailure(Exception):
    def __init__(self,code='BROWSER_SESSION_UNAVAILABLE',status=503):
        super().__init__(code);self.code,self.status=code,status

def load_identity(folder):
    try:
        config=Path(folder)/'account-identities.json'
        if config.stat().st_size>4096:raise ValueError()
        value=json.loads(config.read_text(encoding='utf-8'))
        if not isinstance(value,dict) or set(value)!={'primaryUserId','primaryEmail'}:raise ValueError()
        uid,email=value['primaryUserId'],value['primaryEmail']
        if not isinstance(uid,str) or not re.fullmatch(r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}',uid):raise ValueError()
        if not isinstance(email,str) or len(email)>254 or not re.fullmatch(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}',email):raise ValueError()
        return uid.lower(),email.lower()
    except Exception:raise SafeFailure('LOCAL_IDENTITY_REQUIRED',503) from None

def context(environ=os.environ):
    if environ.get('XEDO_LIVE_QA_AUTHORIZED')!='1' or environ.get('XEDO_BROWSER_SESSION_IPC')!='1':
        raise SafeFailure('BROWSER_SESSION_DISABLED',403)
    value=environ.get('XEDO_QA_ROOT')
    if not value:raise SafeFailure('LOCAL_PATH_INVALID')
    root=Path(value).resolve();local=(root/'local-data').resolve()
    folder=Path(environ.get('XEDO_LIVE_QA_DATA') or local/'live-ai-qualification').resolve()
    if not folder.is_relative_to(local):raise SafeFailure('LOCAL_PATH_INVALID')
    return root,folder

def resume(key,root,folder,*,store_factory=None,client_factory=None,clock=time.time):
    if not isinstance(key,str) or not re.fullmatch(r'sb_publishable_[A-Za-z0-9_-]{1,1000}',key):
        raise SafeFailure('PUBLIC_KEY_REQUIRED',422)
    root,folder=Path(root).resolve(),Path(folder).resolve()
    if not folder.is_relative_to((root/'local-data').resolve()):raise SafeFailure('LOCAL_PATH_INVALID')
    primary_id,primary_email=load_identity(folder)
    metadata=folder/'primary.account.json'
    try:
        if metadata.stat().st_size>4096:raise ValueError()
        account=json.loads(metadata.read_text(encoding='utf-8'))
        if account.get('role')!='primary' or account.get('userId')!=primary_id or account.get('email','').lower()!=primary_email:raise ValueError()
    except Exception:raise SafeFailure('PRIMARY_ACCOUNT_REQUIRED',401) from None
    if store_factory is None or client_factory is None:
        sys.path.insert(0,str(root/'workers/local-ai'))
        from remote_worker import Config,SessionStore,RpcClient
        config=Config(base_url=BASE,publishable_key=key,session_file=folder/'primary.session.dpapi',
                      work_root=folder/'browser-session-state',pipeline=root/'workers/local-ai/pipeline.py')
        store=SessionStore(config.session_file,BASE)
        client=RpcClient(config,store)
    else:
        store=store_factory(folder/'primary.session.dpapi',BASE)
        client=client_factory(store)
    def session():
        value=client.session
        if not isinstance(value,dict) or value.get('user_id')!=primary_id:
            raise SafeFailure('PRIMARY_ACCOUNT_REQUIRED',401)
        if value.get('email') and value['email'].lower()!=primary_email:
            raise SafeFailure('PRIMARY_ACCOUNT_REQUIRED',401)
        access=value.get('access_token');expires=value.get('expires_at')
        if not isinstance(access,str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,9999}',access):
            raise SafeFailure('PRIMARY_ACCOUNT_REQUIRED',401)
        if not isinstance(expires,(int,float)) or isinstance(expires,bool) or not math.isfinite(expires):
            raise SafeFailure('PRIMARY_ACCOUNT_REQUIRED',401)
        return value
    try:
        if session()['expires_at']<=clock()+30:client.refresh()
        for attempt in range(2):
            value=session();access=value['access_token']
            response=client.transport.request('GET',BASE+'/auth/v1/user',
                headers={'apikey':key,'Authorization':'Bearer '+access},timeout=(10,20),allow_redirects=False)
            if response.status_code==401 and attempt==0:
                client.refresh();continue
            if response.status_code!=200:raise SafeFailure('PRIMARY_SESSION_UNAVAILABLE',401 if response.status_code in (401,403) else 503)
            checked=response.json()
            if checked.get('id')!=primary_id or checked.get('email','').lower()!=primary_email:
                raise SafeFailure('ACCOUNT_VERIFY_FAILED',401)
            # Direct normal Inspector RPC, never the worker RPC. It checks live
            # auth.sessions/revocation/roster in addition to GetUser identity.
            verified=client._request('/rest/v1/rpc/xedo_inspector',{'p_action':'session','p_payload':{}},access,retries=0)
            if not isinstance(verified,dict) or verified.get('id')!=primary_id or verified.get('role')!='Inspector':
                raise SafeFailure('INSPECTOR_SESSION_REQUIRED',401)
            current=session();expiry=min(current['expires_at'],clock()+3600)
            if expiry<=clock():raise SafeFailure('PRIMARY_SESSION_UNAVAILABLE',401)
            # This result may ONLY be emitted to the parent's PRIVATE child pipe.
            return {'ok':True,'accessToken':current['access_token'],'expiresAt':int(expiry*1000),'userId':primary_id,'email':primary_email}
        raise SafeFailure('PRIMARY_SESSION_UNAVAILABLE',401)
    except SafeFailure:raise
    except Exception:raise SafeFailure('BROWSER_SESSION_UNAVAILABLE') from None

def main():
    try:
        root,folder=context()
        raw=sys.stdin.buffer.read(2049)
        if len(raw)>2048:raise SafeFailure('INPUT_INVALID',422)
        try:value=json.loads(raw)
        except Exception:raise SafeFailure('INPUT_INVALID',422) from None
        if not isinstance(value,dict) or set(value)!={'publishableKey'}:raise SafeFailure('INPUT_INVALID',422)
        result=resume(value['publishableKey'],root,folder)
        sys.stdout.write(json.dumps(result,ensure_ascii=True));return 0
    except SafeFailure as error:
        sys.stdout.write(json.dumps({'ok':False,'code':error.code,'status':error.status}));return 2
    except Exception:
        sys.stdout.write('{"ok":false,"code":"BROWSER_SESSION_UNAVAILABLE","status":503}');return 2

if __name__=='__main__':sys.exit(main())
