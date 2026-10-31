# รายงานแก้ readiness และไฟล์ .plan ของพื้นที่เดิม

## 1. หัวข้อ

- วันที่: 31 ตุลาคม 2026, Asia/Bangkok
- คำสั่ง: แก้ตามแผน ทดสอบพื้นที่เดิมจนดาวน์โหลดจริง บันทึกสอง MD และ push/deploy เมื่อผ่าน ห้ามเปิด Billing/subscription
- แผนต้นทาง: [PLAN_EXPORT_READINESS_REPAIR_PLAN_2026-10-31.md](PLAN_EXPORT_READINESS_REPAIR_PLAN_2026-10-31.md)
- สถานะขณะเตรียม release: **verified locally; publication in progress** ผล Production จะบันทึกต่อท้ายเมื่อรันจริง
- หลักฐานส่วนตัว/ไฟล์ที่ดาวน์โหลด: `C:/mega/codex/iENA/outputs/XEDO_Plan_Export_Repair_2026-10-31/` ไม่ลง Git

## 2. สรุป

แก้ครบทั้ง aircraft/battery profile, การแบ่งเที่ยว, shared planning readiness, การดาวน์โหลด และวงจรเวลา–พยากรณ์ โดยใช้ Polygon และ Home เดิม ผลที่รันจริงในเครื่องได้ **35 sorties**, พลังงานสูงสุด **132.9476 Wh** ต่อเที่ยว จากงบ **133.2 Wh** หลังกันสำรอง และ window **784.4625 นาที** รวม ground turnaround

ดาวน์โหลดจริงผ่าน Chrome ทั้งเที่ยว 1 และ 35 แล้ว ไฟล์ QGroundControl Plan ใช้ ArduPilot (`firmwareType=3`) มี 12 และ 6 mission items ตามลำดับ เทียบ serialized route/Home ตรงกับ JSON ภารกิจ ครบ 69 survey segments โดยไม่มีช่องว่าง/ตัดทิ้งใน coverage fractions

ผล terrain ยังคง **Review needed** (range **2.578836679 m**, tolerance **2 m**), strict report ยังคงไม่ผ่าน และ no-go ยังคง `null / not_assessed` การพร้อมดาวน์โหลดหมายถึง **planning reference** ที่ใช้ความสูง relative to Home หลัง review แผน ไม่ใช่การเปลี่ยนผลตรวจภูมิประเทศเป็น Ready

Fresh Node suite **682 pass / 0 fail / 0 cancel / 0 skip**, syntax และ build ทั้งสามรูปแบบผ่าน ไม่มี Billing/subscription, schema/account/environment change หรือคำสั่ง hardware เพิ่ม

## 3. รายละเอียด

### 3.1 สาเหตุที่ยืนยันจากภารกิจจริง

1. GEE มี samples ครบ แต่ range 0–2.58 m เกิน comparison tolerance 2 m; Home 1.5 m ตรงกับ GEE อยู่แล้ว การเติม Home/4 export fields อย่างเดียวจึงไม่เปลี่ยนผล terrain
2. Normal flow ไม่มี aircraft/battery 8 ค่า ขณะที่ Estimated demo มี profile จึงคำนวณ Wind/Battery และ sorties ไม่ครบ
3. ข้อที่ซ่อนอยู่รวม no-go ยังไม่ระบุ, ไม่มี battery-assessed sorties และขอบเขตสภาพแวดล้อมยังไม่ตรงกับเวลาจริง ไม่ใช่ปัญหา Internet จากภาพเพียงอย่างเดียว
4. หลังเติม profile การแบ่งแนวบินเต็มเส้นและเดินทางผ่าน vertex แรกทำให้บางเส้น infeasible; การแบ่งเส้นอย่างเดียวได้ 71 เที่ยว จึงยังชนขอบเขต adapter/เวลา ไม่ได้เพิ่มพลังงานเพื่อซ่อนปัญหา
5. การขยายเวลาตาม sorties ทำให้ forecast refresh ชั่วคราวไม่มี wind/battery จากนั้นตัว schedule ลดกลับไป geometry-only duration เกิดการสลับช่วงเวลาซ้ำ

### 3.2 การแก้และไฟล์หลัก

