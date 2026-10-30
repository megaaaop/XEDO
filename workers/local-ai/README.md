# XEDO — โปรแกรมวิเคราะห์ SAR ด้วย CPU ในเครื่อง (ขั้น 1–2)

## 1. หัวข้อ

รับ GeoJSON Polygon → ค้นหาภาพ Sentinel-1 ใหม่ → ดาวน์โหลด DATA/VALID พร้อม metadata อัตโนมัติ → ตรวจ input → CPU → score/mask/preview → พื้นที่เสี่ยงและ coverage ที่มีพิกัดจริง ไม่มีการส่งผลเข้าเว็บหรือฐานข้อมูลในรุ่นขั้น1–2

ไม่เปิด Billing/subscription ไม่สร้าง Drive Tasks/GCS/Cloud Run ไม่เปลี่ยน IAM และไม่ต้องเปิด public port เครื่องต้องเปิดและต่ออินเทอร์เน็ตเพื่อเรียก GEE projectเดิมที่ลงทะเบียน noncommercial แล้ว

## 2. สรุป

โปรแกรมใช้ CPU4threads/batch1/float32 และโมเดลเดิมที่ตรวจ SHA256 โดยคง mathematical engine แบบ byte-identical ไว้ใน `vendor/gee_sar_inference.py` ต้นฉบับ SHA256 `1eaada3453be40bf69b3d9dada5a8d17d5dc4aaa9fc34ec7ca4e6ae6b37c1466` น้ำหนักโมเดลยังเป็นไฟล์ในเครื่องและไม่รวมใน Git/Vercel bundle

Environmentที่เตรียมในเครื่องนี้คือ `C:\mega\codex\iENA\tmp\local-ai-worker-venv` เป็น venv overlayที่อ่าน CPU stackจากbenchmarkvenvเดิมผ่าน `.pth` โดยไม่แก้แพ็กเกจเดิม และติดตั้ง EarthEngine/Shapely เฉพาะในvenvใหม่ ดูsnapshotทั้งหมดใน `requirements.lock.txt`; pyprojไม่จำเป็นเพราะใช้rasterio/GDALแปลงCRS

จากโฟลเดอร์release เรียกตรวจความพร้อมได้ด้วย:

```powershell
& 'C:\mega\codex\iENA\tmp\local-ai-worker-venv\Scripts\python.exe' -B workers/local-ai/pipeline.py doctor --online
```

เริ่มวิเคราะห์พื้นที่ตัวอย่างใหม่:

```powershell
& .\workers\local-ai\run-local-ai.ps1 -Area .\workers\local-ai\examples\rayong-small.geojson
```

เปลี่ยน `-Area` เป็นไฟล์GeoJSONของพื้นที่ที่ต้องการ ค่าเริ่มต้นค้นย้อนหลัง30วันถึงวันปัจจุบันUTC กำหนดวันเริ่ม/สิ้นสุดแบบinclusiveได้ด้วย `-Start 2026-10-01 -End 2026-10-30` ผลอยู่ `output/local-ai/<jobId>/` ซึ่งถูกGitignore; ไม่เขียนทับผลรอบก่อน

## 3. รายละเอียด

### 3.0.1 Real Supabase qualification ขั้น6

สถานะต่อจากlocalcandidate: ติดตั้งqueue/statusSQLบนSupabaseXEDOจริงแล้วตามWEBSITE_DETAILS§3.46 และใช้Inspectorเดิม+InspectorTest+machineAuthแยก ทีมสร้างAuthusersยืนยันอีเมลแล้วก่อนเชื่อม ไม่มีการแจกadmin/service_roleให้worker ไม่เปิดBilling/subscriptionและยังไม่push/deployfrontend

