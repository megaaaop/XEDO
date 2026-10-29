# XEDO — แผนเชื่อม AI กับแผนบินตรวจพื้นที่เสี่ยง

## 1. หัวข้อ

**ลำดับล่าสุด3 / ก่อนหน้า4 / เดิม6 — prepared AI → Inspectorแก้พื้นที่เสี่ยง → ยืนยันพื้นที่บินตรวจ → planner → ภารกิจส่วนตัว**

- วันที่เริ่ม26ตุลาคม2026; ปรับล่าสุด29ตุลาคม2026 ตามเวลา Asia/Bangkok
- สถานะ: **ผู้ใช้ยืนยันว่าบัญชีตรวจใช้งานได้แล้ว และสั่งเริ่มวางแผน AI/editor; แผนลงมือฉบับปัจจุบันอยู่§3.16 มีผลแทนข้อความสถานะเก่าที่ขัดกัน Application AI ยังไม่implement รอบนี้ตรวจ12corefilehashesใหม่ตรงทั้งหมด ไม่รันwebsite tests/inferenceหรือเผยแพร่**
- เอกสารสถานะกลาง: [XEDO_WORK_LOG.md](XEDO_WORK_LOG.md) และ [implementation-queue.json](implementation-queue.json)
- เอกสารนี้ลงรายละเอียดการออกแบบ ไม่ใช่บันทึกสถานะอีกชุด หากมีความคืบหน้าให้อัปเดต work log และ queue กลางด้วย
- รอบนี้ไม่เปลี่ยน source ของเว็บไซต์ ไม่เรียก inference ไม่สร้างบัญชีจริง และไม่ commit/push/deploy

## 2. สรุป

ให้ Inspector เลือกพื้นที่ ค้น/เลือกภาพที่ตรงกับโมเดล วิเคราะห์และตรวจพื้นที่ที่ระบบเสนอ จากนั้นใช้พื้นที่ที่ Inspector เลือกสร้างแผนให้โดรนไปตรวจ โดยไม่ต้องรอ Pi หรือ telemetry

**สถานะ29ต.ค.:** รับคำยืนยันผู้ใช้ว่าบัญชีตรวจได้แล้ว ไม่คงบัญชีเป็นตัวขวางเริ่มแผน AI และไม่ขอให้ส่งรหัสผ่าน แต่ไม่ขยายคำยืนยันเป็นรายงานว่าแชทนี้เพิ่งทดสอบทุกกรณี A–B/session/concurrency แล้ว ขอบเขตรอบแรกใช้ผล SAR ที่เตรียมไว้เท่านั้น ชื่อปุ่มจึงต้องสื่อว่าโหลด/เปิดผล AI ไม่แสดงว่าได้รันโมเดลใหม่ ส่วนระบบประมวลผลภาพใหม่ในช่วง C เป็นงานอนาคต

**ขอบเขตล่าสุด27ต.ค.:** วันนี้เริ่มจากชุดผลSARที่เตรียมไว้ ผู้ใช้ตัดงานnormalflow/profileและstart-derived-endใหม่ออกจากเกณฑ์ปิดงาน ยอมรับprototypeplannerเดิม อนุมัติUX/บัญชี/AI และกำหนดให้Inspectorแก้ตำแหน่ง/ขอบเขตพื้นที่เสี่ยง เพิ่มเองหรือปฏิเสธผลAIได้ แชทหลักแก้เว็บเพียงแชทเดียว ส่วนsupportทำdata/testdesign รายละเอียดeditorข้อ3.15มีผลแทนแผนเก่าที่ขัดกัน

คงขั้นตอนบนเว็บไซต์ **3 ขั้น**: เลือกพื้นที่ → ตรวจภาพและผลวิเคราะห์ → เตรียมแผนโดรน การเพิ่ม AI/review อยู่ภายในขั้นที่ 2 ไม่เพิ่มหน้า wizard ขั้นที่ 4 คงตัวคำนวณ Drift, กล้อง–การบิน–แบตเตอรี่, Export–readiness และน้ำมัน–แคปซูลครบ

**ข้อกำหนดล่าสุดที่ใช้แทนข้อความเก่า:** เมื่อถึงงาน UX ให้เอาป้าย Prototype ออกทั้งหมด รวมข้อความ mark/note ที่พูดซ้ำว่าเป็น prototype การเอาป้ายออกไม่ลบสถานะข้อมูลที่ผู้ใช้ต้องใช้ตัดสินใจ เช่น วันภาพ ข้อมูลขาด วิเคราะห์ไม่สำเร็จ หรือพื้นที่ยังไม่ถูก review รอบนี้แก้เฉพาะแผน ยังไม่ได้ลบป้ายจากตัวเว็บ

