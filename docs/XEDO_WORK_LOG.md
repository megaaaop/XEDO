# XEDO — บันทึกงานกลางและรายการที่ยังต้องแก้

## 1. หัวข้อ

**บันทึกสถานะเว็บไซต์ XEDO เพื่อทำงานต่อในแชทนี้และส่งต่อให้แชทอื่น**

- วันที่เริ่มบันทึก: **26 ตุลาคม 2026** ตามเวลา `Asia/Bangkok`
- อัปเดตล่าสุด: **28 ตุลาคม 2026 — ผู้ใช้อนุมัติ push/deploy ชุดUXแล้ว;ตรวจhashตรง531tests/3buildsและremote main45e928e กำลังเผยแพร่ ยังไม่อ้างproductionสำเร็จจนตรวจdeployment/browser/API**
- ไฟล์หลัก: `C:\mega\codex\iENA\github-publish\XEDO-hardware-release\docs\XEDO_WORK_LOG.md`
- โปรเจกต์ที่กำลังทำงาน: `C:\mega\codex\iENA\github-publish\XEDO-hardware-release`
- เว็บไซต์: [XEDO Production](https://xedo-eight.vercel.app/)
- Repository: [megaaaop/XEDO](https://github.com/megaaaop/XEDO)
- จุดประสงค์รอบนี้: pushและdeployชุดUXที่ตรวจในเครื่องแล้วตามคำสั่งล่าสุดของผู้ใช้ ตรวจcommit/CI/Vercel/เว็บจริงและบันทึกผล ไม่เพิ่มงานAIหรือเปลี่ยนDB/Auth
- สถานะเผยแพร่จากหลักฐานรอบก่อน (ไม่ได้ตรวจ live ใหม่ในรอบ UX นี้): ชุดแก้เวลา/Surface code `d5ec33fbb186145440acffed718972c9b8fc8063` push main/branch แล้ว Vercel `dpl_8tjaooDbxEodG8kmHiE5yJfNLwac` READY และ alias เว็บหลักตรง code นี้ CI [40574633798](https://github.com/megaaaop/XEDO/actions/runs/40574633798) success; เอกสาร follow-up อาจทำให้ deployment SHA ใหม่โดย application ไม่เปลี่ยน exact final receipt อยู่ `output/release-check/time-surface-fix-2026-10-28/`
- **ขอบเขตคำสั่งล่าสุด:** Implement/test/document งานล่าสุด1 UX/ข้อความ/loading/scroll ตาม UX_COMPLETION_PLAN.md ส่ง prompt ไปแชทสนับสนุนที่มีอยู่ ไม่รวม AI/normal-profile/schedule rewrite/DB/Auth changes และไม่ใช้คำอนุญาตเผยแพร่งานเก่าแทนการเผยแพร่ชุดนี้

**กติกาตามคำสั่งผู้ใช้:** ทุกครั้งที่ทำงานกับ XEDO ต้องอ่านไฟล์นี้ก่อนเริ่ม และบันทึกหรือแก้ไขไฟล์นี้ก่อนจบรอบ แม้รอบนั้นมีเพียงการรับข้อกำหนด วางแผน ตรวจสอบ หรืออัปเดตเอกสาร ให้เก็บโครงสร้างหลัก 3 ส่วนคือ **หัวข้อ / สรุป / รายละเอียด** ไว้เสมอ

**กติกาเพิ่ม 27 ต.ค.:** งานแก้/ตรวจเว็บไซต์ลักษณะนี้ต้องบันทึกสองที่: ไฟล์นี้เก็บประวัติ ผลตรวจ และการเผยแพร่; `docs/WEBSITE_DETAILS.md` เก็บโครงสร้าง พฤติกรรม dependency และรายละเอียดวิธีแก้ อัปเดตทั้งสองก่อนจบรอบ และรักษาคิว JSON ให้ตรงกัน

## 2. สรุป

### สถานะล่าสุดที่มีหลักฐาน

**Inspector เผยแพร่แล้ว; สถานะบัญชีล่าสุด 28 ต.ค.:** ทีมสร้าง Auth user และผู้ใช้อนุมัติการเปิดสิทธิ์ Inspector เฉพาะบัญชีในภาพแล้ว guarded one-row INSERT/UPSERT บน xedo สำเร็จ เวลา14:40น.Asia/Bangkok Post-readพบหนึ่ง roster row/enabled=true/emailconfirmed=true RLSเปิดและanon/authenticatedยัง provisionโดยตรงไม่ได้ ไม่มีการขอ/ใช้/เปลี่ยน password หรือ mint token/session ให้ผู้ใช้กด Sign in ใหม่ด้วย password เดิมเพื่อยืนยัน real browser login; privateSave/history/A-B acceptance ยังไม่ครบ ไม่มีคำถามอนุมัติค้าง

**สอง runtime issues หลัง account release แก้และเผยแพร่แล้ว:** shared checks ตรวจเพดาน 24 ชั่วโมงทั้ง schedule/GEE/export; แผนเกินยังเก็บเวลาจริงพร้อม Blocked และให้ลดพื้นที่/แบ่งงาน GEE static terrain/landcover/quality โหลดต่อได้โดยเว้น forecast พร้อมเหตุผล Surface model แยก missing/loading/error/stale ออกจากพื้นที่/Home ไม่ตรงจริง ทดสอบใหม่ 510 ผ่านและตรวจเว็บจริงแล้ว รายละเอียดรอบแก้อยู่ท้ายไฟล์และ WEBSITE_DETAILS §3.26 ไม่ได้เพิ่ม automatic mission partitioning หรืออ้างว่าระยะทางจริงของผู้ใช้ผิด

**กติกางานคู่ขนานล่าสุด:** แชทนี้แก้websiteเพียงแชทเดียว อีกแชทส่งpreparedSARใน`outputs/XEDO_Parallel_Handoff_2026-10-27/support/`แล้ว รายงาน32data checksผ่าน/14candidates;แชทหลักตรวจSHA256ของcore12ไฟล์ตรงแล้ว แต่ยังไม่รันconversionหรือwebsiteintegrationซ้ำ ต่อไปให้supportเตรียมrisk-editfixtures/testaddendumโดยไม่แก้corepackageหรือเว็บ

**แผนปิดงานล่าสุด:** เหลือหลัก3กลุ่มที่ผู้ใช้อนุมัติ (ล่าสุด1UX/2บัญชี/3AI ตรงก่อนหน้า2/3/4 และเดิม4/5/6) กับพัก2กลุ่ม (ล่าสุด4/5 ตรงเดิม7/8) ข้อก่อนหน้า1/เดิม3ถูกตัดจากเกณฑ์ปิดงานโดยผู้ใช้ยอมรับprototypeเดิม ไม่บังคับprofile/schedule/normaldownloadใหม่ AIต้องแก้/เพิ่ม/ปฏิเสธพื้นที่เสี่ยงได้และเก็บreviewส่วนตัว กรอบ4ชั่วโมงยังมีcheckpointbackendและตรวจเว็บจริง รายละเอียดล่าสุดอยู่WEBSITE_DETAILS3.15และAI_INTEGRATION_PLAN3.15

**รอบ 3D satellite ground 27 ต.ค. 2026 เผยแพร่แล้ว:** เพิ่มปุ่ม Diagram / Satellite ใช้ภาพ tile GEE Sentinel-2 ตามพิกัดพื้นเดิม ไม่ใช้ thumbnail; source mosaic มีวันที่และความละเอียดแยกจากภาพ review; ผ่าน **482 tests** และ3builds ตรวจ browser โหลดภาพจริง/สลับโหมด/หมุนด้วย keyboard/กรอบ440pxdesktopและ340pxmobile/AOIเดิม/ไม่มีแนวนอนล้น390px รวมตรวจเว็บหลัก code `dc4743c` + deploymentREADY + CIsuccessแล้ว เอกสารfollow-upนี้ไม่เปลี่ยนapplication bundle; exactidentityสุดท้ายเก็บในreceiptของรอบนี้

**ชุดแก้ล่าสุด 27 ต.ค. 2026 เผยแพร่แล้ว:** GEE status/progress/error, ภาพบริบทรอบ AOI ประมาณ1กม., module/rendering cleanup และ scroll performance ที่ code commit `8452df2939d7a839885077e574ee6901944b6a91` ตรวจ deployment `dpl_FhXkVvUtYWRAA8rkqZkJwFeC5JBe` READY และ alias เว็บหลักตรงรุ่นนี้ CI [40484759102](https://github.com/megaaaop/XEDO/actions/runs/40484759102) success ผลทดสอบใหม่ **458 ผ่าน / 0 ล้มเหลว / 0 ข้าม**; browser ตรวจภาพและ GEE stages33→100/source Ready พร้อม intentional INPUT/HTTP422 แล้วคืนข้อมูลได้ เก็บรายละเอียดในรอบประจำวันท้ายไฟล์

บันทึก deployment ข้างต้นเป็นหลักฐานของ **ชุดโค้ดที่ตรวจแล้ว** ก่อน commit เอกสารผลตรวจนี้ การ push เอกสาร follow-up ในรอบเดียวกันอาจทำให้ Git SHA ของ deployment เปลี่ยนโดย application bundle ไม่เปลี่ยน ให้ดู receipt ใน `output/release-check/gee-status-context-scroll-2026-10-27/` สำหรับ identity สุดท้าย ห้ามนำผล 428 tests ของ release เก่าด้านล่างมาแทนผลรอบนี้

งานข้อเดิม **1–2 แก้ ทดสอบ push และ deploy แล้ว** ที่ commit `8b1a7220010e0f927739b6a8d14ca0f761e85e78` เว็บยังคง flow **3 ขั้นตอน** และตัวคำนวณ **4 ส่วน** ผลทดสอบก่อนเผยแพร่ล่าสุดคือ **428 ผ่าน / 0 ล้มเหลว / 0 ข้าม** รวมทั้งตรวจ API และใช้งานผ่านหน้า Production หลัง deploy แล้ว

ผล 428 tests และ release เดิมอ้างอิงหลักฐานการเผยแพร่เมื่อ 26 ตุลาคม 2026 ในรอบตรวจเว็บก่อนหน้านี้ทดสอบ flow โดยไม่เชื่อม Pi: normal flow สร้างเส้นทางได้ 1.86 กม. แต่ยังดาวน์โหลดไม่ได้เพราะค่า flight/export ไม่ครบ ส่วน Estimated demo ดาวน์โหลด `.plan` 20 items ได้จริง รอบรับคำตอบบัญชีนี้ไม่ได้ทดสอบเว็บซ้ำ ข้อมูลสภาพแวดล้อมและเวลาของแผนเป็นของรอบทดสอบเดิม ต้องโหลดและตรวจความสดใหม่เมื่อเริ่มภารกิจใหม่

### ลำดับใหม่สำหรับงานที่เหลือ — ใช้อ้างอิงคำสั่งถัดไป

**ประเด็นเดิมในข้อก่อนหน้า1/เดิม3:** GEEdiagnosticsเผยแพร่แล้ว ส่วนprofileปกติและการกรอกstart/derivedendยังไม่implementและถูกผู้ใช้ตัดจากเกณฑ์ปิดงานล่าสุด เก็บรายละเอียดเดิมข้อ3.5ไว้เป็นประวัติ ไม่ให้งานที่ตัดกลับมาขวางUX/บัญชี/AI

**เหลืองานหลัก3ขั้นที่อนุมัติ และงานที่พักไว้อีก2รายการ รวม5รายการในคิวล่าสุด** ข้อก่อนหน้า1/เดิม3ตัดออกจากรอบนี้ ไม่ถูกนับว่าimplementเสร็จ ข้อเดิม1–2เผยแพร่แล้ว

| เลขล่าสุด | เลขเดิม | งาน | สถานะ/เกณฑ์ที่ต้องทำต่อ |
| --- | --- | --- | --- |
| **1** (ก่อนหน้า2) | **4** | UXและข้อความ | **อนุมัติimplementation** เอาป้ายPrototypeออก เก็บflowและmobile คงสามขั้น/สี่ตัวคำนวณ/2D3D |
| **2** (ก่อนหน้า3) | **5** | บัญชีInspector Save/historyส่วนตัว | **เผยแพร่และตรวจLoginแล้ว** รอทีมสร้างAuthusers+rosterและreal-account acceptance ไม่มีGoogle ownerบังคับที่server |
| **3** (ก่อนหน้า4) | **6** | preparedAI+Inspectorแก้พื้นที่เสี่ยง+planner | **อนุมัติimplementation** dataพร้อมhashverified;เพิ่มedit/move/add/reject/undo/cancel/reviewrevisionsและprivateSave |
| **4** (ก่อนหน้า5) | **7** | Pi / ภาพ / telemetry | **พักตามคำสั่งผู้ใช้** |
| **5** (ก่อนหน้า6) | **8** | ผลทดลองและรายงานก่อน–หลัง | **พักตามคำสั่งผู้ใช้** |

การรับคำสั่งใหม่ที่ระบุเพียง “ข้อ 1/2/3…” ให้ใช้ **เลขใหม่** จากตารางนี้ หากผู้ใช้บอก “เลขเดิม” หรืออ้างข้อความเก่า ให้จับคู่ตามบริบท รายละเอียดเชิงเทคนิคและประวัติที่บันทึกก่อนรอบเรียงใหม่นี้ รวมทั้ง HTML แผน AI เดิม ยังใช้เลขเดิมเมื่อไม่ได้ระบุว่าเป็นเลขใหม่

คำอนุญาต push/deploy ก่อนหน้านี้เป็นของ **ข้อเดิม 1–2 ที่เสร็จแล้ว** ไม่ใช่คำอนุญาตเผยแพร่ข้อใหม่ 1–2 โดยอัตโนมัติ การทดสอบเป็นเกณฑ์จบของแต่ละขั้นและรอบ release ไม่เพิ่มเป็นขั้นงานใหม่ที่นับซ้ำในตารางนี้

### สถานะคิวตามเลขเดิม — เก็บไว้เทียบประวัติ

| เลขเดิม | งาน | สถานะ | สิ่งที่ต้องทำต่อ |
| --- | --- | --- | --- |
| 1 | Planner, Launch / Return, schedule, readiness และ UI | **เสร็จและเผยแพร่แล้ว** | รักษาพฤติกรรมเดิมเมื่อแก้งานถัดไป |
| 2 | ทดสอบ GEE และข้อมูลสภาพแวดล้อมจริง | **เสร็จและเผยแพร่แล้ว** | ตรวจซ้ำตามพื้นที่และเวลาของแต่ละภารกิจ ไม่ถือว่ารอบเดียวครอบคลุมทุกพื้นที่ |
| 3 | ใช้โปรไฟล์โดรนจำลองที่คิดไว้แล้วใน flow หลัก | **ร่างแผนแล้ว ยังไม่ได้ลงมือ** | แยกโปรไฟล์เครื่องจำลองออกจากโหมดข้อมูลตัวอย่าง ให้ flow ปกติคำนวณได้โดยใช้ข้อมูลภารกิจจริง |
| 4 | ทำ UX ให้เหมือนเว็บไซต์ใช้งานจริง และวางแผนรองรับการใช้งานจริง | **ร่างแผนแล้ว ยังไม่ได้ลงมือ** | เอาป้าย Prototype ออกทั้งหมดตามคำสั่งล่าสุด ลบ note ซ้ำ จัด flow หลัก; บันทึกแผนตรวจรับ/capacity สำหรับอนาคต ยังไม่ทดสอบในรอบวางแผน |
| 5 | บัญชี Inspector, บันทึกภารกิจ และประวัติ | **เผยแพร่แล้ว28ต.ค. ตรวจLogin/APIจริงผ่าน** | ทีมสร้างAuthusers+Inspector rosterแล้วทำreal-account acceptance; ไม่มีGoogle เห็น/แก้เฉพาะภารกิจตนเอง |
| 6 | เชื่อมผล AI เข้าหน้าเว็บ | **จัดทำแผนละเอียดใน HTML แล้ว ยังไม่ลงมือเชื่อม** | เริ่มจากผล SAR ที่มี georeference เป็น fixture → Inspector ตรวจเลือกพื้นที่เสี่ยง → planner; แยกพื้นที่เสี่ยงจากหลักฐานน้ำมัน/ความหนา |
| 7 | เชื่อมภาพและ telemetry จาก Raspberry Pi / โดรน | **พักตามคำสั่งผู้ใช้** | ไม่จำเป็นต่อเป้าหมายวิเคราะห์พื้นที่เสี่ยงและสร้างแผน; ตรวจแล้วไม่มี Pi dependency |
| 8 | ผลทดลองและรายงานภารกิจ | **งานค้าง — ยังไม่ทำตามคำสั่งผู้ใช้** | เก็บไว้สำหรับอนาคต ไม่เป็นเงื่อนไขการสร้างแผนตรวจพื้นที่ |

**ลำดับล่าสุดคือUX/บัญชีเป็นฐาน → AIพร้อมrisk-edit/review → ตรวจรวม** (ล่าสุด1–3/เดิม4–6) อีกแชททำdata/testขนาน งานบัญชีได้คำตอบหลักครบแล้วและprofile/เวลาใหม่ถูกตัด ไม่ต้องถามอนุมัติสามงานนี้ซ้ำ

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

### 3D satellite ground — ผลเผยแพร่และตรวจเว็บหลัก 27 ต.ค. 2026

- Push main สำเร็จที่ application commit `dc4743caf16e270d900fabe906ba6a41c9831e84` โดยไม่force ไม่สร้างpreview branchเพิ่ม
- Vercel alias `xedo-eight.vercel.app` ตรง deployment `dpl_HRWQ22Sxg1cM2b8KzrxTHVCWM1vw` READY และcodeSHAเดียวกัน; CI [40488389541](https://github.com/megaaaop/XEDO/actions/runs/40488389541) success
- ตรวจProductionผ่านbrowserจริง: เลือกAOIอ้างอิง → ภาพ22ต.ค.2026ready → Prepare → 3D → Satellite; GEEพื้นmosaic29ก.ย.–22ต.ค.readyและcanvasระบุgeoreferenced satellite imagery; สลับDiagramกลับSatelliteพร้อมArrowRightแล้วReadyทันที ขอบเขตภารกิจเดิมและขนาดwrap440pxเท่ากัน ไม่พบconsole errorที่ตรวจ
- Sourceheaderของแผนที่พื้นหลังทั่วไปอาจมีช่วงวันที่ต่างจาก3Dfloor เพราะใช้boundedareaคนละกรอบ วันที่ของพื้น3DแสดงในบรรทัดGroundโดยเฉพาะ ภาพจริงอาจมีเมฆ/รายละเอียดตามsource10m;ไม่ได้ใช้thumbnailหรือเพิ่มรายละเอียดเทียม
- หลักฐานเพิ่ม `production-browser.json`, `production-satellite.jpg`; เปิดProductionแท็บผลตรวจไว้ให้ผู้ใช้ ไม่มีการส่งคำสั่งให้อากาศยาน
- อัปเดตMarkdownทั้งสองและqueueหลังตรวจเว็บหลักแล้ว เอกสารfollow-upไม่แก้codeและไม่รัน482testsซ้ำสำหรับMarkdown-only การpushเอกสารอาจเลื่อนdeploymentSHAโดยbundleเดิม ให้ดู`release-receipt.json`ในevidenceDirectoryสำหรับidentityสุดท้าย
- งานค้าง: ข้อใหม่1–4ส่วนอื่นและพัก5–6ยังตามคิวเดิม ไม่มีคำตอบผู้ใช้ค้างที่ขวางงาน3Dรอบนี้

### แผนปิดงานวันนี้ — รับขอบเขตและทบทวนโค้ด 27 ต.ค. 2026

**หัวข้อ:** สรุปงานค้างและจัดเวลา4ชั่วโมงที่ผู้ใช้พร้อมอยู่ดู

**สรุป:** เหลืองานหลัก4กลุ่ม (ใหม่1–4/เดิม3–6) และพัก2กลุ่ม (ใหม่5–6/เดิม7–8) ผู้ใช้ตอบคำถามขอบเขตแล้วว่า **ต้องมีบัญชีส่วนตัวและAIจากผลที่เตรียมไว้ด้วย** จึงไม่เสนอปิดเพียงplanner/UXแล้วเรียกว่าทั้งโปรเจกต์เสร็จ ขอบเขตวันนี้เป็นรุ่นใช้งานขั้นต่ำครบเส้นทาง login → เลือกผลAIเดิม/พื้นที่ → Inspectorreview → plan/เวลา → saveส่วนตัว/history → reopen/download

**รายละเอียดที่ตรวจจริง:**

- Gitเริ่มรอบclean HEAD28d7e9d; Vercelaliasตรวจซ้ำในรอบนี้READYที่`dpl_CtoT3UAo4iwD4QTvTj27WZdSwHi5`/SHA28d7e9d1b852f1d55ecf115681ff24a13f968918 ไม่ได้เปิดbrowserหรือรันทดสอบซ้ำ ผล482testsเป็นของrelease3Dก่อนหน้า
- Planner: hardwareprofileมีcamera/height/speed แต่battery/windlimits/allowancesยังอยู่ในEstimatedDemo; exportต้องมีtarget/height/constraints/reviewsครบ ไม่แก้เพียงปลดปุ่มdownload; schedule.completeยังอัปเดตเฉพาะautomatic ส่วนmanualรับstart+endคู่ จึงยังไม่ใช่userstart/derivedend
- UX: GEEstatus/context/scrollและ3Dgroundเสร็จแล้ว เหลือป้ายPrototypeซ้ำ/ข้อความ/flowหลัก และตรวจหลังเชื่อมfeatureใหม่ การทดสอบcapacityเต็มรูปแบบไม่รวมเป้าหมาย4ชั่วโมง
- Accounts: hostedvercel.jsonมีเฉพาะGEE/environment/context ไม่มีlogin/session/privateMissionAPI;db/schema.tsไม่มีaccount/session/ownerสำหรับภารกิจ `actor`ในworkerเป็นauditmetadataและstoragequeryยังglobal จึงไม่ใช่privateownership มีsnapshot/revision/eventsที่reuseได้แต่ต้องทำserverownershipจริง
- AI: ตรวจชุดไฟล์อ้างอิงSARจริงใน`outputs/SYSTEM_FIX_2026-10-11/real_gee_results/XEDO_SAR_20261011T130518Z_6152a5/` ยังมีscore/mask/source/summary/preview วันที่ภาพ9ต.ค.2026/run11ต.ค. exportgrid1317×1340,EPSG32647,10m มี15248candidatepixels ใช้affineของexportedcropไม่ใช่originของsourceทั้งแผ่น ค่าaccuracy_validated_on_gee=falseและยังมีlookalike/land จึงแสดงเป็นcandidateให้Inspectorตรวจ ไม่เป็นoilconfirmed/thickness

**ขอบเขตขั้นต่ำที่ต้องปิดวันนี้:**

1. ใหม่1/เดิม3: normalflowใช้profileค่าที่มีอยู่ร่วมกับข้อมูลภารกิจจริง เลือกพื้นที่/Homeและกรอกstartแล้วคำนวณendตามsorties/turnaround/buffer รักษาstartเมื่อreplan ดาวน์โหลดplanได้เมื่อเงื่อนไขครบ
2. ใหม่2/เดิม4: เอาป้ายPrototypeออกจากUXหลัก เก็บข้อความและการนำทาง คง3ขั้น/4calculators/2D3D/ขนาดpreview ตรวจmobileหลังรวมfeature
3. ใหม่3/เดิม5: email/passwordfirstpartyUI ทีมprovisionบัญชี ทุกคนInspectorเท่ากัน/session/logout; Save/List/Open/Updateและประวัติsnapshotบนserverตามowner; ทดสอบสองบัญชีอ่าน/แก้/artifactข้ามกันไม่ได้ รวมlogout/reload
4. ใหม่4/เดิม6: หนึ่งpreparedSARreference/พื้นที่ครอบคลุมจริง → georeferencedcandidateoverlay → Inspectorเลือก/แก้หนึ่งinspectionpolygonต่อplan → planner → privateSaveพร้อมsource/model/time/grid/threshold/reviewprovenance ไม่แสดงว่าเป็นการรันโมเดลกับภาพใหม่

**แผนเวลาแบบทำคู่ขนาน — นับจากเริ่มimplementationจริง:**

| นาที | เป้าหมาย |
| --- | --- |
| 0–20 | ตรวจสิทธิ์และความพร้อมauth+durableDB/backendที่จะdeployได้ เลือกทางสั้นสุดโดยใช้authที่ดูแลต่อได้ ตรึงcontract/เกณฑ์จบและจัดเจ้าของไฟล์ |
| 20–135 | ทำ3สายคู่ขนาน: Aบัญชี/privateSave/history, Bprofile/schedule/UX, CAIadapter/overlay/review แต่ละสายตรวจของตนเอง หลีกเลี่ยงแก้coordinatorไฟล์เดียวทับกัน |
| 135–180 | รวมสายที่เสร็จก่อนกับplanner/privateSave ขณะสายbackendเก็บงาน ยุติเพิ่มfeatureเมื่อครบ180นาที |
| 180–215 | ตรวจend-to-endและ2บัญชี/ผิดowner/session/save-reopen/history/AIarea-grid/start-end/expireddata/missinginputs/mobile พร้อมsuite/build |
| 215–230 | ให้ผู้ใช้ตรวจเส้นทางสั้นครบหนึ่งภารกิจ แก้เฉพาะข้อขัดขวางส่งมอบ |
| 230–240 | เมื่อได้รับคำสั่งเผยแพร่และchecksผ่าน จึงpush/deploy/ยืนยันรุ่นจริงและอัปเดตเอกสารทั้งสอง |

**ความเป็นไปได้:** 4ชั่วโมงเป็นเป้าเร่งในกรณีbackendพร้อม ไม่รับประกันครบทุกส่วนจากsourceที่ยังขาด auth/private-saveเพียงส่วนเดียวประเมินคร่าวๆ3–6ชั่วโมงเมื่อinfraพร้อมแล้ว จึงกัน contingencyเพิ่ม2–4ชั่วโมงหากต้องตั้งบริการหรือแก้integration ไม่ลดprivacyหรือทำเพียงloginหน้าตา/localStorageเพื่อเรียกว่าเสร็จ ต้องแจ้งผลcheckpoint20นาทีและ180นาทีตามจริง ผู้ใช้ระบุ4ชั่วโมงคือเวลาที่อยู่ดู อาจมีเวลางานมากกว่านั้น ไม่ถือเป็นคำสั่งทำงานต่อเบื้องหลังอัตโนมัติหรือกำหนดเวลาเผยแพร่โดยไม่ตรวจ

**สิ่งที่พัก:** Pi/telemetry,ผลทดลอง/รายงานก่อนหลัง,AIภาพใหม่/workerใหม่/training,capacitybenchmarkเต็มรูปแบบ ไม่เป็นเกณฑ์ปิดรุ่นนี้

**ผลตรวจ/เปลี่ยนแปลงรอบนี้:** read-onlysource+queue+AIartifact+deploymentmetadata; แก้เฉพาะXEDO_WORK_LOG.md/WEBSITE_DETAILS.md/implementation-queue.json ไม่แก้ฟังก์ชัน ไม่รันtests/inference ไม่สร้างบัญชีหรือDB ไม่commit/push/deployในรอบวางแผนนี้

**รอคำตอบ:** ไม่มีคำถามผลิตภัณฑ์ค้าง ขอบเขตวันนี้ตอบแล้ว เรื่องbackendเป็น **รอตรวจความพร้อม** ไม่ใช่ให้ผู้ใช้ตอบrole/login/visibilityซ้ำ

### แผนแชทสนับสนุนคู่ขนาน — 27 ต.ค. 2026

**หัวข้อ:** ให้แชทหลักแก้websiteเพียงแชทเดียว อีกแชทเตรียมAIและกรณีทดสอบ

**สรุป:** ผู้ใช้ต้องการใช้แชทอื่นช่วยงานก่อนส่งกลับ ไม่ให้แชทอื่นแก้เว็บไซต์ จัดbriefพร้อมoutputfolderและtemplateกรณีทดสอบแล้ว คงเป้าหมายวันนี้บัญชีส่วนตัว+preparedAI+plannerตามแผนเดิม แชทสนับสนุนยังไม่ได้เริ่มงานจากbriefนี้และยังไม่ได้สร้าง/ส่งข้อความไปuser-ownedchatอื่น

**รายละเอียดการแบ่งงาน:**

- แชทหลัก: source/UI/API/schema/config/packages/build/testsของเว็บ,auth/privateSave,profile/schedule/UX,AIcontract/review/plannerintegration,การตรวจทั้งflowและการเผยแพร่ตามคำสั่ง รวมสถานะกลาง/queue
- แชทสนับสนุน: อ่านsourceและSARเดิม เตรียมmanifest/rawWGS84candidates/provenance/validation+reproducibleutilityนอกcheckout ออกแบบtestcases ให้รายงานbugพร้อมtrigger/evidenceโดยไม่patchเว็บ ไม่เปลี่ยนmodel/threshold/source ไม่inferenceใหม่ ไม่Gitmutation/accountDBsetup/deploy
- รูปแบบส่งกลับ: `HANDOFF.md`สามส่วนหัวข้อ/สรุป/รายละเอียด พร้อมabsolute pathsของไฟล์จริง และcompleted/blocked/not_run ให้ผู้ใช้ส่งpathกลับแชทหลัก แชทหลักตรวจแล้วจึงปรับdataเข้ากับwebsitecontracts ไม่รับผลของอีกแชทเป็นreviewconfirmedหรือtestpassedโดยอัตโนมัติ
- เอกสารกลาง: รักษากติกาAGENTSทุกturn supportappendรายงานสั้นของตนเองพร้อมlinkโดยอ่านล่าสุดก่อน ไม่เขียนทับoverview/คิวของแชทหลัก แชทหลักรวมรายละเอียดและสถานะรวม

**แผนเวลา:** ข้อค้นพบชุดแรกเป้า20นาที เน้นruntime/sourcegrid/schema/blocker;data+validationเป้า45–90นาทีหากruntimeพร้อม;ตามด้วยtestdesign/bugreview แชทหลักทำบัญชี/plannerและร่างจุดเชื่อมได้โดยไม่รอpackageเต็ม งานเตรียมข้อมูลช่วยลดเวลาบางส่วนแต่ไม่ทำให้authbackendที่ยังขาดเสร็จอัตโนมัติ เป้า4ชั่วโมงยังมีความเสี่ยงเดิม

**หลักฐานอ่านแบบไม่แก้:** read-onlysupportตรวจmetadataเดิม: crop1317×1340,EPSG32647,affineoutput[10,0,736833.2274242942,0,-10,1392898.152845362],threshold0.3,mask0/1/255,scoreNoData-9999,valid1,061,830/candidate15,248/area1,524,800m² ต้องยืนยันจากrasterจริงอีกครั้งก่อนถือว่าvalid ไม่ใช้summaryแทนผลตรวจ การpolygonize→rasterizeบนgridเดิมต้องนับmismatchจริงและรักษาholes/components

**อุปสรรคที่ทราบ:** supportprobeพบdefaultPythonไม่มีrasterio/numpy/shapely/pyproj จึงให้ตรวจruntimeก่อน ใช้runtimeที่พร้อมหรือenvironmentแยกในsupportfolder ไม่ติดตั้งglobal ถ้าsetupติดให้ส่งblockedพร้อมerror/schema/testplanก่อน ไม่แต่งGeoJSONหรือผลpass

**ไฟล์ที่สร้าง/แก้รอบนี้:**

- `C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/SUPPORT_CHAT_BRIEF.md`
- `C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/TEST_PLAN_TEMPLATE.md` มี20กรณีสถานะdesigned_not_run
- `C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/HANDOFF_STATUS.json` statusbrief_ready_support_work_not_started
- อัปเดตXEDO_WORK_LOG.md/WEBSITE_DETAILS.md/implementation-queue.jsonเก็บroleและhandoffpolicy ไม่แก้codeเว็บไซต์

**ผลตรวจ:** ตรวจsyntaxJSONของqueue/statusและdiffcheckเอกสารเท่านั้น ไม่รันapplicationtests/rasterconversion/inference ไม่ได้ตรวจProductionซ้ำในรอบนี้ ไม่มีcommit/push/deployหรือสร้างแชทใหม่ ผล482testsยังเป็นreleaseก่อนหน้า

**รอคำตอบ:** ไม่มี ผู้ใช้เลือกส่งbriefไปแชทสนับสนุนได้เลย ไม่ต้องให้แชทสนับสนุนเริ่มแก้codeเว็บ


<!-- support-sar-handoff-2026-10-27-01a17cf8 -->
### 27 ตุลาคม 2026 17:58 น. — แชทสนับสนุนส่งชุด prepared SAR (local)

- **หัวข้อ:** เตรียมผล AI/SAR เดิมพร้อม metadata/พิกัด/หลักฐานตรวจซ้ำ และออกแบบกรณีทดสอบ ส่งให้แชทหลักเป็นผู้เชื่อมเว็บไซต์เพียงแชทเดียว
- **สรุป:** ชุดข้อมูลพร้อมตรวจรับในเครื่องที่ [HANDOFF.md](C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/support/HANDOFF.md); utility ตรวจจริง32checksผ่าน valid1,061,830/candidate15,248/NoData702,950; raw14components/0holes/area1,524,800m²; nativeและserializedWGS84→UTM roundtripต่าง0pixel มี44websitecasesสถานะdesigned_not_runทั้งหมด
- **รายละเอียด/ไฟล์:** เขียนเฉพาะsupport/ ตามbrief: manifest.json,candidates.raw.geojson,coverage.raw.geojson,source_footprints.geojson,coordinate_reference.json,validation.json,prepare_result.py,requirements.lock.txt,package_checksums.json,preparation-run.log,PROVENANCE_AUDIT.md,provenance.evidence.json,TEST_PLAN.md,HANDOFF.md,delivery_status.json,continuity_receipt.json,record_delivery.py และสำเนาartifacts5ไฟล์ตรงhash; appendบันทึกเฉพาะสองMarkdownกลางตามAGENTS ไม่แก้overviewหรือimplementation-queue.json
- **ผลตรวจจริง:** source HEADที่อ่าน28d7e9d1b852f1d55ecf115681ff24a13f968918; output1317×1340/EPSG32647/10m/affinecropตรงraster; mask0/1/255และscoreNoData-9999ตรงกัน; threshold0.3pixelwiseตรง; checkpointและoriginalinputs3ไฟล์hashตรง; sourceไฟล์ไม่เปลี่ยนและcopiesตรงbytes; all848candidateverticesCRSroundtripmax2.108e-9m; coveragevalid/NoDataroundtrip0; corepackage12hashesตรง เปิดpreviewเดิมตรวจแล้ว (ไม่ใช้PNGแทนgeoreference)
- **อุปสรรค/งานต่อ:** runtimeproxyติดตั้งครั้งแรกไม่สำเร็จ แก้แล้วด้วยenvironmentแยกsupport/.venvจากPyPI ไม่แตะglobal/sitepackagesของเว็บ; candidate-00012มี378verticesเกินplanner120ต้องให้mainกำหนดpolicyและInspectorreviewก่อนส่งหนึ่งplanningPolygon; รักษาวันภาพ9ต.ค./inferenceเดิม11ต.ค.2026,land/lookalikes,accuracy_validated_on_gee=falseและunknownversionsเป็นnull
- **ไม่รัน/ไม่แก้:** ไม่มีwebsiteunit/integration/browser/auth/privacy/save/exportchecksใหม่ ไม่มีinference/training/accuracy/liveGEE/hardware; ไม่ใช้482testsเก่าเป็นผลรอบนี้ ไม่แก้source/API/DB/schema/config/package/website tests หรือผลbuild
- **การเผยแพร่:** local-only ไม่มีcommit/push/deploy ไม่มีข้อความส่งไปuser-ownedchatอื่น ผู้ใช้นำabsoluteHANDOFFpathให้mainอ่านต่อ แชทหลักเป็นผู้รวมstatus/queueและดูแลintegration/releaseตามคำสั่งผู้ใช้
- **รอคำตอบ:** ไม่มีคำถามผู้ใช้ค้าง; geometry/contractpolicyเป็นงานออกแบบของแชทหลักก่อนintegration

### ปรับแผนตามannotation1–4 — UX/บัญชี/AIพร้อมแก้พื้นที่เสี่ยง — 27 ต.ค. 2026

**หัวข้อ:** ลดงานปิดprototypeและอนุมัติสามงานหลัก โดยสองแชททำคนละหน้าที่

**สรุปคำตอบครบทั้ง4จุด:**

1. ข้อก่อนหน้า1/เดิม3 normalflow/profile/เวลาใหม่: ผู้ใช้ตัดออกเพราะprototypeเดิมนำเสนอได้แล้ว ไม่ถือว่าcodeนั้นimplementเสร็จ ไม่บังคับnormaldownloadครบหรือstartderivedendใหม่เป็นเกณฑ์ปิด ไม่ปลดreadinessหรือสร้างค่าทดแทนเพื่อให้ดูผ่าน
2. ข้อก่อนหน้า2/เดิม4 UX: ผู้ใช้อนุมัติimplementation เอาป้ายPrototype/ข้อความซ้ำออก คงsource/date/error/reviewที่จำเป็นและ3ขั้น/4calculators/2D3D
3. ข้อก่อนหน้า3/เดิม5 บัญชี: ผู้ใช้อนุมัติimplementation email/passwordทีมสร้างInspector เห็นและแก้เฉพาะงานตนSave/reopen/history บังคับownerที่server
4. ข้อก่อนหน้า4/เดิม6 preparedAI: ผู้ใช้สั่งทำและเพิ่มInspectorแก้จุด/ขอบเขตพื้นที่เสี่ยงได้เพราะMLผิดได้ มีaccept/edit/move/manualadd/reject/undo/cancel/confirmreviewและversionedprivateSave

**เลขล่าสุด:** active1UX/2บัญชี/3AI ตรงก่อนหน้า2/3/4และเดิม4/5/6;พัก4Pi/5รายงานตรงเดิม7/8 ข้อก่อนหน้า1ตัดจากรอบนี้เป็นประวัติ ไม่มีการนับว่าเสร็จโดยimplementation

**พบความคืบหน้าจากsupportระหว่างรอบ:** รักษารายการส่งมอบ17:58ของsupportไว้ทั้งหมด อ่าน`support/HANDOFF.md`และdataจริง supportรายงาน32checksผ่าน/14rawcandidates/44websitecasesdesigned_not_run แชทหลักรันread-onlySHA256core12ไฟล์ตรงและนับ14features;ยังไม่รันconversion/datautilityซ้ำหรือwebsitechecks Candidate00012มี378verticesเกินplanner120 ห้ามตัดจุด/hullอัตโนมัติแล้วอ้างrawเดิม ให้แสดงrawและInspectorกำหนดขอบเขตบินใหม่อย่างชัดเจน

**แผนeditor:** เก็บrawAnalysisimmutable → InspectorRiskDraft/decisions → confirmedreviewrevision → planningtargetrevision → plan แต่ละฉบับอ้างresult/source/geometryhash และผู้แก้+เวลาจากsession/server เปิดเปรียบเทียบAIต้นฉบับได้ แก้/ย้าย/เพิ่ม/ปฏิเสธไม่เขียนทับraw การเพิ่มนอกAIcoverageเก็บmanualoriginและไม่อ้างAIตรวจแล้ว ถ้าออกนอกภาพ/ภารกิจที่reviewให้ผ่านreviewขอบเขตใหม่ก่อนplan การconfirmแก้หลังสร้างplaninvalidateแผนเก่า;draftระหว่างแก้ล็อกการใช้แผน/ดาวน์โหลด Undo/Cancelคืนdraft/confirmedgeometryโดยตรวจreadinessปัจจุบัน ไม่คืนReadyหมดอายุ Savefailเก็บdraft/retry;revisionconflictไม่ทับเงียบ

**จุดเชื่อมที่ต้องระวัง:** `setGeometry()`ปัจจุบันresetSurvey/resetReview/schedule จึงห้ามเรียกทุกvertexdrag editorต้องแยกลifecycleจากsearchAOI/selectedscene และคงพฤติกรรมเวลาเดิม ขยายrevisionguardก่อน/หลังexportresponseให้รวมreview/target/session ป้องกันfileเก่าหลังedit/logout

**สองแชท/เวลาเป้าหมาย4ชั่วโมง:**

| นาที | แชทหลักแก้เว็บเท่านั้น | แชทสนับสนุนไม่แก้เว็บ |
| --- | --- | --- |
| 0–20 | ตรวจauth/DBพร้อมและตรึงmission/review/draftcontract รับpackageที่hashผ่านแล้ว | ใช้packageเดิม เตรียมกรณีriskedit/378จุด ส่งfindingsแรก |
| 20–100 | บัญชี/session/ownerSaveเป็นฐาน เก็บUXและจุดรับAI | ออกแบบfixtureaddendum/testcasesการแก้/Undo/Save/conflict/privacy เป้า45–60นาที |
| 100–165 | ต่อAIoverlay+InspectorRiskDraft/review+plannerเดิม+privateSave/history | ตรวจข้อเสนอgeometry/revisionและหลักฐานที่mainส่ง ไม่patchweb |
| 165–205 | ตรวจสองบัญชี/editedsave-reopen/staleplan/lateexport/errors/mobile/suite/build | ตรวจช่องว่างtestplanเทียบหลักฐาน แยกdesignedจากexecuted |
| 205–225 | ผู้ใช้ลองภารกิจที่แก้riskแล้ว แก้blocker | ส่งข้อสรุปที่ยังติด |
| 225–240 | ปิดเอกสาร/หลักฐานreleaseและตรวจProductionตามขอบเขตอนุญาต | ส่งhandoffเท่านั้น ไม่มีGit/deploy |

เวลาเป็นtimeboxไม่ใช่guarantee แม้ตัดข้อ1และdataพร้อมแล้ว authdurablebackendยังcritical ถ้าinfraไม่พร้อมแจ้งcheckpoint20นาทีและประเมินใหม่ ไม่ลดprivacyหรือเสกtestpassเพื่อให้ทัน4ชั่วโมง

**ไฟล์รอบนี้:** อัปเดตcanonicalMarkdownสองไฟล์,implementation-queue.json,AI_INTEGRATION_PLAN.md;ปรับSUPPORT_CHAT_BRIEF/TEST_PLAN_TEMPLATE/HANDOFF_STATUSในoutputแม่;เพิ่มREVIEW_EDIT_ADDENDUM.mdสั่งsupportเขียนเฉพาะ`support/review-edit/` ไม่แตะcorepackage/checksums/validation/TEST_PLAN44กรณีเดิม

**ผลตรวจ/เผยแพร่:** primaryhash12ไฟล์ตรง/อ่าน14features;ตรวจJSONและdiffเอกสาร ไม่มีapplicationcodeeditหรือapplicationtests/inference/DBaccountchanges ไม่มีcommit/push/deploy ไม่ใช้482testsของreleaseก่อนเป็นผลใหม่ อนุมัติimplementationของสามงานถูกบันทึกแล้วไม่ต้องถามซ้ำ รอคำตอบผลิตภัณฑ์: ไม่มี

### Promptพร้อมใช้สำหรับแชทคู่ขนานขั้นแรก — 27 ต.ค. 2026

**หัวข้อ:** เขียนคำสั่งละเอียดให้แชทสนับสนุนเริ่มจากข้อมูลล่าสุดโดยไม่ทำซ้ำหรือแก้เว็บ

**สรุป:** สร้าง `C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/PARALLEL_STEP_1_PROMPT.md` เป็นpromptเต็มพร้อมคัดลอก บทบาทขั้นแรกคือรับpackageSARเดิมแบบอ่านอย่างเดียว แล้วเตรียมrisk-editfixtures/testmatrixให้main ไม่ใช่เริ่มconversionใหม่ ชุดsupport17:58ยังคงอยู่ ผล32data checksและmain12hashesเป็นผลรอบก่อน ไม่ถือว่าตรวจซ้ำใหม่ในรอบเขียนprompt

**รายละเอียด:** promptกำหนดขอบเขตล่าสุด3งานและงานprofile/scheduleที่ตัดออก;ลำดับอ่านAGENTS/log/queue/website/AIplan/handoff+actualfiles;readonlyHEAD/status;writeเฉพาะsupport/review-edit/พร้อมappendcanonicalMarkdownสั้นตามAGENTS;ไม่มีsource/API/DB/config/tests/package/build/Git/deploy/account/inferencechanges อธิบายraw/draft/confirmedtarget/revision/session/privacy/coverage/378pointlimitและตัวอย่างfixturesที่ต้องมี แยกexecuteddatachecksจากdesignedwebsitecases กำหนดไฟล์ส่งมอบและcheckpoint20นาที/45–60นาทีพร้อมblockerreportและabsolutehandoffpath

**ป้องกันการเขียนทับ:** support/prepare_result.pyมีdefaultregeneratecorepackage จึงห้ามรันหรือimportในงานขั้นแรกนี้ ใช้read-onlychecksumและutilityfixtureแยก รักษาoriginalmanifest/validation/hash/44caseTEST_PLAN runtimesupport/.venvมีแล้วให้probeก่อนsetupใหม่ ไม่แตะglobal/runtimeของweb

**ไฟล์ที่เปลี่ยน:** เพิ่มpromptไฟล์ข้างต้น อัปเดตqueueให้มีfirstStepPromptPath/scope/status และappendบันทึกในXEDO_WORK_LOG.mdกับWEBSITE_DETAILS.mdเท่านั้น ไม่สร้างfixtureจริงในรอบนี้ ไม่เปลี่ยนผลส่งมอบsupport

**ผลตรวจ/เผยแพร่:** ตรวจเนื้อหาprompt/pathและJSON/diffcheckเอกสาร ไม่มีappcodeedit/applicationtests/datautility/fixturevalidation/newinference/hashrerunใหม่ ไม่มีcommit/push/deploy ไม่สร้างหรือส่งข้อความไปแชทอื่นเอง ผู้ใช้คัดลอกpromptไปเริ่มงานได้ รอคำตอบ:ไม่มี


<!-- support-review-edit-2026-10-27-01a17cf8 -->
### 27 ตุลาคม 2026 21:19 น. — Support ส่ง Inspector risk-edit fixtures

- **หัวข้อ:** ตรวจรับcoreSARเดิมแบบread-only และสร้างfixture/testaddendumสำหรับInspectorแก้/เพิ่ม/ย้าย/ปฏิเสธพื้นที่เสี่ยง โดยmainแก้websiteเพียงแชทเดียว
- **สรุป:** พร้อมส่ง [HANDOFF_ADDENDUM.md](C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/support/review-edit/HANDOFF_ADDENDUM.md) ในsupport/review-edit/ มี19geometryfixtures/14scenariosRE01–RE14/TEST_PLAN_EDITING.md/STATE_FLOW.md/utility+acceptance/validation ไม่สร้างcorepackageซ้ำและไม่รันหรือimportprepare_result.py
- **ผลตรวจใหม่จริง:** core12SHA256ตรง,metadata/runtimeเดิมพร้อม;fixtureassertions298executed_passed/0failed;manualvalid400backgroundpixelsไม่ทับraw14candidate;crossing399valid+1NoData;NoDataonly400pixels;outsidefootprint20,000m²;rawcandidate00012ยัง378จุดexactgeometry;22watchedcore/source/checkpoint/doc hashesก่อน–หลังไม่เปลี่ยน มี3coveragechecksnot_runสำหรับintentionallyinvalidgeometryเพราะintersectionไม่นิยาม แต่ตรวจrejectionแล้ว ไม่ใช้32data checksหรือ482webtestsเก่าเป็นผลรอบใหม่
- **ข้อเสนอ/งานmain:** rawimmutable→draft/decisions→confirmedreview→planningtarget→plan;setGeometryresetภาพ/review/scheduleจึงไม่ใช้ต่อvertex;surveyIdresolveกลับfrozenoriginalboundaryต้องมีtargetadapter;ขยายepoch/result/review/target/sessionguardก่อนและหลังawait/export;Savefail/conflictรักษาdraft,Cancelตรวจreadinessใหม่ RE01–RE14webcasesทั้งหมดdesigned_not_run/executed0
- **ไฟล์/ประวัติ:** เขียนเฉพาะreview-edit/และappendสองMarkdownกลางตามAGENTS ไม่แตะcoremanifest/checksums/validation/TEST_PLAN44กรณีเดิม Initialzero-area fixtureconstructionเคยfailedจากnonlinearreprojection เก็บvalidation.initial-fixture-construction.json แล้วแก้เฉพาะfixtureWGS84;ผลปัจจุบันผ่าน พร้อมdelivery_status/continuity_receipt/source_drift_observation
- **ขอบเขตล่าสุด:** ไม่เพิ่มnormalprofile/batterydefaults/userstart-derivedend/fullnormalexportgateที่ผู้ใช้ตัดออก เก็บplanner/เวลา/export/readinessเดิม แผนเก่าPL01/PL02และgateที่ขัดกันถูกsupersedeเฉพาะscopeโดยไม่แก้coretestplan
- **Source/งานขนาน:** HEADอ่าน28d7e9d1b852f1d55ecf115681ff24a13f968918 มีdocsdirty4ตั้งแต่เริ่ม;ท้ายรอบพบmainเพิ่มuntrackedinspector-mission-document/save schemasและexamples อ่านสองschemaเท่านั้น/ไม่แก้ บันทึกhashและmappingข้อเสนอในhandoff§3.7 ต้องตรวจcontractล่าสุดก่อนintegration ไม่ถือschemaartifactเป็นAPI/DBที่deployแล้ว
- **ไม่รัน/เผยแพร่:** ไม่มีwebsiteeditor/API/auth/privacy/save/history/browser/staleexportexecutionหรือProductioncalls ไม่มีnewinference/training/accountDBservicechanges/Gitmutation/commit/push/deploy Supportไม่แก้source/config/schema/packages/tests/buildของweb
- **งานค้าง/รอคำตอบ:** ไม่มีdata/runtimeblockerหรือคำถามผู้ใช้ค้าง Mainใช้fixtureทำcontract/editor/ownership/persistenceและรันRE01–RE14จริง ผู้ใช้นำabsolutehandoffpathส่งต่อmain ไม่มีการส่งข้อความไปuser-ownedchatอื่นเอง

### Phase1 เริ่มจริง — ตรวจ backend และสัญญาข้อมูล — 27 ต.ค. 2026

**หัวข้อ:** ตรวจความพร้อมบัญชี/ฐานข้อมูลและกำหนดmission/reviewก่อนเชื่อมfeature

**สรุป:** ผู้ใช้สั่งเริ่มขั้นแรก0–20นาทีและแจ้งsupportทำงานแล้ว ทำส่วนที่ไม่ต้องใช้สิทธิ์backendครบเป็นlocalcontract2schemas+2examplesและread-onlyartifactchecks แต่ยังไม่ยืนยันliveDBschema/Auth/privateSave เพราะconnectorไม่เห็นXEDO ผู้ใช้ยืนยันprojectURLตรงเดิมและรายงานteaminvite/refreshแล้ว ตรวจหลังrefreshยังdenied จึงแยกเป็นexternalaccessgate ไม่สรุปว่าฐานข้อมูลล่มและไม่ถือว่าphase1ด้านbackendผ่าน

**ผลตรวจบริการจริง:**

- Supabase projectที่ผู้ใช้ยืนยัน:`tstmjnlhwidwtzetqxbu`/dashboardURLตรงตัวอ้างอิงเดิม ผู้ใช้บอกโปรเจกต์อยู่กับอีกemailและเชิญemailนี้เข้าteamแล้ว ต่อมาแจ้งrefreshconnectorแล้วด้วย
- MCP listprojectsหลังrefreshยังคืน2โปรเจกต์อื่นและlistorganizationsมี1องค์กรส่วนตัว getprojectXEDOคืนpermissiondenied ไม่ตรวจตาราง/ข้อมูลของโปรเจกต์อื่น ไม่รู้actualmembership/acceptedinvite/projectrole/OAuthorggrantขององค์กรXEDO
- BrowserfallbackไปDashboardที่ผู้ใช้ส่งมาredirectหน้าSignIn ไม่มีprojectsession ไม่กรอกcredentialหรือกดgrantใดๆ สถานะนี้ไม่ใช่หลักฐานว่าSupabaseprojectเสีย
- Vercelmetadataของproject`prj_x35WcipWxA767cYwv3f0CXcdyea3`อ่านได้ แต่envmetadata API403forbidden;ไม่มีVercelCLIที่ติดตั้งให้ใช้fallback จึงไม่อ้างว่ารู้ค่าหรือความพร้อมProductionenv ไม่decrypt/listsecretvalues
- Localruntimeตรวจเฉพาะpresence booleans:SupabaseURL/publishable/secret-serviceRole/DatabaseURL/Cloudflareaccount-tokenไม่มีที่ตั้งไว้ ไม่พิมพ์ค่าหรือcredentialfiles ไม่มีการเปลี่ยน.env
- อ่านofficialSupabaseAuth/RLS/MCPdocsและchangelogก่อนออกแบบ `.md`changelogถูกwebreaderปฏิเสธcontenttypeจึงตรวจofficialHTMLchangelogแทน ไม่ปรับsettingตามข่าวโดยไม่จำเป็น

**สัญญาข้อมูลที่สร้างจริง:**

- `contracts/inspector-mission-document.schema.json`: clienteditabletitle/inputMode/searchGeometry/durableimageidentity/analysisrefbyhash/riskDraft/planningInputs ค่าที่กำลังวาดอาจยังไม่สมบูรณ์และSaveDraftได้ ไม่รับowner/reviewer/serverclock/readinesssealในdocument
- `contracts/inspector-mission-save.schema.json`: missionId(nullเมื่อcreate)/expectedRevision/mutationId/intent(save_draftหรือconfirm_risk)/document;confirmationต้องมีtargetPolygonหนึ่งวง≤120จุด ไม่มีรู ส่วนclosure/topology/coverageต้องruntimevalidate ไม่อ้างJSONschemaว่าพิสูจน์ได้เอง
- `contracts/examples/inspector-save-draft.json` และ `inspector-confirm-risk.json`: ตัวอย่างUUIDสมมุติและcandidate00001จริง8verticesผูกhashcatalog ไม่ได้ส่งrequestจริงหรือยืนยันแทนInspector ตัวอย่างgeometryผ่านdomainvalidatorและ≤120จุด Payload≤1MiB/plannerinputs≤64KiB
- rawAI/resultอยู่นอกmissioneditable เป็นcatalogimmutable ส่วนprivateRiskDraft/decisions/review/targetผูกmissionowner/revision AI/reviewไม่ถูกยัดเป็นtopfieldใหม่ในcalculatorAPIเดิมเพราะstrictallowlist

**storage/saveหลักที่กำหนด:** mission_heads(owner/currentrevision),append-onlymission_revisions(document/hash/actor/time),mutation_receipts(owner+mutationId/requesthash/committedresponse) หนึ่งCASrevisioncounter;transactionตรวจreceiptก่อนCAS→samebodyreturnreceiptเดิม/differentbody409→owner/headrevision→appendrevision/updatehead/receiptพร้อมกัน confirmสร้างreview/targetrevisionเท่ากับrevisionใหม่และinvalidateplanatomically draftsaveรักษาconfirmedrefsเดิม ไม่เชื่อowner/reviewer/timeจากrequest unknownหรือforeignmission404,sameownerstale409 UIรักษาdraftเมื่อfailหรือSaveAตอบช้าหลังeditB

**เปิดกลับและsession:** เก็บsource identity/วันที่/grid/hash ไม่persistGEEtileURL/session เมื่อopenต้องreacquireimagery/refreshconditions/readiness Storedpass/readyเป็นประวัติไม่ใช่ความพร้อมปัจจุบัน;exportguardผูกsessionepoch/user/mission/review/target/input/localeditก่อนและหลังawait การlogout/revocationต้องออกแบบและทดสอบจริงในimplementation ไม่อ้างแค่getUserว่าพิสูจน์logoutoldtokenแล้ว การใช้Supabaseเป็นทางที่เสนอสำหรับauth/privatepersistenceในprojectเดิม ไม่ใช่ย้ายD1/R2workspaceเดิมโดยอัตโนมัติ

**ผลตรวจใหม่ในเครื่อง:** coreSAR12SHA256ตรง/raw14candidate/candidate00012ยัง378จุด;parse3schemaJSONรวมของเดิม/resolve3relativeRefs/parse2examples/ตรวจsamplegeometryและbytebudgets/ไม่มีownerreviewerfieldsในclientexample ผ่าน Report`output/release-check/phase1-inspector-backend-2026-10-27/contract-artifact-checks.json` FullJSONSchemaenginevalidationยังไม่รันเพราะruntimeที่มีไม่พบvalidatorและไม่ติดตั้งเพิ่มเพื่อรอบนี้ ไม่มีwebsiteunit/API/privacy/browserflow/buildหรือDBtransactiontestใหม่ ไม่มีnewinference/conversionrerun

**รับsupportเพิ่มเติมระหว่างรอบ:** รักษารายการsupport21:19ไว้ อ่าน`support/review-edit/HANDOFF_ADDENDUM.md`และvalidationแล้ว พบ19geometryfixtures/14REscenarios supportรายงาน298fixtureassertionsผ่านและ3coveragechecksnot_runสำหรับinvalidgeometries Webcasesยังdesigned_not_run/executed0 Mainยังไม่รันutilityนี้ซ้ำ ไม่ใช้ผลนั้นอ้างว่าeditorของเว็บทำงานแล้ว

**หลักฐาน/ไฟล์อื่น:** `output/release-check/phase1-inspector-backend-2026-10-27/readiness.json`สถานะแต่ละบริการที่ปลอดsecret;อัปเดตqueue/สองcanonicalMarkdown ไม่มีDDL/account/permission/servicechanges ไม่มีcommit/push/deploy applicationruntime/UIยังเดิม

**รอดำเนินการ/รอคำตอบ:** ProjectURL/teaminvite/refreshผู้ใช้ตอบแล้ว ห้ามถามซ้ำ ประเด็นที่เหลือคือยืนยันacceptedmembership/projectscopeและอนุญาตconnectorให้เห็นองค์กรที่เป็นเจ้าของXEDO เครื่องมือsessionนี้ยังเห็นแค่องค์กรส่วนตัวหลังrefresh ไม่ขอpassword/APIkey/PATหรือยกระดับroleโดยอัตโนมัติ

### 27 ตุลาคม 2026 21:41 น. — ยืนยัน Dashboard องค์กร megaphijak และจัดขั้นตอน OAuth

**หัวข้อ:** ผู้ใช้ส่งภาพยืนยันว่าเข้า xedo ใน Supabase ได้จริง และขอขั้นตอนอนุญาตการเชื่อมต่ออย่างละเอียด

**สรุป:** รับหลักฐานใหม่ว่าบัญชีใน Chrome เปิด project `tstmjnlhwidwtzetqxbu` ภายใต้องค์กร **megaphijak** ได้และ Dashboard แสดง Healthy การเข้าถึง browser จึงยืนยันแล้ว ส่วนสิทธิ์ OAuth ของ connector ยังรอผล ขั้นตอนที่ให้เริ่มจาก Supabase plugin เดิมและเลือกองค์กรนี้ในหน้าอนุญาต ไม่ตีความว่าผู้ใช้ยังเข้า Dashboard ไม่ได้ ไม่สั่งแก้เว็บไซต์หรือบัญชีตามคำถาม how-to นี้

**รายละเอียดและไฟล์ที่เปลี่ยน:**

- อ่าน log/queue และ Git status ของ active checkout ก่อนทำงาน HEAD `28d7e9d1b852f1d55ecf115681ff24a13f968918` มี docs/contracts ค้างจาก phase1 รักษารายการ support ทั้ง 17:58 และ 21:19 และงานเดิมไว้
- อ่าน local config เฉพาะรายการ plugin/MCP ที่ไม่เปิดเผย secret และ manifest/.app.json พบ Supabase app ID `asdk_app_69d3e5ee6a708191baa733f7b8931995`; เปิด public plugin page ผ่าน IAB ตรวจชื่อ/Apps/version แต่ session นั้นไม่ได้ล็อกอิน จึงไม่เห็นปุ่มจัดการ connection ส่วนตัว ไม่ใช้ข้อความที่เดาชื่อเมนูเป็นข้อเท็จจริง
- ใช้ OpenAI Docs และ Supabase skill ตรวจ official docs/source; subagent ช่วยค้นแบบ read-only พบ OpenAI Plugins → Installed → Supabase และ Apps/connection details ตาม client; OAuth ต้องเลือก **megaphijak** และ xedo ถ้ามี project selector Browser OAuth account อาจต่างจากบัญชีใน screenshot จึงให้ตรวจ Authorizing as
- ตรวจทางเข้า Supabase Organization Settings → Connections → OAuth Apps → Authorized apps จาก source ทางการ เพื่อดู grant ที่มีอยู่ ไม่ให้สร้าง Published app ใหม่ และไม่อนุมาน organization slug จากชื่อ megaphijak การเข้า Organization Settings จาก project breadcrumb ยังไม่ได้กดตรวจจริง จึงไม่ชี้รูปเฟืองในภาพแบบเดา
- Member-bound grant ใน source อาจอนุญาตตาม role โดยไม่ต้อง admin เพิ่ม จึงไม่บังคับเปลี่ยนเป็น Owner หากยังไม่มี actual role error ไม่ขอ PAT/password/API key ไม่เปลี่ยนสิทธิ์/ถอด connection/สร้าง OAuth app แทนผู้ใช้
- อัปเดต `docs/WEBSITE_DETAILS.md` ข้อ3.18 ด้วยขั้นตอนหลัก ทางตรวจ grant กรณีไม่พบองค์กร และเกณฑ์ตรวจหลังผู้ใช้ทำเสร็จ; อัปเดต `docs/implementation-queue.json` ยืนยัน organization/browser access และคง pending เฉพาะ connector grant

**การตรวจรอบนี้:** ภาพจริง + metadata/plugin page + official documents/source เท่านั้น ไม่เรียก Supabase permission-denied ซ้ำ ไม่มี application source/DB/schema/account/config/permission changes ไม่รัน app tests/builds ใหม่ ไม่ทดสอบ login/private Save และไม่อ้างผล 482 tests ของ release เก่าเป็นผลรอบนี้ ตรวจ parse ของ queue และความเรียบร้อย diff เอกสารก่อนจบ

**สถานะเผยแพร่:** documentation changes ในเครื่อง ยังไม่มี commit/push/deploy รอบนี้ application release เดิมคงตาม receipt ที่บันทึกไว้ก่อนหน้า ไม่ตรวจ deployment ใหม่

**รอคำตอบ/รอดำเนินการ:** ผลการอนุญาต Supabase plugin ให้เข้าถึง **megaphijak** และ target xedo เมื่อผู้ใช้ทำแล้วจึงตรวจ `get_project`/schema แบบ read-only ต่อ หรือใช้ภาพหน้า Organization/error ที่เกิดขึ้นจริงวิเคราะห์ โดยไม่ถามชื่อองค์กร/Project Ref/teaminvite เดิมซ้ำ

### 27 ตุลาคม 2026 22:55 น. — เข้า Supabase ได้และเตรียม Inspector foundation ในเครื่อง

**หัวข้อ:** ตรวจ connection ใหม่และทำขั้นถัดไปของบัญชี Inspector/ภารกิจส่วนตัว ตามคำสั่งให้ต่อเมื่อเข้า xedo ได้

**สรุป:** เข้าได้จริงผ่าน connection **megaphijak** แล้ว เตรียม login อีเมล/รหัสผ่าน, Save draft, My missions, version history และ SQL ที่แยก owner/session ไว้ครบสำหรับขั้น foundation ผ่าน **500 tests**, syntax, 3 builds และ browser QA แบบใช้บัญชีจำลอง/ฐานข้อมูล PostgreSQL ในเครื่อง การสร้าง schema จริงถูก auto-review ปฏิเสธและยังไม่ได้เกิดขึ้น ผู้ใช้ตอบว่า **ยังไม่มีบัญชีทดลอง — เตรียมระบบก่อน ทีมสร้างบัญชีภายหลัง** จึงไม่สร้างบัญชีใด

**สิ่งที่ตรวจจากบริการจริง:**

- คำขอแรกยังใช้ connection เดิมแล้ว denied ระหว่างรอบ metadata ของเครื่องมืออัปเดตให้เลือก `link_id` ได้ 2 connections; ระบุ link ของ **megaphijak** แล้ว get_project สำเร็จ ไม่ใช่ฐานข้อมูลกลับมาจากอาการล่ม และไม่ใช่ผู้ใช้ยังไม่ได้อนุญาต
- get_project: `xedo`, ref `tstmjnlhwidwtzetqxbu`, organization `rphjcbkprrafgiregduu`/megaphijak, ACTIVE_HEALTHY, PostgreSQL 17.11, eu-west-1
- public tables=[]; migrations=[]; security advisor lints=[]; ตรวจ auth.sessions columns เพื่อรองรับ session_id/user_id/not_after; Auth users=0 ไม่อ่านรายการอีเมลหรือ credential
- ใช้ publishable key ที่เครื่องมือส่งให้ตรวจ public Auth settings จริง: Auth reachable, email enabled=true, disable_signup=false ไม่ขอ service-role key และไม่เปลี่ยน Auth config
- หลังคำขอ migration ถูกปฏิเสธ ตรวจจริงซ้ำได้ `private_schema_exists=false`, `rpc_exists=false`, `auth_user_count=0`

**โค้ด/ไฟล์ที่เพิ่มหรือแก้:**

- `api/inspector.mjs`: same-origin JSON BFF และ Node bridge ใช้ JWT ของผู้ใช้กับ Supabase ไม่คืน token ให้ JS; cookie HttpOnly/Secure/SameSite ใน HTTPS, ไม่มี refresh token, ต้อง sign in ใหม่เมื่อหมดอายุ ตรวจ expected actor เทียบตัวตนจริงก่อน private RPC เพื่อกันการเปลี่ยนบัญชีในอีกแท็บ; logout พยายาม revoke ทั้ง app/Supabase และรายงานหากยืนยัน server revocation ไม่ได้
- `src/inspector-project.js`: URL และ publishable key ซึ่งเป็น public configuration ของ target ที่ผู้ใช้ยืนยัน ไม่ใช่ admin secret; pin project ป้องกัน env เดิมชี้อีกโครงการโดยเงียบ
- `src/inspector-validation.js`: AJV 2020/formats ตรวจ schema/UUID/เวลา/geometry/ขนาด 1 MiB และ planning inputs64KiB; ปฏิเสธ confirm_risk จนขั้น AI review พร้อม
- `src/inspector-client.js`, `inspector-state.js`, `inspector.css`: login/My missions/Save/copy/history, mutation retry, session/edit epochs, pending save/newer edits, discard prompt สำหรับ Open/New/Logout, มือถือ และเก็บร่างเมื่อ service ล้มเหลว
- `src/planning-trial-client.js`: capture/restore mission, ไม่ใช้ saved readiness อนุมัติ export, ตรวจ session และ context ก่อน await แรก/หลัง freshness/หลังผล export/ก่อน download; Start another inspection เริ่ม identity ภารกิจใหม่ ไม่บันทึกทับงานเดิมโดยเงียบ; รักษา 3 ขั้นและ4 calculators/normal profile/schedule
- `server.mjs`, `vercel.json`: Inspector route ก่อน hosted GEE catch-all; Vercel include schema files; browser calculation flow เดิมไม่ถูกเปลี่ยนไปเรียก calculator backend
- `db/inspector-foundation.sql`: ร่าง migration schema private/5 tables/RLS/owner/session/append-only/CAS/receipts และ RPC ไม่ได้ใช้จริง ดู review file/hash
- `tests/inspector-api.test.mjs`, `tests/inspector-database.test.mjs`, `tests/helpers/inspector-db.mjs`, `tests/planning-workflow.test.mjs`: tests ใหม่ของ auth/API/account epochs/SQL และ export race
- `scripts/preview-inspector.mjs`: QA server ที่ใช้ Auth จำลอง+PGlite in-memory เท่านั้น; `scripts/check-inspector-readiness.mjs`: public Auth metadata probe
- `package.json`/lock: AJV8.20.0, formats3.0.1 และ dev PGlite0.5.12 แบบ exact versions; เพิ่ม check/test/QA scripts; ปรับคำอธิบาย save contract ว่า local implementation และยังไม่ deploy
- `docs/INSPECTOR_MIGRATION_REVIEW.md`: target, SQL hash, เปลี่ยนอะไร/ไม่เปลี่ยนอะไร, ผลตรวจ, ข้อจำกัด และ approval request; อัปเดต canonical docs/queue โดยรักษารายการ support เดิม

**ผลตรวจใหม่:**

| การตรวจ | ผลและขอบเขต |
| --- | --- |
| Standard test suite | **500 ผ่าน / 0 ล้มเหลว / 0 ข้าม** |
| Syntax / production / workspace / portable HTML | ผ่าน; log อยู่ output/release-check/inspector-foundation-2026-10-27 |
| SQL/roles ใน PGlite | owner/foreign404/history/idempotency/stale409/owner spoof/anonymous/direct grants/session expiry+revocation ผ่าน ไม่ใช่ hosted Auth หรือ multi-connection concurrency |
| Browser QA | loginจำลองA→Savev1/v2→history→เปิดv1→staleSaveถูกกัน→logout→Bไม่เห็นA; Saveพื้นที่24,131m²/reload/openกลับและexportยังdisabled; มี3steps/4calculatornodes |
| Mobile | viewport390/dialog362/page375 px ไม่ล้นแนวนอน เก็บภาพไว้ |
| Dependency audit | moderate4/high0/critical0 ใน dev toolchain เดิม ไม่ force-fix หรือขยาย scope อัปเกรดเดิม |

Regression รอบแรกพบ VM test harness ยังไม่มี inspectorUI หลังเพิ่ม dependency จึง bind stub ที่ boundary และเพิ่มกรณีจริงของ logout/account switch/session expiry ระหว่าง export ก่อนรัน500ผ่าน ไม่ลด assertions เดิม การ review แบบ read-only เพิ่มแก้ logout failure, null action, RPC basic shape limits, startup dirty tracking และ cross-tab actor binding ก่อนปิดรอบ

**คำขอที่ถูกปฏิเสธ:** `apply_migration` ชื่อ `xedo_inspector_foundation` ใน live xedo ถูก auto-review ปฏิเสธ เพราะสร้าง schema/tables/RLS/security-definer functions/RPC/grants ถาวร ยังไม่มี explicit approval ของ migration นี้และตอนนั้น SQL ยังตรวจไม่ครบ จึงไม่ retry และไม่ใช้ execute_sql หลบ ปัจจุบัน SQL ผ่าน local PostgreSQL/tests แล้ว แต่ยังต้องขออนุมัติ live action แบบชัดเจน SHA256 `62fe9b38623b3e3b8ce4fd04ad2cbb9aace6ca8553ae817ef34e31f6cc1633d2`

**สถานะเผยแพร่/งานคงเหลือ:** ไม่มี production DB mutation, ไม่มีบัญชีผู้ทดลองใหม่, ไม่มี commit/push/deploy Application ที่เผยแพร่ยังเป็น release เดิม ระบบบัญชีนี้ local-only; ต้องใช้ migration หลังอนุมัติ ตรวจ grant/advisorจริง แล้วให้ทีมสร้างบัญชี+team roster และทดสอบจริง2บัญชีก่อนนับข้อบัญชีเสร็จ ขั้น UX และ prepared AI/risk editing ยังอยู่ในคิว ไม่อ้างว่าเชื่อมแล้ว Pi/รายงานพักเหมือนเดิม

**รอคำตอบ:** อนุมัติ migration ตามไฟล์/hash/target ใน `docs/INSPECTOR_MIGRATION_REVIEW.md` หรือไม่? สิทธิ์องค์กรได้รับและตรวจสำเร็จแล้ว ส่วนการสร้างบัญชีไม่มีคำถามค้าง ผู้ใช้เลือกให้ทีมทำภายหลัง

### 28 ตุลาคม 2026 — ชี้แจงสถานะระบบ account ให้แยกในเครื่องกับเว็บจริง

**หัวข้อ:** ผู้ใช้ถามว่าระบบ account เสร็จแล้วหรือไม่

**สรุป:** โค้ด foundation ของบัญชี Inspector และภารกิจส่วนตัวทำและตรวจในเครื่องแล้ว แต่ยังนับว่าเปิดใช้งานจริงเสร็จไม่ได้ เพราะ migration ยังไม่ถูกใช้กับ Supabase และยังไม่เผยแพร่โค้ดชุดนี้ ต้องรออนุมัติชุด SQL ที่ระบุไว้ ให้ทีมสร้างบัญชี/เพิ่มรายชื่อ Inspector แล้วทดสอบบัญชีจริงและเผยแพร่ตามขอบเขตที่ได้รับอนุญาต

**รายละเอียด:** อ่าน canonical log/queue, WEBSITE_DETAILS, migration review และ Git status ของ active checkout ยืนยันสถานะเอกสารตรงกันว่า migrationApplied=false, realAccountsCreated=false, realAccountAcceptanceRun=false, commitPushDeploy=false โค้ดที่มีครอบคลุม email/password, logout/session, My missions, Save/copy/history และ owner/session guards ผล 500 tests/3 builds/QA ด้วย Auth จำลองเป็นหลักฐานรอบ 27 ต.ค. ไม่ใช่การรันใหม่หรือการทดสอบบัญชีจริงในรอบนี้ ไม่ตรวจบริการสด ไม่แก้ source/SQL/config ไม่สร้างบัญชี และไม่มี commit/push/deploy อัปเดตสอง Markdown เท่านั้น สถานะ/ข้อกำหนดใน implementation-queue.json ยังตรงเดิมจึงไม่เปลี่ยน queue

**รอคำตอบ:** อนุมัติ live migration `db/inspector-foundation.sql` บน xedo/ref `tstmjnlhwidwtzetqxbu` ตาม review/hash เดิม คำถามผู้ใช้เรื่องสถานะครั้งนี้ไม่ใช่คำอนุมัติ migration ระบบตรวจอนุมัติอัตโนมัติเคยปฏิเสธเพราะเปลี่ยน schema/tables/RLS/functions/grants ถาวรและยังไม่มีอนุมัติชุดนี้อย่างชัดเจน ไม่ลองหลบหรือส่งคำขอซ้ำ การสร้างบัญชีให้ทีมทำภายหลังตามคำตอบเดิม ไม่มีคำถามค้างเรื่องวิธีสมัครหรือ role

### 28 ตุลาคม 2026 — อนุมัติ ใช้ Inspector migration และตรวจสิทธิ์จริง

**หัวข้อ:** ผู้ใช้สั่งใช้ `db/inspector-foundation.sql` กับ Supabase xedo และตรวจตาราง/สิทธิ์ ให้ทีมสร้างบัญชีผู้ทดลองภายหลัง

**สรุป:** ทำครบตามคำสั่งฐานข้อมูลแล้ว ไฟล์SHA256 `62fe9b38623b3e3b8ce4fd04ad2cbb9aace6ca8553ae817ef34e31f6cc1633d2` ตรงชุดที่อนุมัติ ใช้ผ่านMCP apply_migrationสำเร็จ ประวัติ **20261027184951 / xedo_inspector_foundation** จากนั้นตรวจจริง15checksผ่าน รวม5negative probes ไม่มีAuth usersหรือข้อมูลภารกิจ ไม่แก้source/SQL ไม่commit/push/deploy คำอนุมัติที่รอได้รับแล้ว ไม่เหลือคำถามmigration

**รายละเอียด/ก่อนใช้:** อ่านlog/queue/skill/SQL/Gitstatusของactivecheckout มีงานlocalค้างเดิม รักษาทั้งหมดและsupportmarkers2รายการ ตรวจtargetผ่านconnectionmegaphijakเป็นACTIVE_HEALTHY ก่อนใช้public/private tables+migrationsว่าง privateSchema/RPC=false Authusers0 อ่านSupabasefunctions/RLSdocs+changelogปัจจุบัน (.mdcontenttypeอ่านไม่ได้ใช้officialHTMLแทน) subagentช่วยreviewreadonlyของhash/permissionsไม่มีblocker ไม่เขียนไฟล์หรือเรียกliveDBแทนmain คำอนุญาตใหม่แก้เหตุปฏิเสธรอบก่อนแล้วจึงส่งapply_migrationด้วยไฟล์เดิม ไม่ใช้execute_sqlหลบ

**ตรวจหลังใช้จริง:** มี5tablesตรงชื่อทุกตัว เปิดRLSและPK/FK/CHECK/indexตามSQL ตรวจanon/authenticatedไม่มีdirecttableสิทธิ์7แบบและcolumnสิทธิ์4แบบ authenticatedมีschemaUSAGEไม่มีCREATE ส่วนanonไม่มีทั้งคู่ มีprivateDEFINER2/publicINVOKER1 ตั้งsearch_pathว่าง PUBLIC/anonไม่มีEXECUTE identityhelperไม่เปิดให้authenticated แต่entry/wrapperเปิดเฉพาะauthenticated เทียบbody3functionsจากฐานข้อมูลกลับกับไฟล์ตรงกัน ทุกตารางและAuthusersยัง0

**ผลปฏิเสธที่คาดหวังและรันจริง:** anonเรียกRPC→42501; authenticatedไม่มีclaims/session→PT401; authenticatedอ่านmission_headsตรง→42501; authenticatedเรียกrequire_inspectorตรง→42501; claimsจำลองในtransactionแต่ไม่มีauth.sessionsจริง→PT401 ทุกprobeเป็นreadonly/localrole ไม่มีการสร้างAuthuser/session/JWT/ข้อมูลทดสอบ SQLqueryตรวจcatalogครั้งแรกsyntaxวงเล็บเกินแก้เฉพาะSELECTแล้วผ่าน ไม่เปลี่ยนmigration

**Advisors:** Securityไม่มีWARN/ERROR แต่มีINFO `rls_enabled_no_policy`5 เพราะแบบRPC-onlyไม่ให้clientเข้าตารางและdefaultdeny ตรงเจตนา ไม่เพิ่มallowpolicyเพื่อปิดINFO PerformanceINFO FKไม่มีcoveringindex2จุด (`mission_revisions.created_by`, `revoked_sessions.user_id`) เก็บเป็นmaintenanceเมื่อขยายข้อมูล และunusedindex1เพราะเพิ่งสร้าง ไม่มีfollow-upDDLนอกไฟล์ที่อนุมัติ รายงานมีremediationlinksให้ตรวจต่อ

**ไฟล์/หลักฐาน:** เพิ่ม `docs/INSPECTOR_DATABASE_VERIFICATION_2026-10-28.md` อัปเดต `INSPECTOR_MIGRATION_REVIEW.md` ว่าapproved/applied;อัปเดตtopstatus+entryในlogนี้และ `WEBSITE_DETAILS.md` §3.21;queueเอาapprovalออกunanswered/เพิ่มresolved,migrationApplied=true/liveverification15checks. Fullsafe receipt `output/release-check/inspector-live-migration-2026-10-28/verification.json` ไม่มีcredentials เวลาDB18:50UTC27ต.ค.คือ01:50ไทย28ต.ค. จึงแสดงวันที่28ตามtimezoneผู้ใช้

**การตรวจ/เผยแพร่:** รอบนี้ทดสอบฐานข้อมูลจริงและตรวจJSON/diffเอกสารเท่านั้น ไม่มีapplicationtests/build/browserrerun ผล500testsและ3buildsเป็น27ต.ค. ไม่อ้างใหม่ ไม่มีrealpasswordlogin/A-Bownership/concurrencyacceptance ยังไม่สร้างบัญชีและไม่มีcommit/push/deploy DBmigrationใช้จริงแล้วแต่frontend/APIบัญชียังอยู่ในworkingtree งานUX/AIeditorยังคงคิวเดิม งานprofile/scheduleที่ตัดไม่ถูกรื้อกลับ

**รอดำเนินการ/รอคำตอบ:** ไม่มีคำถามผู้ใช้ค้างสำหรับmigration ทีมสร้างAuthusers+เพิ่มrosterภายหลัง แล้วทดสอบจริงA/B/Save/history/logout/expiredsession/concurrencyและreleasefrontendตามคำสั่งรอบนั้น ไม่ขออนุมัติmigrationนี้ซ้ำและไม่สร้างบัญชีแทนทีม

<!-- inspector-account-release-2026-10-28 -->
### 28 ตุลาคม 2026 — เผยแพร่ระบบบัญชี Inspector และตรวจหน้า Login

**หัวข้อ:** ผู้ใช้อนุมัติpush/deployระบบบัญชีขึ้นเว็บจริง ตรวจLoginและให้ทีมสร้างบัญชีภายหลัง

**สรุป:** pushmain/branchและdeployครบแล้ว applicationสุดท้าย`afac1c7f256075eb2202fdcae16102a0e34a43ca`/Vercel`dpl_635dXNArvjRDicq8WgZVmHgZZ9r8`READY เว็บหลักaliasตรงรุ่น CI40565947316success รัน501tests/0failed/0skippedและsyntaxผ่าน 3buildsผ่านก่อนpushและCIใหม่ตรวจ3buildsของfixด้วย หน้าLogin/APIจริงผ่านในขอบเขตที่ไม่ต้องสร้างบัญชี ทีมสร้างบัญชีภายหลัง

**รายละเอียด/ไฟล์:** เผยแพร่BFFapi/inspector.mjs,InspectorUI/state/validation/projectpublicconfig/CSS,plannerSave/restore/sessionguards,routes/package/lock/contracts/SQLที่ใช้แล้ว/tests/QAhelpersและเอกสารที่ค้างจากรอบเตรียม รวมแผนAIเป็นเอกสารเท่านั้นไม่มีAIeditorimplementation แก้descriptionในsavecontractว่าmigrationใช้แล้ว ไม่เปลี่ยนvalidationrule/SQL ไม่มีadminsecretในชุดบัญชี

**ผลตรวจรอบนี้:** initial500tests→หลังroutingfix501testsผ่าน syntaxผ่าน build3รูปแบบผ่านและCIล่าสุดsuccess ใช้Verceldeployments/verificationskills+officialGit/Nodefunctiondocs reviewreadonlyก่อนเผยแพร่ไม่พบsource-levelblockerแต่runtimecheckพบrewrite404และแก้แล้ว PublicAPI7กรณีผ่าน:anonymoussession200user:null/private401/invalidform422/crossorigin403/noorigin403/nonexistentlogin401generic/guestlogout200พร้อมclearcookieHttpOnly+Secure+SameSiteLax+__Host ไม่มีtokenในresponse ทุกresponseเป็นJSON/no-store

**หลักฐาน/ขอบเขต:** output/release-check/inspector-account-release-2026-10-28/ เก็บtests/syntax/buildlogs,production-api.json,รูปdesktop/error/mobile390และrelease-receipt.json DB15checksเป็นรอบmigrationก่อนหน้าไม่รันซ้ำ ไม่มีการสร้างAuthusers/rosterหรือแก้Authsettings ยังไม่ทดสอบsuccessfulpasswordlogin/realA-BSavehistory รอทีมสร้างบัญชี ไม่applySQLซ้ำ ไม่เปิดUX/AIeditorที่ยังอยู่ในคิว

**ปัญหาที่พบระหว่างproductioncheckและแก้ก่อนปิดงาน:** code618fe123f3a47f8177b123e743fd2b3c31d7a7a9/Verceldpl_7J7WL7KTkCrnrCJx7TPJ4FB8PmY4READYแต่publicInspectorrewrite404 ขณะที่direct/api/inspector?route=sessionได้200 แก้selectorรับwildcardcapturepathที่ตรงrouteเท่านั้นและrejectduplicate/conflictingroute/path/offset/revision/unknownkeys เพิ่มregressiontest501ผ่าน เก็บproduction-api.initial-404.json หลังdeployfixafac1c7publicroute/API7กรณีและUIจริงผ่าน ปิดdefectแล้ว ไม่ใช้แค่CIหรือdirectrouteผ่านอ้างว่าเว็บพร้อม

**Browser/observability:** Loginแสดงจากปุ่มInspectoraccount;passwordtype=password/autocompletecurrent-password/requiredtrue;emailrequired/nativevalidation;invalidcredentialsขึ้นgenericmessageและล้างpassword;Escape/Xปิดและคืนfocusปุ่มได้ mobile390dialog362/page375pxไม่overflow desktop1280dialog620/page1265px มี3stepsเดิม Browsererrorlogsล่าสุด[] และVercelerror/fatalscan15นาทีของfixdeploymentไม่พบรายการ เก็บรูปและคืนviewportdefault เปิดแท็บLoginสะอาดไว้ให้ผู้ใช้ ไม่ได้ทดสอบsuccesscookie/realSavehistoryหรือprivacy2บัญชี

**การเผยแพร่เอกสาร:** อัปเดตสองcanonicalMarkdown/queueและcontractdescriptionให้ตรงstatus Pushเอกสารผลตรวจfollow-upในscopeเดียวกันโดยไม่เปลี่ยนapplication;receiptบันทึกidentityสุดท้ายหลังfollow-up ไม่วนสร้างdoccommitเพียงเพื่อบันทึกSHAของตัวเอง

**รอคำตอบ:** ไม่มี ผู้ใช้อนุมัติreleaseแล้ว บัญชีให้ทีมสร้างภายหลังตามเดิม

### 28 ตุลาคม 2026 — ชี้แจงว่าต้องมีบัญชีที่ทีมเปิดสิทธิ์ก่อน Login

**หัวข้อ:** ผู้ใช้ถามก่อนเริ่มsessionถัดไปว่าเปิดเว็บไซต์และLoginเข้าไปได้เลยหรือไม่

**สรุป:** เปิดเว็บไซต์และหน้าInspectoraccountได้แล้ว แต่ถ้าทีมยังไม่สร้างบัญชีและเปิดสิทธิ์Inspector จะยังLoginเข้าใช้งานภารกิจส่วนตัวไม่ได้ การเผยแพร่ระบบไม่ได้สร้างบัญชีผู้ใช้ให้อัตโนมัติ

**รายละเอียด:** ทีมต้องสร้างAuthuserด้วยอีเมล/รหัสผ่าน แล้วเพิ่มAuthuserIDในxedo_private.inspector_accountsพร้อมenabled=true จากนั้นผู้ใช้เปิดเว็บ→Inspectoraccount→ใส่บัญชีที่ทีมจัดให้ ไม่มีpublicsignupบนหน้าเว็บ บัญชีนี้เป็นบัญชีXEDO ไม่ใช่บัญชีเข้าSupabaseDashboard ผลตรวจreleaseเดิมยืนยันหน้าLogin/invalidcredentials/APIเท่านั้น ยังไม่ใช่successful-login/realSavehistoryacceptance อ่านlog/queue/WEBSITE_DETAILSและGitstatusรอบนี้ ไม่มีsource/SQL/account/config changes ไม่มีtests/build/browser/live-service verificationใหม่ อัปเดตสองMarkdownเท่านั้น ไม่เปลี่ยนสถานะqueueเพราะไม่มีข้อกำหนดใหม่ และไม่มีcommit/push/deployรอบคำถามนี้

**รอคำตอบ:** ไม่มี คงคำสั่งให้ทีมสร้างบัญชีภายหลัง ไม่ถือว่าคำถามนี้เป็นการสั่งสร้างบัญชี

### 28 ตุลาคม 2026 — วินิจฉัย GEE ปฏิเสธเวลาภารกิจอัตโนมัติเกิน24ชั่วโมง

**หัวข้อ:** ผู้ใช้ส่งภาพGEEplanningdataunavailable พร้อมข้อความTIME_WINDOW และprogress67%/2of3 แล้วถามสาเหตุ

**สรุป:** ได้รับคำตอบเวลาเริ่ม10/27/2026 08:24:05.270PM/สิ้นสุด10/30/2026 01:15:37.015AM และยืนยันว่าเว็บคำนวณอัตโนมัติ ระยะเวลาบนฐานtimezoneเดียวกันเท่ากับ **52ชั่วโมง51นาที31.745วินาที** (190291745ms) มากกว่า24ชม. จึงยืนยันdurationclauseที่ทำให้serverตอบGEE_CONTEXT_INPUT_INVALID/HTTP422 ไม่ใช่หลักฐานGEE/networkล่ม ตัวคำนวณscheduleขาดเพดานร่วมกับAPIและยังเรียกสถานะreadyได้สำหรับwindowยาวเกิน

**รายละเอียดหลักฐาน:** อ่านภาพ/log/queue/Gitstatus/sourceและใช้subagentreadonlyวิเคราะห์ src/gee-mission-context.js:83ตรวจend<start/duration>24h/start<serverNow−5d/end>serverNow+7dแบบรวม ต่อมาclientplanning-context-request.js:50แสดงข้อความตามภาพ validateที่line240เกิดก่อนupstreamGEE/credentials call ข้อมูลผู้ใช้เพียงพอระบุdurationผิดเงื่อนไข ไม่ต้องขอพิกัดเพื่อวินิจฉัยประเด็นนี้ ไม่มีการโทษการกรอกเวลาของผู้ใช้

**ช่องว่างโค้ด:** planning-schedule.js:90–102คำนวณduration+buffer300s+(sorties−1)*turnaround600s ไม่มีmax24h getReadiness:171–174ตรวจordering/futureแต่ไม่max/horizon ส่วนclientline705ส่งเวลาของexportตรงไปGEE วันที่ภาพเป็นอีกfield ไม่ได้ใช้แทนmissionstart จึงไม่อ้างว่าเกิดเพราะภาพดาวเทียมเก่า ต้องดูผลroute/flightduration/sortiesจริงหากจะตรวจว่าเหตุใดภารกิจนี้คำนวณยาว52ชม.

**Progress/Retry:** readingstage2/3คือได้รับHTTPresponseแล้วและยังไม่รับข้อมูลว่าvalid จึง67% ไม่ใช่GEEคำนวณค้าง67%;inputfailureไม่retryจึงหยุดattempt1/2ตามแบบ การRefresh/Replanอย่างเดียวไม่แก้เมื่อdurationยังเกิน24h

**ผลตรวจใหม่รอบนี้:** pureNodeprobeคำนวณdeltaของเวลาผู้ใช้และส่งvalidatorด้วยfixedclockได้422ตามข้อความจริง อีกsynthetic1-sortieflightใช้durationที่ตั้งให้windowตรง52ชม.51นาทีแล้วscheduleคืนready ยืนยันgapได้ ไม่ใช่การคำนวณแผน/ระยะทาง/จำนวนเที่ยวจริงของผู้ใช้ Subagentมีprobe25ชม.5นาทีready→422แยกกัน ไม่มีfulltest/build/browser/liveAPI/GEE/DBverificationใหม่ และไม่ใช้501testsของreleaseมาอ้างใหม่

**แนวทางซ่อมที่บันทึกไว้ ยังไม่ลงมือ:** ใช้windowlimitsร่วมกันในschedule/UI/server ก่อนเรียกAPI บอกจำนวนชั่วโมงที่เกินอย่างเจาะจง ไม่ทำreadyสำหรับช่วงไม่รองรับ ตรวจactualflight-duration/sortiesเพื่อหาตัวขยายเวลา และให้ลดพื้นที่/แบ่งภารกิจเมื่อรวมเกิน24h ห้ามตัดendหรือclampdurationให้ดูผ่านโดยไม่เปลี่ยนแผนจริง พิจารณาโหลดstaticterrain/landcover/qualityแยกจากforecastเป็นขั้นออกแบบ ไม่ยืดขอบเขตforecastโดยไม่มีหลักฐาน ไม่รื้อuser-start/derived-endrewriteที่ตัดจากscope

**ไฟล์/สถานะ:** อัปเดตสองcanonicalMarkdownและqueue.runtimeIssuesด้วยknownissue,คำตอบและverificationboundary รักษาบันทึกLoginclarificationที่dirtyอยู่เดิม ไม่มีsource/SQL/config/accountchange ไม่มีcommit/push/deploy ชุดapplicationจริงยังเป็นreleaseเดิม ไม่มีคำสั่งแก้หรือเผยแพร่bugนี้จากคำถามสาเหตุอย่างเดียว

**รอคำตอบ:** ไม่มี ได้เวลาและโหมดอัตโนมัติครบแล้ว ส่วนflightduration/sortieรายละเอียดเป็นหลักฐานที่ต้องตรวจเมื่อเริ่มซ่อม ไม่ใช่คำถามผู้ใช้ค้างในรอบนี้

### 28 ตุลาคม 2026 — Surface Unknown หลังคำขอ GEE ล้มเหลวและข้อความ mismatch กำกวม

**หัวข้อ:** ผู้ใช้ส่งภาพSurface model Unknown/“GEE terrain does not match the current inspection area and Home.” แล้วถามว่าเป็นปัญหาเดียวกับเวลาเกิน24ชม.หรือไม่

**สรุป:** ยืนยันcodepathว่าคำขอ422เดิมทำให้reportถูกล้างเป็นnull แล้วตัวประเมินแสดงข้อความตามภาพได้โดยตรง หากเป็นภารกิจเดียวกันจึงสอดคล้องกับผลต่อเนื่องจากเวลา52ชม.51นาที มีbugการอธิบายสถานะเพิ่ม: ใช้ข้อความเดียวกันทั้งไม่มีreportและมีreportแต่geometry/Homeไม่ตรง ภาพนี้จึงไม่พิสูจน์ว่าผู้ใช้เลือกHomeผิดหรือพื้นที่ไม่ตรงจริง

**รายละเอียด/หลักฐาน:** planning-geospatial-ui.js:196รับerror→invalidate('error',failure.message),line77ล้างresponse=null; getTerrainAssessment:201ส่งcurrent()ที่เป็นnullไปassessPlanningTerrain; planning-terrain.js:21รวม!requestเข้ากับgeometry/Homemismatch; planning-trial-client.js:155เอาassessment.reasons[0]มาแสดงแทนupstreamerrorreason จึงเกิดchainเวลาเกิน→GEE422→ไม่มีterrain→Unknownพร้อมข้อความmismatch แม้Homeไม่เปลี่ยน Subagentreadonlyยืนยันchainเดียวกัน ไม่ตัดกรณีเปลี่ยนHome/ขอบเขตจริงออกจากภาพอย่างเดียว

**ผลตรวจใหม่:** pureNodeprobe2กรณี missingreport/null และactualHome-mismatch ต่างคืนunknownและข้อความตรงภาพเหมือนกัน ยืนยันความกำกวมของข้อความ ไม่ใช่replaymission/browserจริง ไม่มีfulltests/build/liveAPI/GEE/DBหรือdeploymentverificationใหม่ ผล501testsยังเป็นหลักฐานreleaseก่อนหน้า

**แนวซ่อมที่บันทึก ยังไม่implement:** แยกmissing/loading/error/expiredreportออกจากactualmismatch ให้Surface modelแสดงสาเหตุrequestจริง เช่นยังไม่มีพื้นผิวเพราะช่วงภารกิจเกิน24ชม.;คงUnknownและexportlockจนได้samplesตรงcurrentarea/Homeจริง ทดสอบ422→null→reasonถูกต้องและกรณีHome/geometrymismatchจริงแยกกัน ซ่อมร่วมกับtime-windowissueโดยไม่ปลดreadinessหรือใช้ข้อมูลเก่าทำready

**ไฟล์/สถานะ/รอคำตอบ:** อัปเดตสองcanonicalMarkdownและเพิ่มrelatedruntimeissueในqueue รักษาเอกสารที่dirtyจากรอบก่อน ไม่มีsource/SQL/config/accountchange ไม่มีcommit/push/deploy ไม่มีคำถามผู้ใช้ค้าง ไม่ถือคำถามเปรียบเทียบอาการเป็นคำสั่งเผยแพร่

<!-- time-surface-repair-2026-10-28 -->
### 28 ตุลาคม 2026 — แก้ time-window และ Surface model ตามคำสั่งเผยแพร่

**หัวข้อ:** ผู้ใช้อนุมัติแก้ทั้งสองปัญหา ทดสอบ อัปเดตสองMarkdown และpush/deploy

**สรุป:** แก้ ทดสอบ push และ production deploy แล้ว code `d5ec33fbb186145440acffed718972c9b8fc8063` / Vercel `dpl_8tjaooDbxEodG8kmHiE5yJfNLwac` READY / CI 40574633798 success Shared 24h checks ทำให้ automatic/manual/restored long plan เป็น Blocked และ direct export ตรวจเวลารวมจริง คง end เดิม GEE static context ใช้ได้แยกจาก forecast Surface แสดงสาเหตุจริง Fresh 73 targeted/510 full suite, syntax/3 builds และ Production browser/API/GEE ผ่าน

**รายละเอียดการแก้:** เพิ่มsrc/planning-time-window.jsร่วมกับschedule/GEEvalidator/export ภารกิจเกิน24hบอกactualdurationและแนะนำลดพื้นที่/แบ่งงาน scheduleเก็บfullend;exportตรวจหลังรวมsorties+declaredendป้องกันย่อช่องendเพื่อผ่าน Genericmanualexportคงfuture-datebehaviorเดิมด้วยcheckForecastDates:false ส่วนGEE/scheduleใช้forecastdates5วันย้อนหลัง/7วันล่วงหน้าเหมือนserverเดิม

**GEE/Surface:** planning-geospatial-uiสร้างstatic-onlypayloadเมื่อwindowผิดโดยคงgeometry/Home/scene/routeและoriginaltimes+problemcodeในkey ยกเลิกforecastvalues/ทำnot_requested+warning/partial ไม่อ้างweatherreadyจากterrainอย่างเดียว;planning-terrainแยก!requestจากactualgeometry/Home mismatch ตัวcontrollerใช้rootclassifiedstate.reasonกับunknownและloading/stale/offlineข้อความจริง ใช้helperเดียวในrender/getTerrainAssessmentหลังcurrent() ไม่มีnotificationcycleใหม่ แก้helpให้บอกlimit/actionตรงพฤติกรรม

**การทดสอบ:** เพิ่มtestssharedwindow/exact24h+1ms/user52h/restored/manual/real55hroute/shortdeclaredendexportbypass/staticfallback52→53hkey/validrecovery/422rootreason/loading/stale/lateold422/actualHomeและgeometrymismatch Freshtargeted73/73และfull510/510/0failed/0skipped Syntaxและ3buildsผ่าน Fullsuiteครั้งแรกdefaultconcurrencyหยุดค้างโดยยังไม่รายงานfailureจึงinterruptเฉพาะsessionตัวเอง แล้วรันไฟล์ทั้งหมดด้วย--test-concurrency=4ผ่าน ไม่ลดtest/assertions ชุดtargetedครั้งแรกพบexportfuture-horizonกระทบgenericmanualfixture จึงจำกัดforecastdatechecksเฉพาะขอบเขตที่เกี่ยวข้อง ไม่เปลี่ยนfixtureเพื่อให้ผ่าน

**Browserจริงในเครื่อง:** ใช้builtfrontend+localhost5182กับGEE/weatherจริง พื้นที่ทดสอบ48,266m²/Home101.2,12.6 time52h→terrain/HomeReady,GFSnotrequested,SurfacewithinTolerance,TakeoffBlocked/downloadlocked ต่อด้วยrectangle18.0945km²ผ่าน3ขั้นและreviewSentinel-2จริง27ต.ค.2026 สร้างroute998.11km/automatic55h32m3s→blockedคงfullend/staticterrainกลับมาreviewneededตามrangeจริง ไม่ใช่mismatch ป้อนพื้นที่>100km²ให้API422จริง แล้วSurfaceUnknownแสดงAREA_LIMITreasonแทนHome-mismatch Mobile390/readinessdialog358/page375pxไม่ล้น คืนviewportแล้ว ภาพอยู่output/release-check/time-surface-fix-2026-10-28/

**Review/ข้อจำกัด:** subagentsreadonly2ชุดไม่พบmaterialblocker ไม่พบunit/double-countingbugในflightduration เวลายาวเกิดจากroute/transitได้ ตัวอย่างทดสอบไม่ใช่พื้นที่ของผู้ใช้จริง ไม่มีautomaticpartitionหลายภารกิจเพิ่ม แผนยาวต้องลดพื้นที่หรือแบ่งงานเอง Forecast/staticแยกเฉพาะcontextrequestไม่ปลดenvironment/exportgates ไม่มีhardware/SITL/QGCใหม่ ไม่มีAuthaccounts/DB/configchangesหรือAI/UXfeatureเพิ่ม

**ไฟล์:** src/planning-time-window.js, planning-schedule.js, gee-mission-context.js, trial-export.js, planning-terrain.js, planning-geospatial-ui.js, planning-help-content.js; tests/planning-time-window.test.mjs และ 4 test files เดิม พร้อม canonical Markdown/queue ไม่ใช้ 501 tests ของบัญชีเป็นผลรอบนี้

**รอคำตอบ:** ไม่มี อนุมัติimplementation/push/deployครบแล้ว บัญชีผู้ทดลองยังให้ทีมสร้างภายหลังตามเดิม

**Production verification หลังเผยแพร่:** HTML เว็บหลักตรง built dist แบบ byte-for-byte SHA256 `97ba76c8c7c94015c7932badfc8f7af3f9c270279fdebda53467a336114088dd` API จริงรับช่วงปัจจุบัน 1 ชั่วโมงได้ 200 พร้อม terrain/landcover/forecast ready; raw ช่วง 52h ของผู้ใช้ยังถูก 422 ตาม contract; static-only null times ได้ 200 terrain/landcover ready และ forecast not_requested; session บัญชี regression ได้ 200 user:null ไม่สร้างบัญชี Browser ผ่าน normal 3-step/Sentinel-2 visible acquisition → route 998.11km/auto55h32m3s → Takeoff Blocked/download locked และ Surface Review needed จาก samples จริง ไม่ใช่ missing/mismatch ป้อนพื้นที่เกิน100km²เพื่อทดสอบ 422 จริง Surface Unknown แสดง AREA_LIMIT reason แล้วคืนพื้นที่/โหลดภาพกลับได้ Mobile390 dialog358/page375/scroll375px ไม่มีแนวนอนล้น คืน viewport แล้ว Browser error logs ล่าสุด [] และ Vercel error/fatal scan เฉพาะ deployment นี้ช่วง15นาทีไม่พบรายการ ไม่อ้างว่าครอบคลุมทุกเวลา/ทุกพื้นที่

**หลักฐาน/การเผยแพร่:** ภาพ production-readiness-desktop.png, production-mobile-390.png, production-static-context.png และ production-surface-error-reason.png พร้อม production-api.json อยู่ output/release-check/time-surface-fix-2026-10-28/ ชุดโค้ด push ไป origin/main และ origin/codex/xedo-hardware-profile แล้ว docs follow-up ไม่เปลี่ยน application bundle; final commit/deployment/CI เก็บใน release-receipt.json เพื่อเลี่ยง self-referential docs commits ไม่มี real-account login/hardware acceptance เพิ่ม

<!-- remaining-plan-summary-2026-10-28 -->
### 28 ตุลาคม 2026 — สรุปแผนคงเหลือหลังแก้เวลาและ Surface

**หัวข้อ:** ผู้ใช้ถามว่าเหลือ plan อะไรบ้าง ให้รายงานสถานะและลำดับเดิมโดยไม่เริ่มแก้เว็บไซต์เพิ่ม

**สรุป:** เหลือ 3 กลุ่มในเกณฑ์ปิดงาน: ล่าสุด1/เดิม4 UX cleanup ที่ยังค้าง; ล่าสุด2/เดิม5 บัญชีเผยแพร่แล้ว เหลือทีมสร้างบัญชีและ real-account acceptance; ล่าสุด3/เดิม6 prepared AI + Inspector risk editor + planner/private review history ที่ยังไม่เชื่อมเว็บ งานพัฒนาฟังก์ชันหลักที่เหลือคือ UX และ AI ส่วนบัญชีเป็น provisioning/acceptance ไม่ใช่สร้างระบบใหม่ พักล่าสุด4/เดิม7 Pi และล่าสุด5/เดิม8 ผลทดลอง/รายงาน รวมคิว5กลุ่มตามเลขที่ใช้ก่อนหน้า

**รายละเอียดที่ต้องทำต่อ:** UXเอาป้าย Prototype/ข้อความซ้ำที่ยังค้างออก จัดปุ่ม/help/empty/error states ให้ตรงพฤติกรรมและตรวจมือถือหลังรวมงาน คง3ขั้น/4calculators/2D3D บัญชีให้ทีมสร้าง Authusers พร้อม Inspector roster แล้วตรวจ login/logout/Save/open/history และ A อ่าน/แก้ภารกิจ B ไม่ได้ รวม session expiry/conflict AIนำ prepared SAR ที่ส่งแล้วมาแสดงตามพิกัด ให้เลือก/ยอมรับ/ย้าย/แก้จุด/วาดเพิ่ม/ปฏิเสธ พร้อม Undo/Cancel/confirm แยก raw AI จาก Inspector edits เลือก planning Polygon ที่ผ่านเงื่อนไขไปยัง planner เก็บที่มาและ revision ในภารกิจส่วนตัวแล้วเปิดคืนได้ ต้องแก้ readiness/export ให้แผนเก่าใช้ไม่ได้หลังพื้นที่/review/session เปลี่ยน

**ลำดับแนะนำ/คู่ขนาน:** mainเก็บUXแล้วเชื่อมAI ขณะทีมสร้างบัญชี; supportใช้ prepared handoff และ risk-edit fixtures ที่ส่งแล้วตรวจกรณีขอบ/หลักฐานแบบ readonly ไม่แก้เว็บ ไม่ตั้งการเตรียมข้อมูลที่ส่งเสร็จเป็นงานรอใหม่ ปิดด้วยตรวจเส้นทางบัญชีส่วนตัว→AI→แก้พื้นที่→planner→Save/reopen/history/mobile และ regression เป็นเกณฑ์จบของ3กลุ่ม ไม่เพิ่มเป็นขั้น4ซ้ำ ห้ามนับผลออกแบบ test เป็นผล application test ผ่าน

**สิ่งที่ไม่ค้างในรอบนี้:** เวลาเกิน24h/Surface reason แก้และเผยแพร่รอบก่อนแล้ว GEE status/context/scroll และ3D Diagram/Satellite เผยแพร่ก่อนหน้า งาน normal aircraft defaults/user-start-derived-end ถูกผู้ใช้ตัด ไม่กลับเป็น release gate ไม่มี automatic mission partitioning เพิ่มในscope ภารกิจยาวยังลดพื้นที่/แบ่งงานเอง

**รอคำตอบ:** ไม่มีคำถามตัดสินใจที่ยังไม่ได้ตอบ; รอการดำเนินการของทีมเรื่องสร้างบัญชีตามคำตอบเดิม เป็น dependency ของ acceptance ไม่ใช่ขอคำตอบซ้ำ

**หลักฐาน/ไฟล์/การเผยแพร่รอบนี้:** อ่าน Git status และ canonical docs/queue ปัจจุบัน ตรวจสถานะจากบันทึกที่มีอยู่ อัปเดต XEDO_WORK_LOG.md, WEBSITE_DETAILS.md และ implementation-queue.json เท่านั้น ไม่มี source/config/SQL/Auth/account changes ไม่มี tests/build/browser/API/GEE หรือ live deployment checks ใหม่ ผล510tests/READYเป็นของรอบ release ก่อนหน้า ไม่มี commit/push/deploy รอบสรุปนี้ กรอบ4ชั่วโมงเดิมเป็นแผนประวัติ ไม่ได้เริ่มนับเวลาใหม่จากคำถามนี้

<!-- inspector-roster-missing-2026-10-28 -->
### 28 ตุลาคม 2026 — Sign in ไม่ผ่านเพราะยังไม่มี Inspector roster

**หัวข้อ:** ผู้ใช้สร้างบัญชีใน Supabase Authentication แล้ว แต่ XEDO แจ้งว่า Inspector account ยังไม่ enabled จึงขอให้ตรวจและแก้

**สรุป:** Live join ใน xedo/ref tstmjnlhwidwtzetqxbu ผ่าน megaphijak ตรวจ exact UID+email จากภาพ พบ Auth user จริง/email_confirmed=true/last_sign_in_at มีค่า/banned_until และ deleted_at null แต่ inspector_roster_exists=false คำสั่ง DML เปิดสิทธิ์เพียงบัญชีนี้เตรียมแล้วและลองส่งตามคำขอแก้ แต่เครื่องมือคืน aborted before dispatch ไม่คืนรายละเอียดเหตุผล Post-read ยืนยัน roster ยัง false จึงไม่อ้างว่าแก้สำเร็จ และไม่ลองช่องทางอ้อมแทนคำสั่งที่ถูกหยุด

**รายละเอียดสาเหตุ:** Supabase Authentication account กับ team-approved Inspector roster เป็นคนละรายการ require_inspector ตรวจ active Auth session ก่อนแล้วตรวจ enabled roster ถ้าไม่มีจะ PT403/INSPECTOR_NOT_PROVISIONED BFF login ยืนยัน passwordก่อนเรียก RPC session; ถ้า RPC ปฏิเสธจะ logout session ที่เพิ่งได้และไม่ตั้ง browser cookie จึงต้องกด Sign in ใหม่หลังเปิดสิทธิ์ การ refresh อย่างเดียวไม่สร้าง session ไม่แก้ด้วยการปิดRLS/เพิ่มgrants/auto-enableAuthusersทั้งหมด

**Concrete repair ที่พร้อมตรวจ:** output/release-check/inspector-enablement-2026-10-28/enable-requested-account.sql เป็น INSERT SELECT จาก auth.users ที่ตรงทั้ง UID และ email ยืนยันอีเมลแล้ว/ไม่ถูกลบ/ไม่ถูกแบน → inspector_accounts enabled=true ON CONFLICT อัปเดต enabled เท่านั้นและคง created_at ตรวจ RETURNING และ SELECT กลับหลัง execute ให้แน่ใจว่ามีหนึ่ง enabled row ไม่สร้าง Auth account ใหม่ ไม่แก้ schema/functions/grants/password/settings/session/mission data ข้อมูลระบุตัวบัญชีเก็บเฉพาะ ignored local artifact ไม่เพิ่มอีเมล/UIDจริงใน tracked docs

**ผลตรวจรอบนี้:** live Auth/roster read ก่อนและหลังคำสั่งที่ไม่ dispatch; อ่าน schema และ BFF source และ independent readonly review ตรงกัน Auth/postgrest logs อ่านแบบ counts ไม่มี tokens/password Security advisor INFO5 no-policy ตรง RPC-only design มี WARN leaked-password-protection-disabled ไม่ใช่สาเหตุ roster missing และไม่เปลี่ยน Auth settings นอก scope; remediation https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection Performance INFO2 unindexedFK/INFO1unusedindexเดิม ไม่มี DDL ใหม่ Changelog/docs official อ่านแล้ว ไม่มี library/API feature implementation ใหม่

**รอคำตอบ:** อนุมัติให้เพิ่มบัญชีในภาพใน xedo_private.inspector_accounts และ enabled=true เฉพาะบัญชีนี้ หรือให้ทีมรันไฟล์ SQL ที่เตรียมเอง คำถามส่งแล้ว เมื่อได้อนุมัติให้ execute exact prepared change แล้ว post-read ผู้ใช้ลอง Sign in ด้วย password เดิมเอง ไม่ขอส่งรหัสผ่านในแชท ไม่ mint JWT/สร้าง session/impersonate เพื่ออ้าง successful login ส่วน A/B Save/history acceptance ยังไม่ผ่าน

**ไฟล์/verification/publication:** อัปเดต canonical work log/WEBSITE_DETAILS/queue และ ignored concrete SQL/receipt ไม่มี source/test/config/SQL-schema edits ไม่มี DB DML ที่ dispatch สำเร็จ ไม่มี Auth credentials/session changes ไม่มี application tests/build/browser-password-login หรือ deployment ใหม่ ผล510tests/READYเป็นของ release ก่อนหน้า ไม่ commit/push/deploy รอบนี้ รักษา docs ที่ dirty จากรอบสรุปแผนก่อนหน้า

<!-- inspector-roster-enabled-2026-10-28 -->
### 28 ตุลาคม 2026 — เปิดสิทธิ์ Inspector ตามคำอนุญาตใน annotation สำเร็จ

**หัวข้อ:** ผู้ใช้ตอบอนุญาตให้เปิดสิทธิ์บัญชีเฉพาะที่ระบุในรอบวินิจฉัยก่อนหน้า

**สรุป:** ใช้ prepared guarded SQL บน Supabase xedo/ref tstmjnlhwidwtzetqxbu ผ่าน connection megaphijak สำเร็จ RETURNING หนึ่งแถว enabled=true/created_at2026-10-28T07:40:36.417907Z (=14:40:36Asia/Bangkok) Post-readแยกอีกคำขอพบ roster_rows=1/inspector_enabled=true/email_confirmed=true ไม่มีคำถามอนุมัติค้าง การหยุดก่อนdispatchรอบก่อนหน้าได้รับคำอนุญาตเพิ่มเติมและแก้สำเร็จแล้ว

**รายละเอียด:** Pre-readใหม่ยืนยัน exact Auth UID+emailในภาพตรง/confirmed/notdeleted/notbanned/rosterยังไม่มี แล้ว INSERT SELECTที่guardทั้งUIDและemail ON CONFLICTแก้ enabledอย่างเดียว ไม่ทับcreated_at ไม่เพิ่มสิทธิ์ทุกAuthusers ไม่เปลี่ยนpassword/Authsettings/session/schema/functions/RLS/grantsหรือmissions ข้อมูลระบุบัญชีคงอยู่เฉพาะignoredlocalSQLไม่เพิ่มลงtrackedMarkdown/queue

**Verificationใหม่:** write RETURNINGหนึ่งแถวตรงUIDที่อนุมัติ; separatepost-readพบหนึ่งenabledrosterrow RLS=true,anon_can_provision=false,authenticated_can_provision=false Independentreadonlyreviewยืนยันexactguard/atmostonerow/idempotence ไม่สร้างหรือ mint login session ไม่มี browserpasswordlogin/applicationtests/build/deploymentใหม่ ไม่ใช้510testsเก่าเป็นผลรอบนี้

**ขั้นต่อไป/รอคำตอบ:** ไม่มีคำถามตัดสินใจค้าง ให้ผู้ใช้กด Sign in ใหม่ด้วยpasswordเดิมที่เว็บหลัก เพราะความพยายามที่ถูก403ก่อนหน้านี้ไม่ได้ตั้งcookieที่ใช้ได้ การpost-readยืนยัน provisioningไม่ใช่successfulbrowserlogin ส่วน real Save/reopen/history/logout/A-Bprivacy acceptanceยังอยู่ในคิว ไม่ขอให้ผู้ใช้ส่งpasswordในchat

**ไฟล์/การเผยแพร่:** อัปเดตXEDO_WORK_LOG.md,WEBSITE_DETAILS.md,implementation-queue.jsonและignoredverificationreceipt โดยรักษาเอกสารdirtyเดิม ไม่มีsource/config/DDLหรือapplicationrelease ไม่commit/push/deployเพราะเป็นdata-onlyenablementและใช้ได้กับเว็บที่เผยแพร่อยู่ทันที

<!-- ux-loading-scroll-plan-2026-10-28 -->
### 28 ตุลาคม 2026 — แผนปิดงาน1 UX,loadingและscroll พร้อมงานสนับสนุน

**หัวข้อ:** ผู้ใช้ต้องการแผนก่อนimplementationสำหรับข้อความ/UIและอาการกดปุ่ม/checkbox/Sign inไม่มีสัญลักษณ์รอ รวมscrollค้างหลังใช้ไปสักพัก พร้อมแบ่งงานอีกchat

**สรุป:** จัดทำ docs/UX_COMPLETION_PLAN.md ครบ1Abaseline→1Bfeedback→1Cscroll/render/lifecycle→1Dcopy/UI→1Eacceptance พร้อมเกณฑ์ปิดและscopefiles ไม่เพิ่มเป็นงานหลักใหม่ คงล่าสุด1/เดิม4 ส่วนบัญชี2/AI3ยังสถานะเดิม แชทหลักเป็นผู้แก้websiteเท่านั้น supportช่วยcopyinventory/actionmatrix/sourceperfdiagnosis/testdesignและreadonlyreview Promptพร้อมใช้ outputs/XEDO_UX_Plan_2026-10-28/PARALLEL_CHAT_PROMPT.md ไม่ได้ส่งข้อความไปuser-ownedchatอื่น

**สิ่งที่ยืนยันรอบนี้:** Productionguestloginด้วยsyntheticnonexistentaccount1ครั้ง พบaria-busytrue/Signindisabledแต่labelยังSign in/statusว่างระหว่างรอ;จบgenericcredentialerror/passwordว่าง/ปุ่มคืนใช้ได้ ไม่ใช้passwordจริง ไม่ทดสอบsuccessfuluserlogin AirspacecheckboxรับcheckedและReadyแต่ปิดreadinessdialogทันที เปิดคืนจึงเห็นผล คืนuncheckedก่อนปิดaudit Mobile390settingswidth345/clientHeight741/scrollHeight2456 wheel2pagesเลื่อนdialog0→1688/page0/pagewidth375scrollwidth375ได้ จึงไม่อ้างว่าค้างทุกครั้งหรือlongfreezeถูกreproduce

**Source findings/ขอบเขตหลักฐาน:** Inspector taskมีbusycounter/disabled/aria-busyแต่ไม่แสดงstartcopy/spinner;downloadpreflightawaitก่อนsetWorking;prepare/restore/first3Dมีfeedbackgap3DwheelpreventDefaultเมื่อmodelและdrawsyncทุกevent;input+changeเข้าinvalidationเดียว;readinesstimer1sอ่านmission/terrainซ้ำ มีDOMdiff/cache/cleanupเดิมที่ต้องรักษา ไม่พบproofว่าmemoryleakหรือtimerคือrootcause ต้องprofileก่อนoptimiseเฉพาะจุด Independentreadonlyreviews2ชุดตรงกัน ไม่ให้supportแก้source

**แนวทางที่บันทึก:** actionlocalspinner+ข้อความก่อนawaitแรก/dedup/operationIDguard/finiteerrorcancelcleanup;checkboxsyncไม่fakeโหลด คงdialogและแสดงfollow-onchecksเฉพาะงานจริง;wheel/touchมีinteractionownerชัดเจน/RAF≤1drawframe/รวมsemanticinput/cacheตามrevision+expiry/lifecycle auditตามtrace;ลบป้ายPrototypeและnoteซ้ำแต่คงsource/date/Unknown/assumed-demo/เงื่อนไขexportและtechnicalIDs

**เกณฑ์รับที่ยังไม่รัน:** feedbackpaintเป้า≤100ms,p95localresponse≤200msบนเครื่องอ้างอิง ไม่อ้างfieldINP;กดซ้ำ/late/error/timeout/cancelไม่spinnerค้าง;scrollmousewheel/trackpad/thumb/touch/modal/2D3D;10–15min repeated-useพร้อม30dialogcycles/20modecycles/10area-imagecycles วัดresourceไม่โตค้างหลังwarmcache;390/768/1280/keyboard/reducedmotion;regression3steps4calculators/24hgate/Surface/session-owner-revision/visiblepixels ต้องมีผลจริงก่อนmarkfixed

**ไฟล์/หลักฐาน:** ใหม่docs/UX_COMPLETION_PLAN.md;outputs/XEDO_UX_Plan_2026-10-28/UI_OBSERVATIONS.mdพร้อมภาพ02/03/04/06/07/08,PARALLEL_CHAT_PROMPT.md และอัปเดตcanonical2Markdown/queue ภาพmainที่cropหรือมีbackgroundpendingไม่ใช้พิสูจน์ครบ/เร็ว คงภาพ/DOMobservationsเป็นขอบเขตaudit SourceHEAD45e928ef50ace69ae83393bc192acdc6b537fae7ก่อนเอกสารdirtyรอบนี้ คืนviewport/ปิดaudit-tabแล้ว

**การตรวจ/เผยแพร่/รอคำตอบ:** รอบนี้sourceinspection/boundedproductionUIobservation/officialMDN-W3C-web.devdocsเท่านั้น ไม่มีapplicationedit/standardtests/build/longsoak/perftrace/realpasswordlogin/DBmutation/newinference/commit/push/deploy ผล510tests/READYเป็นreleaseก่อนหน้า ไม่มีคำถามผู้ใช้ค้าง การขอวางแผนก่อนยังไม่ใช่เริ่มimplementationหรือpublishเพิ่มเติม ประมาณ2.5–4hในแผนเป็นประมาณการหลังเริ่มลงมือและขึ้นกับreprotrace ไม่เริ่มกรอบเวลาผู้ใช้ใหม่อัตโนมัติ


<!-- support-ux-loading-scroll-2026-10-28-01a17cf8 -->
### 28 ตุลาคม 2026 15:34 น. — Support UX/loading/scroll handoff

- **หัวข้อ/สรุป:** supportส่ง [HANDOFF.md](C:/mega/codex/iENA/outputs/XEDO_UX_Parallel_2026-10-28/support/HANDOFF.md) พร้อมACTION_FEEDBACK_MATRIX34actions/COPY_INVENTORY136rows/SCROLL_DIAGNOSIS8groups/TEST_MATRIX64casesและblankmeasurementtemplateในoutputแยก mainแก้webเพียงผู้เดียว
- **ตรวจจริง:** readonlyAGENTS/log/queue/UXplan/UI_OBSERVATIONS/source/GitSHA45e928ef50ace69ae83393bc192acdc6b537fae7/filehashes/diffและsupportdocumentstructure 19checks ไม่รันapplication/browser/Auth/network/build/perftrace/benchmark ไม่ใช้510testsเก่าเป็นผลใหม่ Providedmainbrowserproofเป็นnegativeguestlogin/checkbox/shortmobilescrollเท่านั้น
- **ข้อค้นพบ/งานต่อ:** baselinependingcopy/preflight/checkboxcontinuity,3Dwheel-touchownership/drawซ้ำ,input-changeinvalidate/readinessgetter/reentrant/lifecycleต้องวัดแยกจากlongfreeze Existingcaches/DOMdiff/cleanupหลายส่วนถูกต้องแล้ว ให้คงไว้ Mainเริ่มpatchInspectorfeedback/3DRAF-focusระหว่างอ่าน จึงแยกIN_FLIGHT_REVIEWและsource_snapshot.handoffไม่อ้างbaselineเป็นสถานะหลังซ่อม
- **สถานะ/ขอบเขต:** รายงานพร้อม ไม่มีblockerต่อsupport;64webcasesdesigned_not_run/latency-resourceactualsnull/longfreezeและsuccessfulaccountflowยังไม่ยืนยัน เขียนเฉพาะoutputและappendสองMarkdownตามAGENTS ไม่แก้overview/queue/source/tests/config/packages/DB/Auth/build ไม่มีinstall/Gitmutation/fetch/push/deploy ไม่ควบคุมbrowserร่วมmainหรือใช้credentials ไม่มีคำถามผู้ใช้ค้าง


<!-- ux-feedback-implementation-2026-10-28 -->
### 28 ตุลาคม 2026 — ลงมือแผน UX/loading/scroll และรับงานจากแชทคู่ขนาน

**หัวข้อ:** งานล่าสุด1/ก่อนหน้า2/เดิม4 ผู้ใช้สั่ง “เริ่ม prompt อีก chat และทำตาม plan” จึงส่ง full prompt ไปแชทที่มีอยู่ชื่อ **02-chat ขนาน project หลัก** และลงมือแก้เว็บไซต์ในแชทหลักเพียงผู้เดียว

**สรุป:** Candidate ในเครื่องมี action-local loading, phase text, duplicate guards และ stale feedback ownership; checkboxคงdialog; 3Dใช้RAFรวมinputและรับwheelเฉพาะเมื่อโต้ตอบกับcanvas พร้อมExit/Escape; lifecycleรักษาback-forward cache; เก็บvisiblePrototype/trialcopyโดยคงmachineIDs/assumeddemo/source/readinessข้อมูลจริง ผลใหม่524testsผ่าน/0fail/0skip และ3buildsผ่าน ยังไม่ปิดขั้น1ทั้งหมดเพราะBrowserเดิมหลุดระหว่างตรวจ จึงยังไม่มีfinalmobile/responsive/fullflow/longsoak acceptance ของcandidateนี้ ไม่มีcommit/push/deployหรือDB/Auth mutationรอบนี้

**รายละเอียดการแก้:**

- เพิ่ม src/action-feedback.js และ .css เป็นpresentation token + CSSspinner/reducedmotion ไม่มีtimerใหม่ต่อspinner ไม่แทนnetwork/session/revision controllers
- Inspector: pendingก่อนawaitแรกในstartup/login/save/copy/list/history/open/logout, กันsubmitซ้ำระดับhandler; logoutล้างprivateUIทันทีและคงserializedserverrevocation; stalecatch/finallyไม่ทับfeedbackใหม่; pendingSavebody/mutationIDเดิม; Savedแต่listrefreshล้มเหลวแจ้งแยก; timeoutไม่อ้างว่าเป็นinvalidpassword; closepanelไม่แกล้งรายงานcancel
- Planner: downloadpendingเริ่มก่อนensureSession/conditionspreflight กันกดซ้ำและตรวจcontext/readinessก่อน–หลังawait; loadingระหว่างprepare/source/snapshot/calculation/GEE/conditions; reset/cancelล้างspinnerที่ตัวเองเลิกเป็นเจ้าของ ทั้งprepareและsavedboundary พร้อมlate-response tests
- Checkbox: nativecheckbox/selectใช้change,number/textใช้inputหนึ่งsemanticchange; airspacecheckboxรับchecked/dialogคงเปิดและinvalidateผลเก่าทันที
- 3D: requestAnimationFrameหนึ่งpendingdraw,ไม่มีdrawloopตอนidle/hidden/inactive; 2D/ไม่มีplanหยุดrenderer; wheelต้องactive+focused, touchเริ่มpan-y,ปุ่มInteract/ExitและEscapeคืนscroll; visibilityresumeวาดใหม่; disposeยกเลิกRAF/listeners; persistedpagehideไม่ทำลายcontrollersและpageshowเรียกrefresh/freshnessใหม่ คงขนาดcanvas/floor/texturemeshเดิม
- Copy: Abouttheplanner/XEDOinspectionprofile/Fixedinspectionsettings/Missionsnapshot; normalmodeซ่อนrepeatedtrialbadge/backlinkของstandalone ไม่เพิ่มป้ายPrototype; Estimated demoและสมมติฐาน/Unknown/partial/24h/Surface/แหล่งข้อมูลยังแสดงตามจริง

**ผลตรวจใหม่:** npm test -- --test-concurrency=1 --test-timeout=30000 ผ่าน524/0/0 (เพิ่ม14behavior/race/lifecyclecasesจากbaseline510), npmruncheck+newmodule syntax และgitdiff--checkผ่าน; npmrunbuild/build:workspace/build:fileผ่านทั้งหมด บางรอบfullrunnerก่อนหน้าเงียบค้าง/ถูกหยุด จึงไม่ใช้รอบเหล่านั้นเป็นผลผ่าน ไม่ตัดassertions/testsแก้ปัญหา; finalreportอยู่final-tests.txt

**Browser/performanceหลักฐานจริง:** LocalQAใช้realBFF+in-memorySQLกับsimulatedAuthและdelay500ms/stage ไม่มีpasswordผู้ใช้จริง Loginเห็นSigning in…/disabledและต่อเป็นSigned in.Loadingyourmissions… พร้อมspinner ภาพlogin-pending.pngเป็นช่วงหลังauthackที่กำลังโหลดlist วัดproduction3Drendererกับsynthetictexture512px/canvas850×440CSSpxแบบfocusedwheel100events×5: ก่อน100draws/burst,synchronousevent193.3–303.9ms; หลัง1draw/burst,event0.6–1.3ms,สองRAFpaint7.8–17.4ms ไม่มีadditionalburstlongtasksหลังแก้ (ยังมีstartup81ms) ค่าทดลองนี้ไม่ใช่fieldINP/รับประกัน60fps/หลักฐานno-memory-leak/การทำซ้ำfreezeเดิม

**คู่ขนาน:** Supportส่ง34actions/136copyrows/8diagnosisgroups/64designed_not_run casesและhandoffแล้ว ใช้ในการแก้Saveack/cancel/scrollownership รักษาappendreferenceของsupportในสองMarkdown ไม่อ้างsupportdesignedcasesเป็นexecutedtests Rootreadonlyreviewพบprepare/sourcependingcleanupสองจุดและแก้พร้อมtestsแล้ว

**ยังเหลือและรอคำตอบ:** Browserที่ใช้ID2ไม่availableและinventoryไม่มีsurfaceเดิม จึงส่งคำถามให้ผู้ใช้เปิดBrowserในแชทหลักและแจ้ง “เปิดแล้ว” **รอคำตอบ** นี้เพื่อทดสอบfinal390/768/1280,mouse/keyboard/touch/page/modal/3Dscroll,30dialogcycles/20modecycles/10area-imagecycles/10–15minsoak และlocalintegratedSave/open/history/end-to-endหลังรวมpatch ไม่มีproductdecisionหรือรหัสผ่านที่ต้องส่งเพิ่ม ไม่ถือว่าlongfreeze/memoryleakได้รับการพิสูจน์หรือแก้ครบจากbenchmarkสั้น

**ไฟล์/สถานะ:** Sourceหลักfeedback,Inspector,planningclient,3D,conditions/GEEUI,HTML/CSS/help/runtime/profile/buildcopy; tests/inspector-client.test.mjsเพิ่มใหม่และขยายworkflow/ground/estimated/source/fixed/runtimeharness เอกสารสองไฟล์นี้/UX_COMPLETION_PLAN.md/queueอัปเดต ผล+ภาพ+frozenbaseline+localQAserverอยู่ C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/release-check/ux-2026-10-28/ และsupportที่ outputs/XEDO_UX_Parallel_2026-10-28/support/ HEADยัง45e928e applicationcandidateยังlocal/uncommitted ไม่มีเผยแพร่บนxedo-eight.vercel.appรอบนี้

<!-- ux-browser-resume-2026-10-28 -->
### 28 ตุลาคม 2026 — Browser กลับมา: ตรวจ UX ต่อและเก็บข้อผิดพลาดท้ายรอบ

**หัวข้อ:** ผู้ใช้ตอบ “เปิดแล้ว” ต่อคำถามBrowserเดิม จึงตรวจต่อโดยใช้IABที่เปิดกลับมาในแชทเดิม; คำถามเปิดBrowserตอบแล้ว ไม่มีรอคำตอบนี้อีก

**สรุป:** Localcandidateผ่าน531tests/0fail/0skip,syntax/diffและ3buildsใหม่ ตรวจliveGEE10พื้นที่ต่างกัน/30dialogcycles/20modecyclesต่อเนื่อง11.15นาที,มือถือและdesktopตามviewport390/768/1280,บัญชีจำลองSavev1→v2→History→เปิดv1และบัญชีBไม่เห็นรายการA,SignoutขณะSaveและconfirmationCancel/Escape,ดาวน์โหลดเดโมจริงผ่านUI และ52hยังBlocked เวลาจริงไม่ถูกtruncate รักษา3steps/4calculators ไม่push/deploy/commitหรือแก้DB/Authproductionรอบนี้

**แก้เพิ่มเติมจากBrowser:** เปลี่ยนnativewindow.confirmสามจุดของInspectorเป็นHTMLconfirmationdialog:focusที่Keepcurrentdraft,Cancel/Escapeรักษางาน,ป้องกันเปิดซ้ำ/queuedcloseเก่าไม่ปิดpromptใหม่;ยืนยันSignoutแล้วค่อยclearprivateUIและqueuedrevocationเดิม เพิ่มterminalannounceเมื่อค้นหา/โหลด/เตรียมภาพล้มเหลวไม่ค้างคำSearching/Preparing แก้ปุ่มDownloadหลังเดโมยังบอกdemo และล้างsuccessของไฟล์เก่าเมื่อmissionเปลี่ยน แต่คงactive-downloadoperationguards เพิ่ม7testsจากcandidate524รวม531 Sourceเพิ่มรอบนี้src/inspector-client.js,inspector.css,planning-trial-client.js และtests/inspector-client,planning-estimated-isolation,planning-workflow

**ผลBrowserใหม่ที่รันจริง:**

- บัญชีใช้simulatedAuth+realBFF/in-memorySQLที่5191,delay500ms/stage;ไม่มีpasswordจริงหรือAuthsessionproduction เปิดv1/v2/historyและCancel/acceptedLogoutผ่าน ขณะSavependingยืนยันLogoutแล้วmissionsHidden=trueทันที/statusSigningoutและสุดท้ายSignedout ผลกลับช้าไม่คืนprivateUI บัญชีBobตอนเริ่มไม่มีรายการAlice Confirmationมือถือclient360/scroll360/page375/scroll375,CancelautofocusและEscapeรักษาบัญชีพร้อมfocusคืนSignout
- LiveGEEที่5182: importPolygon10พื้นที่ต่างกันwest101.2200→101.2227ทีละ.0003°,ละติจูด12.620–12.621 เลือกภาพcoveringจริง27Oct2026และPrepareทุกบริบทได้ (ไม่ใช่10clickบนพื้นที่เดิม) มีsearchtemporarilyunavailableสองครั้งและgroundinitialerrorหนึ่งครั้ง ใช้Retryแล้วกลับมาได้ ไม่สรุปว่าเป็นinternet/rootcauseใดเพราะไม่วัดnetworkต้นทาง
- Warmboundedrun09:31:29.952–09:42:38.960UTC (11.15min):30settingsopen/close,20complete2D↔3D,10area-imagecontexts ไม่มีobservedfreeze Browserconsoleerrors[];canvas2/dialog6คงที่ DOMnodes809เริ่ม→835ช่วงmid→835ท้าย การเพิ่มต้นรอบสัมพันธ์กับโหลดข้อมูล/ตัวเลือกภาพ ไม่อ้างheap/listener/observer/textureleak-freeจากDOMcounts
- Scroll: Exitbuttonpointerclickคืนpressedfalse/touchActionpan-y;wheelผ่านunfocused3Dเลื่อนpage225→945;modalมือถือscroll0→1688ขณะpage0;PageDownเลื่อนpage1194.5;drag/ArrowRight/Escapeใช้ได้;scrollbarcoordinate-dragพบoffset642→406 แต่ไม่ได้วัดทิศ/ระยะของthumbอย่างละเอียด จึงไม่ใช้เป็นprooftrackpad/physicaltouch
- Responsivefinalbuild: viewport390/page375/scroll375/settings328/scroll328/readiness356/scroll356;768/page753/scroll753/settings706/readiness618;1280/page1265/scroll1265/settings803/readiness618 ทุกdialogscrollWidthเท่ากับclientWidth ภาพresponsive-*และfinalmobileconfirmation/desktop-uxเก็บแล้ว คืนviewportและปิดแท็บQAส่วนเกิน
- Download:ทำconfirmationครบผ่านbrowserและดาวน์โหลดQGroundControlPlan18missionitemsจริงด้วยEstimateddemo หลังแก้ท้ายรอบปุ่มยังDownloaddemomissionfile;กดSpaceในreadinessถอนairspaceแล้วdialogคงเปิด/downloadDisabled=true/oldsuccesshidden=true Manual52hinputยังแสดงstart28Oct/end30Octตามจริงพร้อมBlocked24h ไม่มีclamp ส่วน24hautomaticalgorithm/staticSurface/rootreasonมีunit/integrationregressionใน531ชุด
- หลังboundedrunเก็บterminalcopy/confirmation-closeguard/demo-label/stalesuccessเพิ่ม แล้วrebuild+targeted/full531และsmokeUIบนbuildใหม่อีกครั้ง ไม่อ้างว่า11.15minทั้งหมดเกิดหลังทุกcopyfixท้ายรอบ

**หลักฐานและข้อจำกัด:** output/release-check/ux-2026-10-28/browser-acceptance-resume.json,RESULT.json,final-tests.txt,build*.txt,final-desktop-ux.png,final-mobile-satellite-3d.png,final-mobile-confirmation.png,final-search-error.png,over24h-blocked.png,browser-demo.plan Physicaltouch/native-trackpad/reduced-motionOSsetting/heap&listenercounts/fullappfeedbackp95/fieldINPไม่ได้วัด ไม่รับรอง60fpsหรือไม่มีleakทุกกรณี Settingsลดsemanticduplicatesแล้วแต่reviewflagsยังrecalculateทั้งชุดเดิม ไม่อ้างdependencyselectivecacheสำเร็จ;เป็นงานoptimizationตามtraceต่อได้ ไม่มีfreezeที่วัดพบให้รื้อcache/readinessเพิ่มในรอบนี้

**สถานะงานและเผยแพร่:** งาน1มีimplementation+localbrowserverificationพร้อมข้อจำกัดที่บันทึก;ไม่ประกาศว่าทุกqualificationของแผน3.8วัดผ่านแล้วหรือproductionเปลี่ยนแล้ว stageยังไม่markcompleteทั้งหมด Queueคงงานบัญชีreal-useracceptance/AIเดิมและpublicationแยก MockAuthQAserver5191หยุดแล้ว(testdataเป็นin-memoryfixture);GEEpreview5182คงไว้สำหรับแท็บส่งมอบ ไม่สร้างภารกิจ/บัญชีproduction ไม่เปลี่ยนสิทธิ์ ไม่ส่งข้อความเพิ่มไปแชทอื่น ไม่มีคำถามผู้ใช้ค้าง

<!-- ux-release-approved-2026-10-28 -->
### 28 ตุลาคม 2026 — อนุมัติเผยแพร่ UX/loading/scroll

**หัวข้อ:** ผู้ใช้สั่ง “push และ deploy เลย” อนุมัติเผยแพร่candidateUXปัจจุบันบนเว็บหลัก

**สรุป:** ตรวจGitHEAD/remoteทั้งmainและcodex/xedo-hardware-profileตรง45e928ef50ace69ae83393bc192acdc6b537fae7;hashของsource/build5รายการตรงRESULT.jsonที่ผ่าน531tests/0fail/0skipและ3buildsก่อนหน้า จึงไม่รันทดสอบlocalชุดเดิมซ้ำโดยไม่มีsourceเปลี่ยน รอบเผยแพร่นี้จะผูกCI/deployment/productionbytes/browser/APIเข้ากับcommitที่pushจริง ไม่มีDB/Auth/settings/dependency/API/schemachanges

**รายละเอียด/เป้าหมาย:** Vercelprojectxedo/prj_x35WcipWxA767cYwv3f0CXcdyea3/team_CV1O0uIz6BcarAQAOb8soV0I/domainxedo-eight.vercel.appยืนยันจากconnector Domainverified=true productionก่อนหน้าdpl_FD5evseV7RtRqE1nsWMgkz5oCL3f/45e928eREADY Independentreadonlyauditไม่พบcriticalblockerและไม่พบsecretpatternที่สแกน ผล531/local11.15minเป็นหลักฐานรอบก่อนที่ตรวจhashตรง ไม่อ้างเป็นproductiontestใหม่ คงremainingqualificationเรื่องphysicaltouch/trackpad/fullappP95/heap/selectivecalculation ไม่เริ่มAIหรือnormalprofile/schedule rewrite

**ไฟล์/สถานะรอบเตรียม:** canonical2Markdownและqueueเพิ่มapprovalrecordแล้ว รวมsource/tests/planที่ค้างในworkingtreeตามscopeUX พร้อมnewaction-feedback.js/.css/inspector-client.test.mjs/UX_COMPLETION_PLAN.md ไม่รวมignoredQAserver/downloads/env/credentials Outputrelease-receipt.jsonจะเก็บexactcommit/deployment/CI/productionchecksหลังเผยแพร่ ยังไม่มีผลpush/deployสำเร็จในจังหวะบันทึกนี้ ไม่มีคำถามผู้ใช้ค้าง
