# XEDO — รายละเอียดเว็บไซต์และแนวทางแก้ไข

## 1. หัวข้อ

- วันที่เริ่ม: 27 ตุลาคม 2026; อัปเดต: 30 ตุลาคม 2026, Asia/Bangkok
- Active checkout: `C:\mega\codex\iENA\github-publish\XEDO-hardware-release`
- เอกสารนี้อธิบายโครงสร้างและพฤติกรรมของเว็บ ใช้คู่กับ `XEDO_WORK_LOG.md` ซึ่งเก็บประวัติการแก้ ผลตรวจ และสถานะเผยแพร่
- ตามคำสั่งล่าสุด ให้บันทึกทั้งสองไฟล์ทุกครั้งที่ทำงานลักษณะนี้ และปรับ `implementation-queue.json` เมื่อข้อกำหนดหรือสถานะเปลี่ยน

## 2. สรุป

**ขั้น7กำลังเผยแพร่ — 30 ตุลาคม2026:** ผู้ใช้อนุญาต commit/push/deploy เว็บจริงและตรวจหลังเผยแพร่แล้ว โดยไม่เปิด Billing/subscription Targetเดิม xedo/prj_x35WcipWxA767cYwv3f0CXcdyea3/team_CV1O0uIz6BcarAQAOb8soV0I → xedo-eight.vercel.app Rootใช้GitintegrationเดิมหลังตรวจCIและdeployment identity; Supabase schema/registry/สามบัญชีติดตั้งและผ่านขั้น6แล้ว ไม่สร้างบัญชีหรือapplySQLซ้ำ AIยังรันบนCPUในเครื่อง ไม่รันPython/GPUบนVercel

**สถานะล่าสุดขั้น6 — ผ่านการทดสอบจริงในขอบเขต pilot:** Inspector เดิมเชื่อมสำเร็จครบสามบัญชีแล้ว ใช้ Supabase xedo จริงกับเว็บในเครื่องและ CPU ในเครื่องได้ตั้งแต่ Analyze พื้นที่ใหม่ → โหลดภาพ SAR → ผล owned AI → Inspector แก้/วาดพื้นที่ → ตรวจภาพ Sentinel-2 จริง → confirm → planner → Save/history/private reopen ไม่มีคำถามรอคำตอบ ขั้นถัดไปคือขั้น7เตรียมเผยแพร่เมื่อผู้ใช้อนุญาต โดยรอบนี้ไม่ commit/push/deploy ไม่เปิด Billing/subscription และไม่เปลี่ยนรหัสผ่านหรือบัญชีเดิม

**ประวัติก่อนเชื่อม primary สำเร็จ (แทนที่ด้วย§3.47):** ทีมสร้างInspectorTestTEST_INSPECTOR_LOCALและmachineCPU_WORKER_LOCALในxedoแล้ว ทั้งสองconfirmed/มีpassword/identityครบ RootเปิดInspectorTestและผูกmachineกับInspectorเดิมPRIMARY_INSPECTOR_LOCAL ตรวจenabledInspectors2/registeredWorkers1/machineInInspectorRoster0 RealAuthGetUserและRPC7checksผ่าน: secondaryInspectorใช้งานได้/machinepresenceownerถูก/สองroleใช้สิทธิ์สลับกันไม่ได้ ตอนนี้มีDPAPIsessionสองroleแล้ว เหลือprimary ผู้ใช้แจ้งลืมรหัสและเลือกลองรหัสที่Chromeบันทึกก่อน ไม่ได้ส่งrecoveryemail/เปลี่ยนรหัส/ลบสร้างuserใหม่ RootเปิดเฉพาะSupabaseUserDetailsพบปุ่มSendpasswordrecovery(ส่งemailเท่านั้น) ไม่อ่านPasswordManager/clipboard รอprimaryconnectสำเร็จ

**ประวัติช่วงเริ่มขั้น6ก่อนสร้างบัญชีเพิ่ม30ต.ค.:** Supabaseจริงxedo/tstmjnlhwidwtzetqxbuผ่านMCPบัญชีmegaphijak ติดตั้งmigrationxedo_local_cpu_queue_and_owned_results(v1+statusv2)สำเร็จในtransactionเดียว มี6ตารางใหม่และ12privateRLS ไม่มีanon/authenticateddirectCRUD PublicworkerRPCเป็นInvoker/anonexecute=false/authenticated=true PostgRESTanonymousRPCตอบ401/private-table404 Preparedcataloghashเดิมคงเดิม Catalog14candidates/3coverageเก่าvalidateบนPostgreSQLจริง0.289493s/99404JSONBbytes(ไม่persistเป็นownedresultและไม่ใช่freshinference) FreshNode606/Python45ผ่าน CPU197.5274กม²รอบใหม่34.980s/runner4.098s/peak725.34MiB/0candidate;GEEจริงช่วง1900-01-01ได้NO_SAR_SCENEตามคาด ขณะนี้Authจริงยังมีเพียงบัญชีเดิม หน้าsetupLoginยังไม่สำเร็จ จึงยังไม่อ้างsigned-inCPU/owner/concurrencyผ่าน ดูWEBSITE_DETAILS§3.46

สถานะล่าสุด30ต.ค. — **LOCAL_CPU_AI_INTEGRATION_PLANขั้น3–5เป็นlocal-tested candidateแล้ว**: Analyze→Save revision→owned PostgreSQL queue→outbound worker/GEE/CPUจริง→owned immutable result→Inspector edit/confirm→planner/Save/history ดู§3.45 เว็บ606tests/Python30tests/3buildsผ่าน ผลจริงพื้นที่5.0172กม² pipeline23.373s/queueถึงpublish28.421s/nativepeak509.92MiB การทดสอบAuthเป็นfixtureและDBเป็นPGlite ไม่อ้างrealSupabase/productionacceptance ไม่applySQL/Auth/bucket/IAM/Billing/subscription ไม่commit/push/deploy ผลcatalogอยู่DB;TIFF/previewอยู่เครื่อง ไม่มีStorageuploadในmilestoneนี้

ประวัติimplementationก่อนรอบปัจจุบัน30ต.ค.: LOCAL_CPU_AI_INTEGRATION_PLANขั้น1–2สำเร็จในเครื่อง workers/local-aiโหลดSARจากGEEเดิมผ่านcomputePixels→CPU→GeoTIFF/preview/พื้นที่เสี่ยงและcoverageที่ตรวจroundtrip ผลพื้นที่ใหม่5.0172/197.5274กม²ผ่านและautodownloadbaseline176.478กม²ให้score/maskตรงทุกpixel Python13testsผ่าน/pipcheckผ่าน ดู§3.44 รอบขั้น1–2ไม่เปลี่ยนsrc/api/dbของเว็บ ไม่สร้างqueue/Authmachine/bucketหรือpush/deploy ไม่เปิดBilling/subscription

สถานะช่วงวางแผนก่อนimplementation30ต.ค.: แผนเชื่อมwebsiteกับCPUในเครื่องพร้อมแล้ว ดู§3.43และLOCAL_CPU_AI_INTEGRATION_PLAN.md ใช้ownedjobsในSupabaseและworkerดึงงานผ่านHTTPSRPC/automaticGEEdownload เก็บผลreviewส่วนตัวเปิดย้อนหลังได้โดยไม่ต้องให้เครื่องCPUออนไลน์ตลอด ไม่เปิดBilling/subscription/publicport/tunnel รอบนี้วางแผนและตรวจsource/เอกสารเท่านั้น ยังไม่implement/สร้างบัญชีเครื่อง/bucket/SQL/push/deploy

หลักฐานCPUรอบก่อน30ต.ค. (ไม่รันใหม่ในรอบวางแผน): SAR/checkpoint เดิมครบ16รอบ (2/4 threads), ทุกprocessสำเร็จและผลตรงbaselineทุกพิกเซล 4threadsใช้โมเดลซ้ำprocessing median2.297s/รวมpreview4.171s;freshprocessเต็มงานmedian12.242s;nativepeakRAMสูงสุด891.297MiB/0.8704GiB ดู§3.42 ผลนี้ไม่รวมautomaticGEE/onlinejob/UIlatency

สถานะล่าสุด 28 ต.ค. CoreUXเผยแพร่และตรวจProductionแล้ว code32aa243/VercelREADY/mainCI40669324786success/HTMLตรงverifiedbuild ดู§3.34 พร้อมLoginpending-errorcleanup/normalGEE/3DSatellite/mobilecheckbox/demoPlan18items ไม่มีDBAuthchanges Qualificationphysicaltouch/trackpad/heap/fullappINP/selectivecalcยังคงแยกตาม§3.32

สถานะช่วงวางแผน29ต.ค. (ประวัติ): ผู้ใช้ยืนยันว่าบัญชีตรวจได้แล้ว รับเป็นuser-confirmedและเดินแผนAIต่อโดยไม่ให้บัญชีเป็นตัวขวาง คงprivateSave/history/A–B/sessionเป็นAIintegrationregression ไม่อ้างว่าagentตรวจใหม่ แผนpreparedAI/editor/serverconfirm/plannerอยู่AI_INTEGRATION_PLAN§3.16และ§3.36ด้านล่าง รอบนี้ตรวจsource/corehashes12ไฟล์และเขียนแผน ไม่เปลี่ยนapplicationหรือบริการสดและไม่เผยแพร่ใหม่ UXcoreเผยแพร่แล้ว เหลือqualificationที่บันทึกไว้

สถานะล่าสุด29ต.ค.: preparedSAR14candidate/Inspectorriskeditor/privateconfirmation/planner/Savehistoryเผยแพร่แล้ว codeb719d8e,ProductionREADY,CI2branchesผ่าน,HTMLตรงverifiedbuild,564tests/3builds ผ่าน ใช้liveSQLที่ตรวจสิทธิ์แล้ว รายละเอียด§3.37/§3.37.2;agentไม่ใช้passwordจริงทดสอบAIบนProduction

กติกาเพิ่มสำหรับงานคู่ขนาน: แชทหลักนี้แก้เว็บไซต์เพียงแชทเดียว แชทสนับสนุนเตรียมข้อมูลAI/หลักฐานตรวจ/คำแนะนำ/กรณีทดสอบในโฟลเดอร์แยก แล้วส่งให้แชทหลักตรวจรับและเชื่อม รายละเอียดownershipและhandoffอยู่ข้อ3.14 ไม่ให้การทำคู่ขนานกลายเป็นหลายแชทแก้source/configของเว็บพร้อมกัน

ภาพผู้ใช้ล่าสุดแสดง Home `12.66105, 101.1288` และภาพเฉพาะกรอบเล็ก พร้อม surface model ready ใช้เป็นบริบทสำหรับไล่อาการ ไม่ถือว่าเป็น polygon ของภารกิจเดิมครบถ้วน อินเทอร์เน็ตไม่เสถียรเป็นข้อสงสัย ไม่ใช่สาเหตุที่พิสูจน์แล้ว

## 3. รายละเอียด

### 3.1 โครงสร้างตั้งต้นที่อ่านก่อนแก้

- `src/planning-trial-client.js`: เชื่อม flow, map, scene review, calculations, schedule และ export; มีหลายหน้าที่ในไฟล์เดียว
- `src/planning-geospatial-ui.js` + `src/gee-mission-context.js` + `api/planning-context.mjs`: โหลดและตรวจ context ของ terrain/landcover/quality/forecast
- `src/planning-satellite.js` + `src/gee-imagery.js` + `src/gee-imagery-api.js`: แหล่งภาพและกรอบ tile ของภาพที่เลือก
- `src/planning-basemap.js` + `src/planning-basemap-view.js`: ภาพพื้นหลังและการกู้คืนเมื่อ request/tile ล้มเหลว
- `src/planning-trial.css`, `src/planning-geospatial.css`, `src/planning-readiness.*`: layout, status และ readiness
- `scripts/build.mjs`: สร้าง `dist/index.html` ที่คำนวณใน browser และใช้ hosted imagery/context APIs
- `vercel.json`, `.github/workflows/ci.yml`: routing และ check/test/build pipeline

### 3.2 แผนแก้ที่เขียนก่อนลงมือ

| ลำดับ | อาการ/งาน | วิธีแก้ที่ตั้งใจ | เกณฑ์ตรวจ |
| --- | --- | --- | --- |
| 1 | GEE แสดง unavailable โดยไม่บอกสาเหตุ | แยก error/transport/status validation เป็นโมดูล มีขั้นตอนงานและ progress ที่สะท้อนข้อมูลจริง ใช้สถานะรอเมื่อยังไม่ทราบเปอร์เซ็นต์ server ไม่สร้างตัวเลขวิ่งตามเวลา | แยก offline/timeout/busy/input/response mismatch ได้; partial ยังเห็นส่วนใช้ได้; ยกเลิก/เปลี่ยนพื้นที่แล้วผลเก่าไม่ทับ |
| 2 | client หลักมีหลายหน้าที่และ render ซ้ำ | ตรวจ dependency/state lifecycle แยกส่วนที่แก้เป็น module ชัดเจน และตัดงานซ้ำที่ยืนยันจากโค้ด ไม่เปลี่ยนทุกไฟล์หรือสลับลำดับโดยไม่มีเหตุผล | import/init/dispose ชัด; source of truth เดียว; tests ของพฤติกรรมเดิมผ่าน |
| 3 | ภาพ GEE แสดงเฉพาะกรอบจนรอบนอกมืด | เพิ่ม display context ราว 1 กม. รอบ AOI โดยเก็บ inspection/review geometry เดิมแยกจาก display extent ป้องกันใช้ภาพนอก AOI ไปผ่าน review โดยผิดเงื่อนไข | แผนที่เห็นบริบทนอก AOI; route/oil area และ polygon เดิมไม่ขยาย; bounds/server limits คงใช้ได้ |
| 4 | เลื่อนหน้าแล้วหน่วง | ตรวจ render/readiness timers, vector style allocations, layout writes, map interactions และ expensive paint ปรับเฉพาะสาเหตุที่พบ พร้อม cleanup | scroll ไม่กระตุ้นคำนวณ/requests; DOM ที่ไม่เปลี่ยนไม่เขียนซ้ำ; map/review/download ยังทำงาน |

### 3.3 การตรวจและเผยแพร่

ตรวจ syntax, tests ที่เกี่ยวข้อง, full standard suite และ build รูปแบบที่ CI กำหนด ไม่เปิดรอบทดลองให้ผู้ใช้ตรวจเพิ่ม เมื่อผ่านให้ commit/push ไป production branch ของ repo เดิมและยืนยัน deployment/commit พร้อม smoke check เว็บหลัก เก็บผลจริงใน work log ไม่คัดผล 428 tests เก่ามาเป็นผลรอบใหม่

### 3.4 สถานะรอบนี้

เขียนแผนในข้อ 3.2 ก่อน implementation แล้ว ชุดแก้ผ่าน syntax, automated tests **458/458** และ build ทั้งสามรูปแบบ API ในเครื่องที่ใช้ GEE จริงคืนข้อมูลครบสี่ส่วนในพื้นที่อ้างอิงและคืนภาพ tile นอก AOI แต่อยู่ในกรอบ context ได้ เผยแพร่ชุดโค้ด `8452df2` แล้ว และตรวจผ่านหน้า Production จริง

| Module | หน้าที่และข้อกำหนดที่รักษา |
| --- | --- |
| `planning-context-request.js` | HTTP transport, validation boundary, allowlisted error categories/input hints, request ID และ retry ชั่วคราวหนึ่งครั้ง; ไม่แสดง exception หรือ error body ดิบ |
| `planning-geospatial-ui.js` | lifecycle ของภารกิจ/TTL/cancellation, สถานะแต่ละแหล่ง, progress และการแสดงผล; ส่ง `getStatus()` แบบเบาให้ readiness |
| `gee-mission-context.js` | เพิ่มข้อมูล failure แบบปลอดภัยต่อแหล่ง ไม่ทำให้การล้มเหลวของหนึ่งแหล่งลบข้อมูลที่แหล่งอื่นตอบได้ |
| `satellite-context.js` | ฟังก์ชันร่วม server/client สำหรับ display rectangle รอบ AOI ประมาณ 1 กม. ต่อด้าน ขอบเขตนี้ใช้ดูบริบทเท่านั้น |
| `planning-map-overlay.js` | วาด feature/style ที่นำกลับมาใช้ได้ เก็บ feature เดิมเมื่อ inputs ไม่เปลี่ยน รวม route segments ใน MultiLineString โดยไม่เชื่อมข้ามช่วงที่ขาด |
| `planning-view.js` | เขียน property/attribute ของ DOM เฉพาะค่าเปลี่ยน ป้องกัน timer เขียนซ้ำระหว่างเลื่อนหน้า |
| `planning-image-readiness.js` | ตรวจความพร้อมเฉพาะ tile ที่เกี่ยวข้องกับ inspection AOI; context tile ไม่ใช้เป็นหลักฐานและไม่เป็นตัวขวาง review |

### 3.5 GEE progress และการอ่านสถานะ

- เปอร์เซ็นต์เป็นความคืบหน้า **ขั้นตอนรับข้อมูลฝั่งเว็บ**: เตรียมคำขอ 1/3 = 33%, ได้ HTTP response 2/3 = 67%, ตรวจข้อมูลและบริบทผ่าน 3/3 = 100%
- ระหว่างรอ server ใช้ progress bar แบบไม่กำหนดสัดส่วนพร้อมเวลาที่ผ่านไป จำนวนครั้ง และคำอธิบายว่า GEE ไม่ส่งเปอร์เซ็นต์ประมวลผลสด จึงไม่ทำตัวเลขเพิ่มตามเวลาเอง
- 100% หมายถึงขั้นตอนรับและตรวจคำตอบจบ ไม่ได้หมายความว่าทุกแหล่งข้อมูลมีค่า และไม่เท่ากับพร้อม export ให้ดูสถานะ terrain/landcover/quality/forecast และ readiness แยก
- แยก offline, browser transport, timeout/deadline, busy/429, access, endpoint, invalid input, non-JSON/JSON เสีย/ใหญ่เกิน, mission mismatch และ response expiry พร้อม HTTP status/request ID ที่ปลอดภัย
- INPUT มีข้อความแนะนำเฉพาะขอบเขต/จำนวนจุด/ภูมิภาค, Home, scene และช่วงเวลา โดยใช้ข้อความที่อนุญาตไว้เท่านั้น ไม่เชื่อข้อความดิบจาก server ทุกชนิด
- Retry อัตโนมัติหนึ่งครั้งเฉพาะปัญหาชั่วคราว ภายใน deadline รวม 30 วินาที การยกเลิก/เปลี่ยนพื้นที่หยุด retry และกันผล/เปอร์เซ็นต์ที่ตอบช้าหลังยกเลิก

### 3.6 การแสดงภาพรอบ AOI

- API map ยังคง `geometry` ของ inspection เดิม เพิ่ม `displayGeometry` และ `contextBufferM: 1000` สำหรับภาพบริบท
- พื้นที่บริบทเป็น **สี่เหลี่ยมครอบกรอบ AOI ที่ขยายด้านละประมาณ 1 กม.** ไม่ใช่วงกลมสำรวจหรือขอบคราบน้ำมัน
- Scene coverage, คุณภาพภาพ, review, route และตัวคำนวณทั้งหมดอิง AOI เดิม Client ตรวจว่า displayGeometry ตรงกับ helper ที่กำหนด ไม่รับกรอบใหญ่ที่ปลอมจากภายนอก
- Signed tile session ของภาพที่เลือกอนุญาตขอบเขตขยายแบบจำกัด โดยไม่ขยาย input limit ของ mission เดิม Basemap และ session เก่ายังเข้ากันได้
- Context-only tiles แสดงภาพตามปกติ แต่ไม่ decode ซ้ำเพื่อตรวจ pixel evidence ถ้ารอบนอกล้มเหลวให้แจ้งเตือนที่ caption และรักษาสถานะของ AOI ที่ผ่านแล้ว ส่วน AOI tile ผิดพลาดยังยกเลิก review
- คำนวณ expected AOI tile keys จาก public tile grid/view APIs ก่อนอนุญาต review รวม tile ที่ยังไม่เริ่มโหลดในคิว เปลี่ยน zoom/view แล้วชุดคาดหมายเปลี่ยนตาม รอให้ทุก tile ที่ต้องใช้เสร็จและมีพิกเซลใน AOI ไม่อนุญาตระหว่าง view ยัง animate/interact

### 3.7 Scroll และการจัดโค้ด

- Readiness refresh ประเมิน state ครั้งเดียวต่อ tick ส่ง state เดียวให้ view และเขียน DOM เฉพาะที่เปลี่ยน Hidden tab งด render แล้ว refresh เมื่อกลับมา
- Overlay cache เก็บ style ต่อ role และไม่ล้าง/สร้าง vector source ซ้ำเมื่อข้อมูลเท่าเดิม
- ล้อเมาส์เลื่อนหน้าเมื่อ map ยังไม่ focus คลิกหรือ focus map ก่อนซูมด้วยล้อ; ปุ่ม +/−, drag, keyboard และ pinch ยังคงใช้ได้
- จำกัดการ paint ของ sticky map panel และตัด live blur บน dialog backdrop
- เหล่านี้เป็นการลดงานที่พบจาก source และทดสอบซ้ำได้ ไม่อ้างตัวเลข FPS ที่ไม่ได้วัด โค้ดหลักยังเป็น coordinator ของ flow เดิม ไม่ rewrite ทั้งระบบหรือสลับลำดับไฟล์โดยคาดเดา

### 3.8 การบำรุงรักษารอบถัดไป

อ่าน log/queue/เอกสารนี้ก่อนแก้ เลือก module ตามหน้าที่ ใช้ revision/abort/TTL ของ coordinator เดิม ไม่เพิ่ม fetch หรือตัวจับเวลาซ้อนโดยไม่มี disposal ให้คง tests เรื่อง partial/Unknown, scene identity, original AOI, cancellation, expired readiness และ asynchronous export recheck อัปเดตคำอธิบายกับผลตรวจจริงในสองเอกสารทุกครั้ง

### 3.9 หลักฐานตรวจรับรอบ 27 ต.ค. 2026

- `npm run check`, `npm test` **458 ผ่าน / 0 ล้มเหลว / 0 ข้าม**, `npm run build`, `npm run build:workspace`, `npm run build:file` ผ่าน
- Tests ตรวจ abort/late body/retry, sanitized input/source failures, cached progress, padded display/session bounds และ original AOI, queued expected tiles/rotated viewport, overlay/style reuse และ readiness 60 รอบที่ข้อมูลไม่เปลี่ยนโดยไม่เขียน DOM ซ้ำ
- Full suite ครั้งแรกพบ test harness เก่าตัด source จบที่ `function add` ซึ่งถูกย้ายออกไปแล้ว ปรับจุดตัดเป็น `function drawMap` โดยรักษา assertions เรื่อง demo isolation จากนั้น full suite ผ่าน ไม่ได้ลบ/ข้าม test
- Local API วันที่ 27 ต.ค. 2026 คืน 12 scenes; inspection geometry เดิมไม่เปลี่ยน, display context 1000m, context-only PNG 7,223 bytes HTTP200, terrain/landcover/quality/forecast ready และเวลาเริ่ม–จบไม่ครบได้ HTTP422/`GEE_CONTEXT_INPUT_INVALID`
- ตรวจผ่าน browser ในเครื่องได้ภาพ selected acquisition พร้อมปุ่ม Prepare drone mission เปิดใช้ เป็นการตรวจภายในของผู้ช่วย ไม่เปิดขั้นทดลองให้ผู้ใช้ตรวจเพิ่ม
- Production code commit `8452df2939d7a839885077e574ee6901944b6a91`, deployment ที่ตรวจ `dpl_FhXkVvUtYWRAA8rkqZkJwFeC5JBe` READY, CI run `40484759102` success และ alias `https://xedo-eight.vercel.app/` ตรงรุ่นนี้ขณะตรวจ
- Browser Production โหลด selected acquisition/ภาพ context ได้และเปิด Prepare; GEE progress 33% ระหว่างรอ → 100% หลังตรวจคำตอบ พร้อม Terrain/landcover/quality/GFS Ready; ทดสอบเวลา end ว่างได้ INPUT/HTTP422 และข้อความแนะนำเฉพาะ หยุดที่67% แล้วคืน end เดิมได้ Ready อีกครั้ง Route preview ยังสร้างได้และไม่มี console error ในรอบตรวจ
- การเลื่อน PageUp ภายใน Mission settings ใช้งานได้และบันทึกภาพ progress ชัดเจน ไม่ได้วัด FPS หรืออ้างว่าเครือข่าย/ทุกเครื่องจะไม่มี lag
- CLI smoke แบบอ่าน full HTML และ API บน Production timeout สองครั้ง ไม่ใช้เป็นผลผ่านหรือสรุปว่าเว็บไซต์ล่ม เปลี่ยนมาใช้หลักฐาน browser UI/API path ที่ตรวจได้จริงและ deployment identity ส่วน local API script ผ่านครบ
- หลักฐานทั้งหมดอยู่ `output/release-check/gee-status-context-scroll-2026-10-27/` (ignored): logs, `local-api.json`, `production-map-context.jpg`, `production-gee-progress.jpg`, `production-error-state.json` และ receipt ที่ระบุ deployment/CI แน่นอน เอกสารผลตรวจนี้เป็น follow-up ของ code release; commit เอกสารเพิ่มเติมอาจเปลี่ยน deployment metadata แต่ bundle ของ application เดิมไม่เปลี่ยน