บัญชีใช้ role เดียว Inspector ทุกคนมีฟังก์ชันครบ ทีมสร้างบัญชีทดลองให้ เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน ไม่มี Google และเห็น/แก้เฉพาะภารกิจของตนเอง ครอบคลุมผล AI ประวัติ และไฟล์แผนด้วย

| ช่วงส่งมอบ | ผลลัพธ์ที่ต้องได้ในอนาคต | สิ่งที่ยังไม่ควรกล่าวอ้าง |
| --- | --- | --- |
| A: เชื่อมผลที่บันทึกไว้ | ผล SAR ที่มีพิกัด → overlay → Inspector review → target → planner ในเครื่อง | ยังไม่ใช่การวิเคราะห์ภาพใหม่ และไม่ใช่หลักฐานความแม่นยำ |
| B: บันทึกภารกิจส่วนตัว | เปิดภารกิจกลับแล้วได้ source/result/review/plan revision เดิม และบัญชีอื่นเข้าถึงไม่ได้ | บัญชีล่าสุด2/เดิม5เผยแพร่และผู้ใช้ยืนยัน29ต.ค.ว่าตรวจได้แล้ว แต่ AI review/target ยังต้องเชื่อมกับ Save/history |
| C: วิเคราะห์ภาพใหม่ | ค้นภาพ SAR ที่รองรับ → worker วิเคราะห์ → ผลเข้าทางเดียวกับ A → สร้างแผน | ผลโมเดลยังเป็นพื้นที่เสนอให้ตรวจ ไม่ใช่การยืนยันน้ำมันหน้างาน |
| D: ตรวจรับและเตรียม release | หลักฐานจาก build เดียวกัน ครบกรณีปกติ/ผิดพลาด/สิทธิ์/การเปลี่ยน revision | ยังไม่ทดสอบในรอบวางแผน และยังไม่มีคำสั่งเผยแพร่รุ่นนี้ |

งานก่อนหน้า1/เดิม3ถูกตัดจากรอบนี้ ไม่เป็นdependencyของAIอีกต่อไป ใช้ ownership/session/Save/history ที่เผยแพร่แล้วเป็นฐานของ private AI review และไม่เปลี่ยนexport/readinessเดิมเพื่อทำให้ดูผ่าน

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
- **แก้พื้นที่เสี่ยง:** ย้ายพื้นที่/ลากเพิ่มลบจุดขอบเขตหรือวาดใหม่ในlayerของInspector เก็บผลAIต้นฉบับและrevisionแยก
- **เพิ่มเอง:** วาดบริเวณที่Inspectorเห็นว่าเสี่ยงแม้AIไม่เสนอ เก็บที่มาmanual ไม่อ้างว่าเป็นผลAI
- **ไม่เลือก:** เก็บว่า Inspector ไม่ใช้พื้นที่นั้น ไม่ลบผลย้อนหลัง
- **ยืนยันพื้นที่บินตรวจ:** บันทึก review revision และสร้าง planning target

ถ้าเปลี่ยน source/model/threshold หรือขอบเขตจน result ไม่ตรง ต้องให้ review ใหม่ ไม่มีการนำ review เดิมมาแปะผลใหม่ การแก้เฉพาะ Home ไม่ลบผล AI แต่ต้องตรวจ route/readiness ใหม่

### 3.7 ขั้น A5 — ส่งพื้นที่เข้า planner และตัวคำนวณ

**ตัวแปลง planning target:** รับเฉพาะ review ที่ยังตรงกับผล/mission revision ล่าสุด ตรวจ ownership และ geometry ก่อนเรียก engine เดิม

Planner รับ Polygon วงเดียวไม่เกิน 120 จุด จึงเริ่มจากการให้เลือก **หนึ่งพื้นที่บินตรวจต่อหนึ่งแผน** ถ้ามีหลายเกาะหรือรู ให้ Inspector เลือกพื้นที่ตรวจแยกหรือกำหนด inspection polygon ใหม่อย่างชัดเจน เก็บทั้ง raw candidate และ inspection boundary ไม่ทำให้ข้อจำกัดของ planner กลายเป็นการเปลี่ยนหลักฐาน AI หาก polygon ละเอียดเกินข้อจำกัด ให้ลดรูปแบบตรวจสอบผลและขอ review ของขอบเขตใหม่ หรือให้แก้พื้นที่ก่อนคำนวณ