- `src/planning-flight-profile.js`: 8 assumptions เดิม 8/12 m/s, 177.6/44.4 Wh, 600 W, 30/30/5 s มี ownership automatic/manual ราย field; ค่าที่แก้เองรวม blank/zero ไม่ถูกเติมทับ ปุ่มคืน profile แตะเฉพาะ 8 ค่า ไม่แทนพื้นที่/Home/weather
- `src/trial-flight.js`, `src/deployment-plan.js`: เมื่อมี planning profile เปรียบเทียบ heading 0/30/60/90 องศาแบบ bounded หาก base route ไม่ผ่าน/เกิน 40 sorties; ใช้ entry จริงของแต่ละ sortie สำหรับ outside-Home transit และ bisect swath ที่ยาวเกินงบ เก็บ fraction ของทุก original survey segment เพื่อ audit coverage ไม่ตัด waypoint ทิ้ง ขอบเขตไฟล์ 40 sorties/500 waypoints ต่อ sortie/5,000 รวมยังคงใช้
- `src/planning-schedule.js`: บันทึก `durationSource`; เมื่อเคยได้ assessed sorties แล้ว คง window ระหว่างรอ forecast ใหม่ ไม่ลดเป็น route-only estimate Export ยังคงถูกบล็อกถ้า wind/battery ขาดหรือเก่า เมื่อผลใหม่ครบจึงปรับ end โดยรักษา takeoff anchor
- `src/planning-export-readiness.js`, `src/planning-geospatial-gate.js`: planning reference validator แยกจาก strict gate ตรวจหลักฐาน GEE สด/ครบ/ตรงพื้นที่ Home และ routes, datum, known surface conflict, พลังงาน ลม เวลา และ supplied no-go conflicts คง review range เกิน tolerance เป็นข้อมูลตามจริง
- `src/trial-export.js`: strict `checkTrialExport`/`buildQGCPlan` ยังตรวจตามเกณฑ์เดิม ใช้ serializer ร่วมหลัง validated report เท่านั้น Planning builder ไม่เชื่อ client `planningReady`; ผลไฟล์มี purpose/profile/terrain ใน report/snapshot โดยไม่ใส่ field เพิ่มที่ไม่ใช่มาตรฐานใน `.plan`
- `src/trial-api.js`, `src/planning-file-api.js`: เพิ่ม `/planning-export` ทั้ง browser adapter และ workspace `/api/v2/planning-trial/planning-export`; `/export` เดิมยัง strict คำนวณใหม่ทุกครั้ง ไม่เชื่อ report ที่ client ส่งมา
- `src/planning-trial-client.js`, `src/planning-readiness.js`, `public/planning.html`: Plan readiness / Download planning file, explicit planning review แยก airspace review; แสดง range/tolerance จริง, blocker ทุกข้อ, ชื่อ field พร้อมหน่วยและ View all checks; เก็บ loading, double-click/revision/session guards และตรวจ input hash ก่อนปล่อยไฟล์ Selection index ไม่เปลี่ยน hash ของ inputs ทั้งภารกิจ
- `contracts/planning-trial-request.schema.json`, `src/planning-help-content.js`: enum purpose/metadata และคำอธิบายตรงพฤติกรรม; ไม่เพิ่ม Vercel Function หรือบริการใหม่

### 3.3 ผลทดสอบและข้อจำกัดของหลักฐาน

| กลุ่ม | สิ่งที่รันจริง | ผล |
|---|---|---|
| Profile/manual ownership | Unit + production-controller VM, legacy/new snapshot, blank/zero/reset/demo return | ผ่าน |
| Surface gates | Fresh uneven/unknown/partial/expired/mismatched area/Home/route/datum และ known DSM conflict | ผ่าน; strict path ยัง block ตามจริง |
| Wind/energy/route | Missing/excess wind, reserve infeasible, bounded partition, outbound/return, exact coverage fractions | ผ่าน |
| Time | >24h/expired/insufficient validity, anchor/refresh convergence, restore durationSource | ผ่าน |
| No-go | null ไม่ถูกเปลี่ยนเป็น empty; supplied crossing/corridor conflict | ผ่าน |
| Async download | Repeated clicks, account/revision/session/expiry changes, stale hash rejection | ผ่านใน production-controller VM |
| Persistence | Actual SQL ใน PGlite + API validation: Save v3/v4, reopen/history, ownership isolation, manual null/profile/purpose | ผ่าน; ไม่ใช่ real-account browser Save ใหม่ในรอบนี้ |
| Runtimes | Shared browser adapter/workspace endpoint file parity, hosted/workspace/portable builds | ผ่าน; ไม่อ้าง portable native import หรือ native QGC |
| Browser area | Geometry/Home เดิม, covering Sentinel-2 acquisition, real regional forecast/GEE, 35 sorties, .plan 1/35 จริง | ผ่านในเครื่อง; final candidate replay และ Production receipt บันทึกใน evidence |
| UI | 390px no horizontal overflow, 2D/3D retains readiness, idle render/feedback regression | ผ่านขอบเขตนี้; ไม่ใช่ broad device/performance benchmark |
| Full regression | Fresh `npm test -- --test-concurrency=2` | 682/682 |
| Syntax/build | `npm run check`, `build`, `build:workspace`, `build:file` | ผ่าน |