### 3.10 แผน 3D ground modes — เขียนก่อน implementation 27 ต.ค. 2026

- เก็บ `deployment-3d.js` เป็น render-only Canvas perspective: Diagram เดิม และ Satellite texture บนพื้นเดียวกัน คง camera fit, local projection, preview dimensions และความสูงเดิม
- เพิ่ม module loader เฉพาะพื้น 3D เรียก API basemap GEE เดิมด้วย polygon ของพื้น ไม่ใช้ภาพ thumbnail หรือ screenshot ของแผนที่ และไม่เปลี่ยน original inspection geometry/scene review
- ประกอบ same-origin PNG tiles ใน Web Mercator เป็น texture มี bounds ชัดเจน ใช้ inverse local projection เพื่อวาง mesh ตามพิกัดจริง ไม่ยืดภาพ AOI เล็กให้เต็มกรอบโดยผิดสัดส่วน
- ภาพพื้นเป็น recent Sentinel-2 true-colour mosaic พร้อม acquired range/credit/10m native source; อาจคนละ acquisition กับภาพ review จึงแสดง source แยก และไม่ใช้ยกระดับ readiness/ผลวิเคราะห์
- กำหนด tile/texture/concurrency budgets, abort/deadline, safe error/retry, revision guard และ dispose; mode switch ไม่ reset orbit/zoom และไม่โหลดใหม่ทุก renderer update
- UI มี Diagram / Satellite และสถานะโหลด ไม่ขยาย/ย่อ preview area ที่ผู้ใช้พอใจแล้ว ไม่มีความสูง DEM ต่อเนื่องเพิ่มในงานนี้
- ตรวจ georeference/texture budgets/cancellation/non-image tiles, mode switching/renderer/negative states, automated suite/check/3builds และ browser ภายใน จากนั้นเผยแพร่ตรง production ตามคำสั่งผู้ใช้ บันทึกผลจริงใน work log

### 3.11 พฤติกรรมและโครงสร้างหลังเพิ่ม 3D satellite ground

| ส่วน | หน้าที่ |
| --- | --- |
| `deployment-ground.js` | sample geographic floor65จุด, inverse projection/UV mesh16×16, affine trianglesสำหรับperspective ไม่ยืดภาพAOIเล็กทับพื้น |
| `deployment-3d.js` | rendererเดิม+getGroundGeometry/setGroundMode/setGroundTexture; defaultDiagram, borrowedtexture, keepcamera/floor/dimensions; ไม่ทำnetwork |
| `planning-3d-satellite.js` | เรียกbasemapAPIเดิมด้วยfloorpolygon,ตรวจsameoriginmanifest+PNG≤1MiB/256px,ประกอบatlas≤2048px/64tiles/concurrency4/overall60s;ตรวจvisiblepixelsในfloor≥99.5% ไม่รวมpadding |
| `planning-3d-ground-controller.js` | หนึ่งcachedatlasตามfloorgeometry; unchangedupdates/modeswitchreuse; expiredreloadwhenupdated; abort/revisionguard; disposebitmap/canvas; failureไม่retryวนทุกrender |
| `planning-trial-client.js` | modecontrols/statusจริงตามcompletedtiles,แหล่ง/วันที่/10msource/credit; onlinegateใช้runtime.localFileกับgeeHostedเพื่อให้productionstaticcalculatorใช้GEEได้แต่offlinefileไม่fetch |

ปุ่มGroundอยู่เหนือwrap จึงไม่กินพื้นที่canvasเดิม ไม่มีการเปลี่ยนCSSheightของpreview ภาพพื้นเป็นrecentmosaicสำหรับบริบทเท่านั้น ไม่เปลี่ยนภาพreview,AOI,readiness,ตัวคำนวณหรือคำสั่งบิน เริ่ม3Dด้วยDiagramเสมอ; เลือกSatelliteแล้วรอภาพ ผู้ใช้กลับDiagramได้ระหว่างโหลด การกลับ2Dยกเลิกrequestแต่reuseภาพที่เสร็จแล้วได้ แผน/พื้นที่เปลี่ยนยกเลิกและปล่อยภาพเก่า การหมุนไม่มีfetchหรือmapprojectionใหม่

ผลตรวจใหม่482testsผ่านรวม24regressionsใหม่ (renderer6/loader11/controller7), syntax/3buildsผ่าน; browserโหลดGEEจริงและภาพเต็มพื้น สลับโหมด/keyboardorbit/desktop440pxและmobile340px/originalAOI/390pxoverflowผ่าน ยังไม่อ้างFPSหรือความละเอียดเกินsource10m ตรวจreleaseidentity/Productionแยกในworklog

### 3.12 สถานะเผยแพร่ 3D ground modes

เผยแพร่application commit`dc4743c`บนProductionแล้ว Verceldeployment`dpl_HRWQ22Sxg1cM2b8KzrxTHVCWM1vw`READY/aliasตรงcodeและCI40488389541success Browserเว็บหลักตรวจnormalflowจนแสดงsatellitegroundReadyจริง สลับDiagram/Satelliteและkeyboardorbitได้ AOIและpreviewdimensionsไม่เปลี่ยน ไม่พบconsole errorที่ตรวจ ภาพและJSONหลักฐานอยู่ใน`output/release-check/3d-satellite-ground-2026-10-27/`

ขอบเขตนี้ใช้ภาพสีจริง10mบนพื้นราบตามพิกัด ไม่ได้สร้างcontinuous terrain/buildingsเพิ่ม ความสมจริงขึ้นกับresolution/เมฆของsource ภาพfloorและภาพreviewมีวันที่แยกกัน ไม่ใช้floorเป็นevidenceหรือreadiness ผู้ใช้เปิดขั้น3 → 3D → Ground Satelliteเพื่อใช้โหมดใหม่ กลับDiagramได้โดยรักษามุมมอง งานคิวอื่นยังไม่ได้implementเพราะreleaseนี้

### 3.13 แผนปิดงานวันนี้: บัญชีส่วนตัว + AIผลเตรียมไว้ + planner

**บันทึกแผนก่อนannotationล่าสุด:** ใช้ข้อ3.15แทนข้อกำหนดที่กล่าวถึงnormalprofile/scheduleและลำดับเดิม งานนั้นถูกผู้ใช้ตัดออกแล้ว

ผู้ใช้ยืนยันขอบเขต27ต.ค.2026: ต้องรวมบัญชีส่วนตัวและAIจากผลที่เตรียมไว้ ใช้ประมาณ4ชั่วโมงที่ผู้ใช้อยู่ดูเป็นcheckpointหลัก แผนนี้ยังไม่ได้implement ไม่เปลี่ยนสถานะคิวเป็นเสร็จเพียงเพราะมีแผน

**เส้นทางส่งมอบขั้นต่ำ:** Loginอีเมล/รหัสผ่านบัญชีที่ทีมจัดให้ → เปิดหนึ่งชุดAI/SARที่เตรียมไว้ภายในcoverageของมัน → เห็นcandidateตามพิกัด/วันที่จริง → Inspectorเลือกหรือแก้inspectionpolygon → สร้างplanด้วยprofileเดิม/เลือกHome/กรอกstartและderivedend → Saveส่วนตัว/history/reopen → ดาวน์โหลดเมื่อchecksครบ คง3ขั้นและ4calculators ทุกบัญชีเป็นInspectorและเห็นเฉพาะงานของตน

**แบ่งmodule/ownershipในการทำงานคู่ขนาน:**

- สายA: auth/session/serverroutes+durableDB/owner-scopedmission/snapshotrevisions/teamprovisioning ไม่มีGoogle/publicsignup ใช้authimplementationที่ดูแลต่อได้และตรวจcross-ownerบนserver ต้องตรวจdeploymentpathก่อน เพราะworkspaceD1/R2เดิมยังไม่ใช่hostedAPIของVercelmain และauditactorไม่ใช่ownership
- สายB: แยกaircraftsimulationdefaultsออกจากdatasourcedemo เติมnormalflowด้วยค่าที่มีอยู่; scheduleแยกuserstart/derivedend อัปเดตconditionscoverage/readiness/exportตามduration รักษาstart/reviewinvalidations และเก็บUXPrototype labelsที่ผู้ใช้เคยสั่งเอาออก
- สายC: ทำpreparedSARmanifest+mask-to-GeoJSONตามoutputaffine/NoData/CRS/threshold/hash รักษาrawcandidategeometry แต่ให้Inspectorส่งหนึ่งboundedpolygonที่plannerรองรับ เก็บresult/model/source/image/run/reviewmetadata ห้ามส่งทั้งmaskซับซ้อนเข้าplannerโดยไม่review
- Coordinatorทำclient/UI integrationจุดเดียวหลังmodulecontractsลงตัว ไม่ให้หลายสายแก้planning-trial-client.jsพร้อมกัน ภาพพื้น3D/selectedimagereviewและAIresultเป็นคนละแหล่ง ต้องแสดงวันที่/ความหมายตรงกัน

**จุดตรวจเวลา:** 0–20นาทีตรวจauth/DBพร้อมและตรึงcontracts;20–135ทำ3สายคู่ขนานพร้อมfocusedchecks;135–180รวมก่อนและปิดfeatureเพิ่ม;180–215ทดสอบflow/สองบัญชี/history/errors/mobile/suite/build;215–230ผู้ใช้ตรวจและแก้blocker;230–240releaseและตรวจProductionเมื่อได้รับคำสั่งให้เผยแพร่

**เกณฑ์จบ:** สองบัญชีแยกข้อมูลจริงทั้งAPI/ไฟล์,session/logoutทำงาน,Saveและreopenผล/ประวัติตรง,AIoverlayพิกัดตรงexportedgridและเลือกpolygonไปplannerได้,เวลาเริ่มไม่ถูกเลื่อนเองเวลาจบอิงภารกิจ,normalflowexportได้เมื่อข้อมูลครบ,missing/expiredข้อมูลยังแจ้งเหตุผล,2D/3Dและmobileไม่พัง ข้ออื่นเช่นemailselfserviceresetเต็มชุด/การแชร์หลายคน/AIภาพใหม่/Pi/รายงาน/capacityเต็มแยกอนาคตได้ แต่ทีมต้องมีวิธีจัดการบัญชีช่วงทดลองที่ใช้งานได้จริง

**เวลาเป็นประมาณการ:** auth/privateSaveทั้งชุดอาจใช้3–6ชั่วโมงแม้infraพร้อม เป้า4ชั่วโมงรวมทุกสายจึงเป็นbestcaseและมีความเสี่ยง ควรกันเพิ่ม2–4ชั่วโมงเมื่อมีprovisioning/integrationติดขัด แจ้งสาเหตุและงานที่เสร็จจริงที่checkpoint ไม่แทนprivateSaveด้วยbrowserlocalstorageหรืออ้างว่าการดูผลเก่าคือnewinference

รอบวางแผนนี้อ่านsource/queue/SARartifactsและproductionidentityเท่านั้น ไม่รันtests/inference ไม่เปลี่ยนapplication/backend/accountและไม่push/deploy ผล482testsที่กล่าวในข้อก่อนเป็นผลrelease3Dครั้งก่อน

### 3.14 การทำงานกับแชทสนับสนุนโดยมีผู้แก้เว็บจุดเดียว

ผู้ใช้ยืนยันให้แชทหลักนี้แก้websiteเท่านั้น อีกแชททำdata-preparation/review/test-design แล้วส่งกลับ ขอบเขตเขียนของsupportคือ`C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/support/` source/tests/API/DB/config/package/build/Git/releaseของwebอยู่กับmain อ่านได้แต่ไม่mutate สำหรับcanonicalMarkdownให้รักษาAGENTSด้วยappendรายการสั้นของsupportพร้อมreportreferenceและอ่านล่าสุดก่อน ไม่แก้overviewหรือstructuredqueueที่mainดูแล

**ชุดส่งมอบที่แนะนำ:** manifest.json(source/time/model/threshold/grid/NoData/hash),candidates.raw.geojson(georeferencedanalysisไม่ใช่reviewedplan),validation.json(checkผลจริง/failed/not_run),utilityscriptตรวจซ้ำ,TEST_PLAN.md(input/action/expected/assertion/evidence/status),HANDOFF.md(3parts) ห้ามทำconfidence/accuracyที่ไม่มีหลักฐานหรือแปลงrawgeometryเป็นhullเพื่อให้plannerผ่าน แชทหลักเป็นผู้ทำboundedplanningPolygonและInspectorreviewโดยคงrawsourceอ้างอิง

**เกณฑ์รับข้อมูล:** sourcehash/gridตรง,outputcropaffineถูก,NoDataไม่กลายเป็นcandidate,components/holesไม่หาย,areaในmetricCRS,polygonize/rasterizeและCRSroundtripมีmismatchcountชัด,metadataระบุpreparedresultและnewinference=false primaryตรวจซ้ำก่อนใช้ ผลเหล่านี้ไม่แทนwebsiteintegration/privacytests

**การส่งต่อ:** ให้supportส่งabsoluteHANDOFF.mdpathกับข้อสรุปพร้อม/ติด/ยังไม่รัน แล้วผู้ใช้นำpathมาให้mainอ่าน ไม่ต้องคัดลอกรายงานยาวทั้งหมด การอ่านหรือรายงานจากsupportไม่ให้สิทธิ์deployหรือแก้เว็บอัตโนมัติ และไม่ส่งข้อความระหว่างuser-ownedchatsหากผู้ใช้ยังไม่อนุญาตโดยตรง

**เวลา:** ส่งfindingsแรกประมาณ20นาที/ข้อมูล45–90นาทีเมื่อruntimeพร้อม ระหว่างนี้mainทำauth/plannerและจุดเชื่อมต่อไป รายงานsetupblockerทันที defaultPythonที่supportตรวจไม่พบgeospatialpackages จึงอาจต้องใช้environmentแยกหรือส่งschema/testdesignก่อน การช่วยงานนี้ลดdata/reviewงานซ้ำแต่ไม่ลดเกณฑ์privacy/authของแผน4ชั่วโมง

เอกสารเริ่มงาน: `SUPPORT_CHAT_BRIEF.md`, `TEST_PLAN_TEMPLATE.md`, `HANDOFF_STATUS.json` ในโฟลเดอร์แม่ดังกล่าว รอบนี้สร้างbrief/templateและอัปเดตcanonicaldocs/queue ไม่แก้application ไม่รันทดสอบหรือconversion/inference และไม่push/deploy


<!-- support-sar-handoff-2026-10-27-01a17cf8 -->
### 27 ตุลาคม 2026 17:58 น. — แชทสนับสนุนส่งชุด prepared SAR (local)

งานsupportรอบนี้เพิ่มข้อมูล/utilityนอกcheckoutเท่านั้น ไม่เปลี่ยนarchitectureหรือพฤติกรรมเว็บไซต์ ดู [HANDOFF.md](C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/support/HANDOFF.md) และ TEST_PLAN.mdข้างกัน (44กรณีdesigned_not_run) แชทหลักเป็นผู้ทำadapter/UI/review/planner/privateSaveและรันทดสอบระบบจริง

ข้อเท็จจริงสำหรับintegration: manifestเป็นproposedcontractไม่ใช่website schema; WGS84FeatureCollection14Polygonคงrawgeometry/0holesของmaskจริง ใช้EPSG32647outputcropaffineและNoData255/-9999;32offlinechecksผ่าน/native+WGS84rasterroundtripmismatch0/area1,524,800m²; coverage1valid+2NoDataregionsและcoordinate_reference.jsonพร้อมสำหรับmaptests ให้แยก60.16784%validต่อoutputgridจาก61.69944%scenefootprintต่อAOI

ต้องให้Inspectorreviewหนึ่งplanningPolygonก่อนplanner: componentใหญ่candidate-00012มี378จุดเกิน120 ห้ามauto-hull/bboxหรือเอาพื้นที่candidateใส่oilquantity คงraw/result/review/targetrevisionsแยกกัน วันภาพ9ต.ค.กับinference11ต.ค.และcontextSentinel-2เป็นคนละเวลา ไม่มีnewinferenceหรือaccuracyvalidationรอบนี้ Currentcheckpoint/inputhashesตรงแต่modelVersion/preprocessingVersionและrun-time-script-hashที่ไม่มีหลักฐานยังnull

การตรวจเว็บ/auth/privacy/browser/save/exportและdeploymentยังnot_runในsupportรอบนี้ ไม่reuseผล482testsเดิม;source/API/DB/config/package/website tests/buildไม่ถูกsupportแก้ การติดตั้งGISใช้support/.venvเท่านั้น mainตรวจhash/contract/georeferenceอีกครั้งก่อนนำเข้าและรวมสถานะoverview/queueเองตามownershipเดิม

### 3.15 แผนล่าสุดหลังannotation:3งานและInspectorแก้พื้นที่เสี่ยง

ข้อกำหนดนี้ใช้แทน3.13/3.14ในส่วนที่ขัดกัน: ตัดงานnormalflow/profile/scheduleใหม่ (ก่อนหน้า1/เดิม3) เพราะผู้ใช้ยอมรับprototypeเดิม อนุมัติimplementationล่าสุด1UX/2บัญชี/3preparedAI (ก่อนหน้า2/3/4,เดิม4/5/6) และเพิ่มriskediting ชุดSARsupportส่งแล้ว32data checks/mainhash12filesverified จึงไม่ตั้งsetup/แปลงdataเดิมเป็นงานรออีก ไม่ถือว่าการตรวจdataนี้เป็นwebsiteintegration

**ลำดับ:** auth/privateMission+UXเป็นฐาน ขณะsupportทำriskeditfixture → mainเชื่อมpreparedAI/InspectorRiskDraft/confirmedreview/planningtarget → privateSave/reopen/history → ตรวจรวมบนprototypeplannerเดิม Normalfull-export/profiledefaults/userstart-derivedendที่ถูกตัดไม่ใช่releasegate และไม่เปลี่ยนUnknown/readinessให้ผ่านเทียม

**editorภายในขั้น2:** เลือกcandidateแล้วแก้ตำแหน่ง/ลากเพิ่มลบจุด/วาดใหม่/เพิ่มพื้นที่เอง/ปฏิเสธ พร้อมUndo/Cancel/คืนรูปทรงAIของdraftและยืนยันrevision เปรียบเทียบrawAIกับInspectorlayerได้ rawresultและhashไม่เปลี่ยน reviewer/timeจากsession/server;originและcandidate/resultrefsแยกmanual/editจากML ผู้ใช้ไม่จำเป็นต้องระบุเหตุผลยาวเป็นบังคับเพื่อแก้พื้นที่

**รูปข้อมูลแยกกัน:** rawAnalysis(immutable),candidateDecisions,InspectorRiskDraft,confirmedRiskReview,planningTarget,planRevision Risklayerที่ยืนยันไม่ใช่หลักฐานน้ำมัน/ความหนา targetplannerยังหนึ่งPolygonไม่มีรู≤120จุด Raw14componentsรวมcandidate00012มี378จุดเก็บครบ ให้Inspectorวาดboundaryบินใหม่หรือreviewdraftที่ลดรูปอย่างชัดเจน ไม่hull/dropverticesเงียบ เป้าความเร็วรอบแรกใช้redrawboundary ไม่จำเป็นต้องทำautosimplifyใหม่

**lifecycle:** drafteditingล็อกuse/export;confirmใหม่invalidateplanและreadinessเดิม;cancelคืนconfirmedgeometryแต่ตรวจความสดใหม่;Savefailไม่ล้างdraft;สองแท็บใช้expectedrevisionconflictได้;review/target/sessionเปลี่ยนหลังexportrequestแล้วresponseเก่าต้องใช้ไม่ได้ การเลื่อนvertexต้องไม่ใช้setGeometryที่resetimage/scheduleทุกครั้ง แยกsearchAOI/sourceimagereviewกับrisk/targetแล้วอัปเดตขอบเขตที่ยืนยันผ่านจุดเชื่อมเดียว

**coverage:** manualareaขยายเกินMLcandidateได้ ในส่วนที่AIไม่มีvalidcoverageให้คงmanualorigin หากออกนอกภาพ/missionที่reviewไว้ต้องเพิ่มreviewพื้นที่ใหม่ก่อนplan ไม่clipเงียบหรืออ้างAIตรวจแล้ว ส่วนHomeเปลี่ยนคงAIdecisionแต่ประเมินrouteใหม่ พฤติกรรมเวลากับprofileเดิมคงไว้ตามการตัดscope

**แบ่งงาน/เวลา:** 0–20mainตรวจbackend/contractพร้อมsupportตรวจกรณีedgeจากpackageเดิม;20–100mainบัญชี/Save/UXขณะsupportทำfixturetestaddendum;100–165mainAIeditor/privatehistory/plannerintegration supportreviewreadonly;165–205mainรันprivacy/edit/reopen/stale/mobile/checks/build supportตรวจหลักฐาน;205–225ผู้ใช้ลอง+แก้blocker;225–240เอกสาร/releaseverificationตามauthorization เวลา4ชั่วโมงเป็นเป้าเมื่อinfraพร้อม ต้องทบทวนเมื่อ20นาทีถ้ายังติดauth/DB

**supportงานต่อ:** อ่าน`REVIEW_EDIT_ADDENDUM.md`ในoutputแม่แล้วเขียน`support/review-edit/HANDOFF_ADDENDUM.md`,TEST_PLAN_EDITING.md,fixtures,validationของfixture แยกจากcorepackageเดิม ทุกwebcaseยังdesigned_not_runจนmainรันจริง ไม่ต้องให้supportแก้websiteหรือmodel/threshold

รอบนี้ปรับเอกสาร/คิว/briefและอ่านตรวจhashจริงเท่านั้น ไม่มีapplicationedit/websitechecks/newinference/provisionaccountDB/pushdeploy รายการส่งมอบsupport17:58ในMarkdownคงอยู่

### 3.16 Promptขั้นแรกสำหรับแชทสนับสนุน

Promptเต็มพร้อมใช้เก็บที่`C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/PARALLEL_STEP_1_PROMPT.md` อิงขอบเขต3.15และpackageที่ส่งแล้ว ขั้นแรก=readonlyacceptance→risk-editfixtures/testdesignนอกcheckout ไม่เริ่มแก้เว็บหรือสร้างcoredataใหม่ มีreadorder/allowedwrites/forbiddenoperations/data-vs-websitecheckstatus/revisionprivacycoverage/378vertexhandling/outputacceptance/timebox/absolutehandoffformatครบ

ข้อป้องกันสำคัญ: ไม่รันหรือimportsupport/prepare_result.pyที่อาจเขียนcorepackageทับ ใช้checksumreadonlyและutilityใหม่ในsupport/review-edit/;ใช้venvเดิมก่อน;fixtureที่อ้างvalidcoverageต้องvalidateจริง;rawsourcehashต้องคงเดิม;websitecasesยังdesigned_not_runจนmainimplementและรัน บันทึกกลางsupportอ่านล่าสุดแล้วappendreferenceสั้นตามAGENTS ส่วนoverview/queueและwebsiteintegrationmainดูแล

รอบนี้เขียนprompt/queue/documentsเท่านั้น ไม่แก้application ไม่รันconversion/fixture/appchecks/inferenceหรือhashตรวจซ้ำ ไม่push/deployและไม่ส่งคำสั่งไปuser-ownedchatอื่น


<!-- support-review-edit-2026-10-27-01a17cf8 -->
### 27 ตุลาคม 2026 21:19 น. — Support ส่ง Inspector risk-edit fixtures

Supportส่ง [risk-edit HANDOFF_ADDENDUM.md](C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/support/review-edit/HANDOFF_ADDENDUM.md) และSTATE_FLOW/TEST_PLAN_EDITINGนอกcheckoutแล้ว ไม่เปลี่ยนพฤติกรรมwebในรอบsupportนี้ แนวทางraw/draft/decisions/confirmedreview/oneplanningtarget/planแยกจากsearchAOIและimagereview;ทุกschema/statefieldในfixtureเป็นproposedtestcontract Mainเทียบschemaล่าสุดเองก่อนเชื่อม