| ตัวคำนวณเดิม | เชื่อมข้อมูลอย่างไร |
| --- | --- |
| Drift | เปิดใช้เมื่อมี observation time และ wind/current ที่สอดคล้องกับบริบทจริง ไม่เลื่อนคราบจากผลอ้างอิงเก่าหลายวันด้วยข้อมูลลมวันนี้โดยอัตโนมัติ พื้นที่บินตรวจแบบคงที่ต้องใช้งานได้เมื่อปิด Drift |
| กล้อง–การบิน–แบตเตอรี่ | ส่งconfirmedinspectionpolygon+Homeเข้าengine/profile/flowสาธิตเดิมตามที่ผู้ใช้ยอมรับ ไม่เพิ่มnormalprofileหรือscheduleใหม่ที่ถูกตัดจากรอบนี้ |
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

ลำดับล่าสุดคือ **1UX/2บัญชี → 3preparedAI+Inspector risk editing → ตรวจรวม** (เดิม4/5/6) แชทสนับสนุนเตรียมข้อมูลและกรณีทดสอบขนานได้ ชุดSARเตรียมแล้วจึงเริ่มadapter/reviewจากชุดนี้ ขั้นวิเคราะห์ภาพใหม่C1/C2เป็นอนาคต ไม่ใช่เกณฑ์ปิดวันนี้

- ไม่มีคำถามจากผู้ใช้ที่ถามไปแล้วและยังค้างคำตอบในรอบนี้
- รายละเอียด backend/worker/storage และเกณฑ์ทรัพยากรเป็นงานออกแบบในช่วง implementation ยังไม่เลือกหรือ provision บริการภายนอก ไม่ขอเปิดระบบในรอบวางแผน
- Pi/telemetry (ข้อใหม่ 5/เดิม 7) และผลทดลอง/รายงานก่อน–หลัง (ข้อใหม่ 6/เดิม 8) ยังพักตามคำสั่ง ไม่เป็นเงื่อนไขการสร้าง inspection plan
- การตรวจรับและ capacity ข้างต้นเป็นแผนอนาคต รอบนี้ไม่ได้รันทดสอบเว็บ/โมเดล/โหลด และไม่ได้ใช้ผลทดสอบเก่าเป็นผลรอบใหม่
- การอนุญาตเผยแพร่ครั้งก่อนครอบคลุมข้อเดิม 1–2 ที่เผยแพร่แล้ว ไม่ใช่คำอนุญาต push/deploy งานข้อใหม่ 1–4

### 3.15 Inspectorแก้พื้นที่เสี่ยง — ข้อกำหนดอนุมัติล่าสุด27ต.ค.2026

ผู้ใช้อนุมัติimplementationpreparedAIและขอInspectorแก้จุดเสี่ยงได้ ขอบเขตขั้นต่ำภายในขั้น2: accept/editboundary/move/manualadd/reject พร้อมUndo/Cancel/resetdraft/confirmreview เก็บAIrawและInspectorRiskDraft/decisions/reviewversionคนละชุด snapshotส่วนตัวต้องเปิดคืนeditedriskได้พร้อมrawเดิม ผู้แก้และเวลาอ้างsession/server ไม่เชื่อowner/reviewerจากclient

เปิดeditไม่เรียกsetGeometryทุกvertexเพราะจะresetSurvey/image/schedule ต้องมีedit lifecycleแยก raw→draft→confirmedriskreview→oneplanningtarget→plan เมื่อconfirmareaเปลี่ยน invalidateplanเก่า ขยายreview/target/sessionrevisionguardทั้งก่อนและหลังexportresponse Cancelคืนgeometryก่อนแก้แต่ตรวจreadinessล่าสุด;Saveล้มเหลวเก็บdraftไว้และไม่แสดงsaved/reviewconfirmedผิดๆ

rawgeometrycomplex/holes/multiplecomponentsคงไว้ plannerยังPolygonเดียวไม่มีรู3–120จุด จึงไม่ลดrawเงียบๆ ชุดที่ส่งมามี14Polygonไม่มีรู13ชิ้นเข้าlimitและcandidate00012มี378จุด ให้แสดงrawและให้Inspectorวาดขอบเขตบินที่reviewใหม่ เป้าแรกใช้redraw ไม่จำเป็นautosimplify หากmanualtargetอยู่นอกvalidAIcoverageรักษาoriginmanual;ออกนอกimagereviewต้องตรวจพื้นที่ภาพ/conditionsใหม่ ไม่อ้างAIครอบคลุม

supportส่งdataแล้ว: raw14candidate/32utilitychecksตามรายงาน;mainตรวจ12SHA256ตรงโดยไม่รันconversionซ้ำ นัดงานต่อเป็นriskeditfixtures/tests14กรณีในREVIEW_EDIT_ADDENDUM.md ส่วนUX/บัญชี/AIwebintegrationเป็นงานmainเท่านั้น เวลาสร้างnormalprofileและscheduleใหม่ถูกตัดจากเกณฑ์ปิดงาน ไม่ถือว่าส่วนนั้นimplementแล้ว

