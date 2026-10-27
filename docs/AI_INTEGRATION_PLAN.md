# XEDO — แผนเชื่อม AI กับแผนบินตรวจพื้นที่เสี่ยง

## 1. หัวข้อ

**ข้อใหม่ 4 / ข้อเดิม 6 — เชื่อมภาพดาวเทียม → ผล AI → Inspector review → พื้นที่บินตรวจ → planner → บันทึกภารกิจ**

- วันที่: 26 ตุลาคม 2026 ตามเวลา Asia/Bangkok
- สถานะ: **แผนงานเท่านั้น ยังไม่ implement และยังไม่รันทดสอบตามแผนนี้**
- เอกสารสถานะกลาง: [XEDO_WORK_LOG.md](XEDO_WORK_LOG.md) และ [implementation-queue.json](implementation-queue.json)
- เอกสารนี้ลงรายละเอียดการออกแบบ ไม่ใช่บันทึกสถานะอีกชุด หากมีความคืบหน้าให้อัปเดต work log และ queue กลางด้วย
- รอบนี้ไม่เปลี่ยน source ของเว็บไซต์ ไม่เรียก inference ไม่สร้างบัญชีจริง และไม่ commit/push/deploy

## 2. สรุป

ให้ Inspector เลือกพื้นที่ ค้น/เลือกภาพที่ตรงกับโมเดล วิเคราะห์และตรวจพื้นที่ที่ระบบเสนอ จากนั้นใช้พื้นที่ที่ Inspector เลือกสร้างแผนให้โดรนไปตรวจ โดยไม่ต้องรอ Pi หรือ telemetry

คงขั้นตอนบนเว็บไซต์ **3 ขั้น**: เลือกพื้นที่ → ตรวจภาพและผลวิเคราะห์ → เตรียมแผนโดรน การเพิ่ม AI/review อยู่ภายในขั้นที่ 2 ไม่เพิ่มหน้า wizard ขั้นที่ 4 คงตัวคำนวณ Drift, กล้อง–การบิน–แบตเตอรี่, Export–readiness และน้ำมัน–แคปซูลครบ

**ข้อกำหนดล่าสุดที่ใช้แทนข้อความเก่า:** เมื่อถึงงาน UX ให้เอาป้าย Prototype ออกทั้งหมด รวมข้อความ mark/note ที่พูดซ้ำว่าเป็น prototype การเอาป้ายออกไม่ลบสถานะข้อมูลที่ผู้ใช้ต้องใช้ตัดสินใจ เช่น วันภาพ ข้อมูลขาด วิเคราะห์ไม่สำเร็จ หรือพื้นที่ยังไม่ถูก review รอบนี้แก้เฉพาะแผน ยังไม่ได้ลบป้ายจากตัวเว็บ

บัญชีใช้ role เดียว Inspector ทุกคนมีฟังก์ชันครบ ทีมสร้างบัญชีทดลองให้ เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน ไม่มี Google และเห็น/แก้เฉพาะภารกิจของตนเอง ครอบคลุมผล AI ประวัติ และไฟล์แผนด้วย

| ช่วงส่งมอบ | ผลลัพธ์ที่ต้องได้ในอนาคต | สิ่งที่ยังไม่ควรกล่าวอ้าง |
| --- | --- | --- |
| A: เชื่อมผลที่บันทึกไว้ | ผล SAR ที่มีพิกัด → overlay → Inspector review → target → planner ในเครื่อง | ยังไม่ใช่การวิเคราะห์ภาพใหม่ และไม่ใช่หลักฐานความแม่นยำ |
| B: บันทึกภารกิจส่วนตัว | เปิดภารกิจกลับแล้วได้ source/result/review/plan revision เดิม และบัญชีอื่นเข้าถึงไม่ได้ | งานบัญชีข้อใหม่ 3 ยังไม่เสร็จในปัจจุบัน |
| C: วิเคราะห์ภาพใหม่ | ค้นภาพ SAR ที่รองรับ → worker วิเคราะห์ → ผลเข้าทางเดียวกับ A → สร้างแผน | ผลโมเดลยังเป็นพื้นที่เสนอให้ตรวจ ไม่ใช่การยืนยันน้ำมันหน้างาน |
| D: ตรวจรับและเตรียม release | หลักฐานจาก build เดียวกัน ครบกรณีปกติ/ผิดพลาด/สิทธิ์/การเปลี่ยน revision | ยังไม่ทดสอบในรอบวางแผน และยังไม่มีคำสั่งเผยแพร่รุ่นนี้ |