หลักฐานใหม่: readonlycore12hashตรง+22watchedfilesคงเดิม,19geometries/14scenarios,298offlineassertionsผ่าน,3invalidgeometrycoverage not_runตามนิยาม/rejectionผ่าน RE01–RE14ทั้งหมดdesigned_not_run ไม่ใช่webtests/raw378คงเดิม manualredraw4จุด10,000m²เป็นsyntheticunconfirmeddraftภายในcandidate ไม่ใช่simplifiedraw;coveragemanualvalid/mixed/NoData/outsidefootprintderiveและvalidateจากrasterจริง

จุดซ่อม/เชื่อมที่mainต้องตรวจsourceล่าสุด:clientsetGeometry:254/resetSurvey:468–473ล้างภาพ/schedule;body:221กับtrial-api:27–39resolveเดิมsurveyboundary;export:292awaitensureFreshก่อนcapture revision:293ควรมีcontextguardก่อนawaitแรก/หลังawait/ก่อนdownload รวมedit/logout/cancelABA/expiry Saveackเก่าห้ามทับdraftใหม่ ข้อเหล่านี้เป็นstaticsourcefindingsไม่ใช่browserrepro

ปลายรอบเห็นmainเพิ่มuntrackedinspector-mission-document/save schemas/examples อ่านสองschemaแบบread-onlyแล้ว พบแยกinvalidsavabledraftจากvalidatedconfirmtargetและexpectedRevision/mutationIdสอดคล้องทิศทาง แต่ยังเป็นPhase1artifactsไม่ใช่deploy/APItestผ่าน ดูsource_drift_observation.jsonและhandoff§3.7ก่อนmapping

Scopeoverride:ไม่ดึงnormalprofileหรือuserstart-derivedend/fullnormalexportgateกลับมา เก็บplanner/schedule/readinessเดิม ไม่มีweb/source/API/DB/schema/config/package/tests/buildchangesโดยsupport ไม่มีinference/Productioncalls/Git/deploy รอคำตอบผู้ใช้ไม่มี Mainรวมoverview/queueและดำเนินintegration/testing/releaseตามauthorizationเดิม

### 3.17 Phase1: backend readiness และ private mission/review contracts

**สถานะจริง:** phase1เริ่มแล้ว สร้างlocalcontractartifactsแต่hostedAuth/privateSaveยังไม่implement LiveSupabase`tstmjnlhwidwtzetqxbu`ผู้ใช้ยืนยันและแจ้งteaminvite/refreshแล้ว แต่connectorยังprojectpermissiondenied/listorganizations1ส่วนตัว/listprojects2อื่น Databasehealth/schema/authconfigของXEDOยังไม่ทราบ IABfallbackเป็นSignIn Vercelprojectmetadataอ่านได้แต่envmetadata403และไม่มีCLI localSupabase/DBconfigurationตรวจpresenceแล้วไม่พบ ไม่เปิดเผยsecret ไม่ตั้งบริการหรือเปลี่ยนสิทธิ์

**ทางเชื่อมที่เสนอ:** คงVercelstaticcalculator/GEE APIsและworkspaceD1/R2เดิม เพิ่มfirstpartyloginที่ใช้SupabaseAuthในprojectเดิมและowner-scopedprivateMissionpersistenceหลังเข้าถึงและinspectschemaจริงได้ ไม่ใช้user_metadataเป็นauthorizationและไม่ใช้servicekeyในbrowser Normaluserdatarequestsต้องตรวจauthenticatedsubjectและownerจริงทุกread/write/history/artifact และใช้RLS/appropriategrantsเป็นอีกชั้น ไฟล์preparedSARsharedcatalogคงimmutable privateedits/historyอยู่ภารกิจแต่ละคน ยังไม่applySQLหรือprovisionAuthusersในphase1

**Contractartifacts:**

| ไฟล์ | รูปข้อมูล |
| --- | --- |
| `contracts/inspector-mission-document.schema.json` | schemaVersion/title/inputMode/searchGeometry/imageSelection/analysisRef/riskDraft/planningInputs;ไม่มีowner/reviewer/authoritativeservertimeหรือreadinesssealจากclient |
| `contracts/inspector-mission-save.schema.json` | missionId nullablecreate,expectedRevision0เมื่อcreate/≥1เมื่อupdate,mutationIdUUID,intent save_draft/confirm_risk,document;confirmต้องมีplanningtargetPolygonเดียวไม่มีรู≤120vertices |
| `contracts/examples/inspector-save-draft.json` | ตัวอย่างcreate draftผูกcandidate00001และhashชุดจริง UUIDเป็นfixture ไม่มีrequestถูกส่ง |
| `contracts/examples/inspector-confirm-risk.json` | ตัวอย่างconfirmriskที่expectedRevision1และmutationIdใหม่ geometry8vertices ไม่อ้างInspectorยืนยันจริง |

Schemaเป็นขอบเขตโครงสร้าง ไม่ใช่geometrytopologyหรือauthorization Draftareasใช้ringsที่ยังไม่completeได้;confirmต้องvalidateclosure/3distinctpoints/area/selfintersection/coverage/missionlimitsและrejectedcandidate mappingจริง ไม่มีการลดrawcandidate378จุดให้ผ่านเงียบ เก็บAI/refreviewในoutermissiondocument ไม่เพิ่มtopfieldในplanning-trial-requestที่rejectunknownfields ภารกิจรวม≤1MiBและplanninginputs≤64KiBต้องenforceที่transport/runtime

**Persistenceที่กำหนดเพื่อไปimplementต่อ:**

1. mission_heads:`id,owner_id,current_revision,title,status,created_at,updated_at`
2. mission_revisions:`mission_id,revision,parent_revision,document_json,document_hash,created_by,created_at` append-onlyและตรวจownerผ่านhead
3. mutation_receipts:`owner_id,mutation_id,request_hash,mission_id,committed_revision,response_receipt` uniqueowner+mutationId
4. preparedAnalysiscatalog:resultId/manifest-candidates-coveragehash/source-time-modelmetadata immutable ไม่คัดลอกrawเป็นผลแก้ของInspector

หนึ่งtransaction:ตรวจidempotentreceiptก่อนCAS (samehashreturnreceipt/differenthash409),ตรวจowner+expectedRevision,appendrevision+advancehead+receiptพร้อมกัน createใช้servergeneratedmissionId ผูกreceiptป้องกันduplicateจากretry Confirmsealและtargetrevisionใช้missionrevisionใหม่เดียวกันและinvalidateactiveplanในtransaction Draftsaveไม่เพิ่มconfirmedreviewrevisionเดิม responseมีcommittedrevision/hash/time/actorที่serverสร้าง 404รวมunknown/foreignไม่รั่วmetadata;409สำหรับstaleownrevisionและidempotencykeyreuse เป็นcontractproposalที่ยังไม่มีendpointdeploy

**Client/sessionlifecycle:** Saveไม่สำเร็จคงdraft;retryambiguousnetworkใช้mutationId/bodyเดิม;editใหม่ใช้IDใหม่ Autosaveเรียงลำดับไม่ให้lateackAล้างdirtyB Owner/reviewerมาจากservervalidatedidentity ทุกsave/read/revision/artifactยังต้องตรวจsessionและownershipจริง Logout/revocationรวมoldaccessต้องกำหนดmechanismและtestไม่อ้างSDKgetUserลำพังว่าrevokeสำเร็จ EpochguardในUIช่วยกันlateasyncแต่ไม่แทนserverauth

**Reopenและplanner:** restoreoriginalinputs/scheduleจากsnapshotแล้วrequestimagerysession/conditions/GEE/readinessใหม่ ห้ามใช้persistedpass/readygrantExport เก็บdurablesceneId/acquiredAt/grid/hash ไม่ใช้signedtileURL/tokenเป็นidentity ระหว่างriskeditingไม่เรียกsetGeometryทุกvertexเพราะresetSurvey/schedule;แยกconfirmedtargetadapterและguardbefore/afterexportด้วยsession/mission/review/target/input/localEditEpoch คงเวลาปกติ/demo/profileตามscopeที่ผู้ใช้ตัดงานrewrite

**การตรวจรอบนี้:** JSONparse/schema-relativeRefs/2examplepayloads,sourcehash12files,raw14candidates/378vertices,positivegeometryผ่านexistingdomain+120pointlimitและbytebudgets ไม่มีfullJSONSchemaenginevalidation (ยังไม่มีvalidatorในruntimeที่ตรวจ),ไม่มีruntimeAPI/สองบัญชี/RLS/transactiontests/build/newinference Outputหลักฐาน`output/release-check/phase1-inspector-backend-2026-10-27/`ไม่ได้แปลว่าbackendพร้อม

**supportพร้อมเพิ่มแล้ว:** review-edit/HANDOFF_ADDENDUM.mdมี19geometryfixtures/14REcases;supportรายงาน298fixtureassertionsexecutedpassed ไม่มีwebsitecasesexecuted Mainอ่านส่งมอบและรักษารายการsupport21:19 ไม่แก้packageหรือรันutilityซ้ำในรอบนี้