การยืนยันคุณสมบัตินี้ต้องมีหลักฐานedit/undo/cancel/rawhash/reopen/history/twotabconflict/crossowner/staleexport/378pointlimit/manualcoverageจริง รายการออกแบบทดสอบไม่ใช่ผลผ่านapplication รอบแก้แผนนี้ไม่มีapplicationimplementation/tests/newinference/pushdeploy

### 3.16 แผนลงมือ prepared AI และ Inspector risk editor — 29 ตุลาคม 2026

**หัวข้อ:** ล่าสุดข้อ3/เดิมข้อ6 หลังผู้ใช้ยืนยันว่าบัญชีตรวจได้แล้ว รอบนี้จัดทำแผนและตรวจ source/data แบบอ่านอย่างเดียว ไม่เริ่มแก้ application หรือใช้ migration

**สรุป:** ใช้ผล SAR เดิม → แสดงพื้นที่เสนอพร้อมแหล่ง/วันภาพ → Inspectorรับ แก้ ย้าย วาดเพิ่ม หรือปฏิเสธ → ยืนยันหนึ่งพื้นที่บินตรวจ → คำนวณด้วย planner เดิม → Save/reopen/history ส่วนตัว คง3ขั้น/4ตัวคำนวณ ไม่เพิ่ม Pi, โมเดลใหม่, normal-profile หรือ schedule rewrite

#### 3.16.1 ฐานที่ตรวจได้และข้อจำกัดที่กระทบวิธีทำ

| จุดที่อ่านจริง | ผลต่อแผนลงมือ |
| --- | --- |
| `setGeometry()` ใน `src/planning-trial-client.js` | ล้างภาพ/review/routeและรีเซ็ตเวลา จึงใช้เมื่อเปลี่ยนพื้นที่ค้นหาจริงเท่านั้น ไม่ใช้ทุกvertex gesture/Undo/Cancelของriskdraft |
| `body()` / `prepareMission()` ในไฟล์เดียวกัน | ใช้geometryเดียวและเทียบimage geometryแบบเท่ากัน ต้องเพิ่ม target adapter และตรวจ coverage/pixelsของtargetแทนการถือว่าภาพพร้อมจากflagเก่า |
| `initializeInspector().captureDocument/restoreDocument` | บันทึก `analysisRef:null/riskDraft:null` และยังไม่คืนAI ต้องต่อrefs/draft/confirmedreviewและrestoreแบบตรวจครบก่อนเปลี่ยนงานปัจจุบัน |
| `src/inspector-validation.js` / `db/inspector-foundation.sql` | ปฏิเสธ `confirm_risk` ทั้งBFFและRPCอยู่แล้ว การเปิดปุ่มUIอย่างเดียวไม่พอ ต้องเพิ่มserver-authoritativeconfirmationอย่างครบเส้นทาง |
| `contracts/inspector-mission-document.schema.json` | มีanalysisRefและriskDraftรองรับopen/incomplete sketchesแล้ว รักษาร่างเก่าและbytebudget1MiB/inputs64KiB ไม่ยัดrasterหรือrawcatalogซ้ำทุกrevision |
| `src/domain.js` / `src/mission-flow.js` | pointWithinเดิมไม่หักholes ห้ามใช้แทนvalidcoverage validatorที่อาจมีรู; imagecoverageต้องตรวจทั้งขอบ/รู ไม่ใช่เพียงbboxหรือvertices |
| Support core/fixtures | 29ต.ค.ตรวจSHA256 core12ไฟล์ใหม่ตรงทั้งหมด; raw14candidate,13ชิ้นเข้า120vertexและหนึ่งชิ้น378vertex มี19geometry/14scenariofixturesส่งแล้ว ผล298assertionsเป็นหลักฐานsupportเดิม ไม่ใช่webtestsใหม่ |

JSONหลักที่มีอยู่มีขนาดmanifest13,119bytes/rawcandidates93,239bytes/coverage120,547bytes/footprints1,497bytesตามไฟล์ที่อ่านรอบนี้ ขนาดชุดนี้เหมาะกับโหลดครั้งเดียวตามresult/hashและวาดแบบvector ไม่ต้องสร้างMLworkerหรือบริการstorageใหม่เพื่อพิสูจน์integration ห้ามcommitต้นฉบับGeoTIFF/weights/credentialsลงbundle

#### 3.16.2 หน้าจอและการใช้งานภายใน3ขั้นเดิม