เริ่มเว็บlocalที่เชื่อมbackendจริงด้วย `XEDO_LIVE_QA_AUTHORIZED=1` แล้ว `node scripts/preview-live-ai.mjs` ใช้เฉพาะ127.0.0.1:5193 ต้องหยุดfixturepreview-local-ai.mjsก่อนเพราะพอร์ต/cookiehostเดียวกัน `/qa/setup`รับรหัสผ่านในเครื่องผ่านGoTruepasswordgrant+getUser ก่อนเก็บWindowscurrent-userDPAPI sessionในignoredlocal-data/live-ai-qualification Primaryเชื่อมผ่านBFFและได้รับHttpOnlycookieด้วย หากbrowserยังเป็นguest ใช้ /qa/session เพื่อverify sessionDPAPIเดิมด้วยGetUser/InspectorRPC/BFFก่อนตั้งHttpOnlycookieโดยไม่ต้องกรอกรหัสซ้ำ ไม่เก็บpasswordในargv/env/log/ดิสก์และไม่คืนJWTให้pageJS;สามฟอร์มส่งตามคิวเพื่อไม่ชนกัน

RootตรวจUIDกับauth.usersก่อนเปิดInspectorTest/ผูกmachineowner ข้อมูลบัญชีจริงต้องกรอกโดยผู้ใช้และห้ามส่งรหัสผ่าน/recoverylinkในแชท `/qa/accounts`แสดงเฉพาะmetadataไม่ใช่tokens หากลืมรหัสบัญชีเดิมให้ผู้ใช้ใช้passwordmanagerหรือAuthrecoveryที่รองรับ รักษาUUIDเดิม ไม่แก้passwordhashในSQL/สร้างJWTหรือสร้างuserเดิมใหม่ และไม่เปิดอ่านรายการรหัส/แท็บส่วนตัวอื่นของผู้ใช้

`scripts/qualify-real-ai.py --run-real`เป็นเครื่องมือทดสอบจริงที่ต้องใช้3protected sessionsและregistryที่ผูกถูกต้องก่อน หากขาดroleจะคืนpending/network0 ไม่มีการสร้างบัญชีหรือapplySQLเอง หยุดworkerloopอื่นก่อนรัน สร้างสูงสุด3QA-prefixedjobsตามลำดับ: baselineวันที่9ต.ค.พร้อมexactsourceassetassertion/ใกล้200กม²ช่วง30วันปัจจุบัน/noSAR1900-01-01 ใช้3HTTPconnectionsทดสอบduplicatecreate/claim/publishและactualWorker.process/CPUchild ตรวจowner/privateSave/historyโดยไม่ทำimage/confirmationสมมติ Rootต้องตรวจรายงานจริงก่อนclaimผ่านและทำbrowserInspectorreview/plannerแยก การทดสอบมีชื่อQAและไม่ลบmissionหรือrevokeprimarysessionอัตโนมัติ

หลักฐานขั้น6อยู่outputs/XEDO_Local_AI_Phase6_2026-10-30 CanonicalสองMDและqueueเก็บสถานะปัจจุบัน ไม่ใช้การติดตั้งschemaหรือสองAuthroleที่ผ่านแทนfullprimary-ownedqueue/CPU/browseracceptance

### 3.0 Website queue/worker candidate — 30 ตุลาคม 2026

ขั้น3–5เชื่อมในเครื่องแล้ว: Analyze area → Save revision → owned PostgreSQL job → `remote_worker.py` → GEE/CPU pipeline จริง → immutable owned result → Inspector edit/confirm → planner/Save/history เดิม ผลcatalog/coverageอยู่ฐานข้อมูล ส่วนTIFF/previewเต็มอยู่ดิสก์เครื่อง ไม่มีStorage uploadในmilestoneนี้ โค้ดชุดนี้ยังไม่push/deployและSQLใหม่ยังไม่ใช้กับSupabaseจริง

**Local acceptance server:** หลัง `npm run build` รัน `node scripts/preview-local-ai.mjs` แล้วเปิด `http://127.0.0.1:5193` ใช้Authจำลองเฉพาะในเครื่อง/PGliteเก็บบนดิสก์ BFF/SQL/editorเป็นimplementationจริงและGEE/CPUเป็นข้อมูลจริง fixtureInspectorคือ `inspector-alice@example.test` / `local-test-only`; fixturemachineคือ `worker-local-qa@example.test` / `local-test-only` เท่านั้น ไม่ใช่บัญชีหรือรหัสproduction Aliceมีworkerregistry ส่วนBobไม่มีและต้องไม่เห็นงานAlice โฟลเดอร์local-dataถูกignore ต้องไม่เผยแพร่serverนี้

