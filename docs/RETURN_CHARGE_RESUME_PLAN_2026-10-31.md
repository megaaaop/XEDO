# แผนภารกิจสำรวจ กลับแท่นชาร์จ และทำงานส่วนที่เหลือต่อ

## 1. หัวข้อ

- วันที่: 31 ตุลาคม 2026, Asia/Bangkok
- ผู้ใช้ยืนยันเป้าหมาย: วางแผนให้บินกลับแท่นชาร์จก่อนพลังงานไม่พอ ชาร์จ แล้วออกไปตรวจงานส่วนที่เหลือต่อจนครบพื้นที่
- จุดฐานของแผน: ใช้ Home/แท่นที่ผู้ใช้กำหนด ไม่ถือว่าคำยืนยันนี้เลือกให้ย้าย Home หรือเปลี่ยนค่าพลังงาน
- ขอบเขตเว็บไซต์: แผนและการจำลองวงจรภารกิจตาม scope prototype ที่ยืนยันไว้ ไม่อ้างว่าไฟล์ดาวน์โหลดปัจจุบันสั่งแท่นชาร์จจริงได้
- Source ที่ตรวจ: `88a97ea1f4ae2bfe07e0334677b5801d19a417d3`
- สถานะเอกสาร: **ยืนยัน requirement และตรวจช่องว่าง source แล้ว; ยังไม่ได้ implement charging timeline/model ในรอบนี้**

## 2. สรุป

Flow ที่ต้องรองรับคือ:

**ออกจากแท่น → ตรวจบางส่วน → กลับแท่นพร้อมพลังงานสำรอง → ลงจอด/ชาร์จ → เริ่มเที่ยวถัดไปจากงานที่เหลือ → ทำซ้ำจนครบ → กลับแท่น**

Source ปัจจุบันมีฐานอยู่แล้ว: แต่ละ sortie เริ่มและจบ Home, คิด outbound/return/takeoff/landing/turns, เริ่มงบพลังงานใหม่ทุกเที่ยว และแบ่ง survey segments ต่อเนื่องโดยไม่ทำซ้ำส่วนที่เสร็จ แต่ยังไม่มี charging phase/model ชัดเจน ใช้เพียง ground turnaround คงที่ 600 s และดาวน์โหลด `.plan` แยกเที่ยวโดยไม่มีชุดลำดับการชาร์จ/เที่ยวทั้งหมด

ดังนั้นไม่ควรอธิบายว่าภารกิจทั้งหมดต้องจบในแบตเตอรี่ก้อนเดียว และยังไม่ควรเรียกวงจรชาร์จอัตโนมัติว่าทำครบแล้ว ต้องเติมการจำลองชาร์จและแสดงความต่อเนื่องของทั้งภารกิจให้ตรงกับที่ผู้ใช้คาดหวัง

ข้อจำกัดต่อเที่ยวยังคงอยู่: การชาร์จที่ฐานช่วยเติมพลังงานก่อนเที่ยวถัดไป แต่จุดหนึ่งต้องอยู่ในระยะที่ไปถึงและกลับฐานได้ด้วยแบตเต็มของเที่ยวเดียว กรณีล่าสุด lower bound 137.9 Wh ยังเกินงบ 133.2 Wh ตามโปรไฟล์สมมติเดิม แม้เริ่มแบตใหม่ทุกเที่ยว จึงต้องแสดงเหตุนี้แยกจาก “ต้องกลับมาชาร์จหลายครั้ง” ไม่แสร้งว่าชาร์จเพิ่มจำนวนครั้งแล้วเข้าถึงจุดที่เกินระยะได้

## 3. รายละเอียด

### 3.1 สิ่งที่ source รองรับและช่องว่าง