1. **ขั้น1 เลือกพื้นที่:** คงวาด/นำเข้า/เปิดภารกิจเดิม เพิ่มทางเลือกเปิดพื้นที่ของผลที่เตรียมไว้ ถ้าพื้นที่ปัจจุบันไม่ตรง ให้บอกว่าไม่มีผลชุดนี้ครอบคลุมและให้ผู้ใช้เลือกเปลี่ยนพื้นที่อย่างชัดเจน เก็บงานเดิมจนยืนยันเปลี่ยน ไม่วางผลSARชุดเดียวบนทุกพื้นที่อัตโนมัติ
2. **ขั้น2 ตรวจภาพ/ผล AI:** เพิ่มpanel `AI risk areas` รายการ14พื้นที่และlayerเปิด/ปิด rawAI,coverage/NoData,draft,confirmedtarget เลือกรายการแล้วเน้นพื้นที่บนแผนที่ แสดงวันที่SAR9ต.ค./วิเคราะห์11ต.ค.แยกจากSentinel-2contextที่เว็บเลือก คะแนนใช้ชื่อmodel score ไม่แปลงเป็นเปอร์เซ็นต์ความแม่นยำ
3. **เครื่องมือ Inspector:** เลือกพื้นที่ / ใช้พื้นที่นี้ / แก้ขอบเขต / ย้ายพื้นที่ / วาดเพิ่ม / ปฏิเสธ / Undo / Redo / Cancel / Reset draft / ยืนยันพื้นที่บินตรวจ `Reset draft`ต้องแจ้งก่อนทิ้งการแก้หลายรายการ ส่วนCancelคืนtransactionที่กำลังแก้ ไม่คืนsource/sessionที่หมดอายุ
4. **ขั้น3 เตรียมแผน:** รับเฉพาะconfirmedtargetหนึ่งPolygonต่อแผน แสดงที่มาและrevisionสั้นๆ คงHome/เส้นทาง/เที่ยวบิน/เวลา/ข้อมูลสภาพแวดล้อม/2D3D/readiness/downloadเดิม ไม่มีป้ายPrototypeหรือคำอธิบายเทคนิคพร่ำเพรื่อในflow

ช่วงโหลดผล/ยืนยัน/Saveให้แสดงpendingทันทีและกันกดซ้ำ ระบุerror/retryและเก็บdraftเมื่อผิดพลาด หากเป็นผลที่เตรียมไว้ใช้ขั้นสถานะโหลด→ตรวจข้อมูล→แสดงผล ไม่สร้างเปอร์เซ็นต์หรือข้อความว่ากำลังรันinferenceที่ไม่ได้เกิดขึ้น

#### 3.16.3 แยกข้อมูลและstateก่อนต่อปุ่ม

`SearchContext` (AOI/image coverage/scene) → `PreparedAnalysis` (immutable result/hash/source/coverage) → `RiskDraft` (editable sketches/decisions/undo) → `ConfirmedRiskReview` (server-owned actor/time/revision) → `PlanningTarget` (validated polygon/hash) → `PlanRevision`

- rawAIไม่ถูกแก้ในplace; ยอมรับ/ปฏิเสธเป็นdecisionของInspector ไม่ลบcandidateต้นฉบับ การวาดเองมีoriginmanual การแก้จากAIมีsourceCandidateIdsสืบย้อนกลับ
- เริ่มedit:พักสิทธิ์exportทันที เก็บconfirmedtargetเดิมในstateเพื่อCancelได้ ไม่คำนวณrouteทุกpointermove
- จบgestureหนึ่งครั้ง:เพิ่มundoหนึ่งรายการ อัปเดตเฉพาะdraftoverlay/area summaryแบบboundedRAF ใช้sharedstyles ไม่serializerawหรือเรียกGEEตอนscroll
- Confirmสำเร็จเท่านั้น:แทนtargetและrevision ล้างroute/readiness/ผลGEEตามdependency รักษาภาพและเวลาเดิมเมื่อtargetยังอยู่ในภาพที่ตรวจแล้วและมีvisiblepixelsตรงtargetจริง ถ้าพื้นที่หลุดภาพให้เก็บdraftและให้โหลด/ตรวจภาพพื้นที่ใหม่
- เปลี่ยนHome:คงraw/reviewแต่ประเมินrouteใหม่; เปลี่ยนresult/source/account:กันผลasyncเก่าทับงานใหม่ด้วยmission/result/draft/review/sessiontokens ตรวจซ้ำหลังexportresponse
- Cancel/Undoไม่คืนreadyเก่าที่หมดอายุ ผลterrain/environment/image/sessionต้องตรวจความสดปัจจุบันก่อนปลดexportอีกครั้ง

