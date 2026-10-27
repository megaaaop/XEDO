# XEDO — รายละเอียดเว็บไซต์และแนวทางแก้ไข

## 1. หัวข้อ

- วันที่เริ่ม/อัปเดต: 27 ตุลาคม 2026, Asia/Bangkok
- Active checkout: `C:\mega\codex\iENA\github-publish\XEDO-hardware-release`
- เอกสารนี้อธิบายโครงสร้างและพฤติกรรมของเว็บ ใช้คู่กับ `XEDO_WORK_LOG.md` ซึ่งเก็บประวัติการแก้ ผลตรวจ และสถานะเผยแพร่
- ตามคำสั่งล่าสุด ให้บันทึกทั้งสองไฟล์ทุกครั้งที่ทำงานลักษณะนี้ และปรับ `implementation-queue.json` เมื่อข้อกำหนดหรือสถานะเปลี่ยน

## 2. สรุป

ผู้ใช้สั่งลงมือแก้และ push/deploy เว็บหลักโดยตรงในรอบนี้ ขอบเขตคือ 1) GEE status/progress/error 2) ตรวจการจัดระเบียบโค้ดส่วนที่เกี่ยวข้อง 3) แสดงภาพบริบทรอบพื้นที่ประมาณ 1 กม. 4) แก้ scroll lag คงสามขั้นตอนและตัวคำนวณสี่ส่วน งานบัญชี/AI/Pi/รายงานและงานโปรไฟล์/schedule ที่อยู่ในคิวอื่นไม่ถูกเริ่มทั้งหมดเพียงเพราะอนุญาต release รอบนี้

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

เขียนแผนในข้อ 3.2 ก่อน implementation แล้ว ชุดแก้ผ่าน syntax, automated tests **458/458** และ build ทั้งสามรูปแบบ API ในเครื่องที่ใช้ GEE จริงคืนข้อมูลครบสี่ส่วนในพื้นที่อ้างอิงและคืนภาพ tile นอก AOI แต่อยู่ในกรอบ context ได้ กำลังเผยแพร่ตามคำสั่งผู้ใช้

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
- หลักฐานทั้งหมดอยู่ `output/release-check/gee-status-context-scroll-2026-10-27/` (ignored) สถานะ Production จะบันทึกใน work log หลังเผยแพร่จริง
