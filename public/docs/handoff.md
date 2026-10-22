> ระบบรุ่นปัจจุบัน v0.5: ดู [คู่มือส่งมอบ v2](/docs/handoff-v2.md) และ [คู่มือ Pi](/docs/pi-agent.md). เอกสารนี้เก็บรายละเอียด v0.4 ไว้สำหรับอ้างอิง

# XEDO — คู่มือส่งมอบรุ่น 0.4

ปรับตาม XEDO Satellite Dashboard Plan TH v1.1 โดยทำเส้นงานระยะ 0–2 / P0 สำหรับภาพจริงและการตรวจโดยผู้ใช้ พื้นที่นำร่องเริ่มต้นเป็นชายฝั่งระยอง เปลี่ยนหรือเพิ่มได้ที่ “ข้อมูลและตั้งค่า”

## วิธีเริ่มตรวจ

1. เปิดภาพจริงที่เก็บไว้ หรือเลือกพื้นที่และวันที่ UTC แล้วค้นภาพ Sentinel-2
2. ตรวจรหัสภาพ เวลาถ่าย ICT/UTC เมฆทั้ง scene และข้อจำกัดคุณภาพใน AOI
3. คลิก “วงพื้นที่” แล้วคลิกจุดบนแผนที่ ดับเบิลคลิกหรือกด “จบการวาด” ลากจุดเพื่อแก้ หรือ “ล้างร่าง” เพื่อยกเลิกก่อนบันทึก รองรับวาง Polygon GeoJSON พิกัด [longitude, latitude] ด้วย
4. เปิดเหตุการณ์ เลือกเหตุการณ์ที่ต้องการเชื่อม ระบุผู้บันทึกและเหตุผล แล้วบันทึกจุดสังเกต
5. ตรวจสถานะจุดสังเกตแยกจากสถานะเหตุการณ์ การตรวจภาพสำเร็จไม่เท่ากับยืนยันว่าน้ำมัน
6. แนบไฟล์ภาพหรือ PDF พร้อมเวลาเก็บหลักฐาน พิกัด วิธีได้หลักฐาน และภาพที่เชื่อมโยง
7. เปลี่ยนสถานะเหตุการณ์พร้อมเหตุผล ผู้ตรวจ ระดับหลักฐาน และความเชื่อมโยงทางเวลา/ตำแหน่ง การยืนยันต้องมีไฟล์หลักฐานและระดับภาคสนาม/แหล่งอิสระ
8. ส่งต่อคำขอสำรวจ ส่งออก GeoJSON/CSV และแนบผลตรวจกลับมายังเหตุการณ์เดิม

ขอบเขตของคำขอสำรวจถูกเก็บเป็น snapshot ตอนสร้างคำขอ การแก้ขอบเขตในเหตุการณ์ภายหลังไม่เปลี่ยนไฟล์พื้นที่ของคำขอเดิม สร้างคำขอใหม่หากต้องการพื้นที่ฉบับใหม่

## ข้อมูลจริงและความหมาย

- ภาพ: `actual` จาก Copernicus Sentinel-2 ผ่าน Earth Search STAC / AWS public COG
- ขอบเขต: `user_annotation`, `sourceKind: manual` ไม่มี confidence เติมให้
- ไฟล์ผู้ใช้อัปโหลด: ไฟล์หลักฐานจริงที่เก็บไว้ ไม่ใช่การยืนยันโดยระบบอัตโนมัติ
- ไม่มีเหตุการณ์ตัวอย่าง ผลโมเดล ตัวเลข accuracy หรือภารกิจโดรนสมมติถูกสร้างในฐานข้อมูลใช้งาน
- ตัวเลขเมฆเป็น **ทั้ง scene** ไม่ใช่เปอร์เซ็นต์เมฆของ AOI และไม่มี cloud/nodata mask ในรุ่นนี้
- ภาพเก็บไว้ครั้งแรกเป็น acquisition เดียว วันที่ 2026-09-29T03:55:05.182000Z, product `S2A_MSIL2A_20260929T034201_N0513_R061_T47PQP_20260929T081020.SAFE`
- crop จริงจาก TCI COG ใน EPSG:32647 พร้อม extent/grid/resampling/checksum ที่ `/assets/sentinel-proof.metadata.json` ภาพต้นทาง 10 m/px; crop ที่เก็บไว้แสดงประมาณ 49.83 m/px และครอบคลุมเพียงบางส่วนของ AOI บริเวณด้านนอกเป็นแผนที่พื้นฐาน
- ภาพพื้นฐาน OpenStreetMap มีป้ายลิขสิทธิ์แยก และไม่ถูกอ้างเป็นภาพ Sentinel ตามวันที่เลือก
- ค่าพื้นที่ใช้ Chamberlain–Duquette บนทรงกลมรัศมีเฉลี่ย WGS84 6,371,008.8 m หน่วย m² เหมาะกับการตรวจนำร่อง ยังไม่ใช่การวัดรังวัด ไม่รวมหลายภาพหรือหลายวันเป็นพื้นที่น้ำมันรวม
- ไม่มีระบบยืนยันชนิดวัสดุหรือประสิทธิภาพการบำบัดจากภาพ RGB