**อ้างอิงที่ตรวจวันนี้:** [Supabase password auth](https://supabase.com/docs/guides/auth/passwords),[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),[MCP organization authorization](https://supabase.com/docs/guides/ai-tools/mcp),[team access](https://supabase.com/docs/guides/platform/access-control) การอนุญาตMCPต้องครอบคลุมองค์กรที่มีproject;membershipจริงกับorggrantของconnectorยังต้องตรวจ ไม่ขอcredentialมาแปะchatและไม่ย้ายproject/accountอัตโนมัติ

### 3.18 Supabase connector: องค์กร megaphijak และขั้นตอนให้ผู้ใช้อนุญาต

**หลักฐานใหม่ 27 ต.ค. 2026:** ภาพผู้ใช้ `codex-clipboard-7c7fbbac-e7d3-4f23-9626-dfe125d36914.png` แสดง Chrome ที่ล็อกอินแล้วบน Dashboard `tstmjnlhwidwtzetqxbu` มี breadcrumb องค์กร **megaphijak** → project **xedo** → main PRODUCTION, สถานะ Healthy และ Nano ข้อมูลนี้พิสูจน์การเข้าถึง Dashboard ใน browser ของผู้ใช้ ชื่อองค์กรและ project ref ไม่ต้องถามซ้ำ ภาพไม่ได้แสดง role หรือองค์กรที่ OAuth ของ connector อนุญาต จึงยังสรุปสาเหตุที่แน่นอนไม่ได้

ผลเครื่องมือครั้งก่อนหลังผู้ใช้แจ้ง refresh เห็น 1 องค์กรส่วนตัวและ 2 โปรเจกต์อื่น ส่วน target denied รอบอธิบายนี้ **ไม่ได้เรียกซ้ำ** และไม่ตรวจข้อมูลโปรเจกต์อื่น สาเหตุที่ต้องพิจารณาคือองค์กรที่เลือกใน OAuth หรือบัญชี/connection ที่ใช้ต่างกัน เป็นข้อสันนิษฐานที่ยังต้องพิสูจน์ ไม่ใช่หลักฐานว่าอินเทอร์เน็ตหรือฐานข้อมูลเสีย

**ระบุตัวเชื่อมต่อจากไฟล์จริง:** user config เปิด plugin `supabase@openai-curated`; manifest อ้าง `.app.json` ซึ่งระบุ app ID `asdk_app_69d3e5ee6a708191baa733f7b8931995` ตรงกับ [หน้า Supabase plugin](https://chatgpt.com/plugins/plugin_asdk_app_69d3e5ee6a708191baa733f7b8931995) ที่เปิดตรวจผ่าน IAB แล้ว หน้าเผยแพร่แสดง App: Supabase, version 1.0.0 และ Read/Write แต่ IAB อยู่ในสถานะ Log in จึงยังไม่ได้เห็นเมนู connection settings ส่วนตัวของผู้ใช้ ไม่ยืนยันชื่อปุ่ม Reconnect/Add account ที่บัญชีนั้นมีจริง และไม่ได้เปลี่ยน `.codex/config.toml` หรือสร้าง MCP server ตัวใหม่

**ขั้นตอนหลักสำหรับผู้ใช้:**

1. ใช้บัญชี ChatGPT/พื้นที่ทำงานเดียวกับแชทนี้ เปิดหน้า Supabase plugin ข้างต้น หรือ Plugins → Installed → Supabase; ถ้า client แสดง Apps ให้หา Supabase ในหน้านั้น ตามเอกสาร OpenAI
2. เปิดรายละเอียด App/การเชื่อมต่อ Supabase ของ plugin แล้วตรวจบัญชีที่ผูกอยู่ ถ้ามีปุ่มเชื่อมต่อใหม่หรือเพิ่มบัญชี ให้ใช้เพื่อเริ่ม OAuth ใหม่ ชื่อปุ่มต้องยึดหน้าที่แสดงจริง หากไม่มีปุ่มดังกล่าว ให้ตรวจภาพหน้าการเชื่อมต่อก่อนแนะนำถอด connection ห้ามสั่ง uninstall plugin หรือ revoke grant เหมารวมเพื่อเดาแก้
3. Browser ที่ OAuth เปิดขึ้นมาต้องใช้ Supabase account ที่เข้าถึง megaphijak/xedo ได้ ตรวจตัวตนในส่วน Authorizing as เพราะ browser profiles อาจล็อกอินต่างบัญชีกัน
4. ที่ Organization เลือก **megaphijak** ถ้ามีตัวเลือก Project ให้เลือก **xedo** และเทียบ ref **tstmjnlhwidwtzetqxbu**; ไม่สรุปว่าทุก client มี project selector
5. อ่าน app/client name และ Permissions requested แล้วกด Authorize ของ client ที่เริ่มเชื่อม ผู้ใช้เป็นผู้ทำการอนุญาตเอง ใช้ OAuth ปกติ ไม่ต้องส่ง PAT/API key/password ให้แชท
6. กลับมาแชทเดิมและแจ้งผล ผมจะตรวจ target organization/project ผ่าน connector อีกครั้งเมื่อมีสถานะเปลี่ยนแล้ว การขึ้น Connected หรือ Healthy เพียงอย่างเดียวไม่ใช่เกณฑ์ผ่าน ถ้า client แจ้งต้อง reload/restart จึงทำตาม ไม่รับประกันว่า restart แก้ปัญหาได้

**ทางตรวจการอนุญาตฝั่ง Supabase:** เลือกองค์กร megaphijak แล้วเข้าส่วน Organization Settings → Connections → OAuth Apps → **Authorized apps** ตาม navigation/source ทางการ บาง layout มี OAuth Apps โดยตรงใน sidebar; จุดเข้า Organization Settings จาก screenshot นี้ยังไม่ถูกกดตรวจ จึงไม่ระบุว่ารูปเฟือง project หรือปุ่มใดทำหน้าที่นั้นแน่นอน ดูรายการและสิทธิ์ที่อนุญาตให้ client ไว้ ส่วน Published apps/Add application ใช้สร้าง OAuth app ของตนเอง ไม่จำเป็นกับการเชื่อมนี้ ไม่อนุมาน URL `/org/megaphijak/apps` เพราะชื่อแสดงผลอาจไม่ใช่ slug จริง ปุ่ม Connect ในหน้า project มีหน้าที่เชื่อมบริการของ project ไม่ใช้แทนการเริ่ม OAuth ของ plugin

**ถ้าไม่พบ megaphijak หรือถูกปฏิเสธ:** ตรวจ account ในหน้า OAuth เทียบกับ browser ที่เปิด Dashboard ได้ก่อน ถ้ามี role/scope error ให้ใช้ข้อความนั้นวิเคราะห์ ไม่สั่งยกระดับเป็น Owner โดยอัตโนมัติ source ปัจจุบันมี member-bound grants ที่ไม่ต้องขอ admin เพิ่มเมื่อ role อนุญาต แต่ grant อีกประเภทอาจมีขอบเขตกว้างและเงื่อนไขต่างกัน Role จริง/grant type ของ connection นี้ยังไม่ทราบ ถ้าไม่มีเมนูอนุญาตหรือองค์กร ให้ผู้ใช้ส่งภาพเฉพาะหน้าปุ่ม/Organization/error โดยปิดข้อมูลลับ แล้วชี้ขั้นตอนจากภาพจริง ไม่ต้องวนเชื่อมใหม่หลายรอบ

**เกณฑ์กลับไปทำ backend:** connector อ่าน `tstmjnlhwidwtzetqxbu` ได้จริง แล้วจึง inspect ตาราง/Auth/config เดิมอย่างอ่านอย่างเดียว ก่อนออกแบบ migration และ private missions ต่อ การอนุญาตเครื่องมือไม่ใช่การตั้งค่า login ของผู้ใช้ Inspector และไม่ย้าย backend D1/R2 โดยอัตโนมัติ

**หลักฐานรอบนี้และข้อจำกัด:** ตรวจ Git HEAD/status, local plugin metadata ที่ไม่มี secret, ภาพผู้ใช้, official OpenAI/Supabase docs และ public plugin page เท่านั้น มี subagent ช่วยค้นเอกสารแบบ read-only ไม่มี runtime source/DB/บัญชี/role/permission/config changes ไม่มี app tests/builds ใหม่ ไม่มี commit/push/deploy ผล 482 tests เป็นรอบเผยแพร่ก่อนหน้า รอคำตอบเรื่องผล OAuth grant ของ **megaphijak** เท่านั้น ไม่ถาม URL/ชื่อองค์กร/teaminvite/refresh เดิมซ้ำ

แหล่งอ้างอิง: [OpenAI Plugins](https://learn.chatgpt.com/docs/plugins), [OpenAI app connection inspection](https://learn.chatgpt.com/docs/build-plugins), [multiple connections](https://developers.openai.com/plugins/build/auth#support-multiple-accounts), [Supabase MCP OAuth](https://supabase.com/docs/guides/ai-tools/mcp), [organization navigation source](https://github.com/supabase/supabase/blob/master/apps/studio/components/layouts/ProjectLayout/OrganizationSettingsLayout.tsx), [Authorized apps source](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Organization/OAuthApps/AuthorizedApps.tsx), [consent source](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Organization/OAuthApps/Consent/OAuthAppsAuthorizeScreen.tsx)

### 3.19 Inspector foundation: implementation ในเครื่องและ migration gate

**สถานะ:** Supabase access แก้ได้แล้ว ต้องส่ง `link_id` ของ connection **megaphijak** ตาม metadata ปัจจุบันในทุก Supabase call อ่าน target `tstmjnlhwidwtzetqxbu` ได้ ACTIVE_HEALTHY ส่วน UI/API ใหม่ยังอยู่ใน working tree เท่านั้น SQL ยังไม่ถูกใช้จริงเพราะ auto-review ปฏิเสธ live migration และต้องรอคำอนุญาตที่ระบุชุดนี้ชัดเจน [รายละเอียดชุดเปลี่ยนและ hash](INSPECTOR_MIGRATION_REVIEW.md)

**Architecture ที่เขียนแล้ว:** หน้า planner → `inspector-client.js` → same-origin `/api/v1/inspector/*` → `api/inspector.mjs` BFF → Supabase Auth / PostgREST RPC โดยใช้ user JWT กับ publishable key ไม่ใช้ service-role key URL/key public ของ xedo อยู่ใน `inspector-project.js`; environment ถ้าตั้ง URL ต้องตรง target ไม่ silently ไปอีก project Node/Vercel routes แยกจาก GEE และ calculator เดิม

**Session:** ฟอร์มอีเมล/รหัสผ่านบน XEDO ไม่มี Google/signup/role selector ทุกบัญชีที่ทีมอนุญาตเป็น Inspector Access token อยู่ใน HttpOnly cookie (`__Host-`/Secure/SameSite=Lax บนHTTPS; dev cookieเฉพาะlocalhost) ไม่ส่ง token ให้ JS/response/localStorage รุ่นแรกไม่มี refresh token ต้อง login ใหม่เมื่อหมดอายุ cookieสูงสุด1ชั่วโมง ทุก private response no-store และ mutation ต้อง Origin ตรง+JSON ตรวจ expected actor จากheaderเทียบ `/auth/v1/user` ก่อน RPC เพื่อกัน sharedcookie เปลี่ยนบัญชีอีกแท็บ ค่าheaderไม่ใช่ authorization

**Persistence ที่รอ apply:** schema xedo_private มี inspector_accounts/revoked_sessions/mission_heads/mission_revisions/mutation_receipts เปิด RLS และไม่มี direct table grants ให้anon/authenticated Public wrapperเป็นSECURITY INVOKER; private routinesที่ทำtransactionเป็นSECURITY DEFINER แบบsearch_pathว่าง/fullyqualifiedและตรวจownerเองทุกoperation ต้องมีauth.uid/session_id/JWTexp/auth.sessions.user_id+not_after/ไม่มีrevocationและอยู่team roster ยกเว้นlogoutยอมให้disabledaccountrevoke sessionของตัวเอง

Save เป็น draft-only ใช้ session advisory lock→mutation lock→receipt lookupก่อนCAS→owner/headrowlock→appendrevision+updatehead+receipt atomic ส่วนconfirm_riskยังreject untilAIvalidationพร้อม Unknown/foreignID=404,staleownrevision/idempotencyreuse=409 Requestผ่านAJV2020/formats/geometry/budgets1MiB+64KiB; DBมีshape/size/actionขั้นต่ำอีกชั้น และBFFvalidateopened documentก่อนแตะmissionปัจจุบัน

**UI/state:** My missions เปิดได้โดยไม่เปลี่ยน3ขั้นหลัก Saveไม่ต้องรอcalculationสำเร็จ มีSavecopy/ประวัติ/เปิดrevisionเก่า Retryคำขอที่ผลไม่ชัดต้องใช้mutation/bodyเดิม SaveackAไม่ล้างdirtyB ถ้าเปลี่ยนaccount/mission/editก่อนopenตอบกลับจะรักษาร่างปัจจุบัน Initialsessionmetadataรักษาdirtytracking Open/New/Logoutมีdiscardpromptเมื่อจำเป็น Requestฝั่งUIเรียงลำดับ; logoutล้างprivateUIและinvalidateasyncงานเก่า การloginใหม่บัญชีเดิมรักษาร่าง/identity ส่วนสลับคนล้างข้อมูลเก่า

**Planner restore/export:** เก็บ actual geometry/inputMode/durable scene identity/input values ไม่ใช้workspace surveyId เป็นตัวอ้างอิง private เปิดกลับคืนข้อมูลหลังvalidateทั้งหมด แล้วล้างimagerysession/reviews/readinessและขอภาพ/conditionsใหม่ ค่าความพร้อมเก่าไม่ปลดล็อกexport ตรวจ account/session ก่อนawaitแรกและก่อนdownloadอีกครั้ง พร้อมเทียบ context/revisionหลังfreshness/ผลexport คงcalculation/browserfileAPIเดิมและ profile/scheduleที่ผู้ใช้ตัดงานrewriteไปแล้ว

**การดูแลบัญชีโดยทีม:** ผู้ใช้ยืนยันยังไม่มีบัญชีทดลอง ให้เตรียมระบบก่อน ทีมสร้างSupabaseAuthuserแล้วเพิ่มuser_idในinspector_accountsผ่านadmin SQL ไม่มีการสร้างบัญชีจริงจากรอบนี้ ตรวจpublicAuthsettingsได้emailenabled=true/disable_signup=false ณ27ต.ค. provider signupยังไม่ถูกปิด แต่XEDOไม่มีsignup routeและRPCไม่ให้บัญชีนอกrosterใช้ภารกิจ ต้องตรวจนโยบายนี้ก่อนrelease ไม่ขอpasswordให้แชท

**การตรวจ:** 500testsผ่าน/syntaxผ่าน/production+workspace+portablebuildผ่าน LocalPGliteใช้PostgreSQLจริงกับfixtureauth schema/claims ทดสอบowner/history/CAS/idempotency/grants/active-session; browserใช้simulatedAuthและDBนี้ ตรวจA2revisions/stale409/logout/Bempty/Savearea24,131m²/reopen3steps4calculators/exportdisabled/mobile390ไม่overflow สิ่งนี้ไม่ใช่hostedpasswordlogin/realaccounts/realSupabaseRLS/multiconnectionconcurrency acceptance QAserver `npm run preview:inspector` เฉพาะlocalhost; หลักฐานignored `output/release-check/inspector-foundation-2026-10-27/`

**ยังเหลือก่อนนับบัญชีเสร็จ:** ขอexplicitapproval migrationตามreviewfile→applyกับtargetเดิม→ตรวจgrants/advisorsจริง→ทีมสร้างบัญชี+roster→realA/B/login/logout/privacy/concurrency/reopen acceptance→รวมUX/AIriskeditorแล้วตรวจrelease ไม่มีcommit/push/deployในรอบนี้ packageauditmoderate4ในสายdevtoolsเดิม/highcritical0 ไม่forcefixข้ามscope

### 3.20 สถานะ account ที่ชี้แจงเมื่อ 28 ตุลาคม 2026

**หัวข้อ:** ขอบเขตคำว่าเสร็จสำหรับระบบบัญชี

**สรุป:** Inspector foundation พร้อมใน working tree ที่ตรวจในเครื่องแล้ว ยังไม่ใช่ระบบบัญชีที่เปิดใช้บนเว็บไซต์จริง migration/private RPC ยังรออนุมัติและไม่มีบัญชีทดลองจริง ผู้ใช้เลือกให้ทีมสร้างภายหลัง

**รายละเอียด:** Login email/password, session/logout, My missions, Save/copy/history และการแยกเจ้าของมีโค้ดและผลทดสอบรอบ 27 ต.ค. ตาม §3.19 การยืนยันเปิดใช้งานจริงยังต้อง apply ชุด SQL ที่ตรวจแล้วบน xedo หลังอนุมัติ ตรวจ grants/advisors ให้ทีมสร้าง Auth users พร้อม roster ทดสอบด้วยบัญชีจริง A/B และเผยแพร่โค้ดตามขอบเขตที่ได้รับอนุญาต การเข้า Supabase ได้ไม่เท่ากับ application account เปิดใช้แล้ว รอบชี้แจงนี้อ่านเอกสาร/Git status และอัปเดตสอง Markdown ไม่มี source/SQL/config edit ไม่มี tests/build/browser/service verification ใหม่ และไม่มี commit/push/deploy รอคำตอบเรื่องอนุมัติ migration เดิมเท่านั้น ไม่ตีความคำถามสถานะเป็นอนุมัติ

### 3.21 Inspector database: ใช้ migration จริงและตรวจสิทธิ์ 28 ตุลาคม 2026

**หัวข้อ:** ใช้ชุดฐานข้อมูลที่ผู้ใช้อนุมัติ แล้วตรวจโครงสร้าง/สิทธิ์โดยไม่สร้างบัญชี

**สรุป:** migration **20261027184951 / xedo_inspector_foundation** อยู่ใน Supabase xedo/ref`tstmjnlhwidwtzetqxbu`แล้ว Hashไฟล์เดิมตรง **62fe9b38623b3e3b8ce4fd04ad2cbb9aace6ca8553ae817ef34e31f6cc1633d2** เกณฑ์livecatalog/body/count10กลุ่ม+negativeprobes5รวม15ผ่าน ไม่มีคำอนุมัติmigrationค้าง ไม่มีfrontend/APIreleaseหรือบัญชีจริง สถานะนี้แทนgateรอบเก่าใน3.19–3.20

**รายละเอียดโครงสร้างและสิทธิ์จริง:** schema`xedo_private`มี5tablesตาม3.19 RLSทุกตัว ไม่มีpolicyเพราะปิดdirectaccessและให้checkedRPCทำงานเท่านั้น anon/authenticatedไม่มีสิทธิ์ตาราง7แบบและcolumns4แบบ authenticatedมีschemaUSAGEไม่มีCREATE;anonไม่มีทั้งคู่ privatehelper/transactionเป็นDEFINERและpublicwrapperINVOKERทั้งหมดsearch_pathว่าง PUBLIC/anonEXECUTEfalse helperไม่ให้authenticatedเรียกตรงแต่entry/wrapperให้เรียกได้ การอ่านfunctionbodyกลับตรงSQL3ตัว ไม่พึ่งแค่ค่าRLSยืนยันownerchecks

**พฤติกรรมปฏิเสธที่รันจริง:** anonRPC42501;authenticatedไม่มีsessionPT401;directmissiontable42501;directidentityhelper42501;claimsทดสอบที่ไม่มีAuthsessionจริงPT401 ใช้transactionreadonly/localroles ไม่สร้างบัญชี/sessionหรือข้อมูลปลอมในตาราง Authusersและrowsทั้ง5tablesยัง0 ไม่มีrealpasswordLogin/A-Bownership/concurrencyacceptance ผล500tests/3builds/QAจำลองคงเป็น27ต.ค.รอบนี้ไม่รันapplicationchecksใหม่

**Advisors/งานดูแล:** Securityไม่มีWARN/ERROR มีINFO5เรื่องไม่มีRLSpolicyตรงRPC-only design จึงไม่เปิดallowpolicyเพื่อทำให้หาย PerformanceINFO unindexedFK`mission_revisions.created_by`และ`revoked_sessions.user_id`ให้พิจารณาเมื่อขยายข้อมูล อีกINFOunusedownerindexเพราะระบบใหม่ไม่มีmissions ไม่เพิ่มDDLนอกไฟล์/hashที่อนุมัติ รายละเอียดและremediationlinksอยู่ [ผลตรวจฐานข้อมูลจริง](INSPECTOR_DATABASE_VERIFICATION_2026-10-28.md) fullreceiptในoutput/release-check/inspector-live-migration-2026-10-28/verification.json

**ทีมสร้างบัญชีภายหลัง:** สร้างผ่านSupabaseAuthenticationแล้วเพิ่มAuthuserIDในinspector_accounts(enabled=true)ด้วยadmin บัญชีนอกrosterใช้privateRPCไม่ได้ ไม่ขอหรือเก็บpasswordในchat/log หลังมีบัญชีตรวจจริงA/B/login-cookie/Save/history/logout/foreignID/sessionexpiry/concurrencyก่อนนับaccountcomplete Authsignupsettingไม่เปลี่ยนรอบนี้ ค่าdisable_signup=falseเป็นผลรอบ27ต.ค.ต้องตรวจpolicyก่อนrelease ไม่มีคำถามผู้ใช้ค้างเรื่องaccountprovisioning

**ไฟล์และการเผยแพร่:** อัปเดตcanonicalสองMarkdown/queue/review เพิ่มverificationreportและsafeJSONreceiptเท่านั้น ไม่แก้source/SQL/config ไม่สร้างบัญชี ไม่commit/push/deploy คำอนุมัติDBไม่ได้ถูกใช้เป็นคำอนุมัติเผยแพร่frontendหรือทำงานนอกscope

### 3.22 Inspector account release — 28 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้อนุมัติpush/deployระบบบัญชีและตรวจLogin โดยให้ทีมสร้างบัญชีภายหลัง

**สรุป:** pushและproductiondeployแล้ว code`afac1c7f256075eb2202fdcae16102a0e34a43ca`/Vercel`dpl_635dXNArvjRDicq8WgZVmHgZZ9r8`READY CI40565947316success Fresh501tests/syntaxผ่าน 3buildsก่อนpushและCIของfixผ่าน ไม่มีDBreapply/Authsettings/accountcreation ยังไม่มีreal-account acceptance

**รายละเอียด:** ตรวจปุ่มInspectoraccount→email/passwordform→sameoriginBFF→SupabaseAuthจริงโดยnonexistentcredentialsได้generic401 UIล้างpassword หน้าLoginใช้passwordmask/required fieldsปิดด้วยX/Escapeได้ PublicAPI7กรณีผ่าน user:null200/private401/form422/crossorigin403/noorigin403/invalidlogin401/guestlogout200 ทุกresponseJSON/no-storeและclearcookieflagsถูกต้อง จึงยืนยันfunction/schema/runtime/rewriteจริง desktop1280dialog620/page1265px mobile390dialog362/page375pxไม่overflow Browsererrorlogล่าสุด[]/Vercelerrorfatal15นาทีไม่พบรายการ คง3steps/4calculators SuccessfulLogin/Save/history/cross-accountprivacyยังต้องรอAuthusers+rosterจากทีม

**ไฟล์/หลักฐาน:** savecontractdescriptionตรงmigrationที่ใช้แล้ว validation/SQLไม่เปลี่ยน เพิ่มselectedRouteและregressiontest หลักฐานoutput/release-check/inspector-account-release-2026-10-28/มีtests/buildlogs/APIJSON/desktop-error-mobilePNG/release-receipt.json เอกสารผลตรวจfollow-upอาจเปลี่ยนdeploymentSHAโดยapplicationเดิม receiptเก็บfinalidentity UX/AIriskeditorยังอยู่อีกงาน ไม่รวมreleaseนี้

**Runtime routing repair:** releaseแรกfunctionตรง200แต่publicrewrite404 แก้api/inspector.mjs selectedRouteรับVercelpathcaptureเป็นสำเนาตรงกันของendpoint ไม่ให้overridepathname/route Rejectqueryซ้ำ/ค่าขัดกัน/unknownkeys Unitregressionใหม่501ผ่านและหลังdeploypublicroute/API7/UIจริงผ่าน ปิดdefectโดยเก็บผลinitial404ไว้ ไม่ใช้directrouteผ่านแทนactualUI/API

### 3.23 เงื่อนไขก่อนผู้ทดลอง Login — 28 ตุลาคม 2026

**หัวข้อ:** แยกสถานะหน้าLoginเผยแพร่แล้วออกจากการมีบัญชีพร้อมใช้

**สรุป:** เปิดเว็บและหน้าInspectoraccountได้ แต่ต้องให้ทีมสร้างAuthuserและเพิ่มInspector rosterก่อนจึงเข้าใช้งานภารกิจส่วนตัวได้ การdeployไม่สร้างบัญชีอัตโนมัติ

**รายละเอียด:** ใช้อีเมล/รหัสผ่านของบัญชีXEDOที่ทีมจัดให้ ไม่ใช่บัญชีSupabaseDashboard ต้องมีuser_idในxedo_private.inspector_accountsและenabled=trueด้วย ไม่มีsignupUIให้ผู้ทดลองสมัครเอง คงให้ทีมสร้างภายหลังตามคำตอบเดิม รอบชี้แจงนี้อัปเดตเอกสารอย่างเดียว ไม่ตรวจบริการสดหรือรันทดสอบใหม่ ไม่แก้source/DB/config/account และไม่commit/push/deploy ไม่มีคำถามผู้ใช้ค้าง

### 3.24 GEE mission-window rejection จากเวลาอัตโนมัติเกิน24ชั่วโมง

**หัวข้อ:** ปัญหาที่รับรายงานหลังaccountrelease 28ตุลาคม2026 — วินิจฉัยแล้ว ยังไม่แก้source

**สรุป:** ผู้ใช้ยืนยันauto start27ต.ค.20:24:05.270/end30ต.ค.01:15:37.015 รวม52h51m31.745s เกินrequestlimit24h จึงตอบHTTP422ก่อนupstreamGEE ประเด็นไม่เกี่ยวกับInspectorlogin การเปิดแผนยาวเกิน24hแล้วscheduleยังreadyเป็นgapที่ต้องซ่อม ไม่เปลี่ยนrequirementprototype/profile/scheduleที่ตัดไว้

**รายละเอียดโค้ด/พฤติกรรม:** gee-mission-context.js:83กำหนดwindow≤24h/startย้อนหลัง≤5วัน/endล่วงหน้า≤7วันบนserverclock (และendไม่ก่อนstart) ทุกข้อรวมข้อความเดียว planning-context-request.js:50แสดงTIME_WINDOW Progress67%=ได้รับHTTPresponseที่stage2/3แล้วไม่ผ่านvalidation ไม่ใช่GEEcompute67%;inputไม่retry จึงattempt1/2หยุด ตัวschedulecompleteคำนวณflightduration+buffer+turnaroundsไม่ตรวจ24h ส่วนgetReadinessตรวจแค่ordering/future จึงพร้อมขัดกับAPIได้ ข้อมูลภาพacquiredAtแยกจากmissiontimes ไม่มีหลักฐานtimezonebug

**สิ่งที่พิสูจน์/ยังไม่ทราบ:** pureNodeคำนวณ190291745msและvalidator422โดยfixedclock อีกsyntheticgeneratedflightทำให้schedulewindowตรงข้อมูลนี้/readyก่อนGEErejectได้ เป็นการพิสูจน์validationgap ไม่ใช่replayactualflightresult จึงยังไม่ทราบflightduration/sorties/พื้นที่ที่ทำให้ผู้ใช้ได้52h ไม่มีfulltests/build/browser/liveGEEหรือDBchecksใหม่

**แนวทางซ่อมสำหรับรอบถัดไป:** sharedtime-windowvalidationก่อนrequest+readiness+ข้อความactualduration/limit ตรวจrouteestimateและsortiesจริง ถ้ารวมเกินให้ลดขอบเขตหรือแบ่งภารกิจ ห้ามย่อend/clampเวลาให้ผ่านแทนแผนจริง พิจารณาแยกstaticcontextจากforecastเพื่อไม่ให้ข้อจำกัดforecastบดบังterrain/landcover/qualityที่อาจใช้ได้ ต้องออกแบบและทดสอบก่อนลงมือ ไม่ถือว่าข้อเสนอถูกimplementแล้ว

**สถานะ/ไฟล์:** บันทึกknownissueในqueue.runtimeIssuesและXEDO_WORK_LOG อัปเดตเอกสารเท่านั้น ไม่แก้source/config/SQL ไม่สร้างบัญชี ไม่commit/push/deploy ไม่ถามวันเวลา/โหมดซ้ำเพราะผู้ใช้ตอบครบแล้ว

### 3.25 Surface Unknown: ไม่มี report ถูกแสดงเป็น area/Home mismatch

**หัวข้อ:** วิเคราะห์ภาพSurface model Unknownจากผู้ใช้หลังTIME_WINDOWerror

**สรุป:** มีcodepathต่อเนื่องจาก3.24โดยตรง แต่ข้อความภาพอย่างเดียวแยกไม่ได้ระหว่างreportไม่มีและreportผิดarea/Home ยืนยันtext-statebugแล้ว ยังไม่แก้source

**รายละเอียด:** planning-geospatial-uiรับerror422แล้วinvalidateล้างresponse=null current/getTerrainAssessmentส่งnullให้planning-terrain ตัวassessline21ตรวจ!requestร่วมกับgeometry/Homeต่างแล้วคืน“GEE terrain does not match the current inspection area and Home.” ส่วนreadinessStateแสดงreasons[0]ไม่ใช้GEEstate.reason หากภารกิจเดิม52hทำให้422 ภาพนี้จึงเป็นผลต่อเนื่องได้ แม้ผู้ใช้ไม่เปลี่ยนHome ไม่สรุปจากภาพว่าHomeผิดจริง

**หลักฐาน/แนวซ่อม:** freshpureNodeprobeกรณีnullreportและactualHomeต่างจริงได้unknown+ข้อความเดียวกัน ต้องแยกmissing/loading/error/staleจากactualgeometry/Home mismatch และส่งrootrequestreasonมาแสดงต่อ คงUnknown/exportlockจนมีsamplesปัจจุบันที่ใช้ได้ เพิ่มกรณี422→responsecleared→SurfaceUnknownreasonถูกต้องควบคู่actualmismatch ไม่มีfullsuite/build/browser/liveGEE/DBใหม่ รักษาเดิม3steps/4calculators ไม่ปลดreadinessเพื่อให้ผ่าน

**สถานะ:** relatedruntimeissueในqueueเป็นdiagnosed_not_implemented อัปเดตสองMarkdownตามคำสั่ง ไม่แก้source/SQL/config ไม่สร้างบัญชี ไม่commit/push/deploy ไม่มีคำถามผู้ใช้ค้าง

### 3.26 Shared mission-window limits และ Surface state repair — 28 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้อนุมัติimplementation/test/push/deployของสองissuesใน3.24–3.25

**สรุป:** แก้และเผยแพร่แล้ว code `d5ec33fbb186145440acffed718972c9b8fc8063` / deployment `dpl_8tjaooDbxEodG8kmHiE5yJfNLwac` READY / CI 40574633798 success แผนเกิน24hคงเวลาจริงและ block readiness/export GEE static context ยังโหลดได้โดยเว้น forecast สำหรับช่วงผิด SurfaceUnknownแสดง missing/loading/error/stale ตามจริงแยกจาก geometry/Home mismatch รักษา3ขั้น/4calculators

**Architecture/พฤติกรรม:** planning-time-window.jsรวมduration24hและforecastdates5วันย้อนหลัง/7วันล่วงหน้า scheduleใช้ก่อนreadyพร้อมactualduration/action;GEEserverใช้helperแต่คง422errorcontractเดิม;exportตรวจdurationหลังderiveendจากsortietotal/declaredend กันย่อendช่องกรอก Genericmanualexportไม่บังคับforecastdatesใหม่ scheduleไม่clampendและยังคงautomaticanchorหลังanalysisเดิม

**Static fallback:** geospatialmission()ประเมินunsupportedwindowแล้วส่งstartAt/endAtnullคู่กันพร้อมgeometry/Home/scene/routeเดิม Originalrawtimes+problemcodeอยู่contextkey/cacheidentityเพื่อกันlate/staleresponse Forecastถูกล้างเป็นnot_requestedพร้อมwarningและcontextpartial แสดงGFSnotrequestedอย่างชัดเจน Surfaceassessmentยังใช้samplesที่ตรวจครบตรงarea/Home/route/timestampsได้ แต่schedule/environment/exportไม่ถูกปลดล็อก

**Surface reasons:** pureassessorแยกไม่มีrequestจากactualmismatchและรับunavailableReasonภายในcontroller helperกลางใช้ทั้งrender/getter สาเหตุerrorผ่านclassifiedallowlistเดิม Readcurrentก่อนเลือกรากเหตุเพื่อให้expiry/missionchangeinvalidateก่อน การไม่มีgeometry/Home/validtoleranceหรือsampleไม่ครบยังมีreasonsเดิม ไม่แทนunknownด้วย0และไม่คงreadyจากงานเก่า

**Verificationใหม่:**73targeted/510fullsuitepassด้วยconcurrency4หลังdefaultparallelrunค้างและถูกinterrupt ไม่มีassertionลด Syntax/3buildsผ่าน LocalbrowserกับGEEจริงตรวจshortAOI52hstaticready/forecastnotrequested/blocked,normal3step+Sentinel2reviewบน18.0945km²ได้route998.11km/auto55h32m3sblockedและSurfaceReviewneededตามsamplesจริง;พื้นที่>100km²ทำ422SurfaceUnknownแสดงAREA_LIMITได้จริง ไม่ใช้ข้อความHomewrong Mobile390dialog358/page375pxไม่overflow หลักฐานoutput/release-check/time-surface-fix-2026-10-28/ ผล Production ยืนยันต่อท้ายด้านล่าง

**ขอบเขต:** ไม่มีการแบ่งภารกิจอัตโนมัติหรือบีบเวลาที่คำนวณจริง งานprofile/scheduleใหม่ที่ตัดไม่กลับมา ไม่มีDB/Auth/Pi/AI/UXimplementationอื่น ทีมสร้างtrialaccountsภายหลังเหมือนเดิม

**Production proof:** API raw52h→422 (คง server contract), static-only→200 terrain/landcover ready+forecast not_requested, current1h→200 terrain/landcover/forecast ready; HTML hash ตรง built dist และ account session200 user:null Browser normal flow กับภาพ Sentinel-2 จริงสร้าง auto55h32m3s → Blocked/endไม่ถูกย่อ/SurfaceReviewneededตามrangeจริง intentionalพื้นที่>100km²→422 แล้ว SurfaceUnknownแสดงarea-limitแทนHome-mismatch คืนพื้นที่เดิม/โหลดภาพกลับได้ Mobile390 dialog358/page375/scroll375ไม่มี overflow Browsererrorlogsล่าสุด[]; deployment-scoped error/fatal15นาทีไม่พบรายการ หลักฐาน production-*.png/production-api.json และ final release-receipt.json อยู่ evidence directory เดิม เอกสาร follow-up อาจ advance Git/deployment SHA โดย application bundle เดิม

<!-- remaining-plan-summary-2026-10-28 -->
### 3.27 แผนคงเหลือหลัง time/Surface release — 28 ตุลาคม 2026

**หัวข้อ:** สรุปสถานะงานตามคำถามผู้ใช้ ใช้เลขล่าสุด1–5เทียบเลขเดิม4–8

**สรุป:** Active3กลุ่ม:1UXที่เหลือ,2บัญชีที่เผยแพร่แล้วรอteam provisioning/real-account acceptance,3preparedAIและInspectorแก้พื้นที่เสี่ยงซึ่งยังไม่เชื่อมเว็บ Deferred2กลุ่ม:4Pi,5ผลทดลอง/รายงาน งานtime/Surfaceใน3.26ปิดแล้ว ไม่ตีความคำถามสถานะเป็นการเริ่มimplementation/publishใหม่

**รายละเอียด/เกณฑ์จบ:** UXลบป้ายPrototypeและnoteซ้ำ เก็บflow/help/buttons/empty/error/mobileโดยรักษาสามขั้น/สี่ตัวคำนวณ/2D3D บัญชีใช้โครงสร้างAuth/BFF/DBที่เผยแพร่แล้ว ทีมสร้างAuthusers+rosterก่อนตรวจsuccessful-login/logout/privateSave/open/history/A-Bprivacy/sessionexpiry/conflict AIแสดงpreparedSARพร้อมที่มา แยกimmutable raw/candidate/draft/confirmedreview/oneplanningtarget/plan revisions ให้Inspectoraccept/edit/move/add/reject/Undo/Cancel/confirm แล้วSave/reopenเป็นของเจ้าของงาน Raw378จุดเก็บครบ ให้reviewboundaryใหม่ที่ผ่านplannerlimit≤120จุด ไม่ลดrawเงียบ ไม่อ้างcandidateเป็นน้ำมันยืนยันหรือใช้แทนความหนา เปลี่ยนreview/target/sessionต้องinvalidateplan/exportที่ค้าง

**ลำดับและparallel:** mainเก็บUX→AIeditor/planner/privatepersistence→ตรวจรวม ขณะทีมสร้างบัญชี อีกแชทมีpreparedcoreและriskeditfixturesแล้ว ให้ตรวจกรณีขอบ/หลักฐานreadonlyและไม่แก้website Testsรวมบัญชี→AI→แก้พื้นที่→planner→Save/reopen/history/mobileเป็นacceptanceของสามกลุ่ม ไม่ใช่featureใหม่ ไม่รวมnormalprofile/user-start-derived-endที่ผู้ใช้ตัด ไม่เพิ่มautomaticpartitionหรือfreshAIinference/Pi/reports/capacitybenchmark

**สถานะรอบนี้:** documentation/queue updateเท่านั้น ไม่มีsource/DB/account changes ไม่มีtests/build/browser/API/GEE/liveproductionverificationใหม่ ไม่push/deploy ผล510testsและproductionREADYใน3.26เป็นรอบก่อนหน้า ไม่มีคำถามผู้ใช้ค้าง รอทีมดำเนินการสร้างบัญชีตามคำตอบเดิม กรอบ4ชั่วโมงก่อนหน้าเก็บเป็นประวัติและไม่ได้restartจากการสรุปนี้

<!-- inspector-roster-missing-2026-10-28 -->
### 3.28 Auth user มีแล้วแต่ไม่มี Inspector roster — 28 ตุลาคม 2026

**หัวข้อ:** ตรวจข้อความ Your Inspector account has not been enabled by the team หลังทีมสร้าง Auth user

**สรุป:** ยืนยันจาก live exact UID/email join ว่าบัญชีในภาพมีและ email confirmed แต่ไม่มี Inspector roster จึงถูก team-provisioning gate ไม่ใช่หลักฐาน password ผิด เตรียม one-account enablement แล้วแต่ attempted write ถูกหยุดก่อน dispatch และไม่มีเหตุผลเพิ่มเติม; post-read ยังไม่มี row จึงรอ explicit confirmation ที่ถามเพิ่มแล้ว ไม่อ้างว่าซ่อมสำเร็จ

**Behavior:** db/inspector-foundation.sql require_inspector ตรวจ auth.uid/session/expiry/revocation ก่อน exists inspector_accounts(user_id=actor,enabled=true) หากไม่มี PT403/INSPECTOR_NOT_PROVISIONED API login จะ logout upstream session เมื่อ RPC session ไม่ผ่าน และไม่ตั้ง HttpOnly cookie หลังเปิด roster ต้องให้ผู้ใช้ Sign in ใหม่ ระบบไม่มี auto-provision trigger และไม่อ่าน Auth user_metadata/role/email มาใช้แทน roster การสร้าง Auth user จึงยังไม่ครบขั้นตอน team provisioning

**Team provisioning runbook:** 1) ทีมสร้าง Auth user และยืนยันอีเมลตามขั้นตอนของทีม 2) adminตรวจ UID+email ในโปรเจกต์ xedo ให้ตรง 3) เพิ่ม xedo_private.inspector_accounts(user_id,enabled=true) เฉพาะ UIDที่อนุมัติ 4) SELECTกลับว่ามีหนึ่ง enabled row 5) ผู้ใช้ Sign in ด้วย password เดิม แล้วตรวจ session/Save/open/history เจ้าของงาน ขั้นตอน3ไม่ให้ browser/anon/authenticatedเขียนตารางเอง SQL ที่เตรียมเฉพาะบัญชีนี้อยู่ ignored output/release-check/inspector-enablement-2026-10-28/enable-requested-account.sql พร้อม guards emailconfirmed/notdeleted/notbanned ON CONFLICTแก้ enabled อย่างเดียวไม่ทับcreated_at