#### 3.16.4 Geometry policy สำหรับรอบแรก

confirmedtargetต้องเป็นPolygonวงเดียวไม่มีรู3–120จุดไม่รวมจุดปิดวง ปิดวงจริง ไม่ซ้อนตัดตัวเอง ไม่degenerate ไม่เกินเพดานพื้นที่และขอบเขตmissionที่ระบบเดิมรับ

- candidate13ชิ้นที่เข้าlimit:เลือกใช้หรือแก้เป็นdraftแล้วInspectorยืนยัน
- candidateใหญ่378จุด:แสดงrawครบ ให้Inspectorวาดขอบเขตบินตรวจภายใน/บริเวณที่เลือกใหม่ ไม่autosimplify/hull/bboxเงียบๆ ไม่เปลี่ยนrawเป็นรูปง่ายเพื่อให้ผ่านschema รอบแรกยังไม่ทำautomaticหลายพื้นที่หลายแผน
- draftอาจยังเปิดวง/เกินlimitได้และSave draftได้ตามbudget แต่ปุ่มConfirmต้องอธิบายข้อที่ไม่ผ่านพร้อมแก้ ไม่แทนด้วยศูนย์หรือclipเงียบๆ
- manualtargetอยู่นอกcandidateแต่ในภาพที่reviewได้:ใช้ได้ในฐานะพื้นที่Inspectorเลือก ไม่อ้างAIตรวจพบ ถ้าข้ามSARNoDataให้แยกcoverage/ที่มาส่วนที่ไม่มีข้อมูล ไม่เรียกว่าพื้นที่AIครอบคลุมทั้งหมด
- ถ้าออกนอกภาพ/บริบทค้นหาที่reviewจริง ให้แก้contextและตรวจภาพใหม่ก่อนวางแผน ห้ามผ่านด้วยbboxอย่างเดียว การยืนยันcoverageที่มีรูต้องใช้polygoncoverageจริง
- ไม่ส่งพื้นที่เสี่ยงจากSARไปเป็นพื้นที่น้ำมันยืนยันหรือคำนวณความหนา/แคปซูลโดยอัตโนมัติ ตัวคำนวณน้ำมันยังต้องใช้หลักฐานตามเกณฑ์เดิม

#### 3.16.5 Result catalog, private persistence และความน่าเชื่อถือของConfirm

แนวทางหลักคือใช้BFF/RPC/session/append-onlymissionrevisionsเดิม เพิ่ม immutable prepared-analysis catalog ในschemaส่วนตัว และnullable server-owned confirmedreview/target payloadบนmissionrevisionพร้อมresponseenvelope (ยังไม่จำเป็นต้องสร้างreviewtableแยก) ไม่ใส่reviewer/timeในclient-editabledocument ไม่สร้างbackendแยกและไม่ย้ายระบบบัญชี

แพ็กข้อมูลเว็บจากfixedresultallowlist/versionedserver-onlydirectory แปลงbrowsermanifestเป็นสำเนาที่ตัดabsolute localpaths/checkpointlocations/DriveIDsที่ไม่จำเป็นออก โดยเก็บsource/hashสำคัญไว้และไม่เขียนทับmanifestต้นฉบับ ตรวจ`vercel.json`/buildfunctionincludefilesให้catalogถูกbundleจริง เพราะbuildปัจจุบันสร้าง`dist/index.html`เป็นหลัก ไม่ถือว่าไฟล์ในoutputsจะขึ้นproductionเอง Catalogอ้างอิงชุดกลางแต่draft/review/confirmedtargetต้องprivateตามownerเสมอ

**APIที่เสนอ (ยังไม่มี):** โหลดcatalog/resultที่อนุญาตผ่านเส้นทางย่อยของInspectorAPI; ใช้save_draftเดิมสำหรับanalysisRef/riskDraft และเปิดconfirm_riskด้วยmissionexpectedRevision/baseReviewRevision/mutationId/target Serverต้องตรวจresult/hash/candidateIDs/selecteddraft/geometry/coverage/ownerก่อนcommit พร้อมคืนreviewID/revision/targethash/createdAtจากserver Persistactorจากsession ไม่รับowner/reviewer/readysealจากclient

**Trust boundary:** authenticatedusersเรียกRPCได้ตรง จึงห้ามทำgeometry/catalogvalidationเฉพาะBFFแล้วให้RPCยอมรับconfirmedflag ใส่authoritativechecksในRPCเดียวกับowner/CAS/idempotencyและserver timestamps เก็บcatalogให้Inspectorอ่านเฉพาะผ่านAPIที่กำหนด ผู้ใช้แก้catalogไม่ได้ ไม่มีservice-roleหรือsecretในbrowser

