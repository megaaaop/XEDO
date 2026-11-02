# ตรวจสาเหตุพื้นที่ชุดใหม่ยังดาวน์โหลด .plan ไม่ได้

> อัปเดตหลังคำตอบผู้ใช้: ยืนยันเป้าหมายกลับแท่นชาร์จและทำงานต่อ คำถามเลือกHome/profileในรายงานเดิมถูก supersede แล้ว ดู [แผน return/charge/resume](RETURN_CHARGE_RESUME_PLAN_2026-10-31.md) ไม่ได้เลือกให้ย้ายHomeจากคำตอบนี้ ข้อคำนวณต่อเที่ยวด้านล่างยังเป็นหลักฐานตามinputsเดิม

## 1. หัวข้อ

- วันที่: 31 ตุลาคม 2026, Asia/Bangkok
- คำสั่งรอบนี้: ตรวจภาพล่าสุดและอธิบายว่าทำไม Planning review แล้ว Download planning file ยังถูกล็อก
- Source ในเครื่อง: `88a97ea1f4ae2bfe07e0334677b5801d19a417d3`; ไม่แก้ application code ในรอบตรวจนี้
- หลักฐาน: หน้ารายงานจริงใน Chrome, snapshot ภารกิจที่ดาวน์โหลดผ่าน UI, CPU reproduction จาก inputs เดียวกัน และการคำนวณทางเลือกแบบ offline
- รายละเอียดภารกิจ/พิกัดเก็บเฉพาะ `C:/mega/codex/iENA/outputs/XEDO_New_Area_Download_Diagnosis_2026-10-31/` ไม่ใส่ snapshot ส่วนตัวลง Git

## 2. สรุป

**ตัวบล็อกหลักคือพลังงานสำหรับไปจุดสำรวจไกลสุดและกลับ Home ไม่พอตามโปรไฟล์ปัจจุบัน** รหัส `SORTIE_INFEASIBLE` ไม่ใช่การบล็อกเพราะ Surface range 3.47 m หรือเพราะผู้ใช้ยังไม่ติ๊ก Planning review ในภาพ

เปิดรายงานเต็มพบ Camera/Wind ผ่าน แต่ Battery blocked และไม่มี assessed sorties ตัวคำนวณบน CPU ทำซ้ำด้วย snapshot จริงให้ผลเดียวกัน จุดสำรวจไกลสุดอยู่ห่าง Home ประมาณ **1,918.53 m** ขณะที่งบพลังงานให้รัศมีไป–กลับสูงสุดเพียง **1,848 m** ก่อนนับงานสำรวจและการเลี้ยว

คำนวณทางเลือกโดยคงพื้นที่/พลังงาน/โปรไฟล์เดิม แล้วเลื่อนเฉพาะ Home อ้างอิงเข้าหาพื้นที่: 150 m ได้ Battery pass/24 sorties; 200 m ได้ Battery pass/22 sorties ทางเลือกเหล่านี้เป็น **offline feasibility probes** ไม่ได้เปลี่ยน Home บนเว็บ ไม่ได้ตรวจว่าเป็นจุดปล่อยจริง และยังต้องโหลด GEE/Home/forecast และ review ใหม่ก่อนทดสอบ export

**รอคำตอบ:** ผู้ใช้จะให้เสนอ Home อ้างอิงใหม่บนแผนที่, คง Home แล้วให้สเปกโดรน/แบตเตอรี่ที่ยืนยันได้, หรืออธิบายอย่างเดียวก่อน ไม่มีการเพิ่มแบต ลด reserve หรือปลดล็อกปุ่มเพื่อให้ผ่านในรอบนี้

## 3. รายละเอียด

### 3.1 ข้อเท็จจริงจากหน้าเว็บและ snapshot

- UI ใช้ปุ่ม `Download planning file` และ boot entry `/assets/planner-GKAOXQGP.js` ของรุ่น repair ใหม่
- ในภาพผู้ใช้ Planning review ถูกเลือกแล้ว; Surface model เป็น Review needed ที่ range 3.47 m/tolerance 2 m
- เมื่อแท็บกลับมา active ข้อมูลที่พัก/หมดอายุถูกโหลดใหม่และ review ถูก reset ตาม lifecycle ของข้อมูล จึงไม่ใช้ checkbox false หลัง refresh ไปสรุปว่าผู้ใช้ลืมติ๊ก
- ขอบเขตและ Home ชุดนี้ต่างจากชุดที่ผ่านใน release ก่อน หน้าเว็บมี survey route ประมาณ **31,110.26 m** แต่ยังไม่มีเที่ยวที่ผ่านการประเมินแบตเตอรี่
- รายงานจริง: Wind `pass`, Battery `blocked`, assessed sorties `0`; ข้อความ `No remaining survey segment fits the energy/return/landing reserve and wind limits.`
- Surface evidence ที่รู้ครบถูกประเมินใน planning reference ตามเดิม; ความสูง relative-Home 50 m สูงกว่าตัวอย่าง DSM สูงสุด 3.4673 m จึงไม่ใช่ known-surface-conflict ในกรณีนี้
- เวลา 108.7 min ที่แสดงเป็น window จาก route estimate ก่อนมี assessed sorties ไม่ใช่เวลาบินต่อแบตเตอรี่หนึ่งก้อน

### 3.2 คำนวณขีดจำกัดไป–กลับ

