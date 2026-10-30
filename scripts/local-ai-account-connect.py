"""Local qualification sign-in helper. Input via stdin only; no password storage.

Uses supported GoTrue password grant/get-user. Creates no Auth users or roles,
calls no worker presence/RPC, and stores only current-user DPAPI sessions.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import re
import sys
import time
import uuid
from datetime import datetime, timezone

BASE='https://tstmjnlhwidwtzetqxbu.supabase.co'
ROLES={'primary','secondary','machine'}

class SafeFailure(Exception):
    def __init__(self,code,status=503):self.code,self.status=code,status

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

def metadata_path(folder,role):return folder/(role+'.account.json')

def run():
    raw=sys.stdin.buffer.read(16385)
    if len(raw)>16384:raise SafeFailure('INPUT_INVALID',422)
    try:body=json.loads(raw)
    except Exception:raise SafeFailure('INPUT_INVALID',422) from None
    if not isinstance(body,dict) or set(body)!={'role','email','password','publishableKey'}:raise SafeFailure('INPUT_INVALID',422)
    role,email,password,key=(body[k] for k in ['role','email','password','publishableKey'])
    if role not in ROLES or not isinstance(email,str) or len(email)>254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email) or not isinstance(password,str) or not 1<=len(password)<=512 or not isinstance(key,str) or not re.fullmatch(r'sb_publishable_[A-Za-z0-9_-]+',key):raise SafeFailure('INPUT_INVALID',422)
    email=email.strip().lower()
    root=Path(os.environ.get('XEDO_QA_ROOT') or Path(__file__).resolve().parents[1]).resolve()
    local_root=(root/'local-data').resolve()
    folder=Path(os.environ.get('XEDO_LIVE_QA_DATA') or local_root/'live-ai-qualification').resolve()
    if not folder.is_relative_to(local_root):raise SafeFailure('LOCAL_PATH_INVALID',503)
    primary_id,primary_email=load_identity(folder)
    if (role=='primary' and email!=primary_email) or (role!='primary' and email==primary_email):raise SafeFailure('ACCOUNT_ROLE_MISMATCH',422)
    folder.mkdir(parents=True,exist_ok=True)
    other_accounts=[]
    for other in ROLES-{role}:
        p=metadata_path(folder,other)
        if p.exists():
            if p.stat().st_size>4096:raise SafeFailure('LOCAL_METADATA_INVALID')
            value=json.loads(p.read_text(encoding='utf-8'))
            if value.get('email','').lower()==email:raise SafeFailure('ACCOUNT_ROLE_MISMATCH',422)
            other_accounts.append(value)
    import requests
    session=requests.Session()
    headers={'apikey':key,'Content-Type':'application/json'}
    try:response=session.post(BASE+'/auth/v1/token?grant_type=password',headers=headers,json={'email':email,'password':password},timeout=(10,20),allow_redirects=False)
    except requests.RequestException:raise SafeFailure('AUTH_UNAVAILABLE') from None
    password=None;body['password']=None
    if response.status_code in (400,401):raise SafeFailure('LOGIN_FAILED',401)
    if response.status_code==429:raise SafeFailure('RATE_LIMITED',429)
    if response.status_code!=200:raise SafeFailure('AUTH_UNAVAILABLE')
    try:
        value=response.json();user=value['user'];uid=str(uuid.UUID(user['id']))
        if user.get('email','').lower()!=email or any(a.get('userId')==uid for a in other_accounts):raise ValueError()
        if role=='primary' and uid!=primary_id:raise ValueError()
        access,refresh=value['access_token'],value['refresh_token'];duration=value['expires_in']
        if not isinstance(access,str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,11999}',access) or not isinstance(refresh,str) or not 1<=len(refresh)<12000 or not isinstance(duration,int) or isinstance(duration,bool) or not 1<=duration<=86400:raise ValueError()
    except Exception:raise SafeFailure('AUTH_RESPONSE_INVALID') from None
    try:verified=session.get(BASE+'/auth/v1/user',headers={'apikey':key,'Authorization':'Bearer '+access},timeout=(10,20),allow_redirects=False)
    except requests.RequestException:raise SafeFailure('AUTH_UNAVAILABLE') from None
    try:
        checked=verified.json()
        if verified.status_code!=200 or checked.get('id')!=uid or checked.get('email','').lower()!=email:raise ValueError()
    except Exception:raise SafeFailure('ACCOUNT_VERIFY_FAILED',401) from None
    # No machine presence/Inspector RPC here: root first verifies public UID
    # receipts, then applies the separately authorized registry/roster bindings.
    sys.path.insert(0,str(root/'workers/local-ai'))
    from remote_worker import SessionStore,save_json
    expires=time.time()+min(3600,duration)
    protected={'access_token':access,'refresh_token':refresh,'expires_at':expires,'user_id':uid,'email':email}
    SessionStore(folder/(role+'.session.dpapi'),BASE).save(protected)
    account={'role':role,'userId':uid,'email':email,'connectedAt':datetime.now(timezone.utc).isoformat(),'sessionExpiresAt':datetime.fromtimestamp(expires,timezone.utc).isoformat(),'protectedBy':'Windows current-user DPAPI'}
    save_json(metadata_path(folder,role),account)
    return {'ok':True,'account':account}

if __name__=='__main__':
    try:print(json.dumps(run(),ensure_ascii=True))
    except SafeFailure as error:print(json.dumps({'ok':False,'code':error.code,'status':error.status}));sys.exit(2)
    except Exception:print('{"ok":false,"code":"HELPER_UNAVAILABLE","status":503}');sys.exit(2)
