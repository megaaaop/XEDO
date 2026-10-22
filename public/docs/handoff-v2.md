# XEDO v0.5 · Software plan v2 handoff

## Workflow

ภาพจริง Sentinel-2 → จุดสังเกต/เหตุการณ์ → คำขอสำรวจพร้อม snapshot → เลือก profile + ฐาน → สร้างแผน → ตรวจ/จำลอง/ส่งออก → รับภาพ/สถานะ/processing result → CSV preview/commit → รายงานเหตุเดิม

งานที่ทำกับข้อมูลจริง: catalogue/COG/cached Sentinel-2, incident/revisions/evidence, persistence/export. งานที่ตรวจด้วย fixture: planner geometry, simulator 3 scenarios, Pi ingest/capture/result contract, spool/retry, lab CSV และ restore ข้ามโมดูล. รอฮาร์ดแวร์จริง: Pi/กล้อง/driver และค่าความเร็ว/swath/endurance ที่สอบเทียบ. ไม่มีการบิน/ปล่อยวัสดุจริงจากเว็บ

## การตัดสินใจจากแผน

1. ใช้ HTML/CSS/JS + OpenLayers เดิม ไม่ย้ายหน้าใหม่ไป React เพื่อคง source ที่แก้ต่อได้
2. คง Worker API + D1/R2 บน Site และ Node 24 + SQLite/file storage ในเครื่อง แทนเริ่ม FastAPI อีกชุดตอนนี้ เนื่องจาก Site เดิมรองรับ runtime นี้อยู่แล้ว และตรวจ persistence แล้ว Python ใช้กับ Pi agent. Logic planner/lab/simulator ไม่ import DOM; contracts ใช้ต่อเมื่อย้ายไป FastAPI ภายหลังได้
3. Route planner ใช้ proj4 → local UTM เมตร ไม่คิดระยะทางจาก degree โดยตรง; area เก็บวิธี spherical WGS84 เดิม เป็นค่าประมาณ ไม่ใช่งานรังวัด
4. เลือกขอบเขต H04 พื้นฐาน (§8.0): convex, ไม่มี hole, หนึ่งเป้าหมาย, ไม่มีการแบ่งเที่ยวหรือหลบสิ่งกีดขวาง. ข้อกำหนด concave/hole/optimization ใน §8.1–8.4 เป็นต่อยอด. no-go ถูกตรวจทั้ง working/transit/home/return; ชนแล้ว blocked ไม่มี route ส่งออก
5. ใช้ HTTP polling + SQLite spool ไม่มี WebSocket/MQTT/autopilot. Receive-only Pi endpoint ต้องมี server credential เฉพาะอุปกรณ์; credential ยังไม่ถูกตั้งบน Site และไม่ได้ส่งไป browser
6. Lab รุ่นแรกเก็บ raw measurements/null/qualifier/LOD/unit/matrix พร้อม CSV checksum/revision. ไม่มีสถิติขั้นสูงหรือการสรุปเหตุทางเคมี
7. รายงาน source_mode/origin/verification_state/value_kind เป็นคนละแกน. Existing incident/observation status keys คงชื่อเดิมเพื่ออ่านข้อมูล v0.4 ได้: suspicious≈suspected, pending≈awaiting_evidence, confirmed≈supported, proposed≈submitted. การยืนยันไม่เปลี่ยน annotation เป็น measured oil

## Planner / Simulator

- ความเร็ว m/s, ความสูง m + reference, swath m, endurance s, reserve 0–0.5. Unknown ใช้ null. ตัวอย่าง profile มีป้าย simulated ชัด ไม่ใช่ specification ของโดรน
- แผน immutable: id/version/observation revision/profile snapshot/source metadata เก็บครบ. การตรวจแผนเปลี่ยน workflowState โดยมี actor/reason/revision guard. แก้ observation แล้ว needsReview และปิดการจำลอง/ตรวจจนสร้างคำขอ/แผนใหม่
- Waypoints เป็นรูปแบบกลาง XEDO purpose survey/transit/return; dispenser off ทุก segment. JSON/GeoJSON/CSV export ไม่ส่งขึ้น aircraft. Import JSON กลับต้องมี source survey/profile รุ่นเดียวกัน; route ตรวจด้วย planner รุ่นเดิม
- distance = UTM segment sum รวมฐานไป/กลับ, duration = distance/speed + turn per row + takeoff/landing. ไม่มีส่วน input ครบ duration=null; เวลาเกิน reserve budget blocked ไม่มีแบ่งเที่ยวอัตโนมัติ
- coverage/mass/battery unknown/null ไม่ปั้นตัวเลขจาก polygon. ไม่คำนวณ dose หรือ union footprint ในรุ่นนี้
- Simulator bounded ≈300 frames, deterministic seed/input/start time/version. 3 scenarios success/completed, signal_loss/failed, dispenser_fault/failed. เมื่อ failed มี partial progress และเหตุผล
- JSON log เก็บใน R2 พร้อม checksum แยก metadata run ใน DB. Replay อ่าน log เดิม หรือ import log ที่ตรง contract; timestamp ต้นทางคงเดิม. Replay ไม่เขียน latest Pi
- ไม่มีการจำลองพลศาสตร์การบิน วัสดุ กระแสน้ำ หรือ autopilot SITL

## Lab CSV / report

Template: sample_id, incident_id, mission_id, batch_id, treatment_group, collected_at, metric, value, unit, matrix, method, source_file, replicate, qualifier, detection_limit