**Verification/ขอบเขต:** Live Auth/roster queries และ aggregated logs/advisors ใหม่ อ่าน source/readonly review ไม่ใช้ password ไม่ mint token หรือสร้าง session ไม่มี source/DDL/grants/RLS/Authsettings/deploy changes คำสั่ง DML ไม่ถูก dispatch จึงยังไม่ enabled ไม่มี successful real login/A-B acceptance/application tests/build ใหม่ Security advisor WARN leaked-password protection disabled แยกจากสาเหตุปัจจุบัน บันทึก remediation ใน work log ไม่เปลี่ยนsettingนอกscope; RLS no-policy INFO5 คง RPC-only design ไม่เพิ่ม allow policy เพื่อทำ warning หาย

**รอคำตอบ:** explicit one-account enablement confirmation จากผู้ใช้ หรือให้ทีม execute SQL เอง หลังเปิดสำเร็จต้อง post-read และให้ผู้ใช้ลอง Sign in; ไม่ถามหรือเก็บ password ในแชท

<!-- inspector-roster-enabled-2026-10-28 -->
### 3.29 เปิด Inspector roster หลังผู้ใช้อนุมัติ — 28 ตุลาคม 2026

**หัวข้อ:** ปิดปัญหา provisionขาดจาก3.28 เฉพาะบัญชีในภาพตามคำอนุญาตโดยตรง

**สรุป:** guarded one-row enablementบนxedoสำเร็จเวลา14:40น.Asia/Bangkok Post-readพบexactaccountมีหนึ่งinspector_accountsrowและenabled=true เรื่องขาดrosterแก้แล้ว/ไม่มีpermissiondecisionค้าง ยังไม่อ้างsuccessfulrealbrowserlogin

**รายละเอียด:** Pre-readยืนยันAutheligibility/ไม่มีroster; INSERT SELECTตรงUID+email+confirmed/notdeleted/notbanned→enabledtrue RETURNINGหนึ่งแถว; ON CONFLICTรักษาcreated_atแต่อัปเดตenabled ตัวuser_idเป็นPK/FKจึงไม่เพิ่มซ้ำ Verifyแยกพบroster_rows1/enabledtrue/emailconfirmedtrue/RLStrue/anonและauthenticatedไม่มีINSERTบนroster ไม่มีpassword/settings/session/token/schema/functions/grants/sourcechanges ไม่auto-enableบัญชีอื่น

**พฤติกรรมหลังแก้:** หน้าเว็บและBFFเดิมอ่านrosterจากDBตอนSign in จึงไม่ต้องbuild/deploy ผู้ใช้ต้องกดSign inใหม่ด้วยpasswordเดิม คำขอ403เก่าจะไม่เปลี่ยนเป็นsigned-inจากrefreshอย่างเดียวเพราะBFFไม่เคยsetcookieสำเร็จในattemptนั้น ไม่mintJWT/สร้างsessionแทนผู้ใช้ RealSave/history/logout/A-Bprivacyacceptanceยังต้องตรวจเมื่อมีการเข้าสู่ระบบจริง

**ไฟล์/หลักฐาน/รอบนี้:** canonical2Markdown+queueและignoredoutput/release-check/inspector-enablement-2026-10-28/verification.jsonเก็บผลก่อน/หลัง/เวลาและขอบเขต โดยไม่เผยแพร่email/UIDลงtrackedfiles ไม่มีapplicationtests/build/browser-password-loginหรือproductiondeploymentใหม่ ผลทดสอบเก่าไม่ใช่ผลรอบนี้ ไม่commit/push/deployเอกสาร ไม่มีคำถามผู้ใช้ค้าง

<!-- ux-loading-scroll-plan-2026-10-28 -->
### 3.30 แผนปิดงาน1 UX/loading/scroll — 28 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้ขอแผนละเอียดก่อนลงมือและให้แชทสนับสนุนช่วยโดยmainแก้websiteคนเดียว

**สรุป:** docs/UX_COMPLETION_PLAN.mdเป็นแผนเต็มล่าสุด1/เดิม4 มีbaseline,actionfeedback,scroll/render/lifecycle,copy/UIและacceptance พร้อมtwo-chatownershipและpromptในoutputs/XEDO_UX_Plan_2026-10-28/ ยังไม่implementหรือเผยแพร่

**Architectureที่ต้องใช้ต่อ:** existingcontrollersเป็นsourceoftruth;feedbackadapterเล็กมีoperationID/actionID/contextrevision/queued-running-terminal ไม่รื้อInspectorqueue/pendingSavemutation/owner-session-revisionguards แสดงpendingก่อนawaitแรกและเฉพาะactionที่เกี่ยวข้อง KeepGEEstage/tilecountsจริง ไม่สร้างpercentagefake Reviewcheckboxรับcheckedทันที/dialogคงเปิด แยกtextinputdebounceกับcheckbox/selectchangeหนึ่งครั้ง Withdrawreadiness/downloadทันที ไม่debounceความถูกต้อง

**Perf repairที่ต้องพิสูจน์:** แยกwheel/touchtrapกับCPUfreezeแล้วtrace baseline/afterก่อนอ้างfixed 3Dfocus/interactiongatingสอดคล้อง2D/RAFcoalescing/ไม่วาดhiddenidle;semantic invalidation หนึ่งครั้ง/cacheassessmentตามrevision+expiryไม่คงReadyเก่า;modalมีscrollowner/cleanup/pagehide-pageshowตรวจตามtrace แก้resourceleakเฉพาะที่วัดได้ ไม่รื้อarchitecture/เปลี่ยนขนาดpreviewหรือdropcoverage

**Copy/UI:** ลบvisiblePrototype/trialnoteซ้ำทุกsurfaceตามข้อกำหนดแต่คงtechnicalIDs/schema/compatibilityfiles;source/date/Unknown/partial/assumeddemo/เงื่อนไขflight-exportต้องยังชัด เสนอชื่อแสดงXEDOinspectionprofile/Fixedinspectionsettings คงUIอังกฤษเดิม ไม่เพิ่มfulltranslation

**หลักฐานใหม่:** ProductionguestnegativeSign in1ครั้งระหว่างรอaria-busytrue/submitdisabledlabelเดิม/statusempty และจบerrorได้ Airspacecheckboxเปลี่ยนReadyแต่dialogปิด/เปิดคืนจึงเห็น คืนuncheckedหลังสังเกต Mobile390settings345px/scroll0→1688/page0 shortwheelworks ไม่มีhorizontaloverflowในcaseนี้ Rootcauseของค้างหลังใช้นานยังไม่profile ไม่มี3Dgesturebenchmark/realaccountacceptanceใหม่ หลักฐานภาพและnotesอยู่UI_OBSERVATIONS.mdในoutputเดียวกัน

**Two-chat/acceptance:** mainแก้source/integration/tests/canonicaloverview-queue;supportทำinventory/copy/perfcallchain/testmatrix/readonlyreviewในoutputแยก ผลออกแบบtestsยังdesigned_not_run เป้าหมายfeedback≤100ms/localp95≤200msเป็นเกณฑ์ไม่ใช่ผลวัด repeated-use10–15minและresourcecounts/slowoffline/cancel/races/scrollownership/390-768-1280/3steps4calculators/24h-Surface-privateguardsต้องตรวจครบก่อนปิด รายละเอียดและเวลาเป็นประมาณการในแผนหลัก ไม่ส่งคำสั่งไปexternalchatอัตโนมัติ ไม่มีคำถามผู้ใช้ค้าง ไม่มีsource/DB/Auth/build/tests/perftrace/pushdeployรอบนี้


<!-- support-ux-loading-scroll-2026-10-28-01a17cf8 -->
### 28 ตุลาคม 2026 15:34 น. — Support UX/loading/scroll handoff

Source-onlysupportinventoryและmeasurement/testdesignพร้อมที่ [UX HANDOFF.md](C:/mega/codex/iENA/outputs/XEDO_UX_Parallel_2026-10-28/support/HANDOFF.md) มี34actions/136copyrows/8scroll-lifecyclegroups/64designed_not_run cases Mainใช้feedbackก่อนawaitแรกและoperation/contextownership,แยกsync-checkboxจากfollow-onasync,รักษาimmutablependingSave+session/owner/revisionguardsและGEE/tileprogressจริง ไม่มีการแก้webโดยsupport

Baseline3Dwheel/directdraw,input+changeและreadinessgettercallchainsเป็นsourcefactsไม่ใช่longfreeze/leakrootcause Mainเริ่มRAF/focusgateและInspectorfeedbackแล้ว ต้องเทียบsourcehash/diffล่าสุดและวัด10–15min/modal30/2D3D20/area-image10กับviewport/device/fixture/networkเดียวกัน คงcache/DOMdiff/cleanup/24h-Surface-pixel-privateguardsและpreviewเดิม ไม่มีperformance/browser/Auth/applicationtests/buildหรือdeploymentverificationโดยsupport ค่า100/200msเป็นtargetsไม่ใช่ผลวัด รายละเอียดsnapshot/IN_FLIGHT_REVIEW/TEST_MATRIXในoutputเดียวกัน overview/queueให้mainดูแล

<!-- ux-feedback-implementation-2026-10-28 -->
### 3.31 UX action feedback, scroll ownership และ renderer lifecycle — 28 ตุลาคม 2026

**สถานะ:** Localcandidateimplemented/524tests/3builds; finalbrowseracceptanceincomplete ห้ามอ่านว่าUXstageปิดหรือproductionเปลี่ยนแล้ว ดู docs/UX_COMPLETION_PLAN.md §3.11 และ C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/release-check/ux-2026-10-28/RESULT.json

**โครงสร้าง:** src/action-feedback.jsเก็บpresentationtokenหนึ่งcurrentoperation,begin/update/endต้องเป็นเจ้าของtoken ไม่แทนbusinessauthorization src/action-feedback.cssใช้pseudo-elementCSSspinnerพร้อมreducedmotion ไม่มีJSlooptimer Inspectorเดิมยังใช้requestchain/capturedexpectedactor/18stimeout/stateepochs/immutablependingSave; taskชั้นUIเพิ่มaction-specificpendingและกันduplicates แต่logoutsupersedeได้เพื่อclearprivateUIทันที+queuedrevocation Savedackแยกจากlistrefresherror ไม่สร้างmutationใหม่เพื่อrefreshอย่างเดียว

**Planner integration:** downloadเริ่มfeedbackก่อนawaitensureSessionและconditions,เช็คrevision+Inspectorcontextก่อน/หลังawaitและreadinessอีกครั้งก่อนdownload; finallyไม่clearnewcalculation หลังcontextเปลี่ยนคงguardsเดิม prepareและloadSurveyมีownedcleanupในresetSurvey/stopDraw Snapshotimportมีreadingstatus/duplicateguardแล้วclearfinally Settingssemanticwrapperเลือกchangeสำหรับcheckbox/radio/select และinputสำหรับtext/number Airspacecallbackคงdialog/invalidateทันที ไม่ใส่spinnerให้synccheckedเอง GEE/conditionsspinnerตามcontrollerloadingจริง ไม่ปลอมprogresspercent

**Renderer/lifecycle:** createDeployment3D(canvas,{onInteractionChange})backwardscompatible;requestDrawcoalesceหนึ่งRAF,setActive(false)cancel/release; drawข้ามhidden/zero-size/inactive ไม่มีcontinuousloop wheelรับเมื่อcanvasfocused+interactive;touchActiondefaultpan-y/Interactbutton/Escape/blurคืนpageownership Exitbuttonเก็บstateก่อนpointerblurเพื่อไม่re-enterผิด Visibilityresumeสั่งdrawใหม่ DestroycancelRAF/disconnectobserver/removeทุกlistener/คืนattrs+style pagehidepersistedรักษาcontrollers,setActivefalse;pageshowrefreshflow/conditions/GEE/readiness/new3Dตามcontext fullunloadจึงdispose+clearinterval/removevisibility คงfloorbounds/previewdimensions/mesh512trianglesและsatelliteprovenanceเดิม

**Copycompatibility:** ลบvisiblePrototype/trialcopyที่ซ้ำและตั้งtitleCoastalinspection/Localplanning/profiledisplayXEDOinspectionprofile/aboutplanner แต่มachineid xedo-prototype-01,schema xedo-planning-trial/1,filenamecompatibilityและdata-helpkeytrialคงเดิม Estimated demoยังบอกassumedinputs Source/heightreference/24h/SurfaceUnknown/partial/expiry/visiblepixels/privateownershipยังเป็นgateเดิม ไม่มีการเพิ่มAIหรือแก้เวลาจริงให้สั้นลง

**Verificationแยกชั้น:** 524unit/integrationtestsผ่านรวมrealproductionclientผ่านDOM/VMboundaryharnessและBFF/PGlite/RLS/session/revisioncases;3builds/syntax/diffผ่าน Browserlocal500ms/stageจำลองAuthเห็นauthack+listpending แต่ไม่มีreal-userpasswordlogin/productionmutation Source/fixturetestsไม่แทนactualbrowsermobile/soak วัดrendererfocused100wheel×5จาก193.3–303.9ms/100drawsเป็น0.6–1.3ms/1drawและpaint7.8–17.4ms มีstartup81mslongtaskจึงไม่อ้างไม่มีlongtaskทั้งหมด Benchmarksynthetictextureไม่ใช่ตรวจrealimageryหรือmemoryleak/fieldINP

**สิ่งที่ยังต้องพิสูจน์:** BrowserID2หลุดการเชื่อมต่อก่อนเก็บfinalresponsive/fullflow/wheel-touch/keyboard/scrollbarthumb/longsoak ไม่มีการเปลี่ยนbrowserอื่นเพื่อข้ามsurfaceที่หลุด รอผู้ใช้เปิดBrowserและแจ้งพร้อม แล้วตรวจ3steps/4calculators/2D3D/AIexistingboundary/privateSave/history/regressionบนcandidateเดิม readiness1sgettercost/resourceleakยังเป็นhypothesis ไม่มีtraceยืนยันจึงไม่เพิ่มcacheที่เสี่ยงstaleReady Mainแก้webคนเดียว Supporthandoff64casesเป็นdesigned_not_run ไม่ใช่ผลทดสอบผ่าน

**ต่อรอบได้ทันที:** C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/release-check/ux-2026-10-28/qa-server.mjsเสิร์ฟcandidateจากdist/index.htmlที่ http://127.0.0.1:5191/ พร้อมsimulatedAuth/in-memoryDB/frozenbefore;ห้ามใช้credentialsจริง/handoffเป็นproductionserver Restartต้องคงbefore.html+baseline-renderer.jsเดิม Scriptเก็บแล้วไม่ทับbaselineเมื่อrestart GEErealflowใช้preview:geospatialแยกในรอบbrowserverification ไม่มีDB/Auth mutation/commit/push/deployรอบนี้

<!-- ux-browser-resume-2026-10-28 -->
### 3.32 UX Browser acceptance หลังเปิดการเชื่อมต่อกลับ — 28 ตุลาคม 2026

**Implementationเพิ่มเติม:** InspectorมีHTMLdialog#inspector-confirmเป็นsiblingmodalของaccountpanel confirmPendingกันpromptซ้ำ/duplicateSignout,Cancelautofocus,Escape/oncloseตอบfalse,oncloseตรวจ!openก่อนfinishเพื่อไม่ให้queuedcloseเก่าทับpromptใหม่ Acceptค่อยclearaccountและใช้serializedrevocation/capturedactorเดิม ไม่bypassdraft/owner/session/revision/pendingSaveguard ภาพmobileconfirmation360pxภายในpage375ไม่ล้น Nativewindow.confirmเคยทำให้IABQApageรอจนควบคุมไม่ได้ เป็นข้อจำกัดที่พบในtool/browsercontext ไม่สรุปว่าเป็นrootcausefreezeของผู้ใช้ทั้งหมด

Plannerประกาศterminalstateเมื่อsearch/load/review/prepareล้มเหลว ไม่ปล่อยglobalstatusSearchingค้าง Downloadfinallyเลือกidlelabelตามdemoจริง;invalidateซ่อนและล้างdownloadsuccessเก่าเมื่อไม่มีactiveoperation ระหว่างactiveexportคงtoken/context/catch/finallyownershipเดิม Errorไม่ถูกล้างผิดphase เพิ่มtestsรวม531pass/0fail/0skip พร้อมsyntax/diff/3buildsใหม่

**Acceptanceที่รันจริง:** บัญชี5191simulatedAuth/realBFF/SQL:pending/Savev1v2/openv1/history/Bempty/logoutduringsave/cancel/Escape ผ่าน;normalGEE5182สิบPolygoncontextsต่างกันsearchcoveringacquisition→visibleimagereview→Prepare;30dialogs/20modecycles/10contextsใน11.15min ไม่มีobservedUIfreeze/consoleerror Canvas2/dialog6คงที่ nodes809→835→835 เป็นDOMcount ไม่ใช่heapmeasurement มีGEEsearchและgroundfailuresแล้วRetryสำเร็จ แยกprovider/networkerrorออกจากmainthreadfreezeโดยไม่เดาสาเหตุ

Responsiverequested390/768/1280มีeffectiveclient375/753/1265ตามscrollbargutterและscrollWidthเท่ากัน Settings328/706/803,readiness356/618/618ไม่ล้น Mobilemodalwheel0→1688/page0,unfocused3Dwheelpage225→945,PageDown/drag/ArrowRight/EscapeและpointerExitใช้ได้ Spacecheckboxคงdialogและwithdrawdownloadทันที Satellitegroundเป็นliveSentinel2mosaicตามเดิม;download18-itemQGCPlanผ่านUIในEstimateddemo;manual52hคงเวลาจริงและBlocked24h ไม่ใช้staticterrainReadyปลดล็อก

**Evidence/versionboundaries:** RESULT.jsonมีfinalsource/distSHA256และผล531/latest3builds browser-acceptance-resume.jsonเก็บtiming/counts/10uniquecontexts/layout/limits Screenshotfinal-*และbrowser-demo.planเป็นlocalfixture ภายหลัง11.15minrunมีcopy/confirmation-closeguard/downloadlabel/statuscleanupเล็กเพิ่มเติม แล้วตรวจtargeted/fullsuite/rebuild+finalbrowserdownload/error/mobileconfirmationซ้ำ ไม่ตีความrunก่อนหน้าเป็นtraceทุกบรรทัดของfinalbundle ไม่มีproductionreal-accountpasswordtest/DBmutation/SITL/hardware/publish

**Remainingqualification:** full-appfeedbackp95/fieldINP/physicaltouch/native-trackpad/OSreducedmotion/heap-listenercountsยังnotmeasured Airspacereviewยังinvalidate→recalculateทั้งชุด;แก้input/changeซ้ำแล้วแต่ไม่ใช่dependencyselectivecalculation Browserbfcachelogicมีunitcoverage ไม่เก็บnativeback-forwardcachetraceเพิ่ม ไม่อ้างabsenceofleaksหรือ60fpsทุกเครื่อง สิ่งเหล่านี้ระบุเป็นremainingqualification/optimization ไม่ซ่อนเป็นผ่าน UXcandidateพร้อมreviewในเครื่อง แต่ไม่markแผนทุกเกณฑ์completeหรืออ้างproductionเผยแพร่

**ต่อได้:** เปิดแท็บGEEpreview http://127.0.0.1:5182/ ไว้ในแชทและคืนviewportแล้ว MockQA5191หยุดหลังlogoutfixture อัปเดตcanonical2MD/queue/planพร้อมผลและข้อจำกัด คำถามBrowserเปิดแล้วresolved ไม่มีpendinguseranswerใหม่ ไม่มีcommit/push/deploy

<!-- ux-release-approved-2026-10-28 -->
### 3.33 UX release scope และการตรวจหลังเผยแพร่ — 28 ตุลาคม 2026

ผู้ใช้อนุมัติpush/deployเฉพาะcandidateUXตาม§3.31–3.32 ไปprojectxedo/domainxedo-eight.vercel.app Productionbranchmain/branchcodex/xedo-hardware-profileเริ่มตรง45e928e Hashsourceหลักและdistตรงlocalreceipt531tests/3builds ไม่รวมignoredQAserver/simulatedcredentials/fixtures/env ไม่มีAPI/DB/Auth/schema/package/workflowsettingschanges

Releasechecksต้องยืนยันexactGitcommit/VercelREADY+alias/CIและHTMLbytesตรงdist;ตรวจหน้าLoginpendingด้วยguestcaseที่เหมาะสมและnormal+demo/readiness/3D/mobileบนproduction พร้อมread-onlysession/GEEAPIและboundedruntimeerrorcounts ห้ามใช้simulatedaccountacceptanceเป็นreal-accountproductionlogin ผลและexactidentityจะเติมหลังเผยแพร่ ไม่รับรองphysicaltouch/no-leak/fullappINP/selectivecalcจากreleaseนี้

<!-- ux-production-release-2026-10-28 -->
### 3.34 UX Production release ที่ตรวจแล้ว — 28 ตุลาคม 2026

**Version/target:**32aa243bf3d6802947287093dc66dc775c36489a,projectxedo/prj_x35WcipWxA767cYwv3f0CXcdyea3/team_CV1O0uIz6BcarAQAOb8soV0I,Productiondpl_FmmesNCHsaCnY8MiXZrMeWoUaFTpREADY,aliasxedo-eight.vercel.app,mainCI40669324786success HTMLSHA0aa8224ec1e9d6d2dba6a764b289101336374118b47e2bc73a0c18cdae1810e4ตรงdistตามreceipt531tests/3builds Applicationchangesอยู่scopeUXเดิม ไม่มีAPI/schema/DB/Auth/providerconfigurationใหม่

**Boundariesที่verifyจริง:** BrowserLogin→BFF→Supabaseinvalidcredentialresponse→UIpendingcleanup ผ่านด้วยsyntheticnonexistentaccount ไม่มีrealpassword/sessioncreation;anonymoussession200null GEEpublicPolygonsearch12scenes→visibleimage→Prepare/route1.86kmผ่าน normalflightinputs/Homeที่ไม่ครบยังlock Download Demo→localcalculators→GEEterrain67samples→3DSatellite→airspacecheckboxmobile→QGCPlan18itemsผ่าน Sourceข้อมูลdemo/assumedยังlabelชัด NodeproductionAPIcurrentGEEpartialเพราะreferenceGFSunavailableแต่terrain/landcoverready;staticforecastnot_requested;52h422;environmentcomplete ไม่เปลี่ยนUnknownเป็นReadyเพื่อผ่านrelease

**Browser/observability:**390requestedมีpage375scroll375/dialog356scroll356ไม่ล้นและcheckboxไม่ปิดdialog InteractExitคืนpan-y/pressedfalse Consoleerrors[] Runtimeerror/fatalfilterdeployment15mคืน0groups เป็นboundedscan การเปิดpanelปิดpanelและดาวน์โหลดไม่สร้างmissionproduction ไม่ทำSITL/hardwareหรือreal-accountSaveacceptance ตัวเลข11.15min/30dialogs/20modes/10areasเป็นlocalrunเดิม ไม่เอามาอ้างproductionsoak

**Maintenance:**documentation-onlyfollow-upอาจเปลี่ยนGit/deploymentidentityแต่dist/APIcodeคงเดิม ให้ดูoutput/release-check/ux-2026-10-28/release-receipt.jsonสำหรับfinalidentityและHTTPchecksหลังเอกสารpush ไม่วนเขียนexactselfSHAกลับtrackedMD Qualification/device/perfและdependencyselectivecalcเดิมยังค้าง คงstagepartialqualificationแม้coreproductionเผยแพร่แล้ว ไม่มีpendinguseranswer

<!-- remaining-after-ux-release-2026-10-28 -->
### 3.35 งานที่เหลือหลัง UX เผยแพร่ — 28 ตุลาคม 2026

**หัวข้อ:** ลำดับทำงานต่อและขอบเขตที่ต้องตรวจรับ โดยไม่เปลี่ยนเลขอ้างอิงล่าสุด1UX/2บัญชี/3AI (เดิม4/5/6)

**สรุป:** สองงานหลักที่ยังต้องปิดคือบัญชีจริงตรวจรับและ prepared AI implementation พร้อม editable review; UX core อยู่ productionแล้ว จึงแยก qualification ที่เหลือออกจากการสร้างฟีเจอร์ใหม่

**รายละเอียด:**

