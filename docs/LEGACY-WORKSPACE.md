# XEDO · Satellite to survey workspace

รุ่น 0.5 ปรับตามแผนพัฒนาซอฟต์แวร์ v2: ภาพ Sentinel-2 จริง → จุดสังเกต/เหตุการณ์ → คำขอสำรวจ → แผนเส้นทาง → จำลอง/Replay → รับข้อมูล Pi → ผลทดลอง CSV และรายงาน

เว็บ: https://xedo-ocean-mission.megaroblox350.chatgpt.site/

## Raspberry Pi 5

ชุดติดตั้งและวิธีเริ่มอัตโนมัติ: `public/docs/pi5-setup.md` · ดาวน์โหลดใน Monitor & Replay → Live Pi data

แก้ไฟล์ใน `pi-agent/` แล้วรัน `python scripts/package_pi.py` ก่อน `npm run build` เพื่ออัปเดต ZIP ใช้ `python -m unittest discover -s pi-agent -p "test_*.py"` สำหรับทดสอบ uploader ไม่มีไฟล์ credential จริงอยู่ใน source หรือ ZIP

## เริ่มแก้ต่อ

ใช้ Node.js 24 ขึ้นไป:

```powershell
npm install
npm run build
npm run dev
```

เปิด http://127.0.0.1:5173 หลังแก้ source รัน `npm run build` แล้วรีโหลดหน้า หากแก้ backend ให้หยุดและเปิด `npm run dev` ใหม่

| อยากแก้อะไร | ไฟล์ |
|---|---|
| หน้า Home / ข้อความแนะนำโครงการ | `public/index.html`, `public/home.css` |
| ลิงก์ Dashboard เดิมจากหน้า Home | `public/home.js` |
| โครง Dashboard และข้อความ | `public/dashboard.html` |
| สี ระยะห่าง พื้นหลัง และจอมือถือ | `src/styles.css`, `src/operations.css` |
| หน้าดาวเทียม เหตุการณ์ และหลักฐาน | `src/client.js` |
| หน้าแผนภารกิจ Monitor และผลทดลอง | `src/operations-client.js` |
| ตัววัดความหน่วง GEE บนแผนที่ | `src/map-latency.js`, `src/map-latency.css`, `src/gee-connection.js` |
| ป๊อปอัปข้อมูลดาวเทียม | `src/satellite-panels.js`, `src/satellite-workspace.css` |
| คำนวณเส้นทางและจำลอง | `src/planning.js` |
| CSV หน่วย และการตรวจข้อมูล | `src/lab.js` |
| API ดาวเทียม หลักฐาน สำรอง/กู้คืน | `src/worker.js` |
| API แผน ภาพ Pi Telemetry และผลทดลอง | `src/operations.js` |
| สถานะ geometry และ export เดิม | `src/domain.js` |
| Catalogue และภาพต้นทาง | `src/catalogue.js` |
| Schema / migrations | `db/schema.ts`, `drizzle/` |
| Backend ในเครื่อง | `server.mjs`, `scripts/local-storage.mjs` |
| ตัวส่งข้อมูลจาก Pi | `pi-agent/agent.py` |
| รูปแบบข้อมูลกลาง | `contracts/`, `public/contracts/` |
| คู่มือส่งมอบ v2 | `public/docs/handoff-v2.md` |
| คู่มือ Pi | `public/docs/pi-agent.md` |
| Brief ต้นฉบับ v2 | `public/docs/brief-v2.md` |

## ตรวจระบบ

```powershell
npm run check
npm test
python -m unittest discover -s pi-agent -p test_agent.py
```

Tests ตรวจ geometry/no-go/ระยะทาง/งบเวลา, deterministic simulator, capture/result, event ซ้ำ/ผิดลำดับ/reboot, หน่วย CSV, report filter, restart และ restore. Python ตรวจ durable spool/retry/overflow ด้วย fixture ไม่ใช่ฮาร์ดแวร์จริง

เมื่อแก้ schema ใช้ `npm run db:generate` และตรวจ migration ใหม่ ห้ามแก้ migration ที่ deploy แล้ว. เมื่อแก้ contracts ใช้ `node scripts/create-contracts.mjs`

## การเก็บข้อมูล

- ในเครื่อง: `data/xedo.sqlite` + `data/blobs/` เปิดกลับได้หลัง restart; เลือก directory ด้วย `XEDO_DATA_DIR`
- บนเว็บ: Worker + D1/R2 ตาม `.openai/hosting.json` คงสิทธิส่วนตัวเดิม
- Browser storage ใช้เฉพาะธีม; credential ของ Pi ตั้งฝั่งเซิร์ฟเวอร์และไม่ส่งเข้า browser
- QA ใช้ `output/` แยกจากข้อมูลจริงและไม่ถูก deploy. `scripts/seed-v2-qa.mjs` ปฏิเสธ directory นอก `output/`
- สำรองจากหน้า “ข้อมูลและตั้งค่า” หรือ `GET /api/backup` รวม records/history/scenes/original assets/logs/lab CSV/telemetry/jobs; pixel cache สร้างใหม่ได้
- สำรองจำกัด 500 records, 5,000 events, ไฟล์ 24 MiB และ JSON รวม 34 MiB. Restore เฉพาะฐานที่ยังไม่มี incident/plan/telemetry; ตรวจ checksum และไม่ทับข้อมูลเดิม. รายละเอียดข้อจำกัด snapshot/restore อยู่ในคู่มือส่งมอบ