| ค่า | Inputs/ผลคำนวณ |
|---|---:|
| Starting usable energy | 177.6 Wh |
| Landing reserve | 44.4 Wh |
| งบที่ใช้ได้ต่อเที่ยว | **133.2 Wh** |
| Uniform assumed power | 600 W = 10 Wh/min |
| Ground speed | 5 m/s |
| Takeoff + landing allowance | 30 + 30 = 60 s |
| ระยะ Home → survey point ไกลสุด | **1,918.5346 m** |
| รัศมีไป–กลับสูงสุดก่อนสำรวจ/เลี้ยว | **1,848 m** |
| พลังงานขั้นต่ำเพื่อไปจุดนั้นและกลับ รวม takeoff/landing แต่ยังไม่สำรวจ/เลี้ยว | **137.9023 Wh** |

สูตร lower bound:

```text
budgetWh = 177.6 − 44.4 = 133.2
availableDurationS = budgetWh / 600 × 3600 = 799.2 s
bareRoundTripTravelS = 799.2 − 60 = 739.2 s
bareMaxOneWayRadiusM = 739.2 × 5 / 2 = 1848 m

minimumTripWh = (2 × 1918.5346 / 5 + 60) × 600 / 3600
              = 137.9023 Wh > 133.2 Wh
```

นี่เป็น lower bound ของโมเดล uniform-power ที่ตั้งไว้ ยังไม่รวมงานสำรวจและ turn allowance ดังนั้นการเพิ่มจำนวนเที่ยวหรือหมุนแนวบินไม่สามารถแก้เที่ยวที่ต้องเข้าถึงจุดเกินระยะไป–กลับนี้ได้เอง แม้ GEE/checkbox จะครบ

### 3.3 ทางเลือกที่คำนวณจริงโดยไม่แก้ค่าบนเว็บ

ใช้ snapshot เดียวกัน เปลี่ยนเฉพาะ Home ในหน่วย UTM โดยเลื่อนตามทิศจาก Home เดิมไป vertex ไกลสุด ไม่ได้เปลี่ยน Polygon, usableWh, reserveWh, power, speed หรือ phases:

| ระยะเลื่อน Home อ้างอิง | Battery calculation | Sorties | พลังงานสูงสุด/เที่ยว |
|---|---|---:|---:|
| 0 m | blocked | 0 | — |
| 100 m | blocked | 0 | — |
| 150 m | pass | 24 | 133.1137 Wh |
| 200 m | pass | 22 | 131.6515 Wh |

ตารางนี้ยืนยันเฉพาะ feasibility ของ flight calculator จาก inputs ที่บันทึกไว้ **ไม่ใช่**ผล GEE ของ Home ใหม่, สถานที่ปล่อยจริงที่ตรวจยืนยัน หรือผลดาวน์โหลดบน Production ของจุดใหม่ การย้าย Home จริงต้อง revoke หลักฐานเดิม, โหลดข้อมูล/คำนวณเวลาใหม่ และตรวจ review ตาม flow

### 3.4 ข้อเสนอ UX ที่ยังไม่ได้ลงมือ

1. แสดงข้อผิดพลาดหลักว่า `Battery cannot reach the farthest inspection point and return to Home` พร้อม required/budget Wh และระยะ แทนให้ `Generate an unblocked trial route first` เป็นข้อความแรกทั้งที่มี route preview แล้ว
2. แยกความพร้อมของพิกัด Home ออกจาก reachability เพื่อไม่ให้คำว่า Home Ready ถูกตีความว่ารองรับแบตเตอรี่แล้ว
3. เพิ่ม action `Move Home` ใกล้สาเหตุ และแสดงขอบเขตระยะอ้างอิงของโปรไฟล์ โดยไม่ถือว่าภายในวงนั้นเป็นไซต์ปล่อยที่ผ่านการตรวจจริง
4. เมื่อไม่มี assessed sorties ให้ข้อความ condition-window อธิบายว่ารอแบ่งเที่ยวสำเร็จก่อนคำนวณ coverage แทนชวนแก้เวลาเองโดยยังไม่แก้ต้นเหตุแบตเตอรี่
5. เพิ่ม regression ของ farthest-point lower bound, feasible/infeasible Home, reserve/phase changes และการย้าย Home ที่ต้องโหลดหลักฐานใหม่ ถ้าผู้ใช้สั่ง implementation ต่อ

### 3.5 หลักฐานและขอบเขตรอบนี้

- `private-before.json`: controls/geometry จาก DOM ก่อนเปิดรายงาน
- `private-full-report.json`: ข้อความ blockers และรายงานจริง
- `private-current-snapshot.json`: snapshot จากปุ่ม Download mission snapshot
- `diagnosis.json`: CPU reproduction และ lower-bound calculation
- `private-home-options.json`: ทางเลือก 0/100/150/200 m ที่ไม่ได้ apply
- `battery-blocked.png`: ภาพผล Battery blocked ในรายงาน
- รัน fresh CPU reproduction และ 4 offline feasibility probes; **ไม่รัน full test suite/build/CI ใหม่** ผล 682 tests ของ release ก่อนเป็นหลักฐานเดิม ไม่ใช่ผลรอบนี้
- ไม่แก้ source ของเว็บ ไม่เปลี่ยน Home/แบตเตอรี่/ข้อจำกัดผู้ใช้ ไม่สร้าง `.plan` จาก candidate ที่ยังไม่ตรวจ GEE ไม่ push/deploy และไม่เปิด Billing/subscription
