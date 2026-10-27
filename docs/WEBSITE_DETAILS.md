# XEDO — รายละเอียดเว็บไซต์และแนวทางแก้ไข

## 1. หัวข้อ

- วันที่เริ่ม: 27 ตุลาคม 2026; อัปเดต: 28 ตุลาคม 2026, Asia/Bangkok
- Active checkout: `C:\mega\codex\iENA\github-publish\XEDO-hardware-release`
- เอกสารนี้อธิบายโครงสร้างและพฤติกรรมของเว็บ ใช้คู่กับ `XEDO_WORK_LOG.md` ซึ่งเก็บประวัติการแก้ ผลตรวจ และสถานะเผยแพร่
- ตามคำสั่งล่าสุด ให้บันทึกทั้งสองไฟล์ทุกครั้งที่ทำงานลักษณะนี้ และปรับ `implementation-queue.json` เมื่อข้อกำหนดหรือสถานะเปลี่ยน

## 2. สรุป

สถานะเผยแพร่เว็บล่าสุดยังเป็น 3D พื้น Diagram/Satellite รวม GEE diagnostics/context1กม./scroll แผนหลักคง UX/บัญชีส่วนตัว/prepared AI พร้อม risk editing และคง3ขั้น/4calculators ผู้ใช้ตัด normal-flow/profile/schedule ใหม่ออก; Pi/รายงาน/AIภาพใหม่พักไว้ ล่าสุด28ต.ค.ผู้ใช้อนุมัติInspectorSQLแล้ว ใช้migration20261027184951กับSupabasexedoผ่านmegaphijakสำเร็จ ตรวจจริงตาราง/RLS/grants/functionbody/negative-role-session15checksผ่าน Authusers/missionrows0 บัญชีให้ทีมสร้างภายหลัง โค้ดAuth/Save/historyยังlocalและยังไม่deploy ผล500tests/3builds/browserจำลองเป็น27ต.ค.ไม่รันซ้ำ ดูสถานะจริงข้อ3.21/INSPECTOR_DATABASE_VERIFICATION_2026-10-28.md ส่วน3.19–3.20เป็นสถานะรอบก่อนอนุมัติ

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

**สรุป:** ผ่านfresh500tests/syntax/3buildsและreadonlyrelease-review กำลังส่งGit→VercelและตรวจactualproductionUI/API ไม่applyDBซ้ำ ไม่เปลี่ยนAuthsettings ยังไม่มีreal-account acceptance

**รายละเอียด:** ปุ่มInspectoraccount→email/passwordform→sameoriginBFF→SupabaseAuth+liveRPCที่มีอยู่แล้ว Anonymoussessionต้องuser:null/private401และmutationต่างorigin403 ข้อมูลที่ไม่มีบัญชีต้องgeneric401ไม่HTML/500 ตรวจpackagedAJV/schemaบนruntimeจริง ตรวจmask/requiredfields/close/keyboard/mobile390px คง3steps/4calculators SuccessfulLogin/Save/history/cross-accountprivacyต้องรอทีมสร้างAuthusers+roster ไม่อ้างsimulationเป็นproductionacceptance

**ไฟล์/หลักฐาน:** savecontractdescriptionอัปเดตว่าmigrationใช้แล้ว validation/SQLไม่เปลี่ยน API/session/restoreดู3.19 DBสิทธิ์จริงดู3.21 หลักฐานreleaseเก็บoutput/release-check/inspector-account-release-2026-10-28/ จะเติมproductionresultsและexactreleaseidentityหลังตรวจจริง UX/AIriskeditorยังอยู่อีกงาน ไม่รวมreleaseนี้

**Runtime routing repair:** releaseแรกfunctionตรงตอบ200แต่publicrewrite404 แก้api/inspector.mjs selectedRouteให้รับVercelpathcaptureเป็นสำเนาตรงกันของendpointที่เลือก ไม่ให้overridepathname/route Rejectqueryซ้ำและค่าขัดกัน/unknownkeysทั้งหมด Unitregressionใหม่ทำให้501testsผ่าน ต้องยืนยันpublicrouteบนdeploymentใหม่ ไม่ใช้directrouteผ่านแทนactualUI/API