**ก่อนเชื่อมระบบออนไลน์ในรอบที่ได้รับอนุญาต:** review/apply `db/inspector-local-jobs.sql` แล้ว `db/inspector-local-jobs-status.sql` หลังfoundation+AIเดิม;ทีมสร้างAuth identityสำหรับเครื่องแยกจากInspectorและผูกworker_id→owner_idในprivate registry ต้องไม่เพิ่มmachineเข้าinspector_accountsหรือใช้service_role จากนั้นตรวจrealPostgREST grants/session/ownerisolationและreleaseหน้าเว็บ ในรอบนี้ไม่ได้ทำขั้นตอนเหล่านั้น

**เปิดโปรแกรมรับงาน:** ใช้Pythonจากworker environmentเดิม เรียก `remote_worker.py login --config <config.json>` ครั้งแรกเพื่อกรอกอีเมล/รหัสของmachineผ่านหน้าจอ แล้ว `remote_worker.py run --config <config.json>` เพื่อดึงงานออกผ่านHTTPS ไม่มีpubliclistener/tunnel รหัสผ่านไม่ถูกบันทึก;access/refresh sessionเข้ารหัสWindowsDPAPIเฉพาะWindows userปัจจุบัน ใช้ `status` ตรวจpresence และ `logout` revoke/ล้างsession ปิดโปรแกรมด้วยCtrl+Cเมื่อไม่มีงานระหว่างที่ไม่ต้องการประมวลผลใหม่

ไฟล์ `worker.config.example.json` เป็นตัวอย่างตำแหน่งrelativeจากworkers/local-ai ต้องใส่publishable keyของXEDOจาก`src/inspector-project.js` (public keyไม่ใช่admin key) ห้ามใส่service_roleหรือpasswordลงconfig เรียกด้วยvenvPythonที่ต้องการเพราะchildใช้sys.executableเมื่อไม่ระบุpythonPath;ถ้าย้ายconfigให้ใช้absolute pathsสำหรับsessionFile/workRoot/pipelinePath/modelPath/envFileและเก็บไฟล์จริงใต้local-data ห้ามรันexampleที่ยังเป็นplaceholderกับproduction การทดสอบendpointในเครื่องต้องระบุ `--local-qa` และรับเฉพาะ127.0.0.1:5193

Workerจำกัดหนึ่งงานพร้อมกัน/สองqueued/100logicaljobsเดือน/30นาทีจากสร้างjob;lease120วินาทีและfence/attemptป้องกันwriterเก่า RAMwatchdog2048MiBตรวจchild;ไม่ใช่OScontainerlimitหรือSLA Tilesเป็นตัวนับจริง ใช้stageสำหรับsearch/download/package/publish ไม่มีเปอร์เซ็นต์GEEที่เดาเอง ระหว่างเครื่องปิดpresenceจะofflineหลัง180วินาที;ร่าง/ผลสำเร็จยังเปิดได้ ผลตอบกลับช้าไม่ทับบัญชี/พื้นที่/งานแก้ปัจจุบัน งานเกินdeadlineปิดจากInspectorpollแม้ไม่มีworkerclaim

ถ้าส่งผลแล้วไม่ทราบว่าservercommitหรือไม่ checkpointในworkRootจะretryด้วยmutation/bodyเดิมเมื่อเปิดใหม่โดยไม่รันโมเดลซ้ำ ถ้าparentหยุดระหว่างCPU จะตรวจPID+create-time+commandก่อนหยุดchildเดิมและให้DBตัดสินclaim/fenceใหม่ ห้ามลบactive.jsonเองระหว่างผลยังuncertain Rawlocalfilehashเป็นproducerreported;DBตรวจcontract/derivecatalogsealsแต่ไม่ได้รันโมเดลหรืออ่านTIFFซ้ำ

**ทดสอบซ้ำ:** `node --test --test-concurrency=4 tests/*.test.mjs` และvenvPython `-B -m unittest discover -s workers/local-ai/tests -v` การทดสอบCPUchildในunitเป็นfixtureprocess;realGEE/CPU/UIevidenceแยกอยู่outputs/XEDO_Local_AI_Web_2026-10-30 ไม่ใช้unitแทนrealAuth/livePostgRESTหรือfieldaccuracy