1. **บัญชี ล่าสุด2/เดิม5:** Auth/BFF/UI/SQL/ownership guardsเผยแพร่แล้ว และบัญชีที่ขอมีenabled rosterแล้ว เหลือ real browser login → Save revision1/2 → reopen/history → logout/sessionexpiry และ A–Bอ่าน/แก้งานข้ามเจ้าของไม่ได้ ต้องใช้บัญชีผู้ทดลองจริงที่ทีมเตรียม การตรวจ guest invalidloginและsimulated Authเดิมไม่แทนเกณฑ์นี้ ไม่ขอให้ส่งpasswordในแชทและไม่สร้างบัญชีเพิ่มจากคำถามสถานะ
2. **AI ล่าสุด3/เดิม6:** ใช้ prepared SARเดิมไม่รันโมเดลใหม่ → overlayตามพิกัด → Inspectorรับ/แก้จุด/เพิ่ม/ปฏิเสธ/Undo/Cancel → confirm review revision → inspection polygonที่plannerรับ → Save/reopen lineageส่วนตัว เก็บ rawAIผลเดิมแยกจาก review draft/confirmed inspection geometry มี14candidatesและcandidateใหญ่สุด378vertices ขณะที่plannerรับวงเดียวไม่มีรูไม่เกิน120vertices ต้องมีvalidated adapterและให้ผู้ใช้reviewขอบเขตที่เปลี่ยน ไม่ลดรูปrawหลักฐานทับต้นฉบับหรือใช้maskเป็นหลักฐานความหนาน้ำมัน
3. **ตรวจปิดรวม/UX ล่าสุด1/เดิม4:** ทดสอบผลแก้AIเปลี่ยนแล้วinvalidateแผนเก่า การสลับบัญชี/revision/sourceล่าช้าไม่ทับงานใหม่ Save/reopenคืนreview/targetตรงรุ่น 3ขั้น/4calculators/2D3D/mobile/readiness/exportยังครบ เก็บ physicaltouch/trackpad/OSreducedmotion และfullappP95/fieldINP/heap/listenerผลเพิ่มตามแผน; dependencyselectivecalculationเป็นoptimizationที่ยังไม่ทำ ไม่อ้างไม่มีleak/ลื่นทุกเครื่องจากผลเดิม

งานPi/telemetryและผลทดลอง/รายงานก่อน–หลังพักตามเดิม profileปกติ/start-derived-endที่ตัดออกไม่เป็นreleasegate กติกาคู่ขนานคงเดิม: แชทหลักแก้เว็บ แชทสนับสนุนตรวจข้อมูล/กรณีทดสอบ/หลักฐานแบบreadonly

**หลักฐาน/ขอบเขตรอบนี้:** อ่านrepositoryและเอกสารที่HEADd899784ก่อนแก้markdown ไม่มีsource/SQL/Auth/account/config changes ไม่มีtests/build/browser/API/serviceใหม่ ไม่commit/push/deploy ผลตรวจreleaseก่อนหน้าคงเป็นประวัติ ไม่รายงานว่าเพิ่งรันใหม่ ไม่มีคำถามผู้ใช้ค้าง

<!-- ai-editor-planning-account-confirmed-2026-10-29 -->
### 3.36 แผน prepared AI/editor หลังผู้ใช้ยืนยันบัญชี — 29 ตุลาคม 2026

**หัวข้อ:** ล่าสุดข้อ3/เดิม6 ใช้บัญชี/ownership/session/Savehistoryที่เผยแพร่แล้วเป็นฐาน ผู้ใช้รายงานบัญชีตรวจได้แล้ว ไม่เริ่มบัญชีใหม่และไม่อ้างรายละเอียดการทดสอบที่ไม่ได้รายงาน

**สรุป:** แผนลงมือcanonicalที่docs/AI_INTEGRATION_PLAN.md§3.16 แบ่งAcontract/catalog→BeditableUI→Cserverconfirmation→Dplanner/save→Eacceptance คงflow3ขั้น/4ตัวคำนวณ ไม่มีinference/Pi/newnormalprofile/schedulerewriteในรอบแรก

**รายละเอียดสถาปัตยกรรม:** แยกSearchContext/immutablePreparedAnalysis/RiskDraft/ConfirmedRiskReview/PlanningTarget/PlanRevision เพิ่มOpenLayerslayersและeditorcontrollerแยกจากrouteoverlay ไม่เรียกsetGeometryทุกgestureเพราะresetSurveyและschedule รักษาภาพ/เวลาเมื่อconfirmedtargetยังมีcoverage/visiblepixelsจริงในreviewedimage ไม่ปลดreadinessด้วยflagเก่า ผลAIhistorical9ต.ค.แยกจากSentinel-2context/currentenvironment Candidate378จุดแสดงrawครบและให้วาดtargetใหม่≤120จุด ไม่clip/simplify/hullเงียบๆ manual/NoDataไม่อ้างAIพบหรือความหนาน้ำมัน

Capture/restoreต่อanalysisRef/riskDraftที่schemaมีอยู่ เพิ่มserver-ownednullableconfirmedreviewบนmissionrevisionพร้อมimmutablecatalogในprivate schema ไม่ยัดraw/rasterทุกsnapshot Catalogadapterต้องsanitizebrowsermanifestและกำหนดfunctionbundle/buildincludefilesจริง Hashsourceคงเดิม Actor/time/targethashผูกsession/server/CAS/idempotency;validategeometry/catalog/coverageที่RPCด้วยเพราะauthenticatedเรียกตรงได้ ไม่ใช้BFF-onlyconfirmedflag SpatialDBcapabilityเป็นcheckpointก่อนเลือกSQL/migration ไม่อ้างPostGISพร้อมจากการอ่านsource

Acceptanceครอบคลุมdatahash/georeference/edit/UndoRedoCancel/invalidgeometry/coverageholes/NoData/378point/Savehistory/crossowner/conflict/directRPC/lateexport/mobile/2D3D/24h/readinessเดิม แชทหลักแก้เว็บเพียงคนเดียว Supportทำgapmatrixและreadonlyevidencereviewจากfixturesเดิม ยังไม่dispatchuser-ownedchatจากturnวางแผนนี้

**การตรวจ/สถานะรอบนี้:** อ่านsource/contracts/SQL/handoffจริงและตรวจSHA256core12ไฟล์ใหม่ตรงทั้งหมด ไม่รันapplicationtests/build/browser/API/liveDB/conversion/inference ไม่แก้source/SQL/Auth/account/config ไม่commit/push/deploy อัปเดตAIplanและสองMD/queue ไม่มีproductdecisionรอคำตอบ ยังไม่ถือว่าAIเชื่อมเว็บแล้ว

### 3.37 Prepared AI/editor implementation — 29 ตุลาคม 2026 (checkpointก่อนrelease)

**หัวข้อ:** แยกriskstate/geometry/editor/overlay lifecycleออกจากsetGeometryเดิม เชื่อมprivateconfirmation/plannerโดยไม่แก้aircraftprofile/scheduleที่ตัดออก

**สรุป:** `planning-risk-state.js`เก็บimmutableAI/draft/undo64steps/selectedarea/baseReviewRevision;`planning-risk-geometry.js`ตรวจwhole-polygoncoverageด้วยscanline/holes/concavity;`planning-risk-editor.js`แยกOLsources/Modify/Translate/Drawและtransaction,CSSresponsive `planning-trial-client.js`ใช้confirmedtargetในbody/geospatialinputแทนsurveyIdเมื่อมีAI เก็บsearch/imagegeometryเดิมและtargetpixelcheckก่อนConfirm/Prepare/Export ไม่ใช้readyflagเก่า

**รายละเอียด:** InspectorAPIเพิ่มauthenticatedanalyses/resultreadและconfirm_riskผ่านRPCเดิม Docยังschema1และlegacyAI-nullเปิดได้ Draftsaveอนุญาตunfinishedsketchแต่ไม่confirm จัดserverownedreviewบนmission_revisions.confirmed_review พร้อมlatestReviewRevision/targetHash/draftHash/actor/time Catalogอยู่xedo_private.prepared_analysis_catalogไม่มีdirectgrants/RLSenabled PostGISไม่installed;ใช้boundedSQLvalidity/edgecoverage/holepredicates ส่วนbrowserแยกNoDataไม่อ้างoil/thickness/capsuledemand Hashcatalogpayloadde736b...และrawrefsเดิมคงอยู่ Modelไม่มีsemanticversionที่ยืนยันจึงอ้างcheckpointhash ไม่สร้างconfidencepercentใหม่

LocalBrowserAuthจำลอง+GEEจริงโหลด14raw→candidate→pixels→SQLconfirmv1→route112mผ่าน ชุดtestsเพิ่มครอบคลุมforgeddirectRPC/imageryidentity/decisionlinkage/geometry/CAS/history/privacy พร้อมpending/harnessguardที่กำลังเก็บ FinalqualificationและproductionUIยังรอรอบท้าย ไม่เอาผลพัฒนาแทนผลrelease

Migration+seedใช้จริงแล้วบนxedo/tstmjnlhwidwtzetqxbu ผ่านSQLdashboardเพราะconnectorใช้ไม่ได้ ผลlive-migration.jsonยืนยันcatalog1/14candidate/RLS/column/functionguardและไม่มีdirectanon/authcatalogaccess ไม่สร้างAuthuserหรือเปลี่ยนcredential DBbackwardscompatibleก่อนfrontenddeploy ไม่มีคำถามผู้ใช้ค้าง Source/UI/สองMD/queueจะเติมผลfinaltests/CI/Productionหลังตรวจเสร็จ

#### 3.37.1 Final implementation and regression

Risk transactionsเก็บrawไม่เปลี่ยนและไม่resetsearch/image/time ใช้หนึ่งselectedPolygon3–120จุดเป็นtarget Catalog14พื้นที่รวมraw378จุดแสดงครบ Targetcoverageตรวจunion/holes/concavityจริงและNoDataแยกpartial/complete/unavailable ไม่มีการสร้างconfidencepercentหรือoilvolumeจากSAR Candidateรับ/ปฏิเสธ/manualareaแยกorigin/sourceIDs UIมีModify/Translate/Draw/Undo/Redo/Cancel และGeoJSONimport เปิดผลเดิมซ้ำไม่ทิ้งร่าง

Confirm_riskผ่านauthenticatedBFFและserverRPC ทุกRPCตรงตรวจsession/owner/CAS/idempotency/analysishashes/ทุกdecisionและarealink/validtarget/footprint/imageidentityแล้วderiveactor/time/hash/reviewrevision Draftsavecarryconfirmationเฉพาะriskdraft+target+analysisตรงเดิม ไม่เชื่อclientconfirmedflag CatalogRLSไม่มีdirectanon/authgrants;helpersไม่publicexecute ไม่ติดตั้งPostGIS;boundedSQLtarget≤120จุดและboundedcatalogแทน

PlanningbodyomitssurveyIdเมื่อมีAI เพื่อไม่resolveกลับsearchAOI;geospatialไม่ขอforecastพื้นที่กว้างระหว่างdraftblocked;Confirm/Prepare/ExportตรวจvisiblepixelsภายในtargetจริงจากreviewedGEEtileและexpiry token/revision/sessionguardก่อนหลังasync Targeteditล็อกroute/exportเก่าจนconfirmใหม่ Capture/restoreเก็บdurableimageidentity,analysisRef,riskDraftและconfirmedReviewต่อrevision;ไม่เก็บtileURLหรือreadinessเก่า ภาพreloadสะดุดรักษาsavedref ส่วนภาพไม่อยู่ในsearchไม่เลือกnewestแทนเงียบๆ

inspector-clientdedupdocumentเทียบcaptureก่อนmarkdirty แต่interactionEpochแยกกันlateOpenทับgesture Saveuncertainretryคงmutation/bodyเดิม,receiptมาช้ารักษาร่างใหม่และขยับbaseReview,postcommitlistrefreshfailไม่รายงานว่าSaveล้มเหลว DirectBFF/SQLtestรวมcrossowner/forgedreview/source/image/decision/coverageholes/oldmission/expiredsession/CAS/idempotency

ผลสด:564automatedpass/0fail/0skip,syntaxและ3buildsผ่าน BrowserAuthจำลอง+realBFF/PGlite+liveGEEได้confirm→112mroute,edit/preserveimage-time/staleexportblock/UndoRedoCancel/nativeTranslateCancel/nativeDrawUndo/Savev1-v4/history/2accountisolation;mobile390ไม่แนวนอนล้น page375/panel341 คืนviewport ตรวจsavedstateหลังSavev4และreloadฉากเดิม ไม่อ้างsuccessfulrealpasswordAIflowจากlocalfixtures หลักฐานoutput/release-check/ai-2026-10-29/local-browser.json,local-mobile.png,live-migration.json และoutput/ai-tests-final.txt Publishidentity/CI/API/productionUIเติมหลังdeploy

ยังคง3steps/4calculators/2D3D/readiness/24hpolicyเดิม งานใหม่ไม่เติมaircraftprofile/schedule rewrite/Pi/training/report Fieldtestโดรน/QGC/SITL,physicaltouch/native-trackpad/heap/longsoakยังไม่อ้างผ่าน

#### 3.37.2 Published AI/editor release evidence

เผยแพร่codeb719d8edc15a926401e8c5ccbf3368a114e10553 Productiondpl_87f1XznCMD1MU4gAzVPqyyzydyAZREADY/mainaliasxedo-eight.vercel.app;CI40793396659/40793396559success ProductionHTML6197220bytes/SHA256da57bb8c6e12d66c801722065d559bec5c62f9b3d8162ea4ab9942b124bb5292ตรงbuild Guestsession200/usernull;analyseslist/detail401SESSION_REQUIRED;OpenpreparedAIareaนำguestไปLogin;browsererrors[] Demo→planner1.86km/1sortie→3DDiagram67samples→georeferencedSatellitegroundGEEreadyผ่าน ReadinessรักษาHome/airspace review ตามจริง

ผลAIauthentication/confirmationจากrealpasswordยังไม่รันในProduction;ใช้localAuthfixture+realBFF/PGlite+liveGEEทดสอบAIroute/edit/save/history/isolationและSQLnegativecasesแล้ว คงuseracceptanceAIหนึ่งภารกิจเป็นการตรวจรับ ไม่เพิ่มเป็นfeatureimplementationที่ยังไม่เริ่ม ไม่มีAuthuser/passwordchanges ไม่มีpendingproductquestion Qualificationphysicaltouch/native-trackpad/heap-longsoakยังคงแยก เอกสารfollowupเท่านั้นหลังcodecommitนี้ finaldeploymentidentityเก็บoutput/release-check/ai-2026-10-29/release-receipt.json

### 3.38 ตำแหน่งประมวลผล AI ปัจจุบัน — คำชี้แจง29ต.ค.2026

**หัวข้อ:** แยกเครื่องรันโมเดลออกจากเว็บ/API/ฐานข้อมูลและ GEE

**สรุป:** Production เป็น prepared-result integration ไม่มี online inference worker ที่รับพื้นที่ใหม่จากเว็บ โมเดล SARUNet ของผล6152a5 ประมวลผลล่วงหน้าด้วย Python/PyTorch บน CPU ในเครื่องตาม summary.json และ VALIDATION_TH.md ของชุด GEE_Colab_2026-10-11 ชื่อโฟลเดอร์ Colab ไม่ใช่หลักฐานว่ารันบน Colab cloud; validation ระบุ cloud runtime ขณะนั้นยังไม่พร้อม

**รายละเอียด:** Python runner + ข้อมูล Sentinel-1 VH/VV → ผลคะแนน/พื้นที่เสี่ยง → prepared catalog ใน Supabase → authenticated Vercel Inspector API → browser แสดง14candidate → Inspectorแก้/ยืนยัน → planner เส้นทางนี้ไม่โหลดweightsมารันในbrowser/Vercel/Supabase GEEยังจัดหาภาพและข้อมูลบริบทตามบริการเดิม แต่ไม่ได้เรียก SARUNet แทน runner เมื่อวาดพื้นที่ใหม่ ผลชุดนี้มีภาพต้นทาง9ต.ค.และการประมวลผล11ต.ค.2026 หากต้องการวิเคราะห์ภาพ/พื้นที่ใหม่อัตโนมัติ ต้องเพิ่มคิวงานและ Python inference worker เชื่อมกลับ catalog ตามแผนอนาคต ไม่ใช่พฤติกรรมที่เผยแพร่แล้ว

รอบคำชี้แจงนี้ตรวจไฟล์ต้นทางและ source ปัจจุบัน ไม่รันโมเดล ทดสอบ build หรือ deploy ใหม่ ไม่เปลี่ยน implementation queue เพราะไม่มี requirement/status ใหม่

### 3.39 แผน on-demand cloud SAR — 29 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้ต้องการเลือกพื้นที่ใหม่แล้ววิเคราะห์ผ่านเว็บ และยืนยันpilot1คน/100งานต่อเดือน/กรอบexport≤200กม² รายละเอียดเต็มอยู่CLOUD_AI_EXECUTION_PLAN.mdและAI_INTEGRATION_PLAN§3.18 เป็นrequirementใหม่เหนือpreparedresultที่เชื่อมแล้ว ยังไม่implementหรือเผยแพร่

**สรุป:** แนะนำCloudRunJobsCPU4vCPU8GiB,ครั้งละ1งาน,ปิดเมื่อจบ คงVercelAPI/SupabaseAuth-privateMissions เพิ่มdurablejobs/outbox/ownedimmutableanalysisและprivateGCS ขนาดcheckpointSARUNetจริงประมาณ1.92MiB,488561params ผลCPUเดิม2.22238s/9tilesเป็นmodelprocessingเก่า ไม่ใช่เวลารวม/cloudbenchmark CloudCPUจึงเป็นจุดเริ่มที่มีเหตุผลโดยไม่บังคับGPU ต้องวัดmemory/endtoendก่อนยืนยันสเปก

**รายละเอียดระบบ:** สั่งjobคืน202/jobIdทันที→ติดตามงานจากDB→workerค้นหาSentinel1VH/VVตามAOI/date→boundedgetDownloadURL(DATA/VALIDแยก)สำหรับgrid≤2ล้านpixels/ด้าน≤4096 หรือGCSbatchexportเมื่อจำเป็น→ตรวจgrid/unit/bands/NoData/hash→รันPythonทีละ512tile→polygonizegeoreference→เขียนprivateartifactsครบ→ลงทะเบียนownedanalysis→ใช้riskeditor/confirm/plannerเดิม ต้องถอดresultIdคงที่และขยายserverRPCownerlookup ไม่ใช้sharedcatalogสำหรับprivateanalysisใหม่โดยไม่แก้สิทธิ์ ไม่เปลี่ยนworkflowเป็นGoogleLoginหรือให้ผู้ใช้กดDriveTasksเอง

Globaljoblease/idempotency/outbox/reconciliationกันexecutionซ้ำ;CloudRunparallelism1อย่างเดียวไม่กันหลายexecutions ขอบpilotคือ1active/2pending/100jobsเดือน/30mdeadlineและboundedretryที่นับค่าใช้จ่าย ProgressแสดงstageจริงและX/Ytiles รอGEEใช้spinner/เวลาที่ผ่าน ไม่สร้างlivepercentปลอม Close/reopen/session/lateinput/cancel/NoData/0candidateต้องจัดสถานะตามจริงและprivatehistoryอยู่กับowner

**คำนวณ:** ราคาอ้างอิงus-central1 CPU4/8=$0.000088/s=$0.3168/h;100งาน×600s=$5.28ก่อนfree,$0.06เฉพาะcomputeเมื่อallowanceทั้งหมดว่าง ModalT4/L4รวม2physicalcores+8GiBที่เวลาสมมติเดียวกัน=$12.4776/$15.9576ก่อนเครดิต ตัวเลขไม่รวมGEEfees/storage/transfer/build/log/tax ไม่อ้างCPU/GPUlatencyเท่ากันหรือว่าfreecreditsมีในบัญชีจริง เสนองบสำรอง$10–15/เดือนสำหรับpilotและตรวจGEEregistration/noncommercialquotaจริงก่อนเปิดใช้ ไม่อนุมัติBillingในturnนี้

**สถานะ/หลักฐาน:** source/summary/checkpointhashและราคาจากofficialdocsตรวจใหม่;เลขคณิตและassumptionsอยู่outputs/XEDO_Cloud_AI_Plan_2026-10-29/costs.json เพิ่มstage9/current6ในqueueเป็นplanned/notauthorized คำถามปริมาณตอบแล้ว ไม่มีรอคำตอบ ไม่รันAIหรือcloudbenchmark/tests/build ไม่เปลี่ยนsource/SQL/service/Auth/config ไม่push/deployใหม่ ผล564testsและProductionREADYเป็นรอบเผยแพร่preparedAIเดิม

### 3.40 ข้อจำกัดคำยืนยัน cloud — 30 ตุลาคม 2026

**หัวข้อ:** ป้องกันการอ่านsizing/costscenarioเป็นno-crashหรือไม่มีค่าใช้จ่ายแน่นอน

**สรุป:** CloudRunJobsCPU4/8เป็นconfigurationที่เสนอ ยังไม่ผ่านbenchmarkcloud/peakRAM/endtoendของพื้นที่สูงสุด200กม² จึงไม่รับประกันไม่มีงานล้มเหลว แผนเลือกpay-as-you-goไม่ใช่subscriptionผูกมัดรายเดือน แต่ต้องมีCloudBillingและจ่ายตามการใช้งานเมื่อเกินสิทธิ์ฟรี/มีบริการอื่นคิดเงิน

**รายละเอียด:** ตัวเลขCPUเดิม2.22sไม่รวมGEE/network/coldstartหรือcloudmemory ผลคำนวณ$5.28คือตัวอย่าง100งาน×10billableนาทีไม่ใช่ราคาคงที่/สูงสุด CloudRunหยุดinstanceเมื่อRAMเกินlimitและspendcapไม่หยุดค่าใช้จ่ายได้ทันทีทุกกรณี ก่อนเปิดใช้ต้องทำmax-area benchmark,queue/globallease,timeout/boundedretry,costreservation/quota,alerts/spendcapตามที่บัญชีรองรับ และfailureUIที่เก็บdraft/missionและไม่ใช้ผลเก่าข้ามrevision

ตรวจofficialpricing/memorylimits/spendcapdocs30ต.ค.และอัปเดตสองMD/แผน/คิวเท่านั้น ไม่รันAI/cloudbenchmark/applicationtests/build ไม่แก้application/SQL/service/Auth ไม่เปิดBillingหรือsubscription ไม่push/deployใหม่ คำถามผู้ใช้ไม่ถือเป็นการอนุมัติสร้างทรัพยากรเสียเงิน

### 3.41 Google Cloud/GEE readiness และ CPU preparation — 30 ตุลาคม 2026

**หัวข้อ:** ตรวจบริการจริงและเตรียมCPUtestตามคำสั่งล่าสุด โดยยังไม่เปิดBilling/paidresources/subscriptionเพราะผู้ใช้ยังไม่ได้จัดงบเดือนนี้

**สรุป:** configเว็บอ้างtest-01-494520,credentialprojectตรงกันและauthอ่านmetadataสำเร็จ GEEAPIENABLED/registrationREGISTERED_NOT_COMMERCIALLY ConsoleยืนยันCommunityTier/eligibilityexpireFeb10,2028/monthlyusage0.87% Billingconsoleยืนยันprojectไม่มีBillinglinked Run/CloudBuild/ArtifactRegistryAPIDISABLED ดังนั้นCloudRunจริงยังไม่เริ่ม เพราะแม้ตั้งใจใช้freeallowanceก็ต้องมีBillingตามprerequisite ไม่กดFreeTrialหรือlinkaccount

**รายละเอียด trust/evidence:** Project/Billingcontrol-planeGETตอบ403SERVICE_DISABLED เป็นข้อจำกัดAPIreadไม่ใช่หลักฐานว่าไม่มีBilling จึงอ่านconsoleต่อและเก็บหลักฐานunlinkedแยก ใช้เฉพาะOAuthauthentication+GETmetadata ไม่มีvalue:compute/computePixels/export/mapcreation/APIenable/IAMgrant Token/keyไม่ลงไฟล์หรือtooloutput GEEregistration/tierที่ยืนยันได้ไม่ใช่การรับประกันโควตารองรับ100analysisใหม่โดยไม่วัดEECUต่อjob

**CPUในเครื่อง:** tmp/gee-colab-venvมีdepsที่ตรงbaselineพร้อม ไม่ต้องinstall;Pythonหลักขาดชุดนี้ DockerCLIมีแต่daemonไม่พร้อม/gcloudไม่พบ จึงยังไม่buildcontainer พบhostRyzen7 8845HS/16logicalprocessors/RAM15.26GiBเพียงmetadata ไม่ใช้แทนcloudbenchmark เตรียมbenchmark_cpu.pyที่defaultdry-run,CPUbatch1,threads2/4,coldfreshprocess/warmreuse,peakworking-set/RSS,timeout/ผลhashและcache-tempจำกัดoutput Rootรันdry-runผ่าน6hashes/readytrue/inferencefalse ยังไม่โหลดweights/รันโมเดล

ภาพจริงที่ผูกmanifestคือ1317×1340/176.478กม²/9tiles;case10/100/200กม²ใหม่ยังไม่ได้รับ ไม่resizeภาพเดิมแล้วอ้างพื้นที่ใหม่ Localthreadconfigไม่เป็นhardlimit4vCPU8GiBและไม่วัดGEE/cloudcoldstart Scopeเตรียมครบแต่ไม่มีผลประสิทธิภาพcloudใหม่

