# XEDO — บันทึกงานกลางและรายการที่ยังต้องแก้

## 1. หัวข้อ

**บันทึกสถานะเว็บไซต์ XEDO เพื่อทำงานต่อในแชทนี้และส่งต่อให้แชทอื่น**

- วันที่เริ่มบันทึก: **26 ตุลาคม 2026** ตามเวลา `Asia/Bangkok`
- อัปเดตล่าสุด: **27 ตุลาคม 2026 — เพิ่มโหมดพื้น Diagram / Satellite ใน 3D ผ่านการตรวจในเครื่อง เตรียมเผยแพร่**
- ไฟล์หลัก: `C:\mega\codex\iENA\github-publish\XEDO-hardware-release\docs\XEDO_WORK_LOG.md`
- โปรเจกต์ที่กำลังทำงาน: `C:\mega\codex\iENA\github-publish\XEDO-hardware-release`
- เว็บไซต์: [XEDO Production](https://xedo-eight.vercel.app/)
- Repository: [megaaaop/XEDO](https://github.com/megaaaop/XEDO)
- จุดประสงค์รอบนี้: เพิ่มพื้น 3D สลับ Diagram เดิม / Satellite จาก GEE จริง คงขนาด preview และพื้นเดิม แล้ว push/deploy เว็บหลัก
- สถานะปัจจุบัน: เขียนแผนก่อน code ใน Markdown ทั้งสองแล้ว ผ่าน syntax/tests **482/482** และ build ทั้ง 3 รูปแบบ รวม browser ในเครื่องที่โหลด GEE จริง ตรวจ desktop/mobile แล้ว เตรียม push/deploy
- **คำอนุญาตล่าสุด:** ผู้ใช้อนุญาตแก้ code, push และ deploy โหมดพื้น 3D นี้โดยตรง ขอบเขตนี้ไม่ครอบคลุมการเริ่มทุก feature ที่ยังอยู่ในคิว

**กติกาตามคำสั่งผู้ใช้:** ทุกครั้งที่ทำงานกับ XEDO ต้องอ่านไฟล์นี้ก่อนเริ่ม และบันทึกหรือแก้ไขไฟล์นี้ก่อนจบรอบ แม้รอบนั้นมีเพียงการรับข้อกำหนด วางแผน ตรวจสอบ หรืออัปเดตเอกสาร ให้เก็บโครงสร้างหลัก 3 ส่วนคือ **หัวข้อ / สรุป / รายละเอียด** ไว้เสมอ

**กติกาเพิ่ม 27 ต.ค.:** งานแก้/ตรวจเว็บไซต์ลักษณะนี้ต้องบันทึกสองที่: ไฟล์นี้เก็บประวัติ ผลตรวจ และการเผยแพร่; `docs/WEBSITE_DETAILS.md` เก็บโครงสร้าง พฤติกรรม dependency และรายละเอียดวิธีแก้ อัปเดตทั้งสองก่อนจบรอบ และรักษาคิว JSON ให้ตรงกัน

## 2. สรุป

### สถานะล่าสุดที่มีหลักฐาน

**รอบ 3D satellite ground 27 ต.ค. 2026:** เพิ่มปุ่ม Diagram / Satellite ใช้ภาพ tile GEE Sentinel-2 ตามพิกัดพื้นเดิม ไม่ใช้ thumbnail; source mosaic มีวันที่และความละเอียดแยกจากภาพ review; ผ่าน **482 tests** และ3builds ตรวจ browser โหลดภาพจริง/สลับโหมด/หมุนด้วย keyboard/กรอบ440pxdesktopและ340pxmobile/AOIเดิม/ไม่มีแนวนอนล้น390pxแล้ว สถานะก่อน push: local verified ยังไม่อ้างว่าเผยแพร่จนกว่าจะตรวจ deployment

**ชุดแก้ล่าสุด 27 ต.ค. 2026 เผยแพร่แล้ว:** GEE status/progress/error, ภาพบริบทรอบ AOI ประมาณ1กม., module/rendering cleanup และ scroll performance ที่ code commit `8452df2939d7a839885077e574ee6901944b6a91` ตรวจ deployment `dpl_FhXkVvUtYWRAA8rkqZkJwFeC5JBe` READY และ alias เว็บหลักตรงรุ่นนี้ CI [40484759102](https://github.com/megaaaop/XEDO/actions/runs/40484759102) success ผลทดสอบใหม่ **458 ผ่าน / 0 ล้มเหลว / 0 ข้าม**; browser ตรวจภาพและ GEE stages33→100/source Ready พร้อม intentional INPUT/HTTP422 แล้วคืนข้อมูลได้ เก็บรายละเอียดในรอบประจำวันท้ายไฟล์

บันทึก deployment ข้างต้นเป็นหลักฐานของ **ชุดโค้ดที่ตรวจแล้ว** ก่อน commit เอกสารผลตรวจนี้ การ push เอกสาร follow-up ในรอบเดียวกันอาจทำให้ Git SHA ของ deployment เปลี่ยนโดย application bundle ไม่เปลี่ยน ให้ดู receipt ใน `output/release-check/gee-status-context-scroll-2026-10-27/` สำหรับ identity สุดท้าย ห้ามนำผล 428 tests ของ release เก่าด้านล่างมาแทนผลรอบนี้

งานข้อเดิม **1–2 แก้ ทดสอบ push และ deploy แล้ว** ที่ commit `8b1a7220010e0f927739b6a8d14ca0f761e85e78` เว็บยังคง flow **3 ขั้นตอน** และตัวคำนวณ **4 ส่วน** ผลทดสอบก่อนเผยแพร่ล่าสุดคือ **428 ผ่าน / 0 ล้มเหลว / 0 ข้าม** รวมทั้งตรวจ API และใช้งานผ่านหน้า Production หลัง deploy แล้ว

ผล 428 tests และ release เดิมอ้างอิงหลักฐานการเผยแพร่เมื่อ 26 ตุลาคม 2026 ในรอบตรวจเว็บก่อนหน้านี้ทดสอบ flow โดยไม่เชื่อม Pi: normal flow สร้างเส้นทางได้ 1.86 กม. แต่ยังดาวน์โหลดไม่ได้เพราะค่า flight/export ไม่ครบ ส่วน Estimated demo ดาวน์โหลด `.plan` 20 items ได้จริง รอบรับคำตอบบัญชีนี้ไม่ได้ทดสอบเว็บซ้ำ ข้อมูลสภาพแวดล้อมและเวลาของแผนเป็นของรอบทดสอบเดิม ต้องโหลดและตรวจความสดใหม่เมื่อเริ่มภารกิจใหม่

### ลำดับใหม่สำหรับงานที่เหลือ — ใช้อ้างอิงคำสั่งถัดไป

**ประเด็นที่เพิ่มในข้อใหม่ 1:** ภาพผู้ใช้แสดงว่า GEE context ใช้งานไม่ได้และไม่มี Home elevation ให้ใช้ ยืนยันจากโค้ดว่าหน้าจอรวมข้อผิดพลาดหลายแบบเป็นข้อความเดียวและแนะนำ local server แม้เปิด Production สาเหตุจริงของคำขอผู้ใช้ยังไม่ยืนยัน API พื้นที่อ้างอิงที่ตรวจเวลา 14:17 น. ไทยยังตอบ terrain/landcover/quality ได้ จึงไม่สรุปว่าทั้งระบบล่ม นอกจากนี้ผู้ใช้ยืนยันรูปแบบเวลาที่ต้องการคือ **กรอกเวลาเริ่มบิน แล้วเว็บคำนวณเวลาจบเอง** ซึ่งต้องปรับจาก implementation ปัจจุบัน รายละเอียดอยู่ในข้อ 3.5 ด้านล่าง

**เหลืองานหลัก 4 ขั้น และงานที่พักไว้อีก 2 รายการ รวมงานที่ยังไม่เสร็จ 6 รายการ** ข้อเดิม 1–2 เสร็จและเผยแพร่แล้ว จึงไม่รวมในจำนวนนี้

| เลขใหม่ | เลขเดิม | งาน | สถานะ/เกณฑ์ที่ต้องทำต่อ |
| --- | --- | --- | --- |
| **1** | **3** | เตรียม normal flow ให้สร้างแผนได้ครบ | GEE diagnostics/progress เผยแพร่แล้ว; profile ปกติและเวลาเริ่มกรอกเอง/เวลาจบอัตโนมัติยังอยู่ในคิว |
| **2** | **4** | เก็บ UX และวางแผนความพร้อมใช้งาน/เผยแพร่ | ภาพบริบท 1 กม./scroll และ module cleanup เผยแพร่แล้ว; งาน UX ที่เหลือ เช่นเอาป้าย Prototype ออกทั้งหมดและ capacity ยังไม่รวม release นี้ |
| **3** | **5** | บัญชี Inspector ภารกิจส่วนตัว Save และ history | ข้อกำหนดหลักตอบครบแล้ว: ทีมสร้างบัญชี อีเมล/รหัสผ่าน ไม่มี Google เห็น/แก้เฉพาะภารกิจตนเอง; ยังไม่ implement |
| **4** | **6** | เชื่อม AI → Inspector review → พื้นที่บินตรวจ → planner | ขยายแผนละเอียดใน `docs/AI_INTEGRATION_PLAN.md` แล้ว: fixture/contract/adapter/review/planner → private history → ภาพใหม่/worker; ยังไม่ implement หรือทดสอบ |
| **5** | **7** | Pi / ภาพ / telemetry | **พักตามคำสั่งผู้ใช้** ไม่จำเป็นต่อเป้าหมายวิเคราะห์พื้นที่เสี่ยงและสร้างแผนก่อนบิน |
| **6** | **8** | ผลทดลองและรายงานก่อน–หลัง | **งานค้าง — ยังไม่ทำตามคำสั่งผู้ใช้** ไม่เป็นเงื่อนไขปิด planner |

การรับคำสั่งใหม่ที่ระบุเพียง “ข้อ 1/2/3…” ให้ใช้ **เลขใหม่** จากตารางนี้ หากผู้ใช้บอก “เลขเดิม” หรืออ้างข้อความเก่า ให้จับคู่ตามบริบท รายละเอียดเชิงเทคนิคและประวัติที่บันทึกก่อนรอบเรียงใหม่นี้ รวมทั้ง HTML แผน AI เดิม ยังใช้เลขเดิมเมื่อไม่ได้ระบุว่าเป็นเลขใหม่

คำอนุญาต push/deploy ก่อนหน้านี้เป็นของ **ข้อเดิม 1–2 ที่เสร็จแล้ว** ไม่ใช่คำอนุญาตเผยแพร่ข้อใหม่ 1–2 โดยอัตโนมัติ การทดสอบเป็นเกณฑ์จบของแต่ละขั้นและรอบ release ไม่เพิ่มเป็นขั้นงานใหม่ที่นับซ้ำในตารางนี้

### สถานะคิวตามเลขเดิม — เก็บไว้เทียบประวัติ

| เลขเดิม | งาน | สถานะ | สิ่งที่ต้องทำต่อ |
| --- | --- | --- | --- |
| 1 | Planner, Launch / Return, schedule, readiness และ UI | **เสร็จและเผยแพร่แล้ว** | รักษาพฤติกรรมเดิมเมื่อแก้งานถัดไป |
| 2 | ทดสอบ GEE และข้อมูลสภาพแวดล้อมจริง | **เสร็จและเผยแพร่แล้ว** | ตรวจซ้ำตามพื้นที่และเวลาของแต่ละภารกิจ ไม่ถือว่ารอบเดียวครอบคลุมทุกพื้นที่ |
| 3 | ใช้โปรไฟล์โดรนจำลองที่คิดไว้แล้วใน flow หลัก | **ร่างแผนแล้ว ยังไม่ได้ลงมือ** | แยกโปรไฟล์เครื่องจำลองออกจากโหมดข้อมูลตัวอย่าง ให้ flow ปกติคำนวณได้โดยใช้ข้อมูลภารกิจจริง |
| 4 | ทำ UX ให้เหมือนเว็บไซต์ใช้งานจริง และวางแผนรองรับการใช้งานจริง | **ร่างแผนแล้ว ยังไม่ได้ลงมือ** | เอาป้าย Prototype ออกทั้งหมดตามคำสั่งล่าสุด ลบ note ซ้ำ จัด flow หลัก; บันทึกแผนตรวจรับ/capacity สำหรับอนาคต ยังไม่ทดสอบในรอบวางแผน |
| 5 | บัญชี Inspector, บันทึกภารกิจ และประวัติ | **ยืนยันข้อกำหนดหลักแล้ว ยังไม่ลงมือ** | เห็น/แก้เฉพาะภารกิจตนเองช่วงทดลอง; login อีเมล/รหัสผ่านบน XEDO ไม่มี Google; ทีมสร้างบัญชีให้ผู้ทดลองก่อน |
| 6 | เชื่อมผล AI เข้าหน้าเว็บ | **จัดทำแผนละเอียดใน HTML แล้ว ยังไม่ลงมือเชื่อม** | เริ่มจากผล SAR ที่มี georeference เป็น fixture → Inspector ตรวจเลือกพื้นที่เสี่ยง → planner; แยกพื้นที่เสี่ยงจากหลักฐานน้ำมัน/ความหนา |
| 7 | เชื่อมภาพและ telemetry จาก Raspberry Pi / โดรน | **พักตามคำสั่งผู้ใช้** | ไม่จำเป็นต่อเป้าหมายวิเคราะห์พื้นที่เสี่ยงและสร้างแผน; ตรวจแล้วไม่มี Pi dependency |
| 8 | ผลทดลองและรายงานภารกิจ | **งานค้าง — ยังไม่ทำตามคำสั่งผู้ใช้** | เก็บไว้สำหรับอนาคต ไม่เป็นเงื่อนไขการสร้างแผนตรวจพื้นที่ |

**ลำดับทำต่อคือข้อใหม่ 1 → 2 → 3 → 4** ซึ่งตรงกับข้อเดิม 3 → 4 → 5 → 6 งานบัญชีได้คำตอบหลักครบแล้ว ไม่ต้องนำงานฮาร์ดแวร์จริงหรือ Pi มาขวางการปิดเว็บไซต์จำลอง

### ข้อกำหนดที่ผู้ใช้ยืนยันแล้ว

- เว็บไซต์เป็น **functional prototype** แต่หน้าตาและการใช้งานต้องเหมือนเว็บไซต์ที่ใช้งานจริง
- **คำสั่งล่าสุดแทนข้อกำหนดเดิม:** เอาป้าย Prototype ออกทั้งหมด รวม mark/note ที่พูดซ้ำว่าเป็น prototype; ไม่คง badge จุดเดียวตามแผนเก่า การเปลี่ยนข้อกำหนดนี้ยังไม่ได้แก้ตัวเว็บจริง
- งานในคิวยังต้องได้รับคำสั่งเริ่ม implementation; รอบวินิจฉัย GEE นี้อ่าน source/log/deployment และเรียกข้อมูลอ้างอิงแบบจำกัด ไม่ถือว่าเริ่มทำทุกข้อในคิว
- คง 3 ขั้นตอน: **เลือกพื้นที่ → ตรวจภาพดาวเทียม → เตรียมแผนโดรน**
- คงตัวคำนวณทั้ง 4 ส่วน: **Drift / กล้อง–การบิน–แบตเตอรี่ / Export–readiness / น้ำมัน–แคปซูล**
- **ข้อกำหนดเวลาล่าสุด:** ผู้ใช้กรอกวัน/เวลาเริ่มบิน แล้วเว็บคำนวณเวลาจบจากระยะเวลาภารกิจ จำนวน sortie ช่วงพักเปลี่ยนแบตและ buffer ที่ใช้ในโมเดล ปรับแผนแล้วรักษาเวลาเริ่มที่เลือกไว้ คำนวณเวลาจบใหม่ ข้อกำหนดนี้เป็นงานค้างเพิ่มในข้อใหม่ 1 ไม่ใช่พฤติกรรมที่ implement แล้ว
- ผู้ใช้ทุกคนมี role เดียวคือ **Inspector** และเข้าถึงตัวเลือกและฟังก์ชันที่จัดให้ได้ครบเท่ากัน
- ช่วงทดลอง Inspector เห็นและแก้ได้เฉพาะภารกิจของตนเอง ยังไม่เปิดแชร์ภารกิจข้ามบัญชี
- ใช้หน้า login ของ XEDO ด้วยอีเมล/รหัสผ่านตามคำถามเดิม ไม่ใช้ Google sign-in
- ทีมสร้างบัญชี Inspector ให้ผู้ทดลองก่อน ยังไม่เปิดให้สมัครบัญชีเองผ่านเว็บ
- Inspector ตรวจหาน้ำมันเบื้องต้นในเว็บไซต์ แล้วเว็บไซต์สร้างแผนการบินจากผลตรวจและข้อมูลภารกิจให้
- ผู้ใช้ชี้แจงเพิ่มเติมว่าเป้าหมายปัจจุบันคือ **วิเคราะห์จุด/พื้นที่เสี่ยงก่อนบิน แล้วสร้างแผนให้โดรนไปตรวจ** จึงไม่ต้องรอภาพหรือ telemetry จาก Pi
- ข้อ 7 พักไว้ตามคำสั่งผู้ใช้ ส่วนข้อ 8 ให้ mark เป็นงานค้าง ยังไม่ลงมือทำ
- คำสั่งใหม่อาจเป็นการสั่งต่อคิวล่วงหน้า ต้องแยกการรับ requirement ออกจากการลงมือทำ
- หากมีเรื่องที่ผู้ใช้ยังไม่ได้ตอบ ให้ทำเครื่องหมาย **รอคำตอบ** ในการตอบครั้งถัดไป
- การอนุญาต push/deploy ที่ได้รับแล้วครอบคลุมงานข้อ 1–2 ซึ่งเผยแพร่เสร็จแล้ว ไม่ใช่การสั่งให้ลงมือและเผยแพร่งานทุกข้อในคิวโดยอัตโนมัติ

### คำตอบที่ยืนยันแล้วและคำถามค้าง

| รหัส | เรื่อง | คำตอบผู้ใช้ | สถานะ |
| --- | --- | --- | --- |
| `mission_data_visibility` | สิทธิ์ดูและแก้ข้อมูลภารกิจ | เฉพาะภารกิจของตนเองก่อนในช่วงทดลอง | **ตอบแล้ว — 26 ต.ค. 2026** |
| `sign_in_method` | วิธีเข้าสู่ระบบ | อีเมล/รหัสผ่านผ่านหน้า XEDO ไม่ผ่าน Google | **ตอบแล้ว — 26 ต.ค. 2026** |
| `trial_account_provisioning` | การเริ่มมีบัญชีช่วงทดลอง | ทีมสร้างบัญชีให้ผู้ทดลองก่อน ไม่เปิดสมัครเอง | **ตอบแล้ว — 26 ต.ค. 2026** |

ด้านบัญชีตอบครบแล้ว การเลือก backend/library และรายละเอียด account setup/recovery จะออกแบบเมื่อเริ่ม implementation ตามข้อกำหนดที่ยืนยันแล้ว

| รหัสวินิจฉัยเพิ่มเติม | เรื่อง | สถานะ |
| --- | --- | --- |
| `gee_error_environment` | ภาพ error มาจากที่ไหน | **ตอบแล้ว:** เว็บออนไลน์ `xedo-eight.vercel.app` |
| `mission_start_and_end_time_behavior` | เวลาในเหตุการณ์และรูปแบบที่ต้องการ | **ตอบแล้ว:** ตอนเกิด error ใช้เวลาอัตโนมัติ; ต้องการกรอกเวลาเริ่มบินและให้ระบบคำนวณเวลาจบ |
| `gee_error_mission_context` | พื้นที่/พิกัดประกอบเหตุการณ์ | **ได้รับบริบทเพิ่ม:** ภาพล่าสุดแสดง Home `12.66105, 101.1288`; ยังไม่ใช่ polygon/request ของ error เดิมครบถ้วน แต่ไม่ขวางชุดแก้ status/map/scroll ที่สั่งใหม่ |

## 3. รายละเอียด

### 3.1 วิธีใช้บันทึกนี้ในทุกแชท

1. อ่านบันทึกนี้และ `docs/implementation-queue.json` ก่อนเริ่มทำงาน XEDO
2. ตรวจ working directory, Git status และงานที่แชทอื่นกำลังแก้ เพื่อไม่ทำผิดสำเนาโปรเจกต์หรือทับงานกัน
3. ใช้คำสั่งล่าสุดของผู้ใช้เป็นข้อกำหนดหลัก หากเปลี่ยนจากแผนเดิมให้แก้บันทึกให้ตรง พร้อมระบุว่าเปลี่ยนอะไร
4. แยกสถานะ **รับ requirement / วางแผน / กำลังทำ / เสร็จในเครื่อง / ทดสอบแล้ว / เผยแพร่แล้ว / รอคำตอบ** ห้ามใช้แทนกัน
5. ก่อนจบรอบ อัปเดตส่วนสรุป รายละเอียดงานที่เปลี่ยน ผลตรวจ ข้อจำกัด และบันทึกประจำรอบในข้อ 3.10
6. หากเป็นงานเอกสารหรือยังไม่ได้แก้ code ให้เขียนตรง ๆ ว่าไม่มีการแก้ฟังก์ชันและไม่ได้รันทดสอบซ้ำ
7. ถ้า status หรือ requirement ใน JSON เปลี่ยน ให้อัปเดต JSON ให้ตรงกับ Markdown ด้วย
8. ก่อนเขียนไฟล์ ให้เปิดอ่านรุ่นล่าสุดอีกครั้งหากมีหลายแชททำงานร่วมกัน เก็บรายการของแชทอื่นและเพิ่มรายการของตนเอง ห้ามเขียนทับจากสำเนาเก่า
9. ใช้ไฟล์นี้เป็นบันทึกหลักไฟล์เดียว ไม่สร้าง work log หลายฉบับที่สถานะขัดกัน
10. ไม่ใส่ secret, token, private key, credential หรือเนื้อหา `.env` ลงในบันทึกหรือหลักฐาน

มี `AGENTS.md` ที่ workspace และ repository ชี้มาไฟล์นี้ เพื่อให้แชทอื่นพบกติกาได้ ส่วนไฟล์หลักอยู่ใน repository เพื่อเตรียมให้ติดตามประวัติผ่าน Git ได้ในรอบเผยแพร่เอกสารภายหลัง

### 3.2 สิ่งที่แก้แล้วในข้อ 1 — Planner และความพร้อมของแผน

| เรื่อง | การแก้ที่ทำแล้ว | พฤติกรรมที่ต้องรักษา | Source / tests หลัก |
| --- | --- | --- | --- |
| Launch / Return | เลือก ย้าย และล้างจุดได้; กดเลือก/ย้ายแล้วพาไปแผนที่ | ระหว่างเลือกจุดต้องล็อกดาวน์โหลด; Cancel คืน readiness เดิม; เลือกจุดใหม่ล้างผลตรวจเดิมและคำนวณใหม่ | `src/planning-trial-client.js`, `src/planning-readiness.js`, `tests/planning-readiness.test.mjs`, `tests/planning-workflow.test.mjs` |
| เวลาเริ่มบิน | ยึดเวลา 1 ชั่วโมงหลังวิเคราะห์สำเร็จ | Refresh ปกติไม่เลื่อนเวลาไปเรื่อย ๆ; Replan สร้าง anchor ใหม่และล้าง review เก่า; มี buffer และเวลาระหว่าง sorties ตาม schedule | `src/planning-schedule.js`, `tests/planning-schedule.test.mjs` |
| Flight readiness | แสดง Launch / Return, Takeoff time, Surface model และ Route & airspace พร้อมเหตุผล | ค่าที่ขาด หมดอายุ หรือเปลี่ยนพื้นที่ต้องไม่คง readiness เก่า; ตรวจ readiness อีกครั้งหลังรอผล export ก่อนดาวน์โหลด | `src/planning-readiness.js`, `src/planning-trial-client.js`, `src/planning-readiness.css` |
| Terrain / Home / route | ตรวจพื้นที่ Home และตัวอย่างตามเส้นทางพร้อม provenance | ต้องตรงกับพื้นที่ จุด และภารกิจปัจจุบัน; ไม่ใช้ผลตรวจเก่าแทนบริบทใหม่ | `src/planning-terrain.js`, `src/planning-route-samples.js`, `src/planning-geospatial-gate.js`, tests ที่ตรงชื่อโมดูล |
| GEE basemap timeout | ลองใหม่อัตโนมัติหนึ่งครั้งสำหรับปัญหาชั่วคราว; ยกเลิกคำขอเก่าเมื่อเปลี่ยนบริบท | ไม่ retry ไม่จำกัด; deadline ครอบคลุมการอ่าน response body; คำตอบเก่าต้องไม่ทับพื้นที่ใหม่ | `src/planning-basemap.js`, `tests/planning-basemap-recovery.test.mjs` |
| สถานะข้อมูล GEE | แยกครบ / บางส่วน / ใช้ไม่ได้ให้ตรงผลจริง | Unknown ต้องไม่ถูกแทนด้วยศูนย์; ข้อมูลบางส่วนต้องไม่แสดงเป็นพร้อมทั้งหมด | `src/gee-mission-context.js`, `src/planning-geospatial-ui.js`, `src/planning-geospatial-gate.js` |
| Saved survey / snapshot | โหลดแบบรักษาภารกิจเดิมเมื่อโหลดไม่สำเร็จ; มี timeout และ revision guards | ผลที่ตอบช้าต้องไม่ทับพื้นที่ที่ผู้ใช้เริ่มวาดใหม่; ยังไม่เท่ากับ hosted mission history | `src/planning-trial-client.js`, `src/trial-api.js`, `tests/planning-source-load.test.mjs` |
| Observation time | เปลี่ยนภาพแล้วอัปเดตเวลาอัตโนมัติให้ตรง acquisition | รักษาเวลาที่ผู้ใช้แก้เองหรือนำเข้า; วันเวลาผิดรูปแบบ/เกินช่วงรองรับต้องไม่ทำให้พร้อมค้าง | `src/planning-trial-client.js`, `tests/planning-observation-time.test.mjs` |
| Dialog และ focus | Readiness dialog ไม่ดึง focus กลับจนใช้งานแผนที่/settings ไม่ได้ | ย้ายจุดและกลับจาก dialog ได้ตาม flow | `src/planning-trial-client.js`, `src/planning-readiness.js` |
| 3D และข้อความช่วยเหลือ | แยก Reset กับ caption คนละแถว; ปรับ Help ให้ตรงพฤติกรรม | ไม่ซ้อนกันเมื่อใช้ desktop/mobile; คง 2D/3D และ 3-step workflow | `public/planning.html`, `src/planning-trial.css`, `src/planning-help-content.js`, `src/planning-help.css` |

Release นี้เปลี่ยน source, tests, scripts และเอกสารรวม **33 ไฟล์** รายการที่แน่นอนตรวจได้จาก `git show --name-only 8b1a722` ไม่รวม `.env`, credentials, output, dist และไฟล์คิวที่ยังอยู่เฉพาะในเครื่อง

### 3.3 สิ่งที่ทำแล้วในข้อ 2 — ทดสอบข้อมูลจริงและการใช้งาน

- ทดสอบผ่าน server ในเครื่องกับ GEE imagery, ลม/กระแสน้ำ, planning context, terrain ของ Home/พื้นที่/route และ land cover
- เพิ่ม `scripts/check-planning-live.mjs` และคำสั่ง `npm run test:planning:live` สำหรับตรวจ live planning ผ่าน loopback server รวม freshness และ coverage ของช่วงภารกิจ
- ตรวจผ่าน browser ในเครื่อง: เลือก/ย้าย/ยกเลิกจุด, Replan, 2D/3D, ปุ่มดาวน์โหลด และรูปแบบไฟล์ `.plan`
- ตรวจหน้าจอที่ความกว้าง **390 และ 1280 px** ในรอบ local QA ไม่พบแนวนอนล้น ไม่ใช่การรับรอง accessibility ทุกเกณฑ์
- ทดสอบ export เดโมได้ไฟล์รูปแบบ `Plan` / `QGroundControl` / version `1` มี **20 mission items** และ commands `[22, 178, 16, 21]`

| การตรวจในรอบเผยแพร่ | ผลที่บันทึกไว้ |
| --- | --- |
| `npm run check` | ผ่าน |
| `git diff --check` | ผ่าน |
| `npm test` | **428 ผ่าน / 0 ล้มเหลว / 0 ข้าม** ด้วยคำสั่งมาตรฐาน |
| `npm run build` | ผ่าน |
| `npm run build:workspace` | ผ่าน |
| `npm run build:file` | ผ่าน |
| Live APIs ผ่าน localhost | ผ่านในพื้นที่และช่วงเวลาทดสอบ |
| Browser local desktop/mobile | ผ่านรายการที่ระบุข้างต้น |

ผล 389 tests ที่ปรากฏในเอกสารรุ่นก่อนเป็น baseline เก่า ไม่ใช่จำนวนล่าสุดของ release นี้ รอบเขียนบันทึกครั้งแรกไม่ได้รัน tests ทั้งชุดซ้ำ เพราะไม่มีการแก้ code

### 3.4 หลักฐาน push และ deploy ที่ทำแล้ว

| รายการ | ค่าอ้างอิง |
| --- | --- |
| วันที่เผยแพร่ตามเวลาไทย | 26 ตุลาคม 2026 |
| Commit | `8b1a7220010e0f927739b6a8d14ca0f761e85e78` |
| Commit message | `Complete planner readiness and live-data recovery` |
| Branch ที่ push | `codex/xedo-hardware-profile` และ `main` |
| Production source branch | `main` |
| Production URL | https://xedo-eight.vercel.app/ |
| Vercel project | `xedo` |
| Production deployment ID | `dpl_H1ApPeo75RkdzX18Q9BoK6KzJtLC` |
| Deployment status ณ รอบตรวจ | `READY` |
| GitHub CI ของ main | [40232608329 — success](https://github.com/megaaaop/XEDO/actions/runs/40232608329) |
| GitHub CI ของ feature branch | [40231695568 — success](https://github.com/megaaaop/XEDO/actions/runs/40231695568) |

ผลตรวจ Production หลัง deploy:

- หน้าเว็บตอบ HTTP 200 และ normalized HTML hash ตรงกับ build ที่ทดสอบในเครื่อง
- Imagery search คืน 12 scenes; ภาพที่ตรวจคือ Sentinel-2 acquisition `2026-10-22T03:54:51.573Z`
- Environment ตอบ `complete`; readiness ของ drift และ flight ผ่านสำหรับช่วงภารกิจทดสอบ
- แหล่ง wind ที่ตรวจเป็น `gfs_global` ความละเอียดประมาณ 13 กม.; current เป็น `meteofrance_currents` ประมาณ 9 กม.
- GEE context ตอบ `complete`; terrain, land cover, quality และ forecast assessment เป็น ready ในบริบททดสอบ; terrain samples 54/54
- Browser บน Production ผ่าน 3 ขั้นตอนใน Estimated demo จน readiness **4/4** และดาวน์โหลด `.plan` 20 items ได้
- Move point ทำให้เหลือ **3/4** และปิดดาวน์โหลด; Cancel คืน **4/4**
- Replan เปลี่ยนเวลา takeoff จาก `21:53:39 UTC` เป็น `21:54:14 UTC` และ reset Route & airspace review ทำให้ปิดดาวน์โหลดจนยืนยันใหม่
- เปิดตัวคำนวณครบ 4 ส่วน และตรวจภาพ 3D พร้อมตำแหน่ง Reset/caption แล้ว

หลักฐานในเครื่องอยู่ใต้ `C:\mega\codex\iENA\github-publish\XEDO-hardware-release\output\release-check\`:

| ไฟล์/โฟลเดอร์ | เนื้อหา |
| --- | --- |
| `steps12-2026-10-26/` | หลักฐาน local QA ก่อนเผยแพร่ |
| `deploy-2026-10-26/release-receipt.json` | ขอบเขต release, commit, deployment, CI และผลตรวจ |
| `deploy-2026-10-26/production-api.json` | ผลตรวจ Production API พร้อม checkedAt และ source metadata |
| `deploy-2026-10-26/production-demo.plan` | ไฟล์ที่ดาวน์โหลดจาก Production จริง |
| `deploy-2026-10-26/production-ready.jpg` | ภาพหน้าเว็บจริง readiness 4/4 และ 3D |

โฟลเดอร์ `output/` ถูก ignore จึงอาจไม่มีใน checkout ของแชทอื่น ให้ใช้ commit, CI และบันทึกนี้ประกอบ และหากต้องยืนยันสถานะออนไลน์ปัจจุบันต้องตรวจ deployment ใหม่ ผลตรวจครั้งนี้ไม่ใช่ SLA หรือหลักฐาน coverage ทุกชายฝั่ง

เวลา API proof คือ `2026-10-25T20:51:24.041Z` หรือ **26 ตุลาคม 2026 เวลา 03:51 น. ประเทศไทย** ค่า `expiresAt` ในหลักฐานผ่านไปแล้วเมื่ออ่านในภายหลัง จึงใช้เป็นประวัติการทดสอบเท่านั้น แบบจำลอง terrain ที่ตรวจเป็น Copernicus DSM ประมาณ 30 ม. / EGM2008 ใช้ sparse samples และ tolerance ในโมเดล ไม่ได้วัดสิ่งกีดขวาง ระดับจุดขึ้นบินจริง หรือยืนยันระยะ clearance ของการบินจริง

### 3.5 งานค้างข้อ 3 — ใช้โปรไฟล์จำลองใน flow หลัก

**ปัญหาปัจจุบัน:** มีโปรไฟล์ที่คำนวณไว้แล้วใน Estimated demo แต่ flow ปกติยังแยกจากโปรไฟล์ดังกล่าว ผู้ใช้ยืนยันว่าเว็บไซต์เป็นการจำลอง จึงไม่ควรต้องรอค่าฮาร์ดแวร์จริงเพื่อทำเว็บไซต์ส่วนนี้ให้จบ

ค่าที่มีอยู่แล้วใน `src/planning-estimated-demo.js`:

| ค่า | ค่าที่อยู่ใน source |
| --- | --- |
| แบตเตอรี่ nominal | 22.2 V × 10 Ah = 222 Wh |
| พลังงานเริ่มใช้งาน | 177.6 Wh |
| Reserve | 44.4 Wh |
| งบพลังงานภารกิจ | 133.2 Wh |
| กำลังไฟในโมเดล | 600 W |
| Wind limit / maximum airspeed ในโมเดล | 8 / 12 m/s |
| Takeoff / landing / turn allowance | 30 / 30 / 5 วินาที |
| Firmware export target | PX4 |
| Ceiling / corridor ของตัวอย่าง | 60 / 5 เมตร |

กล้องและค่าการบินอ้างอิงจาก `src/planning-hardware-profile.js` และ `src/planning-fixed-settings.js`: NoIR v2, ความสูง 50 ม., ความเร็ว 5 m/s, side/front overlap 70%/80% ผลที่ตรวจในเดโมได้ footprint ประมาณ 60.53 × 45.39 ม., line spacing 18.16 ม., photo spacing 9.08 ม. และ trigger interval 1.82 วินาที ค่าเหล่านี้เป็นค่าในแบบจำลอง ไม่ใช่ผลวัดอุปกรณ์จริง

สิ่งที่ต้องแก้:

1. แยก **aircraft simulation profile** ออกจาก **demo mission / synthetic data**
2. ใช้ค่า flight/energy/firmware ที่มีอยู่เป็น default ของเว็บไซต์จำลองโดยไม่เปลี่ยนข้อมูลจริงที่ผู้ใช้กรอก
3. คงการค้นภาพ GEE และโหลดลม/กระแสน้ำจริงตามพื้นที่และเวลาภารกิจ
4. เก็บ profile ID/version/provenance ไว้ภายใน calculation และ snapshot เพื่อย้อนตรวจได้
5. ปรับ readiness ให้ใช้เงื่อนไขของแบบจำลอง แต่คงการตรวจ Home, เวลา, coverage และข้อมูลจริงที่ขาด/หมดอายุ
6. ปรับ save/import/replan ให้ใช้ profile เดียวกันสม่ำเสมอ และตรวจ compatibility กับ snapshot เก่า

**ข้อควรระวังในการทำ:** ห้ามตั้ง `example=true` เป็น default เพื่อแก้ทางลัด เพราะโหมดนั้นยังเปลี่ยนแหล่งข้อมูลสภาพแวดล้อมและ flow ของภาพดาวเทียม ดู `src/planning-environment-ui.js`, `src/planning-geospatial-ui.js` และ `src/planning-trial-client.js` ก่อนแก้

**เกณฑ์จบ:** เปิด flow หลัก → กำหนดพื้นที่และ Home → โหลดภาพ/ข้อมูลจริง → คำนวณกล้อง พลังงาน route และ export ได้ด้วยโปรไฟล์จำลองชุดเดียว โดยไม่ต้องสลับเข้า Estimated demo และไม่ทำให้ Unknown ของข้อมูลจริงกลายเป็นค่าพร้อม

**ตอบ annotation ล่าสุด (ข้อใหม่ 1 / เดิม 3):** ส่วนนี้มีการให้ผู้ใช้ลองใช้งานหลังเชื่อมโปรไฟล์เข้ากับ flow ปกติแล้ว แต่ยังมีงาน implementation ให้ผู้ช่วยทำก่อน ไม่ใช่การส่ง flow ที่ยังขาดค่าให้ผู้ใช้ทดสอบทันที รอบนี้ผู้ใช้ขอวางแผน จึงยังไม่เริ่มแก้หรือทดสอบ

**เพิ่มเติมจากภาพ error — 26 ต.ค. 2026:**

- ภาพ `GEE planning data unavailable` แสดง Surface/Home/Water/Image/GFS เป็น Unknown และปุ่ม Use reviewed estimate ปิด ผู้ใช้ยืนยันว่าเปิด Production และใช้เวลาอัตโนมัติ
- Source `src/planning-geospatial-ui.js:161–165` เรียก `POST /api/v1/gee/planning-context` และนำ error ที่ไม่ใช่ abort ทั้ง HTTP/non-JSON/context validation มาแทนด้วยข้อความเดียว `Refresh or check the local server connection.` จุดนี้ยืนยันได้จาก source แต่ไม่สามารถบอก HTTP status/สาเหตุของภาพผู้ใช้ได้
- การที่ estimate ใช้ไม่ได้สอดคล้องกับการไม่มีข้อมูล Home ที่ผ่าน validation คง Unknown ไว้ ห้ามแก้ด้วยการใส่ศูนย์หรือใช้ค่าพร้อมจากผลเก่า การเติมค่าแบตเตอรี่เพียงอย่างเดียวไม่แก้ request failure นี้
- อ่าน deployment ปัจจุบันผ่าน Vercel ได้ `dpl_H1ApPeo75RkdzX18Q9BoK6KzJtLC`, READY, commit `8b1a722` ตรง active source
- อ่าน runtime logs ย้อน 2 ชม. ไม่ได้เพราะเกิน retention ของบัญชี ปรับเป็น 30 นาทีแล้วไม่พบ logs/errors ในช่วงที่ค้น ผลนี้ไม่ใช่หลักฐานว่าคำขอผู้ใช้ผ่าน
- เรียกข้อมูลในพื้นที่อ้างอิงระยองแบบอ่านอย่างเดียวสองครั้ง: static context ได้ HTTP 200/complete, terrain และ landcover ready; ครั้งที่เพิ่ม scene/เวลา/route ได้ HTTP 200/partial, terrain/landcover/quality ready และ GFS reference unavailable เพราะไม่มี valid forecast อยู่ในช่วงสั้นที่ขอ ผลครั้งหลัง 26 ต.ค. 2026 14:17:56 น. ไทย ใช้เวลา 1.745 วินาที และ request ตรงกัน
- ข้อมูลอ้างอิงนี้ไม่ใช่ polygon/Home/scene/time ของผู้ใช้ จึงยังไม่ถือว่าจำลอง error เดิมได้ ต้องได้พื้นที่หรือคำตอบ API ของคำขอที่ล้มเหลวเพื่อระบุ root cause
- หลักฐาน: `output/gee-error-diagnosis-2026-10-26/reference-context.json` และ `user-gee-unavailable.png` เป็นสำเนาภาพผู้ใช้ใน workspace

**ข้อกำหนด schedule ที่ยืนยันระหว่างวินิจฉัย:**

- ปัจจุบัน `createPlanningSchedule().begin/complete()` ใช้เวลา analysis + 1 ชั่วโมงเมื่ออยู่ automatic mode แต่ `setManual()` รับเวลาเริ่มและจบแยกกัน และ `complete()` ไม่คำนวณต่อเมื่อ mode เป็น manual (`src/planning-schedule.js`, `src/planning-trial-client.js`)
- เป้าหมายใหม่คือให้ผู้ใช้กรอกเวลาเริ่มเพียงส่วนเดียว แล้วคำนวณเวลาจบจาก assessed duration + turnaround ระหว่าง sorties + scheduling buffer โดยไม่นับ takeoff/landing/transit ซ้ำกับค่าที่รวมอยู่ใน duration แล้ว
- เมื่อเปลี่ยนพื้นที่ Home profile หรือข้อมูลที่เปลี่ยนระยะเวลาภารกิจ ต้องคำนวณ end ใหม่และตรวจ coverage ให้ครอบคลุมเวลาเริ่ม–จบ แต่ไม่เลื่อนเวลาเริ่มที่ผู้ใช้เลือกอย่างเงียบ ๆ ถ้าเวลาเริ่มหมดอายุให้ผู้ใช้แก้
- ก่อนประเมิน duration ได้ ให้แสดงว่ายังคำนวณเวลาจบไม่ได้ และพิจารณาแยกการโหลด static terrain/landcover ออกจากช่วงเวลาพยากรณ์ที่ยังไม่ครบ เพื่อไม่ส่ง time pair ที่ไม่สมบูรณ์ ข้อนี้เป็นแนวทางออกแบบ ยังไม่ใช่ข้อสรุปสาเหตุ error ปัจจุบัน

**ลำดับย่อยที่อัปเดต:** 1.1 ตรวจแก้ GEE error และให้ข้อความบอกสาเหตุที่แก้ไขได้ → 1.2 เชื่อมโปรไฟล์โดรนเดิม → 1.3 เวลาเริ่มกรอกเอง/เวลาจบอัตโนมัติ → 1.4 เตรียม flow สำหรับผู้ใช้ทดลอง ไม่เพิ่มจำนวนขั้นหลักจาก 4 เป็นจำนวนใหม่

**แบ่งหน้าที่ให้ชัด — 27 ต.ค. 2026:**

- **ผู้ใช้ทำตอนนี้:** บอกชื่อบริเวณหรือพิกัดที่เกิด error เพื่อเริ่มเทียบคำขอจริง ถ้ามีภาพแผนที่เห็นกรอบพื้นที่และจุด Home หรือข้อมูลภาพดาวเทียมที่เลือก ให้ใช้ประกอบได้ แต่ไม่ยกระดับข้อมูลประกอบทั้งหมดเป็นเงื่อนไขบังคับก่อนเริ่มตรวจ
- **ข้อมูลที่ตอบแล้ว:** เว็บออนไลน์ `xedo-eight.vercel.app`, ตอนเกิด error ใช้เวลาอัตโนมัติ และรูปแบบที่ต้องการคือกรอกเวลาเริ่มแล้วคำนวณเวลาจบอัตโนมัติ ไม่ถามซ้ำหรือให้ผู้ใช้เดาเวลาเอง
- **ผู้ช่วยรับผิดชอบเมื่อเริ่มแก้:** ตรวจ request/response ของภารกิจที่มีปัญหา แก้สาเหตุที่พิสูจน์ได้ ปรับข้อความ error/recovery ให้ตรงชนิดปัญหา ไม่แทนข้อมูลขาดด้วยศูนย์ พิจารณาโหลด static terrain/landcover แยกจากช่วงเวลาพยากรณ์ที่ยังไม่พร้อม โดยระบุว่าเป็นแนวทางออกแบบ ไม่ใช่สาเหตุที่ยืนยันแล้ว
- **โปรไฟล์และเวลา:** ผู้ช่วยนำค่าโดรน/แบตเตอรี่ที่คิดไว้แล้วเข้า flow ปกติ ใช้พื้นที่และข้อมูลจริงของผู้ใช้ ให้กรอกเวลาเริ่มเพียงส่วนเดียวแล้วคำนวณเวลาจบจาก duration ที่ประเมินได้ รวมช่วงพักระหว่าง sortie และ buffer โดยไม่บวกซ้ำ คำนวณใหม่เมื่อ route/profile/สภาพแวดล้อมเปลี่ยน รักษาเวลาเริ่มที่เลือก และตรวจข้อมูลครอบคลุมทั้งช่วง
- **หลัง implementation:** ผู้ช่วยตรวจในเครื่องก่อน จากนั้นผู้ใช้ลองพื้นที่/Home/เวลาเริ่มของตนเอง ตรวจเส้นทาง จำนวนเที่ยวบิน เวลาจบและการดาวน์โหลด เป็นการตรวจรับพฤติกรรม ไม่ใช่ให้ผู้ใช้แก้โค้ดหรือคำนวณสเปกเอง
- **เกณฑ์จบข้อ 1:** ข้อมูลที่รองรับโหลดได้หรือมีเหตุผลที่แก้ไขได้เมื่อไม่สำเร็จ; normal flow ใช้ profile กลาง; เวลาเริ่มของผู้ใช้คงอยู่และเวลาจบคำนวณตาม inputs; export ใช้เฉพาะข้อมูล/review ล่าสุด; คง 3 ขั้นตอน/4 ตัวคำนวณ ไม่พึ่ง Pi การทดสอบเหล่านี้เป็นแผนสำหรับช่วงลงมือ ยังไม่รันรอบอธิบายนี้

### 3.6 งานค้างข้อ 4 — UX เหมือนเว็บใช้งานจริงและแผนรองรับการใช้งาน

**คำสั่งล่าสุดของผู้ใช้:** ไม่มีป้าย Prototype ให้เอาออกทั้งหมด ข้อกำหนดนี้แทนแผนเดิมที่คง badge จุดเดียว การจัดงานต่อไปนี้เป็น **แผนเท่านั้น ยังไม่ได้ทำและยังไม่ทดสอบ/วัด capacity** รายการตรวจรับด้านล่างเป็นงานอนาคตเมื่อถึงช่วง implementation

1. รวม primary flow ให้ใช้โปรไฟล์จำลองจากข้อ 3 ร่วมกับข้อมูลภารกิจจริง ปุ่มตัวอย่างถ้าคงไว้ควรเป็นเพียงทางลัดโหลดสถานการณ์
2. เอาป้าย Prototype ออกทั้งหมด รวม mark/note ซ้ำ เช่น `Assumed inputs`, `Trial only` และข้อความเรื่องไม่เชื่อมอุปกรณ์จากหน้าทำงานตามขอบเขตที่ผู้ใช้สั่ง ครอบคลุม Help/dialog ด้วย แต่รักษาสถานะข้อผิดพลาด วันภาพ ความสด และข้อมูลขาดที่มีผลต่อการใช้แผน
3. ใช้คำทำงานที่กระชับ เช่น Mission ready / Download flight plan / Data unavailable ขณะเดียวกันยังแสดงวันภาพ แหล่งข้อมูล ความสด ช่วงเวลาที่ครอบคลุม และ error ที่ผู้ใช้ต้องแก้
4. แสดง readiness ให้สอดคล้องกับแบบจำลอง ไม่ติดเงื่อนไขรอฮาร์ดแวร์จริง และไม่อ้างว่าการตรวจ constraints เท่ากับได้รับอนุญาตจากหน่วยงาน
5. ทดสอบ flow เต็มตั้งแต่เปิดเว็บใหม่จนดาวน์โหลด รวมแก้พื้นที่/ภาพ/Home/Replan, save/import, missing/stale/timeout, mobile/desktop, keyboard และ contrast ตามส่วนที่แก้
6. ใช้โครงสร้าง deploy และ CI ที่มีอยู่ก่อน ไม่ย้ายระบบหรือเพิ่มบริการโดยไม่มีเหตุผลจาก workload จริง
7. ประเมิน capacity แบบเป็นขั้น: **1 → 5 → 10 sessions** วัด latency, tile requests, timeout, 429 และ upstream quota แล้วจึงพิจารณา 20/50 sessions ตามผลและงบที่ตกลง การทดสอบต้องมีขอบเขต request ไม่ยิง load หนักใส่ upstream โดยพลการ
8. ระบุ request budget, caching/concurrency และเกณฑ์ยอมรับจากผลวัดจริง ก่อนกล่าวว่ารองรับจำนวนผู้ใช้เท่าใด
9. เมื่อได้รับคำสั่งเผยแพร่รุ่นถัดไป ให้ระบุ commit/build/deployment ที่ทดสอบ ตรวจบน Preview ผ่านเส้นทางที่มีสิทธิ์อยู่แล้ว แล้วตรวจ Production หลังเผยแพร่ พร้อมเก็บ deployment ก่อนหน้าสำหรับ rollback

**เกณฑ์จบในช่วง implementation ภายหลัง:** ผู้ใช้เดิน flow หลักได้ครบ คำนวณครบ ดาวน์โหลดและเปิด snapshot กลับได้ ไม่มีป้าย Prototype และ note ซ้ำ ข้อมูลที่ขาดแจ้งตรงตามจริง และมีหลักฐานตรวจรับ/กำลังรองรับตามขอบเขตที่ตกลง ไม่รันเกณฑ์เหล่านี้ในรอบวางแผนปัจจุบัน

### 3.7 งานค้างข้อ 5 — Inspector, บัญชี, Save และ history

**ยืนยันแล้ว:** มี application role เดียวคือ Inspector ทุกคนใช้ฟังก์ชันที่เสนอได้ครบ ไม่ออกแบบระดับสิทธิ์ Viewer/Operator/Admin ใน flow ผู้ใช้โดยพลการ

**คำตอบล่าสุด:** แต่ละ Inspector เห็นและแก้เฉพาะภารกิจของตนเองในช่วงทดลอง login ด้วยอีเมล/รหัสผ่านบน XEDO ไม่ผ่าน Google และทีมสร้างบัญชีให้ผู้ทดลองก่อน ไม่มีคำถามค้างจากสามเรื่องนี้

**ตอบ annotation ล่าสุด (ข้อใหม่ 3 / เดิม 5):** ผู้ช่วยสามารถทำหน้า login, account/session, เครื่องมือให้ทีมสร้างบัญชี, ownership, save/load/history และส่วนเชื่อมไฟล์ได้ตามขอบเขตนี้ คำถามยืนยันความช่วยเหลือในรอบวางแผนยังไม่ใช่การเริ่มสร้างบัญชีหรือ provision บริการจริง

ผลต่อการออกแบบที่ต้องรักษา:

- ทุกคนมีฟังก์ชันครบเท่ากัน แต่ข้อมูลภารกิจเป็นส่วนตัวแยกตามบัญชี ครอบคลุมรายการ รายละเอียด การแก้ไข ประวัติ ภาพ ผล AI snapshot และไฟล์แผนที่แนบ
- ตรวจ ownership ที่ server/API และการเข้าถึงไฟล์ด้วย authenticated user ไม่ใช่ซ่อนรายการใน UI อย่างเดียว และไม่เชื่อ owner ID ที่ browser ส่งมาโดยไม่มีการตรวจ
- การสร้างบัญชีโดยทีมเป็นขั้นตอนดูแลผู้ทดลอง ไม่ได้เพิ่ม role Admin ให้ application users
- ทำหน้า login ของเว็บไซต์เองได้โดยใช้ implementation/library มาตรฐานสำหรับ password/session เบื้องหลัง ไม่จำเป็นต้องเขียน cryptography เองหรือเพิ่ม Google
- แนวทางอีเมล/รหัสผ่านยังมีงานดูแล password storage, session, การเปลี่ยนและกู้รหัสผ่าน จึงไม่อ้างว่าเป็นทางที่ง่ายกว่า Google ทุกกรณี การเลือกเทคโนโลยี backend ยังไม่ได้รับการตัดสินใจหรือ provision บริการในรอบนี้
- ดูแนวทางประกอบจาก [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) และ [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

ขอบเขตที่ต้องวางรายละเอียดเมื่อถึงคิว:

- บัญชีอีเมล/รหัสผ่านและ session พร้อมวิธีให้ทีมสร้างบัญชีผู้ทดลองตามข้อกำหนดที่ยืนยันแล้ว
- สร้าง บันทึก เปิด แก้ไข และแสดงประวัติภารกิจ
- ผูกพื้นที่ Home เวลา scene ต้นทาง profile version ผลคำนวณ แผน และไฟล์ที่เกี่ยวข้องกับภารกิจเดียวกัน
- ออกแบบฐานข้อมูลและพื้นที่เก็บไฟล์ให้แยกภารกิจตามเจ้าของ ไม่มีการแชร์ข้าม Inspector ในช่วงทดลอง
- จัดการ save/load failure และแสดงผลผิดพลาดโดยไม่ทำให้งานที่กำลังทำหาย
- วางทางนำเข้า snapshot เดิมเข้าภารกิจที่บันทึกในระบบตามความเหมาะสม

**อย่าสับสน:** snapshot JSON และ saved-survey code ที่มีอยู่ไม่ได้พิสูจน์ว่า hosted account/history พร้อมใช้งานบน Production แล้ว ส่วนนี้ยังเป็นงานค้างของระบบบัญชีและการบันทึกผ่านเว็บ

ตรวจ source แบบ read-only ในรอบนี้พบว่ามี storage/revision และ schema/migration scaffolding ให้ต่อยอด แต่ยังไม่มี app email/password account/session หรือ owner isolation พร้อมใช้ใน hosted planner จึงต้อง implement ข้อ 5 จริงก่อนกล่าวว่ามีระบบส่วนตัวของแต่ละบัญชีแล้ว ตัวอย่างที่ต้องปรับคือ `src/storage.js`, `src/worker.js` และ `db/schema.ts` ข้อความในย่อหน้านี้ไม่ใช่ผลทดสอบ runtime ใหม่

### 3.8 ข้อ 6–8 — แผน AI และงานที่พักไว้ตามคำสั่งล่าสุด

| งาน | สิ่งที่ควรกำหนดเมื่อถึงคิว | สถานะการตัดสินใจ |
| --- | --- | --- |
| ข้อ 6: AI integration | ภาพ/scene และ georeference → model output พร้อม provenance → candidate zones → Inspector review → selected inspection polygon → planner | มีแผนละเอียดเป็น HTML แล้ว ยังไม่ implement; การยังไม่เชื่อมหน้าเว็บไม่เท่ากับโครงการไม่มีโมเดล |
| ข้อ 7: Pi / telemetry / ภาพโดรน | งานรับข้อมูลอุปกรณ์อาจพิจารณาในอนาคต | **พักตามคำสั่งผู้ใช้**; ไม่ใช่ dependency ของการสร้างแผนตรวจพื้นที่ก่อนบิน |
| ข้อ 8: ผลทดลองและรายงาน | ชุดข้อมูลก่อน–หลัง รูป ผลวัด และรายงาน | **งานค้าง — ยังไม่ทำ** ตาม annotation ผู้ใช้ ไม่ใช่เงื่อนไขปิด planner |

แผนละเอียดและหลักฐานรอบนี้อยู่ที่ `C:\mega\codex\iENA\outputs\XEDO_AI_Integration_Plan_2026-10-26\report.html` พร้อม `website-check.json`, screenshots สองโหมด และ `no-pi-demo.plan`

**แผนที่ขยายล่าสุดหลัง annotation:** [AI_INTEGRATION_PLAN.md](AI_INTEGRATION_PLAN.md) ใช้เลขใหม่ 4 / เดิม 6 มี 3 ส่วนหัวข้อ/สรุป/รายละเอียด ครอบคลุมชุด SAR อ้างอิง, contracts, georeference, overlay/review, planner และตัวคำนวณทั้ง 4, ownership/history, การเลือกภาพ Sentinel-1 ใหม่, asynchronous worker, สถานะผิดพลาด/revision และเกณฑ์ตรวจรับสำหรับอนาคต ตัวอย่าง API/module เป็นข้อเสนอ ยังไม่มีการ implement HTML เดิมปรับข้อกำหนดให้ตรงกัน; หลักฐานเว็บข้างต้นเป็นของรอบก่อน ไม่ใช่ผลทดสอบใหม่

**ข้อค้นพบสำหรับการเชื่อม AI:**

- Hosted planner ปัจจุบันโหลดภาพและรับพื้นที่จาก Inspector แต่ยังไม่ได้ inference น้ำมันหรือจัดอันดับความเสี่ยงอัตโนมัติ การโหลดภาพสำเร็จไม่ใช่ผล AI
- มี SAR runner ที่ `C:\mega\codex\iENA\outputs\XEDO_GEE_Colab_2026-10-11\gee_sar_inference.py` และผลเก่าพร้อมพิกัดที่ `C:\mega\codex\iENA\outputs\SYSTEM_FIX_2026-10-11\real_gee_results\XEDO_SAR_20261011T130518Z_6152a5\` เช่น `oil_score.tif`, `oil_candidate_mask.tif`, `source_metadata.geojson`, `summary.json`
- ผลเก่านี้ใช้เป็น **integration fixture** ได้ แต่ไม่ใช่หลักฐานพื้นที่เสี่ยงปัจจุบัน ต้องรักษาวันภาพ เวลา model run, valid coverage และ NoData; ห้ามเปลี่ยนเวลาผลเก่าให้ดูเหมือนวิเคราะห์วันนี้
- SAR ใช้ Sentinel-1 `[VH,VV]` และกริด/normalization ตาม runner ส่วน RGB marine model ใช้อินพุตอีกชนิด จึงห้ามนำ PNG ที่ render จาก Sentinel-2 ไปใช้แทนแล้วอ้างว่าเข้ากันหรือผ่าน validation แล้ว
- Contract เดิม `contracts/processing.schema.json` ผูกกับ `run_id` / `capture_id` หลังถ่ายภาพ ไม่เหมาะกับ satellite analysis ก่อนบิน ต้องเสนอ contract งานวิเคราะห์/ผล/การ review แยก ไม่สร้าง Pi captures ปลอมเพื่อให้ผ่าน schema
- Planner ปัจจุบันรับ single simple Polygon ไม่มีรูและไม่เกิน 120 vertices ต้องรักษา raw AI geometry แยก แล้วให้ Inspector เลือก/สร้าง planning polygon ที่ validate แล้ว หรือสร้างแผนแยกต่อพื้นที่
- พื้นที่เสี่ยงที่จะไปตรวจไม่เท่ากับพื้นที่คราบน้ำมันที่ยืนยันแล้ว: ส่งเข้าการวางแผนบินได้ แต่ห้ามเอาพื้นที่ทั้งหมดไปเป็น oil area หรือเดาความหนาให้ตัวคำนวณแคปซูลอัตโนมัติ
- ลำดับเสนอ: inventory และ fixture → contract/georeference adapter → overlay/review → planner handoff → persistence/provenance → fresh-scene inference/runtime ตามผลทดสอบ ไม่ต้อง train ใหม่หรือเปิด Pi เพื่อพิสูจน์การเชื่อมรอบแรก

**ผลตรวจ Production โดยไม่เชื่อม Pi:**

| เส้นทาง | สิ่งที่ทำได้ในรอบนี้ | สิ่งที่ยังติด |
| --- | --- | --- |
| Normal mission inputs | นำเข้าพื้นที่ตัวอย่าง 24,131 ตร.ม., เลือก Home บนแผนที่, โหลด covering Sentinel-2B 22 ต.ค. 2026 03:54 UTC, สร้าง geometric route 1.86 กม. | ยังไม่มี assessed sorties; download ปิด เพราะขาด 8 ค่าใน aircraft/battery profile และ export/review/condition-window checks |
| Estimated demo | เลือก Home เอง, ตรวจ stored image, GEE terrain ready, review แล้ว readiness 4/4, route 1.89 กม., 1 sortie | ดาวน์โหลดผ่านจริงเป็น QGroundControl Plan v1 มี 20 mission items; ไม่ได้ตรวจ native QGC/SITL |
| Pi / telemetry | ไม่มีการเชื่อมอุปกรณ์ในทั้งสองเส้นทาง | ไม่เป็นตัวขวางการสร้างแผน |

ค่า flight ที่ขาดใน normal flow คือ `windLimitMps`, `maxAirspeedMps`, `usableWh`, `reserveWh`, `powerW`, `takeoffS`, `landingS`, `turnS` ส่วน export ยังต้องมี ceiling, corridor, firmware, constraint source/validity, explicit no-go collection และข้อมูลสภาพแวดล้อมครอบคลุมเวลาภารกิจครบ ไม่ควรแก้โดยปิด readiness ทั้งหมด

หลักฐานจาก source: `scripts/build.mjs` → `scripts/build-planning-file.mjs` → `src/planning-runtime.js` → `src/planning-file-api.js` เรียก `calculatePlanningTrial(null, body)` ใน browser โดยไม่มี database/HTTP/device transport; source test ที่มีอยู่คือ `tests/planning-runtime.test.mjs` และ `tests/planning-hardware-profile.test.mjs` รอบนี้อ่าน tests เหล่านี้ ไม่ได้รันใหม่

**แผนแก้คร่าว ๆ เพื่อให้ normal flow ดาวน์โหลดได้โดยไม่ใช้ Pi:** นำเฉพาะ simulation aircraft defaults จากข้อ 3 มาใช้ → เติม policy/constraints ของ scenario ในข้อ 4 พร้อมคง Home/พื้นที่ที่ผู้ใช้เลือก → ทำ schedule กับการโหลด conditions ให้ครอบคลุมกัน → ต่อพื้นที่เสี่ยงที่ Inspector review แล้วเป็น planning geometry โดยไม่ผูกกับอุปกรณ์ → ทดสอบ fresh session จนดาวน์โหลดบนพื้นที่ที่เลือกเองได้จริง

รายการจาก audit เดิมที่ต้องเก็บแยก:

- ข้อมูลกระแสน้ำเฉพาะปากแม่น้ำ/ร่องน้ำป่าชายเลนยังต้องมีแหล่งท้องถิ่นที่ตรวจสอบได้ ไม่ใช้ regional grid ประมาณ 9 กม. เป็นค่าร่องน้ำแคบอัตโนมัติ
- Native QGroundControl import, SITL, firmware compatibility, camera trigger และการทดสอบโดรนจริงเป็นงานเชื่อมอุปกรณ์ในอนาคต ไม่ใช่เงื่อนไขปิดเว็บไซต์จำลอง
- หลักฐานสิ่งกีดขวาง ระดับพื้นที่/จุดขึ้นบิน สิทธิ์น่านฟ้า ความหนาน้ำมัน และประสิทธิภาพแคปซูลต้องมาจากการตรวจ/ทดลองที่เหมาะสม หากจะนำผลไปใช้กับงานจริง
- ภารกิจของเว็บไซต์ปัจจุบันคือวางแผน/จำลองและสร้างไฟล์ ไม่มีคำสั่ง arm, mission start หรือปล่อยวัสดุใน export ที่ทดสอบ ไม่เพิ่มการควบคุมอุปกรณ์จริงเข้าคิวนี้เอง

### 3.9 ลำดับความน่าเชื่อถือของหลักฐานและเอกสารเก่า

1. คำสั่งและการยืนยันล่าสุดของผู้ใช้
2. Source / Git diff ปัจจุบัน และหลักฐานการทดสอบที่ตรงกับ commit นั้น
3. Release receipt และ CI/deployment ที่ระบุ commit/build ชัดเจน
4. บันทึกนี้และ `docs/implementation-queue.json` ที่ต้องปรับให้ตรงหลักฐาน
5. Audit/report/memory เก่า ซึ่งใช้ดูประวัติได้แต่ต้องตรวจว่าถูกงานใหม่แทนที่แล้วหรือยัง

รายงาน `C:\mega\codex\iENA\outputs\XEDO_Website_Audit_2026-10-26\report.html` เป็น **ภาพสถานะก่อนแก้/เผยแพร่** หลายข้อในรายงานถูกปิดไปแล้ว เช่น readiness รุ่นใหม่ยังไม่ออนไลน์, local GEE ยังไม่พร้อม, 3D caption ซ้อน และ timeout recovery ให้ดูข้อ 3.2–3.4 สำหรับสถานะใหม่ ไม่หยิบมาจัดเป็นงานค้างซ้ำ และอย่าใช้เลขลำดับใน audit แทนเลขคิวปัจจุบันโดยไม่ตรวจชื่อเรื่อง

ส่วน `docs/VALIDATION.md` มีประวัติการตรวจหลายรุ่น รวมจำนวน tests และ deployment เก่า ใช้เป็นประวัติประกอบ ไม่ใช้ค่าจากต้นเอกสารเป็นผลล่าสุดโดยอัตโนมัติ

### 3.10 บันทึกประจำรอบ — ต้องเพิ่มหรือแก้ทุกครั้ง

#### 26 ตุลาคม 2026 — รวมประวัติงานข้อ 1–2 และการเผยแพร่

- **หัวข้อ:** Planner readiness และ live-data recovery
- **สรุป:** ทำข้อ 1–2 เสร็จ ทดสอบ local 428 tests และเผยแพร่ `8b1a722` ขึ้น Production แล้ว
- **รายละเอียด:** เก็บ Launch / Return, schedule/Replan, terrain/readiness, GEE retry/partial data, snapshot race/timeout, observation time และ 3D layout ตามข้อ 3.2 ทดสอบ API และ browser ตามข้อ 3.3–3.4
- **ผลตรวจ:** 3 builds และ CI ผ่าน; API จริงผ่านในบริบททดสอบ; เดโมดาวน์โหลดได้ 20 mission items
- **ขอบเขต:** ข้อ 3–8 ยังไม่ลงมือจาก release นี้ และไม่ได้รับรองการบินจริง
- **หลักฐาน:** `output/release-check/deploy-2026-10-26/release-receipt.json`

#### 26 ตุลาคม 2026 — สร้างบันทึกกลางครั้งแรกตามคำสั่งผู้ใช้

- **หัวข้อ:** ไฟล์ความจำและรายการสิ่งที่ยังต้องแก้สำหรับทุกแชท
- **สรุป:** สร้างไฟล์นี้ด้วยโครงสร้าง 3 ส่วน สรุปงานที่เหลือและงานที่เสร็จแล้ว พร้อมกติกาอัปเดตทุกครั้ง
- **รายละเอียด:** เทียบคิวปัจจุบัน release receipt, source และ audit เดิม แยกหลักฐานเก่าออกจากสถานะล่าสุด เก็บข้อ 3–8 เป็นงานค้าง และเก็บคำถาม Inspector ทั้งสองเรื่องไว้
- **ไฟล์รอบนี้:** `docs/XEDO_WORK_LOG.md`, `docs/implementation-queue.json`, `AGENTS.md` ใน repository และ `C:\mega\codex\iENA\AGENTS.md`
- **ผลตรวจ:** ตรวจโครงสร้าง Markdown, path/link ในเครื่อง, JSON และ diff ของเอกสาร; ไม่มีการแก้ฟังก์ชันเว็บไซต์และไม่ได้รัน 428 tests ซ้ำในรอบเอกสาร
- **การเผยแพร่:** เอกสารรอบนี้อยู่ในเครื่อง ยังไม่ได้ commit/push/deploy เพิ่ม
- **งานถัดไป:** รอคำสั่งเริ่มข้อ 3–4; รอคำตอบเรื่องข้อมูลภารกิจและวิธี login ของข้อ 5

#### 26 ตุลาคม 2026 — อธิบายการเชื่อม AI และยืนยันว่าแผนไม่ต้องรอ Pi

- **หัวข้อ:** ทำตาม annotation ทั้ง 3 จุด: แผน AI แบบละเอียด, ตรวจเว็บโดยไม่มี Pi, พักผลทดลอง/รายงาน
- **สรุป:** จัดทำ HTML อธิบายการเชื่อม AI; ตรวจเว็บจริงพบว่า normal flow สร้างเส้นทางได้แต่ยังขาด profile/export ส่วน demo ดาวน์โหลด `.plan` ได้โดยไม่เชื่อมอุปกรณ์; ข้อ 7 พักและข้อ 8 คงเป็นงานค้าง
- **รายละเอียด:** ตรวจ source contracts, model runner และผล SAR เก่าที่มี georeference เสนอการเชื่อมผลก่อนบินแยกจาก post-flight capture contract เก็บ risk area แยกจาก confirmed oil area อัปเดตคิวตามเป้าหมายวิเคราะห์จุดเสี่ยงแล้วสร้างแผนไปตรวจ
- **ไฟล์รอบนี้:** `docs/XEDO_WORK_LOG.md`, `docs/implementation-queue.json`, `C:\mega\codex\iENA\outputs\XEDO_AI_Integration_Plan_2026-10-26\report.html` และไฟล์หลักฐานข้างกัน
- **ผลตรวจเว็บ:** Deployment ปัจจุบันยังเป็น `dpl_H1ApPeo75RkdzX18Q9BoK6KzJtLC` / `8b1a722`; normal route 1.86 กม. แต่ export ปิด; demo readiness 4/4, 1 sortie, `.plan` 20 items, commands `[22,178,16,21]`; screenshots บันทึกและเปิดตรวจแล้ว
- **ผลตรวจ HTML:** ตรวจ source แบบ offline ผ่าน: 10 sections, 8 ขั้นตอนเชื่อม AI, 25 unique IDs, local references 16 แห่ง (รวม href/src 18 occurrences), anchors, proposed JSON และ inline JavaScript syntax พร้อม responsive/print CSS; `report-validation.json` และ `html-static-check.json` อยู่ข้างรายงาน ไม่ได้ทดสอบการ render และปุ่มใน browser เพราะนโยบายปฏิเสธการเปิด `file://` และไม่ได้ใช้ทางเลี่ยง; หลักฐาน Production เป็นภาพที่ตรวจจริงแยกจากการ preview รายงาน
- **ขอบเขต:** ไม่มีการเชื่อม AI/Pi/results หรือแก้ source ฟังก์ชัน; ไม่รัน inference/training หรือ 428 tests ซ้ำ และไม่มีการทดสอบ native QGC/SITL/โดรนจริง
- **การเผยแพร่:** HTML/เอกสาร/หลักฐานอยู่ในเครื่อง ไม่ได้ commit/push/deploy เพิ่ม
- **งานค้างและรอคำตอบ:** implementation ข้อ 3–6 ยังไม่เริ่มในรอบนี้; ข้อ 7 พัก; ข้อ 8 ค้าง; ยังรอขอบเขตข้อมูลภารกิจและวิธี login ของข้อ 5

#### 26 ตุลาคม 2026 — ปิดคำถามบัญชีที่ค้างและรับรูปแบบบัญชีผู้ทดลอง

- **หัวข้อ:** รับ requirement ข้อ 5 ต่อคิว ไม่เริ่ม implementation
- **สรุป:** ผู้ใช้ตอบให้แต่ละ Inspector ใช้เฉพาะภารกิจตนเอง และใช้ login ของ XEDO ไม่ผ่าน Google พร้อมตอบคำถามเพิ่มเติมให้ทีมสร้างบัญชีผู้ทดลองก่อน
- **รายละเอียด:** บันทึกเป็น email/password ตามบริบทคำถามเดิม ปิดคำถามเก่าสองข้อและคำถาม provision บัญชีอีกหนึ่งข้อ แยก full feature access ออกจากสิทธิ์ข้อมูลส่วนตัว อัปเดต HTML แผน AI ไม่ให้แสดงสองเรื่องเก่าว่ายังรอคำตอบ
- **ไฟล์รอบนี้:** `docs/XEDO_WORK_LOG.md`, `docs/implementation-queue.json` และส่วนข้อกำหนดบัญชีใน `C:\mega\codex\iENA\outputs\XEDO_AI_Integration_Plan_2026-10-26\report.html`
- **ผลตรวจ:** ตรวจ JSON/สถานะคำตอบ โครงสร้าง 3 ส่วนของ work log และความสอดคล้องของ HTML; อ่าน source บัญชี/storage แบบ read-only และอ้างอิงคำแนะนำ OWASP ไม่รัน tests ฟังก์ชันหรือเปิด Production ซ้ำ
- **ขอบเขต:** ไม่สร้างบัญชีจริง ไม่ตั้งรหัสผ่าน ไม่เลือก/provision บริการ auth และไม่เพิ่ม application role อื่น
- **การเผยแพร่:** แก้เฉพาะเอกสารในเครื่อง ไม่ได้ commit/push/deploy
- **งานค้างและรอคำตอบ:** implementation ข้อ 3–6 ยังอยู่ในคิว; ข้อ 7 พัก; ข้อ 8 ค้าง; ไม่มีคำถามที่ถามไปแล้วและยังรอคำตอบในรอบนี้

#### 26 ตุลาคม 2026 — เรียงลำดับงานที่เหลือใหม่และเทียบเลขเดิม

- **หัวข้อ:** ตอบจำนวนขั้นที่ยังเหลือและกำหนดเลขอ้างอิงใหม่
- **สรุป:** เหลืองานหลัก 4 ขั้นและงานพักไว้ 2 รายการ รวม 6 รายการ; ข้อเดิม 1–2 เสร็จและเผยแพร่แล้ว ไม่นับเป็นงานค้าง
- **รายละเอียด:** เลขใหม่ 1/2/3/4/5/6 จับคู่เลขเดิม 3/4/5/6/7/8 ตามลำดับ เก็บ stage IDs เก่าใน JSON และเพิ่ม remainingWorkOrder เพื่อไม่ทำให้ประวัติ คำตอบบัญชี หรือขอบเขต release ผิดความหมาย
- **ไฟล์รอบนี้:** `docs/XEDO_WORK_LOG.md`, `docs/implementation-queue.json`
- **ผลตรวจ:** ตรวจ JSON, mapping ครบไม่ซ้ำ, จำนวน active 4/deferred 2 และโครงสร้าง work log 3 ส่วน ไม่รันทดสอบฟังก์ชันหรือ Production ซ้ำ
- **ขอบเขต:** จัดคิวและบันทึกเท่านั้น ไม่เริ่ม implementation และไม่เปลี่ยนสถานะงานพักไว้เป็นงานที่สั่งให้ทำ
- **การเผยแพร่:** เอกสารในเครื่อง ไม่ได้ commit/push/deploy
- **งานค้างและรอคำตอบ:** งานหลักตามเลขใหม่ 1–4 ยังไม่ implement; 5–6 พัก; ไม่มีคำถามที่ถามผู้ใช้แล้วและยังรอคำตอบในรอบนี้

#### 26 ตุลาคม 2026 — ทำตาม annotation ข้อใหม่ 1–4 และขยายแผน AI

- **หัวข้อ:** ชี้แจงขั้นให้ผู้ใช้ลองใช้งาน แก้ข้อกำหนดป้าย ยืนยันงานบัญชีที่ช่วยได้ และจัดทำแผน AI ละเอียด
- **สรุป:** ข้อใหม่ 1 ต้องเชื่อมโปรไฟล์ก่อนให้ผู้ใช้ลอง; ข้อใหม่ 2 ให้เอาป้าย Prototype ออกทั้งหมดแทนแผนเดิม; ข้อใหม่ 3 ผู้ช่วยทำระบบบัญชี/ภารกิจส่วนตัวได้; ข้อใหม่ 4 มีแผนละเอียดแล้ว รอบนี้เป็น planning/documentation only
- **รายละเอียด:** แผน AI แบ่ง A: fixture/contract/adapter/review/planner, B: private history, C: ภาพ Sentinel-1 ใหม่/worker และ D: ตรวจรับภายหลัง ระบุ raw candidate แยกจาก inspection polygon และ oil quantity คง 3 ขั้นตอน/4 ตัวคำนวณ ไม่พึ่ง Pi เก็บ source time/grid/provenance และจัดการ revision/ผลตอบช้า
- **ไฟล์รอบนี้:** เพิ่ม `docs/AI_INTEGRATION_PLAN.md`; ปรับ `docs/XEDO_WORK_LOG.md`, `docs/implementation-queue.json` และข้อกำหนด/ลิงก์ใน `C:\mega\codex\iENA\outputs\XEDO_AI_Integration_Plan_2026-10-26\report.html`
- **หลักฐานที่อ่าน:** active checkout HEAD `8b1a7220010e0f927739b6a8d14ca0f761e85e78`, planning runtime/client/demo profile, processing/planning contracts, SAR runner และ `summary.json` ของผลอ้างอิง; อ่านเอกสาร Rasterio/RFC 7946 ประกอบวิธีแปลงพิกัด
- **ผลตรวจรอบนี้:** อ่านเอกสารกลับและตรวจรูปแบบ JSON/เลขคิว/โครงสร้าง Markdown เท่านั้น ไม่รัน tests ฟังก์ชัน browser, inference, training, accuracy evaluation หรือ capacity และไม่เปิด Production ซ้ำ ผล 428 tests/การดาวน์โหลดเดิมยังเป็นหลักฐานจากรอบก่อน
- **ขอบเขต:** ไม่แก้ source เว็บไซต์ ไม่ลบป้ายจากเว็บจริงในรอบนี้ ไม่สร้างบัญชี ไม่เพิ่มบริการ/worker จริง และไม่เริ่มงานที่พักไว้
- **การเผยแพร่:** เอกสารอยู่ในเครื่อง ยังไม่ commit/push/deploy; ไม่เปลี่ยน release identity ที่บันทึกไว้
- **งานค้างและรอคำตอบ:** ยังเหลือ implementation หลัก 4 ขั้นและงานพักไว้ 2 รายการ รวม 6 รายการตามเลขใหม่เดิม ไม่มีคำถามที่ถามผู้ใช้แล้วและยังรอคำตอบ

#### 26 ตุลาคม 2026 — วินิจฉัยภาพ GEE unavailable และรับข้อกำหนดเวลา

- **หัวข้อ:** GEE context บน Production ใช้งานไม่ได้ในภาพผู้ใช้ และระบบเวลาที่ต้องการในข้อใหม่ 1
- **สรุป:** ยืนยันอาการจากภาพ พบ source ซ่อนสาเหตุหลายประเภทไว้หลังข้อความเดียว API อ้างอิงยังตอบได้ จึงยังไม่ยืนยัน root cause ของคำขอผู้ใช้; เพิ่มข้อกำหนดกรอกเวลาเริ่มแล้วคำนวณเวลาจบอัตโนมัติ
- **รายละเอียด:** ผู้ใช้ยืนยัน URL ออนไลน์และใช้เวลาอัตโนมัติ ข้อกำหนดใหม่ต่างจาก analysis + 1 ชั่วโมง/manual start-end ของ source ปัจจุบัน เพิ่มงานย่อย GEE diagnostics/recovery และ schedule ลงข้อใหม่ 1 ก่อนให้ผู้ใช้ทดลอง รักษาอีก 3 ขั้นหลักและ 2 งานพักไว้ตามเดิม
- **ไฟล์รอบนี้:** `docs/XEDO_WORK_LOG.md`, `docs/implementation-queue.json`; หลักฐานที่ `output/gee-error-diagnosis-2026-10-26/reference-context.json`, `user-gee-unavailable.png`
- **ผลตรวจ:** อ่านภาพ/source และ Vercel deployment/log/error metadata; API read-only อ้างอิง 2 คำขอได้ HTTP 200 ทั้งคู่ ครั้งล่าสุด partial เฉพาะ GFS reference ไม่มี forecast ในช่วงที่ขอ ส่วน terrain/landcover/quality ready ไม่ใช้ผลนี้แทนการจำลองภารกิจผู้ใช้
- **ข้อจำกัด:** ไม่มีพื้นที่/พิกัดและ request/response ของเหตุการณ์ผู้ใช้ จึงยังไม่ระบุสาเหตุเฉพาะ ไม่กล่าวว่า GEE ล่มทั้งระบบหรือว่าแก้ error แล้ว
- **การทดสอบ/ขอบเขต:** ไม่รัน npm tests/build/browser flow/model/capacity; ไม่แก้ source เว็บไซต์หรือเริ่ม implementation ข้อ 1–4 ใช้ skill `vercel:observability` อ่านข้อมูลวินิจฉัยเท่านั้น
- **การเผยแพร่:** ไม่มี commit/push/deploy; อ่านยืนยัน deployment ปัจจุบันเป็นรุ่นเดิม `dpl_H1ApPeo75RkdzX18Q9BoK6KzJtLC` / `8b1a722`
- **งานค้างและรอคำตอบ:** **รอคำตอบพื้นที่/พิกัดตอนเกิด error** ส่วนวิธีตั้งเวลาได้รับคำตอบแล้ว บัญชีตอบครบ ไม่มีคำถามเรื่องสิทธิ์/login ค้าง

#### 27 ตุลาคม 2026 — อธิบายหน้าที่ผู้ใช้และแผนแก้ข้อใหม่ 1

- **หัวข้อ:** ผู้ใช้ต้องส่งอะไร และผู้ช่วยจะตรวจ/แก้ส่วนใดให้
- **สรุป:** ตอนนี้ยังรอเพียงพื้นที่หรือพิกัดที่เกิด error; ภาพแผนที่/Home และ scene เป็นข้อมูลเสริมถ้ามี ผู้ช่วยรับผิดชอบไล่ request และแก้ GEE/profile/schedule ส่วนผู้ใช้ลองตรวจรับหลังเตรียมระบบแล้ว
- **รายละเอียด:** ขยายขั้น 1.1–1.4 และเกณฑ์จบ แยกผลวินิจฉัยวันที่ 26 ต.ค. ออกจากสถานะปัจจุบัน ยืนยันเวลาเริ่มกรอกเอง/เวลาจบอัตโนมัติ โดยไม่ถาม URL หรือวิธีตั้งเวลาซ้ำ
- **ไฟล์รอบนี้:** `docs/XEDO_WORK_LOG.md`, `docs/implementation-queue.json`
- **ผลตรวจ:** อ่าน log/queue และ Git status ปัจจุบัน ตรวจรูปแบบเอกสารหลังบันทึกเท่านั้น ไม่มี software tests/build/browser/API/inference/capacity ใหม่ ไม่ใช้ผล 428 tests หรือ API รอบเก่าเป็นหลักฐานการตรวจรอบนี้
- **การเผยแพร่:** ไม่มีการแก้ source, commit, push หรือ deploy ข้อมูล release เป็นประวัติเดิม ไม่ได้ตรวจ deployment ซ้ำวันนี้
- **งานค้างและรอคำตอบ:** **รอคำตอบชื่อพื้นที่หรือพิกัดตอนเกิด GEE error**; งานหลัก 4 ขั้นและงานพักไว้ 2 รายการยังคงเดิม

#### 27 ตุลาคม 2026 — เริ่มชุดแก้ GEE status, ภาพบริบทและ scroll lag

- **หัวข้อ:** ลงมือ 4 รายการล่าสุดและเตรียมเผยแพร่เว็บหลัก
- **สรุป:** เขียนแผนก่อนลงมือใน `WEBSITE_DETAILS.md` เพิ่มกติกาบันทึกสองไฟล์ตามผู้ใช้ จากนั้นแบ่งงาน GEE request/status, satellite context และ rendering/performance ตาม module เพื่อลดการแก้ชนกัน
- **หลักฐานเริ่มต้น:** HEAD และ `origin/main` เป็น `8b1a722` หลัง fetch; Vercel alias ยังชี้ `dpl_H1ApPeo75RkdzX18Q9BoK6KzJtLC` READY/commit เดียวกัน ภาพล่าสุด Home `12.66105, 101.1288` และ surface ready
- **ข้อค้นพบจาก source:** selected GEE map ถูก clip ตาม AOI เดิมขณะที่ background พัก; readiness timer เขียน DOM ซ้ำทุกวินาที; overlay style ถูกสร้างซ้ำต่อ feature การเรียงไฟล์อย่างเดียวไม่ใช่สาเหตุที่ยืนยัน จึงแยก module/ลดงานซ้ำแทนการ rewrite ทั้งระบบ
- **ขอบเขต:** เก็บ inspection/review/calculation geometry เดิม แยก display context ไม่ถือว่าอินเทอร์เน็ตเป็นสาเหตุจนมีหลักฐาน ไม่มีงานบัญชี/AI/Pi หรือการย้าย default profile/schedule ทั้งก้อนใน release นี้
- **ผลตรวจ:** `npm run check`, `npm test` **458 ผ่าน / 0 ล้มเหลว / 0 ข้าม**, builds `build`, `build:workspace`, `build:file` ผ่าน; `git diff --check` ผ่าน API ในเครื่องคืน context 1000m โดย AOI เดิมไม่เปลี่ยน context-only PNG HTTP200/7,223 bytes; GEE terrain/landcover/quality/forecast ready; invalid time pair HTTP422 Browser ผ่านเลือกภาพจน Image ready และ Prepare เปิดใช้
- **การแก้จริง:** แยก `planning-context-request`, `satellite-context`, `planning-map-overlay`, `planning-view`, `planning-image-readiness`; progress 33/67/100 ตามขั้น request และ indeterminate ตอนรอ; error category/request ID/source failures แบบปลอดภัย; retry ชั่วคราวหนึ่งครั้ง; imagery มี displayGeometry แยก AOI; ลด readiness DOM writes/overlay allocations/hidden-tab ticks และจัด wheel focus/paint containment
- **การตรวจเพิ่ม:** พบและแก้ abort-ignoring late response ทำให้ progress เดินต่อหลัง timeout และ AOI tile ยังรอใน queue แต่ยังไม่ emit tileloadstart ทำให้ review พร้อมเร็วเกินไป เพิ่ม regression tests แล้ว Full suite ครั้งแรกพบ test extraction anchor เก่าที่อ้าง `function add` ซึ่งถูกย้ายออก ปรับ anchor ให้ตรง module ใหม่โดยไม่ลด assertions แล้ว full suite ผ่าน
- **ไฟล์หลักฐาน:** `output/release-check/gee-status-context-scroll-2026-10-27/` มี tests/check/build logs และ `local-api.json`; รายละเอียด module และ lifecycle อยู่ใน WEBSITE_DETAILS.md
- **เผยแพร่:** Push code commit `8452df2939d7a839885077e574ee6901944b6a91` ไป main สำเร็จ ตรวจ Vercel alias → `dpl_FhXkVvUtYWRAA8rkqZkJwFeC5JBe` READY/commit ตรงกัน; CI `40484759102` success รอบแรก push timeout ตรวจ main แล้วยังไม่เปลี่ยน จึง retry ด้วย HTTP/1.1/postBuffer แบบเฉพาะคำสั่งโดยไม่ force push แล้วสำเร็จ
- **Production browser:** โหลดภาพและ context ผ่าน, Prepare เปิดใช้; refresh GEE เห็น stage33%ระหว่างรอและ100%เมื่อคำตอบตรวจผ่าน ทุกแหล่ง Ready; ทดสอบ end time ว่างให้เกิด INPUT/HTTP422/สาเหตุเฉพาะและหยุด67% จากนั้นคืนค่าเดิมแล้วกลับ Ready; route preview ยังสร้างได้ ไม่มี console error ที่พบ บันทึก screenshots/JSON และตรวจเลื่อน PageUp ใน dialog ได้ ไม่วัด FPS
- **ขอบเขตหลักฐาน:** Node CLI smoke ของ full Production HTML/API timeout สองครั้ง จึงไม่ใช้เป็นผลผ่านหรือสรุปว่าเว็บล่ม ตรวจเส้นทางข้อมูลผ่าน browser จริงแทน พร้อม deployment/CI identity ส่วน local live API ผ่านครบ ผลนี้ไม่พิสูจน์สาเหตุของ outage เก่าหรือความเร็วเครือข่ายผู้ใช้
- **เอกสาร:** อัปเดต work log + WEBSITE_DETAILS และ queue หลังเผยแพร่ เอกสารผลตรวจเป็น follow-up ของ code commit ด้านบน; receipt สุดท้ายเก็บ exact deployment metadata โดยไม่ต้องแก้ source หรือรัน tests ซ้ำสำหรับ Markdown-only changes
- **รอคำตอบ:** ไม่มีคำถามที่ต้องตอบเพื่อเริ่มชุดแก้นี้ ข้อมูลพื้นที่คร่าว ๆ ได้จากภาพแล้ว

รูปแบบรายการที่จะเพิ่มในรอบต่อไป:

```text
วันที่และเวลาไทย — ชื่อรอบงาน
หัวข้อ:
สรุป:
รายละเอียด: สิ่งที่เปลี่ยน เหตุผล และไฟล์ที่เกี่ยวข้อง
ผลตรวจ: คำสั่ง/flow ที่ตรวจ ผล และหลักฐาน; ถ้าไม่ได้ตรวจให้ระบุ
การเผยแพร่: local / committed / pushed / deployed พร้อม identifier ถ้ามี
งานค้างและรอคำตอบ:
```

### 3D satellite ground — แผนก่อนลงมือ 27 ต.ค. 2026

ผู้ใช้อนุญาตแก้ code, push และ deploy งานนี้โดยตรง: เพิ่มการสลับพื้น Diagram เดิม / Satellite จริงใน 3D และคงขนาดกรอบ preview/ขอบเขตพื้น/กล้องเดิม ใช้ Canvas perspective renderer เดิม ไม่เพิ่ม engine ใหม่โดยไม่จำเป็น

แผน: (1) แยก loader ภาพพื้นจาก renderer ใช้ GEE Sentinel-2 basemap ของขอบเขตพื้นจริง ไม่ใช้ thumbnail (2) ประกอบ tile เป็น texture ที่มีพิกัด Web Mercator และวาดลงพื้นด้วย mesh projection ให้ตำแหน่ง AOI/route ตรงกัน (3) เพิ่มปุ่ม mode, สถานะ/วันที่/แหล่งภาพ, retry และ cancellation เมื่อแผนเปลี่ยน/ออกจาก 3D โดยไม่เปลี่ยนข้อมูล review หรือ readiness (4) จำกัดขนาด texture/concurrency/cache ให้หมุนและ scroll ไม่สร้าง request ใหม่ (5) ตรวจ georeference, failure/abort/stale response, renderer, full suite/build และ UI ภายในก่อน push/deploy เว็บหลัก ไม่มีรอบรับรอง preview เพิ่ม

ขอบเขต: ภาพ Sentinel-2 มีรายละเอียดต้นทางประมาณ 10 เมตร ไม่สร้างรายละเอียดปลอมหรืออ้างว่าเป็นโมเดลอาคาร/terrain ต่อเนื่อง พื้นภาพเป็นภาพ true-colour ของช่วงวันที่แสดง แยกจาก acquisition ที่ใช้ review ภารกิจ ความสูง/clearance ยังคงใช้หลักฐานและคำอธิบายเดิม คงสามขั้นตอนและสี่ตัวคำนวณ งานบัญชี/AI/profile/schedule อื่นยังอยู่ในคิว

สถานะเมื่อเขียนแผน: ยังไม่แก้ code หรือรัน tests สำหรับงาน 3D นี้; ผล458 tests ก่อนหน้าเป็นของ release เดิมเท่านั้น รอคำตอบ: ไม่มี

### 3D satellite ground — ผล implementation และตรวจในเครื่อง 27 ต.ค. 2026

- หัวข้อ: เพิ่มพื้นดาวเทียมจริงใน preview 3D โดยคง Diagram และขนาดพื้นที่เดิม
- สรุป: Diagram เป็นค่าเริ่มต้น ปุ่ม Satellite โหลด recent Sentinel-2 mosaic สำหรับ polygon ของพื้นจริงแล้ววาง texture ด้วย inverse mission projection → Web Mercator UV ส่วนกล้อง/ขอบพื้น/AOI/route/height labels เดิมยังคงอยู่
- รายละเอียดไฟล์: `deployment-3d.js` + `deployment-ground.js` เก็บ renderer/16×16 mesh และพิกัด; `planning-3d-satellite.js` โหลด/ตรวจ/ประกอบ PNG atlas; `planning-3d-ground-controller.js` จัด lifecycle/cache/cancellation/expiry/retry; `planning-trial-client.js`, `public/planning.html`, `planning-trial.css`, `planning-help-content.js` เชื่อมปุ่ม/status/credit/online gate; package เพิ่ม syntax checks; tests ใหม่3ไฟล์และเพิ่ม spy ใน VM harness เดิม
- Performance: source≈10m เลือก zoom ตามพื้นจริง จำกัด atlas2048×2048/64tiles/4requestsพร้อมกัน; orbitใช้UVcached ไม่มีrequestใหม่; เมื่อกลับ2D/เปลี่ยนsceneหรือAOI/pagehideยกเลิกและไม่แสดงlateผล; ภาพfailed/empty/partialไม่แสดงReady มีDiagramและRetry
- ผลตรวจใหม่: `npm run check`; `npm test` **482ผ่าน/0ล้มเหลว/0ข้าม**; `npm run build`, `build:workspace`, `build:file`; `git diff --check` ผ่าน Fullsuiteครั้งแรก480/482เพราะVM harnessเดิมไม่รู้จักgroundControllerเพิ่ม spy โดยไม่ลดassertions แล้วรันซ้ำผ่านทั้งหมด
- Browserภายใน: localhost5187 ใช้polygonอ้างอิงสาธารณะ101.22–101.226,12.65–12.656 โหลดGEEจริง image/dateพร้อม สร้างnormalrouteแล้ว3D SatelliteReady; source29ก.ย.–22ต.ค.2026; ดูภาพเต็มพื้นจริง สลับDiagram↔Satellite/ArrowRight/ArrowLeftได้ไม่มีconsole errorที่พบ ค่าAOIเดิมเท่ากันทุกmode; desktopwrap440/canvas376px mobilewrap340px;390pxscrollWidth375ไม่ล้นแนวนอน คืนviewportแล้ว ไม่วัดFPS
- หลักฐาน: `output/release-check/3d-satellite-ground-2026-10-27/` มี test/check/build logs, local-browser.json/local-mobile.json และภาพlocal-satellite.jpg/local-mobile.jpg (ไฟล์outputถูกignoreตามเดิม)
- รอคำตอบ: ไม่มี งานในคิวอื่นไม่ถูกเริ่ม; สถานะก่อนcommitนี้ยังไม่เผยแพร่ รอตรวจmain/CI/VercelและProductionหลังpush