**Engineering checkpointก่อนเขียนmigration:** ตรวจinstalled/allowedPostGISและความสามารถชุดทดสอบแบบอ่านอย่างเดียวก่อน เลือกใช้spatialvalidationที่databaseทำได้จริง เช่นvalidity/wholepolygoncoverage/metricareaโดยqualifiedschema ถ้ามีPostGISให้ตรวจเอกสารปัจจุบันและunit/integrationกับSQLจริง ถ้ายังไม่มีให้ประเมินboundedSQLgeometryสำหรับtarget≤120จุดเทียบcatalogนี้ หรือจัดทำextensionmigrationที่reviewแยก ห้ามลดระดับเป็นBFF-onlyvalidationเพื่อเร่งงาน และไม่อ้างว่ามีextensionพร้อมแล้วจากรอบวางแผนนี้ เป็นการตัดสินใจวิศวกรรม ไม่ใช่คำถามproductที่ต้องให้ผู้ใช้ตอบตอนนี้

**Migration boundary:** preparedcatalog/confirmedreviewต้องมีSQLreview+localtestsก่อนใช้live ไม่applyDDLหรือseedจากรอบวางแผนนี้ การอนุมัติSQLfoundationเดิมไม่ใช่การใช้migrationใหม่โดยอัตโนมัติ

**Save/reopen:** บันทึกrefs/decisions/draftและserverreview/targetlinkตามrevision ไม่เก็บtileURLs/sessioncredentials/readinessเก่า เปิดmissionเก่าที่analysisRef/riskDraft=nullได้เหมือนเดิม เปิดAIrevisionคืนrawจากhashตรงและdraft/targetรุ่นนั้นก่อน แต่ต้องโหลดภาพ/conditionsที่หมดอายุใหม่ Saveล้มเหลวเก็บdraft; CASconflictไม่เขียนทับงานอีกtab; retryใช้mutationIDเดิม

#### 3.16.6 ไฟล์และชุดงานลงมือที่เสนอ

| ชุดงาน | ขอบเขตแก้ที่เสนอ | เกณฑ์ส่งต่อก่อนทำชุดถัดไป |
| --- | --- | --- |
| A — Contract/data | server-onlycatalogadapter, `contracts/inspector-*.schema.json`, fixtures/tests; ตรวจimmutablehashes/provenanceและgeometrypolicy | โหลด14candidateตรงพิกัด/วัน/coverageได้ และแยกraw/draft/targetในcontractชัด |
| B — Editor | modulesใหม่ที่เสนอ `planning-risk-state.js`, `planning-risk-geometry.js`, `planning-risk-overlay.js`, `planning-risk-editor.js`; ต่อmarkupในbuildscriptที่ใช้จริง/CSS | accept/edit/move/add/reject/Undo/Redo/Cancelทำได้;rawไม่เปลี่ยน;ภาพ/เวลาไม่resetจากgesture |
| C — Server confirmation | `src/inspector-validation.js`, `api/inspector.mjs`, migrationใหม่และcatalog/reviewintegrationtests หลังspatialcheckpoint | RPCตรงก็ไม่ปลอมconfirmationได้;owner/CAS/idempotency/coverageผ่านทั้งpositiveและnegativecases |
| D — Planner/save | proposed `planning-risk-target.js`; จุดbody/prepare/capture/restore/exportใน`planning-trial-client.js`, `inspector-client/state`เท่าที่จำเป็น | confirmedtargetเข้าengineเดิม;staledraft/exportถูกกัน;Save/reopen/historyคืนtargetตรงreview |
| E — Acceptance/release preparation | tests/source checks/3builds/browserบนcandidateเดียวกัน +สองMD/queue/evidence | ครบflowAIจริง/มือถือ/2D3D/บัญชี/privacy ไม่มีfalseReady;จัดผลให้reviewก่อนเผยแพร่ตามคำสั่งรอบนั้น |

ชื่อโมดูล/API/tableทั้งหมดเป็นข้อเสนอ ไม่ใช่ไฟล์หรือendpointที่สร้างแล้ว เลือกไม่รื้อclientหลักทั้งไฟล์ ไม่เพิ่มgeospatial/MLdependencyก่อนตรวจที่มีอยู่ ใช้OpenLayersinteractionsเดิมและแยกdispose/listeners/AbortControllersให้ชัด

#### 3.16.7 เกณฑ์ตรวจรับที่ต้องรันเมื่อimplementation