| เรื่อง | สิ่งที่มีอยู่ | ส่วนที่ต้องเติม |
|---|---|---|
| กลับฐาน | `src/trial-flight.js` สร้างแต่ละ sortie จาก Home และกลับ Home พร้อมค่าขึ้น/ลง/เลี้ยว | เรียกและแสดงฐานเป็น charging station ในแผนตาม requirement |
| แบ่งงาน | เก็บ `surveySegments` และ fraction; เที่ยวถัดไปทำงานหลัง `first=end+1` | แสดงงานที่เสร็จ/ค้างและจุดที่ทำต่อให้ผู้ใช้เห็น |
| พลังงานเที่ยวถัดไป | สมมติว่าเริ่มด้วย usable energy ใหม่ทุกเที่ยว | บันทึกพลังงานตอนกลับ/หลังชาร์จและเหตุการณ์ชาร์จอย่างชัดเจน |
| เวลาพัก | `src/planning-schedule.js` ใช้ `(sortieCount−1) × 600s` | แยก landing/service/charging/ready-to-depart ตามโปรไฟล์; 10 นาทีเดิมไม่ใช่ผลวัดเวลาชาร์จ |
| Export | `src/trial-export.js` สร้างหนึ่ง QGC `.plan` ต่อ sortie และจบด้วย landing ที่ Home | ชุดไฟล์/manifest ที่บอกลำดับเที่ยวและ charging stops โดยรักษารูปแบบมาตรฐาน `.plan` |
| ข้อความบล็อก | `SORTIE_INFEASIBLE` กับข้อความทั่วไป | แยก reachable-with-recharge กับ unreachable-even-after-full-charge และแสดงเหตุใกล้ Home/ปุ่มดาวน์โหลด |

### 3.2 นโยบายแบ่งเที่ยวและกลับแท่น

1. เริ่มเที่ยวด้วยพลังงานหลังชาร์จตามโปรไฟล์
2. พิจารณา survey segment/ส่วนย่อยที่ยังไม่สำรวจ พร้อมค่าใช้พลังงานไปถึง ตรวจ เลี้ยว กลับฐาน และลงจอด
3. จบช่วงสำรวจและวาง return ก่อนที่พลังงานประเมินคงเหลือจะต่ำกว่า `estimatedReturnWh + landingReserveWh`
4. ทุกเที่ยวต้องมี return/landing ที่ฐาน ไม่ตัด return เพื่อทำให้ survey ดูผ่าน
5. เมื่อยังมีงานเหลือ เพิ่ม charging phase หลัง landing แล้วสร้างเที่ยวถัดไปจาก remaining segments
6. ตรวจ coverage fractions ครบโดยไม่มีช่องว่าง/ทำซ้ำ และรักษาขอบเขตพื้นที่เดิม
7. ถ้าไม่มีแม้ส่วนย่อยที่ไปและกลับได้ด้วยพลังงานเต็ม ให้คืน `unreachable_with_full_charge` พร้อม lower bound/budget/เหตุผล ไม่วนสร้างเที่ยวชาร์จที่ไม่มีงานและไม่ลบส่วนที่เข้าไม่ถึง
8. เที่ยวสุดท้ายกลับแท่นและจบงานสำรวจ การชาร์จหลังจบภารกิจเป็นเหตุการณ์บริการแยกถ้าจะรวมในรายงาน

นี่เป็นการวางแผนล่วงหน้าจากโมเดลในเว็บ ไม่ใช่ผล telemetry ว่าแบตจริงใกล้หมดในอากาศ

### 3.3 แบบข้อมูล charging profile ที่เสนอ

- `station`: พิกัด Home และแหล่งอ้างอิงระดับความสูงตาม flow เดิม
- `energyOnDepartureWh`, `estimatedEnergyOnArrivalWh`, `reserveWh`
- `chargeTargetWh`: เป้าหมาย usable energy สำหรับเที่ยวถัดไป
- `chargeModel`: เวลาแบบสมมติที่แก้ได้ หรือ effective charging power/efficiency เมื่อมีสเปกที่ยืนยัน
- `chargeDurationS`, `groundServiceDurationS`, `modelSource` และ ownership ว่าอัตโนมัติหรือผู้ใช้แก้เอง
- สำหรับ mode กำลังชาร์จ: เวลาโดยประมาณจากพลังงานที่ต้องเติม / effective power; ถ้าใช้ค่ากำลัง nominal ต้องแยก efficiency และไม่อ้างว่าเป็นแบบจำลอง charge taper จริง
- หากยังไม่มีสเปกแท่น ไม่ควรแปลง turnaround 600 s เป็น “ชาร์จเต็มภายใน 10 นาที” โดยไม่มีแหล่งที่มา ค่า prototype ที่เสนอจะต้องมีสถานะเป็นสมมติฐานที่แก้ได้ในโปรไฟล์