**รายงานและสถานะ:** outputs/XEDO_CPU_Readiness_2026-10-30/READINESS_REPORT.md,cloud-metadata.json,evidence2JSON/2ภาพ,local-resources.json,preparation/README+manifest+harness+dry-runreceipt คิวstage9เพิ่มreadiness/preparationapprovedและno-spendconstraint;ยังไม่อนุมัติfullimplementation/paidexecution/publication ไม่เปลี่ยนwebsite/SQL/Auth/config ไม่push/deploy การทำCPUlocalจากไฟล์เดิมเป็นทางเดินที่ไม่ต้องสมัครบริการในเดือนนี้ แต่ยังไม่executeinferenceในรอบเตรียม

### 3.42 Local CPU benchmark จริงและผลต่อการเชื่อมเว็บไซต์ — 30 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้สั่งรันCPUกับภาพเดิม วัดเวลา/RAMและเทียบผล โดยไม่เปิดBilling/subscription/paidcloud รอบนี้จึงเปลี่ยนสถานะจากpreparedเป็นlocalexecuted ไม่ใช่เปิดonlineinference

**สรุป:** รันสำเร็จ8processes/16passes (threads2/4,ชุดละcold3+warm5) ด้วยPython3.11.9/torch2.14.1+cpuในvenvเดิม Ryzen7 8845HS/16logicalprocessors/15.26GiBhostRAM Batch1,float32,interop1,9tiles512²,thresholdscore>=0.3 ภาพเดิม1317×1340/176.478กม²/valid106.183กม² ผลทั้ง16ตรงbaselineทุกพิกเซลและTIFFhashตรงด้วย

| Metric | 2 threads | 4 threads |
|---|---:|---:|
| Fresh-process wall median3รอบ รวมimports/load/preview/result/hash (s) |12.430|12.242|
| Cold runner processing median3รอบ (s) |2.991|2.350|
| Warm reuse processing medianรอบ2–5 (s) |3.183|2.297|
| Warm reuse รวมpreview/return files medianรอบ2–5 (s) |4.991|4.171|
| Cold native RAM peak สูงสุด3processes (MiB) |670.699|671.844|
| Warm native RAM peak ทั้งworker5passes (MiB) |875.977|891.297|

**Measurement contract:** parentใช้perf_counterวัดเต็มfreshprocess;workerแยกdependencyimport/runnerimport/modelload/runnerprocessing/run_inferenceรวมpreview Rawsummaryprocessingเริ่มหลังload/validateและจบก่อนpreview จึงเป็นscopeเดียวที่ควรเทียบhistorical2.22238s Warmรอบแรกแยกจากreuse2–5 มีเพียงn4;ไม่ประมาณP95/SLA Coldยังใช้OSfilecacheและไม่จำลองcloudcontainer Nativepeakworking-setผ่านpsutilบนWindowsรวมimports/load/ทุกpass;sampledRSS50msเริ่มหลังloadและอาจพลาดspike RAMไม่ใช่ขนาดcheckpointหรือRAMทั้งเครื่อง Warmpeak0.8704GiBสูงกว่าcoldแต่5passesไม่พิสูจน์long-runstabilityหรือmemoryleak

**Reproducibility contract:** ใช้immutableDATA/VALID/METADATA/checkpoint/runner/baselinesummaryเดิม ตรวจ6SHA256ก่อนและหลังรันweights_onlyload Outputทุกpassแยกfolderใหม่ไม่ทับbaseline เปรียบเทียบwindowedTIFFครบ16filesetsหลังtimingจบ ตรวจscore/mask/CRS/transform/dtype/NoData/GDALmask/inputVALID:valid1,061,830/NoData702,950/candidate15,248,scoremaxabs/MAE/RMSE0,maskdiff0 IoU/Dice1กับผลโมเดลเก่าไม่ใช่accuracyหน้างาน Comparatorผ่าน5failure-gateselfchecks

**ผลต่อarchitecture:** CPU4threadsเป็นฐานlocalที่ใช้งานต่อได้จากภาพนี้ ไม่มีเหตุซื้อGPUในรอบนี้ การทดลอง2GiBsingleworkerเป็นข้อเสนอเผื่อnativepeakที่พบเกิน512MiBและใกล้1GiB ต้องวัดภายใต้hardlimitจริงก่อนรับรองสเปกcloud ไม่ปรับcostscenario4/8เดิมเป็นบิลใหม่จากเวลาlocal ขาดGEEsearch/export/download/network/cloudstartup/vectorization/upload/catalogregistration/UIlatency จึงยังไม่ใช่เวลาที่ผู้ใช้กดAnalyzeจนได้ผล

เว็บProductionยังคงpreparedSAR/editor/privateconfirm/plannerเดิม โมเดลที่รันรอบนี้ทำงานofflineในเครื่อง ไม่ได้ต่อendpoint/queue/workerหรือทะเบียนresultใหม่เข้าสู่Production การเลือกพื้นที่ใหม่แล้วAnalyzeยังต้องimplementตามCLOUD_AI_EXECUTION_PLAN ไม่มีการเปลี่ยน3steps/4calculators/account/SQL/permission/schedule/readinessในรอบนี้

**Evidence/repair handoff:** รายงานละเอียดoutputs/XEDO_CPU_Benchmark_2026-10-30/CPU_BENCHMARK_REPORT.md;metrics-summary.jsonพร้อมpostrunhash;measurements.csvราย16passes;comparison/comparison-report.jsonและ5caseselfcheck Rawreceiptอยู่outputs/XEDO_CPU_Readiness_2026-10-30/preparation/runs/20261030T055818Z_7c53fb88/benchmark-receipt.json ถ้าทำซ้ำใช้venvเดิมกับbenchmark_cpu.py--execute-localตามrunbook ห้ามนำdry-runreceiptเก่ามาแทนผลจริงหรือใช้localthreadsอ้างcloudvCPUisolation

รอบนี้มีlocalinference/compare/aggregation/hash/docJSONdiffverificationจริง ไม่รันwebtests/build/browser/APIใหม่ ไม่เปิดBilling/subscription/API/paidresources และไม่commit/push/deploy ไม่มีคำถามค้างและไม่ต้องขอให้ผู้ใช้เปิดBillingสำหรับlocalpathนี้

### 3.43 แผน website→local CPU→ผล AI ของพื้นที่ใหม่ — 30 ตุลาคม 2026

**หัวข้อ:** แนวทางเริ่มต้นข้อ6/เดิม9เป็นlocalCPUตามLOCAL_CPU_AI_INTEGRATION_PLAN.md แทนการเปิดcloudworkerเดือนนี้ ไม่เปิดBilling/subscriptionหรือpaidresource รอบนี้เป็นแผนไม่ใช่implementation

**สรุปarchitecture:** BrowserInspector→same-originVercelBFF→durableownedjobsในSupabase เครื่องWindowsดึงงานออกผ่านHTTPSRPC→GEEautomaticdownloadหนึ่งSentinel1scene→CPU4threads/batch1/float32/threshold0.3→reusablepolygonization/coverage→immutableownedresult+privatepreview→riskeditor/confirm/planner/privatehistoryเดิม คง3steps/4calculators ไม่ต้องเปิดpublicport/localhostfrombrowser/tunnel/CloudRun/cron

**Transport/trust:** DedicatedmachineAuthidentityไม่อยู่Inspectorrosterและมีprivateworkerregistryผูกowner ไม่เพิ่มroleของผู้ใช้ ไม่ส่งservice_roleหรือInspectorpasswordไปเครื่อง Claimตรวจidentity/queueavailabilityแล้วจัดleaseatomic;writesหลังclaimตรวจlease/fence/currentattempt/cancel/deadline/session/ownerในDBแม้เรียกRPCตรง Workerเป็นtrustedproducer ไม่ใช่proofว่าserverรันโมเดลเอง ResultanalysisRefใหม่serverderiveจากcanonicalcatalogJSONตามsealversionใหม่ เก็บprepared-filehashsemanticsเดิม LocalTIFFhashเป็นproducer-reportedและไม่อ้างverifiedbytehashเมื่อserverไม่อ่านไฟล์

**Persistence:** analysis_jobs/attempts/owned_analysis_results/worker_registryอยู่privateสอดคล้องRLSและexplicitfunctiongrants ไม่มีdirecttableaccessสำหรับผู้ใช้/เครื่อง ผลreviewcatalogpersistentและpreview≤512KiBในprivateStorageเดิมเมื่อquotaผ่าน RawTIFF/metadata/runmanifestเต็มอยู่localและไม่ถูกpublishpublic Uploadpathผูกowner/job/attempt;machineเป็นuploaderจึงต้องStoragepolicyอิงpublishedresultowner ไม่ใช้uploaderUIDแทนInspector Smallresultที่publishแล้วเปิดย้อนหลังได้ตอนเครื่องดับ ส่วนTIFFdownloadเต็มยังต้องเครื่อง/ช่องทางที่อนุมัติ

**Pipeline/limits:** defaultค้นย้อนหลัง30วันและเลือกsingleCOPERNICUS/S1_GRD IW10m/VH+VVตามcoverage ไม่multi-date-mosaic ใช้getDownloadURLแยกDATAfloat32[VH,VV]Sigma0dB/VALIDuint8บนnativeCRS/affineเดียวกันพร้อมmetadata ไม่logdBซ้ำ/resize/regrid Wrapperenforcewidth×height≤2Mpx/dimension≤4096/gridrectangle≤200กม²ก่อนและหลังdownload เพราะrunnerเดิมmax100Mpx Geometry4connected/holes/components/alwaysxy/roundtrip0mismatchตามวิธีsupportที่ตรวจแล้วแต่ต้องextractmoduleไม่พึ่งbaselineconstants

ตรวจruntime metadataรอบนี้พบearthengine-api/pyproj/shapelyยังไม่ติดตั้งในbenchmarkvenv จึงต้องสร้างenvironmentworkerแยก/pinและregressionก่อนต่อของจริง ไม่เปลี่ยนvenvเดิมในรอบวางแผน Candidate256/document1MiB/target≤120จุดยังคง;เสนอcatalog512KiB/rawvertices8192/preview512KiBเป็นcapsที่ต้องqualify Rawvalidationแยกจากtargetvalidator เกินcapให้complexityfailureพร้อมrawlocalไม่simplify/truncateเงียบ ๆ

**UI/lifecycle:** เพิ่มAnalyzearea/workerpresenceและjobprogressในflowเดิม SelectedRouteในapi/inspector.mjsยังไม่รับhyphenfirstsegment ต้องเพิ่มboundedrouteallowlistและrewrite/querytestsไม่เพียงdispatchbranch Workerofflineให้เปิดโปรแกรมก่อนsubmit;หลุดระหว่างงานแสดงwaiting/recoveringตามlease ไม่มีinfinitebusy GEEแสดงstage/elapsed/bytesที่รู้จริง CPUแสดงX/Ytiles;DBcommitสำเร็จจึงReady Browserรับผลเฉพาะaccount/jobId/AOIhash/inputRevisionตรง มิฉะนั้นอยู่history ไม่ทับdraftใหม่หรือconfirmationเดิมเมื่อjobใหม่failed

S1sarSourceและS2contextImageเก็บแยกตามsourceจริง Targetยังต้องอยู่searchAOI/reviewedimage/analysisfootprintตามSQLเดิม และSARvalidcoveragecomplete/partial_or_unavailableแสดงต่างหาก ไม่เพิ่มfull-validgateโดยอ้างพฤติกรรมเดิม Raw→Inspectordraft→confirmedtarget≤120จุด→planner/readiness/visiblepixels/24hยังคง

**งบ/acceptance:** ใช้localcomputeกับexistingfreeentitlementsโดยตรวจactualquotaก่อนpilot จำกัด1active/2pending/100logicaljobsเดือน/deadline30m/boundedretry และbyte-reservationสำหรับผลเล็ก SupabaseเพดานFree500MBDB/1GBstorage/5GBegressเป็นofficialplanไม่ใช่remainingจริง;ต้นทุนไฟฟ้า/เน็ตและquotaGEEยังมีข้อจำกัด ไม่มีautomaticupgradeหรือpaidfallback แผนเต็มมี7milestonesและdesigned_not_runสำหรับrealnewAOI/noSAR/NoData/complexity/offline/sleep/retry/lease/cancel/latejob/auth/Storage/privacy/edit/planner/regression/quotas

**สถานะรอบนี้:** source/officialdocs/package metadata/เลขคณิต/documentJSONdiffchecksและread-onlyhelperreviewเท่านั้น ไม่รันinference/GEEcompute/benchmark/webtests/build/browser/liveDB/Storagequota ไม่install/provision/Authmachine/bucket/SQL/configchange ไม่commit/push/deploy ไม่มีคำถามค้าง คิวlocalplanonlyและclouddeferred;implementation/releaseต้องอิงคำสั่งถัดไป

### 3.44 Local CPU implementation ขั้น1–2 — 30 ตุลาคม 2026

**หัวข้อ:** Localpipelineใหม่ทำงานจริงแล้วในworkers/local-ai ไม่ใช่การเปิดonlineAnalyzeบนเว็บไซต์ ขอบเขตผู้ใช้อนุญาตreadiness/automaticinput/CPU/package/testsเท่านั้น คงเว็บเดิม3steps/4calculatorsและไม่push/deploy

**Architecture/ไฟล์:** common.pyกำหนดAOI/grid/hash/configcontracts;acquisition.pyค้นหนึ่งCOPERNICUS/S1_GRD/IW10m/VH+VVตามcoverage→latest→asset tie-breakและอ่านGEO_TIFFด้วยcomputePixels;vendor/gee_sar_inference.pyเป็นสำเนาbyte-identicalSHA1eaada...ของauditedengine;pipeline.pyทำCLI/doctor/stages/CPU4threadsและreceipt/RAM;package_result.pyตรวจหลักฐานและสร้างunreviewedlocalcatalog;setup-local-ai.ps1/run-local-ai.ps1/README/lockfile/tests/examplesใช้ทำซ้ำ ไม่มีHTTPserver/workerregistry/queue/DBpublishในขั้นนี้

**GEE/permissions:** LivegetDownloadURLdevelopmentrequestถูกปฏิเสธearthengine.thumbnails.create จึงใช้computePixelsพร้อมcrsCode/dimensions/affine6coefficients/bandIdsบนnativecropเดิม ผ่านpermissionearthengine.computations.createที่มีอยู่ ไม่เพิ่มIAM/enableAPI/Billingหรือสร้างthumbnail/export/Drive/GCSresource CurrentprojectconfigยืนยันREGISTERED_NOT_COMMERCIALLY Source/newrequestเก็บscene/acquisition/orbit/date/grid/model/recipeและinputhashครบ ไม่มีsignedURL/token/keyในlogs

**Inputcontract:** จำกัดexportrectangle≤2Mpx/แต่ละด้าน≤4096/พื้นที่≤200กม²ก่อนและหลังอ่านไฟล์ Preservefloat32[VH,VV]Sigma0dB,VALIDuint8,sourcebasisกับintegercropoffset ValidateCRS/affine/dtype/bands/scales1/offset0/NoData/VALID/finiteก่อนโมเดล ต้นฉบับinvalidNaNบางช่องถูกcanonical-9999ในระบบใหม่เฉพาะVALID0;validvalues/VALIDไม่เปลี่ยน ไม่logdBซ้ำ/resizeหรือแทนข้อมูลขาดด้วยvalid0

**Output/geometry:** scorefloat32NoData-9999/maskuint8NoData255/preview/summary/source_metadata พร้อมlocal-manifest,analysis.local.jsonและrawcandidate/coverageGeoJSON ตรวจsummarygridกับactualTIFF/GDALmask/numericnodata/counts/threshold Polygonize4connectedรักษารูและทุกcomponent Serializefullprecisionแล้วrasterizeกลับต้องmismatch0 OutputgridfootprintแยกAOI/scene/validcoverage ใช้denseAOIกับครึ่งpixel-diagonalbufferเพื่อบันทึกGEE/GDALboundaryfringe ไม่clipหรืออ้างstrictcentrecontainmentเกินจริง จำกัดcomponents256/vertices8192/ringpoints4097/rings64/JSON512KiB เกินแล้วfailureชัดเจนรักษาTIFFเต็ม

**Readinessที่ไม่เพิ่มค่าใช้จ่าย:** overlayvenvใหม่tmp/local-ai-worker-venvอ่านbenchmarkpackagesผ่าน.pthไม่แก้envเดิม เพิ่มEarthEngine1.7.50/Shapely2.2.0/Setuptools78.1.0และpinfreeze;pipcheckผ่าน pyprojไม่จำเป็น Vendor/checkpointและ6originalhashesคงเดิม SupabaseChromeอ่านจริงFree/HealthyNano/DB25.5MB allowance0.5GB/project/Storage0of1GB/egress0of5GBตามrounded-delayedUI ไม่มีbucketพร้อมใช้และยังไม่สร้างหรือทดสอบสิทธิ์upload/RLS (futurephase) localขั้นนี้ไม่อัปโหลดขึ้นเว็บ

**ผลสด:** smallnewAOI5.0172กม²18.47s/CPU0.336s/peak508.92MiB และfinalnewAOI197.5274กม²31.11s/CPU4.041s/peak725.95MiBใช้SAR26ต.ค.ได้0candidateตามโมเดล Finalbaselinedownload176.478กม²27.94s/CPU3.031s/peak721.52MiBได้14components/15,248candidatepixelsและscore/maskpixel+TIFFhashตรงbaseline9ต.ค.ทุกค่า Replay/progress10.72s/CPU2.711sยืนยัน9/9callbackก่อนpackaging ValidinputVH/VV/VALIDตรงเดิมทั้งหมด ต่าง59,550invalidbandvaluesเพราะoriginalNaN→-9999เท่านั้น เป็นper-runobservationไม่ใช่P95/SLA/fieldaccuracyหรือ100jobsloadtest

**Verification/remaining:** 13Python testsผ่านรวมinvalidAOI/limits/pixelresponse/NoData/VALID/scales/GDALmask/summarygrid/holes/diagonal/zeroCandidate/noValid/threshold/complexity;geometryroundtrip0ทุกacceptancecase Independentreadonlyartifactreviewผ่าน SourceAST/PowerShellparser/hash/JSON/diffตรวจตามREPORT.md ไม่รันwebtests/build/productionbrowserหรือเปลี่ยนfrontend/API/SQL/Auth/bucket/config ไม่มีBilling/subscription/commit/push/deploy ยังเหลือขั้น3–7 queue/ownedresults/workeridentity/transport/UI/qualification/release;hardwholejobdeadline/PCoffline-resumeยังไม่อยู่ในCLIนี้

เอกสารใช้งานworkers/local-ai/README.md หลักฐานoutputs/XEDO_Local_CPU_Pipeline_2026-10-30/REPORT.mdและfinal-validation.json ใช้สคริปต์run-local-ai.ps1กับไฟล์พื้นที่GeoJSONเพื่อรันในเครื่องได้ตอนนี้ ไม่บอกว่าปุ่มAnalyzeบนProductionพร้อมก่อนขั้นถัดไป

### 3.45 Local CPU website integration ขั้น3–5 — 30 ตุลาคม 2026

**สถานะ/ขอบเขต:** local-tested candidate หลังuserอนุญาต3–5เท่านั้น ไม่applySupabaseSQL/Auth/Storageหรือpush/deploy ทดสอบด้วยlocalAuthfixture+PGliteกับBFF/SQL/browserจริง และGEEacquisition+CPUจริง สถานะProductionยังอ้างreleaseเดิม ไม่ใช้localผลแทนrealhostedacceptance

**เส้นทางข้อมูล:** Inspectorวาด/เลือกsearchAOI→Analyzeเช็คworkerpresence→ยืนยันและSaveผ่านrevision/CASเดิม→POSTanalysis-jobsส่งเฉพาะmissionId/expectedRevision/mutationId→DBfreezeAOIจากdocument.searchGeometryและderiveowner→machineclaimผ่านoutboundRPC→pipelineGEEsingleS1/CPU/package→publishownedcatalog→GETjobresultId→ownedanalysisdetail→rawcandidate/coverageoverlay→Inspectordraft/confirm→plannergeometry→Save/reopen/history รูปS2บริบทและSARsourceมีคนละacquisitionidentityไม่สวมวันที่เดียวกัน

**API/ฐานข้อมูล:** BFFยังใช้sameorigin/CSRF/HttpOnlycookie/actorheader ไม่ส่งSupabaseJWTถึงbrowser GETanalysis-worker/analysis-jobs/jobและPOSTcreate/cancelเป็นallowlistroutes ค่าผู้ใช้ไม่เลือกowner/worker/SQLเอง Joberrorส่งเฉพาะsafe label→ข้อความช่วยแก้ ไม่echoSQL/providertext SQLติดตั้งตามลำดับinspector-foundation→inspector-ai→inspector-local-jobs→inspector-local-jobs-status สองไฟล์ใหม่เป็นatomic/versionedapplyซ้ำno-opและตรวจpredecessorexactก่อนadaptresolver ใช้privateRLS/revokedlive-sessionguards/explicitfunctiongrants ไม่มีdirecttablepermission

**คิว/ownership:** local_worker_registryผูกdedicatedmachineUID→enabledInspectorownerโดยไม่เพิ่มmachineในInspectorroster analysis_jobsfreezeinputrevision/specและmutationhash;attempt/fence/lease/publishreceiptคุมwrites serverderiveownedresultIdและanalysisRefจากJSONBcanonicalSHA256/sealVersionxedo-jsonb-seal/1 Preparedcatalogเดิมhashไม่เปลี่ยน งานและresultของคนอื่นตอบ404ทั้งlist/detail/save/confirm/history แม้เรียกdirectRPC ต้นทางmodel/filehashยังเป็นproducerreport ไม่อ้างDBรันAI/อ่านTIFFซ้ำ DBตรวจmodel/checkpoint/recipe/threshold/dates/grid/counts/topology/unknownrootkeys/sizeและoverridevalidation/reviewflagsให้unreviewed/accuracyfalse

**Caps/lifecycle:** หนึ่งrunningทั่วqueue/สองqueued/100logicaljobsต่อownerต่อUTCเดือน ไม่ใช่100attempts ทุกjob30mจากcreate/lease120s/attemptmax2 workerpresenceTTL180s Inputnativegrid≤2Mpx/4096ต่อด้าน/200กม²และearlyconservativeAOIbbox คงtargetหนึ่งPolygonไม่มีรู≤120จุด Rawcandidate≤256/coverage≤512/vertices8192/ring≤4097/rings≤64;workerJSON≤512KiB/DBcanonicalcatalog≤600000bytesรวมJSONBspacing เกินcapfailชัดเจนไม่truncate ผลเต็มคงlocal Ownerjob/jobsอ่านแล้วexpireharddeadlineหรือcancel+expiredleaseเองแม้PCตาย ไม่รอclaim/cron Workerclaimค่อยrecoverleaseที่ยังมีเวลาและincrementfence/attempt

**โปรแกรมในเครื่อง:** remote_worker.pyรับเฉพาะfixedXEDOSupabaseURL Normalmode;localQAเปิดexplicit127.0.0.1:5193เท่านั้น ใช้publishablekey+dedicatedmachineAuthไม่มีservice_role/passwordstorage WindowscurrentuserDPAPIprotectrefreshsession endpointbound ParentแยกheartbeatจากCPUchild มีdeadline/RSSwatchdog/killoncancelและส่งrealstage/tiles ใช้CREATE_NO_WINDOW ไม่เปิดconsolehelperใหม่ผ่านStart-Process Persistactivecheckpoint+analysisfilehash+stablemutationก่อนpublish unknownresponseให้retryexactbodyโดยไม่รันCPUซ้ำ StartupprocessingrecoveryตรวจPID/create-time/commandก่อนหยุดchildเดิม ไม่blindkillอื่น FullTIFF/score/mask/previewอยู่local;catalog/candidates/coverage/source/model/sealsอยู่DBและเปิดได้เมื่อworkerปิด ไม่สร้างStoragebucket/uploadในmilestoneนี้

**UI/state/performance:** planning-analysis-jobs.jsแยกcoordinationจากriskgeometry ไม่overlappoll/action/Save;activepoll4s/idle30s/hidden15sโดยไม่มีrequestและguestไม่poll ทุกresponseตรวจidentity/epochและautoopenต้องตรงcontextKeyรวมedit+mission+AOI guard ตั้งpendingmutationก่อนPOSTเพื่อretryuncertainsubmitไม่saveซ้ำ Changeaccountล้างjobs/results/privatepresenceและไม่ให้oldfinallyปลดbusyของnewaccount riskeditorตรวจactiveedit/workingหลังmanualdetailfetchและconfirmทุกครั้ง ผลช้าไม่หยุดeditหรือทับdraft การpollupdateเฉพาะstatus/historyDOMไม่clearvectorหรือrecalculateroute Historyแสดง10จากDB30รายการและจำกัดscroll240px เปอร์เซ็นต์เฉพาะrealtiles;GEEใช้stage/indeterminateprogressไม่เดาlivepercentage Failed/completedfeedbackไม่ถูกidlepresenceลบทันที

