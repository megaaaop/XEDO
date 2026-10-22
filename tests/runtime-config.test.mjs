import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {runtimeConfig} from '../scripts/runtime-config.mjs';
import {probeGEE} from '../src/gee-connection.js';

const fixtureAccount=()=>JSON.stringify({type:'service_account',client_email:'fixture@xedo-runtime-test.iam.gserviceaccount.com',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey});
async function withDirectory(run){const root=await mkdtemp(path.join(tmpdir(),'xedo-runtime-config-'));try{await run(root);}finally{await rm(root,{recursive:true,force:true});}}
const assertRedacted=(result,...secrets)=>{assert.equal(result.GEE_SERVICE_ACCOUNT_JSON,undefined);const serialized=JSON.stringify(result);for(const secret of secrets)assert.ok(!serialized.includes(secret));};

test('missing GEE credentials and absent configured file remain unconfigured without an upstream call',async()=>{
  const empty=await runtimeConfig({GEE_PROJECT_ID:'xedo-runtime-test'});
  assert.equal(empty.GEE_CONFIGURATION.state,'not_configured');
  await withDirectory(async root=>{
    const filename='private-missing-account.json';
    const result=await runtimeConfig({GEE_PROJECT_ID:'xedo-runtime-test',GEE_SERVICE_ACCOUNT_FILE:filename},{root});
    assert.equal(result.GEE_CONFIGURATION.code,'GEE_CREDENTIAL_FILE_MISSING');
    assert.equal(result.GEE_CONFIGURATION.state,'not_configured');
    assertRedacted(result,filename,root);
    let upstreamCalls=0;
    assert.equal((await probeGEE(result,{fetchImpl:async()=>{upstreamCalls++;throw new Error('Unexpected network call');}})).state,'not_configured');
    assert.equal(upstreamCalls,0);
  });
});

test('inline GEE JSON keeps precedence and existing probe validation',async()=>{
  const raw='existing-inline-secret-with-invalid-json';
  const result=await runtimeConfig({GEE_PROJECT_ID:'xedo-runtime-test',GEE_SERVICE_ACCOUNT_JSON:raw,GEE_SERVICE_ACCOUNT_FILE:'not-readable.json',GEE_PROBE_ASSET:'projects/test/assets/example'});
  assert.equal(result.GEE_SERVICE_ACCOUNT_JSON,raw);
  assert.equal(result.GEE_CONFIGURATION.source,'inline');
  assert.equal(result.GEE_CONFIGURATION.state,'configured');
  assert.equal(result.GEE_PROBE_ASSET,'projects/test/assets/example');
  assert.equal(result.GEE_SERVICE_ACCOUNT_FILE,undefined);
  assert.equal((await probeGEE(result,{fetchImpl:async()=>{throw new Error('Unexpected network call');}})).code,'GEE_CONFIG_INVALID');
});

test('a valid server-only service-account file resolves relative and absolute paths',async()=>{
  await withDirectory(async root=>{
    await mkdir(path.join(root,'secrets'));
    const filename=path.join('secrets','gee-service-account.json'),raw=fixtureAccount();
    await writeFile(path.join(root,filename),raw,'utf8');
    for(const file of [filename,path.join(root,filename)]){
      const result=await runtimeConfig({GEE_PROJECT_ID:'xedo-runtime-test',GEE_SERVICE_ACCOUNT_FILE:file},{root});
      assert.equal(result.GEE_SERVICE_ACCOUNT_JSON,raw);
      assert.deepEqual(result.GEE_CONFIGURATION,{state:'configured',source:'file'});
      assert.equal(result.GEE_SERVICE_ACCOUNT_FILE,undefined);
    }
  });
});

test('invalid, non-service-account, malformed-key and non-UTF8 files expose only sanitized status',async()=>{
  await withDirectory(async root=>{
    const filename='private-credential-name.json',file=path.join(root,filename);
    const secret='private-fixture-content-never-returned';
    for(const content of [secret,JSON.stringify({type:'authorized_user',refresh_token:secret}),JSON.stringify({type:'service_account',client_email:'invalid-email',private_key:secret}),JSON.stringify({type:'service_account',client_email:'fixture@xedo-runtime-test.iam.gserviceaccount.com',private_key:'-----BEGIN PRIVATE KEY-----\n'+secret+'\n-----END PRIVATE KEY-----'}),Buffer.from([0xff,0xfe,0xfd])]){
      await writeFile(file,content);
      const result=await runtimeConfig({GEE_PROJECT_ID:'xedo-runtime-test',GEE_SERVICE_ACCOUNT_FILE:filename},{root});
      assert.equal(result.GEE_CONFIGURATION.code,'GEE_CREDENTIAL_FILE_INVALID');
      assert.equal(result.GEE_CONFIGURATION.state,'error');
      assertRedacted(result,secret,filename,root,'PRIVATE KEY');
    }
    await mkdir(path.join(root,'private-directory'));
    const directoryResult=await runtimeConfig({GEE_SERVICE_ACCOUNT_FILE:'private-directory'},{root});
    assert.equal(directoryResult.GEE_CONFIGURATION.state,'error');
    assertRedacted(directoryResult,'private-directory',root);
  });
});

test('credential files larger than 64 KiB are rejected before forwarding contents',async()=>{
  await withDirectory(async root=>{
    const filename='oversized-private-account.json',raw=fixtureAccount();
    const atLimit=raw+' '.repeat(64*1024-Buffer.byteLength(raw));
    await writeFile(path.join(root,filename),atLimit);
    const accepted=await runtimeConfig({GEE_SERVICE_ACCOUNT_FILE:filename},{root});
    assert.equal(accepted.GEE_CONFIGURATION.source,'file');
    assert.equal(accepted.GEE_SERVICE_ACCOUNT_JSON,atLimit);
    await writeFile(path.join(root,filename),atLimit+' ');
    const result=await runtimeConfig({GEE_SERVICE_ACCOUNT_FILE:filename},{root});
    assert.equal(result.GEE_CONFIGURATION.code,'GEE_CREDENTIAL_FILE_TOO_LARGE');
    assert.equal(result.GEE_CONFIGURATION.state,'error');
    assertRedacted(result,raw,filename,root,'PRIVATE KEY');
  });
});