### 3.1 การเตรียมและสิทธิ์

`setup-local-ai.ps1` สร้างworker overlayจากbenchmark environmentเดิมและติดตั้งไลบรารีที่pinไว้จากPyPI ตรวจpip dependencyและmodel/enginehash ไม่แก้Pythonทั้งเครื่อง ไม่เชื่อมบริการเสียเงิน เครื่องอื่นต้องมีCPU stackที่ตรงsnapshot/weightsที่ตรวจแล้วก่อนใช้ scriptนี้ ไม่ถือว่าเป็นinstallerทั่วไปสำหรับทุกplatform

โปรแกรมอ่านเฉพาะ `GEE_PROJECT_ID`, `GEE_SERVICE_ACCOUNT_FILE` หรือ `GEE_SERVICE_ACCOUNT_JSON` จาก`.env`ที่ignoreแล้วหรือenvironment อ่านcredentialผ่านlocalfile ไม่ใส่key/tokenในคำสั่งหรือreceipt Doctorแบบonlineอ่านGEEregistrationconfigและSDKmetadataเท่านั้น ไม่enableAPI/แก้IAM/เปิดBilling

### 3.2 ดาวน์โหลดด้วยสิทธิ์เดิม

Credentialเดิมไม่มี `earthengine.thumbnails.create` ที่getDownloadURLต้องใช้ จึงใช้ `ee.data.computePixels` คืนGEO_TIFFโดยตรงด้วย `earthengine.computations.create` ที่มีอยู่ ตรวจยืนยันด้วยrequestจริงแล้ว ไม่เพิ่มสิทธิ์และไม่สร้างtemporarythumbnail/exportresource [Google computePixels](https://developers.google.com/earth-engine/reference/rest/v1/projects.image/computePixels)

ใช้หนึ่งsceneจากCOPERNICUS/S1_GRD/IW/10m/VH+VV เลือกcoverageครบก่อนแล้วใหม่สุด;ถ้าไม่มีfullcoverageเลือกcoverageสูงสุดแล้วใหม่สุดและassetIDเป็นtie-break ไม่mosaicหลายวัน ลำดับDATAเป็นVH,VVหน่วยSigma0dB ไม่logซ้ำ ไม่resizeและไม่ส่งRGBเข้าโมเดล

คำนวณกรอบบนnativeaffineแล้วsnapเป็นwholepixelsก่อนอ่านข้อมูล จำกัด≤2ล้านpixels/ด้าน≤4096/กรอบraster≤200กม² แม้polygonareaเล็กแต่bboxเกินก็ถูกปฏิเสธ ใช้exactPixelGridในcomputePixelsและตรวจTIFFdecodedตรงกันทุกค่า แยกDATAfloat32/VALIDuint8และnormalizeNoData metadataแบบไม่เปลี่ยนvalidpixelvalues ค่าDATAที่VALID=0ตั้งเป็นcanonical-9999พร้อมนับค่าที่เปลี่ยน เนื่องจากGEEอาจส่งค่า0ที่ซ่อนอยู่ใต้clippedmask ห้ามตีความค่าดังกล่าวเป็นข้อมูลจริง

### 3.3 ผลและการตรวจคุณภาพ

แต่ละjobมีrequest.json,run-receipt.jsonและinputs/{DATA,VALID,METADATA,acquisition-receipt};model-outputsมีoil_score.tif/oil_candidate_mask.tif/preview.png/summary.json พร้อมlocal-manifest.json,analysis.local.jsonและrawcandidate/coverageGeoJSON

ผลเป็นlocalproducer/unreviewed/serverRegistered:false ยังไม่มีserver-derivedanalysisRefหรือInspectorconfirmation ค่าhashของไฟล์localเป็นหลักฐานฝั่งเครื่อง ไม่ใช่การยืนยันว่าserverอ่านไฟล์หรือรันโมเดลซ้ำ Scoresไม่ใช่calibratedprobabilityและผลcandidateไม่ใช่หลักฐานยืนยันน้ำมัน/ความหนา/ปริมาณ

Packagerตรวจscore/mask/GDALvalidity/summarygrid/counts/thresholdตรงกัน Polygonize4connectedรักษารูและทุกcomponent แปลงWGS84เต็มprecisionแล้วserializeและrasterizeกลับต้องต่าง0pixels ทั้งcandidate/valid/NoData Validแต่candidate0เป็นsuccess;ไม่มีvalidpixelsเป็นfailure

GEEclipและGDALcentre-rasterizationอาจต่างตรงขอบพิกเซล จึงบันทึกจำนวนfringeและยอมเฉพาะภายในครึ่งเส้นทแยงมุมพิกเซลจากAOIที่densifyแล้ว ไม่clipภาพเดิมหรือยืนยันcentrecontainmentเกินหลักฐาน Validเกินขอบที่กำหนดเป็นfailure

จำกัดcandidate/coveragecomponents256ต่อกลุ่ม/totalvertices8192/ringpoints4097/rings64/catalog512KiB ถ้าเกินแจ้งRESULT_TOO_COMPLEXและรักษาTIFFเต็ม ไม่ทิ้งcomponentหรือsimplifyเพื่อแสดงว่าsuccess

### 3.4 ทดสอบและทำซ้ำ

```powershell
& 'C:\mega\codex\iENA\tmp\local-ai-worker-venv\Scripts\python.exe' -B -m unittest discover -s workers/local-ai/tests -v
```

`--metadata <file>` เป็นexplicitreplayของtripletเดิม ไม่มีการอ้างว่าเป็นภาพที่เพิ่งดาวน์โหลด `--scene <fullAssetId>` ใช้ตรึงsceneเพื่อตรวจautomaticacquisitionเทียบbaseline ต้องอยู่ในช่วงวัน/พื้นที่ที่ระบุด้วย

หลักฐานรอบ30ต.ค.อยู่ `C:\mega\codex\iENA\outputs\XEDO_Local_CPU_Pipeline_2026-10-30` รวมresults-summary.json/readinessและrawruns บันทึกกลางอยู่docs/XEDO_WORK_LOG.mdและWEBSITE_DETAILS.md ผลwebtests564จากreleaseเก่าไม่ใช่ผลทดสอบของโปรแกรมนี้

### 3.5 ขอบเขตขั้นถัดไป

ยังไม่มีhostedjobqueue/workerAuthregistry/heartbeat-resume/การส่งผลขึ้นSupabase/ปุ่มAnalyzeบนเว็บ เป็นงานขั้น3–5ตามแผน การกู้คืนงานคิวและwhole-worker harddeadline/RAMisolationยังไม่implementในCLIขั้นนี้ SDKnetworkมีdeadline90sและboundedretry ส่วนการทำงานofflineต้องใช้tripletที่ดาวน์โหลดไว้ผ่านreplay ผลที่เสร็จแล้วเก็บlocalอ่านได้โดยไม่เรียกGEEซ้ำ


### 3.6 ผลขั้น6ล่าสุดและการเปิดworkerอีกครั้ง

ขั้น1–6ผ่านการทดสอบSupabaseจริงและbrowserแล้ว ดูdocs/WEBSITE_DETAILS.md§3.47และoutputs/XEDO_Local_AI_Phase6_2026-10-30/REPORT.md Node611/Python57/build3formats ผ่าน;SQLqueue/statusและdb/inspector-risk-performance.sqlติดตั้งจริงแล้ว ไม่ต้องติดตั้งซ้ำเพื่อเริ่มworker ไม่ได้เผยแพร่frontendหรือเปิดBilling/subscription

รอบทดสอบหยุดworkerหลังผลสำเร็จแล้ว ในเครื่องเดิมที่มีsessionDPAPIอยู่ignoredlocal-data/live-ai-qualification ให้เรียกPythonvenv `workers/local-ai/remote_worker.py run --config local-data/live-ai-qualification/browser-worker.config.json` จากreleasecheckoutเพื่อเริ่มCPUพร้อมรับงานจริง Sessionrefreshใช้วิธีที่Authรองรับ ต้องเปิดเครื่องและinternetสำหรับงานใหม่ ห้ามนำlocalQAserver/sessionhelperขึ้นProduction ไม่เปิดpublicport/tunnel ไม่ใส่admin/serviceRole Workerไม่อยู่Inspectorroster ผู้ทดลองเห็นและแก้เฉพาะภารกิจตนเอง ผลดิบ/ฉบับInspector/confirmedtargetแยกกัน


### 3.7 การเตรียม release และ local QA identity

Productionเผยแพร่เฉพาะbrowser/NodeAPI ส่วนworkers/local-aiยังใช้PCเดิม ไม่มีBilling/subscription/GPUcloud เมื่อใช้localQAportalให้เตรียมignoredlocal-data/live-ai-qualification/account-identities.json มีเพียงprimaryUserIdและprimaryEmailที่ทีมตรวจยืนยันแล้ว เช่นรูปแบบ `{"primaryUserId":"00000000-0000-4000-8000-000000000001","primaryEmail":"inspector@example.invalid"}` ต้องแทนตัวอย่างด้วยบัญชีที่ยืนยันจริงในเครื่อง ห้ามใส่password/JWT/admin keyลงไฟล์นี้ หากไม่มีหรือรูปแบบไม่ถูกต้องserver/helperหยุดก่อนAuth ไม่hardcodeบัญชีบุคคลในsource QAhelper/bridge/qualification scriptsไม่ถูกนำขึ้นProduction

`scripts/qualify-production-ai.py` เป็นเครื่องมือทดสอบproductionที่ต้องอนุญาต --run-real และตรงHTMLhash/มีpriorpassedreportก่อน ใช้DPAPIprimary/secondaryเดิมผ่านactualBFF สร้างQAmission/jobไม่เกินหนึ่งงานด้วยcheckpointเดิม ให้workerdaemonปกติรับงาน ไม่claim/เปิดเครื่องแทน ไม่สร้างAuth/SQL/paidresources Defaultไม่อ่านsessionและไม่ใช้network ผลAPIไม่ใช่browserproof


### 3.8 เปิดรับงานจากเว็บ production หลังขั้น7

เผยแพร่ browser/NodeAPI ที่ https://xedo-eight.vercel.app/ แล้ว (application 6a1c626cda0cf6dad22b603d6647f41b325598ff) CPUยังรันในPCเดิม ไม่ใช่Vercel/cloudGPU ไม่ต้องติดตั้งSQL/สร้างบัญชีซ้ำ หลังรอบdeployเปิดdaemonไว้แล้ว ถ้าปิดหน้าต่าง/รีสตาร์ตเครื่องให้เปิดPowerShellที่releasecheckoutแล้วใช้configที่เตรียมไว้เฉพาะเครื่อง:

```powershell
& 'C:\mega\codex\iENA\tmp\local-ai-worker-venv\Scripts\python.exe' -B workers/local-ai/remote_worker.py run --config local-data/local-ai-worker/worker.config.json
```

configอ้างDPAPImachine-sessionเดิม เก็บผลเต็มในlocal-data/local-ai-worker/runs ใช้heartbeat20s/poll10s/CPU4threads/หนึ่งงานต่อครั้ง เปิดเพียงdaemonเดียว หยุดด้วยCtrl+Cเมื่อไม่มีงานกำลังทำ ต้องเปิดPC/internetและไม่SleepสำหรับAnalyzeใหม่ หน้าเว็บแสดงOfflineเมื่อworkerขาดpresence ผลที่เผยแพร่และprivatehistoryยังอ่านได้จากSupabaseตอนCPUปิด ไม่เปิดpublicport/tunnel/paidfallback/Billing/subscription ห้ามcommitconfig/session/rawTIFF/modelweights ไม่ต้องเปิดlocalQAserver5193เพื่อใช้production

ผู้ใช้ต้องSign inใหม่เมื่อbrowseraccesssessionหมดอายุ;ไม่ใส่passwordลงworkerconfig รุ่นเผยแพร่ทดสอบCPUsmallarea2งานและUIถึงSavev3แล้ว BrowserHistoryreopenหลังexpiryยังรอผู้ใช้Sign inใหม่ในรอบตรวจขั้น7 รายละเอียดล่าสุดในdocs/WEBSITE_DETAILS.md§3.49