**Inspector/planner:** rawresultsimmutable Inspectoreditableareaแยกจากanalysisและconfirmedreview ผู้ใช้accept/reject/move/edit/draw/GeoJSONApply/UndoRedoได้ตามเดิม ZeroCandidateสำเร็จได้พร้อมข้อความไม่ใช่absenceofoilและmanualDrawเปิดอยู่ Confirmต้องreviewimage/pixelcoverage/searchAOI/outputfootprintตามgatesเดิมและเก็บtarget/CASreviewrevisionแยก NoDataเป็นข้อมูลไม่พอ แยกvalidcoveragecomplete/partial/unavailable ไม่ทำให้โมเดลยืนยันoilthickness/volume Plannerสามขั้นตอนและตัวคำนวณสี่ส่วนเดิม Exportยังบล็อกmissingHome/drone/readiness

**หลักฐานสด:** UIAliceเลือกRayongAOI4.83กม²/กรอบraster5.0172กม²→jobfd333481-5af8-4d17-8a51-1d0fdea2f13d→SAR26ต.ค.23:00:37UTC→resultXEDO_LOCAL_RESULT_96c461bcab3d46d69b1c543adc33b991 pipeline23.373s/runner0.504s/nativepeak509.92MiB/queue→publish28.421s/compactcatalog10303bytes/0candidate Manualdraw/Applyboundary/UndoRedo;confirmก่อนภาพถูกปฏิเสธ→S2review27ต.ค.→confirmv2/coveragecomplete→route11.47km→Save/reopen4versionsผ่าน RestartfilebackedDBและหยุดworkerแล้วยังอ่านผล/target/historyได้ BobUIไม่มีmissionและBFFอ่านAlicejob/result/mission/history404ทั้งสี่ Queuedcancelไม่ล้างconfirmedtarget Presenceofflineจริงหลัง180s หน่วงmanualdetail7sแล้วเริ่มDrawยังรักษาactiveedit/14preparedcandidates ไม่มีlateinstall

**Verification:** 606Nodepass/0fail/0skipรวมDB18/coordination21/newBFF3และregressionเดิม;Python30pass (pipeline13/worker17รวมDPAPIจริง/fixturechild) ไม่ถือunitchildเป็นrealinference Syntax/npmcheck/newmodulesผ่าน 3buildsผ่าน FinalhostedHTML6207852UTF-8bytes (buildlog6207848เป็นJSstringlength) Browserreloadfinalbundle/reopenv4/status/consoleตรวจแล้ว หลักฐานREPORT.md/local-http-acceptance.json/owned-result.json/saved-mission.json/sourcehashes/screenshotsและrawlocalpipelineในoutputs/XEDO_Local_AI_Web_2026-10-30+ignoredlocal-data/local-ai-web-final ไม่มีrealSupabasepasswordacceptance/multi-connectionrace/100jobssoak/near200UIqualificationในรอบนี้

**การทำต่อ:** เริ่มserverQAด้วยnode scripts/preview-local-ai.mjsหลังbuild dataอยู่ignoredlocal-data;Authfixtureไม่ใช่บัญชีproduction ดูworkers/local-ai/README.mdสำหรับDPAPI/config/runและข้อกำหนดทีมสร้างmachineภายหลัง ก่อนเปิดonlineต้องอนุญาตSQLทั้งสอง/registry+machineAuth/deployและตรวจrealPostgREST grants/session/ownerisolation+hostednegativecases ขั้น6–7และquota/devicequalificationยังเหลือ ไม่มีBilling/subscription/paidfallback/IAMเพิ่ม หลังเก็บหลักฐานหยุดlocalQAserver/workerและปิดแท็บแล้ว ไม่มีคำถามรอคำตอบ


### 3.46 Supabase real-backend qualification ขั้น6 — 30 ตุลาคม 2026

**สถานะ:** ขั้น6inprogress ผู้ใช้อนุญาตbackendจริงแต่ไม่push/deploy/Billing/subscription Migrationqueue/ownedresults/statusติดตั้งแล้วในxedoจริงผ่านMCPmegaphijakหลังbackup/preflight exactmarkers ทั้ง6ตารางใหม่RLS/noanon-or-authenticatedCRUD publicxedo_local_workerInvoker/explicitexecuteauthenticated session+registryguard ข้อมูลpreparedเดิมhashไม่เปลี่ยน Frontendออนไลน์ยังreleaseเดิม Mainใช้เว็บlocalกับBFFจริง ทดสอบsigned-inต่อได้เมื่อผู้ใช้เตรียมบัญชีสำเร็จ

**Schema/APIที่ตรวจจริง:** versionmarkersv1/statusv2ครบ PostgRESTพบRPC(anonymous401) privatejob/resulttablesไม่expose404 ทั้ง12privateRLS/noCRUD Rootpurevalidation14candidate/3coveragefixtureบนPostgres17.11ใช้0.289493s/99404bytes ไม่persistresultและไม่ผ่านworkerจริง ได้unreviewed/accuracyfalseตามcontract Authenticatedtimeout8s/anon3s AdvisorINFOprivateRLSnoPolicyintentional+privateguard,unindexedFK10/unused2และpasswordprotectionWARNเดิมไม่เปลี่ยนแพ็กเกจหรือเปิดfeatureเพิ่ม

**Localreal-backendserver:** scripts/preview-live-ai.mjsrequiresXEDO_LIVE_QA_AUTHORIZED=1/bind127.0.0.1:5193/fixedHost Origin/noforwardedhost ใช้handleInspectorจริงด้วยfixedXEDOURL/publicpublishablekeyไม่มีfetchmock ใช้GEE/environmenthandlersเดิม ไม่applySQL/สร้างusersจากserver ใช้port5193แทน5194ที่EACCESและหยุดfixtureเดิมก่อนเพราะdevcookiehostscopedไม่แยกport ไม่เปิดpublicport/tunnelหรือdeployserverนี้

**Protectedaccountsetup:** /qa/setupมีprimary/secondary/machineให้ผู้ใช้กรอกรหัสเอง POST/qa/connect8KB/Origin/roleallowlist/singlehelper ใช้scripts/local-ai-account-connect.pyofficialGoTruepasswordgrant+getuserverifyก่อนSessionStoreDPAPI Rolefilesเฉพาะignoredlocal-data/live-ai-qualification;passwordไม่อยู่argv/env/disk/stdout/log/Markdown Secretaccess/refreshอยู่encryptedfileเท่านั้น Metadataaccount.jsonมีUID/email/expiryสำหรับrootตรวจAuthจริงและbindsecondaryroster/machineregistry ไม่มีadmin/serviceRole/automaticprivilegegrant Primaryuserกรอกครั้งเดียวแล้วserverBFFsignInคืนHttpOnlycookieให้browserด้วย หน้าsetupclearpassword/loadingและqueue3ฟอร์มเพื่อกันCONNECT_BUSYจากการกดพร้อมกัน

**Authinputค้าง:** เลือกInspectorเดิม+InspectorTestและmachineใหม่ ทีมสร้างผ่านSupabaseAdduser+AutoConfirm;testidentifierexample.invalidใช้ได้ไม่ต้องinboxสำหรับpasswordgrant ผู้ใช้แจ้งครบแต่ตรวจruntimeLOGIN_FAILED/CONNECT_BUSY ไม่มีaccount/sessionfiles และauth.usersยังมีเพียงเดิมconfirmed/notbanned จึงยังไม่สร้างregistry/bindสิทธิ์หรือทำfakeclaims รอผู้ใช้สร้าง2accountsในxedoและconnect3rolesจริง ไม่ขอ/เปลี่ยนpassword

**Freshqualification:** Node606/Python45pass;Pythonเพิ่มpartial50%/allNoData/noSAR/gridmismatch/complexity6และhelper9มีactualWindowsDPAPIด้วยfakeAuthtokens เป็นsoftwarefixturesไม่ใช่realAuth CPUจริงdirectCLI197.5274กม²ผ่าน34.979632s/runner4.097603s/peak725.34MiB/0candidate/valid1918260 ไม่อ้างhostedqueue/100jobsSLA GEEจริง1900-01-01ได้NO_SAR_SCENEและไม่มีmodelrun No frontendproductionchanges/buildใหม่ Evidenceoutputs/XEDO_Local_AI_Phase6_2026-10-30;รับrealAuthแล้วต้องทดสอบBFF/realPostgREST/multiconnection/publish/owner/privatehistory/InspectorUIต่อก่อนcomplete


**บันทึกเพิ่มเติมหลังรับบัญชีจริง:** **อัปเดตบัญชีขั้น6:** ทีมสร้างInspectorTestTEST_INSPECTOR_LOCALและmachineCPU_WORKER_LOCALในxedoแล้ว ทั้งสองconfirmed/มีpassword/identityครบ RootเปิดInspectorTestและผูกmachineกับInspectorเดิมPRIMARY_INSPECTOR_LOCAL ตรวจenabledInspectors2/registeredWorkers1/machineInInspectorRoster0 RealAuthGetUserและRPC7checksผ่าน: secondaryInspectorใช้งานได้/machinepresenceownerถูก/สองroleใช้สิทธิ์สลับกันไม่ได้ ตอนนี้มีDPAPIsessionสองroleแล้ว เหลือprimary ผู้ใช้แจ้งลืมรหัสและเลือกลองรหัสที่Chromeบันทึกก่อน ไม่ได้ส่งrecoveryemail/เปลี่ยนรหัส/ลบสร้างuserใหม่ RootเปิดเฉพาะSupabaseUserDetailsพบปุ่มSendpasswordrecovery(ส่งemailเท่านั้น) ไม่อ่านPasswordManager/clipboard รอprimaryconnectสำเร็จ หลักฐานpartial-real-auth.json/qa-gates.json(root12checks)/account-binding.jsonอยู่outputs/XEDO_Local_AI_Phase6_2026-10-30 ส่วนrootสร้างscripts/qualify-real-ai.pyไว้พร้อม --run-real guard/Missingprimary→pending/network0 ไม่ได้รันสามjobจนกว่าจะมีprimaryจริง BrowserlistTabsChromeถูกauto-reviewปฏิเสธเพื่อปกป้องแท็บอื่น จึงเปิดเฉพาะSupabaseURLตรงได้สำเร็จ ไม่ข้ามข้อจำกัดหรือขอสิทธิ์อ่านแท็บอื่น ไม่มีBilling/subscription/push/deploy ขั้น6ยังinprogress


**ส่งต่อสถานะรอบนี้ — primaryช่องเดียว:** ทีมสร้างและเชื่อมInspectorTest/CPUสำเร็จแล้ว ไม่ต้องสร้างหรือเชื่อมสองบัญชีนี้ซ้ำ Rootเปิดสิทธิ์InspectorTest/ผูกmachineกับownerเดิมและตรวจrealAuth7casesผ่าน เหลือรหัสบัญชีเดิม ผู้ใช้เลือกดูChromeSavedPasswordก่อน ไม่ได้ส่งrecoveryemail/เปลี่ยนรหัส Rootคงlocalrealbackendserver127.0.0.1:5193/qa/setupและแท็บhandoffไว้ รอคำตอบว่าช่องprimaryขึ้นเชื่อมแล้วหรือไม่พบรหัส เมื่อprimaryDPAPIพร้อมให้รันscripts/qualify-real-ai.py --run-realแล้วทำbrowserInspectorreview/plannerต่อก่อนmarkขั้น6complete Source/receipts/metricsอยู่outputs/XEDO_Local_AI_Phase6_2026-10-30/REPORT.md ไม่มีcommit/push/deployเว็บไซต์หรือBilling/subscription


### 3.47 ปิดการทดสอบขั้น6กับ Supabaseจริงและ CPU ในเครื่อง — 30 ตุลาคม 2026

**ขอบเขตและบัญชี:** ผู้ใช้แจ้ง primary เชื่อมแล้วแต่รอบแรก root ตรวจทั้งไฟล์ metadata และ /qa/accounts พบเพียง secondary/machine จึงเปิดหน้า setup ใหม่และขอเฉพาะช่องแรก ผู้ใช้เชื่อมอีกครั้งสำเร็จจริงเวลา09:54:47UTC UIDเดิมPRIMARY_INSPECTOR_LOCAL ครบ3DPAPIrolesและบัญชีแยกกัน ไม่มีรหัสผ่าน/tokenในบันทึกหรือGit ไม่อ่านPasswordManager/clipboard ไม่ส่งrecoveryemail/เปลี่ยนpassword/ลบสร้างuserใหม่

**คิวและผลจริง:** scripts/qualify-real-ai.py --run-real ใช้ real BFF/PostgREST/GoTrue sessions และ Worker.process จริง ผ่าน3casesในรายงาน qualification-20261030T095749Z_3c412eae.json ทุกงานส่ง create ซ้ำ3connections→jobเดียว, claim3connections→claimเดียว, publishซ้ำ3connections→receiptเดียว ตรวจ owner A/B ทั้ง BFF/directRPC และ private draft/reopen/history ไม่สร้าง image/confirmation สมมติ เป็น same-session/multi-connection concurrency ไม่อ้าง different-machine-session global-race

| กรณีสดผ่าน hosted queue | เวลารวม Worker.process | pipeline / inference | native peak RAM | ผล |
| --- | ---: | ---: | ---: | --- |
| ภาพอ้างอิง9ต.ค. grid176.478กม² | 37.031s | 33.571 / 2.188s | 723.973MiB | 14candidate /15,248pixels; valid60.168%,footprint61.697%; candidate/valid/NoData roundtripต่าง0 |
| พื้นที่ใหม่ใกล้limit grid197.5274กม² | 39.813s | 36.608 /3.132s | 710.082MiB | 0candidate; valid1,918,260pixels; แยกNoDataตามจริง |
| noSAR start=end1900-01-01 | 6.813s | 5.819s /ไม่รันโมเดล | 90.469MiB | failed/input_invalid และไม่มีresult |

**การแก้ตัวทดสอบ:** รอบแรกเลือกช่วง1–10ต.ค.จึงได้ภาพ8ต.ค.ที่coverageครบกว่าและ17candidate เป็นงานที่ succeeded จริง แต่ qualification assertion14ผิดบริบท ไม่ใช่โมเดลเสีย Rootจำกัดวัน9ต.ค.และตรวจexactassetIdก่อนassert14 โดยเก็บรายงาน failed เดิมไว้ ไม่แก้เกณฑ์เป็น17หรือใช้ผลเก่าแทน inference ใหม่ ผล score/maskจากคิวจริงเทียบ original baseline ทุกpixelต่าง0และTIFFSHA256ตรงทั้ง2ไฟล์ ดู real-baseline-pixel-comparison.json

**ทดสอบ protocol จริงเพิ่ม:** scripts/qualify-real-ai-post.py ผ่าน foreignanalysisRef save422/foreigncancel404, cancel-vs-publishคนละsession(รอบนี้cancelชนะ ไม่มีresultใหม่), naturalquiet183s→Offline/newcreate503WORKER_OFFLINE/ไม่เพิ่มjob/ผลเก่าและhistoryยังเปิดได้, naturallease120s→reclaimfenceใหม่/oldheartbeat-progress-publish409LEASE_LOST แล้วcancelงานQAด้วยbindingปัจจุบัน เป็น2logicaljobsและ replayผลจริงเดิมเพื่อทดสอบprotocolเท่านั้น ไม่มีGEE/inferenceใหม่ ไม่revokeบัญชีหรือปรับtimestampSQL ดู post-run-20261030T100321Z_eb106ca8.json

**พบและแก้ปัญหาจริง:** Browser confirmพื้นที่ editedcandidate80จุดล้มเหลว503; Postgreslog10:04:59UTCยืนยันSQLSTATE57014ที่ risk_on_segment→risk_point_ring→risk_geometry_covers เพราะเกิน authenticatedtimeout8s Rootเพิ่ม db/inspector-risk-performance.sql cacheedgefloats/inlinecrossเดิม และข้ามholebboxที่disjointอย่างเคร่งครัดพร้อมตรวจtargetcentroidก่อนholecentroid คงintersections/holes/epsilon1e-13กับ1e-11/no-round/no-simplify ไม่มีPostGIS/เพิ่มtimeout/ขยายสิทธิ์ Draftแรกมีชื่อตัวแปรbyชนคำสงวน ตรวจในPGliteแล้วแก้next_x/next_yก่อนapplyจริง Migration xedo_risk_geometry_performanceสำเร็จหลังbackup+exactpredecessorMD5guardในtransaction อัลกอริทึมผ่าน959point comparisons/18coverage cases/8invalid SQLSTATEequivalence NativeEXPLAINของ80point candidate/validcoverageจริงใช้1.371837s และactualbrowserconfirmสำเร็จ ไม่รับรองworst-case8192verticesทุกกรณี

**Browserจริง:** ใช้session primaryที่เชื่อมไว้แล้วผ่านlocal-only /qa/session→POST/qa/browser-session FixedHost/Origin/JSON{}; PythonDPAPIhelperตรวจGetUser+InspectorRPCและNodeตรวจBFFsessionซ้ำ ก่อนส่งHttpOnlycookie ไม่มีpasswordgrantใหม่/tokenในpageJS ภาพอ้างอิง14candidate→เลือกcandidate00002(80จุด)→ย้าย→edited_candidate→Sentinel-2วันที่22ต.ค.cloud14.1%+pixelvalidation→confirmv1/complete→planner5.92km→Savev2→Historyv1/v2→openv2จริง ผลrawcandidategeometryยังตรงproducer

จากนั้นเริ่มQAmissionใหม่ผ่านUI นำเข้าพื้นที่ระยองใหม่4.83กม²(grid5.0172กม²) กดAnalyzeจริง ได้job86b1b8c6-98c4-442e-ae40-a654fcfc536a/resultXEDO_LOCAL_RESULT_a45765ce2cf2410bb6967866b7982eba อัปเดตprogressและเปิดผลอัตโนมัติ CPUpipeline17.853s/inference0.446s/peak510.398MiB/SAR26ต.ค./0candidate ข้อความไม่อ้างว่าไม่มีน้ำมัน Inspectorวาดmanual4จุด/UndoRedo/ตรวจSentinel-2/confirmcomplete→planner1.75km→Saveและยืนยันซ้ำเก็บhistoryถึงv4 ตรวจAPIของสองQAmissionพร้อมforeignowner404รวม10cases (อ่าน6ครั้ง/พยายามแก้4ครั้งผ่านBFFและdirectRPC โดยhash/revisionเจ้าของไม่เปลี่ยน)และrawgeometryตรงproducer ดู browser-acceptance.json/screenshots ไม่ปลดล็อกดาวน์โหลดถ้าHome/flight/airspaceยังไม่ครบตามscopeเดิม

**Verificationรอบสุดท้าย:** Node611pass/0fail/0skip; Python57pass; accountportal12และsessionbridge11HTTPguardchecks; buildweb/workspace/standaloneผ่านทั้ง3 ไม่มีfrontendproductsourceใหม่ในรอบนี้ แก้QAhelpers/tests/SQLและdocs FinalDB12privateRLS/noClientCRUD/helpersInvoker+emptysearchpath+noanon/authenticatedexecute/machineไม่อยู่Inspectorroster PreparedcatalogSHA256ยัง24476c493413b461b6f43a92e7bfa057f79d46376fee32f90b869b10be560f1c งาน7logical: succeeded4(includesรอบ17candidateที่qualificationผิด),expectedfailed1/noSAR,cancelled2 ไม่มีqueued/running DB12367539bytesเป็นphysicalobservation ไม่ใช่Dashboardquotausage

**ไฟล์เปลี่ยนรอบนี้:** db/inspector-risk-performance.sql; scripts/qualify-real-ai.py(วันที่+sourceassert); scripts/qualify-real-ai-post.py; scripts/local-ai-browser-session.py; scripts/preview-live-ai.mjs(localbridge); tests/inspector-risk-performance.test.mjs; tests/inspector-ai-database.test.mjs; tests/inspector-local-jobs.test.mjs; workers/local-ai/tests/test_browser_session.py; workers/local-ai/README.md; canonicalสองMD/queue/LOCAL_CPU_AI_INTEGRATION_PLAN.md หลักฐานและhelperชั่วคราวอยู่outputsและignoredoutput/local-data ไม่เพิ่มsecretเข้าGit ไม่overwriteงานdirtyจากขั้นก่อน

**สถานะเผยแพร่/งานถัดไป:** ขั้น6pilot real-backend qualificationจบแล้ว ขั้น7website releaseยังไม่อนุญาต ไม่มีcommit/push/deploy/Billing/subscription/paidresource Workerทดสอบหยุดแล้วหลังjobสำเร็จ ผลcatalog/confirmation/historyอ่านได้จากSupabaseโดยไม่ต้องเปิดCPU Serverlocal5193คงไว้เพื่อให้ตรวจผลงาน ไม่มีคำถามรอคำตอบ งานqualificationsแยกที่ยังไม่รัน: 100jobs/monthlongsoak,คนละmachine-sessionglobalclaimrace,รอharddeadline30นาทีจริง,worst-casegeometry8192vertsและphysicaltouch/trackpad/heap/listener เดิม Pi/รายงานก่อน–หลังยังพักไว้ตามคำสั่ง


### 3.48 ขั้น7 release boundary — 30 ตุลาคม2026

**ขั้น7กำลังเผยแพร่ — 30 ตุลาคม2026:** ผู้ใช้อนุญาต commit/push/deploy เว็บจริงและตรวจหลังเผยแพร่แล้ว โดยไม่เปิด Billing/subscription Targetเดิม xedo/prj_x35WcipWxA767cYwv3f0CXcdyea3/team_CV1O0uIz6BcarAQAOb8soV0I → xedo-eight.vercel.app Rootใช้GitintegrationเดิมหลังตรวจCIและdeployment identity; Supabase schema/registry/สามบัญชีติดตั้งและผ่านขั้น6แล้ว ไม่สร้างบัญชีหรือapplySQLซ้ำ AIยังรันบนCPUในเครื่อง ไม่รันPython/GPUบนVercel

Vercelใช้npmci→npmrunbuild→dist/index.htmlและNodeAPIเดิม api/inspector.mjs เพิ่มanalysis-worker/analysis-jobs ผ่านrewriteเดิม /api/v1/inspector/:path* ไม่มีCPUworker/model/TIFF/DPAPI/QAserverในruntime ไม่เพิ่มsubscription/cloudcompute/Storage บัญชีfullaccessroleเดียวInspectorยังowner-scoped เครื่องCPUใช้machineidentityเดิมดึงSupabaseoutboundHTTPS ผลสำเร็จอ่านย้อนหลังจากDBได้ตอนเครื่องปิด การตรวจreleaseต้องแยกCI/source/artifact/protectedprivateAPI/browser/CPU resultรับจริงและบันทึกdeploymentid/commit/hashใหม่หลังREADY


**Pre-pushตรวจแล้ว:** Node611pass/0fail/0skip, Python69passหลังเพิ่มidentityconfigและproductionacceptanceofflinecontracts6cases, syntaxและbuildweb/workspace/standaloneผ่านทั้ง3 HTML6207848bytes/SHA2566db264f4e06c5c98b718a652a0b7c70fbe97e6b2363dc0a1152cc9a664188efc ไม่รันโมเดล/realjobซ้ำในpreflightนี้ ใช้ผลขั้น6เป็นbaselineแยกจากpostdeployที่จะรันใหม่ .vercelignoreเพิ่มworkers/tests/db/docs/localQAtools; .gitignoreเพิ่มDPAPI/TIFF/model ผู้ใช้ยังไม่ต้องตอบอะไรเพิ่ม บัญชีproductionเดิมเปิดได้ RootจะpushfeatureตรวจCIก่อนfast-forwardmainให้Gitintegrationเดิมdeploy ห้ามforcepush/เปลี่ยนแพ็กเกจ

**ค่าบัญชีเฉพาะเครื่อง:** QAhelpersอ่านignoredlocal-data/live-ai-qualification/account-identities.jsonเพียงprimaryUserId/primaryEmail (ไม่เกิน4KB/validateUUIDและemail/missingfailclosed) ตัวอย่างทดสอบใช้fixtureบัญชีสมมติ ExactAuthUUIDในpublicdocsใช้aliasPRIMARY_INSPECTOR_LOCAL/TEST_INSPECTOR_LOCAL/CPU_WORKER_LOCAL รายละเอียดจริงอยู่privateignoredreceipts ไม่ใช่JWT/ไม่ใช้aliasเรียกAPI Productionไม่มีQAbridgeและไม่ติดตั้งPython/โมเดลเพิ่ม