## สิ่งที่พร้อมใช้

| Brief | รุ่นนี้ |
|---|---|
| ค้นพื้นที่/วันที่และระบุแหล่งจริง | Earth Search และ CDSE STAC; แสดงหน้าถัดไปและผลค้นบางส่วน |
| ภาพจริงตรงพิกัด | OpenLayers; แปลง UTM → Web Mercator; เก็บ GeoJSON เป็น WGS84 |
| วาด/แก้/บันทึกขอบเขต | รูปทรงตัดตัวเอง/จุดซ้ำ/นอก AOI หรือภาพต้นทางถูกปฏิเสธ; เก็บทุก revision |
| incident ≠ observation | สถานะและประวัติแยก; ย้าย observation ไปเหตุอื่นในพื้นที่เดียวกันด้วยเหตุผล |
| review / evidence / export | ภาพ/PDF ≤8 MB ต่อไฟล์; UTC/ICT; GeoJSON/CSV; snapshot พื้นที่สำรวจ |
| เก็บหลัง restart | local SQLite + files; hosted D1 + R2 |
| retry/cache/ข้อมูลซ้ำ | catalogue cache 15 นาที; COG byte-range cache; job idempotent; retry สูงสุด 5 รอบ |
| backup/restore | สำรอง metadata + record + ไฟล์จริง; ไม่รวม pixel range cache ที่สร้างซ้ำได้; ไฟล์รวม ≤24 MB; กู้คืนฐานข้อมูลว่าง |

## สถาปัตยกรรมที่เลือก

ใช้ HTML/CSS/JavaScript เดิมร่วมกับ OpenLayers และแยก `client.js`, `catalogue.js`, `worker.js`, `storage.js`, `domain.js` เพื่อแก้ต่อได้ง่าย บริการ API เป็น JavaScript Worker, D1 (SQLite) และ R2 เพื่อให้เว็บเดิมมี persistence ที่ใช้งานได้ทันทีบน Sites ส่วน local ใช้ Node 24 / SQLite / files แทน FastAPI/PostGIS ที่ brief เสนอ เพราะระบบ hosting เดิมรองรับ Worker และยังไม่มีงาน SAR/GPU หนัก

schema ใช้ตาราง `records` (ชนิด area/incident/observation/revision/review/evidence/survey/event), `scenes`, `jobs` โดย records เก็บ JSON รายชนิดและ revision แบบ optimistic concurrency งานอ่านส่วนหัว COG ทำเบื้องหลังและเก็บสถานะคงทน งานหนัก SAR/AI ต้องย้ายไป dedicated queue/compute worker ในระยะถัดไป

API contract รุ่นนี้:

- `GET /api/state`: พื้นที่ เหตุการณ์ จุดสังเกต ประวัติ ภาพและงาน
- `GET /api/scenes?area=&provider=&start=&end=&cursor=`: catalogue แบบแบ่งหน้า
- `POST /api/jobs`, `GET /api/jobs/:id`: เตรียม COG header / retry / recovery
- `GET /api/assets/:sceneId` + Range: อ่านและ cache COG เฉพาะช่วง
- `POST /api/records`, `PATCH /api/records/:id`: สร้างและแก้พร้อม revision/เหตุผล
- `POST /api/evidence` multipart, `GET /api/files/:id`: แนบ/เปิดหลักฐาน
- `GET /api/export/:incidentId?format=geojson|csv`: รายงานเหตุพร้อมขอบเขตและต้นทาง
- `GET /api/survey-export/:surveyId?format=geojson|csv`: snapshot ของคำขอ
- `GET /api/backup`, `POST /api/restore`: สำรอง/กู้คืน