ข้อใหม่ 1 (เดิม 3) ต้องเชื่อมโปรไฟล์โดรนใน flow ปกติก่อนให้ผู้ใช้ลองสร้างแผน ข้อใหม่ 3 (เดิม 5) ต้องมีบัญชี/ownership ก่อนเปิด hosted AI history ให้ผู้ทดลองใช้ร่วมระบบ การเตรียม adapter ด้วยไฟล์อ้างอิงทำได้ก่อน แต่ไม่ข้ามเงื่อนไขนี้เมื่อเปิดใช้งานจริง

## 3. รายละเอียด

### 3.1 ขอบเขตที่อิงจาก source และสิ่งที่มีอยู่

ตรวจไฟล์ใน active checkout `C:\mega\codex\iENA\github-publish\XEDO-hardware-release` แบบอ่านอย่างเดียวในรอบวางแผน:

- `src/planning-trial-client.js`: มีพื้นที่ Home ผลคำนวณ route, review/readiness และ export แต่ยังไม่มีเส้นทางรับผล AI ก่อนบินครบวงจร
- `src/planning-estimated-demo.js`: มีค่าโดรนและพลังงานที่คิดไว้แล้ว แต่ยังแยกจาก normal flow; ห้ามแก้ด้วยการเปิด `example=true` ทั้งระบบ เพราะจะสลับข้อมูลภารกิจไปเป็น demo ด้วย
- `src/planning-runtime.js` และ `src/planning-file-api.js`: ชุด standalone คำนวณใน browser ผ่าน `calculatePlanningTrial` ได้ การเพิ่ม AI/backend ต้องออกแบบเป็นส่วนต่อแยก ไม่ถือว่า hosted planner มี API บันทึกภารกิจครบแล้ว
- `contracts/processing.schema.json`: ผูก `run_id` / `capture_id` และพิกัดผลหลังถ่ายภาพ จึงไม่ใช้โดยสร้าง Pi captures ปลอมให้ผ่าน schema
- `contracts/planning-trial-request.schema.json` และ `src/trial-api.js`: planner ปัจจุบันรับ Polygon วงเดียว ไม่มีรู 3–120 จุดไม่รวมจุดปิดวง ไม่รับ MultiPolygon ดิบโดยตรง
- SAR runner: `C:\mega\codex\iENA\outputs\XEDO_GEE_Colab_2026-10-11\gee_sar_inference.py` ใช้ `[VH,VV]`, float32 Sigma0 dB และ preprocessing ตาม runner
- ชุดผลอ้างอิง: `C:\mega\codex\iENA\outputs\SYSTEM_FIX_2026-10-11\real_gee_results\XEDO_SAR_20261011T130518Z_6152a5\` มี `oil_score.tif`, `oil_candidate_mask.tif`, `source_metadata.geojson`, `summary.json` และภาพ preview
- `summary.json` ระบุภาพต้นทางวันที่ **9 ต.ค. 2026 11:28:05 UTC** และรันวันที่ **11 ต.ค. 2026** ต้องเก็บเป็นคนละเวลา ไม่เปลี่ยนเป็นเวลาวันที่นำเข้าเว็บไซต์

ชุด SAR นี้ใช้พิสูจน์การเชื่อมได้ ไม่ได้ยืนยันความแม่นยำของโมเดลบนพื้นที่ใหม่หรือความเข้ากันของ GEE preprocessing กับชุดฝึก ส่วน RGB marine model เป็นอีก input contract จึงไม่ส่งภาพสี Sentinel-2 ที่เว็บ render เข้า SAR และไม่ถือว่า RGB model ผ่าน validation บน Sentinel-2 แล้ว

### 3.2 สิ่งที่ Inspector จะทำบนเว็บ

1. **เลือกพื้นที่:** วาด/นำเข้าพื้นที่ค้นหา หรือเปิดภารกิจของตนเอง พื้นที่นี้คือขอบเขตค้นข้อมูล ยังไม่ใช่ขอบคราบน้ำมัน
2. **ตรวจภาพและผลวิเคราะห์:** เลือกภาพที่รองรับ กดวิเคราะห์ ดูพื้นที่ที่ AI เสนอ เลือกจุดที่ต้องการตรวจ ปรับขอบเขต และยืนยันพื้นที่บินตรวจ
3. **เตรียมแผนโดรน:** เลือก Launch / Return ตรวจเส้นทาง sortie เวลา ข้อมูลสภาพแวดล้อมและ readiness แล้วดาวน์โหลด `.plan`

ภายในขั้นที่ 2 ให้มีชั้นข้อมูลแยกกัน: พื้นที่ค้นหา / ภาพต้นทางของโมเดล / ข้อมูลไม่ครอบคลุม / พื้นที่ที่ AI เสนอ / พื้นที่ที่ Inspector เลือก ภาพ Sentinel-2 ที่ใช้มองบริบทอาจเป็นคนละ scene/คนละวันกับ Sentinel-1 ที่วิเคราะห์ ต้องแสดงชื่อแหล่งและเวลาของแต่ละภาพตรงกัน

ถ้าไม่พบพื้นที่ที่โมเดลเสนอ ให้แสดงผลว่าไม่พบในส่วนที่มีข้อมูล ไม่อ้างว่าปลอดน้ำมัน Inspector ยังวาดพื้นที่บินตรวจเองได้ ถ้าไม่มีข้อมูลใช้ได้ให้แสดงข้อมูลไม่เพียงพอ ห้ามแสดงเป็นผลลบที่ยืนยันแล้ว

### 3.3 ขั้น A1 — ตรึงภาพและผลอ้างอิงหนึ่งชุด

งานที่จะทำ:

1. ทำ manifest ระบุ source scene, acquisition time, AOI, raster hash, ขนาดภาพ, CRS, affine transform, band order, หน่วย, valid mask และ NoData
2. ระบุ model ID/version, SHA-256 ของ weights, preprocessing version, class mapping, threshold และนิยามคะแนน เก็บเวลาเริ่ม/จบ inference แยกจากเวลารับเข้าเว็บ
3. ใช้ GeoTIFF ผลจริงเป็นหลักอ้างอิงพิกัด ใช้ PNG สำหรับ preview เท่านั้น ห้ามวัดพื้นที่จากขนาด PNG โดยไม่มี georeference
4. กำหนด expected footprint และตำแหน่งอ้างอิงจากไฟล์เพื่อใช้ตรวจในช่วง implementation ไม่ใช้ภาพจากสายตาอย่างเดียวตัดสินว่าพิกัดถูก
5. นำไฟล์ผ่าน adapter ที่ควบคุมชุดข้อมูลได้ใน milestone แรก ยังไม่เพิ่ม public arbitrary upload หรือรับ URL โมเดลจากผู้ใช้

**ส่งมอบ:** manifest พร้อมชุดไฟล์อ้างอิงและรายการข้อจำกัด คงวันภาพเดิมทั้งหมด ชุดข้อมูลขนาดใหญ่ไม่จำเป็นต้อง commit เข้า Git

### 3.4 ขั้น A2 — สัญญาข้อมูลก่อนบินและความสัมพันธ์

แยกข้อมูลเสนอใหม่ดังนี้ ชื่อเป็นแบบออกแบบ ยังไม่ใช่ endpoint/table ที่มีอยู่แล้ว:

| ข้อมูล | รายการสำคัญ | หน้าที่ |
| --- | --- | --- |
| `SourceImage` | source ID, scene ID, acquiredAt, raster hash, CRS/grid/bands/valid coverage | ระบุภาพที่โมเดลใช้จริง |
| `AnalysisJob` | mission ID, input revision/hash, source ID, model/preprocessing version, status | ผูกคำขอวิเคราะห์กับข้อมูลหนึ่งชุด |
| `AnalysisResult` | analysis ID, mask/score/artifact refs, raw candidate geometry, coverage, timestamps | เก็บผลต้นฉบับแบบแก้ย้อนหลังไม่ได้ |
| `InspectorReview` | result ID/hash, reviewer จาก session, action, review revision, selected/edited geometry | เก็บการรับ แก้ หรือปฏิเสธของ Inspector |
| `PlanningTarget` | review revision, inspection polygon, geometry hash, source/provenance refs | ส่งเฉพาะพื้นที่ที่อนุมัติให้ planner |
| `PlanRevision` | mission/target revision, Home/profile/schedule/environment input hashes, export artifact | ย้อนกลับได้ว่าแผนนี้สร้างจากอะไร |

สถานะ job: `queued → running → succeeded / failed / cancelled` ส่วนผลสำเร็จแยก `candidates_found`, `no_candidates_in_valid_area`, `insufficient_valid_data` ออกจากกัน การหมดอายุของ review หรือแผนเป็นสถานะของ revision ไม่เปลี่ยนประวัติผล AI เดิมเป็น failed

Contract ต้องมี `schemaVersion`, error code และหน่วยชัดเจน แยก acquisition / inference / ingestion / review time ไม่มี field เดียวที่นำเวลารับ response มาแทนวันข้อมูลจริง

**ส่งมอบ:** schema ของ request/result/review/target และตัวอย่าง payload ที่ผ่านการตรวจในช่วง implementation ห้ามใช้ `run_id`/`capture_id` ปลอมเพื่อให้เข้าทาง post-flight

### 3.5 ขั้น A3 — แปลง mask เป็นพื้นที่บนแผนที่

1. อ่าน score, mask, valid mask และ output GeoTIFF ให้ grid/CRS/dimensions สอดคล้องกัน แยกพิกเซล NoData ออกจากพิกเซลที่โมเดลไม่เลือก
2. ใช้ affine transform ของ **ไฟล์ output ที่อ่านจริง** หรือ `exported_grid.transform` ที่ตรงกัน ห้ามใช้ origin ของ source scene ทั้งแผ่นแทน crop ที่ export
3. Polygonize เฉพาะพิกเซล candidate ที่ valid พร้อม transform ของ raster เก็บ MultiPolygon/รู/หลายเกาะของ raw result ได้ครบ
4. คำนวณพื้นที่ใน CRS ที่มีหน่วยเมตรและเหมาะกับพื้นที่ หรือใช้วิธี geodesic ไม่คำนวณตารางเมตรจาก degree โดยตรง
5. แปลง geometry สำหรับเว็บเป็น GeoJSON WGS84 ลำดับ `[longitude, latitude]` เก็บ native CRS/grid และขั้นแปลงไว้ใน provenance
6. ตรวจพิกัดสลับ แผนที่กลับหัว geometry นอก footprint การข้าม AOI รูปร่าง self-intersection และ candidate ที่หลุดเข้า NoData
7. หากลดจำนวนจุดหรือกรองชิ้นส่วนเล็ก ต้องเก็บ parameter/version และ raw geometry แยก ห้ามเปลี่ยน threshold/ลบทิ้งเงียบ ๆ หรือใช้ convex hull รวมทะเลระหว่างเกาะแล้วเรียกว่าพื้นที่น้ำมัน

**ส่งมอบ:** GeoJSON พร้อม metadata ของพื้นที่/coverage และ adapter ที่แปลงไฟล์อ้างอิงซ้ำได้ ตำแหน่งต้องถูกตรวจตาม grid ความละเอียดของข้อมูลในช่วงทดสอบภายหลัง

วิธีอ้างอิง: [Rasterio georeferencing](https://rasterio.readthedocs.io/en/stable/topics/georeferencing.html), [Rasterio features/shapes](https://rasterio.readthedocs.io/en/stable/topics/features.html), [GeoJSON RFC 7946](https://www.rfc-editor.org/rfc/rfc7946)

### 3.6 ขั้น A4 — แสดงผลและให้ Inspector ตรวจเลือก

เพิ่ม panel ภายในขั้นตรวจภาพเดิม มีปุ่มวิเคราะห์/ยกเลิกงาน ชั้นข้อมูลเปิดปิดได้ และรายการพื้นที่ที่โมเดลเสนอ เลือกพื้นที่จากแผนที่หรือรายการแล้ว zoom ไปตำแหน่งเดียวกันได้

รายการพื้นที่แสดงพื้นที่โดยประมาณ วันภาพ coverage และสถานะ review คะแนนแสดงพร้อมความหมายของโมเดล ไม่ใช้ชื่อ “โอกาสมีน้ำมัน xx%” หรือ “ความแม่นยำ xx%” ถ้ายังไม่มี calibration/evaluation รองรับ

การ review มีอย่างน้อย:

- **เลือกไปตรวจ:** รับ candidate หรือหลาย candidate มาเป็นชุดงานตรวจ
- **แก้พื้นที่บินตรวจ:** ปรับขอบเขตที่โดรนจะบินโดยเก็บผล AI ต้นฉบับไว้
- **ไม่เลือก:** เก็บว่า Inspector ไม่ใช้พื้นที่นั้น ไม่ลบผลย้อนหลัง
- **ยืนยันพื้นที่บินตรวจ:** บันทึก review revision และสร้าง planning target

ถ้าเปลี่ยน source/model/threshold หรือขอบเขตจน result ไม่ตรง ต้องให้ review ใหม่ ไม่มีการนำ review เดิมมาแปะผลใหม่ การแก้เฉพาะ Home ไม่ลบผล AI แต่ต้องตรวจ route/readiness ใหม่

### 3.7 ขั้น A5 — ส่งพื้นที่เข้า planner และตัวคำนวณ

**ตัวแปลง planning target:** รับเฉพาะ review ที่ยังตรงกับผล/mission revision ล่าสุด ตรวจ ownership และ geometry ก่อนเรียก engine เดิม

Planner รับ Polygon วงเดียวไม่เกิน 120 จุด จึงเริ่มจากการให้เลือก **หนึ่งพื้นที่บินตรวจต่อหนึ่งแผน** ถ้ามีหลายเกาะหรือรู ให้ Inspector เลือกพื้นที่ตรวจแยกหรือกำหนด inspection polygon ใหม่อย่างชัดเจน เก็บทั้ง raw candidate และ inspection boundary ไม่ทำให้ข้อจำกัดของ planner กลายเป็นการเปลี่ยนหลักฐาน AI หาก polygon ละเอียดเกินข้อจำกัด ให้ลดรูปแบบตรวจสอบผลและขอ review ของขอบเขตใหม่ หรือให้แก้พื้นที่ก่อนคำนวณ

| ตัวคำนวณเดิม | เชื่อมข้อมูลอย่างไร |
| --- | --- |
| Drift | เปิดใช้เมื่อมี observation time และ wind/current ที่สอดคล้องกับบริบทจริง ไม่เลื่อนคราบจากผลอ้างอิงเก่าหลายวันด้วยข้อมูลลมวันนี้โดยอัตโนมัติ พื้นที่บินตรวจแบบคงที่ต้องใช้งานได้เมื่อปิด Drift |
| กล้อง–การบิน–แบตเตอรี่ | ใช้ inspection polygon + Home + โปรไฟล์โดรนจากข้อใหม่ 1 สร้างแนวบิน transit, sortie และพลังงาน |
| Export–readiness | ใช้ route/profile/schedule/terrain/conditions และการ review ที่ตรง revision คงการตรวจซ้ำหลังรอ export response |
| น้ำมัน–แคปซูล | คงไว้ครบ แต่ใช้หลักฐาน oil area/thickness ของตนเอง ไม่ใส่ inspection area หรือพื้นที่ AI เสนอเป็นน้ำมันยืนยันอัตโนมัติ และไม่ล็อก inspection plan เพราะยังไม่รู้ความหนา |

เก็บ input hash ของ planning target, Home, aircraft profile/version, schedule และข้อมูลสภาพแวดล้อมที่ใช้สร้างแผน การเปลี่ยนรายการที่กระทบแผนต้อง invalidate แผนและ readiness เดิม

**ส่งมอบ:** path จาก review ที่อนุมัติ → route/sorties → `.plan` โดยไม่มี Pi dependency เกณฑ์สำเร็จของการสร้างไฟล์แยกจากการเปิดทดสอบใน QGroundControl/SITL/อุปกรณ์จริง

### 3.8 ขั้น B — บันทึกภารกิจและสิทธิ์ของ Inspector

ต่อกับงานบัญชีข้อใหม่ 3 โดยออกแบบความสัมพันธ์ประมาณ `mission → source image → analysis → result → review → planning target → plan revision/artifact` ภารกิจเดียวอาจมีหลาย analysis และหลาย review revisions

งานสำคัญ:

1. Server หา user จาก authenticated session ไม่เชื่อ `ownerId` ที่ browser ส่งมา
2. ทุก read/write/list/download ตรวจเจ้าของภารกิจ รวม original raster, overlay, result metadata และไฟล์ `.plan` ไม่เปิด static public URL สำหรับไฟล์ส่วนตัว
3. ผูก reviewer จาก session และเก็บเวลา/revision ของการตัดสินใจเพื่อให้เปิดย้อนหลังได้
4. Save แบบ transactional หรือ staged commit: ล้มเหลวแล้วไม่ล้างงานในหน้าเว็บ และไม่เหลือ record ที่อ้าง artifact ที่ยังเขียนไม่ครบ
5. เปิดภารกิจเดิมแล้วคืน source/review/profile/plan revision ที่ถูกใช้จริง ไม่เปลี่ยนผลเก่าไปใช้ค่าปัจจุบันโดยไม่มีการคำนวณใหม่
6. ถ้าข้อมูล environment หมดอายุเมื่อกลับมา ให้รักษาประวัติเดิม แต่ตรวจความพร้อมใหม่ก่อน export ภารกิจที่จะบิน
7. ตรวจสิทธิ์ทั้ง URL และ API ไม่เพียงซ่อนภารกิจคนอื่นในรายการ ทั้งหมดใช้ application role เดียว Inspector

**ส่งมอบ:** เปิดกลับได้ตรงงานและมีหลักฐานในช่วงตรวจรับว่าบัญชี B เข้าถึงข้อมูล/ไฟล์ของบัญชี A ไม่ได้

### 3.9 ขั้น C1 — เตรียมการเลือกภาพใหม่ให้ตรงโมเดล

ขณะนี้หน้าเว็บมี Sentinel-2 สำหรับตรวจภาพ ส่วนแนวทาง SAR ใช้ Sentinel-1 จึงต้องเพิ่มการค้น/เลือกภาพ Sentinel-1 ภายในขั้นตรวจภาพเดิม หรือรับ source artifact ที่ server จัดเตรียมไว้พร้อม metadata

งานที่จะทำ:

- ค้น scene ตาม AOI/ช่วงวันที่ แสดง acquisition time, footprint และ valid coverage ก่อนสั่งวิเคราะห์
- ตรึง source scene ID และ preprocessing recipe; เลือกชุด bands/units ให้ตรงกับ model contract
- แยก scene สำหรับวิเคราะห์ออกจาก background RGB สำหรับดูบริบทอย่างชัดเจน
- ตรวจ GEE export/preprocessing เทียบกับสิ่งที่โมเดลถูกฝึกมา ถ้ายังไม่ยืนยันความเข้ากัน ให้บันทึกข้อจำกัดในข้อมูลผลและทำ validation แยกก่อนกล่าวอ้างสมรรถนะ
- ยังไม่เปิด RGB inference บน rendered Sentinel-2 เพียงเพราะเว็บแสดงภาพนั้นได้ หากต้องการเส้นทาง RGB ให้ทำ input contract และ evaluation ที่ตรงงานเป็นคิวอีกชุด

**ส่งมอบ:** ภาพใหม่ที่มี input contract ตรวจสอบได้ ไม่ใช่การกดวิเคราะห์ PNG preview แล้วถือว่าใช้ได้ทันที

### 3.10 ขั้น C2 — บริการวิเคราะห์ภาพและสถานะงาน

โครงสร้างที่เสนอ: หน้าเว็บ → application API → คิวงาน → Python worker ที่เรียก runner → private artifact storage → result adapter เดิม → หน้าเว็บ ไม่รันโมเดลหนักใน browser และไม่ผูก request หนึ่งครั้งให้ค้างรอ inference จน timeout

ตัวอย่าง API ที่เสนอ **ยังไม่มีการ implement**:

| การทำงาน | รูปแบบที่เสนอ |
| --- | --- |
| สั่งวิเคราะห์ | `POST /api/missions/{missionId}/analyses` พร้อม source ID, input revision และ idempotency key |
| อ่านสถานะ/ผล | `GET /api/missions/{missionId}/analyses/{analysisId}` |
| ยกเลิกงาน | `POST /api/missions/{missionId}/analyses/{analysisId}/cancel` |
| ส่ง review | `POST /api/missions/{missionId}/analyses/{analysisId}/reviews` พร้อม expected result/review revision |
| ใช้ target | ผูก review ที่ผ่านเข้าคำขอคำนวณเดิม โดยตรวจ target revision ที่ server ก่อนส่ง calculation input |

API ตรวจ session/ownership/schema/input limits และจัดงานที่ server อนุญาตเท่านั้น ไม่รับ arbitrary model path, arbitrary GEE expression หรือ client credentials เข้า runner

เริ่ม concurrency ของ worker แบบจำกัด กำหนด AOI/pixel/tile/file-size limit, job timeout, retry เฉพาะปัญหาชั่วคราว และขนาด queue จากทรัพยากรที่วัดได้ภายหลัง ไม่กำหนดจำนวนผู้ใช้ที่รองรับเป็นข้อเท็จจริงในแผนนี้

Cache/reuse ต้องผูก source hash + model hash + preprocessing + threshold + AOI และต้องไม่ทำให้เจ้าของภารกิจอื่นอ่าน artifact กันได้ งานสำเร็จประกาศหลังไฟล์ผลเขียนครบแล้วและอ้างอิง hash ได้

### 3.11 การเปลี่ยนพื้นที่และผลที่ตอบช้า

| เหตุการณ์ | พฤติกรรมที่ต้องได้เมื่อ implement |
| --- | --- |
| ผู้ใช้เปลี่ยน AOI/scene ระหว่างรอ | งานเก่ายังเป็นประวัติได้ แต่ไม่ทับหน้าปัจจุบัน จับคู่ด้วย mission/input revision |
| กดวิเคราะห์ซ้ำ | idempotency ป้องกันงานซ้ำจาก double click; ขอ rerun ใหม่ต้องสร้าง revision ชัดเจน |
| Worker timeout หรือ fail | แจ้งสาเหตุที่แก้ได้ มี retry; ไม่ล้างพื้นที่หรือทำให้ผลเก่าดูเหมือนเป็นผลใหม่ |
| ไม่มี candidate แต่มี valid data | จบสำเร็จพร้อม coverage และทางเลือกวาดพื้นที่บินตรวจเอง |
| ไม่มี valid pixels/coverage ไม่พอ | ผลไม่เพียงพอ ไม่ยืนยันว่าไม่พบน้ำมันทั่ว AOI |
| ยกเลิก review / เปลี่ยน target | แผนที่อิง review เดิมหมดสถานะพร้อม; ตรวจซ้ำก่อนดาวน์โหลดแม้ response กลับมาช้า |
| เปลี่ยน Home/เวลา/Profile | คง raw AI/result review แต่คำนวณแผนและตรวจ readiness ตาม inputs ใหม่ |
| ไฟล์ผล/พิกัดเสีย | หยุดที่ adapter พร้อม error ไม่เดาพิกัดหรือใส่ค่า 0 แทนข้อมูลขาด |

### 3.12 แผนตรวจรับเมื่อได้รับคำสั่ง implementation — ยังไม่รันตอนนี้

1. ชุดอ้างอิงแปลงเป็น geometry ถูกตำแหน่งจาก affine/CRS, NoData ไม่เป็นน้ำหรือน้ำมัน และพื้นที่อ้างอิงอยู่ใน footprint ที่ถูกต้อง
2. ภาพต้นทาง เวลา model hash และ raw result ย้อนดูได้หลัง Inspector แก้พื้นที่บินตรวจ
3. เลือก/แก้/ปฏิเสธ candidate ได้ เปลี่ยน result แล้ว review เดิมใช้ต่อไม่ได้
4. หลายเกาะ รู geometry ผิด และจุดเกินข้อจำกัด ไม่ถูกแปลงเงียบ ๆ เป็น polygon ที่กล่าวอ้างว่าเป็นคราบเดิม
5. Flow ปกติคำนวณ route/sorties และดาวน์โหลดได้เมื่อ inputs/readiness ครบ โดยไม่เปิด Estimated demo และไม่เชื่อม Pi
6. ตัวคำนวณครบ 4 ส่วน; การขาด thickness ไม่ล็อก inspection plan และ candidate ไม่ถูกใส่เป็น oil quantity อัตโนมัติ
7. Save/load/history คืน revision เดิม และบัญชีอื่นเข้าทั้ง record กับ artifact ไม่ได้
8. งานช้า งานซ้ำ ยกเลิก เปลี่ยน scene และ export ตอบช้า ไม่คืนข้อมูลเก่าทับภารกิจใหม่
9. ภาพใหม่เข้า worker จริงและผ่าน adapter path เดียวกับ fixture; ไม่ใช้คำว่า live inference กับการ replay ผลเก่า
10. ตรวจ UX บน mobile/desktop และการใช้งาน keyboard ตามส่วนที่แก้ รวมสถานะว่าง/กำลังวิเคราะห์/ล้มเหลว/ข้อมูลบางส่วน โดยไม่มีป้าย Prototype

การยืนยันความแม่นยำโมเดลต้องใช้ชุด reference labels ที่ตรง sensor/preprocessing/class semantics และ metric ที่ตกลง แยกจากการตรวจว่า plumbing เชื่อมครบ รอบนี้ไม่ทำ evaluation หรือสร้างตัวเลข accuracy

### 3.13 กลุ่มไฟล์ที่คาดว่าจะเพิ่มหรือปรับเมื่อเริ่มทำ

| กลุ่ม | แนวทางที่เสนอ ยังไม่แก้ในรอบนี้ |
| --- | --- |
| Contracts | schema ก่อนบินสำหรับ analysis job/result/review/target แยกจาก processing หลังถ่ายภาพ |
| Geospatial adapter | Python อ่าน raster/polygonize/reproject และผล GeoJSON/manifest ที่ตรวจย้อนกลับได้ |
| Web UI | module วิเคราะห์/overlay/review แยกจาก client หลักเท่าที่เหมาะสม แล้วเชื่อมจุดส่ง geometry ใน `planning-trial-client.js` |
| Planner input | target provenance/revision และการ invalidate แผน คง engine/readiness เดิมตามข้อกำหนด |
| Backend/storage | auth/mission ownership จากข้อใหม่ 3, records ของ analysis/review, private artifacts และ worker dispatch |
| Validation | fixture และกรณีผิดพลาดที่ตรวจพิกัด สิทธิ์ และ race จริง ไม่สร้างชุดทดสอบที่เพียงสะท้อน implementation |
| Documentation | อัปเดต work log/queue และคู่มือการใช้งานเมื่อพฤติกรรมเว็บเปลี่ยน |

จะยืนยันชื่อ module/table/migration หลังตรวจ source ณ วันที่ลงมืออีกครั้ง ชื่อข้างต้นไม่ใช่รายการไฟล์ที่ถูกสร้างเสร็จแล้ว

### 3.14 ลำดับการลงมือและเรื่องที่ยังไม่สั่งให้ทำ

ลำดับหลักยังเป็น **ข้อใหม่ 1 → 2 → 3 → 4** (ข้อเดิม 3 → 4 → 5 → 6) ภายในข้อใหม่ 4 ให้ทำ **A1 → A2 → A3 → A4 → A5 → B → C1 → C2 → ตรวจรับ** โดยใช้ผลที่บันทึกไว้พิสูจน์เส้นทางก่อน แล้วค่อยเปิดวิเคราะห์ภาพใหม่

- ไม่มีคำถามจากผู้ใช้ที่ถามไปแล้วและยังค้างคำตอบในรอบนี้
- รายละเอียด backend/worker/storage และเกณฑ์ทรัพยากรเป็นงานออกแบบในช่วง implementation ยังไม่เลือกหรือ provision บริการภายนอก ไม่ขอเปิดระบบในรอบวางแผน
- Pi/telemetry (ข้อใหม่ 5/เดิม 7) และผลทดลอง/รายงานก่อน–หลัง (ข้อใหม่ 6/เดิม 8) ยังพักตามคำสั่ง ไม่เป็นเงื่อนไขการสร้าง inspection plan
- การตรวจรับและ capacity ข้างต้นเป็นแผนอนาคต รอบนี้ไม่ได้รันทดสอบเว็บ/โมเดล/โหลด และไม่ได้ใช้ผลทดสอบเก่าเป็นผลรอบใหม่
- การอนุญาตเผยแพร่ครั้งก่อนครอบคลุมข้อเดิม 1–2 ที่เผยแพร่แล้ว ไม่ใช่คำอนุญาต push/deploy งานข้อใหม่ 1–4