Actual private audit: geometry/Home unchanged; body 17,213 bytes; 69 segments covered; 35 sorties; airborne 439.4625 min + scheduling buffer 5 min + 34 × 10 min turnaround = 784.4625 min; total travel including repeated home transit 117,788.7554 m

### 3.4 การใช้งานหลัง release

1. เปิดภารกิจ/เลือกพื้นที่และ Home ของตนเองตาม flow 3 ขั้นตอน
2. ตรวจภาพและ Prepare drone mission; ค่า profile 8 ช่องถูกเติมเป็น editable assumptions ช่องที่แก้เองยังอยู่
3. รอ conditions/GEE และการคำนวณครบ หากมี blocker ให้เปิด View all checks หรือ Mission settings
4. ตรวจ assumptions, route/return และ terrain findings แล้วเลือก planning review; ไม่ใช้ checkbox นี้แทน airspace clearance
5. เลือก Flight sortie และ Download planning file ไฟล์หนึ่งคือเที่ยวเดียวพร้อมกลับ Home; ภารกิจหลายแบตไม่รวมเป็นการบินเที่ยวเดียว
6. Surface model อาจยัง Review needed ได้เมื่อค่า DSM ที่รู้ครบต่างเกิน comparison tolerance; ถ้าข้อมูลขาด/เก่า/ไม่ตรงหรือเส้นทางต่ำกว่าตัวอย่าง DSM ยัง block

### 3.5 Publication และงานที่แยกไว้

- อนุมัติ normal Git push/automatic Production deployment เมื่อ local acceptance ผ่านแล้ว ตรวจ exact commit CI/deployment/alias, artifact hashes, private endpoint guards และดาวน์โหลดพื้นที่เดิมซ้ำบนเว็บจริงก่อนปิดงาน
- receipt: `C:/mega/codex/iENA/outputs/XEDO_Plan_Export_Repair_2026-10-31/publication.json` จะเก็บ exact source/final SHA, CI, deployment และ runtime evidence หลังดำเนินการ
- ไม่เปิด Billing/subscription ไม่เปลี่ยนบัญชี/สิทธิ์/SQL/env secrets ไม่เรียก cloud inference ที่เสียเงิน CPU worker/AI/private missions คงเดิม
- Native QGroundControl/Mission Planner import, SITL, actual aircraft/clearance qualification, rehearsal หลัง reboot และชุดสำรองนำเสนอ เป็นคนละขอบเขตกับการสร้างไฟล์อ้างอิงรอบนี้
- ไม่มีคำถามจำเป็น **รอคำตอบ** สำหรับ repair นี้


**Final candidate acceptance (ก่อน push):** replayChromeบนbuildสุดท้ายอีกครั้งด้วยพื้นที่/Homeเดิม ได้35sorties/784.4625minและplanningready/terrainreviewตามเดิม Download01/35จริงรอบใหม่ (` (1).plan`) เทียบserializer/hashตรงกับsnapshotf54ac8561bcc มี12/6items ตรวจpickerdisabledระหว่างPreparingและคืนenabledหลังสำเร็จ DOMbootassetตรงfrozenmanifest consolewarning/error0 `final-local-browser-proof.json`, `local-download-audit.json`, `final-local-ready.png`; requestinputsล่าสุด17212bytes Fresh682tests/0failและ3builds Source22paths+hosted25filesอยู่manifest ไม่เปลี่ยนproductหลังfreeze กำลัง normalpush/deployและตรวจProductionต่อ ไม่มีBilling/subscription