โครงสร้างข้างต้นเป็น proposal ยังไม่มี charging power หรือเวลาชาร์จจริงที่ผู้ใช้ยืนยันในคำตอบนี้ จึงไม่มีการแต่งสเปกขึ้นมาใน source

### 3.4 การแสดงผลและเวลาในเว็บไซต์

- คง 3 ขั้นตอนและ 4 calculators ใช้ charging timeline ภายใน Drone deployment
- ตัวอย่าง timeline: Sortie 1 → Return/land → Charging → Sortie 2 → … → Complete
- แสดงแต่ละเที่ยว: ช่วงพื้นที่/segments ที่ตรวจ ระยะ เวลา พลังงานเหลือตอนกลับ ระยะชาร์จ และเวลาออกเที่ยวถัดไป
- คำนวณเวลาจบรวม airborne + ground service + charge intervals + scheduling buffer โดยไม่บวกเวลา charging ซ้ำกับ turnaround เดิม
- เมื่อเวลา charge/profile เปลี่ยน ต้อง invalidate forecast coverage/review ที่เกี่ยวข้องและคำนวณใหม่จน stable โดยรักษา start anchor ตามระบบเดิม
- ถ้าทั้งภารกิจเกินขอบเขต 24h ให้เสนอแบ่ง mission windows/ชุดงานอย่างชัดเจน ไม่ตัด end เพื่อให้ GEE ผ่าน
- `Home coordinate ready`, `Reachable from station`, `Needs charging stops`, `Unreachable with full charge` ต้องเป็นคนละความหมาย

### 3.5 Export และ persistence

- รักษาหนึ่ง `.plan` ต่อเที่ยวที่กลับฐานได้ และเกณฑ์ shared validator ทั้ง browser/workspace
- เพิ่ม charging sequence ใน mission snapshot/report หรือ manifest แยกจาก QGC `.plan`; ไม่ใส่ property/คำสั่ง charger ที่ไม่รองรับลงไฟล์มาตรฐาน
- อาจให้ดาวน์โหลดชุดไฟล์พร้อมลำดับการใช้งานสำหรับภารกิจหลายเที่ยว โดยไม่รวมหลายแบตเป็นการบินต่อเนื่องเที่ยวเดียว
- Save/History เก็บ station/profile/timeline/remaining-work provenance ของ Inspector คนเดิม
- การโหลดแผนเก่าต้องไม่อ้างว่ามี measured charger model; ทำ migration เป็นสมมติฐาน/ยังไม่ได้กำหนดอย่างตรงไปตรงมา

### 3.6 เกณฑ์ทดสอบเมื่อ implement

ทุกรายการในส่วนนี้เป็น **designed_not_run**:

1. พื้นที่ทำไม่จบด้วยเที่ยวเดียว แต่ทุกจุดอยู่ในรัศมีไป–กลับ: แบ่ง return/charge/resume จนครบโดยไม่ block ทั้งพื้นที่
2. แต่ละเที่ยวรวม return/landing และเหลือ reserve ตามโปรไฟล์
3. หลัง charge พลังงานเที่ยวถัดไปเท่ากับ target ตาม model ไม่สะสมพลังงานเกินความจุ
4. ระยะเวลาชาร์จ/ground service ถูกนับครั้งเดียว และเวลาจบ/forecast ครอบคลุมทุกช่วง
5. Resume ใช้เฉพาะ segments/fractions ที่ยังเหลือ และ coverage ครบพอดี
6. จุดที่ไปแล้วกลับไม่ได้แม้ชาร์จเต็ม: ระบุ full-charge reachability อย่างชัดเจน ไม่สร้าง charging loop ปลอม
7. แก้ station/profile/time แล้ว revoke แผนเก่า; manual values/import ownership อยู่ครบ
8. Browser/workspace checks และ export manifest/selected `.plan` ตรงกัน; async/session/revision/hash guards ยังใช้ได้
9. Save/History/restore ของ charging profile และ legacy documents
10. UI มือถือ/loading/scroll และ actual download ของแผนที่มี charging stops