## ขอบเขตที่ทำแล้วและที่ยังรอ

ภาพจริงเริ่มที่ระยองจาก Earth Search public STAC และ Sentinel-2 COG พร้อม acquisition/extent/checksum. CDSE Process API, SAR และ cloud/nodata mask ยังไม่เชื่อม. ขอบเขตจากผู้ใช้เป็น `user_annotation` ไม่ใช่ผลตรวจน้ำมันจาก AI

Planner พื้นฐานรองรับหนึ่ง Polygon แบบ convex ไม่มี hole, profile รุ่นคงที่, ฐาน และ no-go. คำนวณเมตรใน local UTM; เส้นทางชน no-go หรือเวลาเกินงบจะ blocked. แผนและ snapshot ต้นทางคงรุ่นเดิม การแก้ขอบเขตทำให้ต้องทบทวน. Export JSON/GeoJSON/CSV เป็นรูปแบบกลาง XEDO

Simulator มี success/signal loss/dispenser fault และ Replay จาก log เดิม. ข้อมูลจำลอง/เล่นย้อนหลัง/จริงแสดงแยกกัน; battery/material ที่ไม่มีค่าจะเป็น null. Lab CSV มี preview ก่อน commit, units/matrix/source/checksum และประวัติแก้ผล พร้อมรายงานตามเหตุการณ์/ภารกิจ

Pi agent มี HTTP receive-only, offline spool/retry, ภาพต้นทาง และ processing-result contract. ช่องรับข้อมูลต้องตั้ง server credential และ credential ที่ตรงกันบน Pi; ใช้คำสั่ง doctor ตรวจ Site access และ device authentication ก่อนเริ่มส่งข้อมูล. ค่า Live ขึ้นกับข้อมูลที่ได้รับจริง และยังต้องทดสอบอุปกรณ์จริง. ไม่มี AI model, การสั่งบิน, GPIO/การปล่อยวัสดุจริง, dose หรือผลประสิทธิภาพการบำบัดที่สมมติขึ้น

คง Worker + D1/R2 และใช้ Python ที่ Pi แทนเริ่ม FastAPI เพิ่ม เพื่อให้ใช้เว็บเดิมและ persistence เดิมได้. งาน AI/SAR หนักต้องมี compute worker เพิ่ม. นี่เป็น software core ตามแผน v2; hardware integration/calibration และการทดสอบผู้ใช้ยังต้องทำกับทีม

อ่าน [คู่มือส่งมอบ v2](public/docs/handoff-v2.md) และ [คู่มือ Pi](public/docs/pi-agent.md). คู่มือ v0.4 เก็บไว้ที่ `public/docs/handoff.md` สำหรับระบบเดิม

## ตัววัดความหน่วง GEE และข้อมูลดาวเทียม

หัวแผนที่แสดงเพียงไอคอน Wi-Fi และค่า ms. เขียว <300 ms / เหลือง 300–999 ms / แดง ≥1,000 ms หรือเชื่อมต่อไม่สำเร็จ. เกณฑ์สำหรับ dashboard ไม่ใช่ SLA. ถ้ายังไม่เชื่อม GEE แสดงสีเทา `— ms` ไม่ใช้ Ping ของเว็บแทน.

เตรียม API และการยืนยันสิทธิ์ service account ฝั่งเซิร์ฟเวอร์แล้ว. ตั้ง `GEE_PROJECT_ID` และ secret `GEE_SERVICE_ACCOUNT_JSON` เมื่อพร้อมเชื่อม. วัด HTTP ผ่าน XEDO ถึง GEE โดยอ่าน metadata ไม่สร้างแผนที่หรือคำนวณภาพ. อ่าน [คู่มือเชื่อมตัววัด GEE](public/docs/gee-connection.md) สำหรับเส้นทางที่วัด รอบเรียก API และข้อจำกัด. ยังไม่ได้ตั้งค่าบัญชี GEE จริง.

ภาพที่ค้นพบและรายละเอียดภาพเป็นปุ่มเหนือแผนที่ เปิด native dialog; ไอคอนข้อมูลบนแผนที่ใช้รายละเอียดชุดเดียวกัน. ป๊อปอัปเก็บข้อมูลเดิม ไม่สร้างสำเนารายการ เลือกภาพแล้วกลับมาแผนที่ และค้นหาใหม่เปิดผลลัพธ์ให้ดูทันที. ปิดด้วยปุ่ม, Escape หรือคลิกนอกกล่อง.

## Drone tracking preview

Open `/dashboard.html#tracking` for a moving GPS preview. Pause/reset, test signal loss, follow the marker, and export GeoJSON. Switch to Live device to read the latest persisted GPS and the most recent 300 events in its current boot session. Preview never enters live telemetry. Hardware integration still requires the drone-specific GPS/SDK adapter. Read [Drone tracking](public/docs/drone-tracking.md).

## Quick mission

The Home page opens `/mission.html` for Select a polygon → Satellite survey → 2D/3D deployment preview. Read `public/docs/quick-mission.md` for actual behavior and current hardware limits. The existing dashboard remains the advanced workspace.

For external integration, start with [API integration readiness](public/docs/api-integration.md), the generated route inventory and field schemas in `contracts/`. Google account acceptance, physical Pi sensors, AI inference and aircraft/dispenser adapters have separate acceptance requirements.