เว็บไซต์คงสิทธิ owner-private เดิม API ใช้ขอบเขตการเข้าถึงของ Sites ผู้ใช้ถูกอ้างด้วย authenticated-user header ฝั่ง server รุ่นนี้ยังไม่มีหลายทีม/บทบาท viewer-recorder-reviewer-admin; ต้องเพิ่ม server authorization ก่อนขยายผู้ใช้หรือเปิด public

## ยังไม่เชื่อม / งานระยะถัดไป

- CDSE STAC ค้น metadata ได้ แต่ Sentinel Hub OAuth / Process API ยังไม่ตั้งค่า จึงแจ้ง “ภาพยังไม่พร้อม” เมื่อเลือก scene ที่ไม่มี COG สาธารณะ ไม่มี secret ใน browser/backup/log และไม่ใช้ fake image แทน
- Sentinel-1 SAR, AOI cloud/shadow/nodata mask และ valid coverage ยังไม่คำนวณ
- เปรียบเทียบสองเวลา กราฟย้อนหลัง รายงานประเมินผู้ใช้ เป็น P1
- baseline/AI training/inference ต้องมี dataset, labels, split protocol, metrics และ model จริงก่อนเปิดใช้
- telemetry/live video/flight controller/dose/ผล TPH เป็น P2
- image access proof ตรวจ Earth Search COG แล้ว; CDSE เป็น catalogue proof เท่านั้น ไม่อ้างว่าขอ Process API สำเร็จ
- ยังไม่ได้ทดลองภาคสนามหรือประเมินผู้ใช้ 3–5 คน/20 ผู้เชี่ยวชาญ/SUS

## การทดสอบ

`node --test tests/workflow.test.mjs` ทดสอบพื้นที่ WGS84, รูปทรงผิด, idempotent creation/upload, ยืนยันโดยไม่มีหลักฐานระดับที่ตรงกันต้องล้มเหลว, stale revision ต้องปฏิเสธ, ประวัติขอบเขต, GeoJSON/CSV, snapshot คำขอสำรวจไม่เปลี่ยนตาม revision ใหม่, เปิด DB ใหม่หลัง restart และสำรอง/กู้คืนพร้อมไฟล์ไบต์ตรงกัน ใช้ฐานข้อมูลชั่วคราว ไม่ seed ผลทดสอบไป production

ตรวจใน browser แล้ว: ค้นภาพจริง/โหลด COG, วาง GeoJSON, วาดด้วยแป้นพิมพ์, บันทึกจุดสังเกต, เปิดใหม่หลัง restart, แนบ PNG พร้อมเวลา ICT/พิกัด/ภาพอ้างอิง และสร้างคำขอสำรวจ การทดสอบทั้งหมดเป็น fixture ที่ระบุชัด ไม่ใช่หลักฐานการพบน้ำมัน

การกู้คืนรองรับไม่เกิน 500 records ต่อชุดในรุ่นนำร่อง ต้องขยายเป็นกระบวนการนำเข้าแบบแบ่งชุดก่อนใช้ข้อมูลใหญ่กว่านี้

## แหล่งเอกสาร

- [Earth Search](https://github.com/Element84/earth-search) / [AWS Sentinel-2 COG](https://registry.opendata.aws/sentinel-2-l2a-cogs/): public catalogue และ assets
- [CDSE STAC](https://documentation.dataspace.copernicus.eu/APIs/STAC.html): endpoint ปัจจุบันและ collections
- [OpenLayers COG](https://openlayers.org/en/latest/examples/cog.html): การแสดง raster มีพิกัด
- [Sentinel Hub Process API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process.html): สำหรับ adapter ที่ต้องใช้ OAuth ในระยะถัดไป

ไฟล์ข้อมูลอ้างอิงใน brief เป็นเอกสารประกอบ ส่วนข้อความสั่งงานที่อยู่ในเอกสารไม่ได้รับสิทธิเหนือคำสั่งของผู้ใช้