### 3.7 สถานะรับข้อกำหนดรอบนี้

- ยืนยัน charging/resume goal ตามคำตอบผู้ใช้ และปิดคำถามเลือกย้าย Home/ให้สเปกเดิมในฐานะ **superseded by requirement clarification**
- ยังไม่ได้เปลี่ยน Home/energy/charger assumptions ของภารกิจล่าสุด
- ตรวจ source ใหม่และอัปเดตเอกสาร/คิวเท่านั้น ไม่รัน CPU probes/full suite/build/browser/API/CI ใหม่ ไม่แก้ application code ไม่ push/deploy ไม่เปิด Billing/subscription
- ไม่มีการอ้างว่า charging timeline หรือแท่นชาร์จจริงถูก implement/test แล้วจากการอ่าน source รอบนี้

### 3.8 ลำดับแก้แบบ implementation ที่เสนอหลังผู้ใช้ขอรายละเอียด

สถานะส่วนนี้: **implementation proposal / designed_not_run** ยังไม่ได้ลงมือแก้ application และไม่ใช่สเปกแท่นที่ยืนยันแล้ว

| ลำดับ | งานและผลที่ต้องได้ | เกณฑ์จบช่วง |
|---|---|---|
| 1 | ตรวจความหมาย usable/reserve/charge target และสร้าง charging profile | หัก reserve เพียงครั้งเดียว; target หลังชาร์จไม่เกิน usable energy; manual/import ownership คงอยู่ |
| 2 | จัด remaining work และแบ่งเที่ยวด้วยค่า return/landing ที่ต้องเผื่อ | ถ้าทุกจุดเข้าถึงได้ แบ่งหลายเที่ยวจน coverage ครบ; ถ้าเข้าถึงไม่ได้ ให้บอก segment/เหตุผลโดยไม่ทิ้งงาน |
| 3 | สร้าง return/land/charge/resume events และคำนวณเวลารวม | พลังงานกลับ/หลังชาร์จและเวลาแต่ละ phase สอดคล้อง ไม่บวก turnaround ซ้ำ |
| 4 | ผูก shared checks, forecast และ UI | สถานะพร้อมไฟล์ตรงกับแผนปัจจุบัน; root reason และ action อ่านเข้าใจ; refresh ไม่วน |
| 5 | บันทึก/เปิดกลับ และ export ชุดภารกิจ | Save/History เก็บ configuration/ownership; `.plan` แยกเที่ยวตรง manifest; async guards คงอยู่ |
| 6 | ทดสอบ candidate ด้วยพื้นที่ reachable/needs-charge/unreachable | ได้ไฟล์จริงในกรณีที่ผ่าน และ block พร้อมเหตุผลตัวเลขในกรณีที่ไม่ผ่าน ก่อนพิจารณาเผยแพร่ตามคำสั่งที่เกี่ยวข้อง |

ไม่เพิ่ม role ใหม่ ไม่เพิ่มขั้นตอนที่ 4 ของ planner และไม่เปลี่ยนตัวคำนวณน้ำมัน/แคปซูลให้ผูกกับ charging

### 3.9 รายละเอียดโปรไฟล์เริ่มต้นสำหรับ prototype

เสนอเริ่มด้วย **fixed-duration charging stop** ก่อน เพราะยังไม่มี measured charging power, efficiency หรือ taper curve:

- ช่องที่มีความหมายกับผู้ใช้: charging stop duration, usable energy หลังชาร์จ, reserve หลังลงจอด
- ค่าเริ่มต้นที่เสนอสำหรับงานอ้างอิง: นำ ground interval **10 นาทีเดิม** มาเป็น **สมมติฐานระยะพัก/ชาร์จรวมของโปรไฟล์** โดยแสดงให้แก้ได้ ไม่เรียกว่าคุณสมบัติของแท่นจริงหรือรับประกันชาร์จเต็มจริงใน 10 นาที
- เมื่อนำ charging stop 10 นาทีเข้าตารางแล้ว ต้องเอา turnaround 10 นาทีเดิมออกจากการบวกซ้ำ
- ไม่ตั้งกำลังชาร์จหรือ efficiency สมมติขึ้นมาเพิ่ม และไม่ต้องให้ผู้ใช้สมัครบริการ/เปิด Billing เพื่อใช้แบบคำนวณนี้
- ใช้ข้อมูลกำลังชาร์จจริงคำนวณเวลาตาม Wh ที่เติมได้ภายหลัง หากมีแหล่งที่ยืนยัน ก่อนถือว่าเป็น measured model
- การเปลี่ยนค่าจาก 10 นาทีเป็นค่าอื่นกระทบเวลาจบ/forecast coverage ไม่เพิ่ม usable energy หรือเปลี่ยนระยะบินของแต่ละเที่ยวเอง
- ค่า 10 นาทีในหัวข้อนี้เป็น **proposed software planning assumption** ไม่ใช่คำตอบที่ผู้ใช้ให้เกี่ยวกับแท่นชาร์จ

### 3.10 ตัวอย่างเพื่ออธิบายการคิดพลังงานและเวลา

**ตัวอย่างสมมติสำหรับอธิบายเท่านั้น ไม่ใช่ผลภารกิจล่าสุดของผู้ใช้:** ใช้ usable energy 177.6 Wh, reserve 44.4 Wh, uniform power 600 W และพัก/ชาร์จตามสมมติฐาน 10 นาทีระหว่างเที่ยว

| Phase | พลังงานเริ่มเที่ยว | ใช้รวมบินไป/สำรวจ/กลับ/ขึ้นลง/เลี้ยว | เหลือตอนกลับ | เวลาบินรวม | ระยะพัก/ชาร์จหลังเที่ยว |
|---|---:|---:|---:|---:|---:|
| เที่ยว 1 | 177.6 Wh | 120 Wh | 57.6 Wh | 12 นาที | 10 นาที |
| เที่ยว 2 | 177.6 Wh | 125 Wh | 52.6 Wh | 12.5 นาที | 10 นาที |
| เที่ยว 3 | 177.6 Wh | 110 Wh | 67.6 Wh | 11 นาที | จบภารกิจหลังกลับ/ลงจอด |

ทุกเที่ยวเหลือมากกว่า reserve 44.4 Wh และใช้พลังงานไม่เกินงบ 133.2 Wh ของเที่ยวเดียว เวลาบินรวม 35.5 นาที + ระยะพัก/ชาร์จ 20 นาที + scheduling buffer 5 นาที = **60.5 นาที** การใช้หลายเที่ยวจึงไม่ได้หมายความว่าแบตก้อนเดียวต้องรองรับพลังงานรวม 355 Wh

พลังงานตอนกลับไม่ได้ถูกตั้งเป็นศูนย์ และไม่หักค่าขึ้น/ลง/สำรองซ้ำอีกหลังจาก sortie energy คิดครบแล้ว

### 3.11 การเปลี่ยนหน้าเว็บที่ผู้ใช้จะเห็น

1. ใช้พื้นที่และฐานเดิมตามที่กำหนด แล้วกด Prepare ตาม flow ปกติ
2. Flight plan มีสรุปจำนวนเที่ยว จำนวน charging stops เวลาบิน/พักชาร์จ และเวลาจบทั้งหมด
3. แสดงรายการ `Flight 1 → Return/Land → Charging → Flight 2 → … → Complete` พร้อมพื้นที่ที่ตรวจแล้ว/ส่วนที่เหลือในแผน
4. เลือกเที่ยวแล้วแผนที่แสดง outbound/survey/return ของเที่ยวนั้น และยังเปิดดูภาพรวมทั้งภารกิจได้
5. Charging profile อยู่ใน Mission settings; ไม่เพิ่มป้าย Prototype หรือ note ซ้ำ ข้อความ estimated/source/หน่วยอยู่ใกล้ค่าที่ต้องใช้ตัดสินใจ
6. เปลี่ยนข้อความหลักจาก generic blocked เป็น structured reason เช่น `Ready with charging stops`, `Charging duration needed`, `Cannot reach this area and return with a full planning battery`, `Conditions need refresh`
7. เหตุ full-charge reachability ต้องแสดง required/budget Wh และ action ที่เกี่ยวข้อง ไม่แนะนำให้แก้ Surface tolerance หรือเวลาเพื่อผ่าน battery failure
8. อาจมี `Download mission package` สำหรับทั้งชุด และคง `Download selected sortie` สำหรับ `.plan` เดี่ยว ชุด ZIP/manifest เป็นบรรจุภัณฑ์ของเว็บ ไม่อ้างว่า QGC จะอ่าน ZIP แล้วสั่งชาร์จ/เริ่มเที่ยวถัดไปได้เอง