1. เปิดผลที่เตรียมไว้เห็น14พื้นที่/coverage/NoDataตรงsource พร้อมวันSARและSentinel-2แยก;พื้นที่อื่นไม่ถูกแปะผลชุดเดิม
2. แก้จุด/ย้าย/วาดเพิ่ม/รับ/ปฏิเสธ/Undo/Redo/Cancel/Resetตามtransaction rawhashคงเดิม;แก้แล้วภาพและเวลาไม่reset
3. invalidselfintersection/0area/รู/MultiPolygon/121vertices/outsidefootprint/coverageholes/378rawถูกจัดการตามpolicyไม่clipหรือconfirmแทนInspector
4. manualareaบนbackgroundหรือNoDataไม่ถูกอ้างAIพบ/ครอบคลุม และไม่ทำให้oil/capsuleได้หลักฐานปลอม
5. serverconfirm→planner→Savev1→แก้/confirmv2→History→reopenแต่ละrevisionคืนrawrefs/draft/targetถูกชุด ภารกิจรุ่นเก่าไม่มีAIยังเปิดได้
6. สองtabs/revisionconflict/Savefailed/retry/expiredsession/accountswitch/lateanalysis/lateconfirm/lateexportไม่ทับงานใหม่ ไม่เปิดข้ามowner ตรวจRPCตรงด้วย
7. 390/768/1280px,keyboard/touchediting,dialogscroll/page/3Downership,loading/retry/confirmationfocus คง3steps/4calculators/imageryvisiblepixel/24h/readiness/downloadgates
8. targetedtests/fullsuite/syntax/3buildsและbrowserจากbuildเดียวกัน บันทึกrunใหม่แยกsupport32checks/298assertionsและ531testsของUXreleaseเดิม ไม่เรียกplannedcasesว่าผ่าน

#### 3.16.8 งานคู่ขนานและจุดตรวจส่งมอบ

แชทหลักเป็นผู้แก้source/contracts/API/schema/tests/configและรวมผลเพียงแชทเดียว Supportอ่านแผน3.16และ19fixtures/14scenariosเดิม แล้วส่งgapmatrixสำหรับcoverageholes/NoData/378vertices/UndoCancel/RPCdirect/conflict/lateexport พร้อมexpectedresultและevidenceที่ต้องเก็บ ภายหลังรับartifactจากmainค่อยreviewว่าแต่ละcaseได้รันจริงหรือยัง ไม่แก้web/corepackage ไม่สร้างSQL/account/commit/deploy และไม่รันtraining/inferenceใหม่

Checkpointแรกคือ contract+spatialtrustboundaryและตัวอย่างflowหนึ่งcandidate → edit → confirm → plannerก่อนขยายกรณีทั้งหมด CheckpointถัดไปคือSave/reopen/history แล้วจึงตรวจรวมและmobile ไม่เริ่มกรอบ4ชั่วโมงใหม่หรือรับประกันเวลาจากข้อมูลวางแผนนี้ ไม่มีการส่งข้อความไปuser-ownedchatอื่นในรอบนี้

#### 3.16.9 หลักฐานของรอบวางแผนนี้

อ่านactivecheckoutHEADd899784พร้อมเอกสารdirty3ไฟล์จากรอบสรุปก่อนหน้า รักษารายการเดิม ตรวจsource/schema/RPC/handoffและSHA256core12ไฟล์ใหม่ตรงทั้งหมด ไม่รันconversion/model/tests/build/browser/API/liveDB ไม่แก้application/SQL/Auth/account/config ไม่commit/push/deploy บัญชีเป็นuser-confirmed29ต.ค. ไม่ใช่agent-executedfreshacceptance ไม่มีคำถามผู้ใช้ค้าง อัปเดตแผนนี้พร้อมcanonicalworklog/WEBSITE_DETAILS/structuredqueue

### 3.17 Implementation result — 29 ตุลาคม 2026

ผู้ใช้อนุมัติลงมือและpush/deployในข้อความหลังแผน3.16แล้ว MilestonesA–DลงมือครบตามWEBSITE_DETAILS3.37 ใช้boundedPostgreSQLที่ตรวจliveว่าไม่มีPostGIS ไม่เพิ่มextensionหรือBFF-onlytrust Migration+seedappliedบนxedoและตรวจสิทธิ์แล้ว Eautomated564pass/3builds/browserlocalrealGEEผ่าน กำลังตรวจproductionreleaseหลังpush ผล32checks/298assertions/531testsเดิมไม่ใช้แทนrunนี้ Realaccountผู้ใช้ยืนยันแล้วแต่agentไม่ใช้passwordจริงทดสอบAI;productionAIreviewเป็นขอบเขตหลักฐานที่ต้องระบุให้ชัด ไม่สร้างบัญชีใหม่ ไม่มีคำถามผู้ใช้ค้าง