- Preview ก่อน commit ตรวจ UTC/อ้าง entity/unit-matrix/duplicate sample+metric+replicate แยก mode. ช่วงนี้ไม่แปลงหน่วยอัตโนมัติ
- unit water: mg/L/%; sediment: mg/kg,g/kg,% ; material: kg,g,% ; other: m²,kg,g,%. % อยู่ 0–100. ND/unknown value=null, `<` มี detection_limit
- CSV 1–500 แถว ≤220 KB. ไฟล์ต้นทางจริงคง checksum/asset. ผลแก้มี lab_revision/reason และ optimistic conflict
- Chart เป็นจุด raw values แยก metric/unit/matrix/mode ไม่เติม trend เมื่อไม่มีประวัติ. ND/unknown ไม่ถูกใช้เป็น 0
- Report ใช้ incident + optional mission filter เดียวกับ export JSON และหน้าพิมพ์ แสดง acquisition/capture/processing/collection/export time แยก. Simulation estimates ไม่เรียก flight measured; ไม่คำนวณ biodegradation efficiency

## API / contracts

`contracts/*.schema.json` และ `contracts/openapi.json` (สำเนา public/contracts) ระบุ route inventory และรูปแบบข้อมูล. Runtime validation/cross references อยู่ `planning.js`, `operations.js`, `lab.js`. OpenAPI inventory ไม่ใช่ code-generated full request documentation. Legacy `/api/*` ยังทำงานเพื่อความเข้ากันได้; เริ่ม client ใหม่ใช้ `/api/v1/*`

Errors: code/message/details/retryable/request_id + HTTP. Legacy validation บางจุดยัง 400; v2 validation 422, conflict 409, unavailable 503. Catalogue empty เป็นผลสำเร็จคนละกรณีกับ outage

Device endpoint/restrictions ดู [คู่มือ Pi agent](/docs/pi-agent.md). ทุก route ยังอยู่ใต้ owner-private audience เดิมของ Sites ไม่ได้เพิ่มผู้ใช้งานหรือเผยแพร่เป็น public

## Persistence / backup

- Migration `0001` เพิ่ม telemetry table และ unique(device,mode,boot,sequence), device/mode/received time index โดยไม่แก้ `0000` ที่ deploy แล้ว
- D1 records แยกทุก entity; R2 เก็บ capture image/lab CSV/run log ตาม ID/checksum. Local เปิดด้วย Node SQLite WAL
- สำรอง UI รวม records/scenes/files/telemetry/latest/job metadata. Pixel/provider catalogue cache สร้างใหม่ได้; ไม่เก็บ credential
- จำกัด 500 records, 5,000 telemetry events, files 24 MiB, backup total 34 MiB. มากกว่านี้ endpoint fail พร้อมเหตุผล ต้องใช้ผู้ดูแลสำรอง DB/R2 แยก ไม่ใช่ silently drop
- Guard ตรวจ revision/count ระหว่าง snapshot และปฏิเสธเมื่อมีข้อมูลเปลี่ยน จึงหยุด Pi ingest ก่อน backup. Restore ตรวจchecksum/IDs/อ้างไฟล์ และเฉพาะ workspace ที่ไม่มี incident/plan/telemetry; ป้องกันทับของเดิม. ไม่ใช่ distributed transactional snapshot แบบหลายทีม
- Restore ขนาดใหญ่/ไฟดับระหว่างขั้น R2+DB ยังเป็นข้อจำกัด ต้องเก็บไฟล์ต้นฉบับและตรวจ count/checksum หลังคืน. ระบบที่ต้องรับ live ต่อเนื่องควรเพิ่ม admin snapshot/restore transaction protocol ก่อนใช้จริง

## ตรวจรับและสิ่งที่ยังรอ

Node tests ครอบคลุม ≥14 geometry/budget cases, deterministic simulator, no-go, unsupported, source revision stale, capture/processing validation, duplicate/out-of-order/reboot events, CSV unit/duplicate errors, report filter, restart, restore และ binary log/checksum. Python unittest ตรวจ spool offline→reopen→retry/overflow/null. UI ตรวจเลือกคำขอ→สร้างแผน→fault→replay/live unknown, CSV และการอ่านบนจอแคบด้วยข้อมูลใน output/ เท่านั้น

ยังไม่ทดสอบ hardware/genuine lab experiment/SUS กับผู้ใช้ 3–5 คน. ไม่มี satellite/Pi AI model, SAR/cloud mask, terrain/wind/complex planner, multi-sortie, material calibration/dose, flight controller, web dispenser control หรือหลายทีม. Platform service access สำหรับ Pi ต้องให้เจ้าของตั้งค่าตามสิทธิเดิมก่อนใช้จริง

ไม่อ้างว่าใช้เวลา 100 ชั่วโมงครบหรือผ่าน hardware milestone. นี่คือ implementation ที่ต่อได้ตามขอบเขต software core ของแผน; timebox H01–H09 และ integration gate ยังใช้จัดงานของทีม

## แก้ต่อ

หน้า/ข้อความ `public/index.html`; style/tokens `src/styles.css`, `src/operations.css`; UI `client.js`, `operations-client.js`; API `worker.js`, `operations.js`; planner/simulator `planning.js`; CSV `lab.js`; Python `pi-agent/agent.py`; schema/migration `db/`, `drizzle/`. `README.md` ระบุวิธีรันและคำสั่งตรวจ

`fixtures/v2/manifest.json` ระบุ input ที่เป็นจริง/จำลองพร้อม ID เชื่อมกัน. `scripts/seed-v2-qa.mjs` ปฏิเสธ directory นอก output/ จึงไม่ seed เว็บจริง. ตัวอย่าง/DB ของ QA ไม่ถูก package