### 3.12 โครงสร้าง source และผลลัพธ์ที่เสนอ

| โมดูล | งาน |
|---|---|
| `src/trial-flight.js` | รักษา energy/return/coverage partition; เพิ่ม diagnostics ของส่วนที่เข้าไม่ถึง ไม่ล้างผลจนไม่เหลือเหตุให้ผู้ใช้เข้าใจ |
| โมดูลใหม่เช่น `src/planning-charging.js` | Pure builder ของ charge stops, energy transitions, timeline และ configuration validation |
| `src/planning-schedule.js` | รวม duration ของ phases กับ buffer โดยไม่บวก turnaround ซ้ำ; รักษา start/refresh convergence |
| `src/planning-export-readiness.js` | Shared readiness ของชุดภารกิจและ model provenance; ไฟล์ที่สร้างต้องตรงกับ charge/flight sequence |
| `src/planning-trial-client.js` / `src/planning-readiness.js` / markup | สรุป/timeline/phase feedback, charging settings, selected-sortie map, clear root blockers |
| `src/trial-api.js` / `src/planning-file-api.js` | ทั้งสอง runtime คำนวณ charging plan จาก inputs ใหม่ ไม่เชื่อ `ready` ที่ client ส่งมา |
| `src/trial-export.js` / package helper ที่เสนอ | รักษา QGC Plan มาตรฐานต่อเที่ยว; แยก sequence/charge model ไว้ใน report/manifest ไม่ใส่ charger command ที่ไม่รองรับ |
| Contracts / Inspector document | เก็บ charging configuration แบบมี version/ownership; ผล derived คำนวณใหม่ ไม่ใส่ timeline ยาวทั้งก้อนใน request inputs จนเกินขนาด |

Derived output ที่เสนอประกอบด้วย flights, ground/charge stops, remaining-work coverage, energy transitions, timeline, readiness checks และ source/input hash ข้อมูลส่วนนี้ยังเป็นแบบออกแบบ ไม่ใช่ schema ที่ deploy แล้ว

### 3.13 กรณีล่าสุดของผู้ใช้และการรับงาน

- การ implement charging plan อย่างเดียว **ไม่ทำให้ภารกิจล่าสุดผ่านโดยอัตโนมัติ** ภายใต้ inputs เดิมที่ lower bound ต่อเที่ยว 137.9 Wh > budget 133.2 Wh
- ต้องตรวจความหมาย usable/reserve/target ให้ชัดจาก profile และแสดงขอบเขตที่เข้าถึงได้โดยไม่แก้ Wh/ย้ายฐานเงียบ ๆ
- หากพื้นที่ทุกส่วนอยู่ใน reachability ของหนึ่งเที่ยวไป–กลับ การแบ่งเที่ยว/ชาร์จต้องคำนวณต่อให้ครบเอง ไม่ให้ผู้ใช้แบ่ง Polygon ด้วยมือเพราะพลังงานรวมทั้งงานมากกว่าหนึ่งแบต
- หากมีส่วนที่อยู่นอกขีดจำกัดเต็มแบตจริงตามโมเดล ต้องแสดงส่วนนั้นและผล incomplete อย่างตรงไปตรงมา ไม่ส่งออกชุดที่อ้างว่าตรวจครบแต่ลบส่วนที่ไม่ถึงออก
- เกณฑ์จบ implementation ต้องมี browser download จริงพร้อมตรวจ flight files/manifest/coverage/energy และการทดสอบข้อมูลไม่พร้อม/เก่า/เกิน window ด้วย ไม่ถือว่าการ์ดแสดง timeline หรือปุ่มเปิดได้เป็นการจบงาน
