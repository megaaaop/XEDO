# XEDO — รายละเอียดเว็บไซต์และแนวทางแก้ไข

## 1. หัวข้อ

- วันที่เริ่ม: 27 ตุลาคม 2026; อัปเดต: 31 ตุลาคม 2026, Asia/Bangkok
- Active checkout: `C:\mega\codex\iENA\github-publish\XEDO-hardware-release`
- เอกสารนี้อธิบายโครงสร้างและพฤติกรรมของเว็บ ใช้คู่กับ `XEDO_WORK_LOG.md` ซึ่งเก็บประวัติการแก้ ผลตรวจ และสถานะเผยแพร่
- ตามคำสั่งล่าสุด ให้บันทึกทั้งสองไฟล์ทุกครั้งที่ทำงานลักษณะนี้ และปรับ `implementation-queue.json` เมื่อข้อกำหนดหรือสถานะเปลี่ยน

## 2. สรุป

**Home altitude ผ่านการตรวจภาพ/JSON และ regression ใหม่แล้ว — 31 ต.ค. 2026 (§3.75): Automatic เติม10.788701057434082mจาก GEE จริงแม้ route needs review; manual99/Replace/Homechange/zero/Manualmode/clearผ่าน ภาพ local-home-surface.pngตรงJSONก่อน–หลังในแท็บเดียวกัน 639tests/syntax/3buildsผ่าน เตรียมเผยแพร่ตามคำสั่งผู้ใช้ ยังไม่อ้างว่าขึ้นproductionจนตรวจหลังdeployเสร็จ ไม่เปิดBilling/subscription**

**ทวนรายงาน Home altitude — 31 ต.ค. 2026 (§3.74):** พบรายงานตรงกับภาพและโค้ดแก้ในเครื่องแล้ว ตรวจhash7ไฟล์ตรงvalidationและอ่านlogเดิม639ผ่าน ไม่รันtests/browser/GEEใหม่ พบafter.jpgยังแสดงHomeUnknownแต่final-browser.jsonบันทึก10.788701057434082 จึงต้องreplayUI/จับภาพจากแท็บและbuildเดียวกันก่อนเผยแพร่ ไม่สรุปจากภาพเดียวว่าpatchล้มเหลว ตรวจproductionidentityสดยัง9acdd8a/FXc525READYซึ่งเป็นรุ่นก่อนHomefix รอบนี้วางแผนและบันทึกเท่านั้น ไม่แก้source/รายงานต้นฉบับ/ไม่pushdeploy/Billing/subscription

**Home altitude จาก GEE แก้จริงในเครื่อง — 31 ต.ค. 2026 (§3.73):** Automatic เติมจาก fresh matching Home sample แม้ full terrain assessment เป็น review/unknown; แยก availability ด้วย canUseModelHomeEstimate สำหรับปุ่ม Replace และคง manual ownership/แหล่งข้อมูล ไม่เปลี่ยน export gate Browserจริงได้10.788701057434082m/full639/syntax/3buildsผ่าน รายงาน HOME_ALTITUDE_GEE_FIX_REPORT_2026-10-31.md; ยังไม่ publish

**แก้คำอธิบาย GEE Home อัตโนมัติ — 31 ต.ค. 2026:** เส้นทางปัจจุบันมี Automatic Home อยู่แล้ว: `reconcileModelHome()` ตรวจ Automatic + terrain assessment ready แล้วเรียก `useModelHomeEstimate()` เติมช่องว่างพร้อม `gee_model` evidence โดยไม่ต้องกด Use reviewed estimate ซึ่งเป็นอีกทางเลือกหนึ่ง คำแนะนำก่อนหน้าที่เน้นกรอก Home เองไม่ครบถ้วน อีกห้าช่องในภาพยังไม่ได้รับจาก GEE context ปัจจุบัน ไม่มี source/runtime/publish change

**ข้อ1–2 ซ้อมและส่งมอบ CPU ขึ้น Git แล้ว — 31 ต.ค. 2026 (§3.72):** sourcecommit `bc533a8152a9308c2c797b1980ca4308fa21b6eb` pushmainแล้ว [CI41112463796](https://github.com/megaaaop/XEDO/actions/runs/41112463796) success automaticGitdeployment dpl_7xjXAYyQE2uo1aJJx4FpMx4xACpX READY/productionalias Fresh633Node/84Python/syntax/3buildsผ่าน QAใหม่CPU→manualedit/Undo/Redo→reviewv2→2.75km/3D→Savev3/History/Open/SQLตรง Demo.planจริง20items/8053bytes ตรวจหลังpush32HTTPchecks/25webhashesเดิม/workerและguideไม่public ไม่rebootOSหรือrestartworkerเดิม ไม่มีBilling/subscription ปัญหาใหม่ที่ผู้ใช้ให้เลื่อนยังรอรายละเอียด Docs-onlyfollowup exactidentityและCIล่าสุดดู outputs/XEDO_Presentation_Rehearsal_2026-10-31/publication.json

**สรุปงานคงเหลือล่าสุด — 31 ต.ค. 2026 (§3.71):** จากคิวและGitในเครื่อง เหลือ3กลุ่ม: ซ้อมนำเสนอหลังเปิดเครื่องใหม่, เก็บชุดCPU9ไฟล์พร้อมเอกสารล่าสุดลงGitเมื่อได้รับคำสั่งเผยแพร่, และขยายการทดสอบเฉพาะทาง/ระยะยาว อีก2กลุ่มPiกับรายงานทดลองยังพัก CIเอกสารปิดแล้วตามผลตรวจ§3.70 รอบนี้สรุปและอัปเดตเอกสาร ไม่ตรวจCI/เว็บจริงซ้ำ ไม่แก้product ไม่รันtests/build/AI ไม่commit/push/deploy/Billing/subscription ไม่มีคำถามค้าง

**ตรวจ CI เอกสารล่าสุดผ่านแล้ว — 31 ต.ค. 2026 (§3.70):** [run41100815452](https://github.com/megaaaop/XEDO/actions/runs/41100815452) ของcommit `a767faf3b67c7248e55a329579dba67a02047532` เป็น completed/success ทุกjobและstep รวมsyntax/tests/build3รูปแบบ ตรวจaliasสดยังเป็นdpl_DYMmXXi5Qsm2oMNM2APy5CXwv7DS/READY/commitเดียวกัน ปิดCIที่ค้างจากรอบเผยแพร่แล้ว เหลืองานเก็บก่อนนำเสนอ/ส่งมอบ/ขยายqualification3กลุ่ม และงานพักPi/รายงานทดลอง2กลุ่ม รอบนี้อ่านCI/deploymentและอัปเดตเอกสารในเครื่อง ไม่แก้product ไม่รันlocaltests/browser/AIใหม่ ไม่commit/push/deploy และไม่เปิดBilling/subscription ไม่มีคำถามรอคำตอบ

**คำอธิบาย export settings — 31 ต.ค. 2026:** ตรวจช่องในภาพผู้ใช้กับ `planning-trial-client.js`/`trial-export.js` แล้ว: firmware เป็น target, Home ใช้ AMSL, ceiling อ้างอิงเหนือ Home, corridor เป็น lateral buffer สำหรับตรวจ manual no-go, validUntil ต้องครอบคลุมเวลาภารกิจ และ source เป็นข้อความอ้างอิงที่ผู้ใช้รับรองเอง ช่อง datetime-local ในฟอร์มนี้ตีความเป็น UTC โดยเติม Z; ค่า demo ไม่ใช่ข้อจำกัดจริง ไม่มี code/tests/build/runtime/publish รอบนี้ รายละเอียดท้ายเอกสาร

**GEE v1.1 ข้อ 6 เผยแพร่และตรวจหลัง deploy แล้ว — 31 ต.ค. 2026 (§3.69):** รุ่น application 71e8f45 / dpl_EtSbsVA5JPknKc1G8yCEgG5NSsWG READY และ CI41095720672 success ตั้ง cache Secret/Config เฉพาะ Production ตามที่ผู้ใช้อนุญาต แก้ missing-asset404 ที่เคยได้ immutable แล้ว HTML23,516bytes/24assets ตรง build; แคชจริง miss→เขียนเสร็จหลัง response→newdeployment persistent hit/RAM miss/hashตรง Inspector เปิดประวัติเดิม→Analyzeผ่าน CPU→แก้พื้นที่/Undo/Redo→review→planner2.03km→3D satellite→Savev3/เปิดกลับ/SQLตรง คง3ขั้นตอน/4ตัวคำนวณ Fullsuiteใหม่633ผ่าน/CI3buildsผ่าน ผู้ช่วยทวน source/evidence แยกจาก runtime ไม่มี Billing/subscription/schema/accounts change ไม่มีคำถามผู้ใช้ค้าง Docs-only follow-up identity และ smoke ของ alias ล่าสุดอยู่ primary/final-publication.json; private UI ตรวจบน application revision ที่ระบุ

**GEE v1.1 ข้อ 5 ตรวจ performance/resilience ในเครื่องเสร็จ — 30 ต.ค. 2026 (§3.68):** แชทหลักรันใหม่633testsผ่าน/3builds/syntaxผ่าน source20ไฟล์ไม่เปลี่ยน ผู้ช่วยเดิมทวนวิธีวัดและหลักฐาน LocalUIready median388.3→228.3ms แต่FCP140→204ms; persistenthitลดGEEpixelsได้แต่ช้ากว่าoff3/5คู่ ไม่อ้างเร็วขึ้นทุกกรณี Foreground11m35s/Settings32คู่/2D–3D20รอบ/A→B→Aผ่าน pageexceptions0 และ44proxyAbortErrorแยกเป็นการยกเลิกที่สังเกตได้ ไม่มีcommit/push/deploy/Billing/subscriptionหรือschema/accounts change ข้อ6ยังรอคำสั่ง ไม่มีคำถามค้าง

**GEE v1.1 ข้อ 4 ลดหน้าเว็บเริ่มต้นเสร็จในเครื่อง — 30 ต.ค. 2026 (§3.67):** แยก hosted build เป็น HTML/ES modules/CSS/รูปที่มีชื่ออ้างอิงเนื้อหา พร้อมโหลด 3D/COG/ตัวคำนวณเมื่อใช้ HTML ลด 6,207,852 → 23,516 bytes; static body ผ่าน local HTTP gzip จาก browser ลด 3,732,249 → 355,284 bytes (90.48%, ไม่รวม API/GEE/headers และไม่ใช่อัตราเร็ว) เปิดซ้ำใช้แคชไฟล์เดิม คง portable/workspace/3 ขั้นตอน/4 ตัวคำนวณ Full suite ล่าสุด 633 ผ่าน/syntax/build ทั้งสามผ่าน ผู้ช่วยปิดสองข้อพบแล้ว ยังไม่ push/deploy/Billing/subscription ไม่มีคำถามค้าง ข้อ 5–6 ยังไม่เริ่ม

**GEE แผน v1.1 ข้อ 3 เสร็จในเครื่องและทดสอบ Supabase จริง — 30 ต.ค. 2026 (§3.66):** เพิ่ม persistent PNG cache เพดาน 200,000,000 bytes ติดตั้ง private schema/RPC/bucket ใน xedo แล้ว ทดสอบโปรแกรมใหม่อ่านภาพเดิมได้โดยไม่เรียก GEE pixels ซ้ำ; 192 คำขอจองพื้นที่ผ่าน 8 ชุดพร้อมกันรับ 190/ปฏิเสธ 2 ไม่เกินเพดาน และล้าง QA ได้ตรงยอดจริง ชุดทดสอบล่าสุด 626 ผ่าน/syntax/build ผ่าน ผู้ช่วยปิดชุด B แล้ว โค้ดยังไม่ push/deploy เว็บจริงยังไม่ใช้แคชรุ่นนี้ ไม่เปิด Billing/subscription ไม่มีคำถามผู้ใช้ค้าง ข้อ 4–6 ยังไม่เริ่ม

**GEE แผน v1.1 ข้อ 1–2 เสร็จ — 30 ต.ค. 2026 (§3.65):** เก็บ baseline/โควต้าสด เพิ่ม timing diagnostics ในเครื่อง และตรึงแบบแคชหลังรับชุด A จากแชทผู้ช่วยเดิมแล้ว; 615 tests ผ่าน/syntax/build ผ่าน PNG และ built HTML ตัวอย่าง hash ตรง Production ไม่มี bucket/schema/RPC/cache จริง ไม่มี push/deploy/Billing/subscription ข้อ 3–6 ยังไม่เริ่ม ไม่มีคำถามค้าง


**แผน GEE ใช้แชทผู้ช่วยเดิม — 30 ต.ค. 2026 (§3.64):** แผน v1.1 แบ่งงานหกระยะ: แชทหลักแก้เว็บไซต์ ผู้ช่วยเดิมตรวจ contract/ออกแบบทดสอบ/ตรวจหลักฐานคู่ขนาน มีจุดรับผล A/B/C และกติกา hashes/ไฟล์ร่วม ใช้การตั้งค่าปัจจุบันได้ รอบนี้ปรับเอกสารเท่านั้น ยังไม่ส่งเริ่มงานหรือ implement/publish ไม่มีคำถามค้าง


**ค้นไฟล์แผน GEE จากอีกแชท — 30 ต.ค. 2026 (§3.63):** พบและเปิดตรวจ `docs/GEE_MAP_CACHE_PERFORMANCE_PLAN.md` v1.0 แล้ว เป็นแผน cache/performance ที่ยังไม่ implement; รอบนี้ค้นหาและบันทึกผลเท่านั้น ไม่มีคำถามค้าง


**แผนGEE/Supabaseฉบับรวม — 30 ต.ค.2026 (§3.62):** สร้าง[GEE_MAP_CACHE_PERFORMANCE_PLAN.md](GEE_MAP_CACHE_PERFORMANCE_PLAN.md)v1.0จากแชทล่าสุด ยึดcache200MB/500MBทางเลือกภายหลัง รวมbaselineจริง+snapshotUsage+architecture/ขั้นตอน/เกณฑ์ตรวจรับ ยังไม่implement/สร้างbucketหรือdeploy ไม่มีคำถามรอคำตอบ

**คำแนะนำเลือก reasoning effort — 30 ต.ค. 2026 (§3.61):** เสนอ GPT-6.1 Sol Extra High เป็นหลักสำหรับพัฒนา XEDO และพิจารณา Ultra เฉพาะงานใหญ่ที่แบ่งสำรวจ/ตรวจหลายส่วนพร้อมกันได้ คงผู้แก้ source หลักคนเดียวตาม ownership เดิม เป็นคำแนะนำที่ยังไม่ได้ทดสอบเปรียบเทียบบน XEDO ไม่เปลี่ยน model/config หรือคิวผลิตภัณฑ์

**สถานะงานคงเหลือ 30 ต.ค. 2026 (§3.60):** core prototype/บัญชี/AI พื้นที่ใหม่และ CPU ผ่านแล้ว; งานติดตามคือความเร็ว GEE/แคช (ข้อเสนอ), extended qualification และเก็บ launcher/คู่มือเข้า Git; Pi กับรายงานผลทดลองยังพักไว้ ไม่มีคำตอบผู้ใช้ค้าง รอบนี้สรุปสถานะและอัปเดตเอกสารเท่านั้น


**ตรวจเว็บหลัง reset ผ่าน — 30 ตุลาคม2026:** ผู้ใช้Sign inInspectorเดิมแล้ว Chromeproductionเห็นCPUReady เปิดHistoryเดิมv3ได้ ทำQAใหม่หนึ่งงานผ่านAnalyze→GEE/SAR→CPUจริง→manual4จุด/แก้พิกัด→S2review→confirmv2complete→planner2.21km→Savev3→History3/2/1→เปิดv3กลับมาพิกัด/reviewตรงกัน APIยืนยันjobใหม่Succeeded/ภารกิจเดิมไม่เปลี่ยน CPUกลับREADY ไม่มีคำถามรอคำตอบ ไม่มีแก้application/push/deploy/Billing/subscription ดู§3.58

**Supabase usageจริง — 30 ตุลาคม2026:** ตรวจFree/AllprojectsUsageแล้วStorage0/1GBและSQLXEDO0buckets/0objects/0bytes;DB0.028/0.5GBเหลือประมาณ0.472GB แนะนำcacheเริ่ม200MB/เผื่อไฟล์อื่น800MBและพิจารณาเพดาน500MBภายหลัง เป็นข้อเสนอที่ยังไม่implement ไม่สร้างbucket/deploy/Billing ไม่มีคำถามรอคำตอบ ดู§3.56

**ยืนยันปิด–เปิดเครื่อง — 30 ตุลาคม2026:** ตรวจworkerprocessยังทำงาน/stateREADYและไม่มีactive.jsonแล้ว ผู้ใช้ปิดเครื่องได้หลังSaveงานบนเว็บและปิดworkerขณะว่าง เปิดเครื่องด้วยWindowsuserเดิม→ต่อinternet→ดับเบิลคลิกDesktopXEDO CPU Worker→รอREADY→เปิดเว็บไซต์/Sign inInspectorหากถูกขอ ไม่มีการshutdownเครื่องโดยagentหรือเปลี่ยนระบบ ดู§3.55

**Supabase cache design — 30 ตุลาคม2026:** ภาพแผนที่เก็บในStorageและrecipe/indexในDBเพื่อกลับมาใช้ซ้ำได้ ต้องแก้keyไม่ผูกrandomsessionและรักษาassetversion/clipbounds เดิมมีmemorycacheบางส่วนจึงไม่ใช่คำนวณใหม่ทุกครั้ง รอบนี้อธิบาย/บันทึกเท่านั้น ยังไม่สร้างbucket/แก้โค้ด/deploy/เปิดsubscription ไม่มีคำถามรอคำตอบ ดู§3.54

**Desktop Shortcut — 30 ตุลาคม2026:** สร้างXEDO CPU Worker.lnkบนDesktopที่Windowsใช้อยู่จริง(OneDrive) ชี้Start-XEDO-CPU.cmdเดิม/WorkingDirectoryrelease/ไม่มีarguments/ไม่Runasadmin ทดสอบเปิดผ่านShortcutจริงหลังหยุดหน้าต่างเดิมขณะว่าง ตรวจprocessใหม่และREADYtimestampหลังactivationแล้ว เปิดworkerทิ้งไว้ให้ ไม่มีsourcechange/OSreboot/newAIjob/push/deploy/Billing/subscription ดู§3.53

**CPU worker แบบคลิกเดียว — 30 ตุลาคม2026:** เพิ่มStart-XEDO-CPU.cmd/ไฟล์Reconnectและคู่มือหลังเปิดเครื่อง ทดสอบไฟล์/dependencyแบบoffline,Python84testsผ่าน,ต่อSupabaseจริงด้วยCPUsessionเดิม/หยุด–เปิดโปรแกรมและกันเปิดซ้ำผ่าน เปิดหน้าต่างworkerให้แล้ว;ใช้Windowsuserเดิม/เปิดPCและinternetสำหรับAnalyzeใหม่ ไม่มีOSrebootจริงหรือinferenceพื้นที่ใหม่ในรอบนี้ ไม่มีBilling/subscription/SQL/websitepush/deploy ดู§3.52และCPU_WORKER_START_GUIDE.md

**GEE map audit — 30 ตุลาคม2026:** ตรวจProductionล่าสุด a561269/dpl_EG7VyQiMMZpdXuSxmeSLep3KcsGm และวัดimageryAPIจริง พบbackgroundcomputePixelsต่อtile/mosaicหลายscene/cacheใช้ซ้ำจำกัดกับHTMLเริ่มต้น6.2MB ตัวอย่าง8tilesครั้งละ4ใช้5.019s ไม่ใช่fullpagetiming;รายละเอียด§3.51 รอบนี้ตรวจและบันทึกเท่านั้น ยังไม่แก้applicationหรือpush/deploy ไม่มีคำถามรอคำตอบ

**ขั้น7ปิดแล้ว — 30 ตุลาคม2026:** เผยแพร่ https://xedo-eight.vercel.app/ และตรวจproductionAnalyze→localCPUจริง→Inspectorแก้พื้นที่→confirm→planner→Save/history/reopenครบ หลังผู้ใช้Sign inใหม่ Rootรีเฟรชbrowserแล้วตรวจHistory[3,2,1]→เปิดVersion3สำเร็จ manualtarget4จุดและConfirmedreviewv2/completeกลับมาครบ ไม่มีคำถามรอคำตอบ รายละเอียด§3.49–3.50;ยังต้องเปิดPC/worker/internetสำหรับAnalyzeใหม่ ไม่มีBilling/subscription

**ประวัติเมื่อปิดขั้น6ก่อนอนุญาตเผยแพร่ (สถานะปัจจุบันดูขั้น7):** Inspector เดิมเชื่อมสำเร็จครบสามบัญชีแล้ว ใช้ Supabase xedo จริงกับเว็บในเครื่องและ CPU ในเครื่องได้ตั้งแต่ Analyze พื้นที่ใหม่ → โหลดภาพ SAR → ผล owned AI → Inspector แก้/วาดพื้นที่ → ตรวจภาพ Sentinel-2 จริง → confirm → planner → Save/history/private reopen ไม่มีคำถามรอคำตอบ ขั้นถัดไปคือขั้น7เตรียมเผยแพร่เมื่อผู้ใช้อนุญาต โดยรอบนี้ไม่ commit/push/deploy ไม่เปิด Billing/subscription และไม่เปลี่ยนรหัสผ่านหรือบัญชีเดิม

**ประวัติก่อนเชื่อม primary สำเร็จ (แทนที่ด้วย§3.47):** ทีมสร้างInspectorTestTEST_INSPECTOR_LOCALและmachineCPU_WORKER_LOCALในxedoแล้ว ทั้งสองconfirmed/มีpassword/identityครบ RootเปิดInspectorTestและผูกmachineกับInspectorเดิมPRIMARY_INSPECTOR_LOCAL ตรวจenabledInspectors2/registeredWorkers1/machineInInspectorRoster0 RealAuthGetUserและRPC7checksผ่าน: secondaryInspectorใช้งานได้/machinepresenceownerถูก/สองroleใช้สิทธิ์สลับกันไม่ได้ ตอนนี้มีDPAPIsessionสองroleแล้ว เหลือprimary ผู้ใช้แจ้งลืมรหัสและเลือกลองรหัสที่Chromeบันทึกก่อน ไม่ได้ส่งrecoveryemail/เปลี่ยนรหัส/ลบสร้างuserใหม่ RootเปิดเฉพาะSupabaseUserDetailsพบปุ่มSendpasswordrecovery(ส่งemailเท่านั้น) ไม่อ่านPasswordManager/clipboard รอprimaryconnectสำเร็จ

**ประวัติช่วงเริ่มขั้น6ก่อนสร้างบัญชีเพิ่ม30ต.ค.:** Supabaseจริงxedo/tstmjnlhwidwtzetqxbuผ่านMCPบัญชีmegaphijak ติดตั้งmigrationxedo_local_cpu_queue_and_owned_results(v1+statusv2)สำเร็จในtransactionเดียว มี6ตารางใหม่และ12privateRLS ไม่มีanon/authenticateddirectCRUD PublicworkerRPCเป็นInvoker/anonexecute=false/authenticated=true PostgRESTanonymousRPCตอบ401/private-table404 Preparedcataloghashเดิมคงเดิม Catalog14candidates/3coverageเก่าvalidateบนPostgreSQLจริง0.289493s/99404JSONBbytes(ไม่persistเป็นownedresultและไม่ใช่freshinference) FreshNode606/Python45ผ่าน CPU197.5274กม²รอบใหม่34.980s/runner4.098s/peak725.34MiB/0candidate;GEEจริงช่วง1900-01-01ได้NO_SAR_SCENEตามคาด ขณะนี้Authจริงยังมีเพียงบัญชีเดิม หน้าsetupLoginยังไม่สำเร็จ จึงยังไม่อ้างsigned-inCPU/owner/concurrencyผ่าน ดูWEBSITE_DETAILS§3.46

สถานะล่าสุด30ต.ค. — **LOCAL_CPU_AI_INTEGRATION_PLANขั้น3–5เป็นlocal-tested candidateแล้ว**: Analyze→Save revision→owned PostgreSQL queue→outbound worker/GEE/CPUจริง→owned immutable result→Inspector edit/confirm→planner/Save/history ดู§3.45 เว็บ606tests/Python30tests/3buildsผ่าน ผลจริงพื้นที่5.0172กม² pipeline23.373s/queueถึงpublish28.421s/nativepeak509.92MiB การทดสอบAuthเป็นfixtureและDBเป็นPGlite ไม่อ้างrealSupabase/productionacceptance ไม่applySQL/Auth/bucket/IAM/Billing/subscription ไม่commit/push/deploy ผลcatalogอยู่DB;TIFF/previewอยู่เครื่อง ไม่มีStorageuploadในmilestoneนี้

ประวัติimplementationก่อนรอบปัจจุบัน30ต.ค.: LOCAL_CPU_AI_INTEGRATION_PLANขั้น1–2สำเร็จในเครื่อง workers/local-aiโหลดSARจากGEEเดิมผ่านcomputePixels→CPU→GeoTIFF/preview/พื้นที่เสี่ยงและcoverageที่ตรวจroundtrip ผลพื้นที่ใหม่5.0172/197.5274กม²ผ่านและautodownloadbaseline176.478กม²ให้score/maskตรงทุกpixel Python13testsผ่าน/pipcheckผ่าน ดู§3.44 รอบขั้น1–2ไม่เปลี่ยนsrc/api/dbของเว็บ ไม่สร้างqueue/Authmachine/bucketหรือpush/deploy ไม่เปิดBilling/subscription

สถานะช่วงวางแผนก่อนimplementation30ต.ค.: แผนเชื่อมwebsiteกับCPUในเครื่องพร้อมแล้ว ดู§3.43และLOCAL_CPU_AI_INTEGRATION_PLAN.md ใช้ownedjobsในSupabaseและworkerดึงงานผ่านHTTPSRPC/automaticGEEdownload เก็บผลreviewส่วนตัวเปิดย้อนหลังได้โดยไม่ต้องให้เครื่องCPUออนไลน์ตลอด ไม่เปิดBilling/subscription/publicport/tunnel รอบนี้วางแผนและตรวจsource/เอกสารเท่านั้น ยังไม่implement/สร้างบัญชีเครื่อง/bucket/SQL/push/deploy

หลักฐานCPUรอบก่อน30ต.ค. (ไม่รันใหม่ในรอบวางแผน): SAR/checkpoint เดิมครบ16รอบ (2/4 threads), ทุกprocessสำเร็จและผลตรงbaselineทุกพิกเซล 4threadsใช้โมเดลซ้ำprocessing median2.297s/รวมpreview4.171s;freshprocessเต็มงานmedian12.242s;nativepeakRAMสูงสุด891.297MiB/0.8704GiB ดู§3.42 ผลนี้ไม่รวมautomaticGEE/onlinejob/UIlatency

สถานะล่าสุด 28 ต.ค. CoreUXเผยแพร่และตรวจProductionแล้ว code32aa243/VercelREADY/mainCI40669324786success/HTMLตรงverifiedbuild ดู§3.34 พร้อมLoginpending-errorcleanup/normalGEE/3DSatellite/mobilecheckbox/demoPlan18items ไม่มีDBAuthchanges Qualificationphysicaltouch/trackpad/heap/fullappINP/selectivecalcยังคงแยกตาม§3.32

สถานะช่วงวางแผน29ต.ค. (ประวัติ): ผู้ใช้ยืนยันว่าบัญชีตรวจได้แล้ว รับเป็นuser-confirmedและเดินแผนAIต่อโดยไม่ให้บัญชีเป็นตัวขวาง คงprivateSave/history/A–B/sessionเป็นAIintegrationregression ไม่อ้างว่าagentตรวจใหม่ แผนpreparedAI/editor/serverconfirm/plannerอยู่AI_INTEGRATION_PLAN§3.16และ§3.36ด้านล่าง รอบนี้ตรวจsource/corehashes12ไฟล์และเขียนแผน ไม่เปลี่ยนapplicationหรือบริการสดและไม่เผยแพร่ใหม่ UXcoreเผยแพร่แล้ว เหลือqualificationที่บันทึกไว้

สถานะล่าสุด29ต.ค.: preparedSAR14candidate/Inspectorriskeditor/privateconfirmation/planner/Savehistoryเผยแพร่แล้ว codeb719d8e,ProductionREADY,CI2branchesผ่าน,HTMLตรงverifiedbuild,564tests/3builds ผ่าน ใช้liveSQLที่ตรวจสิทธิ์แล้ว รายละเอียด§3.37/§3.37.2;agentไม่ใช้passwordจริงทดสอบAIบนProduction

กติกาเพิ่มสำหรับงานคู่ขนาน: แชทหลักนี้แก้เว็บไซต์เพียงแชทเดียว แชทสนับสนุนเตรียมข้อมูลAI/หลักฐานตรวจ/คำแนะนำ/กรณีทดสอบในโฟลเดอร์แยก แล้วส่งให้แชทหลักตรวจรับและเชื่อม รายละเอียดownershipและhandoffอยู่ข้อ3.14 ไม่ให้การทำคู่ขนานกลายเป็นหลายแชทแก้source/configของเว็บพร้อมกัน

ภาพผู้ใช้ล่าสุดแสดง Home `12.66105, 101.1288` และภาพเฉพาะกรอบเล็ก พร้อม surface model ready ใช้เป็นบริบทสำหรับไล่อาการ ไม่ถือว่าเป็น polygon ของภารกิจเดิมครบถ้วน อินเทอร์เน็ตไม่เสถียรเป็นข้อสงสัย ไม่ใช่สาเหตุที่พิสูจน์แล้ว

## 3. รายละเอียด

### 3.1 โครงสร้างตั้งต้นที่อ่านก่อนแก้

- `src/planning-trial-client.js`: เชื่อม flow, map, scene review, calculations, schedule และ export; มีหลายหน้าที่ในไฟล์เดียว
- `src/planning-geospatial-ui.js` + `src/gee-mission-context.js` + `api/planning-context.mjs`: โหลดและตรวจ context ของ terrain/landcover/quality/forecast
- `src/planning-satellite.js` + `src/gee-imagery.js` + `src/gee-imagery-api.js`: แหล่งภาพและกรอบ tile ของภาพที่เลือก
- `src/planning-basemap.js` + `src/planning-basemap-view.js`: ภาพพื้นหลังและการกู้คืนเมื่อ request/tile ล้มเหลว
- `src/planning-trial.css`, `src/planning-geospatial.css`, `src/planning-readiness.*`: layout, status และ readiness
- `scripts/build.mjs`: สร้าง `dist/index.html` ที่คำนวณใน browser และใช้ hosted imagery/context APIs
- `vercel.json`, `.github/workflows/ci.yml`: routing และ check/test/build pipeline

### 3.2 แผนแก้ที่เขียนก่อนลงมือ

| ลำดับ | อาการ/งาน | วิธีแก้ที่ตั้งใจ | เกณฑ์ตรวจ |
| --- | --- | --- | --- |
| 1 | GEE แสดง unavailable โดยไม่บอกสาเหตุ | แยก error/transport/status validation เป็นโมดูล มีขั้นตอนงานและ progress ที่สะท้อนข้อมูลจริง ใช้สถานะรอเมื่อยังไม่ทราบเปอร์เซ็นต์ server ไม่สร้างตัวเลขวิ่งตามเวลา | แยก offline/timeout/busy/input/response mismatch ได้; partial ยังเห็นส่วนใช้ได้; ยกเลิก/เปลี่ยนพื้นที่แล้วผลเก่าไม่ทับ |
| 2 | client หลักมีหลายหน้าที่และ render ซ้ำ | ตรวจ dependency/state lifecycle แยกส่วนที่แก้เป็น module ชัดเจน และตัดงานซ้ำที่ยืนยันจากโค้ด ไม่เปลี่ยนทุกไฟล์หรือสลับลำดับโดยไม่มีเหตุผล | import/init/dispose ชัด; source of truth เดียว; tests ของพฤติกรรมเดิมผ่าน |
| 3 | ภาพ GEE แสดงเฉพาะกรอบจนรอบนอกมืด | เพิ่ม display context ราว 1 กม. รอบ AOI โดยเก็บ inspection/review geometry เดิมแยกจาก display extent ป้องกันใช้ภาพนอก AOI ไปผ่าน review โดยผิดเงื่อนไข | แผนที่เห็นบริบทนอก AOI; route/oil area และ polygon เดิมไม่ขยาย; bounds/server limits คงใช้ได้ |
| 4 | เลื่อนหน้าแล้วหน่วง | ตรวจ render/readiness timers, vector style allocations, layout writes, map interactions และ expensive paint ปรับเฉพาะสาเหตุที่พบ พร้อม cleanup | scroll ไม่กระตุ้นคำนวณ/requests; DOM ที่ไม่เปลี่ยนไม่เขียนซ้ำ; map/review/download ยังทำงาน |

### 3.3 การตรวจและเผยแพร่

ตรวจ syntax, tests ที่เกี่ยวข้อง, full standard suite และ build รูปแบบที่ CI กำหนด ไม่เปิดรอบทดลองให้ผู้ใช้ตรวจเพิ่ม เมื่อผ่านให้ commit/push ไป production branch ของ repo เดิมและยืนยัน deployment/commit พร้อม smoke check เว็บหลัก เก็บผลจริงใน work log ไม่คัดผล 428 tests เก่ามาเป็นผลรอบใหม่

### 3.4 สถานะรอบนี้

เขียนแผนในข้อ 3.2 ก่อน implementation แล้ว ชุดแก้ผ่าน syntax, automated tests **458/458** และ build ทั้งสามรูปแบบ API ในเครื่องที่ใช้ GEE จริงคืนข้อมูลครบสี่ส่วนในพื้นที่อ้างอิงและคืนภาพ tile นอก AOI แต่อยู่ในกรอบ context ได้ เผยแพร่ชุดโค้ด `8452df2` แล้ว และตรวจผ่านหน้า Production จริง

| Module | หน้าที่และข้อกำหนดที่รักษา |
| --- | --- |
| `planning-context-request.js` | HTTP transport, validation boundary, allowlisted error categories/input hints, request ID และ retry ชั่วคราวหนึ่งครั้ง; ไม่แสดง exception หรือ error body ดิบ |
| `planning-geospatial-ui.js` | lifecycle ของภารกิจ/TTL/cancellation, สถานะแต่ละแหล่ง, progress และการแสดงผล; ส่ง `getStatus()` แบบเบาให้ readiness |
| `gee-mission-context.js` | เพิ่มข้อมูล failure แบบปลอดภัยต่อแหล่ง ไม่ทำให้การล้มเหลวของหนึ่งแหล่งลบข้อมูลที่แหล่งอื่นตอบได้ |
| `satellite-context.js` | ฟังก์ชันร่วม server/client สำหรับ display rectangle รอบ AOI ประมาณ 1 กม. ต่อด้าน ขอบเขตนี้ใช้ดูบริบทเท่านั้น |
| `planning-map-overlay.js` | วาด feature/style ที่นำกลับมาใช้ได้ เก็บ feature เดิมเมื่อ inputs ไม่เปลี่ยน รวม route segments ใน MultiLineString โดยไม่เชื่อมข้ามช่วงที่ขาด |
| `planning-view.js` | เขียน property/attribute ของ DOM เฉพาะค่าเปลี่ยน ป้องกัน timer เขียนซ้ำระหว่างเลื่อนหน้า |
| `planning-image-readiness.js` | ตรวจความพร้อมเฉพาะ tile ที่เกี่ยวข้องกับ inspection AOI; context tile ไม่ใช้เป็นหลักฐานและไม่เป็นตัวขวาง review |

### 3.5 GEE progress และการอ่านสถานะ

- เปอร์เซ็นต์เป็นความคืบหน้า **ขั้นตอนรับข้อมูลฝั่งเว็บ**: เตรียมคำขอ 1/3 = 33%, ได้ HTTP response 2/3 = 67%, ตรวจข้อมูลและบริบทผ่าน 3/3 = 100%
- ระหว่างรอ server ใช้ progress bar แบบไม่กำหนดสัดส่วนพร้อมเวลาที่ผ่านไป จำนวนครั้ง และคำอธิบายว่า GEE ไม่ส่งเปอร์เซ็นต์ประมวลผลสด จึงไม่ทำตัวเลขเพิ่มตามเวลาเอง
- 100% หมายถึงขั้นตอนรับและตรวจคำตอบจบ ไม่ได้หมายความว่าทุกแหล่งข้อมูลมีค่า และไม่เท่ากับพร้อม export ให้ดูสถานะ terrain/landcover/quality/forecast และ readiness แยก
- แยก offline, browser transport, timeout/deadline, busy/429, access, endpoint, invalid input, non-JSON/JSON เสีย/ใหญ่เกิน, mission mismatch และ response expiry พร้อม HTTP status/request ID ที่ปลอดภัย
- INPUT มีข้อความแนะนำเฉพาะขอบเขต/จำนวนจุด/ภูมิภาค, Home, scene และช่วงเวลา โดยใช้ข้อความที่อนุญาตไว้เท่านั้น ไม่เชื่อข้อความดิบจาก server ทุกชนิด
- Retry อัตโนมัติหนึ่งครั้งเฉพาะปัญหาชั่วคราว ภายใน deadline รวม 30 วินาที การยกเลิก/เปลี่ยนพื้นที่หยุด retry และกันผล/เปอร์เซ็นต์ที่ตอบช้าหลังยกเลิก

### 3.6 การแสดงภาพรอบ AOI

- API map ยังคง `geometry` ของ inspection เดิม เพิ่ม `displayGeometry` และ `contextBufferM: 1000` สำหรับภาพบริบท
- พื้นที่บริบทเป็น **สี่เหลี่ยมครอบกรอบ AOI ที่ขยายด้านละประมาณ 1 กม.** ไม่ใช่วงกลมสำรวจหรือขอบคราบน้ำมัน
- Scene coverage, คุณภาพภาพ, review, route และตัวคำนวณทั้งหมดอิง AOI เดิม Client ตรวจว่า displayGeometry ตรงกับ helper ที่กำหนด ไม่รับกรอบใหญ่ที่ปลอมจากภายนอก
- Signed tile session ของภาพที่เลือกอนุญาตขอบเขตขยายแบบจำกัด โดยไม่ขยาย input limit ของ mission เดิม Basemap และ session เก่ายังเข้ากันได้
- Context-only tiles แสดงภาพตามปกติ แต่ไม่ decode ซ้ำเพื่อตรวจ pixel evidence ถ้ารอบนอกล้มเหลวให้แจ้งเตือนที่ caption และรักษาสถานะของ AOI ที่ผ่านแล้ว ส่วน AOI tile ผิดพลาดยังยกเลิก review
- คำนวณ expected AOI tile keys จาก public tile grid/view APIs ก่อนอนุญาต review รวม tile ที่ยังไม่เริ่มโหลดในคิว เปลี่ยน zoom/view แล้วชุดคาดหมายเปลี่ยนตาม รอให้ทุก tile ที่ต้องใช้เสร็จและมีพิกเซลใน AOI ไม่อนุญาตระหว่าง view ยัง animate/interact

### 3.7 Scroll และการจัดโค้ด

- Readiness refresh ประเมิน state ครั้งเดียวต่อ tick ส่ง state เดียวให้ view และเขียน DOM เฉพาะที่เปลี่ยน Hidden tab งด render แล้ว refresh เมื่อกลับมา
- Overlay cache เก็บ style ต่อ role และไม่ล้าง/สร้าง vector source ซ้ำเมื่อข้อมูลเท่าเดิม
- ล้อเมาส์เลื่อนหน้าเมื่อ map ยังไม่ focus คลิกหรือ focus map ก่อนซูมด้วยล้อ; ปุ่ม +/−, drag, keyboard และ pinch ยังคงใช้ได้
- จำกัดการ paint ของ sticky map panel และตัด live blur บน dialog backdrop
- เหล่านี้เป็นการลดงานที่พบจาก source และทดสอบซ้ำได้ ไม่อ้างตัวเลข FPS ที่ไม่ได้วัด โค้ดหลักยังเป็น coordinator ของ flow เดิม ไม่ rewrite ทั้งระบบหรือสลับลำดับไฟล์โดยคาดเดา

### 3.8 การบำรุงรักษารอบถัดไป

อ่าน log/queue/เอกสารนี้ก่อนแก้ เลือก module ตามหน้าที่ ใช้ revision/abort/TTL ของ coordinator เดิม ไม่เพิ่ม fetch หรือตัวจับเวลาซ้อนโดยไม่มี disposal ให้คง tests เรื่อง partial/Unknown, scene identity, original AOI, cancellation, expired readiness และ asynchronous export recheck อัปเดตคำอธิบายกับผลตรวจจริงในสองเอกสารทุกครั้ง

### 3.9 หลักฐานตรวจรับรอบ 27 ต.ค. 2026

- `npm run check`, `npm test` **458 ผ่าน / 0 ล้มเหลว / 0 ข้าม**, `npm run build`, `npm run build:workspace`, `npm run build:file` ผ่าน
- Tests ตรวจ abort/late body/retry, sanitized input/source failures, cached progress, padded display/session bounds และ original AOI, queued expected tiles/rotated viewport, overlay/style reuse และ readiness 60 รอบที่ข้อมูลไม่เปลี่ยนโดยไม่เขียน DOM ซ้ำ
- Full suite ครั้งแรกพบ test harness เก่าตัด source จบที่ `function add` ซึ่งถูกย้ายออกไปแล้ว ปรับจุดตัดเป็น `function drawMap` โดยรักษา assertions เรื่อง demo isolation จากนั้น full suite ผ่าน ไม่ได้ลบ/ข้าม test
- Local API วันที่ 27 ต.ค. 2026 คืน 12 scenes; inspection geometry เดิมไม่เปลี่ยน, display context 1000m, context-only PNG 7,223 bytes HTTP200, terrain/landcover/quality/forecast ready และเวลาเริ่ม–จบไม่ครบได้ HTTP422/`GEE_CONTEXT_INPUT_INVALID`
- ตรวจผ่าน browser ในเครื่องได้ภาพ selected acquisition พร้อมปุ่ม Prepare drone mission เปิดใช้ เป็นการตรวจภายในของผู้ช่วย ไม่เปิดขั้นทดลองให้ผู้ใช้ตรวจเพิ่ม
- Production code commit `8452df2939d7a839885077e574ee6901944b6a91`, deployment ที่ตรวจ `dpl_FhXkVvUtYWRAA8rkqZkJwFeC5JBe` READY, CI run `40484759102` success และ alias `https://xedo-eight.vercel.app/` ตรงรุ่นนี้ขณะตรวจ
- Browser Production โหลด selected acquisition/ภาพ context ได้และเปิด Prepare; GEE progress 33% ระหว่างรอ → 100% หลังตรวจคำตอบ พร้อม Terrain/landcover/quality/GFS Ready; ทดสอบเวลา end ว่างได้ INPUT/HTTP422 และข้อความแนะนำเฉพาะ หยุดที่67% แล้วคืน end เดิมได้ Ready อีกครั้ง Route preview ยังสร้างได้และไม่มี console error ในรอบตรวจ
- การเลื่อน PageUp ภายใน Mission settings ใช้งานได้และบันทึกภาพ progress ชัดเจน ไม่ได้วัด FPS หรืออ้างว่าเครือข่าย/ทุกเครื่องจะไม่มี lag
- CLI smoke แบบอ่าน full HTML และ API บน Production timeout สองครั้ง ไม่ใช้เป็นผลผ่านหรือสรุปว่าเว็บไซต์ล่ม เปลี่ยนมาใช้หลักฐาน browser UI/API path ที่ตรวจได้จริงและ deployment identity ส่วน local API script ผ่านครบ
- หลักฐานทั้งหมดอยู่ `output/release-check/gee-status-context-scroll-2026-10-27/` (ignored): logs, `local-api.json`, `production-map-context.jpg`, `production-gee-progress.jpg`, `production-error-state.json` และ receipt ที่ระบุ deployment/CI แน่นอน เอกสารผลตรวจนี้เป็น follow-up ของ code release; commit เอกสารเพิ่มเติมอาจเปลี่ยน deployment metadata แต่ bundle ของ application เดิมไม่เปลี่ยน

### 3.10 แผน 3D ground modes — เขียนก่อน implementation 27 ต.ค. 2026

- เก็บ `deployment-3d.js` เป็น render-only Canvas perspective: Diagram เดิม และ Satellite texture บนพื้นเดียวกัน คง camera fit, local projection, preview dimensions และความสูงเดิม
- เพิ่ม module loader เฉพาะพื้น 3D เรียก API basemap GEE เดิมด้วย polygon ของพื้น ไม่ใช้ภาพ thumbnail หรือ screenshot ของแผนที่ และไม่เปลี่ยน original inspection geometry/scene review
- ประกอบ same-origin PNG tiles ใน Web Mercator เป็น texture มี bounds ชัดเจน ใช้ inverse local projection เพื่อวาง mesh ตามพิกัดจริง ไม่ยืดภาพ AOI เล็กให้เต็มกรอบโดยผิดสัดส่วน
- ภาพพื้นเป็น recent Sentinel-2 true-colour mosaic พร้อม acquired range/credit/10m native source; อาจคนละ acquisition กับภาพ review จึงแสดง source แยก และไม่ใช้ยกระดับ readiness/ผลวิเคราะห์
- กำหนด tile/texture/concurrency budgets, abort/deadline, safe error/retry, revision guard และ dispose; mode switch ไม่ reset orbit/zoom และไม่โหลดใหม่ทุก renderer update
- UI มี Diagram / Satellite และสถานะโหลด ไม่ขยาย/ย่อ preview area ที่ผู้ใช้พอใจแล้ว ไม่มีความสูง DEM ต่อเนื่องเพิ่มในงานนี้
- ตรวจ georeference/texture budgets/cancellation/non-image tiles, mode switching/renderer/negative states, automated suite/check/3builds และ browser ภายใน จากนั้นเผยแพร่ตรง production ตามคำสั่งผู้ใช้ บันทึกผลจริงใน work log

### 3.11 พฤติกรรมและโครงสร้างหลังเพิ่ม 3D satellite ground

| ส่วน | หน้าที่ |
| --- | --- |
| `deployment-ground.js` | sample geographic floor65จุด, inverse projection/UV mesh16×16, affine trianglesสำหรับperspective ไม่ยืดภาพAOIเล็กทับพื้น |
| `deployment-3d.js` | rendererเดิม+getGroundGeometry/setGroundMode/setGroundTexture; defaultDiagram, borrowedtexture, keepcamera/floor/dimensions; ไม่ทำnetwork |
| `planning-3d-satellite.js` | เรียกbasemapAPIเดิมด้วยfloorpolygon,ตรวจsameoriginmanifest+PNG≤1MiB/256px,ประกอบatlas≤2048px/64tiles/concurrency4/overall60s;ตรวจvisiblepixelsในfloor≥99.5% ไม่รวมpadding |
| `planning-3d-ground-controller.js` | หนึ่งcachedatlasตามfloorgeometry; unchangedupdates/modeswitchreuse; expiredreloadwhenupdated; abort/revisionguard; disposebitmap/canvas; failureไม่retryวนทุกrender |
| `planning-trial-client.js` | modecontrols/statusจริงตามcompletedtiles,แหล่ง/วันที่/10msource/credit; onlinegateใช้runtime.localFileกับgeeHostedเพื่อให้productionstaticcalculatorใช้GEEได้แต่offlinefileไม่fetch |

ปุ่มGroundอยู่เหนือwrap จึงไม่กินพื้นที่canvasเดิม ไม่มีการเปลี่ยนCSSheightของpreview ภาพพื้นเป็นrecentmosaicสำหรับบริบทเท่านั้น ไม่เปลี่ยนภาพreview,AOI,readiness,ตัวคำนวณหรือคำสั่งบิน เริ่ม3Dด้วยDiagramเสมอ; เลือกSatelliteแล้วรอภาพ ผู้ใช้กลับDiagramได้ระหว่างโหลด การกลับ2Dยกเลิกrequestแต่reuseภาพที่เสร็จแล้วได้ แผน/พื้นที่เปลี่ยนยกเลิกและปล่อยภาพเก่า การหมุนไม่มีfetchหรือmapprojectionใหม่

ผลตรวจใหม่482testsผ่านรวม24regressionsใหม่ (renderer6/loader11/controller7), syntax/3buildsผ่าน; browserโหลดGEEจริงและภาพเต็มพื้น สลับโหมด/keyboardorbit/desktop440pxและmobile340px/originalAOI/390pxoverflowผ่าน ยังไม่อ้างFPSหรือความละเอียดเกินsource10m ตรวจreleaseidentity/Productionแยกในworklog

### 3.12 สถานะเผยแพร่ 3D ground modes

เผยแพร่application commit`dc4743c`บนProductionแล้ว Verceldeployment`dpl_HRWQ22Sxg1cM2b8KzrxTHVCWM1vw`READY/aliasตรงcodeและCI40488389541success Browserเว็บหลักตรวจnormalflowจนแสดงsatellitegroundReadyจริง สลับDiagram/Satelliteและkeyboardorbitได้ AOIและpreviewdimensionsไม่เปลี่ยน ไม่พบconsole errorที่ตรวจ ภาพและJSONหลักฐานอยู่ใน`output/release-check/3d-satellite-ground-2026-10-27/`

ขอบเขตนี้ใช้ภาพสีจริง10mบนพื้นราบตามพิกัด ไม่ได้สร้างcontinuous terrain/buildingsเพิ่ม ความสมจริงขึ้นกับresolution/เมฆของsource ภาพfloorและภาพreviewมีวันที่แยกกัน ไม่ใช้floorเป็นevidenceหรือreadiness ผู้ใช้เปิดขั้น3 → 3D → Ground Satelliteเพื่อใช้โหมดใหม่ กลับDiagramได้โดยรักษามุมมอง งานคิวอื่นยังไม่ได้implementเพราะreleaseนี้

### 3.13 แผนปิดงานวันนี้: บัญชีส่วนตัว + AIผลเตรียมไว้ + planner

**บันทึกแผนก่อนannotationล่าสุด:** ใช้ข้อ3.15แทนข้อกำหนดที่กล่าวถึงnormalprofile/scheduleและลำดับเดิม งานนั้นถูกผู้ใช้ตัดออกแล้ว

ผู้ใช้ยืนยันขอบเขต27ต.ค.2026: ต้องรวมบัญชีส่วนตัวและAIจากผลที่เตรียมไว้ ใช้ประมาณ4ชั่วโมงที่ผู้ใช้อยู่ดูเป็นcheckpointหลัก แผนนี้ยังไม่ได้implement ไม่เปลี่ยนสถานะคิวเป็นเสร็จเพียงเพราะมีแผน

**เส้นทางส่งมอบขั้นต่ำ:** Loginอีเมล/รหัสผ่านบัญชีที่ทีมจัดให้ → เปิดหนึ่งชุดAI/SARที่เตรียมไว้ภายในcoverageของมัน → เห็นcandidateตามพิกัด/วันที่จริง → Inspectorเลือกหรือแก้inspectionpolygon → สร้างplanด้วยprofileเดิม/เลือกHome/กรอกstartและderivedend → Saveส่วนตัว/history/reopen → ดาวน์โหลดเมื่อchecksครบ คง3ขั้นและ4calculators ทุกบัญชีเป็นInspectorและเห็นเฉพาะงานของตน

**แบ่งmodule/ownershipในการทำงานคู่ขนาน:**

- สายA: auth/session/serverroutes+durableDB/owner-scopedmission/snapshotrevisions/teamprovisioning ไม่มีGoogle/publicsignup ใช้authimplementationที่ดูแลต่อได้และตรวจcross-ownerบนserver ต้องตรวจdeploymentpathก่อน เพราะworkspaceD1/R2เดิมยังไม่ใช่hostedAPIของVercelmain และauditactorไม่ใช่ownership
- สายB: แยกaircraftsimulationdefaultsออกจากdatasourcedemo เติมnormalflowด้วยค่าที่มีอยู่; scheduleแยกuserstart/derivedend อัปเดตconditionscoverage/readiness/exportตามduration รักษาstart/reviewinvalidations และเก็บUXPrototype labelsที่ผู้ใช้เคยสั่งเอาออก
- สายC: ทำpreparedSARmanifest+mask-to-GeoJSONตามoutputaffine/NoData/CRS/threshold/hash รักษาrawcandidategeometry แต่ให้Inspectorส่งหนึ่งboundedpolygonที่plannerรองรับ เก็บresult/model/source/image/run/reviewmetadata ห้ามส่งทั้งmaskซับซ้อนเข้าplannerโดยไม่review
- Coordinatorทำclient/UI integrationจุดเดียวหลังmodulecontractsลงตัว ไม่ให้หลายสายแก้planning-trial-client.jsพร้อมกัน ภาพพื้น3D/selectedimagereviewและAIresultเป็นคนละแหล่ง ต้องแสดงวันที่/ความหมายตรงกัน

**จุดตรวจเวลา:** 0–20นาทีตรวจauth/DBพร้อมและตรึงcontracts;20–135ทำ3สายคู่ขนานพร้อมfocusedchecks;135–180รวมก่อนและปิดfeatureเพิ่ม;180–215ทดสอบflow/สองบัญชี/history/errors/mobile/suite/build;215–230ผู้ใช้ตรวจและแก้blocker;230–240releaseและตรวจProductionเมื่อได้รับคำสั่งให้เผยแพร่

**เกณฑ์จบ:** สองบัญชีแยกข้อมูลจริงทั้งAPI/ไฟล์,session/logoutทำงาน,Saveและreopenผล/ประวัติตรง,AIoverlayพิกัดตรงexportedgridและเลือกpolygonไปplannerได้,เวลาเริ่มไม่ถูกเลื่อนเองเวลาจบอิงภารกิจ,normalflowexportได้เมื่อข้อมูลครบ,missing/expiredข้อมูลยังแจ้งเหตุผล,2D/3Dและmobileไม่พัง ข้ออื่นเช่นemailselfserviceresetเต็มชุด/การแชร์หลายคน/AIภาพใหม่/Pi/รายงาน/capacityเต็มแยกอนาคตได้ แต่ทีมต้องมีวิธีจัดการบัญชีช่วงทดลองที่ใช้งานได้จริง

**เวลาเป็นประมาณการ:** auth/privateSaveทั้งชุดอาจใช้3–6ชั่วโมงแม้infraพร้อม เป้า4ชั่วโมงรวมทุกสายจึงเป็นbestcaseและมีความเสี่ยง ควรกันเพิ่ม2–4ชั่วโมงเมื่อมีprovisioning/integrationติดขัด แจ้งสาเหตุและงานที่เสร็จจริงที่checkpoint ไม่แทนprivateSaveด้วยbrowserlocalstorageหรืออ้างว่าการดูผลเก่าคือnewinference

รอบวางแผนนี้อ่านsource/queue/SARartifactsและproductionidentityเท่านั้น ไม่รันtests/inference ไม่เปลี่ยนapplication/backend/accountและไม่push/deploy ผล482testsที่กล่าวในข้อก่อนเป็นผลrelease3Dครั้งก่อน

### 3.14 การทำงานกับแชทสนับสนุนโดยมีผู้แก้เว็บจุดเดียว

ผู้ใช้ยืนยันให้แชทหลักนี้แก้websiteเท่านั้น อีกแชททำdata-preparation/review/test-design แล้วส่งกลับ ขอบเขตเขียนของsupportคือ`C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/support/` source/tests/API/DB/config/package/build/Git/releaseของwebอยู่กับmain อ่านได้แต่ไม่mutate สำหรับcanonicalMarkdownให้รักษาAGENTSด้วยappendรายการสั้นของsupportพร้อมreportreferenceและอ่านล่าสุดก่อน ไม่แก้overviewหรือstructuredqueueที่mainดูแล

**ชุดส่งมอบที่แนะนำ:** manifest.json(source/time/model/threshold/grid/NoData/hash),candidates.raw.geojson(georeferencedanalysisไม่ใช่reviewedplan),validation.json(checkผลจริง/failed/not_run),utilityscriptตรวจซ้ำ,TEST_PLAN.md(input/action/expected/assertion/evidence/status),HANDOFF.md(3parts) ห้ามทำconfidence/accuracyที่ไม่มีหลักฐานหรือแปลงrawgeometryเป็นhullเพื่อให้plannerผ่าน แชทหลักเป็นผู้ทำboundedplanningPolygonและInspectorreviewโดยคงrawsourceอ้างอิง

**เกณฑ์รับข้อมูล:** sourcehash/gridตรง,outputcropaffineถูก,NoDataไม่กลายเป็นcandidate,components/holesไม่หาย,areaในmetricCRS,polygonize/rasterizeและCRSroundtripมีmismatchcountชัด,metadataระบุpreparedresultและnewinference=false primaryตรวจซ้ำก่อนใช้ ผลเหล่านี้ไม่แทนwebsiteintegration/privacytests

**การส่งต่อ:** ให้supportส่งabsoluteHANDOFF.mdpathกับข้อสรุปพร้อม/ติด/ยังไม่รัน แล้วผู้ใช้นำpathมาให้mainอ่าน ไม่ต้องคัดลอกรายงานยาวทั้งหมด การอ่านหรือรายงานจากsupportไม่ให้สิทธิ์deployหรือแก้เว็บอัตโนมัติ และไม่ส่งข้อความระหว่างuser-ownedchatsหากผู้ใช้ยังไม่อนุญาตโดยตรง

**เวลา:** ส่งfindingsแรกประมาณ20นาที/ข้อมูล45–90นาทีเมื่อruntimeพร้อม ระหว่างนี้mainทำauth/plannerและจุดเชื่อมต่อไป รายงานsetupblockerทันที defaultPythonที่supportตรวจไม่พบgeospatialpackages จึงอาจต้องใช้environmentแยกหรือส่งschema/testdesignก่อน การช่วยงานนี้ลดdata/reviewงานซ้ำแต่ไม่ลดเกณฑ์privacy/authของแผน4ชั่วโมง

เอกสารเริ่มงาน: `SUPPORT_CHAT_BRIEF.md`, `TEST_PLAN_TEMPLATE.md`, `HANDOFF_STATUS.json` ในโฟลเดอร์แม่ดังกล่าว รอบนี้สร้างbrief/templateและอัปเดตcanonicaldocs/queue ไม่แก้application ไม่รันทดสอบหรือconversion/inference และไม่push/deploy


<!-- support-sar-handoff-2026-10-27-01a17cf8 -->
### 27 ตุลาคม 2026 17:58 น. — แชทสนับสนุนส่งชุด prepared SAR (local)

งานsupportรอบนี้เพิ่มข้อมูล/utilityนอกcheckoutเท่านั้น ไม่เปลี่ยนarchitectureหรือพฤติกรรมเว็บไซต์ ดู [HANDOFF.md](C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/support/HANDOFF.md) และ TEST_PLAN.mdข้างกัน (44กรณีdesigned_not_run) แชทหลักเป็นผู้ทำadapter/UI/review/planner/privateSaveและรันทดสอบระบบจริง

ข้อเท็จจริงสำหรับintegration: manifestเป็นproposedcontractไม่ใช่website schema; WGS84FeatureCollection14Polygonคงrawgeometry/0holesของmaskจริง ใช้EPSG32647outputcropaffineและNoData255/-9999;32offlinechecksผ่าน/native+WGS84rasterroundtripmismatch0/area1,524,800m²; coverage1valid+2NoDataregionsและcoordinate_reference.jsonพร้อมสำหรับmaptests ให้แยก60.16784%validต่อoutputgridจาก61.69944%scenefootprintต่อAOI

ต้องให้Inspectorreviewหนึ่งplanningPolygonก่อนplanner: componentใหญ่candidate-00012มี378จุดเกิน120 ห้ามauto-hull/bboxหรือเอาพื้นที่candidateใส่oilquantity คงraw/result/review/targetrevisionsแยกกัน วันภาพ9ต.ค.กับinference11ต.ค.และcontextSentinel-2เป็นคนละเวลา ไม่มีnewinferenceหรือaccuracyvalidationรอบนี้ Currentcheckpoint/inputhashesตรงแต่modelVersion/preprocessingVersionและrun-time-script-hashที่ไม่มีหลักฐานยังnull

การตรวจเว็บ/auth/privacy/browser/save/exportและdeploymentยังnot_runในsupportรอบนี้ ไม่reuseผล482testsเดิม;source/API/DB/config/package/website tests/buildไม่ถูกsupportแก้ การติดตั้งGISใช้support/.venvเท่านั้น mainตรวจhash/contract/georeferenceอีกครั้งก่อนนำเข้าและรวมสถานะoverview/queueเองตามownershipเดิม

### 3.15 แผนล่าสุดหลังannotation:3งานและInspectorแก้พื้นที่เสี่ยง

ข้อกำหนดนี้ใช้แทน3.13/3.14ในส่วนที่ขัดกัน: ตัดงานnormalflow/profile/scheduleใหม่ (ก่อนหน้า1/เดิม3) เพราะผู้ใช้ยอมรับprototypeเดิม อนุมัติimplementationล่าสุด1UX/2บัญชี/3preparedAI (ก่อนหน้า2/3/4,เดิม4/5/6) และเพิ่มriskediting ชุดSARsupportส่งแล้ว32data checks/mainhash12filesverified จึงไม่ตั้งsetup/แปลงdataเดิมเป็นงานรออีก ไม่ถือว่าการตรวจdataนี้เป็นwebsiteintegration

**ลำดับ:** auth/privateMission+UXเป็นฐาน ขณะsupportทำriskeditfixture → mainเชื่อมpreparedAI/InspectorRiskDraft/confirmedreview/planningtarget → privateSave/reopen/history → ตรวจรวมบนprototypeplannerเดิม Normalfull-export/profiledefaults/userstart-derivedendที่ถูกตัดไม่ใช่releasegate และไม่เปลี่ยนUnknown/readinessให้ผ่านเทียม

**editorภายในขั้น2:** เลือกcandidateแล้วแก้ตำแหน่ง/ลากเพิ่มลบจุด/วาดใหม่/เพิ่มพื้นที่เอง/ปฏิเสธ พร้อมUndo/Cancel/คืนรูปทรงAIของdraftและยืนยันrevision เปรียบเทียบrawAIกับInspectorlayerได้ rawresultและhashไม่เปลี่ยน reviewer/timeจากsession/server;originและcandidate/resultrefsแยกmanual/editจากML ผู้ใช้ไม่จำเป็นต้องระบุเหตุผลยาวเป็นบังคับเพื่อแก้พื้นที่

**รูปข้อมูลแยกกัน:** rawAnalysis(immutable),candidateDecisions,InspectorRiskDraft,confirmedRiskReview,planningTarget,planRevision Risklayerที่ยืนยันไม่ใช่หลักฐานน้ำมัน/ความหนา targetplannerยังหนึ่งPolygonไม่มีรู≤120จุด Raw14componentsรวมcandidate00012มี378จุดเก็บครบ ให้Inspectorวาดboundaryบินใหม่หรือreviewdraftที่ลดรูปอย่างชัดเจน ไม่hull/dropverticesเงียบ เป้าความเร็วรอบแรกใช้redrawboundary ไม่จำเป็นต้องทำautosimplifyใหม่

**lifecycle:** drafteditingล็อกuse/export;confirmใหม่invalidateplanและreadinessเดิม;cancelคืนconfirmedgeometryแต่ตรวจความสดใหม่;Savefailไม่ล้างdraft;สองแท็บใช้expectedrevisionconflictได้;review/target/sessionเปลี่ยนหลังexportrequestแล้วresponseเก่าต้องใช้ไม่ได้ การเลื่อนvertexต้องไม่ใช้setGeometryที่resetimage/scheduleทุกครั้ง แยกsearchAOI/sourceimagereviewกับrisk/targetแล้วอัปเดตขอบเขตที่ยืนยันผ่านจุดเชื่อมเดียว

**coverage:** manualareaขยายเกินMLcandidateได้ ในส่วนที่AIไม่มีvalidcoverageให้คงmanualorigin หากออกนอกภาพ/missionที่reviewไว้ต้องเพิ่มreviewพื้นที่ใหม่ก่อนplan ไม่clipเงียบหรืออ้างAIตรวจแล้ว ส่วนHomeเปลี่ยนคงAIdecisionแต่ประเมินrouteใหม่ พฤติกรรมเวลากับprofileเดิมคงไว้ตามการตัดscope

**แบ่งงาน/เวลา:** 0–20mainตรวจbackend/contractพร้อมsupportตรวจกรณีedgeจากpackageเดิม;20–100mainบัญชี/Save/UXขณะsupportทำfixturetestaddendum;100–165mainAIeditor/privatehistory/plannerintegration supportreviewreadonly;165–205mainรันprivacy/edit/reopen/stale/mobile/checks/build supportตรวจหลักฐาน;205–225ผู้ใช้ลอง+แก้blocker;225–240เอกสาร/releaseverificationตามauthorization เวลา4ชั่วโมงเป็นเป้าเมื่อinfraพร้อม ต้องทบทวนเมื่อ20นาทีถ้ายังติดauth/DB

**supportงานต่อ:** อ่าน`REVIEW_EDIT_ADDENDUM.md`ในoutputแม่แล้วเขียน`support/review-edit/HANDOFF_ADDENDUM.md`,TEST_PLAN_EDITING.md,fixtures,validationของfixture แยกจากcorepackageเดิม ทุกwebcaseยังdesigned_not_runจนmainรันจริง ไม่ต้องให้supportแก้websiteหรือmodel/threshold

รอบนี้ปรับเอกสาร/คิว/briefและอ่านตรวจhashจริงเท่านั้น ไม่มีapplicationedit/websitechecks/newinference/provisionaccountDB/pushdeploy รายการส่งมอบsupport17:58ในMarkdownคงอยู่

### 3.16 Promptขั้นแรกสำหรับแชทสนับสนุน

Promptเต็มพร้อมใช้เก็บที่`C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/PARALLEL_STEP_1_PROMPT.md` อิงขอบเขต3.15และpackageที่ส่งแล้ว ขั้นแรก=readonlyacceptance→risk-editfixtures/testdesignนอกcheckout ไม่เริ่มแก้เว็บหรือสร้างcoredataใหม่ มีreadorder/allowedwrites/forbiddenoperations/data-vs-websitecheckstatus/revisionprivacycoverage/378vertexhandling/outputacceptance/timebox/absolutehandoffformatครบ

ข้อป้องกันสำคัญ: ไม่รันหรือimportsupport/prepare_result.pyที่อาจเขียนcorepackageทับ ใช้checksumreadonlyและutilityใหม่ในsupport/review-edit/;ใช้venvเดิมก่อน;fixtureที่อ้างvalidcoverageต้องvalidateจริง;rawsourcehashต้องคงเดิม;websitecasesยังdesigned_not_runจนmainimplementและรัน บันทึกกลางsupportอ่านล่าสุดแล้วappendreferenceสั้นตามAGENTS ส่วนoverview/queueและwebsiteintegrationmainดูแล

รอบนี้เขียนprompt/queue/documentsเท่านั้น ไม่แก้application ไม่รันconversion/fixture/appchecks/inferenceหรือhashตรวจซ้ำ ไม่push/deployและไม่ส่งคำสั่งไปuser-ownedchatอื่น


<!-- support-review-edit-2026-10-27-01a17cf8 -->
### 27 ตุลาคม 2026 21:19 น. — Support ส่ง Inspector risk-edit fixtures

Supportส่ง [risk-edit HANDOFF_ADDENDUM.md](C:/mega/codex/iENA/outputs/XEDO_Parallel_Handoff_2026-10-27/support/review-edit/HANDOFF_ADDENDUM.md) และSTATE_FLOW/TEST_PLAN_EDITINGนอกcheckoutแล้ว ไม่เปลี่ยนพฤติกรรมwebในรอบsupportนี้ แนวทางraw/draft/decisions/confirmedreview/oneplanningtarget/planแยกจากsearchAOIและimagereview;ทุกschema/statefieldในfixtureเป็นproposedtestcontract Mainเทียบschemaล่าสุดเองก่อนเชื่อม

หลักฐานใหม่: readonlycore12hashตรง+22watchedfilesคงเดิม,19geometries/14scenarios,298offlineassertionsผ่าน,3invalidgeometrycoverage not_runตามนิยาม/rejectionผ่าน RE01–RE14ทั้งหมดdesigned_not_run ไม่ใช่webtests/raw378คงเดิม manualredraw4จุด10,000m²เป็นsyntheticunconfirmeddraftภายในcandidate ไม่ใช่simplifiedraw;coveragemanualvalid/mixed/NoData/outsidefootprintderiveและvalidateจากrasterจริง

จุดซ่อม/เชื่อมที่mainต้องตรวจsourceล่าสุด:clientsetGeometry:254/resetSurvey:468–473ล้างภาพ/schedule;body:221กับtrial-api:27–39resolveเดิมsurveyboundary;export:292awaitensureFreshก่อนcapture revision:293ควรมีcontextguardก่อนawaitแรก/หลังawait/ก่อนdownload รวมedit/logout/cancelABA/expiry Saveackเก่าห้ามทับdraftใหม่ ข้อเหล่านี้เป็นstaticsourcefindingsไม่ใช่browserrepro

ปลายรอบเห็นmainเพิ่มuntrackedinspector-mission-document/save schemas/examples อ่านสองschemaแบบread-onlyแล้ว พบแยกinvalidsavabledraftจากvalidatedconfirmtargetและexpectedRevision/mutationIdสอดคล้องทิศทาง แต่ยังเป็นPhase1artifactsไม่ใช่deploy/APItestผ่าน ดูsource_drift_observation.jsonและhandoff§3.7ก่อนmapping

Scopeoverride:ไม่ดึงnormalprofileหรือuserstart-derivedend/fullnormalexportgateกลับมา เก็บplanner/schedule/readinessเดิม ไม่มีweb/source/API/DB/schema/config/package/tests/buildchangesโดยsupport ไม่มีinference/Productioncalls/Git/deploy รอคำตอบผู้ใช้ไม่มี Mainรวมoverview/queueและดำเนินintegration/testing/releaseตามauthorizationเดิม

### 3.17 Phase1: backend readiness และ private mission/review contracts

**สถานะจริง:** phase1เริ่มแล้ว สร้างlocalcontractartifactsแต่hostedAuth/privateSaveยังไม่implement LiveSupabase`tstmjnlhwidwtzetqxbu`ผู้ใช้ยืนยันและแจ้งteaminvite/refreshแล้ว แต่connectorยังprojectpermissiondenied/listorganizations1ส่วนตัว/listprojects2อื่น Databasehealth/schema/authconfigของXEDOยังไม่ทราบ IABfallbackเป็นSignIn Vercelprojectmetadataอ่านได้แต่envmetadata403และไม่มีCLI localSupabase/DBconfigurationตรวจpresenceแล้วไม่พบ ไม่เปิดเผยsecret ไม่ตั้งบริการหรือเปลี่ยนสิทธิ์

**ทางเชื่อมที่เสนอ:** คงVercelstaticcalculator/GEE APIsและworkspaceD1/R2เดิม เพิ่มfirstpartyloginที่ใช้SupabaseAuthในprojectเดิมและowner-scopedprivateMissionpersistenceหลังเข้าถึงและinspectschemaจริงได้ ไม่ใช้user_metadataเป็นauthorizationและไม่ใช้servicekeyในbrowser Normaluserdatarequestsต้องตรวจauthenticatedsubjectและownerจริงทุกread/write/history/artifact และใช้RLS/appropriategrantsเป็นอีกชั้น ไฟล์preparedSARsharedcatalogคงimmutable privateedits/historyอยู่ภารกิจแต่ละคน ยังไม่applySQLหรือprovisionAuthusersในphase1

**Contractartifacts:**

| ไฟล์ | รูปข้อมูล |
| --- | --- |
| `contracts/inspector-mission-document.schema.json` | schemaVersion/title/inputMode/searchGeometry/imageSelection/analysisRef/riskDraft/planningInputs;ไม่มีowner/reviewer/authoritativeservertimeหรือreadinesssealจากclient |
| `contracts/inspector-mission-save.schema.json` | missionId nullablecreate,expectedRevision0เมื่อcreate/≥1เมื่อupdate,mutationIdUUID,intent save_draft/confirm_risk,document;confirmต้องมีplanningtargetPolygonเดียวไม่มีรู≤120vertices |
| `contracts/examples/inspector-save-draft.json` | ตัวอย่างcreate draftผูกcandidate00001และhashชุดจริง UUIDเป็นfixture ไม่มีrequestถูกส่ง |
| `contracts/examples/inspector-confirm-risk.json` | ตัวอย่างconfirmriskที่expectedRevision1และmutationIdใหม่ geometry8vertices ไม่อ้างInspectorยืนยันจริง |

Schemaเป็นขอบเขตโครงสร้าง ไม่ใช่geometrytopologyหรือauthorization Draftareasใช้ringsที่ยังไม่completeได้;confirmต้องvalidateclosure/3distinctpoints/area/selfintersection/coverage/missionlimitsและrejectedcandidate mappingจริง ไม่มีการลดrawcandidate378จุดให้ผ่านเงียบ เก็บAI/refreviewในoutermissiondocument ไม่เพิ่มtopfieldในplanning-trial-requestที่rejectunknownfields ภารกิจรวม≤1MiBและplanninginputs≤64KiBต้องenforceที่transport/runtime

**Persistenceที่กำหนดเพื่อไปimplementต่อ:**

1. mission_heads:`id,owner_id,current_revision,title,status,created_at,updated_at`
2. mission_revisions:`mission_id,revision,parent_revision,document_json,document_hash,created_by,created_at` append-onlyและตรวจownerผ่านhead
3. mutation_receipts:`owner_id,mutation_id,request_hash,mission_id,committed_revision,response_receipt` uniqueowner+mutationId
4. preparedAnalysiscatalog:resultId/manifest-candidates-coveragehash/source-time-modelmetadata immutable ไม่คัดลอกrawเป็นผลแก้ของInspector

หนึ่งtransaction:ตรวจidempotentreceiptก่อนCAS (samehashreturnreceipt/differenthash409),ตรวจowner+expectedRevision,appendrevision+advancehead+receiptพร้อมกัน createใช้servergeneratedmissionId ผูกreceiptป้องกันduplicateจากretry Confirmsealและtargetrevisionใช้missionrevisionใหม่เดียวกันและinvalidateactiveplanในtransaction Draftsaveไม่เพิ่มconfirmedreviewrevisionเดิม responseมีcommittedrevision/hash/time/actorที่serverสร้าง 404รวมunknown/foreignไม่รั่วmetadata;409สำหรับstaleownrevisionและidempotencykeyreuse เป็นcontractproposalที่ยังไม่มีendpointdeploy

**Client/sessionlifecycle:** Saveไม่สำเร็จคงdraft;retryambiguousnetworkใช้mutationId/bodyเดิม;editใหม่ใช้IDใหม่ Autosaveเรียงลำดับไม่ให้lateackAล้างdirtyB Owner/reviewerมาจากservervalidatedidentity ทุกsave/read/revision/artifactยังต้องตรวจsessionและownershipจริง Logout/revocationรวมoldaccessต้องกำหนดmechanismและtestไม่อ้างSDKgetUserลำพังว่าrevokeสำเร็จ EpochguardในUIช่วยกันlateasyncแต่ไม่แทนserverauth

**Reopenและplanner:** restoreoriginalinputs/scheduleจากsnapshotแล้วrequestimagerysession/conditions/GEE/readinessใหม่ ห้ามใช้persistedpass/readygrantExport เก็บdurablesceneId/acquiredAt/grid/hash ไม่ใช้signedtileURL/tokenเป็นidentity ระหว่างriskeditingไม่เรียกsetGeometryทุกvertexเพราะresetSurvey/schedule;แยกconfirmedtargetadapterและguardbefore/afterexportด้วยsession/mission/review/target/input/localEditEpoch คงเวลาปกติ/demo/profileตามscopeที่ผู้ใช้ตัดงานrewrite

**การตรวจรอบนี้:** JSONparse/schema-relativeRefs/2examplepayloads,sourcehash12files,raw14candidates/378vertices,positivegeometryผ่านexistingdomain+120pointlimitและbytebudgets ไม่มีfullJSONSchemaenginevalidation (ยังไม่มีvalidatorในruntimeที่ตรวจ),ไม่มีruntimeAPI/สองบัญชี/RLS/transactiontests/build/newinference Outputหลักฐาน`output/release-check/phase1-inspector-backend-2026-10-27/`ไม่ได้แปลว่าbackendพร้อม

**supportพร้อมเพิ่มแล้ว:** review-edit/HANDOFF_ADDENDUM.mdมี19geometryfixtures/14REcases;supportรายงาน298fixtureassertionsexecutedpassed ไม่มีwebsitecasesexecuted Mainอ่านส่งมอบและรักษารายการsupport21:19 ไม่แก้packageหรือรันutilityซ้ำในรอบนี้

**อ้างอิงที่ตรวจวันนี้:** [Supabase password auth](https://supabase.com/docs/guides/auth/passwords),[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),[MCP organization authorization](https://supabase.com/docs/guides/ai-tools/mcp),[team access](https://supabase.com/docs/guides/platform/access-control) การอนุญาตMCPต้องครอบคลุมองค์กรที่มีproject;membershipจริงกับorggrantของconnectorยังต้องตรวจ ไม่ขอcredentialมาแปะchatและไม่ย้ายproject/accountอัตโนมัติ

### 3.18 Supabase connector: องค์กร megaphijak และขั้นตอนให้ผู้ใช้อนุญาต

**หลักฐานใหม่ 27 ต.ค. 2026:** ภาพผู้ใช้ `codex-clipboard-7c7fbbac-e7d3-4f23-9626-dfe125d36914.png` แสดง Chrome ที่ล็อกอินแล้วบน Dashboard `tstmjnlhwidwtzetqxbu` มี breadcrumb องค์กร **megaphijak** → project **xedo** → main PRODUCTION, สถานะ Healthy และ Nano ข้อมูลนี้พิสูจน์การเข้าถึง Dashboard ใน browser ของผู้ใช้ ชื่อองค์กรและ project ref ไม่ต้องถามซ้ำ ภาพไม่ได้แสดง role หรือองค์กรที่ OAuth ของ connector อนุญาต จึงยังสรุปสาเหตุที่แน่นอนไม่ได้

ผลเครื่องมือครั้งก่อนหลังผู้ใช้แจ้ง refresh เห็น 1 องค์กรส่วนตัวและ 2 โปรเจกต์อื่น ส่วน target denied รอบอธิบายนี้ **ไม่ได้เรียกซ้ำ** และไม่ตรวจข้อมูลโปรเจกต์อื่น สาเหตุที่ต้องพิจารณาคือองค์กรที่เลือกใน OAuth หรือบัญชี/connection ที่ใช้ต่างกัน เป็นข้อสันนิษฐานที่ยังต้องพิสูจน์ ไม่ใช่หลักฐานว่าอินเทอร์เน็ตหรือฐานข้อมูลเสีย

**ระบุตัวเชื่อมต่อจากไฟล์จริง:** user config เปิด plugin `supabase@openai-curated`; manifest อ้าง `.app.json` ซึ่งระบุ app ID `asdk_app_69d3e5ee6a708191baa733f7b8931995` ตรงกับ [หน้า Supabase plugin](https://chatgpt.com/plugins/plugin_asdk_app_69d3e5ee6a708191baa733f7b8931995) ที่เปิดตรวจผ่าน IAB แล้ว หน้าเผยแพร่แสดง App: Supabase, version 1.0.0 และ Read/Write แต่ IAB อยู่ในสถานะ Log in จึงยังไม่ได้เห็นเมนู connection settings ส่วนตัวของผู้ใช้ ไม่ยืนยันชื่อปุ่ม Reconnect/Add account ที่บัญชีนั้นมีจริง และไม่ได้เปลี่ยน `.codex/config.toml` หรือสร้าง MCP server ตัวใหม่

**ขั้นตอนหลักสำหรับผู้ใช้:**

1. ใช้บัญชี ChatGPT/พื้นที่ทำงานเดียวกับแชทนี้ เปิดหน้า Supabase plugin ข้างต้น หรือ Plugins → Installed → Supabase; ถ้า client แสดง Apps ให้หา Supabase ในหน้านั้น ตามเอกสาร OpenAI
2. เปิดรายละเอียด App/การเชื่อมต่อ Supabase ของ plugin แล้วตรวจบัญชีที่ผูกอยู่ ถ้ามีปุ่มเชื่อมต่อใหม่หรือเพิ่มบัญชี ให้ใช้เพื่อเริ่ม OAuth ใหม่ ชื่อปุ่มต้องยึดหน้าที่แสดงจริง หากไม่มีปุ่มดังกล่าว ให้ตรวจภาพหน้าการเชื่อมต่อก่อนแนะนำถอด connection ห้ามสั่ง uninstall plugin หรือ revoke grant เหมารวมเพื่อเดาแก้
3. Browser ที่ OAuth เปิดขึ้นมาต้องใช้ Supabase account ที่เข้าถึง megaphijak/xedo ได้ ตรวจตัวตนในส่วน Authorizing as เพราะ browser profiles อาจล็อกอินต่างบัญชีกัน
4. ที่ Organization เลือก **megaphijak** ถ้ามีตัวเลือก Project ให้เลือก **xedo** และเทียบ ref **tstmjnlhwidwtzetqxbu**; ไม่สรุปว่าทุก client มี project selector
5. อ่าน app/client name และ Permissions requested แล้วกด Authorize ของ client ที่เริ่มเชื่อม ผู้ใช้เป็นผู้ทำการอนุญาตเอง ใช้ OAuth ปกติ ไม่ต้องส่ง PAT/API key/password ให้แชท
6. กลับมาแชทเดิมและแจ้งผล ผมจะตรวจ target organization/project ผ่าน connector อีกครั้งเมื่อมีสถานะเปลี่ยนแล้ว การขึ้น Connected หรือ Healthy เพียงอย่างเดียวไม่ใช่เกณฑ์ผ่าน ถ้า client แจ้งต้อง reload/restart จึงทำตาม ไม่รับประกันว่า restart แก้ปัญหาได้

**ทางตรวจการอนุญาตฝั่ง Supabase:** เลือกองค์กร megaphijak แล้วเข้าส่วน Organization Settings → Connections → OAuth Apps → **Authorized apps** ตาม navigation/source ทางการ บาง layout มี OAuth Apps โดยตรงใน sidebar; จุดเข้า Organization Settings จาก screenshot นี้ยังไม่ถูกกดตรวจ จึงไม่ระบุว่ารูปเฟือง project หรือปุ่มใดทำหน้าที่นั้นแน่นอน ดูรายการและสิทธิ์ที่อนุญาตให้ client ไว้ ส่วน Published apps/Add application ใช้สร้าง OAuth app ของตนเอง ไม่จำเป็นกับการเชื่อมนี้ ไม่อนุมาน URL `/org/megaphijak/apps` เพราะชื่อแสดงผลอาจไม่ใช่ slug จริง ปุ่ม Connect ในหน้า project มีหน้าที่เชื่อมบริการของ project ไม่ใช้แทนการเริ่ม OAuth ของ plugin

**ถ้าไม่พบ megaphijak หรือถูกปฏิเสธ:** ตรวจ account ในหน้า OAuth เทียบกับ browser ที่เปิด Dashboard ได้ก่อน ถ้ามี role/scope error ให้ใช้ข้อความนั้นวิเคราะห์ ไม่สั่งยกระดับเป็น Owner โดยอัตโนมัติ source ปัจจุบันมี member-bound grants ที่ไม่ต้องขอ admin เพิ่มเมื่อ role อนุญาต แต่ grant อีกประเภทอาจมีขอบเขตกว้างและเงื่อนไขต่างกัน Role จริง/grant type ของ connection นี้ยังไม่ทราบ ถ้าไม่มีเมนูอนุญาตหรือองค์กร ให้ผู้ใช้ส่งภาพเฉพาะหน้าปุ่ม/Organization/error โดยปิดข้อมูลลับ แล้วชี้ขั้นตอนจากภาพจริง ไม่ต้องวนเชื่อมใหม่หลายรอบ

**เกณฑ์กลับไปทำ backend:** connector อ่าน `tstmjnlhwidwtzetqxbu` ได้จริง แล้วจึง inspect ตาราง/Auth/config เดิมอย่างอ่านอย่างเดียว ก่อนออกแบบ migration และ private missions ต่อ การอนุญาตเครื่องมือไม่ใช่การตั้งค่า login ของผู้ใช้ Inspector และไม่ย้าย backend D1/R2 โดยอัตโนมัติ

**หลักฐานรอบนี้และข้อจำกัด:** ตรวจ Git HEAD/status, local plugin metadata ที่ไม่มี secret, ภาพผู้ใช้, official OpenAI/Supabase docs และ public plugin page เท่านั้น มี subagent ช่วยค้นเอกสารแบบ read-only ไม่มี runtime source/DB/บัญชี/role/permission/config changes ไม่มี app tests/builds ใหม่ ไม่มี commit/push/deploy ผล 482 tests เป็นรอบเผยแพร่ก่อนหน้า รอคำตอบเรื่องผล OAuth grant ของ **megaphijak** เท่านั้น ไม่ถาม URL/ชื่อองค์กร/teaminvite/refresh เดิมซ้ำ

แหล่งอ้างอิง: [OpenAI Plugins](https://learn.chatgpt.com/docs/plugins), [OpenAI app connection inspection](https://learn.chatgpt.com/docs/build-plugins), [multiple connections](https://developers.openai.com/plugins/build/auth#support-multiple-accounts), [Supabase MCP OAuth](https://supabase.com/docs/guides/ai-tools/mcp), [organization navigation source](https://github.com/supabase/supabase/blob/master/apps/studio/components/layouts/ProjectLayout/OrganizationSettingsLayout.tsx), [Authorized apps source](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Organization/OAuthApps/AuthorizedApps.tsx), [consent source](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Organization/OAuthApps/Consent/OAuthAppsAuthorizeScreen.tsx)

### 3.19 Inspector foundation: implementation ในเครื่องและ migration gate

**สถานะ:** Supabase access แก้ได้แล้ว ต้องส่ง `link_id` ของ connection **megaphijak** ตาม metadata ปัจจุบันในทุก Supabase call อ่าน target `tstmjnlhwidwtzetqxbu` ได้ ACTIVE_HEALTHY ส่วน UI/API ใหม่ยังอยู่ใน working tree เท่านั้น SQL ยังไม่ถูกใช้จริงเพราะ auto-review ปฏิเสธ live migration และต้องรอคำอนุญาตที่ระบุชุดนี้ชัดเจน [รายละเอียดชุดเปลี่ยนและ hash](INSPECTOR_MIGRATION_REVIEW.md)

**Architecture ที่เขียนแล้ว:** หน้า planner → `inspector-client.js` → same-origin `/api/v1/inspector/*` → `api/inspector.mjs` BFF → Supabase Auth / PostgREST RPC โดยใช้ user JWT กับ publishable key ไม่ใช้ service-role key URL/key public ของ xedo อยู่ใน `inspector-project.js`; environment ถ้าตั้ง URL ต้องตรง target ไม่ silently ไปอีก project Node/Vercel routes แยกจาก GEE และ calculator เดิม

**Session:** ฟอร์มอีเมล/รหัสผ่านบน XEDO ไม่มี Google/signup/role selector ทุกบัญชีที่ทีมอนุญาตเป็น Inspector Access token อยู่ใน HttpOnly cookie (`__Host-`/Secure/SameSite=Lax บนHTTPS; dev cookieเฉพาะlocalhost) ไม่ส่ง token ให้ JS/response/localStorage รุ่นแรกไม่มี refresh token ต้อง login ใหม่เมื่อหมดอายุ cookieสูงสุด1ชั่วโมง ทุก private response no-store และ mutation ต้อง Origin ตรง+JSON ตรวจ expected actor จากheaderเทียบ `/auth/v1/user` ก่อน RPC เพื่อกัน sharedcookie เปลี่ยนบัญชีอีกแท็บ ค่าheaderไม่ใช่ authorization

**Persistence ที่รอ apply:** schema xedo_private มี inspector_accounts/revoked_sessions/mission_heads/mission_revisions/mutation_receipts เปิด RLS และไม่มี direct table grants ให้anon/authenticated Public wrapperเป็นSECURITY INVOKER; private routinesที่ทำtransactionเป็นSECURITY DEFINER แบบsearch_pathว่าง/fullyqualifiedและตรวจownerเองทุกoperation ต้องมีauth.uid/session_id/JWTexp/auth.sessions.user_id+not_after/ไม่มีrevocationและอยู่team roster ยกเว้นlogoutยอมให้disabledaccountrevoke sessionของตัวเอง

Save เป็น draft-only ใช้ session advisory lock→mutation lock→receipt lookupก่อนCAS→owner/headrowlock→appendrevision+updatehead+receipt atomic ส่วนconfirm_riskยังreject untilAIvalidationพร้อม Unknown/foreignID=404,staleownrevision/idempotencyreuse=409 Requestผ่านAJV2020/formats/geometry/budgets1MiB+64KiB; DBมีshape/size/actionขั้นต่ำอีกชั้น และBFFvalidateopened documentก่อนแตะmissionปัจจุบัน

**UI/state:** My missions เปิดได้โดยไม่เปลี่ยน3ขั้นหลัก Saveไม่ต้องรอcalculationสำเร็จ มีSavecopy/ประวัติ/เปิดrevisionเก่า Retryคำขอที่ผลไม่ชัดต้องใช้mutation/bodyเดิม SaveackAไม่ล้างdirtyB ถ้าเปลี่ยนaccount/mission/editก่อนopenตอบกลับจะรักษาร่างปัจจุบัน Initialsessionmetadataรักษาdirtytracking Open/New/Logoutมีdiscardpromptเมื่อจำเป็น Requestฝั่งUIเรียงลำดับ; logoutล้างprivateUIและinvalidateasyncงานเก่า การloginใหม่บัญชีเดิมรักษาร่าง/identity ส่วนสลับคนล้างข้อมูลเก่า

**Planner restore/export:** เก็บ actual geometry/inputMode/durable scene identity/input values ไม่ใช้workspace surveyId เป็นตัวอ้างอิง private เปิดกลับคืนข้อมูลหลังvalidateทั้งหมด แล้วล้างimagerysession/reviews/readinessและขอภาพ/conditionsใหม่ ค่าความพร้อมเก่าไม่ปลดล็อกexport ตรวจ account/session ก่อนawaitแรกและก่อนdownloadอีกครั้ง พร้อมเทียบ context/revisionหลังfreshness/ผลexport คงcalculation/browserfileAPIเดิมและ profile/scheduleที่ผู้ใช้ตัดงานrewriteไปแล้ว

**การดูแลบัญชีโดยทีม:** ผู้ใช้ยืนยันยังไม่มีบัญชีทดลอง ให้เตรียมระบบก่อน ทีมสร้างSupabaseAuthuserแล้วเพิ่มuser_idในinspector_accountsผ่านadmin SQL ไม่มีการสร้างบัญชีจริงจากรอบนี้ ตรวจpublicAuthsettingsได้emailenabled=true/disable_signup=false ณ27ต.ค. provider signupยังไม่ถูกปิด แต่XEDOไม่มีsignup routeและRPCไม่ให้บัญชีนอกrosterใช้ภารกิจ ต้องตรวจนโยบายนี้ก่อนrelease ไม่ขอpasswordให้แชท

**การตรวจ:** 500testsผ่าน/syntaxผ่าน/production+workspace+portablebuildผ่าน LocalPGliteใช้PostgreSQLจริงกับfixtureauth schema/claims ทดสอบowner/history/CAS/idempotency/grants/active-session; browserใช้simulatedAuthและDBนี้ ตรวจA2revisions/stale409/logout/Bempty/Savearea24,131m²/reopen3steps4calculators/exportdisabled/mobile390ไม่overflow สิ่งนี้ไม่ใช่hostedpasswordlogin/realaccounts/realSupabaseRLS/multiconnectionconcurrency acceptance QAserver `npm run preview:inspector` เฉพาะlocalhost; หลักฐานignored `output/release-check/inspector-foundation-2026-10-27/`

**ยังเหลือก่อนนับบัญชีเสร็จ:** ขอexplicitapproval migrationตามreviewfile→applyกับtargetเดิม→ตรวจgrants/advisorsจริง→ทีมสร้างบัญชี+roster→realA/B/login/logout/privacy/concurrency/reopen acceptance→รวมUX/AIriskeditorแล้วตรวจrelease ไม่มีcommit/push/deployในรอบนี้ packageauditmoderate4ในสายdevtoolsเดิม/highcritical0 ไม่forcefixข้ามscope

### 3.20 สถานะ account ที่ชี้แจงเมื่อ 28 ตุลาคม 2026

**หัวข้อ:** ขอบเขตคำว่าเสร็จสำหรับระบบบัญชี

**สรุป:** Inspector foundation พร้อมใน working tree ที่ตรวจในเครื่องแล้ว ยังไม่ใช่ระบบบัญชีที่เปิดใช้บนเว็บไซต์จริง migration/private RPC ยังรออนุมัติและไม่มีบัญชีทดลองจริง ผู้ใช้เลือกให้ทีมสร้างภายหลัง

**รายละเอียด:** Login email/password, session/logout, My missions, Save/copy/history และการแยกเจ้าของมีโค้ดและผลทดสอบรอบ 27 ต.ค. ตาม §3.19 การยืนยันเปิดใช้งานจริงยังต้อง apply ชุด SQL ที่ตรวจแล้วบน xedo หลังอนุมัติ ตรวจ grants/advisors ให้ทีมสร้าง Auth users พร้อม roster ทดสอบด้วยบัญชีจริง A/B และเผยแพร่โค้ดตามขอบเขตที่ได้รับอนุญาต การเข้า Supabase ได้ไม่เท่ากับ application account เปิดใช้แล้ว รอบชี้แจงนี้อ่านเอกสาร/Git status และอัปเดตสอง Markdown ไม่มี source/SQL/config edit ไม่มี tests/build/browser/service verification ใหม่ และไม่มี commit/push/deploy รอคำตอบเรื่องอนุมัติ migration เดิมเท่านั้น ไม่ตีความคำถามสถานะเป็นอนุมัติ

### 3.21 Inspector database: ใช้ migration จริงและตรวจสิทธิ์ 28 ตุลาคม 2026

**หัวข้อ:** ใช้ชุดฐานข้อมูลที่ผู้ใช้อนุมัติ แล้วตรวจโครงสร้าง/สิทธิ์โดยไม่สร้างบัญชี

**สรุป:** migration **20261027184951 / xedo_inspector_foundation** อยู่ใน Supabase xedo/ref`tstmjnlhwidwtzetqxbu`แล้ว Hashไฟล์เดิมตรง **62fe9b38623b3e3b8ce4fd04ad2cbb9aace6ca8553ae817ef34e31f6cc1633d2** เกณฑ์livecatalog/body/count10กลุ่ม+negativeprobes5รวม15ผ่าน ไม่มีคำอนุมัติmigrationค้าง ไม่มีfrontend/APIreleaseหรือบัญชีจริง สถานะนี้แทนgateรอบเก่าใน3.19–3.20

**รายละเอียดโครงสร้างและสิทธิ์จริง:** schema`xedo_private`มี5tablesตาม3.19 RLSทุกตัว ไม่มีpolicyเพราะปิดdirectaccessและให้checkedRPCทำงานเท่านั้น anon/authenticatedไม่มีสิทธิ์ตาราง7แบบและcolumns4แบบ authenticatedมีschemaUSAGEไม่มีCREATE;anonไม่มีทั้งคู่ privatehelper/transactionเป็นDEFINERและpublicwrapperINVOKERทั้งหมดsearch_pathว่าง PUBLIC/anonEXECUTEfalse helperไม่ให้authenticatedเรียกตรงแต่entry/wrapperให้เรียกได้ การอ่านfunctionbodyกลับตรงSQL3ตัว ไม่พึ่งแค่ค่าRLSยืนยันownerchecks

**พฤติกรรมปฏิเสธที่รันจริง:** anonRPC42501;authenticatedไม่มีsessionPT401;directmissiontable42501;directidentityhelper42501;claimsทดสอบที่ไม่มีAuthsessionจริงPT401 ใช้transactionreadonly/localroles ไม่สร้างบัญชี/sessionหรือข้อมูลปลอมในตาราง Authusersและrowsทั้ง5tablesยัง0 ไม่มีrealpasswordLogin/A-Bownership/concurrencyacceptance ผล500tests/3builds/QAจำลองคงเป็น27ต.ค.รอบนี้ไม่รันapplicationchecksใหม่

**Advisors/งานดูแล:** Securityไม่มีWARN/ERROR มีINFO5เรื่องไม่มีRLSpolicyตรงRPC-only design จึงไม่เปิดallowpolicyเพื่อทำให้หาย PerformanceINFO unindexedFK`mission_revisions.created_by`และ`revoked_sessions.user_id`ให้พิจารณาเมื่อขยายข้อมูล อีกINFOunusedownerindexเพราะระบบใหม่ไม่มีmissions ไม่เพิ่มDDLนอกไฟล์/hashที่อนุมัติ รายละเอียดและremediationlinksอยู่ [ผลตรวจฐานข้อมูลจริง](INSPECTOR_DATABASE_VERIFICATION_2026-10-28.md) fullreceiptในoutput/release-check/inspector-live-migration-2026-10-28/verification.json

**ทีมสร้างบัญชีภายหลัง:** สร้างผ่านSupabaseAuthenticationแล้วเพิ่มAuthuserIDในinspector_accounts(enabled=true)ด้วยadmin บัญชีนอกrosterใช้privateRPCไม่ได้ ไม่ขอหรือเก็บpasswordในchat/log หลังมีบัญชีตรวจจริงA/B/login-cookie/Save/history/logout/foreignID/sessionexpiry/concurrencyก่อนนับaccountcomplete Authsignupsettingไม่เปลี่ยนรอบนี้ ค่าdisable_signup=falseเป็นผลรอบ27ต.ค.ต้องตรวจpolicyก่อนrelease ไม่มีคำถามผู้ใช้ค้างเรื่องaccountprovisioning

**ไฟล์และการเผยแพร่:** อัปเดตcanonicalสองMarkdown/queue/review เพิ่มverificationreportและsafeJSONreceiptเท่านั้น ไม่แก้source/SQL/config ไม่สร้างบัญชี ไม่commit/push/deploy คำอนุมัติDBไม่ได้ถูกใช้เป็นคำอนุมัติเผยแพร่frontendหรือทำงานนอกscope

### 3.22 Inspector account release — 28 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้อนุมัติpush/deployระบบบัญชีและตรวจLogin โดยให้ทีมสร้างบัญชีภายหลัง

**สรุป:** pushและproductiondeployแล้ว code`afac1c7f256075eb2202fdcae16102a0e34a43ca`/Vercel`dpl_635dXNArvjRDicq8WgZVmHgZZ9r8`READY CI40565947316success Fresh501tests/syntaxผ่าน 3buildsก่อนpushและCIของfixผ่าน ไม่มีDBreapply/Authsettings/accountcreation ยังไม่มีreal-account acceptance

**รายละเอียด:** ตรวจปุ่มInspectoraccount→email/passwordform→sameoriginBFF→SupabaseAuthจริงโดยnonexistentcredentialsได้generic401 UIล้างpassword หน้าLoginใช้passwordmask/required fieldsปิดด้วยX/Escapeได้ PublicAPI7กรณีผ่าน user:null200/private401/form422/crossorigin403/noorigin403/invalidlogin401/guestlogout200 ทุกresponseJSON/no-storeและclearcookieflagsถูกต้อง จึงยืนยันfunction/schema/runtime/rewriteจริง desktop1280dialog620/page1265px mobile390dialog362/page375pxไม่overflow Browsererrorlogล่าสุด[]/Vercelerrorfatal15นาทีไม่พบรายการ คง3steps/4calculators SuccessfulLogin/Save/history/cross-accountprivacyยังต้องรอAuthusers+rosterจากทีม

**ไฟล์/หลักฐาน:** savecontractdescriptionตรงmigrationที่ใช้แล้ว validation/SQLไม่เปลี่ยน เพิ่มselectedRouteและregressiontest หลักฐานoutput/release-check/inspector-account-release-2026-10-28/มีtests/buildlogs/APIJSON/desktop-error-mobilePNG/release-receipt.json เอกสารผลตรวจfollow-upอาจเปลี่ยนdeploymentSHAโดยapplicationเดิม receiptเก็บfinalidentity UX/AIriskeditorยังอยู่อีกงาน ไม่รวมreleaseนี้

**Runtime routing repair:** releaseแรกfunctionตรง200แต่publicrewrite404 แก้api/inspector.mjs selectedRouteรับVercelpathcaptureเป็นสำเนาตรงกันของendpoint ไม่ให้overridepathname/route Rejectqueryซ้ำ/ค่าขัดกัน/unknownkeys Unitregressionใหม่501ผ่านและหลังdeploypublicroute/API7/UIจริงผ่าน ปิดdefectโดยเก็บผลinitial404ไว้ ไม่ใช้directrouteผ่านแทนactualUI/API

### 3.23 เงื่อนไขก่อนผู้ทดลอง Login — 28 ตุลาคม 2026

**หัวข้อ:** แยกสถานะหน้าLoginเผยแพร่แล้วออกจากการมีบัญชีพร้อมใช้

**สรุป:** เปิดเว็บและหน้าInspectoraccountได้ แต่ต้องให้ทีมสร้างAuthuserและเพิ่มInspector rosterก่อนจึงเข้าใช้งานภารกิจส่วนตัวได้ การdeployไม่สร้างบัญชีอัตโนมัติ

**รายละเอียด:** ใช้อีเมล/รหัสผ่านของบัญชีXEDOที่ทีมจัดให้ ไม่ใช่บัญชีSupabaseDashboard ต้องมีuser_idในxedo_private.inspector_accountsและenabled=trueด้วย ไม่มีsignupUIให้ผู้ทดลองสมัครเอง คงให้ทีมสร้างภายหลังตามคำตอบเดิม รอบชี้แจงนี้อัปเดตเอกสารอย่างเดียว ไม่ตรวจบริการสดหรือรันทดสอบใหม่ ไม่แก้source/DB/config/account และไม่commit/push/deploy ไม่มีคำถามผู้ใช้ค้าง

### 3.24 GEE mission-window rejection จากเวลาอัตโนมัติเกิน24ชั่วโมง

**หัวข้อ:** ปัญหาที่รับรายงานหลังaccountrelease 28ตุลาคม2026 — วินิจฉัยแล้ว ยังไม่แก้source

**สรุป:** ผู้ใช้ยืนยันauto start27ต.ค.20:24:05.270/end30ต.ค.01:15:37.015 รวม52h51m31.745s เกินrequestlimit24h จึงตอบHTTP422ก่อนupstreamGEE ประเด็นไม่เกี่ยวกับInspectorlogin การเปิดแผนยาวเกิน24hแล้วscheduleยังreadyเป็นgapที่ต้องซ่อม ไม่เปลี่ยนrequirementprototype/profile/scheduleที่ตัดไว้

**รายละเอียดโค้ด/พฤติกรรม:** gee-mission-context.js:83กำหนดwindow≤24h/startย้อนหลัง≤5วัน/endล่วงหน้า≤7วันบนserverclock (และendไม่ก่อนstart) ทุกข้อรวมข้อความเดียว planning-context-request.js:50แสดงTIME_WINDOW Progress67%=ได้รับHTTPresponseที่stage2/3แล้วไม่ผ่านvalidation ไม่ใช่GEEcompute67%;inputไม่retry จึงattempt1/2หยุด ตัวschedulecompleteคำนวณflightduration+buffer+turnaroundsไม่ตรวจ24h ส่วนgetReadinessตรวจแค่ordering/future จึงพร้อมขัดกับAPIได้ ข้อมูลภาพacquiredAtแยกจากmissiontimes ไม่มีหลักฐานtimezonebug

**สิ่งที่พิสูจน์/ยังไม่ทราบ:** pureNodeคำนวณ190291745msและvalidator422โดยfixedclock อีกsyntheticgeneratedflightทำให้schedulewindowตรงข้อมูลนี้/readyก่อนGEErejectได้ เป็นการพิสูจน์validationgap ไม่ใช่replayactualflightresult จึงยังไม่ทราบflightduration/sorties/พื้นที่ที่ทำให้ผู้ใช้ได้52h ไม่มีfulltests/build/browser/liveGEEหรือDBchecksใหม่

**แนวทางซ่อมสำหรับรอบถัดไป:** sharedtime-windowvalidationก่อนrequest+readiness+ข้อความactualduration/limit ตรวจrouteestimateและsortiesจริง ถ้ารวมเกินให้ลดขอบเขตหรือแบ่งภารกิจ ห้ามย่อend/clampเวลาให้ผ่านแทนแผนจริง พิจารณาแยกstaticcontextจากforecastเพื่อไม่ให้ข้อจำกัดforecastบดบังterrain/landcover/qualityที่อาจใช้ได้ ต้องออกแบบและทดสอบก่อนลงมือ ไม่ถือว่าข้อเสนอถูกimplementแล้ว

**สถานะ/ไฟล์:** บันทึกknownissueในqueue.runtimeIssuesและXEDO_WORK_LOG อัปเดตเอกสารเท่านั้น ไม่แก้source/config/SQL ไม่สร้างบัญชี ไม่commit/push/deploy ไม่ถามวันเวลา/โหมดซ้ำเพราะผู้ใช้ตอบครบแล้ว

### 3.25 Surface Unknown: ไม่มี report ถูกแสดงเป็น area/Home mismatch

**หัวข้อ:** วิเคราะห์ภาพSurface model Unknownจากผู้ใช้หลังTIME_WINDOWerror

**สรุป:** มีcodepathต่อเนื่องจาก3.24โดยตรง แต่ข้อความภาพอย่างเดียวแยกไม่ได้ระหว่างreportไม่มีและreportผิดarea/Home ยืนยันtext-statebugแล้ว ยังไม่แก้source

**รายละเอียด:** planning-geospatial-uiรับerror422แล้วinvalidateล้างresponse=null current/getTerrainAssessmentส่งnullให้planning-terrain ตัวassessline21ตรวจ!requestร่วมกับgeometry/Homeต่างแล้วคืน“GEE terrain does not match the current inspection area and Home.” ส่วนreadinessStateแสดงreasons[0]ไม่ใช้GEEstate.reason หากภารกิจเดิม52hทำให้422 ภาพนี้จึงเป็นผลต่อเนื่องได้ แม้ผู้ใช้ไม่เปลี่ยนHome ไม่สรุปจากภาพว่าHomeผิดจริง

**หลักฐาน/แนวซ่อม:** freshpureNodeprobeกรณีnullreportและactualHomeต่างจริงได้unknown+ข้อความเดียวกัน ต้องแยกmissing/loading/error/staleจากactualgeometry/Home mismatch และส่งrootrequestreasonมาแสดงต่อ คงUnknown/exportlockจนมีsamplesปัจจุบันที่ใช้ได้ เพิ่มกรณี422→responsecleared→SurfaceUnknownreasonถูกต้องควบคู่actualmismatch ไม่มีfullsuite/build/browser/liveGEE/DBใหม่ รักษาเดิม3steps/4calculators ไม่ปลดreadinessเพื่อให้ผ่าน

**สถานะ:** relatedruntimeissueในqueueเป็นdiagnosed_not_implemented อัปเดตสองMarkdownตามคำสั่ง ไม่แก้source/SQL/config ไม่สร้างบัญชี ไม่commit/push/deploy ไม่มีคำถามผู้ใช้ค้าง

### 3.26 Shared mission-window limits และ Surface state repair — 28 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้อนุมัติimplementation/test/push/deployของสองissuesใน3.24–3.25

**สรุป:** แก้และเผยแพร่แล้ว code `d5ec33fbb186145440acffed718972c9b8fc8063` / deployment `dpl_8tjaooDbxEodG8kmHiE5yJfNLwac` READY / CI 40574633798 success แผนเกิน24hคงเวลาจริงและ block readiness/export GEE static context ยังโหลดได้โดยเว้น forecast สำหรับช่วงผิด SurfaceUnknownแสดง missing/loading/error/stale ตามจริงแยกจาก geometry/Home mismatch รักษา3ขั้น/4calculators

**Architecture/พฤติกรรม:** planning-time-window.jsรวมduration24hและforecastdates5วันย้อนหลัง/7วันล่วงหน้า scheduleใช้ก่อนreadyพร้อมactualduration/action;GEEserverใช้helperแต่คง422errorcontractเดิม;exportตรวจdurationหลังderiveendจากsortietotal/declaredend กันย่อendช่องกรอก Genericmanualexportไม่บังคับforecastdatesใหม่ scheduleไม่clampendและยังคงautomaticanchorหลังanalysisเดิม

**Static fallback:** geospatialmission()ประเมินunsupportedwindowแล้วส่งstartAt/endAtnullคู่กันพร้อมgeometry/Home/scene/routeเดิม Originalrawtimes+problemcodeอยู่contextkey/cacheidentityเพื่อกันlate/staleresponse Forecastถูกล้างเป็นnot_requestedพร้อมwarningและcontextpartial แสดงGFSnotrequestedอย่างชัดเจน Surfaceassessmentยังใช้samplesที่ตรวจครบตรงarea/Home/route/timestampsได้ แต่schedule/environment/exportไม่ถูกปลดล็อก

**Surface reasons:** pureassessorแยกไม่มีrequestจากactualmismatchและรับunavailableReasonภายในcontroller helperกลางใช้ทั้งrender/getter สาเหตุerrorผ่านclassifiedallowlistเดิม Readcurrentก่อนเลือกรากเหตุเพื่อให้expiry/missionchangeinvalidateก่อน การไม่มีgeometry/Home/validtoleranceหรือsampleไม่ครบยังมีreasonsเดิม ไม่แทนunknownด้วย0และไม่คงreadyจากงานเก่า

**Verificationใหม่:**73targeted/510fullsuitepassด้วยconcurrency4หลังdefaultparallelrunค้างและถูกinterrupt ไม่มีassertionลด Syntax/3buildsผ่าน LocalbrowserกับGEEจริงตรวจshortAOI52hstaticready/forecastnotrequested/blocked,normal3step+Sentinel2reviewบน18.0945km²ได้route998.11km/auto55h32m3sblockedและSurfaceReviewneededตามsamplesจริง;พื้นที่>100km²ทำ422SurfaceUnknownแสดงAREA_LIMITได้จริง ไม่ใช้ข้อความHomewrong Mobile390dialog358/page375pxไม่overflow หลักฐานoutput/release-check/time-surface-fix-2026-10-28/ ผล Production ยืนยันต่อท้ายด้านล่าง

**ขอบเขต:** ไม่มีการแบ่งภารกิจอัตโนมัติหรือบีบเวลาที่คำนวณจริง งานprofile/scheduleใหม่ที่ตัดไม่กลับมา ไม่มีDB/Auth/Pi/AI/UXimplementationอื่น ทีมสร้างtrialaccountsภายหลังเหมือนเดิม

**Production proof:** API raw52h→422 (คง server contract), static-only→200 terrain/landcover ready+forecast not_requested, current1h→200 terrain/landcover/forecast ready; HTML hash ตรง built dist และ account session200 user:null Browser normal flow กับภาพ Sentinel-2 จริงสร้าง auto55h32m3s → Blocked/endไม่ถูกย่อ/SurfaceReviewneededตามrangeจริง intentionalพื้นที่>100km²→422 แล้ว SurfaceUnknownแสดงarea-limitแทนHome-mismatch คืนพื้นที่เดิม/โหลดภาพกลับได้ Mobile390 dialog358/page375/scroll375ไม่มี overflow Browsererrorlogsล่าสุด[]; deployment-scoped error/fatal15นาทีไม่พบรายการ หลักฐาน production-*.png/production-api.json และ final release-receipt.json อยู่ evidence directory เดิม เอกสาร follow-up อาจ advance Git/deployment SHA โดย application bundle เดิม

<!-- remaining-plan-summary-2026-10-28 -->
### 3.27 แผนคงเหลือหลัง time/Surface release — 28 ตุลาคม 2026

**หัวข้อ:** สรุปสถานะงานตามคำถามผู้ใช้ ใช้เลขล่าสุด1–5เทียบเลขเดิม4–8

**สรุป:** Active3กลุ่ม:1UXที่เหลือ,2บัญชีที่เผยแพร่แล้วรอteam provisioning/real-account acceptance,3preparedAIและInspectorแก้พื้นที่เสี่ยงซึ่งยังไม่เชื่อมเว็บ Deferred2กลุ่ม:4Pi,5ผลทดลอง/รายงาน งานtime/Surfaceใน3.26ปิดแล้ว ไม่ตีความคำถามสถานะเป็นการเริ่มimplementation/publishใหม่

**รายละเอียด/เกณฑ์จบ:** UXลบป้ายPrototypeและnoteซ้ำ เก็บflow/help/buttons/empty/error/mobileโดยรักษาสามขั้น/สี่ตัวคำนวณ/2D3D บัญชีใช้โครงสร้างAuth/BFF/DBที่เผยแพร่แล้ว ทีมสร้างAuthusers+rosterก่อนตรวจsuccessful-login/logout/privateSave/open/history/A-Bprivacy/sessionexpiry/conflict AIแสดงpreparedSARพร้อมที่มา แยกimmutable raw/candidate/draft/confirmedreview/oneplanningtarget/plan revisions ให้Inspectoraccept/edit/move/add/reject/Undo/Cancel/confirm แล้วSave/reopenเป็นของเจ้าของงาน Raw378จุดเก็บครบ ให้reviewboundaryใหม่ที่ผ่านplannerlimit≤120จุด ไม่ลดrawเงียบ ไม่อ้างcandidateเป็นน้ำมันยืนยันหรือใช้แทนความหนา เปลี่ยนreview/target/sessionต้องinvalidateplan/exportที่ค้าง

**ลำดับและparallel:** mainเก็บUX→AIeditor/planner/privatepersistence→ตรวจรวม ขณะทีมสร้างบัญชี อีกแชทมีpreparedcoreและriskeditfixturesแล้ว ให้ตรวจกรณีขอบ/หลักฐานreadonlyและไม่แก้website Testsรวมบัญชี→AI→แก้พื้นที่→planner→Save/reopen/history/mobileเป็นacceptanceของสามกลุ่ม ไม่ใช่featureใหม่ ไม่รวมnormalprofile/user-start-derived-endที่ผู้ใช้ตัด ไม่เพิ่มautomaticpartitionหรือfreshAIinference/Pi/reports/capacitybenchmark

**สถานะรอบนี้:** documentation/queue updateเท่านั้น ไม่มีsource/DB/account changes ไม่มีtests/build/browser/API/GEE/liveproductionverificationใหม่ ไม่push/deploy ผล510testsและproductionREADYใน3.26เป็นรอบก่อนหน้า ไม่มีคำถามผู้ใช้ค้าง รอทีมดำเนินการสร้างบัญชีตามคำตอบเดิม กรอบ4ชั่วโมงก่อนหน้าเก็บเป็นประวัติและไม่ได้restartจากการสรุปนี้

<!-- inspector-roster-missing-2026-10-28 -->
### 3.28 Auth user มีแล้วแต่ไม่มี Inspector roster — 28 ตุลาคม 2026

**หัวข้อ:** ตรวจข้อความ Your Inspector account has not been enabled by the team หลังทีมสร้าง Auth user

**สรุป:** ยืนยันจาก live exact UID/email join ว่าบัญชีในภาพมีและ email confirmed แต่ไม่มี Inspector roster จึงถูก team-provisioning gate ไม่ใช่หลักฐาน password ผิด เตรียม one-account enablement แล้วแต่ attempted write ถูกหยุดก่อน dispatch และไม่มีเหตุผลเพิ่มเติม; post-read ยังไม่มี row จึงรอ explicit confirmation ที่ถามเพิ่มแล้ว ไม่อ้างว่าซ่อมสำเร็จ

**Behavior:** db/inspector-foundation.sql require_inspector ตรวจ auth.uid/session/expiry/revocation ก่อน exists inspector_accounts(user_id=actor,enabled=true) หากไม่มี PT403/INSPECTOR_NOT_PROVISIONED API login จะ logout upstream session เมื่อ RPC session ไม่ผ่าน และไม่ตั้ง HttpOnly cookie หลังเปิด roster ต้องให้ผู้ใช้ Sign in ใหม่ ระบบไม่มี auto-provision trigger และไม่อ่าน Auth user_metadata/role/email มาใช้แทน roster การสร้าง Auth user จึงยังไม่ครบขั้นตอน team provisioning

**Team provisioning runbook:** 1) ทีมสร้าง Auth user และยืนยันอีเมลตามขั้นตอนของทีม 2) adminตรวจ UID+email ในโปรเจกต์ xedo ให้ตรง 3) เพิ่ม xedo_private.inspector_accounts(user_id,enabled=true) เฉพาะ UIDที่อนุมัติ 4) SELECTกลับว่ามีหนึ่ง enabled row 5) ผู้ใช้ Sign in ด้วย password เดิม แล้วตรวจ session/Save/open/history เจ้าของงาน ขั้นตอน3ไม่ให้ browser/anon/authenticatedเขียนตารางเอง SQL ที่เตรียมเฉพาะบัญชีนี้อยู่ ignored output/release-check/inspector-enablement-2026-10-28/enable-requested-account.sql พร้อม guards emailconfirmed/notdeleted/notbanned ON CONFLICTแก้ enabled อย่างเดียวไม่ทับcreated_at

**Verification/ขอบเขต:** Live Auth/roster queries และ aggregated logs/advisors ใหม่ อ่าน source/readonly review ไม่ใช้ password ไม่ mint token หรือสร้าง session ไม่มี source/DDL/grants/RLS/Authsettings/deploy changes คำสั่ง DML ไม่ถูก dispatch จึงยังไม่ enabled ไม่มี successful real login/A-B acceptance/application tests/build ใหม่ Security advisor WARN leaked-password protection disabled แยกจากสาเหตุปัจจุบัน บันทึก remediation ใน work log ไม่เปลี่ยนsettingนอกscope; RLS no-policy INFO5 คง RPC-only design ไม่เพิ่ม allow policy เพื่อทำ warning หาย

**รอคำตอบ:** explicit one-account enablement confirmation จากผู้ใช้ หรือให้ทีม execute SQL เอง หลังเปิดสำเร็จต้อง post-read และให้ผู้ใช้ลอง Sign in; ไม่ถามหรือเก็บ password ในแชท

<!-- inspector-roster-enabled-2026-10-28 -->
### 3.29 เปิด Inspector roster หลังผู้ใช้อนุมัติ — 28 ตุลาคม 2026

**หัวข้อ:** ปิดปัญหา provisionขาดจาก3.28 เฉพาะบัญชีในภาพตามคำอนุญาตโดยตรง

**สรุป:** guarded one-row enablementบนxedoสำเร็จเวลา14:40น.Asia/Bangkok Post-readพบexactaccountมีหนึ่งinspector_accountsrowและenabled=true เรื่องขาดrosterแก้แล้ว/ไม่มีpermissiondecisionค้าง ยังไม่อ้างsuccessfulrealbrowserlogin

**รายละเอียด:** Pre-readยืนยันAutheligibility/ไม่มีroster; INSERT SELECTตรงUID+email+confirmed/notdeleted/notbanned→enabledtrue RETURNINGหนึ่งแถว; ON CONFLICTรักษาcreated_atแต่อัปเดตenabled ตัวuser_idเป็นPK/FKจึงไม่เพิ่มซ้ำ Verifyแยกพบroster_rows1/enabledtrue/emailconfirmedtrue/RLStrue/anonและauthenticatedไม่มีINSERTบนroster ไม่มีpassword/settings/session/token/schema/functions/grants/sourcechanges ไม่auto-enableบัญชีอื่น

**พฤติกรรมหลังแก้:** หน้าเว็บและBFFเดิมอ่านrosterจากDBตอนSign in จึงไม่ต้องbuild/deploy ผู้ใช้ต้องกดSign inใหม่ด้วยpasswordเดิม คำขอ403เก่าจะไม่เปลี่ยนเป็นsigned-inจากrefreshอย่างเดียวเพราะBFFไม่เคยsetcookieสำเร็จในattemptนั้น ไม่mintJWT/สร้างsessionแทนผู้ใช้ RealSave/history/logout/A-Bprivacyacceptanceยังต้องตรวจเมื่อมีการเข้าสู่ระบบจริง

**ไฟล์/หลักฐาน/รอบนี้:** canonical2Markdown+queueและignoredoutput/release-check/inspector-enablement-2026-10-28/verification.jsonเก็บผลก่อน/หลัง/เวลาและขอบเขต โดยไม่เผยแพร่email/UIDลงtrackedfiles ไม่มีapplicationtests/build/browser-password-loginหรือproductiondeploymentใหม่ ผลทดสอบเก่าไม่ใช่ผลรอบนี้ ไม่commit/push/deployเอกสาร ไม่มีคำถามผู้ใช้ค้าง

<!-- ux-loading-scroll-plan-2026-10-28 -->
### 3.30 แผนปิดงาน1 UX/loading/scroll — 28 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้ขอแผนละเอียดก่อนลงมือและให้แชทสนับสนุนช่วยโดยmainแก้websiteคนเดียว

**สรุป:** docs/UX_COMPLETION_PLAN.mdเป็นแผนเต็มล่าสุด1/เดิม4 มีbaseline,actionfeedback,scroll/render/lifecycle,copy/UIและacceptance พร้อมtwo-chatownershipและpromptในoutputs/XEDO_UX_Plan_2026-10-28/ ยังไม่implementหรือเผยแพร่

**Architectureที่ต้องใช้ต่อ:** existingcontrollersเป็นsourceoftruth;feedbackadapterเล็กมีoperationID/actionID/contextrevision/queued-running-terminal ไม่รื้อInspectorqueue/pendingSavemutation/owner-session-revisionguards แสดงpendingก่อนawaitแรกและเฉพาะactionที่เกี่ยวข้อง KeepGEEstage/tilecountsจริง ไม่สร้างpercentagefake Reviewcheckboxรับcheckedทันที/dialogคงเปิด แยกtextinputdebounceกับcheckbox/selectchangeหนึ่งครั้ง Withdrawreadiness/downloadทันที ไม่debounceความถูกต้อง

**Perf repairที่ต้องพิสูจน์:** แยกwheel/touchtrapกับCPUfreezeแล้วtrace baseline/afterก่อนอ้างfixed 3Dfocus/interactiongatingสอดคล้อง2D/RAFcoalescing/ไม่วาดhiddenidle;semantic invalidation หนึ่งครั้ง/cacheassessmentตามrevision+expiryไม่คงReadyเก่า;modalมีscrollowner/cleanup/pagehide-pageshowตรวจตามtrace แก้resourceleakเฉพาะที่วัดได้ ไม่รื้อarchitecture/เปลี่ยนขนาดpreviewหรือdropcoverage

**Copy/UI:** ลบvisiblePrototype/trialnoteซ้ำทุกsurfaceตามข้อกำหนดแต่คงtechnicalIDs/schema/compatibilityfiles;source/date/Unknown/partial/assumeddemo/เงื่อนไขflight-exportต้องยังชัด เสนอชื่อแสดงXEDOinspectionprofile/Fixedinspectionsettings คงUIอังกฤษเดิม ไม่เพิ่มfulltranslation

**หลักฐานใหม่:** ProductionguestnegativeSign in1ครั้งระหว่างรอaria-busytrue/submitdisabledlabelเดิม/statusempty และจบerrorได้ Airspacecheckboxเปลี่ยนReadyแต่dialogปิด/เปิดคืนจึงเห็น คืนuncheckedหลังสังเกต Mobile390settings345px/scroll0→1688/page0 shortwheelworks ไม่มีhorizontaloverflowในcaseนี้ Rootcauseของค้างหลังใช้นานยังไม่profile ไม่มี3Dgesturebenchmark/realaccountacceptanceใหม่ หลักฐานภาพและnotesอยู่UI_OBSERVATIONS.mdในoutputเดียวกัน

**Two-chat/acceptance:** mainแก้source/integration/tests/canonicaloverview-queue;supportทำinventory/copy/perfcallchain/testmatrix/readonlyreviewในoutputแยก ผลออกแบบtestsยังdesigned_not_run เป้าหมายfeedback≤100ms/localp95≤200msเป็นเกณฑ์ไม่ใช่ผลวัด repeated-use10–15minและresourcecounts/slowoffline/cancel/races/scrollownership/390-768-1280/3steps4calculators/24h-Surface-privateguardsต้องตรวจครบก่อนปิด รายละเอียดและเวลาเป็นประมาณการในแผนหลัก ไม่ส่งคำสั่งไปexternalchatอัตโนมัติ ไม่มีคำถามผู้ใช้ค้าง ไม่มีsource/DB/Auth/build/tests/perftrace/pushdeployรอบนี้


<!-- support-ux-loading-scroll-2026-10-28-01a17cf8 -->
### 28 ตุลาคม 2026 15:34 น. — Support UX/loading/scroll handoff

Source-onlysupportinventoryและmeasurement/testdesignพร้อมที่ [UX HANDOFF.md](C:/mega/codex/iENA/outputs/XEDO_UX_Parallel_2026-10-28/support/HANDOFF.md) มี34actions/136copyrows/8scroll-lifecyclegroups/64designed_not_run cases Mainใช้feedbackก่อนawaitแรกและoperation/contextownership,แยกsync-checkboxจากfollow-onasync,รักษาimmutablependingSave+session/owner/revisionguardsและGEE/tileprogressจริง ไม่มีการแก้webโดยsupport

Baseline3Dwheel/directdraw,input+changeและreadinessgettercallchainsเป็นsourcefactsไม่ใช่longfreeze/leakrootcause Mainเริ่มRAF/focusgateและInspectorfeedbackแล้ว ต้องเทียบsourcehash/diffล่าสุดและวัด10–15min/modal30/2D3D20/area-image10กับviewport/device/fixture/networkเดียวกัน คงcache/DOMdiff/cleanup/24h-Surface-pixel-privateguardsและpreviewเดิม ไม่มีperformance/browser/Auth/applicationtests/buildหรือdeploymentverificationโดยsupport ค่า100/200msเป็นtargetsไม่ใช่ผลวัด รายละเอียดsnapshot/IN_FLIGHT_REVIEW/TEST_MATRIXในoutputเดียวกัน overview/queueให้mainดูแล

<!-- ux-feedback-implementation-2026-10-28 -->
### 3.31 UX action feedback, scroll ownership และ renderer lifecycle — 28 ตุลาคม 2026

**สถานะ:** Localcandidateimplemented/524tests/3builds; finalbrowseracceptanceincomplete ห้ามอ่านว่าUXstageปิดหรือproductionเปลี่ยนแล้ว ดู docs/UX_COMPLETION_PLAN.md §3.11 และ C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/release-check/ux-2026-10-28/RESULT.json

**โครงสร้าง:** src/action-feedback.jsเก็บpresentationtokenหนึ่งcurrentoperation,begin/update/endต้องเป็นเจ้าของtoken ไม่แทนbusinessauthorization src/action-feedback.cssใช้pseudo-elementCSSspinnerพร้อมreducedmotion ไม่มีJSlooptimer Inspectorเดิมยังใช้requestchain/capturedexpectedactor/18stimeout/stateepochs/immutablependingSave; taskชั้นUIเพิ่มaction-specificpendingและกันduplicates แต่logoutsupersedeได้เพื่อclearprivateUIทันที+queuedrevocation Savedackแยกจากlistrefresherror ไม่สร้างmutationใหม่เพื่อrefreshอย่างเดียว

**Planner integration:** downloadเริ่มfeedbackก่อนawaitensureSessionและconditions,เช็คrevision+Inspectorcontextก่อน/หลังawaitและreadinessอีกครั้งก่อนdownload; finallyไม่clearnewcalculation หลังcontextเปลี่ยนคงguardsเดิม prepareและloadSurveyมีownedcleanupในresetSurvey/stopDraw Snapshotimportมีreadingstatus/duplicateguardแล้วclearfinally Settingssemanticwrapperเลือกchangeสำหรับcheckbox/radio/select และinputสำหรับtext/number Airspacecallbackคงdialog/invalidateทันที ไม่ใส่spinnerให้synccheckedเอง GEE/conditionsspinnerตามcontrollerloadingจริง ไม่ปลอมprogresspercent

**Renderer/lifecycle:** createDeployment3D(canvas,{onInteractionChange})backwardscompatible;requestDrawcoalesceหนึ่งRAF,setActive(false)cancel/release; drawข้ามhidden/zero-size/inactive ไม่มีcontinuousloop wheelรับเมื่อcanvasfocused+interactive;touchActiondefaultpan-y/Interactbutton/Escape/blurคืนpageownership Exitbuttonเก็บstateก่อนpointerblurเพื่อไม่re-enterผิด Visibilityresumeสั่งdrawใหม่ DestroycancelRAF/disconnectobserver/removeทุกlistener/คืนattrs+style pagehidepersistedรักษาcontrollers,setActivefalse;pageshowrefreshflow/conditions/GEE/readiness/new3Dตามcontext fullunloadจึงdispose+clearinterval/removevisibility คงfloorbounds/previewdimensions/mesh512trianglesและsatelliteprovenanceเดิม

**Copycompatibility:** ลบvisiblePrototype/trialcopyที่ซ้ำและตั้งtitleCoastalinspection/Localplanning/profiledisplayXEDOinspectionprofile/aboutplanner แต่มachineid xedo-prototype-01,schema xedo-planning-trial/1,filenamecompatibilityและdata-helpkeytrialคงเดิม Estimated demoยังบอกassumedinputs Source/heightreference/24h/SurfaceUnknown/partial/expiry/visiblepixels/privateownershipยังเป็นgateเดิม ไม่มีการเพิ่มAIหรือแก้เวลาจริงให้สั้นลง

**Verificationแยกชั้น:** 524unit/integrationtestsผ่านรวมrealproductionclientผ่านDOM/VMboundaryharnessและBFF/PGlite/RLS/session/revisioncases;3builds/syntax/diffผ่าน Browserlocal500ms/stageจำลองAuthเห็นauthack+listpending แต่ไม่มีreal-userpasswordlogin/productionmutation Source/fixturetestsไม่แทนactualbrowsermobile/soak วัดrendererfocused100wheel×5จาก193.3–303.9ms/100drawsเป็น0.6–1.3ms/1drawและpaint7.8–17.4ms มีstartup81mslongtaskจึงไม่อ้างไม่มีlongtaskทั้งหมด Benchmarksynthetictextureไม่ใช่ตรวจrealimageryหรือmemoryleak/fieldINP

**สิ่งที่ยังต้องพิสูจน์:** BrowserID2หลุดการเชื่อมต่อก่อนเก็บfinalresponsive/fullflow/wheel-touch/keyboard/scrollbarthumb/longsoak ไม่มีการเปลี่ยนbrowserอื่นเพื่อข้ามsurfaceที่หลุด รอผู้ใช้เปิดBrowserและแจ้งพร้อม แล้วตรวจ3steps/4calculators/2D3D/AIexistingboundary/privateSave/history/regressionบนcandidateเดิม readiness1sgettercost/resourceleakยังเป็นhypothesis ไม่มีtraceยืนยันจึงไม่เพิ่มcacheที่เสี่ยงstaleReady Mainแก้webคนเดียว Supporthandoff64casesเป็นdesigned_not_run ไม่ใช่ผลทดสอบผ่าน

**ต่อรอบได้ทันที:** C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/release-check/ux-2026-10-28/qa-server.mjsเสิร์ฟcandidateจากdist/index.htmlที่ http://127.0.0.1:5191/ พร้อมsimulatedAuth/in-memoryDB/frozenbefore;ห้ามใช้credentialsจริง/handoffเป็นproductionserver Restartต้องคงbefore.html+baseline-renderer.jsเดิม Scriptเก็บแล้วไม่ทับbaselineเมื่อrestart GEErealflowใช้preview:geospatialแยกในรอบbrowserverification ไม่มีDB/Auth mutation/commit/push/deployรอบนี้

<!-- ux-browser-resume-2026-10-28 -->
### 3.32 UX Browser acceptance หลังเปิดการเชื่อมต่อกลับ — 28 ตุลาคม 2026

**Implementationเพิ่มเติม:** InspectorมีHTMLdialog#inspector-confirmเป็นsiblingmodalของaccountpanel confirmPendingกันpromptซ้ำ/duplicateSignout,Cancelautofocus,Escape/oncloseตอบfalse,oncloseตรวจ!openก่อนfinishเพื่อไม่ให้queuedcloseเก่าทับpromptใหม่ Acceptค่อยclearaccountและใช้serializedrevocation/capturedactorเดิม ไม่bypassdraft/owner/session/revision/pendingSaveguard ภาพmobileconfirmation360pxภายในpage375ไม่ล้น Nativewindow.confirmเคยทำให้IABQApageรอจนควบคุมไม่ได้ เป็นข้อจำกัดที่พบในtool/browsercontext ไม่สรุปว่าเป็นrootcausefreezeของผู้ใช้ทั้งหมด

Plannerประกาศterminalstateเมื่อsearch/load/review/prepareล้มเหลว ไม่ปล่อยglobalstatusSearchingค้าง Downloadfinallyเลือกidlelabelตามdemoจริง;invalidateซ่อนและล้างdownloadsuccessเก่าเมื่อไม่มีactiveoperation ระหว่างactiveexportคงtoken/context/catch/finallyownershipเดิม Errorไม่ถูกล้างผิดphase เพิ่มtestsรวม531pass/0fail/0skip พร้อมsyntax/diff/3buildsใหม่

**Acceptanceที่รันจริง:** บัญชี5191simulatedAuth/realBFF/SQL:pending/Savev1v2/openv1/history/Bempty/logoutduringsave/cancel/Escape ผ่าน;normalGEE5182สิบPolygoncontextsต่างกันsearchcoveringacquisition→visibleimagereview→Prepare;30dialogs/20modecycles/10contextsใน11.15min ไม่มีobservedUIfreeze/consoleerror Canvas2/dialog6คงที่ nodes809→835→835 เป็นDOMcount ไม่ใช่heapmeasurement มีGEEsearchและgroundfailuresแล้วRetryสำเร็จ แยกprovider/networkerrorออกจากmainthreadfreezeโดยไม่เดาสาเหตุ

Responsiverequested390/768/1280มีeffectiveclient375/753/1265ตามscrollbargutterและscrollWidthเท่ากัน Settings328/706/803,readiness356/618/618ไม่ล้น Mobilemodalwheel0→1688/page0,unfocused3Dwheelpage225→945,PageDown/drag/ArrowRight/EscapeและpointerExitใช้ได้ Spacecheckboxคงdialogและwithdrawdownloadทันที Satellitegroundเป็นliveSentinel2mosaicตามเดิม;download18-itemQGCPlanผ่านUIในEstimateddemo;manual52hคงเวลาจริงและBlocked24h ไม่ใช้staticterrainReadyปลดล็อก

**Evidence/versionboundaries:** RESULT.jsonมีfinalsource/distSHA256และผล531/latest3builds browser-acceptance-resume.jsonเก็บtiming/counts/10uniquecontexts/layout/limits Screenshotfinal-*และbrowser-demo.planเป็นlocalfixture ภายหลัง11.15minrunมีcopy/confirmation-closeguard/downloadlabel/statuscleanupเล็กเพิ่มเติม แล้วตรวจtargeted/fullsuite/rebuild+finalbrowserdownload/error/mobileconfirmationซ้ำ ไม่ตีความrunก่อนหน้าเป็นtraceทุกบรรทัดของfinalbundle ไม่มีproductionreal-accountpasswordtest/DBmutation/SITL/hardware/publish

**Remainingqualification:** full-appfeedbackp95/fieldINP/physicaltouch/native-trackpad/OSreducedmotion/heap-listenercountsยังnotmeasured Airspacereviewยังinvalidate→recalculateทั้งชุด;แก้input/changeซ้ำแล้วแต่ไม่ใช่dependencyselectivecalculation Browserbfcachelogicมีunitcoverage ไม่เก็บnativeback-forwardcachetraceเพิ่ม ไม่อ้างabsenceofleaksหรือ60fpsทุกเครื่อง สิ่งเหล่านี้ระบุเป็นremainingqualification/optimization ไม่ซ่อนเป็นผ่าน UXcandidateพร้อมreviewในเครื่อง แต่ไม่markแผนทุกเกณฑ์completeหรืออ้างproductionเผยแพร่

**ต่อได้:** เปิดแท็บGEEpreview http://127.0.0.1:5182/ ไว้ในแชทและคืนviewportแล้ว MockQA5191หยุดหลังlogoutfixture อัปเดตcanonical2MD/queue/planพร้อมผลและข้อจำกัด คำถามBrowserเปิดแล้วresolved ไม่มีpendinguseranswerใหม่ ไม่มีcommit/push/deploy

<!-- ux-release-approved-2026-10-28 -->
### 3.33 UX release scope และการตรวจหลังเผยแพร่ — 28 ตุลาคม 2026

ผู้ใช้อนุมัติpush/deployเฉพาะcandidateUXตาม§3.31–3.32 ไปprojectxedo/domainxedo-eight.vercel.app Productionbranchmain/branchcodex/xedo-hardware-profileเริ่มตรง45e928e Hashsourceหลักและdistตรงlocalreceipt531tests/3builds ไม่รวมignoredQAserver/simulatedcredentials/fixtures/env ไม่มีAPI/DB/Auth/schema/package/workflowsettingschanges

Releasechecksต้องยืนยันexactGitcommit/VercelREADY+alias/CIและHTMLbytesตรงdist;ตรวจหน้าLoginpendingด้วยguestcaseที่เหมาะสมและnormal+demo/readiness/3D/mobileบนproduction พร้อมread-onlysession/GEEAPIและboundedruntimeerrorcounts ห้ามใช้simulatedaccountacceptanceเป็นreal-accountproductionlogin ผลและexactidentityจะเติมหลังเผยแพร่ ไม่รับรองphysicaltouch/no-leak/fullappINP/selectivecalcจากreleaseนี้

<!-- ux-production-release-2026-10-28 -->
### 3.34 UX Production release ที่ตรวจแล้ว — 28 ตุลาคม 2026

**Version/target:**32aa243bf3d6802947287093dc66dc775c36489a,projectxedo/prj_x35WcipWxA767cYwv3f0CXcdyea3/team_CV1O0uIz6BcarAQAOb8soV0I,Productiondpl_FmmesNCHsaCnY8MiXZrMeWoUaFTpREADY,aliasxedo-eight.vercel.app,mainCI40669324786success HTMLSHA0aa8224ec1e9d6d2dba6a764b289101336374118b47e2bc73a0c18cdae1810e4ตรงdistตามreceipt531tests/3builds Applicationchangesอยู่scopeUXเดิม ไม่มีAPI/schema/DB/Auth/providerconfigurationใหม่

**Boundariesที่verifyจริง:** BrowserLogin→BFF→Supabaseinvalidcredentialresponse→UIpendingcleanup ผ่านด้วยsyntheticnonexistentaccount ไม่มีrealpassword/sessioncreation;anonymoussession200null GEEpublicPolygonsearch12scenes→visibleimage→Prepare/route1.86kmผ่าน normalflightinputs/Homeที่ไม่ครบยังlock Download Demo→localcalculators→GEEterrain67samples→3DSatellite→airspacecheckboxmobile→QGCPlan18itemsผ่าน Sourceข้อมูลdemo/assumedยังlabelชัด NodeproductionAPIcurrentGEEpartialเพราะreferenceGFSunavailableแต่terrain/landcoverready;staticforecastnot_requested;52h422;environmentcomplete ไม่เปลี่ยนUnknownเป็นReadyเพื่อผ่านrelease

**Browser/observability:**390requestedมีpage375scroll375/dialog356scroll356ไม่ล้นและcheckboxไม่ปิดdialog InteractExitคืนpan-y/pressedfalse Consoleerrors[] Runtimeerror/fatalfilterdeployment15mคืน0groups เป็นboundedscan การเปิดpanelปิดpanelและดาวน์โหลดไม่สร้างmissionproduction ไม่ทำSITL/hardwareหรือreal-accountSaveacceptance ตัวเลข11.15min/30dialogs/20modes/10areasเป็นlocalrunเดิม ไม่เอามาอ้างproductionsoak

**Maintenance:**documentation-onlyfollow-upอาจเปลี่ยนGit/deploymentidentityแต่dist/APIcodeคงเดิม ให้ดูoutput/release-check/ux-2026-10-28/release-receipt.jsonสำหรับfinalidentityและHTTPchecksหลังเอกสารpush ไม่วนเขียนexactselfSHAกลับtrackedMD Qualification/device/perfและdependencyselectivecalcเดิมยังค้าง คงstagepartialqualificationแม้coreproductionเผยแพร่แล้ว ไม่มีpendinguseranswer

<!-- remaining-after-ux-release-2026-10-28 -->
### 3.35 งานที่เหลือหลัง UX เผยแพร่ — 28 ตุลาคม 2026

**หัวข้อ:** ลำดับทำงานต่อและขอบเขตที่ต้องตรวจรับ โดยไม่เปลี่ยนเลขอ้างอิงล่าสุด1UX/2บัญชี/3AI (เดิม4/5/6)

**สรุป:** สองงานหลักที่ยังต้องปิดคือบัญชีจริงตรวจรับและ prepared AI implementation พร้อม editable review; UX core อยู่ productionแล้ว จึงแยก qualification ที่เหลือออกจากการสร้างฟีเจอร์ใหม่

**รายละเอียด:**

1. **บัญชี ล่าสุด2/เดิม5:** Auth/BFF/UI/SQL/ownership guardsเผยแพร่แล้ว และบัญชีที่ขอมีenabled rosterแล้ว เหลือ real browser login → Save revision1/2 → reopen/history → logout/sessionexpiry และ A–Bอ่าน/แก้งานข้ามเจ้าของไม่ได้ ต้องใช้บัญชีผู้ทดลองจริงที่ทีมเตรียม การตรวจ guest invalidloginและsimulated Authเดิมไม่แทนเกณฑ์นี้ ไม่ขอให้ส่งpasswordในแชทและไม่สร้างบัญชีเพิ่มจากคำถามสถานะ
2. **AI ล่าสุด3/เดิม6:** ใช้ prepared SARเดิมไม่รันโมเดลใหม่ → overlayตามพิกัด → Inspectorรับ/แก้จุด/เพิ่ม/ปฏิเสธ/Undo/Cancel → confirm review revision → inspection polygonที่plannerรับ → Save/reopen lineageส่วนตัว เก็บ rawAIผลเดิมแยกจาก review draft/confirmed inspection geometry มี14candidatesและcandidateใหญ่สุด378vertices ขณะที่plannerรับวงเดียวไม่มีรูไม่เกิน120vertices ต้องมีvalidated adapterและให้ผู้ใช้reviewขอบเขตที่เปลี่ยน ไม่ลดรูปrawหลักฐานทับต้นฉบับหรือใช้maskเป็นหลักฐานความหนาน้ำมัน
3. **ตรวจปิดรวม/UX ล่าสุด1/เดิม4:** ทดสอบผลแก้AIเปลี่ยนแล้วinvalidateแผนเก่า การสลับบัญชี/revision/sourceล่าช้าไม่ทับงานใหม่ Save/reopenคืนreview/targetตรงรุ่น 3ขั้น/4calculators/2D3D/mobile/readiness/exportยังครบ เก็บ physicaltouch/trackpad/OSreducedmotion และfullappP95/fieldINP/heap/listenerผลเพิ่มตามแผน; dependencyselectivecalculationเป็นoptimizationที่ยังไม่ทำ ไม่อ้างไม่มีleak/ลื่นทุกเครื่องจากผลเดิม

งานPi/telemetryและผลทดลอง/รายงานก่อน–หลังพักตามเดิม profileปกติ/start-derived-endที่ตัดออกไม่เป็นreleasegate กติกาคู่ขนานคงเดิม: แชทหลักแก้เว็บ แชทสนับสนุนตรวจข้อมูล/กรณีทดสอบ/หลักฐานแบบreadonly

**หลักฐาน/ขอบเขตรอบนี้:** อ่านrepositoryและเอกสารที่HEADd899784ก่อนแก้markdown ไม่มีsource/SQL/Auth/account/config changes ไม่มีtests/build/browser/API/serviceใหม่ ไม่commit/push/deploy ผลตรวจreleaseก่อนหน้าคงเป็นประวัติ ไม่รายงานว่าเพิ่งรันใหม่ ไม่มีคำถามผู้ใช้ค้าง

<!-- ai-editor-planning-account-confirmed-2026-10-29 -->
### 3.36 แผน prepared AI/editor หลังผู้ใช้ยืนยันบัญชี — 29 ตุลาคม 2026

**หัวข้อ:** ล่าสุดข้อ3/เดิม6 ใช้บัญชี/ownership/session/Savehistoryที่เผยแพร่แล้วเป็นฐาน ผู้ใช้รายงานบัญชีตรวจได้แล้ว ไม่เริ่มบัญชีใหม่และไม่อ้างรายละเอียดการทดสอบที่ไม่ได้รายงาน

**สรุป:** แผนลงมือcanonicalที่docs/AI_INTEGRATION_PLAN.md§3.16 แบ่งAcontract/catalog→BeditableUI→Cserverconfirmation→Dplanner/save→Eacceptance คงflow3ขั้น/4ตัวคำนวณ ไม่มีinference/Pi/newnormalprofile/schedulerewriteในรอบแรก

**รายละเอียดสถาปัตยกรรม:** แยกSearchContext/immutablePreparedAnalysis/RiskDraft/ConfirmedRiskReview/PlanningTarget/PlanRevision เพิ่มOpenLayerslayersและeditorcontrollerแยกจากrouteoverlay ไม่เรียกsetGeometryทุกgestureเพราะresetSurveyและschedule รักษาภาพ/เวลาเมื่อconfirmedtargetยังมีcoverage/visiblepixelsจริงในreviewedimage ไม่ปลดreadinessด้วยflagเก่า ผลAIhistorical9ต.ค.แยกจากSentinel-2context/currentenvironment Candidate378จุดแสดงrawครบและให้วาดtargetใหม่≤120จุด ไม่clip/simplify/hullเงียบๆ manual/NoDataไม่อ้างAIพบหรือความหนาน้ำมัน

Capture/restoreต่อanalysisRef/riskDraftที่schemaมีอยู่ เพิ่มserver-ownednullableconfirmedreviewบนmissionrevisionพร้อมimmutablecatalogในprivate schema ไม่ยัดraw/rasterทุกsnapshot Catalogadapterต้องsanitizebrowsermanifestและกำหนดfunctionbundle/buildincludefilesจริง Hashsourceคงเดิม Actor/time/targethashผูกsession/server/CAS/idempotency;validategeometry/catalog/coverageที่RPCด้วยเพราะauthenticatedเรียกตรงได้ ไม่ใช้BFF-onlyconfirmedflag SpatialDBcapabilityเป็นcheckpointก่อนเลือกSQL/migration ไม่อ้างPostGISพร้อมจากการอ่านsource

Acceptanceครอบคลุมdatahash/georeference/edit/UndoRedoCancel/invalidgeometry/coverageholes/NoData/378point/Savehistory/crossowner/conflict/directRPC/lateexport/mobile/2D3D/24h/readinessเดิม แชทหลักแก้เว็บเพียงคนเดียว Supportทำgapmatrixและreadonlyevidencereviewจากfixturesเดิม ยังไม่dispatchuser-ownedchatจากturnวางแผนนี้

**การตรวจ/สถานะรอบนี้:** อ่านsource/contracts/SQL/handoffจริงและตรวจSHA256core12ไฟล์ใหม่ตรงทั้งหมด ไม่รันapplicationtests/build/browser/API/liveDB/conversion/inference ไม่แก้source/SQL/Auth/account/config ไม่commit/push/deploy อัปเดตAIplanและสองMD/queue ไม่มีproductdecisionรอคำตอบ ยังไม่ถือว่าAIเชื่อมเว็บแล้ว

### 3.37 Prepared AI/editor implementation — 29 ตุลาคม 2026 (checkpointก่อนrelease)

**หัวข้อ:** แยกriskstate/geometry/editor/overlay lifecycleออกจากsetGeometryเดิม เชื่อมprivateconfirmation/plannerโดยไม่แก้aircraftprofile/scheduleที่ตัดออก

**สรุป:** `planning-risk-state.js`เก็บimmutableAI/draft/undo64steps/selectedarea/baseReviewRevision;`planning-risk-geometry.js`ตรวจwhole-polygoncoverageด้วยscanline/holes/concavity;`planning-risk-editor.js`แยกOLsources/Modify/Translate/Drawและtransaction,CSSresponsive `planning-trial-client.js`ใช้confirmedtargetในbody/geospatialinputแทนsurveyIdเมื่อมีAI เก็บsearch/imagegeometryเดิมและtargetpixelcheckก่อนConfirm/Prepare/Export ไม่ใช้readyflagเก่า

**รายละเอียด:** InspectorAPIเพิ่มauthenticatedanalyses/resultreadและconfirm_riskผ่านRPCเดิม Docยังschema1และlegacyAI-nullเปิดได้ Draftsaveอนุญาตunfinishedsketchแต่ไม่confirm จัดserverownedreviewบนmission_revisions.confirmed_review พร้อมlatestReviewRevision/targetHash/draftHash/actor/time Catalogอยู่xedo_private.prepared_analysis_catalogไม่มีdirectgrants/RLSenabled PostGISไม่installed;ใช้boundedSQLvalidity/edgecoverage/holepredicates ส่วนbrowserแยกNoDataไม่อ้างoil/thickness/capsuledemand Hashcatalogpayloadde736b...และrawrefsเดิมคงอยู่ Modelไม่มีsemanticversionที่ยืนยันจึงอ้างcheckpointhash ไม่สร้างconfidencepercentใหม่

LocalBrowserAuthจำลอง+GEEจริงโหลด14raw→candidate→pixels→SQLconfirmv1→route112mผ่าน ชุดtestsเพิ่มครอบคลุมforgeddirectRPC/imageryidentity/decisionlinkage/geometry/CAS/history/privacy พร้อมpending/harnessguardที่กำลังเก็บ FinalqualificationและproductionUIยังรอรอบท้าย ไม่เอาผลพัฒนาแทนผลrelease

Migration+seedใช้จริงแล้วบนxedo/tstmjnlhwidwtzetqxbu ผ่านSQLdashboardเพราะconnectorใช้ไม่ได้ ผลlive-migration.jsonยืนยันcatalog1/14candidate/RLS/column/functionguardและไม่มีdirectanon/authcatalogaccess ไม่สร้างAuthuserหรือเปลี่ยนcredential DBbackwardscompatibleก่อนfrontenddeploy ไม่มีคำถามผู้ใช้ค้าง Source/UI/สองMD/queueจะเติมผลfinaltests/CI/Productionหลังตรวจเสร็จ

#### 3.37.1 Final implementation and regression

Risk transactionsเก็บrawไม่เปลี่ยนและไม่resetsearch/image/time ใช้หนึ่งselectedPolygon3–120จุดเป็นtarget Catalog14พื้นที่รวมraw378จุดแสดงครบ Targetcoverageตรวจunion/holes/concavityจริงและNoDataแยกpartial/complete/unavailable ไม่มีการสร้างconfidencepercentหรือoilvolumeจากSAR Candidateรับ/ปฏิเสธ/manualareaแยกorigin/sourceIDs UIมีModify/Translate/Draw/Undo/Redo/Cancel และGeoJSONimport เปิดผลเดิมซ้ำไม่ทิ้งร่าง

Confirm_riskผ่านauthenticatedBFFและserverRPC ทุกRPCตรงตรวจsession/owner/CAS/idempotency/analysishashes/ทุกdecisionและarealink/validtarget/footprint/imageidentityแล้วderiveactor/time/hash/reviewrevision Draftsavecarryconfirmationเฉพาะriskdraft+target+analysisตรงเดิม ไม่เชื่อclientconfirmedflag CatalogRLSไม่มีdirectanon/authgrants;helpersไม่publicexecute ไม่ติดตั้งPostGIS;boundedSQLtarget≤120จุดและboundedcatalogแทน

PlanningbodyomitssurveyIdเมื่อมีAI เพื่อไม่resolveกลับsearchAOI;geospatialไม่ขอforecastพื้นที่กว้างระหว่างdraftblocked;Confirm/Prepare/ExportตรวจvisiblepixelsภายในtargetจริงจากreviewedGEEtileและexpiry token/revision/sessionguardก่อนหลังasync Targeteditล็อกroute/exportเก่าจนconfirmใหม่ Capture/restoreเก็บdurableimageidentity,analysisRef,riskDraftและconfirmedReviewต่อrevision;ไม่เก็บtileURLหรือreadinessเก่า ภาพreloadสะดุดรักษาsavedref ส่วนภาพไม่อยู่ในsearchไม่เลือกnewestแทนเงียบๆ

inspector-clientdedupdocumentเทียบcaptureก่อนmarkdirty แต่interactionEpochแยกกันlateOpenทับgesture Saveuncertainretryคงmutation/bodyเดิม,receiptมาช้ารักษาร่างใหม่และขยับbaseReview,postcommitlistrefreshfailไม่รายงานว่าSaveล้มเหลว DirectBFF/SQLtestรวมcrossowner/forgedreview/source/image/decision/coverageholes/oldmission/expiredsession/CAS/idempotency

ผลสด:564automatedpass/0fail/0skip,syntaxและ3buildsผ่าน BrowserAuthจำลอง+realBFF/PGlite+liveGEEได้confirm→112mroute,edit/preserveimage-time/staleexportblock/UndoRedoCancel/nativeTranslateCancel/nativeDrawUndo/Savev1-v4/history/2accountisolation;mobile390ไม่แนวนอนล้น page375/panel341 คืนviewport ตรวจsavedstateหลังSavev4และreloadฉากเดิม ไม่อ้างsuccessfulrealpasswordAIflowจากlocalfixtures หลักฐานoutput/release-check/ai-2026-10-29/local-browser.json,local-mobile.png,live-migration.json และoutput/ai-tests-final.txt Publishidentity/CI/API/productionUIเติมหลังdeploy

ยังคง3steps/4calculators/2D3D/readiness/24hpolicyเดิม งานใหม่ไม่เติมaircraftprofile/schedule rewrite/Pi/training/report Fieldtestโดรน/QGC/SITL,physicaltouch/native-trackpad/heap/longsoakยังไม่อ้างผ่าน

#### 3.37.2 Published AI/editor release evidence

เผยแพร่codeb719d8edc15a926401e8c5ccbf3368a114e10553 Productiondpl_87f1XznCMD1MU4gAzVPqyyzydyAZREADY/mainaliasxedo-eight.vercel.app;CI40793396659/40793396559success ProductionHTML6197220bytes/SHA256da57bb8c6e12d66c801722065d559bec5c62f9b3d8162ea4ab9942b124bb5292ตรงbuild Guestsession200/usernull;analyseslist/detail401SESSION_REQUIRED;OpenpreparedAIareaนำguestไปLogin;browsererrors[] Demo→planner1.86km/1sortie→3DDiagram67samples→georeferencedSatellitegroundGEEreadyผ่าน ReadinessรักษาHome/airspace review ตามจริง

ผลAIauthentication/confirmationจากrealpasswordยังไม่รันในProduction;ใช้localAuthfixture+realBFF/PGlite+liveGEEทดสอบAIroute/edit/save/history/isolationและSQLnegativecasesแล้ว คงuseracceptanceAIหนึ่งภารกิจเป็นการตรวจรับ ไม่เพิ่มเป็นfeatureimplementationที่ยังไม่เริ่ม ไม่มีAuthuser/passwordchanges ไม่มีpendingproductquestion Qualificationphysicaltouch/native-trackpad/heap-longsoakยังคงแยก เอกสารfollowupเท่านั้นหลังcodecommitนี้ finaldeploymentidentityเก็บoutput/release-check/ai-2026-10-29/release-receipt.json

### 3.38 ตำแหน่งประมวลผล AI ปัจจุบัน — คำชี้แจง29ต.ค.2026

**หัวข้อ:** แยกเครื่องรันโมเดลออกจากเว็บ/API/ฐานข้อมูลและ GEE

**สรุป:** Production เป็น prepared-result integration ไม่มี online inference worker ที่รับพื้นที่ใหม่จากเว็บ โมเดล SARUNet ของผล6152a5 ประมวลผลล่วงหน้าด้วย Python/PyTorch บน CPU ในเครื่องตาม summary.json และ VALIDATION_TH.md ของชุด GEE_Colab_2026-10-11 ชื่อโฟลเดอร์ Colab ไม่ใช่หลักฐานว่ารันบน Colab cloud; validation ระบุ cloud runtime ขณะนั้นยังไม่พร้อม

**รายละเอียด:** Python runner + ข้อมูล Sentinel-1 VH/VV → ผลคะแนน/พื้นที่เสี่ยง → prepared catalog ใน Supabase → authenticated Vercel Inspector API → browser แสดง14candidate → Inspectorแก้/ยืนยัน → planner เส้นทางนี้ไม่โหลดweightsมารันในbrowser/Vercel/Supabase GEEยังจัดหาภาพและข้อมูลบริบทตามบริการเดิม แต่ไม่ได้เรียก SARUNet แทน runner เมื่อวาดพื้นที่ใหม่ ผลชุดนี้มีภาพต้นทาง9ต.ค.และการประมวลผล11ต.ค.2026 หากต้องการวิเคราะห์ภาพ/พื้นที่ใหม่อัตโนมัติ ต้องเพิ่มคิวงานและ Python inference worker เชื่อมกลับ catalog ตามแผนอนาคต ไม่ใช่พฤติกรรมที่เผยแพร่แล้ว

รอบคำชี้แจงนี้ตรวจไฟล์ต้นทางและ source ปัจจุบัน ไม่รันโมเดล ทดสอบ build หรือ deploy ใหม่ ไม่เปลี่ยน implementation queue เพราะไม่มี requirement/status ใหม่

### 3.39 แผน on-demand cloud SAR — 29 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้ต้องการเลือกพื้นที่ใหม่แล้ววิเคราะห์ผ่านเว็บ และยืนยันpilot1คน/100งานต่อเดือน/กรอบexport≤200กม² รายละเอียดเต็มอยู่CLOUD_AI_EXECUTION_PLAN.mdและAI_INTEGRATION_PLAN§3.18 เป็นrequirementใหม่เหนือpreparedresultที่เชื่อมแล้ว ยังไม่implementหรือเผยแพร่

**สรุป:** แนะนำCloudRunJobsCPU4vCPU8GiB,ครั้งละ1งาน,ปิดเมื่อจบ คงVercelAPI/SupabaseAuth-privateMissions เพิ่มdurablejobs/outbox/ownedimmutableanalysisและprivateGCS ขนาดcheckpointSARUNetจริงประมาณ1.92MiB,488561params ผลCPUเดิม2.22238s/9tilesเป็นmodelprocessingเก่า ไม่ใช่เวลารวม/cloudbenchmark CloudCPUจึงเป็นจุดเริ่มที่มีเหตุผลโดยไม่บังคับGPU ต้องวัดmemory/endtoendก่อนยืนยันสเปก

**รายละเอียดระบบ:** สั่งjobคืน202/jobIdทันที→ติดตามงานจากDB→workerค้นหาSentinel1VH/VVตามAOI/date→boundedgetDownloadURL(DATA/VALIDแยก)สำหรับgrid≤2ล้านpixels/ด้าน≤4096 หรือGCSbatchexportเมื่อจำเป็น→ตรวจgrid/unit/bands/NoData/hash→รันPythonทีละ512tile→polygonizegeoreference→เขียนprivateartifactsครบ→ลงทะเบียนownedanalysis→ใช้riskeditor/confirm/plannerเดิม ต้องถอดresultIdคงที่และขยายserverRPCownerlookup ไม่ใช้sharedcatalogสำหรับprivateanalysisใหม่โดยไม่แก้สิทธิ์ ไม่เปลี่ยนworkflowเป็นGoogleLoginหรือให้ผู้ใช้กดDriveTasksเอง

Globaljoblease/idempotency/outbox/reconciliationกันexecutionซ้ำ;CloudRunparallelism1อย่างเดียวไม่กันหลายexecutions ขอบpilotคือ1active/2pending/100jobsเดือน/30mdeadlineและboundedretryที่นับค่าใช้จ่าย ProgressแสดงstageจริงและX/Ytiles รอGEEใช้spinner/เวลาที่ผ่าน ไม่สร้างlivepercentปลอม Close/reopen/session/lateinput/cancel/NoData/0candidateต้องจัดสถานะตามจริงและprivatehistoryอยู่กับowner

**คำนวณ:** ราคาอ้างอิงus-central1 CPU4/8=$0.000088/s=$0.3168/h;100งาน×600s=$5.28ก่อนfree,$0.06เฉพาะcomputeเมื่อallowanceทั้งหมดว่าง ModalT4/L4รวม2physicalcores+8GiBที่เวลาสมมติเดียวกัน=$12.4776/$15.9576ก่อนเครดิต ตัวเลขไม่รวมGEEfees/storage/transfer/build/log/tax ไม่อ้างCPU/GPUlatencyเท่ากันหรือว่าfreecreditsมีในบัญชีจริง เสนองบสำรอง$10–15/เดือนสำหรับpilotและตรวจGEEregistration/noncommercialquotaจริงก่อนเปิดใช้ ไม่อนุมัติBillingในturnนี้

**สถานะ/หลักฐาน:** source/summary/checkpointhashและราคาจากofficialdocsตรวจใหม่;เลขคณิตและassumptionsอยู่outputs/XEDO_Cloud_AI_Plan_2026-10-29/costs.json เพิ่มstage9/current6ในqueueเป็นplanned/notauthorized คำถามปริมาณตอบแล้ว ไม่มีรอคำตอบ ไม่รันAIหรือcloudbenchmark/tests/build ไม่เปลี่ยนsource/SQL/service/Auth/config ไม่push/deployใหม่ ผล564testsและProductionREADYเป็นรอบเผยแพร่preparedAIเดิม

### 3.40 ข้อจำกัดคำยืนยัน cloud — 30 ตุลาคม 2026

**หัวข้อ:** ป้องกันการอ่านsizing/costscenarioเป็นno-crashหรือไม่มีค่าใช้จ่ายแน่นอน

**สรุป:** CloudRunJobsCPU4/8เป็นconfigurationที่เสนอ ยังไม่ผ่านbenchmarkcloud/peakRAM/endtoendของพื้นที่สูงสุด200กม² จึงไม่รับประกันไม่มีงานล้มเหลว แผนเลือกpay-as-you-goไม่ใช่subscriptionผูกมัดรายเดือน แต่ต้องมีCloudBillingและจ่ายตามการใช้งานเมื่อเกินสิทธิ์ฟรี/มีบริการอื่นคิดเงิน

**รายละเอียด:** ตัวเลขCPUเดิม2.22sไม่รวมGEE/network/coldstartหรือcloudmemory ผลคำนวณ$5.28คือตัวอย่าง100งาน×10billableนาทีไม่ใช่ราคาคงที่/สูงสุด CloudRunหยุดinstanceเมื่อRAMเกินlimitและspendcapไม่หยุดค่าใช้จ่ายได้ทันทีทุกกรณี ก่อนเปิดใช้ต้องทำmax-area benchmark,queue/globallease,timeout/boundedretry,costreservation/quota,alerts/spendcapตามที่บัญชีรองรับ และfailureUIที่เก็บdraft/missionและไม่ใช้ผลเก่าข้ามrevision

ตรวจofficialpricing/memorylimits/spendcapdocs30ต.ค.และอัปเดตสองMD/แผน/คิวเท่านั้น ไม่รันAI/cloudbenchmark/applicationtests/build ไม่แก้application/SQL/service/Auth ไม่เปิดBillingหรือsubscription ไม่push/deployใหม่ คำถามผู้ใช้ไม่ถือเป็นการอนุมัติสร้างทรัพยากรเสียเงิน

### 3.41 Google Cloud/GEE readiness และ CPU preparation — 30 ตุลาคม 2026

**หัวข้อ:** ตรวจบริการจริงและเตรียมCPUtestตามคำสั่งล่าสุด โดยยังไม่เปิดBilling/paidresources/subscriptionเพราะผู้ใช้ยังไม่ได้จัดงบเดือนนี้

**สรุป:** configเว็บอ้างtest-01-494520,credentialprojectตรงกันและauthอ่านmetadataสำเร็จ GEEAPIENABLED/registrationREGISTERED_NOT_COMMERCIALLY ConsoleยืนยันCommunityTier/eligibilityexpireFeb10,2028/monthlyusage0.87% Billingconsoleยืนยันprojectไม่มีBillinglinked Run/CloudBuild/ArtifactRegistryAPIDISABLED ดังนั้นCloudRunจริงยังไม่เริ่ม เพราะแม้ตั้งใจใช้freeallowanceก็ต้องมีBillingตามprerequisite ไม่กดFreeTrialหรือlinkaccount

**รายละเอียด trust/evidence:** Project/Billingcontrol-planeGETตอบ403SERVICE_DISABLED เป็นข้อจำกัดAPIreadไม่ใช่หลักฐานว่าไม่มีBilling จึงอ่านconsoleต่อและเก็บหลักฐานunlinkedแยก ใช้เฉพาะOAuthauthentication+GETmetadata ไม่มีvalue:compute/computePixels/export/mapcreation/APIenable/IAMgrant Token/keyไม่ลงไฟล์หรือtooloutput GEEregistration/tierที่ยืนยันได้ไม่ใช่การรับประกันโควตารองรับ100analysisใหม่โดยไม่วัดEECUต่อjob

**CPUในเครื่อง:** tmp/gee-colab-venvมีdepsที่ตรงbaselineพร้อม ไม่ต้องinstall;Pythonหลักขาดชุดนี้ DockerCLIมีแต่daemonไม่พร้อม/gcloudไม่พบ จึงยังไม่buildcontainer พบhostRyzen7 8845HS/16logicalprocessors/RAM15.26GiBเพียงmetadata ไม่ใช้แทนcloudbenchmark เตรียมbenchmark_cpu.pyที่defaultdry-run,CPUbatch1,threads2/4,coldfreshprocess/warmreuse,peakworking-set/RSS,timeout/ผลhashและcache-tempจำกัดoutput Rootรันdry-runผ่าน6hashes/readytrue/inferencefalse ยังไม่โหลดweights/รันโมเดล

ภาพจริงที่ผูกmanifestคือ1317×1340/176.478กม²/9tiles;case10/100/200กม²ใหม่ยังไม่ได้รับ ไม่resizeภาพเดิมแล้วอ้างพื้นที่ใหม่ Localthreadconfigไม่เป็นhardlimit4vCPU8GiBและไม่วัดGEE/cloudcoldstart Scopeเตรียมครบแต่ไม่มีผลประสิทธิภาพcloudใหม่

**รายงานและสถานะ:** outputs/XEDO_CPU_Readiness_2026-10-30/READINESS_REPORT.md,cloud-metadata.json,evidence2JSON/2ภาพ,local-resources.json,preparation/README+manifest+harness+dry-runreceipt คิวstage9เพิ่มreadiness/preparationapprovedและno-spendconstraint;ยังไม่อนุมัติfullimplementation/paidexecution/publication ไม่เปลี่ยนwebsite/SQL/Auth/config ไม่push/deploy การทำCPUlocalจากไฟล์เดิมเป็นทางเดินที่ไม่ต้องสมัครบริการในเดือนนี้ แต่ยังไม่executeinferenceในรอบเตรียม

### 3.42 Local CPU benchmark จริงและผลต่อการเชื่อมเว็บไซต์ — 30 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้สั่งรันCPUกับภาพเดิม วัดเวลา/RAMและเทียบผล โดยไม่เปิดBilling/subscription/paidcloud รอบนี้จึงเปลี่ยนสถานะจากpreparedเป็นlocalexecuted ไม่ใช่เปิดonlineinference

**สรุป:** รันสำเร็จ8processes/16passes (threads2/4,ชุดละcold3+warm5) ด้วยPython3.11.9/torch2.14.1+cpuในvenvเดิม Ryzen7 8845HS/16logicalprocessors/15.26GiBhostRAM Batch1,float32,interop1,9tiles512²,thresholdscore>=0.3 ภาพเดิม1317×1340/176.478กม²/valid106.183กม² ผลทั้ง16ตรงbaselineทุกพิกเซลและTIFFhashตรงด้วย

| Metric | 2 threads | 4 threads |
|---|---:|---:|
| Fresh-process wall median3รอบ รวมimports/load/preview/result/hash (s) |12.430|12.242|
| Cold runner processing median3รอบ (s) |2.991|2.350|
| Warm reuse processing medianรอบ2–5 (s) |3.183|2.297|
| Warm reuse รวมpreview/return files medianรอบ2–5 (s) |4.991|4.171|
| Cold native RAM peak สูงสุด3processes (MiB) |670.699|671.844|
| Warm native RAM peak ทั้งworker5passes (MiB) |875.977|891.297|

**Measurement contract:** parentใช้perf_counterวัดเต็มfreshprocess;workerแยกdependencyimport/runnerimport/modelload/runnerprocessing/run_inferenceรวมpreview Rawsummaryprocessingเริ่มหลังload/validateและจบก่อนpreview จึงเป็นscopeเดียวที่ควรเทียบhistorical2.22238s Warmรอบแรกแยกจากreuse2–5 มีเพียงn4;ไม่ประมาณP95/SLA Coldยังใช้OSfilecacheและไม่จำลองcloudcontainer Nativepeakworking-setผ่านpsutilบนWindowsรวมimports/load/ทุกpass;sampledRSS50msเริ่มหลังloadและอาจพลาดspike RAMไม่ใช่ขนาดcheckpointหรือRAMทั้งเครื่อง Warmpeak0.8704GiBสูงกว่าcoldแต่5passesไม่พิสูจน์long-runstabilityหรือmemoryleak

**Reproducibility contract:** ใช้immutableDATA/VALID/METADATA/checkpoint/runner/baselinesummaryเดิม ตรวจ6SHA256ก่อนและหลังรันweights_onlyload Outputทุกpassแยกfolderใหม่ไม่ทับbaseline เปรียบเทียบwindowedTIFFครบ16filesetsหลังtimingจบ ตรวจscore/mask/CRS/transform/dtype/NoData/GDALmask/inputVALID:valid1,061,830/NoData702,950/candidate15,248,scoremaxabs/MAE/RMSE0,maskdiff0 IoU/Dice1กับผลโมเดลเก่าไม่ใช่accuracyหน้างาน Comparatorผ่าน5failure-gateselfchecks

**ผลต่อarchitecture:** CPU4threadsเป็นฐานlocalที่ใช้งานต่อได้จากภาพนี้ ไม่มีเหตุซื้อGPUในรอบนี้ การทดลอง2GiBsingleworkerเป็นข้อเสนอเผื่อnativepeakที่พบเกิน512MiBและใกล้1GiB ต้องวัดภายใต้hardlimitจริงก่อนรับรองสเปกcloud ไม่ปรับcostscenario4/8เดิมเป็นบิลใหม่จากเวลาlocal ขาดGEEsearch/export/download/network/cloudstartup/vectorization/upload/catalogregistration/UIlatency จึงยังไม่ใช่เวลาที่ผู้ใช้กดAnalyzeจนได้ผล

เว็บProductionยังคงpreparedSAR/editor/privateconfirm/plannerเดิม โมเดลที่รันรอบนี้ทำงานofflineในเครื่อง ไม่ได้ต่อendpoint/queue/workerหรือทะเบียนresultใหม่เข้าสู่Production การเลือกพื้นที่ใหม่แล้วAnalyzeยังต้องimplementตามCLOUD_AI_EXECUTION_PLAN ไม่มีการเปลี่ยน3steps/4calculators/account/SQL/permission/schedule/readinessในรอบนี้

**Evidence/repair handoff:** รายงานละเอียดoutputs/XEDO_CPU_Benchmark_2026-10-30/CPU_BENCHMARK_REPORT.md;metrics-summary.jsonพร้อมpostrunhash;measurements.csvราย16passes;comparison/comparison-report.jsonและ5caseselfcheck Rawreceiptอยู่outputs/XEDO_CPU_Readiness_2026-10-30/preparation/runs/20261030T055818Z_7c53fb88/benchmark-receipt.json ถ้าทำซ้ำใช้venvเดิมกับbenchmark_cpu.py--execute-localตามrunbook ห้ามนำdry-runreceiptเก่ามาแทนผลจริงหรือใช้localthreadsอ้างcloudvCPUisolation

รอบนี้มีlocalinference/compare/aggregation/hash/docJSONdiffverificationจริง ไม่รันwebtests/build/browser/APIใหม่ ไม่เปิดBilling/subscription/API/paidresources และไม่commit/push/deploy ไม่มีคำถามค้างและไม่ต้องขอให้ผู้ใช้เปิดBillingสำหรับlocalpathนี้

### 3.43 แผน website→local CPU→ผล AI ของพื้นที่ใหม่ — 30 ตุลาคม 2026

**หัวข้อ:** แนวทางเริ่มต้นข้อ6/เดิม9เป็นlocalCPUตามLOCAL_CPU_AI_INTEGRATION_PLAN.md แทนการเปิดcloudworkerเดือนนี้ ไม่เปิดBilling/subscriptionหรือpaidresource รอบนี้เป็นแผนไม่ใช่implementation

**สรุปarchitecture:** BrowserInspector→same-originVercelBFF→durableownedjobsในSupabase เครื่องWindowsดึงงานออกผ่านHTTPSRPC→GEEautomaticdownloadหนึ่งSentinel1scene→CPU4threads/batch1/float32/threshold0.3→reusablepolygonization/coverage→immutableownedresult+privatepreview→riskeditor/confirm/planner/privatehistoryเดิม คง3steps/4calculators ไม่ต้องเปิดpublicport/localhostfrombrowser/tunnel/CloudRun/cron

**Transport/trust:** DedicatedmachineAuthidentityไม่อยู่Inspectorrosterและมีprivateworkerregistryผูกowner ไม่เพิ่มroleของผู้ใช้ ไม่ส่งservice_roleหรือInspectorpasswordไปเครื่อง Claimตรวจidentity/queueavailabilityแล้วจัดleaseatomic;writesหลังclaimตรวจlease/fence/currentattempt/cancel/deadline/session/ownerในDBแม้เรียกRPCตรง Workerเป็นtrustedproducer ไม่ใช่proofว่าserverรันโมเดลเอง ResultanalysisRefใหม่serverderiveจากcanonicalcatalogJSONตามsealversionใหม่ เก็บprepared-filehashsemanticsเดิม LocalTIFFhashเป็นproducer-reportedและไม่อ้างverifiedbytehashเมื่อserverไม่อ่านไฟล์

**Persistence:** analysis_jobs/attempts/owned_analysis_results/worker_registryอยู่privateสอดคล้องRLSและexplicitfunctiongrants ไม่มีdirecttableaccessสำหรับผู้ใช้/เครื่อง ผลreviewcatalogpersistentและpreview≤512KiBในprivateStorageเดิมเมื่อquotaผ่าน RawTIFF/metadata/runmanifestเต็มอยู่localและไม่ถูกpublishpublic Uploadpathผูกowner/job/attempt;machineเป็นuploaderจึงต้องStoragepolicyอิงpublishedresultowner ไม่ใช้uploaderUIDแทนInspector Smallresultที่publishแล้วเปิดย้อนหลังได้ตอนเครื่องดับ ส่วนTIFFdownloadเต็มยังต้องเครื่อง/ช่องทางที่อนุมัติ

**Pipeline/limits:** defaultค้นย้อนหลัง30วันและเลือกsingleCOPERNICUS/S1_GRD IW10m/VH+VVตามcoverage ไม่multi-date-mosaic ใช้getDownloadURLแยกDATAfloat32[VH,VV]Sigma0dB/VALIDuint8บนnativeCRS/affineเดียวกันพร้อมmetadata ไม่logdBซ้ำ/resize/regrid Wrapperenforcewidth×height≤2Mpx/dimension≤4096/gridrectangle≤200กม²ก่อนและหลังdownload เพราะrunnerเดิมmax100Mpx Geometry4connected/holes/components/alwaysxy/roundtrip0mismatchตามวิธีsupportที่ตรวจแล้วแต่ต้องextractmoduleไม่พึ่งbaselineconstants

ตรวจruntime metadataรอบนี้พบearthengine-api/pyproj/shapelyยังไม่ติดตั้งในbenchmarkvenv จึงต้องสร้างenvironmentworkerแยก/pinและregressionก่อนต่อของจริง ไม่เปลี่ยนvenvเดิมในรอบวางแผน Candidate256/document1MiB/target≤120จุดยังคง;เสนอcatalog512KiB/rawvertices8192/preview512KiBเป็นcapsที่ต้องqualify Rawvalidationแยกจากtargetvalidator เกินcapให้complexityfailureพร้อมrawlocalไม่simplify/truncateเงียบ ๆ

**UI/lifecycle:** เพิ่มAnalyzearea/workerpresenceและjobprogressในflowเดิม SelectedRouteในapi/inspector.mjsยังไม่รับhyphenfirstsegment ต้องเพิ่มboundedrouteallowlistและrewrite/querytestsไม่เพียงdispatchbranch Workerofflineให้เปิดโปรแกรมก่อนsubmit;หลุดระหว่างงานแสดงwaiting/recoveringตามlease ไม่มีinfinitebusy GEEแสดงstage/elapsed/bytesที่รู้จริง CPUแสดงX/Ytiles;DBcommitสำเร็จจึงReady Browserรับผลเฉพาะaccount/jobId/AOIhash/inputRevisionตรง มิฉะนั้นอยู่history ไม่ทับdraftใหม่หรือconfirmationเดิมเมื่อjobใหม่failed

S1sarSourceและS2contextImageเก็บแยกตามsourceจริง Targetยังต้องอยู่searchAOI/reviewedimage/analysisfootprintตามSQLเดิม และSARvalidcoveragecomplete/partial_or_unavailableแสดงต่างหาก ไม่เพิ่มfull-validgateโดยอ้างพฤติกรรมเดิม Raw→Inspectordraft→confirmedtarget≤120จุด→planner/readiness/visiblepixels/24hยังคง

**งบ/acceptance:** ใช้localcomputeกับexistingfreeentitlementsโดยตรวจactualquotaก่อนpilot จำกัด1active/2pending/100logicaljobsเดือน/deadline30m/boundedretry และbyte-reservationสำหรับผลเล็ก SupabaseเพดานFree500MBDB/1GBstorage/5GBegressเป็นofficialplanไม่ใช่remainingจริง;ต้นทุนไฟฟ้า/เน็ตและquotaGEEยังมีข้อจำกัด ไม่มีautomaticupgradeหรือpaidfallback แผนเต็มมี7milestonesและdesigned_not_runสำหรับrealnewAOI/noSAR/NoData/complexity/offline/sleep/retry/lease/cancel/latejob/auth/Storage/privacy/edit/planner/regression/quotas

**สถานะรอบนี้:** source/officialdocs/package metadata/เลขคณิต/documentJSONdiffchecksและread-onlyhelperreviewเท่านั้น ไม่รันinference/GEEcompute/benchmark/webtests/build/browser/liveDB/Storagequota ไม่install/provision/Authmachine/bucket/SQL/configchange ไม่commit/push/deploy ไม่มีคำถามค้าง คิวlocalplanonlyและclouddeferred;implementation/releaseต้องอิงคำสั่งถัดไป

### 3.44 Local CPU implementation ขั้น1–2 — 30 ตุลาคม 2026

**หัวข้อ:** Localpipelineใหม่ทำงานจริงแล้วในworkers/local-ai ไม่ใช่การเปิดonlineAnalyzeบนเว็บไซต์ ขอบเขตผู้ใช้อนุญาตreadiness/automaticinput/CPU/package/testsเท่านั้น คงเว็บเดิม3steps/4calculatorsและไม่push/deploy

**Architecture/ไฟล์:** common.pyกำหนดAOI/grid/hash/configcontracts;acquisition.pyค้นหนึ่งCOPERNICUS/S1_GRD/IW10m/VH+VVตามcoverage→latest→asset tie-breakและอ่านGEO_TIFFด้วยcomputePixels;vendor/gee_sar_inference.pyเป็นสำเนาbyte-identicalSHA1eaada...ของauditedengine;pipeline.pyทำCLI/doctor/stages/CPU4threadsและreceipt/RAM;package_result.pyตรวจหลักฐานและสร้างunreviewedlocalcatalog;setup-local-ai.ps1/run-local-ai.ps1/README/lockfile/tests/examplesใช้ทำซ้ำ ไม่มีHTTPserver/workerregistry/queue/DBpublishในขั้นนี้

**GEE/permissions:** LivegetDownloadURLdevelopmentrequestถูกปฏิเสธearthengine.thumbnails.create จึงใช้computePixelsพร้อมcrsCode/dimensions/affine6coefficients/bandIdsบนnativecropเดิม ผ่านpermissionearthengine.computations.createที่มีอยู่ ไม่เพิ่มIAM/enableAPI/Billingหรือสร้างthumbnail/export/Drive/GCSresource CurrentprojectconfigยืนยันREGISTERED_NOT_COMMERCIALLY Source/newrequestเก็บscene/acquisition/orbit/date/grid/model/recipeและinputhashครบ ไม่มีsignedURL/token/keyในlogs

**Inputcontract:** จำกัดexportrectangle≤2Mpx/แต่ละด้าน≤4096/พื้นที่≤200กม²ก่อนและหลังอ่านไฟล์ Preservefloat32[VH,VV]Sigma0dB,VALIDuint8,sourcebasisกับintegercropoffset ValidateCRS/affine/dtype/bands/scales1/offset0/NoData/VALID/finiteก่อนโมเดล ต้นฉบับinvalidNaNบางช่องถูกcanonical-9999ในระบบใหม่เฉพาะVALID0;validvalues/VALIDไม่เปลี่ยน ไม่logdBซ้ำ/resizeหรือแทนข้อมูลขาดด้วยvalid0

**Output/geometry:** scorefloat32NoData-9999/maskuint8NoData255/preview/summary/source_metadata พร้อมlocal-manifest,analysis.local.jsonและrawcandidate/coverageGeoJSON ตรวจsummarygridกับactualTIFF/GDALmask/numericnodata/counts/threshold Polygonize4connectedรักษารูและทุกcomponent Serializefullprecisionแล้วrasterizeกลับต้องmismatch0 OutputgridfootprintแยกAOI/scene/validcoverage ใช้denseAOIกับครึ่งpixel-diagonalbufferเพื่อบันทึกGEE/GDALboundaryfringe ไม่clipหรืออ้างstrictcentrecontainmentเกินจริง จำกัดcomponents256/vertices8192/ringpoints4097/rings64/JSON512KiB เกินแล้วfailureชัดเจนรักษาTIFFเต็ม

**Readinessที่ไม่เพิ่มค่าใช้จ่าย:** overlayvenvใหม่tmp/local-ai-worker-venvอ่านbenchmarkpackagesผ่าน.pthไม่แก้envเดิม เพิ่มEarthEngine1.7.50/Shapely2.2.0/Setuptools78.1.0และpinfreeze;pipcheckผ่าน pyprojไม่จำเป็น Vendor/checkpointและ6originalhashesคงเดิม SupabaseChromeอ่านจริงFree/HealthyNano/DB25.5MB allowance0.5GB/project/Storage0of1GB/egress0of5GBตามrounded-delayedUI ไม่มีbucketพร้อมใช้และยังไม่สร้างหรือทดสอบสิทธิ์upload/RLS (futurephase) localขั้นนี้ไม่อัปโหลดขึ้นเว็บ

**ผลสด:** smallnewAOI5.0172กม²18.47s/CPU0.336s/peak508.92MiB และfinalnewAOI197.5274กม²31.11s/CPU4.041s/peak725.95MiBใช้SAR26ต.ค.ได้0candidateตามโมเดล Finalbaselinedownload176.478กม²27.94s/CPU3.031s/peak721.52MiBได้14components/15,248candidatepixelsและscore/maskpixel+TIFFhashตรงbaseline9ต.ค.ทุกค่า Replay/progress10.72s/CPU2.711sยืนยัน9/9callbackก่อนpackaging ValidinputVH/VV/VALIDตรงเดิมทั้งหมด ต่าง59,550invalidbandvaluesเพราะoriginalNaN→-9999เท่านั้น เป็นper-runobservationไม่ใช่P95/SLA/fieldaccuracyหรือ100jobsloadtest

**Verification/remaining:** 13Python testsผ่านรวมinvalidAOI/limits/pixelresponse/NoData/VALID/scales/GDALmask/summarygrid/holes/diagonal/zeroCandidate/noValid/threshold/complexity;geometryroundtrip0ทุกacceptancecase Independentreadonlyartifactreviewผ่าน SourceAST/PowerShellparser/hash/JSON/diffตรวจตามREPORT.md ไม่รันwebtests/build/productionbrowserหรือเปลี่ยนfrontend/API/SQL/Auth/bucket/config ไม่มีBilling/subscription/commit/push/deploy ยังเหลือขั้น3–7 queue/ownedresults/workeridentity/transport/UI/qualification/release;hardwholejobdeadline/PCoffline-resumeยังไม่อยู่ในCLIนี้

เอกสารใช้งานworkers/local-ai/README.md หลักฐานoutputs/XEDO_Local_CPU_Pipeline_2026-10-30/REPORT.mdและfinal-validation.json ใช้สคริปต์run-local-ai.ps1กับไฟล์พื้นที่GeoJSONเพื่อรันในเครื่องได้ตอนนี้ ไม่บอกว่าปุ่มAnalyzeบนProductionพร้อมก่อนขั้นถัดไป

### 3.45 Local CPU website integration ขั้น3–5 — 30 ตุลาคม 2026

**สถานะ/ขอบเขต:** local-tested candidate หลังuserอนุญาต3–5เท่านั้น ไม่applySupabaseSQL/Auth/Storageหรือpush/deploy ทดสอบด้วยlocalAuthfixture+PGliteกับBFF/SQL/browserจริง และGEEacquisition+CPUจริง สถานะProductionยังอ้างreleaseเดิม ไม่ใช้localผลแทนrealhostedacceptance

**เส้นทางข้อมูล:** Inspectorวาด/เลือกsearchAOI→Analyzeเช็คworkerpresence→ยืนยันและSaveผ่านrevision/CASเดิม→POSTanalysis-jobsส่งเฉพาะmissionId/expectedRevision/mutationId→DBfreezeAOIจากdocument.searchGeometryและderiveowner→machineclaimผ่านoutboundRPC→pipelineGEEsingleS1/CPU/package→publishownedcatalog→GETjobresultId→ownedanalysisdetail→rawcandidate/coverageoverlay→Inspectordraft/confirm→plannergeometry→Save/reopen/history รูปS2บริบทและSARsourceมีคนละacquisitionidentityไม่สวมวันที่เดียวกัน

**API/ฐานข้อมูล:** BFFยังใช้sameorigin/CSRF/HttpOnlycookie/actorheader ไม่ส่งSupabaseJWTถึงbrowser GETanalysis-worker/analysis-jobs/jobและPOSTcreate/cancelเป็นallowlistroutes ค่าผู้ใช้ไม่เลือกowner/worker/SQLเอง Joberrorส่งเฉพาะsafe label→ข้อความช่วยแก้ ไม่echoSQL/providertext SQLติดตั้งตามลำดับinspector-foundation→inspector-ai→inspector-local-jobs→inspector-local-jobs-status สองไฟล์ใหม่เป็นatomic/versionedapplyซ้ำno-opและตรวจpredecessorexactก่อนadaptresolver ใช้privateRLS/revokedlive-sessionguards/explicitfunctiongrants ไม่มีdirecttablepermission

**คิว/ownership:** local_worker_registryผูกdedicatedmachineUID→enabledInspectorownerโดยไม่เพิ่มmachineในInspectorroster analysis_jobsfreezeinputrevision/specและmutationhash;attempt/fence/lease/publishreceiptคุมwrites serverderiveownedresultIdและanalysisRefจากJSONBcanonicalSHA256/sealVersionxedo-jsonb-seal/1 Preparedcatalogเดิมhashไม่เปลี่ยน งานและresultของคนอื่นตอบ404ทั้งlist/detail/save/confirm/history แม้เรียกdirectRPC ต้นทางmodel/filehashยังเป็นproducerreport ไม่อ้างDBรันAI/อ่านTIFFซ้ำ DBตรวจmodel/checkpoint/recipe/threshold/dates/grid/counts/topology/unknownrootkeys/sizeและoverridevalidation/reviewflagsให้unreviewed/accuracyfalse

**Caps/lifecycle:** หนึ่งrunningทั่วqueue/สองqueued/100logicaljobsต่อownerต่อUTCเดือน ไม่ใช่100attempts ทุกjob30mจากcreate/lease120s/attemptmax2 workerpresenceTTL180s Inputnativegrid≤2Mpx/4096ต่อด้าน/200กม²และearlyconservativeAOIbbox คงtargetหนึ่งPolygonไม่มีรู≤120จุด Rawcandidate≤256/coverage≤512/vertices8192/ring≤4097/rings≤64;workerJSON≤512KiB/DBcanonicalcatalog≤600000bytesรวมJSONBspacing เกินcapfailชัดเจนไม่truncate ผลเต็มคงlocal Ownerjob/jobsอ่านแล้วexpireharddeadlineหรือcancel+expiredleaseเองแม้PCตาย ไม่รอclaim/cron Workerclaimค่อยrecoverleaseที่ยังมีเวลาและincrementfence/attempt

**โปรแกรมในเครื่อง:** remote_worker.pyรับเฉพาะfixedXEDOSupabaseURL Normalmode;localQAเปิดexplicit127.0.0.1:5193เท่านั้น ใช้publishablekey+dedicatedmachineAuthไม่มีservice_role/passwordstorage WindowscurrentuserDPAPIprotectrefreshsession endpointbound ParentแยกheartbeatจากCPUchild มีdeadline/RSSwatchdog/killoncancelและส่งrealstage/tiles ใช้CREATE_NO_WINDOW ไม่เปิดconsolehelperใหม่ผ่านStart-Process Persistactivecheckpoint+analysisfilehash+stablemutationก่อนpublish unknownresponseให้retryexactbodyโดยไม่รันCPUซ้ำ StartupprocessingrecoveryตรวจPID/create-time/commandก่อนหยุดchildเดิม ไม่blindkillอื่น FullTIFF/score/mask/previewอยู่local;catalog/candidates/coverage/source/model/sealsอยู่DBและเปิดได้เมื่อworkerปิด ไม่สร้างStoragebucket/uploadในmilestoneนี้

**UI/state/performance:** planning-analysis-jobs.jsแยกcoordinationจากriskgeometry ไม่overlappoll/action/Save;activepoll4s/idle30s/hidden15sโดยไม่มีrequestและguestไม่poll ทุกresponseตรวจidentity/epochและautoopenต้องตรงcontextKeyรวมedit+mission+AOI guard ตั้งpendingmutationก่อนPOSTเพื่อretryuncertainsubmitไม่saveซ้ำ Changeaccountล้างjobs/results/privatepresenceและไม่ให้oldfinallyปลดbusyของnewaccount riskeditorตรวจactiveedit/workingหลังmanualdetailfetchและconfirmทุกครั้ง ผลช้าไม่หยุดeditหรือทับdraft การpollupdateเฉพาะstatus/historyDOMไม่clearvectorหรือrecalculateroute Historyแสดง10จากDB30รายการและจำกัดscroll240px เปอร์เซ็นต์เฉพาะrealtiles;GEEใช้stage/indeterminateprogressไม่เดาlivepercentage Failed/completedfeedbackไม่ถูกidlepresenceลบทันที

**Inspector/planner:** rawresultsimmutable Inspectoreditableareaแยกจากanalysisและconfirmedreview ผู้ใช้accept/reject/move/edit/draw/GeoJSONApply/UndoRedoได้ตามเดิม ZeroCandidateสำเร็จได้พร้อมข้อความไม่ใช่absenceofoilและmanualDrawเปิดอยู่ Confirmต้องreviewimage/pixelcoverage/searchAOI/outputfootprintตามgatesเดิมและเก็บtarget/CASreviewrevisionแยก NoDataเป็นข้อมูลไม่พอ แยกvalidcoveragecomplete/partial/unavailable ไม่ทำให้โมเดลยืนยันoilthickness/volume Plannerสามขั้นตอนและตัวคำนวณสี่ส่วนเดิม Exportยังบล็อกmissingHome/drone/readiness

**หลักฐานสด:** UIAliceเลือกRayongAOI4.83กม²/กรอบraster5.0172กม²→jobfd333481-5af8-4d17-8a51-1d0fdea2f13d→SAR26ต.ค.23:00:37UTC→resultXEDO_LOCAL_RESULT_96c461bcab3d46d69b1c543adc33b991 pipeline23.373s/runner0.504s/nativepeak509.92MiB/queue→publish28.421s/compactcatalog10303bytes/0candidate Manualdraw/Applyboundary/UndoRedo;confirmก่อนภาพถูกปฏิเสธ→S2review27ต.ค.→confirmv2/coveragecomplete→route11.47km→Save/reopen4versionsผ่าน RestartfilebackedDBและหยุดworkerแล้วยังอ่านผล/target/historyได้ BobUIไม่มีmissionและBFFอ่านAlicejob/result/mission/history404ทั้งสี่ Queuedcancelไม่ล้างconfirmedtarget Presenceofflineจริงหลัง180s หน่วงmanualdetail7sแล้วเริ่มDrawยังรักษาactiveedit/14preparedcandidates ไม่มีlateinstall

**Verification:** 606Nodepass/0fail/0skipรวมDB18/coordination21/newBFF3และregressionเดิม;Python30pass (pipeline13/worker17รวมDPAPIจริง/fixturechild) ไม่ถือunitchildเป็นrealinference Syntax/npmcheck/newmodulesผ่าน 3buildsผ่าน FinalhostedHTML6207852UTF-8bytes (buildlog6207848เป็นJSstringlength) Browserreloadfinalbundle/reopenv4/status/consoleตรวจแล้ว หลักฐานREPORT.md/local-http-acceptance.json/owned-result.json/saved-mission.json/sourcehashes/screenshotsและrawlocalpipelineในoutputs/XEDO_Local_AI_Web_2026-10-30+ignoredlocal-data/local-ai-web-final ไม่มีrealSupabasepasswordacceptance/multi-connectionrace/100jobssoak/near200UIqualificationในรอบนี้

**การทำต่อ:** เริ่มserverQAด้วยnode scripts/preview-local-ai.mjsหลังbuild dataอยู่ignoredlocal-data;Authfixtureไม่ใช่บัญชีproduction ดูworkers/local-ai/README.mdสำหรับDPAPI/config/runและข้อกำหนดทีมสร้างmachineภายหลัง ก่อนเปิดonlineต้องอนุญาตSQLทั้งสอง/registry+machineAuth/deployและตรวจrealPostgREST grants/session/ownerisolation+hostednegativecases ขั้น6–7และquota/devicequalificationยังเหลือ ไม่มีBilling/subscription/paidfallback/IAMเพิ่ม หลังเก็บหลักฐานหยุดlocalQAserver/workerและปิดแท็บแล้ว ไม่มีคำถามรอคำตอบ


### 3.46 Supabase real-backend qualification ขั้น6 — 30 ตุลาคม 2026

**สถานะ:** ขั้น6inprogress ผู้ใช้อนุญาตbackendจริงแต่ไม่push/deploy/Billing/subscription Migrationqueue/ownedresults/statusติดตั้งแล้วในxedoจริงผ่านMCPmegaphijakหลังbackup/preflight exactmarkers ทั้ง6ตารางใหม่RLS/noanon-or-authenticatedCRUD publicxedo_local_workerInvoker/explicitexecuteauthenticated session+registryguard ข้อมูลpreparedเดิมhashไม่เปลี่ยน Frontendออนไลน์ยังreleaseเดิม Mainใช้เว็บlocalกับBFFจริง ทดสอบsigned-inต่อได้เมื่อผู้ใช้เตรียมบัญชีสำเร็จ

**Schema/APIที่ตรวจจริง:** versionmarkersv1/statusv2ครบ PostgRESTพบRPC(anonymous401) privatejob/resulttablesไม่expose404 ทั้ง12privateRLS/noCRUD Rootpurevalidation14candidate/3coveragefixtureบนPostgres17.11ใช้0.289493s/99404bytes ไม่persistresultและไม่ผ่านworkerจริง ได้unreviewed/accuracyfalseตามcontract Authenticatedtimeout8s/anon3s AdvisorINFOprivateRLSnoPolicyintentional+privateguard,unindexedFK10/unused2และpasswordprotectionWARNเดิมไม่เปลี่ยนแพ็กเกจหรือเปิดfeatureเพิ่ม

**Localreal-backendserver:** scripts/preview-live-ai.mjsrequiresXEDO_LIVE_QA_AUTHORIZED=1/bind127.0.0.1:5193/fixedHost Origin/noforwardedhost ใช้handleInspectorจริงด้วยfixedXEDOURL/publicpublishablekeyไม่มีfetchmock ใช้GEE/environmenthandlersเดิม ไม่applySQL/สร้างusersจากserver ใช้port5193แทน5194ที่EACCESและหยุดfixtureเดิมก่อนเพราะdevcookiehostscopedไม่แยกport ไม่เปิดpublicport/tunnelหรือdeployserverนี้

**Protectedaccountsetup:** /qa/setupมีprimary/secondary/machineให้ผู้ใช้กรอกรหัสเอง POST/qa/connect8KB/Origin/roleallowlist/singlehelper ใช้scripts/local-ai-account-connect.pyofficialGoTruepasswordgrant+getuserverifyก่อนSessionStoreDPAPI Rolefilesเฉพาะignoredlocal-data/live-ai-qualification;passwordไม่อยู่argv/env/disk/stdout/log/Markdown Secretaccess/refreshอยู่encryptedfileเท่านั้น Metadataaccount.jsonมีUID/email/expiryสำหรับrootตรวจAuthจริงและbindsecondaryroster/machineregistry ไม่มีadmin/serviceRole/automaticprivilegegrant Primaryuserกรอกครั้งเดียวแล้วserverBFFsignInคืนHttpOnlycookieให้browserด้วย หน้าsetupclearpassword/loadingและqueue3ฟอร์มเพื่อกันCONNECT_BUSYจากการกดพร้อมกัน

**Authinputค้าง:** เลือกInspectorเดิม+InspectorTestและmachineใหม่ ทีมสร้างผ่านSupabaseAdduser+AutoConfirm;testidentifierexample.invalidใช้ได้ไม่ต้องinboxสำหรับpasswordgrant ผู้ใช้แจ้งครบแต่ตรวจruntimeLOGIN_FAILED/CONNECT_BUSY ไม่มีaccount/sessionfiles และauth.usersยังมีเพียงเดิมconfirmed/notbanned จึงยังไม่สร้างregistry/bindสิทธิ์หรือทำfakeclaims รอผู้ใช้สร้าง2accountsในxedoและconnect3rolesจริง ไม่ขอ/เปลี่ยนpassword

**Freshqualification:** Node606/Python45pass;Pythonเพิ่มpartial50%/allNoData/noSAR/gridmismatch/complexity6และhelper9มีactualWindowsDPAPIด้วยfakeAuthtokens เป็นsoftwarefixturesไม่ใช่realAuth CPUจริงdirectCLI197.5274กม²ผ่าน34.979632s/runner4.097603s/peak725.34MiB/0candidate/valid1918260 ไม่อ้างhostedqueue/100jobsSLA GEEจริง1900-01-01ได้NO_SAR_SCENEและไม่มีmodelrun No frontendproductionchanges/buildใหม่ Evidenceoutputs/XEDO_Local_AI_Phase6_2026-10-30;รับrealAuthแล้วต้องทดสอบBFF/realPostgREST/multiconnection/publish/owner/privatehistory/InspectorUIต่อก่อนcomplete


**บันทึกเพิ่มเติมหลังรับบัญชีจริง:** **อัปเดตบัญชีขั้น6:** ทีมสร้างInspectorTestTEST_INSPECTOR_LOCALและmachineCPU_WORKER_LOCALในxedoแล้ว ทั้งสองconfirmed/มีpassword/identityครบ RootเปิดInspectorTestและผูกmachineกับInspectorเดิมPRIMARY_INSPECTOR_LOCAL ตรวจenabledInspectors2/registeredWorkers1/machineInInspectorRoster0 RealAuthGetUserและRPC7checksผ่าน: secondaryInspectorใช้งานได้/machinepresenceownerถูก/สองroleใช้สิทธิ์สลับกันไม่ได้ ตอนนี้มีDPAPIsessionสองroleแล้ว เหลือprimary ผู้ใช้แจ้งลืมรหัสและเลือกลองรหัสที่Chromeบันทึกก่อน ไม่ได้ส่งrecoveryemail/เปลี่ยนรหัส/ลบสร้างuserใหม่ RootเปิดเฉพาะSupabaseUserDetailsพบปุ่มSendpasswordrecovery(ส่งemailเท่านั้น) ไม่อ่านPasswordManager/clipboard รอprimaryconnectสำเร็จ หลักฐานpartial-real-auth.json/qa-gates.json(root12checks)/account-binding.jsonอยู่outputs/XEDO_Local_AI_Phase6_2026-10-30 ส่วนrootสร้างscripts/qualify-real-ai.pyไว้พร้อม --run-real guard/Missingprimary→pending/network0 ไม่ได้รันสามjobจนกว่าจะมีprimaryจริง BrowserlistTabsChromeถูกauto-reviewปฏิเสธเพื่อปกป้องแท็บอื่น จึงเปิดเฉพาะSupabaseURLตรงได้สำเร็จ ไม่ข้ามข้อจำกัดหรือขอสิทธิ์อ่านแท็บอื่น ไม่มีBilling/subscription/push/deploy ขั้น6ยังinprogress


**ส่งต่อสถานะรอบนี้ — primaryช่องเดียว:** ทีมสร้างและเชื่อมInspectorTest/CPUสำเร็จแล้ว ไม่ต้องสร้างหรือเชื่อมสองบัญชีนี้ซ้ำ Rootเปิดสิทธิ์InspectorTest/ผูกmachineกับownerเดิมและตรวจrealAuth7casesผ่าน เหลือรหัสบัญชีเดิม ผู้ใช้เลือกดูChromeSavedPasswordก่อน ไม่ได้ส่งrecoveryemail/เปลี่ยนรหัส Rootคงlocalrealbackendserver127.0.0.1:5193/qa/setupและแท็บhandoffไว้ รอคำตอบว่าช่องprimaryขึ้นเชื่อมแล้วหรือไม่พบรหัส เมื่อprimaryDPAPIพร้อมให้รันscripts/qualify-real-ai.py --run-realแล้วทำbrowserInspectorreview/plannerต่อก่อนmarkขั้น6complete Source/receipts/metricsอยู่outputs/XEDO_Local_AI_Phase6_2026-10-30/REPORT.md ไม่มีcommit/push/deployเว็บไซต์หรือBilling/subscription


### 3.47 ปิดการทดสอบขั้น6กับ Supabaseจริงและ CPU ในเครื่อง — 30 ตุลาคม 2026

**ขอบเขตและบัญชี:** ผู้ใช้แจ้ง primary เชื่อมแล้วแต่รอบแรก root ตรวจทั้งไฟล์ metadata และ /qa/accounts พบเพียง secondary/machine จึงเปิดหน้า setup ใหม่และขอเฉพาะช่องแรก ผู้ใช้เชื่อมอีกครั้งสำเร็จจริงเวลา09:54:47UTC UIDเดิมPRIMARY_INSPECTOR_LOCAL ครบ3DPAPIrolesและบัญชีแยกกัน ไม่มีรหัสผ่าน/tokenในบันทึกหรือGit ไม่อ่านPasswordManager/clipboard ไม่ส่งrecoveryemail/เปลี่ยนpassword/ลบสร้างuserใหม่

**คิวและผลจริง:** scripts/qualify-real-ai.py --run-real ใช้ real BFF/PostgREST/GoTrue sessions และ Worker.process จริง ผ่าน3casesในรายงาน qualification-20261030T095749Z_3c412eae.json ทุกงานส่ง create ซ้ำ3connections→jobเดียว, claim3connections→claimเดียว, publishซ้ำ3connections→receiptเดียว ตรวจ owner A/B ทั้ง BFF/directRPC และ private draft/reopen/history ไม่สร้าง image/confirmation สมมติ เป็น same-session/multi-connection concurrency ไม่อ้าง different-machine-session global-race

| กรณีสดผ่าน hosted queue | เวลารวม Worker.process | pipeline / inference | native peak RAM | ผล |
| --- | ---: | ---: | ---: | --- |
| ภาพอ้างอิง9ต.ค. grid176.478กม² | 37.031s | 33.571 / 2.188s | 723.973MiB | 14candidate /15,248pixels; valid60.168%,footprint61.697%; candidate/valid/NoData roundtripต่าง0 |
| พื้นที่ใหม่ใกล้limit grid197.5274กม² | 39.813s | 36.608 /3.132s | 710.082MiB | 0candidate; valid1,918,260pixels; แยกNoDataตามจริง |
| noSAR start=end1900-01-01 | 6.813s | 5.819s /ไม่รันโมเดล | 90.469MiB | failed/input_invalid และไม่มีresult |

**การแก้ตัวทดสอบ:** รอบแรกเลือกช่วง1–10ต.ค.จึงได้ภาพ8ต.ค.ที่coverageครบกว่าและ17candidate เป็นงานที่ succeeded จริง แต่ qualification assertion14ผิดบริบท ไม่ใช่โมเดลเสีย Rootจำกัดวัน9ต.ค.และตรวจexactassetIdก่อนassert14 โดยเก็บรายงาน failed เดิมไว้ ไม่แก้เกณฑ์เป็น17หรือใช้ผลเก่าแทน inference ใหม่ ผล score/maskจากคิวจริงเทียบ original baseline ทุกpixelต่าง0และTIFFSHA256ตรงทั้ง2ไฟล์ ดู real-baseline-pixel-comparison.json

**ทดสอบ protocol จริงเพิ่ม:** scripts/qualify-real-ai-post.py ผ่าน foreignanalysisRef save422/foreigncancel404, cancel-vs-publishคนละsession(รอบนี้cancelชนะ ไม่มีresultใหม่), naturalquiet183s→Offline/newcreate503WORKER_OFFLINE/ไม่เพิ่มjob/ผลเก่าและhistoryยังเปิดได้, naturallease120s→reclaimfenceใหม่/oldheartbeat-progress-publish409LEASE_LOST แล้วcancelงานQAด้วยbindingปัจจุบัน เป็น2logicaljobsและ replayผลจริงเดิมเพื่อทดสอบprotocolเท่านั้น ไม่มีGEE/inferenceใหม่ ไม่revokeบัญชีหรือปรับtimestampSQL ดู post-run-20261030T100321Z_eb106ca8.json

**พบและแก้ปัญหาจริง:** Browser confirmพื้นที่ editedcandidate80จุดล้มเหลว503; Postgreslog10:04:59UTCยืนยันSQLSTATE57014ที่ risk_on_segment→risk_point_ring→risk_geometry_covers เพราะเกิน authenticatedtimeout8s Rootเพิ่ม db/inspector-risk-performance.sql cacheedgefloats/inlinecrossเดิม และข้ามholebboxที่disjointอย่างเคร่งครัดพร้อมตรวจtargetcentroidก่อนholecentroid คงintersections/holes/epsilon1e-13กับ1e-11/no-round/no-simplify ไม่มีPostGIS/เพิ่มtimeout/ขยายสิทธิ์ Draftแรกมีชื่อตัวแปรbyชนคำสงวน ตรวจในPGliteแล้วแก้next_x/next_yก่อนapplyจริง Migration xedo_risk_geometry_performanceสำเร็จหลังbackup+exactpredecessorMD5guardในtransaction อัลกอริทึมผ่าน959point comparisons/18coverage cases/8invalid SQLSTATEequivalence NativeEXPLAINของ80point candidate/validcoverageจริงใช้1.371837s และactualbrowserconfirmสำเร็จ ไม่รับรองworst-case8192verticesทุกกรณี

**Browserจริง:** ใช้session primaryที่เชื่อมไว้แล้วผ่านlocal-only /qa/session→POST/qa/browser-session FixedHost/Origin/JSON{}; PythonDPAPIhelperตรวจGetUser+InspectorRPCและNodeตรวจBFFsessionซ้ำ ก่อนส่งHttpOnlycookie ไม่มีpasswordgrantใหม่/tokenในpageJS ภาพอ้างอิง14candidate→เลือกcandidate00002(80จุด)→ย้าย→edited_candidate→Sentinel-2วันที่22ต.ค.cloud14.1%+pixelvalidation→confirmv1/complete→planner5.92km→Savev2→Historyv1/v2→openv2จริง ผลrawcandidategeometryยังตรงproducer

จากนั้นเริ่มQAmissionใหม่ผ่านUI นำเข้าพื้นที่ระยองใหม่4.83กม²(grid5.0172กม²) กดAnalyzeจริง ได้job86b1b8c6-98c4-442e-ae40-a654fcfc536a/resultXEDO_LOCAL_RESULT_a45765ce2cf2410bb6967866b7982eba อัปเดตprogressและเปิดผลอัตโนมัติ CPUpipeline17.853s/inference0.446s/peak510.398MiB/SAR26ต.ค./0candidate ข้อความไม่อ้างว่าไม่มีน้ำมัน Inspectorวาดmanual4จุด/UndoRedo/ตรวจSentinel-2/confirmcomplete→planner1.75km→Saveและยืนยันซ้ำเก็บhistoryถึงv4 ตรวจAPIของสองQAmissionพร้อมforeignowner404รวม10cases (อ่าน6ครั้ง/พยายามแก้4ครั้งผ่านBFFและdirectRPC โดยhash/revisionเจ้าของไม่เปลี่ยน)และrawgeometryตรงproducer ดู browser-acceptance.json/screenshots ไม่ปลดล็อกดาวน์โหลดถ้าHome/flight/airspaceยังไม่ครบตามscopeเดิม

**Verificationรอบสุดท้าย:** Node611pass/0fail/0skip; Python57pass; accountportal12และsessionbridge11HTTPguardchecks; buildweb/workspace/standaloneผ่านทั้ง3 ไม่มีfrontendproductsourceใหม่ในรอบนี้ แก้QAhelpers/tests/SQLและdocs FinalDB12privateRLS/noClientCRUD/helpersInvoker+emptysearchpath+noanon/authenticatedexecute/machineไม่อยู่Inspectorroster PreparedcatalogSHA256ยัง24476c493413b461b6f43a92e7bfa057f79d46376fee32f90b869b10be560f1c งาน7logical: succeeded4(includesรอบ17candidateที่qualificationผิด),expectedfailed1/noSAR,cancelled2 ไม่มีqueued/running DB12367539bytesเป็นphysicalobservation ไม่ใช่Dashboardquotausage

**ไฟล์เปลี่ยนรอบนี้:** db/inspector-risk-performance.sql; scripts/qualify-real-ai.py(วันที่+sourceassert); scripts/qualify-real-ai-post.py; scripts/local-ai-browser-session.py; scripts/preview-live-ai.mjs(localbridge); tests/inspector-risk-performance.test.mjs; tests/inspector-ai-database.test.mjs; tests/inspector-local-jobs.test.mjs; workers/local-ai/tests/test_browser_session.py; workers/local-ai/README.md; canonicalสองMD/queue/LOCAL_CPU_AI_INTEGRATION_PLAN.md หลักฐานและhelperชั่วคราวอยู่outputsและignoredoutput/local-data ไม่เพิ่มsecretเข้าGit ไม่overwriteงานdirtyจากขั้นก่อน

**สถานะเผยแพร่/งานถัดไป:** ขั้น6pilot real-backend qualificationจบแล้ว ขั้น7website releaseยังไม่อนุญาต ไม่มีcommit/push/deploy/Billing/subscription/paidresource Workerทดสอบหยุดแล้วหลังjobสำเร็จ ผลcatalog/confirmation/historyอ่านได้จากSupabaseโดยไม่ต้องเปิดCPU Serverlocal5193คงไว้เพื่อให้ตรวจผลงาน ไม่มีคำถามรอคำตอบ งานqualificationsแยกที่ยังไม่รัน: 100jobs/monthlongsoak,คนละmachine-sessionglobalclaimrace,รอharddeadline30นาทีจริง,worst-casegeometry8192vertsและphysicaltouch/trackpad/heap/listener เดิม Pi/รายงานก่อน–หลังยังพักไว้ตามคำสั่ง


### 3.48 ขั้น7 release boundary — 30 ตุลาคม2026

**ขั้น7กำลังเผยแพร่ — 30 ตุลาคม2026:** ผู้ใช้อนุญาต commit/push/deploy เว็บจริงและตรวจหลังเผยแพร่แล้ว โดยไม่เปิด Billing/subscription Targetเดิม xedo/prj_x35WcipWxA767cYwv3f0CXcdyea3/team_CV1O0uIz6BcarAQAOb8soV0I → xedo-eight.vercel.app Rootใช้GitintegrationเดิมหลังตรวจCIและdeployment identity; Supabase schema/registry/สามบัญชีติดตั้งและผ่านขั้น6แล้ว ไม่สร้างบัญชีหรือapplySQLซ้ำ AIยังรันบนCPUในเครื่อง ไม่รันPython/GPUบนVercel

Vercelใช้npmci→npmrunbuild→dist/index.htmlและNodeAPIเดิม api/inspector.mjs เพิ่มanalysis-worker/analysis-jobs ผ่านrewriteเดิม /api/v1/inspector/:path* ไม่มีCPUworker/model/TIFF/DPAPI/QAserverในruntime ไม่เพิ่มsubscription/cloudcompute/Storage บัญชีfullaccessroleเดียวInspectorยังowner-scoped เครื่องCPUใช้machineidentityเดิมดึงSupabaseoutboundHTTPS ผลสำเร็จอ่านย้อนหลังจากDBได้ตอนเครื่องปิด การตรวจreleaseต้องแยกCI/source/artifact/protectedprivateAPI/browser/CPU resultรับจริงและบันทึกdeploymentid/commit/hashใหม่หลังREADY


**Pre-pushตรวจแล้ว:** Node611pass/0fail/0skip, Python69passหลังเพิ่มidentityconfigและproductionacceptanceofflinecontracts6cases, syntaxและbuildweb/workspace/standaloneผ่านทั้ง3 HTML6207852bytes/SHA2566db264f4e06c5c98b718a652a0b7c70fbe97e6b2363dc0a1152cc9a664188efc ไม่รันโมเดล/realjobซ้ำในpreflightนี้ ใช้ผลขั้น6เป็นbaselineแยกจากpostdeployที่จะรันใหม่ .vercelignoreเพิ่มworkers/tests/db/docs/localQAtools; .gitignoreเพิ่มDPAPI/TIFF/model ผู้ใช้ยังไม่ต้องตอบอะไรเพิ่ม บัญชีproductionเดิมเปิดได้ RootจะpushfeatureตรวจCIก่อนfast-forwardmainให้Gitintegrationเดิมdeploy ห้ามforcepush/เปลี่ยนแพ็กเกจ

**ค่าบัญชีเฉพาะเครื่อง:** QAhelpersอ่านignoredlocal-data/live-ai-qualification/account-identities.jsonเพียงprimaryUserId/primaryEmail (ไม่เกิน4KB/validateUUIDและemail/missingfailclosed) ตัวอย่างทดสอบใช้fixtureบัญชีสมมติ ExactAuthUUIDในpublicdocsใช้aliasPRIMARY_INSPECTOR_LOCAL/TEST_INSPECTOR_LOCAL/CPU_WORKER_LOCAL รายละเอียดจริงอยู่privateignoredreceipts ไม่ใช่JWT/ไม่ใช้aliasเรียกAPI Productionไม่มีQAbridgeและไม่ติดตั้งPython/โมเดลเพิ่ม


### 3.49 ขั้น7เผยแพร่ local CPU AI และตรวจ production — 30 ตุลาคม2026

**หัวข้อ:** ผู้ใช้อนุญาตpush/deployและตรวจหลังเผยแพร่ โดยไม่เปิดBilling/subscription อ่านcanonical/Gitก่อนแก้ รักษาสามขั้นตอนและสี่ตัวคำนวณ ไม่สร้างAuth/schemaซ้ำ ไม่เปลี่ยนขอบเขตnormalflightprofileที่ผู้ใช้พักไว้

**สรุปการเผยแพร่:** application 6a1c626cda0cf6dad22b603d6647f41b325598ff, feature/mainfast-forwardไม่forcepush; CI41042450911และ41042599241success; Production dpl_6G8DzTyKUYskvxza8Fb5KUYEoByE READY/targetproduction/mainSHAตรง URL https://xedo-eight.vercel.app/ FinalHTML6207852bytes SHA2566db264f4e06c5c98b718a652a0b7c70fbe97e6b2363dc0a1152cc9a664188efc ตรงไฟล์distและHTTPbodyทุกbyte ค่าคอนโซลbuild6207848เป็นintermediateก่อนเปลี่ยนhostedtitle ไม่ใช่ขนาดfinalartifact เอกสารปิดงานจะตามด้วยdocs-onlycommit; identityสุดท้ายบันทึกในoutputs/XEDO_Local_AI_Phase7_2026-10-30/release-receipt.json ไม่อ้างcommitอนาคตในเอกสารนี้

**Productionใหม่จริง:** APIacceptanceหนึ่งQAmission/หนึ่งjobและBrowserจริงอีกหนึ่งQAmission/job แยกกัน ไม่เปลี่ยนAPIreceipt browserProof:falseให้กลายเป็นUIproof ทั้งสองโหลดSentinel-1จากGEEและรันCPUจริง พื้นที่grid5.0172กม²/valid48679จาก50172pixels ได้0candidateและroundtripcandidate/valid/NoDataต่าง0 Pipeline18.546s/inference0.344s/peak508.953MiB(APIงาน);13.848s/inference0.268s/peak509.723MiB(UIงาน) เป็น2ตัวอย่างเล็ก ไม่ใช่P95/SLA/200กม²ใหม่/100jobsเดือน และ0candidateไม่ยืนยันว่าไม่มีน้ำมัน

**Browserจริงและข้อมูลที่บันทึก:** ใช้Inspectorเดิมที่มีsessionอยู่ เลือกพื้นที่ใหม่ระยอง→Analyze/ยืนยัน→progressจนสำเร็จและเปิดผลอัตโนมัติ→วาดmanual4จุด→แก้vertexผ่านGeoJSON→Undo/Redo→โหลดSentinel-2วันที่22ต.ค.cloud14.1%และตรวจpixels→confirmreviewv2/complete→Prepareเส้นทาง1.76km→Saveจนmissionrevision3 ตรวจproductionAPIกลับได้history[3,2,1]/manualtarget4จุด/analysisRefผูกownedresult บัญชีBอ่าน4กรณีและเขียน1กรณีถูกปฏิเสธ hash/revisionของเจ้าของไม่เปลี่ยน Downloadยังถูกล็อกเมื่อHome/airspace/dronebatteryไม่ครบตามเดิม

**กรณีค้างเฉพาะการทดสอบหน้าจอ:** หลังSavesessionbrowserหมดอายุ กดHistoryแล้วระบบให้Sign inใหม่ตามpolicy ไม่อ่านหรือขอpassword/recoverylinkและไม่เปลี่ยนบัญชี **รอคำตอบ:** ผู้ใช้Sign inใหม่แล้วแจ้งเข้าแล้วเพื่อทดสอบHistory→Version3→reopenผ่านหน้าจอ กรณีAPIhistory/openผ่านแล้ว แต่ไม่ใช้แทนbrowserreopen การSign inด้วยpasswordสดรอบนี้ยังไม่อ้างว่ารันทดสอบใหม่ (ใช้sessionเดิมก่อนหมดอายุ)

**มือถือ/หลักฐาน:** Chromeproductionguest390×844มีAnalyzeareaและLoginpanel; documentwidth375≤viewport390/dialogwidth362 ไม่พบhorizontaloverflowในสองหน้าที่ตรวจ เก็บproduction-mobile-390.png/production-mobile-login.pngและproduction-confirmed-route.pngในscreenshots แรกเปิดหน้าใหม่มีnavigationtimeout/DOMloadingก่อนดาวน์โหลดHTMLครบ แล้วตรวจreadyStatecomplete/695nodes/Analyzeareaจริงก่อนถ่ายหลักฐาน ไม่ถือIABภาพเก่าหรือblankช่วงloadingว่าresponsivepass ไม่อ้างphysicaltouch/trackpad/performanceprofilingหรือsigned-inmobileflowผ่าน Consoleerror/warnที่จับในแท็บทดสอบเป็น[]; Vercelerror/fatalqueryไม่พบmatchinggroupsในsnapshotที่อ่าน ไม่ใช่รับรองว่าไม่มีerrorทั้งระบบ

**Build/securityสด:** Node611/Python69pass/0fail/0skip; syntaxและweb/workspace/standalonebuildผ่าน3แบบ Stage50ไฟล์ไม่พบprivateaccountUUID/secret/forbiddenartifacts Dependencytracebrowser454/API15inputsไม่มีworker/model/session/QAในruntimegraph .gitignore/.vercelignoreกันDPAPI/TIFF/model/localQA เว็บไซต์จริงตอบ404สำหรับ/.env,/local-data/live-ai-qualification/primary.session.dpapi,/qa/setup,/qa/browser-session,/scripts/preview-live-ai.mjs,/workers/local-ai/remote_worker.py ไม่เปิดproductioncredentialbridge ไม่มีservice_roleในbrowser/PC

**เครื่องCPUใช้งานต่อ:** เปิดdaemonเดิมด้วยignoredlocal-data/local-ai-worker/worker.config.json ใช้DPAPImachineidentityเดิมผ่านoutboundHTTPS/heartbeat20s/poll10s/หนึ่งงานต่อครั้ง ไม่เปิดpublicport/tunnel โปรแกรมต้องเปิดอยู่ เครื่องไม่Sleepและinternetพร้อมสำหรับAnalyzeงานใหม่ ผลที่เผยแพร่สำเร็จและprivatehistoryอยู่Supabaseเปิดย้อนหลังได้ตอนCPUปิด หากปิดdaemonให้ใช้คำสั่งในworkers/local-ai/README.md§3.8เพื่อเปิดอีกครั้ง ไม่ย้ายโมเดลไปVercel/ไม่เปิดcloudcompute/Billing/subscriptionหรือเพิ่มแพ็กเกจ

**ไฟล์เปลี่ยนและหลักฐาน:** applicationcommitรวม50ไฟล์ phase1–6/QAprivacy/releaseguards;รอบปิดงานแก้docs/XEDO_WORK_LOG.md,WEBSITE_DETAILS.md,implementation-queue.json,LOCAL_CPU_AI_INTEGRATION_PLAN.mdและworkers/local-ai/README.md Evidenceapplication-deployment.json,ci-application.json,public-html-receipt.json,private-route-checks.json,acceptance/production-6db264f4e06c5c98b718.json,browser-api-receipts.json,browser-actions.json,browser-console.json,REPORT.mdอยู่outputs/XEDO_Local_AI_Phase7_2026-10-30 ไม่เผยแพร่DPAPI/privateactorUUID/rawTIFF/weights

**งานเหลือแยกจากreleasecore:** browserHistoryreauthตามข้างบน;qualification100jobs/monthlongsoak/คนละmachine-sessionglobalclaimrace/harddeadline30minจริง/worst-case8192vertices/physicaltouch-trackpad/heap-listenersยังไม่รัน ไม่reusephase6near200กม²/noSARว่าเป็นproductionใหม่ Pi/telemetryและรายงานก่อน–หลังยังdeferredตามผู้ใช้ ไม่เปิดBilling/subscription


### 3.50 ปิด browser History หลังผู้ใช้ Sign in ใหม่ — 30 ตุลาคม2026

**หัวข้อ/คำตอบที่รับ:** ผู้ใช้ตอบเข้าแล้ว Rootไม่ขอpassword/tokenและไม่เปลี่ยนบัญชี หน้าเดิมยังcachedsessionexpiredจึงreloadอย่างตั้งใจหลังSavev3persistแล้ว เปิดInspectoraccountพบsigned-inและโหลดMy missionsจริง ไม่ถือเพียงข้อความผู้ใช้ว่าbrowsercaseผ่าน

**ผลตรวจสด:** คลิกHistoryของQA Production browser — area analysis เห็นVersion3/2/1→คลิกVersion3→ข้อความOpened version3.Reload satellite imagery and review flight readiness.→ปิดaccountpanelพบSaved AI review restored./Confirmed reviewv2·manual·complete SAR26ต.ค./analysis30ต.ค./0candidatesเดิม target4จุดในGeoJSONตรงที่แก้ไว้ทุกพิกัดและมีLocalprocessorReady ระบบให้reloadcontextimageก่อนPrepareจึงไม่คงimageReadyจากsnapshot ไม่มีการAnalyze/confirm/Saveซ้ำหรือเพิ่มrevisionใหม่ รอบนี้เป็นbrowserreopenจริงหลังsessionเปลี่ยน ไม่ใช่เพียงAPIhistoryreadback

**เอกสาร/เผยแพร่/หลักฐาน:** เก็บscreenshots/production-history-versions.png,production-history-opened-v3.png,production-restored-ai-review.pngและปรับbrowser-actions.json/REPORT.md/queueเป็นpassed ไม่มีรอคำตอบ CanonicalสองMD/queue/localplan/workerREADMEอัปเดตclosureแล้ว Docscommitad1359ec2389043572c43dbee7638e0eb4d25917เคยREADYที่dpl_2bhptbByMBJwi6KxSnk7a1pdEWjC/mainCI41045535830และfeatureCI41045330460success;รอบนี้จะpushdocs-onlyfollowupปิดpendingและตรวจidentity/HTMLอีกครั้ง บันทึกสุดท้ายในphase7release-receipt.json ไม่เปลี่ยนapplicationหลัง6a1c626/ไม่applySQL/Auth/Billing/subscription ไม่รัน611Node/69PythonหรือCPUใหม่เพราะแก้เฉพาะเอกสาร ผลทดสอบเหล่านั้นเป็นpreflightสดของreleaseเดียวกัน มิใช่รอบใหม่ของการปิดHistory

**ขอบเขตที่ยังแยกไว้:** browsercoreและprivatehistoryจบแล้ว; signed-inmobile/physicaltouch-trackpad/heap/listeners/100jobsmonthlongsoak/คนละmachine-sessionrace/รอharddeadline30minจริง/worstcase8192vertsยังไม่ทดสอบ ไม่ถือเป็นfeatureimplementationค้าง Pi/telemetryและรายงานก่อน–หลังยังพักตามผู้ใช้ ผล0candidateไม่ยืนยันว่าไม่มีน้ำมัน ไม่มีBilling/subscriptionหรือcloudcomputeใหม่


**ปรับดัชนีคิวหลังปิดขั้น7:** remainingWorkOrderเลข6/เดิม9เป็นpublished_production_qualified_pilotและcompletedLegacyStageIdsเพิ่ม9;activeRemainingCount1/deferred2/total3หมายถึงqualificationUXแยกหนึ่งกลุ่มกับPi/รายงานที่พักสองรายการ ไม่ใช่ฟังก์ชันAIยังรอเผยแพร่ ไม่มีimplementation/SQL/Auth/testใหม่ในการแก้ดัชนีเอกสารนี้ รักษาผล611Node/69Pythonและproductionproofข้างบนเป็นหลักฐานreleaseเดียวกัน Finaldocs-onlycommit/deployment/CI/HTMLรับจริงบันทึกในphase7release-receipt.json

<!-- gee-map-latency-audit-2026-10-30 -->
### 3.51 สถาปัตยกรรม Google Earth Engine และ latency audit — 30 ตุลาคม 2026

**หัวข้อ/ขอบเขต:** ตรวจโค้ดที่เป็นเจ้าของและProductionล่าสุดตามคำขอเรื่องmapdelay ใช้Verceldeployment/verification skills และhelpersอ่านbackend/frontend/officialdocsแยกกัน ไม่มีhelperแก้applicationหรือเอกสารกลาง ผลคำแนะนำต่อไปนี้ยังไม่ได้implementหรือpublish

**สรุปหลักฐานปัจจุบัน:** CheckoutและProductionตรงa5612696a80470733da4155bd953d01d7b553bd4/main, dpl_EG7VyQiMMZpdXuSxmeSLep3KcsGm READY/iad1/alias xedo-eight.vercel.app Applicationสุดท้ายยัง6a1c626;SHAหลังจากนั้นเป็นเอกสาร BrowserguestแสดงGEEbackgroundจริง20images/2–27ต.ค./Readyและconsolewarn/errorที่จับได้0 ส่วนAPIprobeใช้viewportอีกขนาดและได้12images ทั้งbasemapและselectedsceneตอบrenderMode=pixels การวัดนี้ไม่ใช่fullbrowserperformanceprofile

**รายละเอียดเส้นทางหลัก:**

1. Step1สร้างOpenLayersทันที center[101.23,12.62]/zoom11 (src/planning-trial-client.js:117–123) ส่งviewportpolygonไปPOST/api/v1/gee/imagery/basemapผ่านVercelrewrite→api/gee.mjs→src/gee-imagery-api.js→createGEEBasemap
2. Serverค้นCOPERNICUS/S2_SR_HARMONIZEDผ่านGEEvalue:compute:ย้อนหลัง30วันUTC,cloudmetadata≤80%,intersectviewport,latestสูงสุด31scenes (src/gee-imagery.js:166–194) ผลคัดscenesเรียงเก่า→ใหม่ให้ภาพใหม่ทับในmosaic เก็บassetIDsในencrypted30minutesessionแล้วคืนsame-origintileURL Basemapเป็นบริบทหลายวัน ไม่ใช่singleacquisitionที่reviewหรือหลักฐานoil/readiness
3. แต่ละtile256×256/EPSG3857ส่งexpressionmosaic→clip→RGBB4/B3/B2/range0–3000/gamma1.2ไปGEEimage:computePixels (src/gee-imagery.js:199–202,274–277,295) Browserโหลดได้4พร้อมกัน/ตรวจPNGpixels/วางบนOpenLayers (planning-basemap.js:78–86,132–156) GEEcomputeเกิดตามoutputที่ขอ ไม่ใช่ดาวน์โหลดภาพที่pre-renderครบแล้วอย่างเดียว
4. เมื่อpan/zoom/resize debounce600ms ใช้viewportpadding1.2;reusemanifestได้เมื่อเหลืออายุ>60sและbboxครอบvisibleviewportครบ ถ้าขนาดviewเท่าเดิมเผื่อขอบเพียงประมาณ10%ต่อด้าน การเลื่อนพ้นนั้นอาจPOSTใหม่และเปลี่ยนsession (planning-basemap.js:103–119;planning-basemap-view.js:13–21) ทุกrunสร้างXYZlayerใหม่แต่คงภาพชั้นก่อนสำเร็จไว้ระหว่างรอreplacement

**เส้นทางอื่นที่ต้องแยก:** Reviewareaimageทำsearch→map→tiles→pixelvalidationตามลำดับ (trial-client:647–691,525–608) มีtimer30sแยกsearch/map/tile;searchได้ไม่เกิน12scenesที่coverAOIและเลือกใหม่สุดก่อน Mapลองprojects/maps;403จึงfallbackpixelsและจำในinstance (gee-imagery:248–257) รอบสดเห็นpixelsจึงยืนยันทางที่ใช้งานได้ แต่ไม่ได้อ่านIAMpolicyหรือเห็นupstream403bodyใหม่โดยตรง ContextplanningอัตโนมัติทำDEM30m/WorldCover10m/quality20m/forecastเมื่อมีเวลา แยกจากbackgroundmap (gee-mission-context:103–148,249–265);มี4partsแต่localmanager2slots/deadline25s/10minmemorycache UIอาจขอใหม่หลังHome/scene/time/routeเปลี่ยน 3Dgroundขอbasemap/textureatlasอีกชุดสูงสุด64tiles,4parallel,60s (planning-3d-satellite:110–160) Inspectortargetconfirmมีtilevalidationถึง64tilesแบบsequentialภายใน18s (trial-client:797–812) ทั้ง3D/context/confirmไม่ได้จับเวลาสดในรอบนี้ AnalyzeAIแยกS1→CPUlocal→ownedresult ไม่ใช่modelrunจากการเปิดbasemap

**cache/cancellationที่เป็นข้อเท็จจริงจากsource:** search/basemap5min/16entries,scenemetadata30min/128,map30min/32,tile5min/128หรือ16MiBทั้งหมดอยู่moduleMapต่อprocess (gee-imagery:7–9,48–54,140–151,194,205–210,298–300) ไม่มีsharedpersistentcache Tilekey=sessionId/z/x/y ขณะที่sessionสุ่มAES-GCMnonce (214–217,286–287) Clientblobcacheสูงสุด128/8MiBและcopyต่อเฉพาะsessionเดิม;tilefetchทุกmapflowcache:no-store ขณะที่responseprivate,max-age300จึงไม่เข้าVercelCDN (planning-basemap:119,138–146;trial-client:567;3d-satellite:142;gee-imagery:261–262) request.signalผ่านadapterแต่APIไม่ส่งเข้าserviceและserviceใช้controller25sของตัวเอง (api/gee:106;gee-imagery-api:29–36;gee-imagery:21,79–85) งานที่panยกเลิกอาจยังทำupstreamต่อ เหล่านี้เป็นเหตุที่อาจเพิ่มงานซ้ำ ไม่ใช่หลักฐานว่าเกิดquota/coldstartทุกครั้ง

**ผลจับเวลาProductionผ่านcurlจากเครื่องนี้:**

| รายการ | first-observed | repeat |
| --- | ---: | ---: |
| Basemapmanifest/12sourceimages | 0.887s | 0.336s |
| Tileเดิมตัวอย่าง | 3.257s | 0.732s |
| Selectedscene search | 1.393s | 0.330s |
| Selectedscene mapmanifest | 0.598s | 0.331s |
| Selectedscene tile | 1.162s | 0.826s |

8distinctbasemaptilesโหลด2batch×4ใช้wallรวม5.019s;ต่อtile0.851–3.257s/6,231–164,156bytes ทุกคำขอ17ครั้งHTTP200และX-Vercel-CacheMISS Imagerymanifestno-store/tilesprivate,max-age300 ไม่มีServer-TimingหรือX-XEDO-Cacheเพราะapi/gee:75–80ตัดheaderหลังออก จึงแยกauth/GEEcompute/servercache/networkไม่ได้ ผลrepeatเร็วขึ้นสนับสนุนประโยชน์จากreuseแต่ไม่ได้พิสูจน์cachehitที่ชั้นใด First-observedไม่ใช่verifiedcold/P95/SLA;8tilesนี้ไม่ใช่โหลดครบdefaultviewport20imagesและไม่รวมHTMLเวลาเริ่มต้น

**หน้าเว็บเริ่มต้นหนักอีกชั้น:** HEADProduction200/CDNHIT/Content-Length6,207,852bytesตรงขนาดdistปัจจุบัน scripts/build.mjsเรียกbuild-planning-file.mjs --gee-hostedซึ่งยังbundleportableinlineJS/CSS/imagesแบบsplitting:false/IIFE (build-planning-file:6–16,21–37,46) ตรวจartifactมี5dataimageoccurrencesรวมbase64characters4,620,324bytes;JSinline2,408,979bytes/CSS505,958bytes (ภาพบางส่วนอยู่ในJS/CSSจึงห้ามบวกซ้ำ) logo735,936bytesถูกแทนทุกsrcและมีbase64ซ้ำ ภาพsentinel-proof679,573bytesถูกembedเพื่อarchivedmodeด้วย localgzip3,732,249/localbrotliquality4=3,038,798bytesเป็นestimate ไม่ใช่wiremeasurementครบ Gzipheaderพบจริงแต่raw/gzipfullGETแต่ละรอบtimeout40sบนnetworkpathนี้ ไม่อ้างว่าbrowserทุกคนใช้40sหรือGEEเป็นต้นเหตุของdocumentdownload

**แนวทางแก้เรียงตามอาการ:** สำหรับopeningให้แยกhostedbuildจากportable,ใช้ภาพขนาดเหมาะ/โหลดแยก/แคชassetsและแยก3Dcodeเมื่อใช้งาน สำหรับpan/zoomให้reuseexistingboundedrecipe/sessionและcachetileตามimmutableasset/recipe/grididentityภายใต้expiryที่ตรวจแล้ว;คืนHTTPbrowsercacheที่เหมาะกับpublicimageryโดยไม่cacheprivateinspectorresponses;ส่งabortถึงupstream เพิ่มsanitizedstage timings/cachehitก่อนอ้างเวลาคำนวณGEE ลดsceneชุดbackgroundตามcoverageที่ต้องใช้/เลือกRGBก่อนoperationหนัก แล้วbenchmark dedicatedmaps.create+tilesเทียบpixelsโดยใช้inputเดียวกัน ต้องตรวจearthengine.maps.createและเสนอสิทธิ์แคบถ้าจำเป็น ไม่grantrole/เปลี่ยนIAMอัตโนมัติ MapIDยังคำนวณtilesแบบlazyจึงไม่รับประกันinstant;ไม่เปลี่ยนhigh-volumeเป็นสูตรสำเร็จเพราะGoogleระบุaverage latencyสูงกว่าและintermediatecacheน้อยกว่า คงsingleacquisitionprovenance/expiry/readiness/ownerisolationและ3steps/4calculators

**แหล่งอ้างอิงofficial:** [computePixels](https://developers.google.com/earth-engine/reference/rest/v1/projects.image/computePixels),[maps.create](https://developers.google.com/earth-engine/reference/rest/v1/projects.maps/create),[deferredexecution](https://developers.google.com/earth-engine/guides/deferred_execution),[processingenvironments](https://developers.google.com/earth-engine/guides/processing_environments),[bestpractices](https://developers.google.com/earth-engine/guides/best_practices),[quotas/cache](https://developers.google.com/earth-engine/guides/usage),[Vercelcacheheaders](https://vercel.com/docs/caching/cache-control-headers) maps.createต้องearthengine.maps.create;computePixelsต้องearthengine.computations.create readonlyOAuthscopeเพียงอย่างเดียวไม่พิสูจน์ว่าสิทธิ์mapsถูกปฏิเสธ

**Verification/สถานะ:** Sourceinspection+officialresearch+connectoridentity+browserguestmap+17liveimageryrequests+artifactsize/compressionmetadata+document/JSONvalidationเท่านั้น ไม่รันapplicationtest/build/CPUinference/newAIjob/DBmigrationหรือแก้source/Auth/IAM/env/Billing/subscription/paidresource ไม่commit/push/deploy Runtimequery1hretentionerrorแก้10mแล้วnoeventsไม่ใช่proofไร้error เก็บprobe/sanitizedreceiptsที่ignoredoutput/gee-latency-audit-2026-10-30 CanonicalสองMDและqueueอัปเดตผลaudit/remediationnotstarted โดยไม่เปลี่ยนacceptedstage/releasecoreหรือextendedqualificationเดิม ไม่มีคำถามผู้ใช้รอคำตอบ


### 3.52 ตัวเปิด CPU worker แบบคลิกเดียวและการเปิดเครื่องใหม่ — 30 ตุลาคม2026

**หัวข้อ/ขอบเขต:** ผู้ใช้ขอไฟล์เปิดCPUworkerแบบคลิกเดียว/คู่มือหลังปิด–เปิดเครื่องสำหรับงานนำเสนอและบันทึกสองMD ห้ามBilling/subscription Rootอ่านcanonical/queue/AGENTS/Gitก่อนลงมือ HEADa5612696a80470733da4155bd953d01d7b553bd4 ไม่มีการอนุญาตpush/deployใหม่ในคำสั่งนี้ ระหว่างทำอีกแชทเพิ่มauditGEE§3.51/geeMapLatencyAuditแล้ว Rootอ่านใหม่และmergeรักษาบันทึกนั้นทั้งหมด ไม่แก้GEEremediationหรือfrontendflow

**ผลที่ทำ:** เพิ่มStart-XEDO-CPU.cmdที่release-root ใช้workingdirectoryจากตำแหน่งไฟล์และPythonvenvเดิมโดยไม่ต้องพิมพ์คำสั่ง เปลี่ยนconsolecodepageเฉพาะหน้าต่างเป็นUTF8 ไม่เปลี่ยนExecutionPolicy/ไม่Runasadmin/ไม่ติดตั้งโปรแกรมหรือWindowsstartup task มีReconnect-XEDO-CPU.cmdสำหรับกรณีต้องเชื่อมบัญชีCPUใหม่ worker/launch_worker.pyแสดงCONNECTING/READY/WORKING/SAVED/RECONNECTING/STOPPEDและtilesจริง เก็บเฉพาะstate/time/codeในignoredlocal-data/local-ai-worker/launcher-status.json ไม่เก็บรหัส/JWT/providerresponseลงconsole/statusfile

**การป้องกันเปิดซ้ำ:** worker_guard.pyถือWindowsbyte-lockทั้งsessionFile+.worker.lockและworkRoot/.worker.lockก่อนอ่าน/refreshsession/RPC/recovercheckpoint ใช้ร่วมทั้งlauncherและdirectCLIrun/login/status/logout ตรวจdaemonเก่าที่ไม่มีlockจากเฉพาะPythonและexactXEDOscript/configโดยไม่echoargv/ข้อมูลบัญชี ไม่killตัวเดิมอัตโนมัติ SkipvenvredirectorparentเฉพาะกรณีPIDเป็นparentและargvตรงselfinvocation เพื่อไม่มองโปรแกรมตัวเองเป็นอีกworker เมื่อOSปิดprocessจะปล่อยlockเอง ไม่ต้องลบmarkerfileหลังreboot

**Session/reconnect:** ปกติเปิดWindowsuserเดิมและเก็บenvironment/model/config/DPAPIไว้แล้วStartใหม่ได้ โปรแกรมrefreshaccessตามวิธีเดิม CPUaccountแยกInspectorwebsitecookie ถ้าrefreshendpointตอบ400/401/403จะแปลงเฉพาะกรณีrefreshเป็นMACHINE_SIGN_IN_REQUIRED ไม่เหมารวมRPC400ทุกชนิด ExplicitReconnect/loginข้ามloadoldDPAPIที่เสียและเก็บciphertextเดิมไว้จนpasswordgrant+machineregistrypresenceผ่าน จึงไม่ลบsessionเดิมเมื่อรหัสผิดหรือเผลอใช้Inspector ไม่อ่านpasswordmanager/clipboardและไม่ให้ผู้ใช้ส่งpasswordในแชท ไม่มีการเปลี่ยนAuthconfig/role/user/schema

**ทดสอบจริง:** offlinecheck-onlyผ่านและไม่อ่านsession/เรียกnetwork;Pythonunittest84pass/0fail/0skipรวม15casesใหม่ GuardWindowsข้ามprocessจริงตรวจsession/workRootexclusiveและlockreleasedหลังterminatefixture/stalefile;CLIผ่านWindowsvenvbootstrap;legacyprocesspathมีspace/&;duplicateไม่แตะsession/statusเดิม;refresh400/401/403และcorruptsession/wrongaccountไม่รั่วsecretหรือทับsessionเดิม ผลfocusedlauncher10และremote19รอบก่อนเป็นsubsetไม่บวกนับซ้ำ รอบแรกfull81มีWinError5replacefileในfixturecorruptsessionหนึ่งครั้ง เก็บfailureไว้;focused19/full81/82ผ่านเมื่อรันซ้ำ และfinal84ผ่านหลังเก็บedgecasesสุดท้าย ไม่อ้างรอบแรกผ่าน ไม่มีการแก้atomicreplaceเพราะไม่เกิดซ้ำ

**Startupกับระบบจริง:** launcherตรวจdaemonเดิมพบALREADYOPENและไม่เปิดซ้ำ Rootยืนยันไม่มีactive.json/งานกำลังประมวลผลก่อนหยุดexecworkerเดิมด้วยCtrl+C จากนั้นใช้launch_worker.py --onceเชื่อมprotectedCPUsessionเดิมสำเร็จ→READY→waiting→STOPPED ไม่มีnewjob/inferenceหรือpasswordgrant RootเปิดStart-XEDO-CPU.cmdจริงผ่านWindowsในหน้าต่างปกติจากworkingdirectoryอีกที่(C:/mega/codex/iENA) ได้READY แล้วเปิดซ้ำพบALREADYOPEN/ไม่เกิดworkerตัวที่สอง ปล่อยหน้าต่างนี้ไว้ให้ผู้ใช้ ไม่มีการshutdown/rebootWindowsจริง การทดสอบจำลองหยุด–เริ่มโปรแกรม+filelockcrashไม่ใช่หลักฐานfullOSreboot

**วิธีหลังปิดเครื่อง:** Saveบนเว็บและรอSAVED/READYก่อนปิดworker/เครื่อง;เปิดเครื่องด้วยWindowsuserเดิม→ต่อinternet→ดับเบิลคลิกStart-XEDO-CPU.cmd→รอREADY→เปิดxedo-eight.vercel.appและSign inInspectorหากcookieหมดอายุ ไม่ต้องเปิดCodex/localQAserver/ติดตั้งหรือสร้างบัญชีซ้ำ งานที่บันทึกสำเร็จอยู่Supabaseเปิดย้อนหลังได้เมื่อCPUปิด แต่Analyzeใหม่ต้องPC/worker/internetและGEEพร้อม ถ้าปิดระหว่างประมวลผลไม่รับรองต่อtile/%เดิม ให้ตรวจjob/lease/recovery ไม่ลบactive.jsonเอง CPUจะretryconnectionแบบจำกัดแล้วอาจหยุด ให้แก้internetและStartใหม่ ย้ายไปคนละคอม/Windowsuserต้องเตรียมenvironmentและเชื่อมCPUใหม่ตามDPAPI ไม่คัดลอกsessionไปใช้ตรง ๆ

**ไฟล์และการเผยแพร่:** เพิ่มStart-XEDO-CPU.cmd,Reconnect-XEDO-CPU.cmd,workers/local-ai/{launch_worker.py,worker_guard.py,tests/test_launcher.py},docs/CPU_WORKER_START_GUIDE.md;แก้remote_worker.py/tests/test_remote_worker.py/README.md/.vercelignoreและcanonicalสองMD/queue .vercelignoreกันสองcmdเพิ่ม;workersเดิมถูกexcludeแล้ว ไม่มีweights/DPAPI/envเข้าGit Evidenceอยู่outputs/XEDO_CPU_Launcher_2026-10-30และignoredoutput/local-ai-launcher-tests*.txt ผลNode611/build3/Productionreleaseใน§3.49–3.50เป็นรอบก่อน ไม่รันเว็บtests/build/CI/ใหม่ในรอบนี้ ไม่commit/push/deploy/Billing/subscription/paidresource/SQL/IAM/APIsettingsหรือpowerplan ไม่มีคำถามผู้ใช้รอคำตอบ

**ที่มา/ข้อจำกัด:** Supportอ่านsourceและreviewข้อ2refresh/reconnectซึ่งRootแก้พร้อมtests ไม่แก้application/canonical DocsSupabasechangelog.mdอ่านผ่านwebไม่ได้เพราะcontenttype จึงใช้หน้าofficialchangelogHTMLและUser sessions ตรวจหลักการrefresh ไม่ได้เปลี่ยนนโยบายsessionในDashboard Windowsworkerยังผูกเครื่องนี้/บัญชีเดิม การปิดหน้าต่าง/PCอาจทำให้webReadyค้างจนpresenceหมดอายุประมาณ180s;launcher-statusบนdiskเป็นsnapshot ไม่ใช่livehealthถ้าprocessถูกฆ่า ผลทดสอบและข้อจำกัดอยู่REPORT.md ไม่รับรอง100jobs/monthlongsoak/ทุกเครือข่ายหรือphysicalrebootที่ยังไม่ได้รัน


**ปิดตรวจรุ่นตัวเปิดสุดท้าย:** รับprocessingeventแล้วเปลี่ยนWORKINGทันทีก่อนprogressแรก ไม่คงREADYระหว่างbootstrap;ก่อนวนคิวใช้CONNECTINGแทนREADYจนได้รับwaitingจริง ทดสอบrefreshสั้น/401ไม่ให้persistก่อนmachineregistryผ่านด้วยdirectpresence-requestในlogin ไม่มีautorefreshบนloginที่ยังไม่verify Pythonfinal84pass/0fail/0skip และอัปเดตsourcehashesแล้ว Rootตรวจidle/ไม่มีactive.jsonและidentityหน้าต่างทดสอบเฉพาะที่สร้างไว้ก่อนหยุดแล้วเปิดStart.cmdใหม่ให้โหลดsourceสุดท้าย เก็บstartup-receipt.json/READYsnapshot ไม่มีnewjob/OSreboot/เปลี่ยนบัญชีหรือpublishเพิ่ม


### 3.53 Desktop Shortcut สำหรับเปิด CPU worker และตรวจ READY — 30 ตุลาคม2026

**หัวข้อ/ขอบเขต:** ผู้ใช้อนุญาตสร้างShortcutของStart-XEDO-CPU.cmdบนDesktopและทดสอบเปิดแล้วREADY พร้อมบันทึกสองMD ไม่เปิดBilling/subscription Rootอ่านcanonical/queue/Gitและรักษาdirtylauncher/คู่มือ/otherchatGEEauditที่มีอยู่จากรอบก่อน HEADยังa5612696a80470733da4155bd953d01d7b553bd4 ไม่มีคำสั่งpush/deployหรือแก้applicationใหม่

**ผลสร้างไฟล์:** ใช้WindowsknownDesktopพบว่าDesktopอยู่OneDrive สร้างXEDO CPU Worker.lnkในตำแหน่งDesktopของWindowsuserนี้ผ่านWScript.Shell ไม่ย้ายตัวStart.cmd/model/config/DPAPI ตั้งTargetPathเป็นrelease/Start-XEDO-CPU.cmdเดิม,WorkingDirectoryเป็นrelease-root,Argumentsว่าง,WindowStyle1,Iconcmd.exe0 ตรวจCreateShortcutreadbackและbinaryLinkFlagsRunAsUser0x2000=false ไม่ใช้admin/ไม่เพิ่มWindowsStartupหรือเปลี่ยนExecutionPolicy/PowerPlan หากชื่อเดิมชี้คนละที่โค้ดสร้างจะรักษาไฟล์เดิมและใช้ชื่อPresentation ไม่overwriteของอื่น รอบนี้ใช้ชื่อXEDO CPU Worker.lnkตามปกติ

**ทดสอบใหม่จริง:** ก่อนเปิดShortcutตรวจlauncher-statusเป็นREADY/ไม่มีworkRootactive.jsonและยืนยันexactscriptในหน้าต่างทดสอบเดิมที่สร้างใน§3.52 จึงหยุดเฉพาะprocess/windowนั้นขณะidle ไม่killโปรแกรมอื่น จากนั้นShellExecuteผ่านStart-Processที่Targetเป็นDesktop.lnkโดยตรง ไม่ใช่เรียกStart.cmdข้ามShortcut พบconsoleใหม่และchildlaunch_worker.pyที่เริ่มหลังactivation พร้อมREADYsnapshotที่timestampใหม่กว่าactivation ตรวจreadbackREADYและprocesslivenessควบคู่ ไม่ใช้ALREADYOPENexit0หรือREADYเก่าเป็นproof ไม่ต้องกรอกรหัสCPUใหม่และไม่มีการอ่าน/ใส่passwordโดยagent

**วิธีใช้งาน:** หลังเปิดเครื่องด้วยWindowsuserเดิมและต่อinternet ดับเบิลคลิกไอคอนXEDO CPU WorkerบนDesktop→รอREADY→เปิดเว็บxedo-eight.vercel.appและSign inInspectorหากถูกขอ เปิดหน้าต่างworkerค้างไว้สำหรับAnalyzeใหม่ ใช้กับเครื่องเดิมที่เตรียมenvironment/model/configไว้ ShortcutในOneDriveไม่ได้ทำให้โมเดล/โปรแกรมติดตั้งพร้อมใช้บนเครื่องอื่น ก่อนปิดเครื่องSaveภารกิจและรอSAVED/READYตามCPU_WORKER_START_GUIDE.md

**ไฟล์/หลักฐาน:** ไฟล์ใหม่อยู่นอกcheckoutเฉพาะDesktop.lnkตามที่ผู้ใช้อนุญาต ที่อยู่จริง/target/workingDirectory/flags/readback/activation/process/READYtimestampsเก็บในoutputs/XEDO_CPU_Desktop_Shortcut_2026-10-30/{shortcut-receipt,prior-window-stop,activation,ready-receipt}.jsonและREPORT.md อัปเดตcanonicalสองMD/queue/คู่มือเท่านั้น ไม่แก้launcher/source/website และไม่ย้าย/ลบไฟล์งานเก่าหรือเก็บsessiondataในShortcut

**Verification/publication:** รอบนี้ตรวจShortcutmetadata+WindowsShellactivationจริง+existingmachineconnection+freshREADY/processlivenessและMarkdown/JSON/diffchecks ไม่รันPython84/Node/build/CIใหม่เพราะไม่ได้แก้source ผล84เป็นรอบ§3.52 ไม่ใช่รันซ้ำในรอบนี้ ไม่มีnewAIjob/inference/DBschema/Authsettings/IAM/Billing/subscription/paidresource/commit/push/deployหรือOSreboot เปิดหน้าต่างworkerใหม่ไว้ในสถานะREADY ไม่มีคำถามผู้ใช้รอคำตอบ

<!-- gee-supabase-persistent-cache-design-2026-10-30 -->
### 3.54 Supabase persistent map-tile cache: ความเป็นไปได้และข้อกำหนด — 30 ตุลาคม2026

**หัวข้อ:** ผู้ใช้ถามว่าต้องโหลด/ประมวลผลแผนที่ใหม่ทุกครั้งหรือไม่ และเก็บพื้นที่ที่เคยเปิดในSupabaseเพื่อเลื่อนกลับมาใช้ซ้ำได้หรือไม่ รอบนี้อธิบายความเป็นไปได้/แนวทาง ไม่อนุมานเป็นคำสั่งสร้างbucket/schema/implementation/deploy

**สรุป:** ทำpersistenttilecacheด้วยSupabaseได้ ควรเก็บไฟล์PNGในSupabaseStorageและindex/recipe/size/อายุในPostgres แก้ความเข้าใจว่าเว็บเดิมไม่ได้คำนวณใหม่ทุกครั้ง: currentmanifest/blobภายใต้sessionเดิมและwarmservermemoryช่วยreuseได้ แต่หลุดเมื่อsession/viewport/processเปลี่ยนหรือหมดcache จึงมีโอกาสประมวลผลซ้ำเมื่อกลับพื้นที่เดิม Cachehitยังอาจต้องดาวน์โหลดไฟล์ ยกเว้นbrowserมีภาพอยู่แล้ว ไม่รับประกันinstantหรือเวลาที่ลดได้ก่อนทดสอบ

**รายละเอียดพฤติกรรมที่เสนอ:** เข้าareaAครั้งแรก→หาtileที่ตรงrecipeในcache→missเรียกGEE/validatePNG→saveStorageพร้อมindex→แสดง;เลื่อนไปBแล้วกลับA→hitโหลดPNGที่เก็บไว้โดยไม่คำนวณpixelsของtileเดิมซ้ำ ทำเฉพาะtileที่ใช้งานจริง ไม่preloadทุกพื้นที่/ทุกระดับzoomและไม่โหลดTIFFต้นฉบับทั้งหมดเข้าDB Metadataค้นหาlatestrecipeยังอาจต้องrefreshGEEตามนโยบาย แยกความสดของsourceออกจากอายุsession30minและอายุเก็บPNG ภาพที่เก็บแล้วต้องระบุacquisition/versionเดิม ไม่ยกreadiness/confirmationเก่ากลับมาถูกต้องอัตโนมัติ

**ข้อกำหนดcacheidentity:** keyต้องเป็นimmutablecollection+orderedassetIDs+mosaicorder+renderrecipeversion/RGB/gamma/range+projection/grid+z/x/y+clipping/coverageidentity ไม่ใช้randomsessionURLหรือพิกัดz/x/yอย่างเดียว ปัจจุบันgee-imagery.js:176–202เลือกsceneตามviewportและclipตามsession.bbox;tileเดียวกันคนละviewportอาจต่างscene/ขอบโปร่งใส หากต้องreuseข้ามviewportให้เปลี่ยนเป็นboundedcanonicalregion/recipeที่เสถียรและrenderfulltile หรือรวมexactbboxในkeyโดยยอมรับhitต่ำลง ต้องคงvalidation/ขอบเขตการเข้าถึงตามเดิม รับหลายrequesttileเดียวกันต้องdedup/claimเพื่อไม่compute/uploadซ้ำและpublishเฉพาะไฟล์ที่validateแล้ว ไม่cacheerrorเป็นimage

**การจัดเก็บ/สิทธิ์/ขนาด:** Storageเก็บไฟล์;DBเก็บrecipehash,objectpath,tilecoords,acquisitions,size/hash,createdAt/lastAccess/retentionและstate รูปพื้นหลังกับmission/owner/AOI/history/confirmationแยกกัน การเป็นpublicSentineldataไม่อนุญาตเผยแพร่privateAOIหรือประวัติเปิดพื้นที่ Publicbucket/sharedindexไม่ถูกอนุมานเป็นค่าเริ่มต้น แนวทางเริ่มprivatebucketผ่านsame-origingatewayเดิมและตรวจsession;sharedcanonicalpublicrasterพิจารณาแยกอย่างชัดเจน ห้ามservice_rolesecretลงbrowser ให้browser/HTTPcacheช่วยชั้นแรกและStorageช่วยข้ามreload/serverinstances บังคับเพดานcacheและcleanupเก่าผ่านStorageAPIตามงบพื้นที่/egressจริง ตัวอย่างสมมติ1,000tiles×100KB≈100MBไม่ใช่ประมาณการพื้นที่ใช้งานจริงของบัญชี

**ข้อมูลofficialที่ตรวจใหม่:** SupabaseStorageมีCDNสำหรับassets;SmartCDNแยกเป็นProขึ้นไป จึงไม่ควรวางdesignFreeให้ต้องพึ่งSmartCDN เอกสารปัจจุบันระบุStorageFree1GBแต่ยังไม่ได้อ่านquotausage/remaining/egressจริงของprojectนี้ ห้ามอ้างfreeแน่นอน/มี1GBว่างทั้งหมด หรือเปิดsubscriptionโดยอัตโนมัติ Changelog.mdfetchถูกwebปฏิเสธcontenttypeจึงอ่านHTMLchangelogและdocsหัวข้อStorage/CDN/downloads/usageแทน: [StorageCDN](https://supabase.com/docs/guides/storage/cdn/fundamentals),[SmartCDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn),[servingassets/privatebuckets](https://supabase.com/docs/guides/storage/serving/downloads),[storageusage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)

**Verification/งานเหลือ/เผยแพร่:** อ่านAGENTS/currentlog/queue/Gitและsourcecacheที่เป็นเจ้าของ Helpersอ่านตรวจidentity/clippingตรงกัน อัปเดตcanonicalสองMDกับqueuefollowupเท่านั้น ไม่แก้application/worker/SQL/Auth/RLS/env/IAM ไม่สร้างStoragebucket/objectsหรืออ่านaccountusageจริง ไม่รันapplicationtests/build/GEEcompute/AIjob/inference/APIbenchmarkใหม่ ผล17requests/เวลา§3.51เป็นรอบก่อน ไม่อ้างเป็นfreshรอบนี้ ไม่มีcommit/push/deploy/Billing/subscription/paidresource รักษาdirtyfilesจากlauncher/Desktopและauditก่อนหน้า ไม่มีคำถามผู้ใช้รอคำตอบ การเลือกretention/งบcache/permissionmodelยังเป็นข้อเสนอทางimplementationไม่ใช่pendinganswerที่ไปถามผู้ใช้แล้ว

<!-- supabase-free-storage-capacity-answer-2026-10-30 -->
### 3.55 โควต้าเก็บข้อมูล Supabase Free — 30 ตุลาคม2026

**หัวข้อ:** ผู้ใช้ถามว่าSupabaseแบบฟรีเก็บได้กี่GB ในบริบทการเก็บภาพแผนที่GEEไว้ใช้ซ้ำ

**สรุป:** ตรวจofficialpricingใหม่30ต.ค.2026 ยืนยันFileStorage1GBและDatabase500MBเป็นคนละส่วน ภาพPNGcacheใช้โควต้าStorage1GB ส่วนrecipe/index/missionใช้DB500MB ไม่ใช่นำมารวมเป็นพื้นที่ไฟล์1.5GB และStorage1GBเป็นเพดานความจุไม่ใช่เพิ่มความจุให้สะสม1GBทุกเดือน นี่เป็นโควต้าแพ็กเกจไม่ใช่พื้นที่เหลือจริงของบัญชีซึ่งรอบนี้ไม่ได้อ่าน

**รายละเอียด/ตัวอย่าง:** สมมติtileละ100KB ถ้าใช้Storage1GBทั้งหมดจะอยู่ราว10,000tilesก่อนหักไฟล์อื่น/รายละเอียดการนับหน่วย เป็นตัวอย่างเลขคณิตไม่ใช่ขนาดเฉลี่ยจริงหรือรับรองพื้นที่ครอบคลุมกี่km² Officialpricingและegressdocsยังระบุuncachedegress5GB/monthกับcachedegress5GB/monthแยกกัน ไม่ใช่ความจุเก็บไฟล์ และไม่ใช่pool10GBที่ใช้แทนกันได้ ไม่ยืนยันaccountremaining/freeguaranteeหรืออ้างตัวเลขbillingของผู้ใช้

**หลักฐาน/ขอบเขต:** [Supabasepricing](https://supabase.com/pricing),[Storageusage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size),[Egressusage](https://supabase.com/docs/guides/platform/manage-your-usage/egress) อ่านlog/queue/Gitล่าสุดและรักษาdirtyงานlauncher/auditก่อนหน้า รอบนี้source-documentlookup/เลขคณิตและบันทึกสองMDเท่านั้น ไม่อ่านDB/Storageusageจริง ไม่เปลี่ยนapplication/schema/bucket/Auth/RLS/env/IAM/Billing/subscription ไม่รันtest/build/GEE/AIjob/inferenceหรือวัดperformanceใหม่ ไม่commit/push/deploy คิวสถานะและrequirementไม่เปลี่ยน ไม่มีคำถามรอคำตอบ


### 3.55 ยืนยันขั้นตอนปิดเครื่องและกลับมาใช้งานจาก Desktop Shortcut — 30 ตุลาคม2026

**หัวข้อ:** ผู้ใช้ถามยืนยันว่าปิดคอมได้ แล้วเปิดใหม่ดับเบิลคลิกXEDO CPU WorkerรอREADYและใช้เว็บไซต์ได้หรือไม่ เป็นคำถามวิธีใช้งาน ไม่ใช่คำสั่งให้agentปิดเครื่อง

**สรุป/คำตอบ:** ใช่ ให้Saveภารกิจ/รอบันทึกสำเร็จบนเว็บและไม่มีงานAnalyzeกำลังทำก่อน ปิดหน้าต่างworkerแล้วShutdownตามปกติ หลังเปิดเครื่องใช้Windowsuserเดิม/ต่อinternet→ดับเบิลคลิกShortcut→รอREADYและเปิดหน้าต่างค้างไว้→เปิดxedo-eight.vercel.app/Sign inInspectorหากsessionหมดอายุ→AnalyzeหรือเปิดMy missions/historyได้ ปกติไม่ต้องติดตั้ง/ตั้งระบบหรือกรอกรหัสCPUใหม่หากprotectedsessionเดิมยังใช้ได้;ถ้าCPUขึ้นSTOPPED/ขอเชื่อมใหม่ให้ทำตามคู่มือReconnect ไม่รับรองเน็ตทุกสถานที่หรือsessionไม่ถูกยกเลิกตลอดไป

**ผลตรวจสด/ขอบเขต:** อ่านcurrentlog/queue/Gitและlocalstatus ตรวจเฉพาะprocessลูกlaunch_worker.pyของหน้าต่างShortcutที่เปิดไว้จริง พบprocessalive/stateREADY/ไม่มีactive.json ตามshutdown-guidance-check.json ยังไม่ได้ตรวจunsavedbrowserchanges จึงกำชับSaveก่อนปิด ไม่หยุดโปรแกรมหรือShutdown/rebootเครื่อง ไม่แก้source/บัญชี/SQL/Billing/subscription ไม่สร้างjob/รันinference/ชุดทดสอบ/build/CI/push/deployใหม่ อัปเดตcanonicalสองMDและqueueเพื่อเก็บคำตอบ รักษาotherchatcache-design§3.54และdirtyfilesเดิม ไม่มีคำถามผู้ใช้รอคำตอบ

<!-- supabase-live-usage-cache-budget-2026-10-30 -->
### 3.56 ตรวจ Supabase ใช้พื้นที่จริงและงบแคชภาพ — 30 ตุลาคม2026

**หัวข้อ:** ผู้ใช้สั่งตรวจSupabaseปัจจุบันใช้/เหลือพื้นที่เท่าไรและแบ่งเก็บmapcacheได้เท่าไร รอบนี้อนุญาตตรวจบัญชีและประเมินเท่านั้น ไม่สร้างcache/bucketหรือแก้เว็บ

**สรุปผลสด 19:14–19:17น. Asia/Bangkok:** Supabaseconnectorยืนยันxedo/tstmjnlhwidwtzetqxbu ACTIVE_HEALTHY/eu-west-1 อยู่organization rphjcbkprrafgiregduu แพ็กเกจFreeจริง Chromeที่sign-inอยู่เปิดorganizationUsageได้/Allprojects/รอบ21ต.ค.–21พ.ย.2026 แสดงStorage0/1GB,Database0.028/0.5GB(6%),Egress0.003/5GB,CachedEgress0/5GBและไม่เกินquota ดังนั้นStorageเหลือประมาณ1GB,DBเหลือประมาณ0.472GBตามsummary และegressเหลือประมาณ4.997GB/cached5GB คนละpool

**SQLอ่านอย่างเดียว:** เวลา12:14:01UTCตรวจStoragebucket0/object0/size0bytes/missingmetadata0 จึงยืนยันXEDOไม่มีไฟล์ในStorageจริง ไม่ใช่แค่dashboardปัดเศษ Mainpostgres12,416,691bytes;template1 7,755,443/template0 7,520,783 รวม27,692,917bytes≈27.69decimalMB≈26.41MiBตรงcurrentXEDOที่dashboardแสดง26.41MB อย่าใช้mainpostgres12.4MBเป็นdatabaseทั้งหมดหรือใช้physicaldisk2GBเป็นFileStorage DBschemaaggregateพบxedo_private917,504bytesแต่ไม่อ่านmissioncontent/credential/authrecords ไม่มีserverfilesystemquery Projectอื่นในorganization1รายการINACTIVE ไม่unpauseหรือqueryDBของprojectนั้น ใช้AllprojectsUsageสำหรับยอดรวม

**ข้อเสนอจัดสรร:** เริ่มcachePNG200MB(decimal)และเผื่อไฟล์อื่นประมาณ800MB ถ้าใช้จริงแล้วต้องเพิ่มให้พิจารณาเพดาน500MB/เหลือสำรองประมาณ500MB ไม่ใช้Storageเต็ม1GB จำนวนประมาณเมื่อสมมติ100–150KB/tile:200MBได้1,333–2,000tiles;500MBได้3,333–5,000tiles ข้อมูลวัดเก่า8distincttilesจาก§3.51รวม537,195bytes/mean67,149.375/median48,075.5/min6,231/max164,156 ถ้าเฉลี่ยเท่าชุดนั้นจะได้2,978/7,446tilesตามลำดับ แต่8ภาพที่zoom/recipeเดียวไม่รับรองmeanทั้งระบบหรือพื้นที่km² ไม่รันGEEใหม่ในรอบนี้ ให้บังคับbytebudget/cleanupไฟล์เก่าที่ไม่ใช้/ป้องกันงานซ้ำและรักษาrecipe/clip/expiryตาม§3.54 IndexในDBแยกจากPNGStorage

**ข้อจำกัดตัวเลข:** DashboardUsageระบุrefreshอาจช้าถึง1ชั่วโมงและpanelรายวันอาจถึง24ชั่วโมง ตัวเลข0.028/0.5GBและ26.41MBมีฐานหน่วย/roundingต่างกัน จึงใช้summaryหน่วยเดียวกันคำนวณremainingโดยประมาณ ไม่เรียกSQLsnapshotว่าbillingremainingแบบexact การลดGEEcomputeยังต้องดาวน์โหลดไฟล์ซึ่งใช้egressและquotaอื่นของเว็บร่วมกัน Egress5GBและcached5GBไม่ใช่pool10GBที่ใช้แทนกันได้ ข้อเสนอ200/500MBยังไม่ได้จอง/เปิดbucket/เขียนภาพหรืออนุมัติimplementationใหม่

**หลักฐาน/verification/publication:** เก็บsanitizedusage-receipt.json/connector-receipts.jsonและrecord-usage.mjsในignoredoutput/supabase-usage-2026-10-30 แหล่งหน้า[Usage](https://supabase.com/dashboard/org/rphjcbkprrafgiregduu/usage)และofficial[storageusage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)/[database-size](https://supabase.com/docs/guides/platform/database-size)/[egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress) Connectorมีmetadata/SQLแต่ไม่มีbillingusageendpointจึงใช้ChromeUIอ่านmetric;IABไม่ได้sign-inจึงไม่กรอกcredentialหรือเริ่มlogin ใช้Chromeexistingauthโดยไม่อ่านpassword/token/sessiondata Helpersคำนวณจากreceiptเก่า/อ่านofficialdocsเท่านั้น อัปเดตcanonicalสองMDและqueue.liveQuotaRead/measurement/recommendedbudget รักษาdirtylauncher/shortcut/auditและทั้งสองหัวข้อ3.55ที่แชทอื่นเขียนไว้ ไม่แก้application/worker/SQLschema/Auth/RLS/IAM/env ไม่สร้างbucket/object/AIjob/GEEcompute/CPUinference ไม่รันtests/build/CI ไม่commit/push/deploy ไม่เปิดBilling/subscription/paidresource ไม่มีคำถามผู้ใช้รอคำตอบ

<!-- supabase-cache-speed-expectation-2026-10-30 -->
### 3.57 เปรียบเทียบความเร็วที่คาดจาก Supabase map cache — 30 ตุลาคม2026

**หัวข้อ:** ผู้ใช้ถามความเห็นว่าวิธีเก็บmaptileในSupabaseเร็วกว่าวิธีเดิมหรือไม่ รอบนี้ตอบการเปรียบเทียบ ไม่ใช่คำสั่งลงมือ

**สรุป:** คาดว่าจะลดเวลารอในกรณีกลับมาดูtile/zoom/sourceversionเดิมที่persistentcacheมีอยู่แล้ว โดยเฉพาะข้ามsession/reloadหรือเมื่อmemorycacheเดิมหาย เพราะไม่ต้องให้GEEคำนวณpixelsของช่องนั้นใหม่ แต่ยังไม่มีSupabasecacheimplementation/benchmarkจึงไม่รับรองseconds/percentage/กี่เท่า Currentbrowsermemoryhitควรใช้ก่อนเพราะไม่ต้องnetwork;ไม่ควรอ้างpersistentcacheเร็วกว่าRAMcacheเดิมทุกครั้ง

**รายละเอียด:** cachemiss/พื้นที่ใหม่ยังต้องGEEและเพิ่มlookup/upload หากรอuploadก่อนแสดงอาจช้าลง ควรวางsaveให้ไม่เพิ่มเวลารอผู้ใช้โดยยังใช้durable/reliablecompletionที่runtimeรองรับ ไม่ปล่อยunawaitedtaskในserverlessแล้วอ้างว่าเก็บสำเร็จ แคชhitให้directlookupด้วยimmutablekeyโดยไม่listทั้งbucketหรือserialDBqueryต่อtile คงboundedparallel/browsercacheก่อนStorage/sourcefreshnessและidentity/clip/ownerguardsจาก§3.54 การเปลี่ยนzoom/วันที่หรือrecipeอาจmiss วิธีนี้ไม่ลดHTMLเริ่มต้น6.2MBโดยตัวมันเอง ผลเก่าtile3.257→0.732sและ8tiles5.019sที่§3.51เป็นGEEgatewayเดิม ไม่ใช่Supabasecachedeliverybenchmark

**หลักฐาน/verification/publication:** อ่านcurrentlog/queue/Gitและreceiptเดิม พร้อมตรวจofficial[StorageCDN](https://supabase.com/docs/guides/storage/cdn/fundamentals)และ[Storageoptimizations](https://supabase.com/docs/guides/storage/production/scaling) ยืนยันหลักการCDN/browsercache ไม่ใช้เอกสารแทนmeasuredperformanceของแอป Helperตรวจขอบเขตคำกล่าวอ้างตรงกัน อัปเดตcanonicalสองMDเท่านั้น คิวrequirement/statusไม่เปลี่ยน ยังคงproposal/cache200MBเริ่มต้น/ยังไม่implement ไม่ตรวจaccountusageหรือรันGEE/API/benchmark/tests/buildใหม่ ไม่แก้application/worker/schema/bucket/Auth/RLS/IAM/env ไม่commit/push/deploy/Billing/subscription รักษาdirtyงานแชทอื่นทั้งหมด ไม่มีคำถามผู้ใช้รอคำตอบ


<!-- post-reset-website-check-2026-10-30 -->
### 3.58 ตรวจเว็บไซต์ใหม่หลังผู้ใช้แจ้ง reset — 30 ตุลาคม2026

**หัวข้อ/ขอบเขต:** ผู้ใช้แนบภาพCPUworkerREADYและให้ตรวจwebsiteใหม่หลังreset Rootอ่านcanonical/queue/Gitและภาพจริง รักษางานdirtylauncher/shortcut/GEEaudit/cache-design/usage/estimateของอีกแชท ไม่resetDB/บัญชี/ไฟล์missionหรือปิดworker ไม่ถือภาพREADYอย่างเดียวเป็นproofwholeflow รอบนี้ตรวจเว็บไซต์/CPUจริงและเก็บQAmissionใหม่หนึ่งรายการ ไม่แก้productsourceหรือpublish

**Production/แผนที่สด:** เปิดhttps://xedo-eight.vercel.app/ใหม่ในChrome ไม่ใช้ambientlocalauditreportเป็นเว็บที่ทดสอบ เห็นสามขั้นตอนและSentinel-2basemap20images/2–27ต.ค.โหลดได้ Vercelhostnamealiasยืนยันdpl_EG7VyQiMMZpdXuSxmeSLep3KcsGmREADY/maina5612696a80470733da4155bd953d01d7b553bd4 การlookupURLมีschemeครั้งแรกไม่คืนidentity จึงแก้เป็นhostnameและใช้ผลที่ตรวจแล้ว ไม่วัดHTMLfullbodyhash/CIใหม่ในรอบนี้

**Login/ข้อมูลเดิม:** Browserใหม่เริ่มGuestตามsession จึงเปิดLoginและขอให้ผู้ใช้Sign inInspectorเดิม ผู้ใช้ตอบเข้าแล้วและRootเห็นSigned inจริง ไม่อ่าน/กรอกpassword/tokenเอง SignedAPIผ่านexistingInspectorDPAPIsessionเดิมแยกตรวจworkerOnline=trueและmissions9รายการ (APIproofไม่ใช้แทนbrowser) จากนั้นUIเปิดHistoryเดิมVersions3/2/1→เปิดv3 สำเร็จ manualtarget4จุด/Confirmedreviewv2completeกลับมาครบ รายการรอSign inจากช่วงตรวจแรกปิดแล้ว ไม่ต้องถามซ้ำ ข้อความรอในประวัติ§3.59เป็นsnapshotก่อนผู้ใช้ตอบ ไม่ใช่currentpending

**งานใหม่จริงผ่านUI:** สร้างQA Post-reset — CPU check 2026-10-30 แยกภารกิจเดิม นำเข้าRayongAOI4.83กม²(grid5.0172กม²) กดAnalyzeและยืนยันเพียงหนึ่งงาน เห็นSearchingSentinel-1→DownloadingSAR→SucceededและNew AI result loadedอัตโนมัติ job2eaf0ef1-3402-4d80-97dc-30f3f59aec49/created2026-10-30T12:45:02.857258+00:00/resultXEDO_LOCAL_RESULT_2014433eff08423c85684c51b63ad985 เป็นjobใหม่ต่างจากphase7 ไม่รันqualify-production-ai.pyซ้ำเพราะharnessนั้นใช้checkpointตามHTMLhashและอาจreuseงานเก่า

**ผล CPU สด:** pipeline34.867s/inference0.399s/nativepeak510.684MiB ใช้SAR26ต.ค.23:00:37UTC/analysis30ต.ค.12:45:44UTC/checkpoint41a2bd4b5b23/threshold0.3 Valid48679/total50172pixels/NoData1493 ได้0candidateและcandidate/valid/NoDataroundtripต่าง0 เป็นหนึ่งงานเล็กและเวลาเฉพาะpipeline ไม่ใช่end-to-endSLA/P95/200กม²/100jobsเดือน ZeroCandidateไม่ยืนยันว่าไม่มีน้ำมัน

**Editor/ภาพ/planner/Save:** วาดmanual4จุดในแผนที่จริงด้วยmouseและdoubleclickfinish แก้หนึ่งvertexผ่านช่องGeoJSON/Apply โหลดS2วันที่22ต.ค.cloud14.1%จนImageReadyและpixelsvalidated ยืนยันพื้นที่→Confirmedreviewv2/manual/completeและsaved จากนั้นPrepare→route2.21km→Savev3 UIแสดงMission saved privately as version3 APIreadbackยืนยันmission67479507-8eb3-4b7d-b9c7-28bc10379afd/revision3/savedanalysisRefผูกresultใหม่ HistoryของQAใหม่มีVersions3/2/1 เปิดv3กลับมา SavedAIreviewrestored/Confirmedv2complete/ทุกcoordinateตรงdraftที่แก้แล้ว การเทียบgeometryใช้typeและorderedcoordinatearrays ไม่เปรียบJSONstringที่ลำดับobjectkeysต่างกัน Newmissionreadonlyreopenให้reloadcontextimageก่อนPrepareตามเดิม ไม่มีการSaveแก้ภารกิจเดิม QA Production browser — area analysisยังrevision3

**Flight readinessที่คงไว้:** Routepreviewสำเร็จ แต่ดาวน์โหลดflightfileยังล็อกเมื่อHome/airspace/dronebatteryinputsไม่ครบตามเกณฑ์เดิม ไม่ปลดล็อกเพื่อให้QAผ่านและไม่อ้างทดสอบQGC/SITL/บินจริง 3D/mobile/เครื่องสัมผัส/longsoakไม่ทดสอบซ้ำในรอบนี้ ไม่แปลงnormalprofileงานที่ผู้ใช้พักเป็นfeatureค้างใหม่

**ความหน่วง/console/ขอบเขตproof:** บางautomationclick/waitชนCDPRuntime.evaluate3000msก่อนstateปรับเสร็จ Rootอ่านUIใหม่แล้วทำขั้นต่อจากผลจริง ไม่กดAnalyzeซ้ำ ไม่ใช้automationtimeoutเป็นหลักฐานว่าAPI/CPUล้มเหลว Consolewarn/errorท้ายflowจับได้0 ไม่ใช่รับรองerrorทุกระบบ ไฟล์READYท้ายflowมีtimestampใหม่และไม่มีactive.json ข้อมูลOSresetเป็นuser-reported;agentไม่ได้rebootWindowsเอง ทดสอบSignedUIและหนึ่งfreshjobจริง ไม่reuseรายงาน/84testsเก่าเป็นfreshcase

**ไฟล์/หลักฐาน/เผยแพร่:** เก็บproduction-identity.json/public-ui.json/signed-api-readiness.json/history-restored.json/running-ui.json/new-job-api-receipt.json/new-mission-restored.json/browser-console.json/acceptance.json/REPORT.mdและscreenshotsในoutputs/XEDO_Post_Reset_Check_2026-10-30 Helpersชั่วคราวอยู่ignoredoutput ไม่copyAuthUUID/credentialsลงpublicdocs Rootแก้canonicalสองMDและqueueเท่านั้น ไม่แก้website/worker/SQLschema/Authpolicy/IAM ไม่รันunittests/build/CIใหม่ ไม่commit/push/deploy/Billing/subscription/paidresource ไม่ปิดworker ตอนจบCPUREADYพร้อมรับงาน ไม่มีคำถามผู้ใช้รอคำตอบ

<!-- map-cache-200mb-image-estimate-2026-10-30 -->
### 3.59 ประเมินจำนวนช่องภาพในแคช 200 MB — 30 ตุลาคม2026

**หัวข้อ:** ผู้ใช้ถามประเมินSupabaseเก็บภาพได้กี่ภาพถ้าแบ่ง200MB ไม่ใช่คำสั่งimplementation

**สรุป:** คำนวณ200MBแบบdecimal=200,000,000bytes ถ้าช่องPNG256×256เฉลี่ย50KB→4,000ภาพ,100KB→2,000,150KB→1,333,200KB→1,000 ตัวอย่างเดิม8distinctbasemaptilesรวม537,195bytes/mean67,149.375bytesทำให้เก็บได้2,978ภาพที่ค่าเฉลี่ยนั้น แนะนำใช้1,300–2,000ช่องเป็นplanningrangeก่อน ไม่ใช่รับประกันจำนวนหรือเพดานขนาดtile

**รายละเอียด/หลักฐาน:** อ่านproduction-timings.jsonที่output/gee-latency-audit-2026-10-30และรันเลขคณิตใหม่ ไม่มีGEE/APIหรือภาพใหม่ รูปที่นับคือtileเล็กสำหรับต่อแผนที่ ไม่ใช่ภาพดาวเทียมเต็มscene/เต็มหน้าจอ แต่ละzoom/sourceversionเป็นคนละcachekey ภาพตรงkeyเดิมใช้ซ้ำโดยไม่ต้องเพิ่มไฟล์ใหม่ ต้องจำกัดbytesจริงไม่ใช่นับภาพอย่างเดียว

**Verification/สถานะ:** อ่านcurrentcanonical/queue/Gitและรักษางานdirtyก่อนหน้า อัปเดตสองMDเท่านั้น คิวstatus/requirementไม่เปลี่ยน ไม่ตรวจquotaบัญชีใหม่ ไม่แก้source/worker/SQL/bucket/Auth/IAM ไม่รันapplicationtests/build/AI/GEEbenchmarkหรือcommit/push/deploy/Billing/subscription คำถามประมาณภาพไม่มีคำถามใหม่ แต่คงรอคำตอบจากงานอีกแชทpostResetWebsiteVerificationเรื่องSign inInspectorบนChromeตาม§3.58 ไม่เริ่มหรืออ้างปิดการตรวจเว็บนั้นจากรอบนี้


<!-- remaining-work-status-2026-10-30 -->
### 3.60 สรุปงานที่เหลือหลังตรวจเว็บไซต์หลัง reset — 30 ตุลาคม 2026

**หัวข้อ:** สรุปงานที่เหลือจาก canonical log/queue และ Git ปัจจุบันตามคำถามผู้ใช้ รอบนี้เป็นการรายงานสถานะ ไม่ใช่คำสั่งเริ่มแก้หรือเผยแพร่

**สรุป:** ฟังก์ชันหลักสำหรับ prototype และเส้นทางเว็บไซต์ → Supabase → CPU ในเครื่อง → ผล AI → Inspector แก้/ยืนยันพื้นที่ → planner → Save/History ทำแล้ว หลักฐาน browser/API หลัง reset อยู่ §3.58 ซึ่งปิดการรอ Sign in แล้ว ข้อความรอในประวัติ §3.59 ถูกแทนที่ด้วยผลสำเร็จดังกล่าว ไม่มีคำตอบผู้ใช้ค้าง

**รายละเอียดงานติดตาม:**

1. **ปรับความเร็วแผนที่/GEE — ออกแบบแล้ว ยังไม่ลงมือ:** ลดขนาดหน้าเว็บที่มี asset ฝังอยู่มาก ลดคำขอภาพซ้ำ และพิจารณา persistent map-tile cache ใน Supabase ตาม §§3.51/3.54/3.56/3.57/3.59 งบแคชเริ่มต้น 200 MB เป็นข้อเสนอ ต้องมี key อิงภาพ/สูตร/zoom/พื้นที่และสิทธิ์ที่ถูกต้อง จำกัดขนาดจริงและล้างภาพเก่า ยังไม่ได้สร้าง bucket/schema หรือรับรองผลความเร็ว
2. **ตรวจความลื่นและความทนทานเพิ่มเติม — qualification คงเหลือ:** ทดสอบเลื่อน/สัมผัสบนมือถือและ trackpad จริง เปิดใช้งานนานและตรวจการใช้หน่วยความจำ รวมถึงกรณีงาน AI ต่อเนื่อง/ขาดการเชื่อมต่อ/หลาย session ตามขอบเขตที่ยังไม่ qualify ครบ การตรวจ core และงาน AI จริงที่เคยผ่านยังคงเป็นหลักฐานเดิม ไม่ได้หมายความว่าไม่มีการทดสอบพื้นที่ใหญ่หรือการเชื่อมต่อมาก่อน รายการนี้อยู่กลุ่มใหม่ 1/เดิม 4 และส่วน qualification ของใหม่ 6/เดิม 9 ไม่เปิดงาน normal drone profile เดิม 3 ที่ผู้ใช้ตัดออก
3. **เก็บชุดเปิด CPU และคู่มือเข้า Git — งานส่งมอบในเครื่อง:** Start-XEDO-CPU.cmd, Reconnect-XEDO-CPU.cmd, launcher/worker guard และคู่มือทำงานในเครื่องและผ่านการตรวจตามบันทึกก่อนหน้าแล้ว แต่ Git ปัจจุบันยังมีไฟล์ modified/untracked ต้อง review/commit/push เมื่อได้รับคำสั่งเผยแพร่ชุดนี้ Worker ยังรันบน PC ไม่ต้อง deploy ตัว worker ไป Vercel เพื่อใช้งานปัจจุบัน

**งานพักไว้ 2 รายการ:** ใหม่ 4/เดิม 7 เชื่อม Raspberry Pi รูปและ telemetry; ใหม่ 5/เดิม 8 เชื่อมผลทดลองและรายงานก่อน–หลัง ทั้งสองไม่เป็นเงื่อนไขของการ Analyze พื้นที่ใหม่และวางแผนปัจจุบัน Cloud AI แบบเสียเงิน/Billing/subscription ไม่อยู่ในงานที่อนุมัติ

**ความหมายของจำนวน:** คิวฟังก์ชันเดิมยังเหลือ 1 กลุ่ม extended qualification และ 2 กลุ่ม deferred ตาม numbering เดิม รายการติดตาม 3 ข้อข้างบนรวมข้อเสนอปรับประสิทธิภาพกับงานเก็บ Git จึงไม่ใช่การเพิ่ม 3 ฟังก์ชันหลักที่ยังทำไม่เสร็จ และไม่เปลี่ยนเลขคิวเดิม

**ไฟล์/การตรวจ/การเผยแพร่รอบนี้:** อ่าน canonical สอง MD, implementation-queue.json และ Git status/HEAD ปัจจุบัน; อัปเดตสอง MD และเพิ่ม latestRemainingWorkAudit ใน queue โดยรักษาข้อมูลแชทอื่นและสถานะขั้นเดิม ไม่แก้ source/worker/schema/Auth ไม่รัน app tests/build/browser/API/AI job/benchmark ใหม่ ไม่ commit/push/deploy ไม่เปิด Billing/subscription หรือบริการเสียเงิน ผลทดสอบ runtime ที่กล่าวถึงมาจากรอบ §3.58 ไม่ใช่ผลรันใหม่ในรอบนี้

<!-- model-effort-advice-xedo-2026-10-30 -->
### 3.61 การจัดงานพัฒนา XEDO ด้วย Extra High และ Ultra — 30 ตุลาคม 2026

**หัวข้อ/ขอบเขต:** แนะนำการเลือก reasoning effort ตามคำถามผู้ใช้ ไม่ใช่การเปลี่ยนสถาปัตยกรรม พฤติกรรมเว็บไซต์ การตั้งค่าโมเดล หรือการอนุญาตให้เริ่มงานคิว/ใช้ subagents

**สรุป:** Extra High เป็นตัวเลือกหลักสำหรับแก้ UI/bug และเชื่อม flow ที่มี state/revision ต่อกัน Ultra มีโอกาสคุ้มด้านเวลาและความครอบคลุมเมื่องานใหญ่แบ่งตรวจอย่างอิสระได้ ยังไม่มี benchmark XEDO ที่ระบุเปอร์เซ็นต์คุณภาพหรือต้นทุนสองระดับ

**รายละเอียดตาม dependency ของเว็บ:** ตาม §3.1 และ §§3.43–3.60 ต้องรักษา flow แผนที่/GEE → owned job/CPU → AI result → Inspector edit/confirm → planner → Save/History งานสำรวจ performance/cache, ตรวจ AI/worker, ตรวจ persistence/สิทธิ์ และตรวจ regression สามารถแบ่งบทบาทส่งหลักฐานกลับให้แชทหลักได้ ส่วนการแก้ source/config หลักยังให้แชทหลักเป็นผู้รวมเพียงผู้เดียวตามข้อ 3.14 ไม่แนะนำให้หลายเอเจนต์แก้ไฟล์เดียวกันพร้อมกัน

**ข้อจำกัดและแหล่งอ้างอิง:** [Models](https://learn.chatgpt.com/docs/models), [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents), [Pricing](https://learn.chatgpt.com/docs/pricing) อธิบาย reasoning effort, การใช้โทเคนของเอเจนต์ย่อย และ usage ที่ขึ้นกับงานจริง Extra High สามารถใช้ subagents เมื่อสั่งตรงและ client รองรับ; ใน Codex ต้องอิงคำสั่งผู้ใช้/AGENTS/skill จึงไม่รับรองว่าเลือก Ultra แล้วทุกงานจะใช้หลายเอเจนต์หรือเสร็จเร็วกว่า ไม่ใช้ตัวคูณ Fast/Ultrafast แทนต้นทุน Ultra

**การตรวจ/การเปลี่ยนแปลงรอบนี้:** อ่านเอกสารปัจจุบัน, AGENTS.md, package.json, Git branch/HEAD/status และ OpenAI Docs; เปลี่ยนเฉพาะสอง MD คิว/requirement/status เดิมคงเดิม ไม่มี application/worker/schema/config change ไม่มี subagent/app test/build/browser/API/AI job/benchmark ใหม่ ไม่มี commit/push/deploy/Billing/subscription ไม่มีคำถามรอคำตอบ หลักฐาน production ใน §3.58 เป็นผลเดิม ไม่ใช่การตรวจสดรอบคำแนะนำนี้

<!-- consolidated-gee-supabase-cache-plan-2026-10-30 -->
### 3.62 รวบรวมแผนล่าสุดในแชทเป็นไฟล์ Markdown — 30 ตุลาคม2026

**หัวข้อ/ขอบเขต:** ผู้ใช้ขอรวบรวมแผนล่าสุดในแชทนี้เป็น.md จัดทำdocs/GEE_MAP_CACHE_PERFORMANCE_PLAN.md v1.0 เน้นความเร็วGEEและSupabasepersistenttilecache ไม่ถือเป็นคำสั่งimplementationหรือเผยแพร่ ไม่รวมงานCPUlauncher/การเลือกmodelจากอีกแชทเป็นrequirementของแผนนี้

**สรุปแผน:** Browsercache→SupabaseStoragePNG+DBindex→GEEเฉพาะmiss;เพดานเริ่ม200,000,000bytes/วางแผน1,300–2,000tiles/samplemeanเดิม2,978 ขยาย500MBเป็นทางเลือกภายหลัง รวมimmutableasset/recipe/order/zoom/grid/clipidentity,reuseboundedregions,sourcefreshnessแยกsessionexpiry,privatebucketgatewayที่คงguestbackground,concurrency/reservation/cleanup/failurefallback,ลดhostedHTML6.2MBและใช้ภาพร่วมในInspector/3Dเมื่อidentityตรง พร้อม6ระยะงาน/acceptance/ไฟล์ที่เกี่ยวข้อง/officiallinks/หลักฐานตัวเลขในเอกสารเพื่ออ่านส่งต่อได้

**ความถูกต้องของหลักฐาน:** ตัวเลขGEE0.887/5.019sและtile3.257→0.732sมาจากaudit§3.51 ไม่ใช่Supabasebenchmark ตัวเลขUsageStorage0/1GBและDB0.028/0.5GBเป็นsnapshot30ต.ค.19:14–19:17ต้องตรวจซ้ำก่อนลงมือ ไม่อ้างพื้นที่ว่างหรือProductionidentityสดในรอบเขียนเอกสาร Currentqueue§3.58ปิดSignIn/History/freshjobแล้ว จึงไม่คงคำถามSignInเดิมเป็นpendingของแผน ไม่มีคำถามผู้ใช้รอคำตอบ

**ไฟล์/verification/publication:** เพิ่มแผน1ไฟล์ อัปเดตcanonicalสองMDและqueue.geeMapLatencyAudit.persistentCacheFollowup.consolidatedPlanโดยรักษาdirtyงานแชทอื่น อ่านAGENTS/log/queue/Gitและreceiptsเดิม ตรวจMarkdownfences/localdoclinks/ขอบเขต200MB/JSON/เลขคณิตเดิมและgitdiff ไม่แก้application/worker/SQL/Auth/RLS/IAM/env ไม่สร้างbucket/เขียนStorage ไม่รันGEE/API/AIinference/applicationtests/build/benchmarkใหม่ ไม่ใช้subagents ไม่commit/push/deploy/Billing/subscription/paidresource แผนยังplanned_not_implemented;publish/implementationauthorizationยังfalse


<!-- locate-parallel-gee-plan-2026-10-30 -->
### 3.63 ค้นหา Markdown แผนแก้ GEE ดีเลย์จากแชทคู่ขนาน — 30 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้แจ้งว่าอีกแชททำ Markdown อธิบายความช้า Google Earth Engine และให้ค้นหาในโฟลเดอร์แล้วแจ้งว่าพบหรือไม่

**สรุป:** พบไฟล์ `docs/GEE_MAP_CACHE_PERFORMANCE_PLAN.md` จริงใน active release checkout ชื่อเอกสาร “XEDO — แผนปรับความเร็วแผนที่ GEE และเก็บแคชด้วย Supabase” เวอร์ชัน 1.0 วันที่ 30 ตุลาคม 2026 ขนาด 43,796 bytes เปิดตรวจส่วนต้น สาเหตุ การทำงาน และลำดับลงมือแล้ว ตรงกับบันทึกการจัดทำจากอีกแชทใน §3.62 ไม่ใช่เอกสาร GEE รุ่นเก่าใน checkout อื่น

**รายละเอียด:** เนื้อหาครอบคลุม metadata→tiles waterfall, การสร้าง pixels/mosaic, ข้อจำกัดแคชข้าม session และการยกเลิกคำขอ, hosted HTML ประมาณ 6.2 MB จากหลักฐานเดิม พร้อมข้อเสนอ browser cache→Supabase cache→GEE เฉพาะ miss เพดานเริ่ม 200 MB และงาน 6 ระยะ/เกณฑ์ตรวจรับ เอกสารระบุชัดว่า planned_not_implemented ยังไม่มี cache implementation หรือ release จากแผนนี้ ตัวเลขเวลา/usage เป็นหลักฐานรอบก่อน ไม่ใช่ผลวัดใหม่ในรอบค้นหา

**ไฟล์/การตรวจ/การเผยแพร่:** ค้นชื่อ Markdown ใน workspace เปิดไฟล์จริง อ่าน canonical log/queue และตรวจ Git; ไฟล์แผนยัง untracked ตาม Git ปัจจุบัน รักษาเนื้อหาแผนและ dirty งานแชทอื่น อัปเดตเฉพาะ canonical สอง MD ในรอบนี้ คิว/requirement/status เดิมไม่เปลี่ยน ไม่แก้เว็บไซต์/worker/schema/bucket/Auth ไม่รัน app tests/build/browser/GEE/API/CPU job/benchmark ไม่ commit/push/deploy/Billing/subscription ไม่มีคำถามผู้ใช้รอคำตอบ

<!-- subagents-versus-separate-chats-2026-10-30 -->
### 3.64A เอเจนต์ย่อยและหลายแชตในการดูแล XEDO — 30 ตุลาคม 2026

**หัวข้อ/สรุป:** อธิบายการจัดการงานให้ผู้ใช้เข้าใจตามคำถาม ไม่ใช่คำสั่งเริ่ม parallel execution เอเจนต์ย่อยมีแชตหลักประสานโจทย์/บริบท/ติดตาม/รับผลและรวมคำตอบ ส่วนหลายแชตที่เปิดเองทั่วไปต้องจัดการ handoff ระหว่างบทสนทนา แต่ทำงานคู่ขนานและใช้ไฟล์กลางร่วมได้เช่นกัน

**รายละเอียดทางการทำงาน:** แต่ละเอเจนต์มีบริบทแยก ไม่รับประกัน live synchronization ของทุกข้อความ/ไฟล์ แชตใน project อาจแชร์ไฟล์/คำสั่ง/บริบทบางส่วน ส่วนสิทธิ์ local files ขึ้นกับ client และ workspace การใช้ subagents ไม่รับประกัน worktree แยกหรือป้องกันไฟล์ชนกัน หากใช้ checkout ร่วมต้องกำหนด ownership เช่นเดิม ตัวอย่างปัจจุบันคือแชตหนึ่งจัดทำแผน GEE (§3.62) แล้วแชตหลักค้นและอ่านไฟล์ (§3.63) ซึ่งเป็น handoff ผ่าน artifact; เอเจนต์ย่อยจะส่งผลสู่แชตหลักผ่านระบบประสานงานโดยตรงได้

**แนวทางเดิมคงอยู่:** สำหรับ XEDO ให้แชตหลักรวม source/config และรับหลักฐานจากผู้ช่วยที่แยกตรวจคนละด้าน ไม่อ้างว่า subagents ฉลาดกว่าหลายแชต หรือถูกกว่าโดยอัตโนมัติ Extra High ก็ขอ subagents โดยตรงได้ตาม client/คำสั่งที่ใช้ ดู [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents), [Projects and chats](https://learn.chatgpt.com/docs/projects), [Multi-agent](https://developers.openai.com/api/docs/guides/agents-api/multi-agent)

**การตรวจ/การเปลี่ยนแปลงรอบนี้:** อ่าน canonical/queue/Git และเอกสาร OpenAI หน้า HTML; เพิ่มบันทึกสอง MD เท่านั้น ไม่เปลี่ยน architecture/behavior/config/ownership/คิว/แผน GEE ไม่มีการสร้างเอเจนต์/แชตหรือส่งข้อความข้ามแชต ไม่มี application tests/build/browser/API/GEE/AI job/benchmark ใหม่ ไม่มี commit/push/deploy/Billing/subscription ไม่มีคำถามรอคำตอบ


<!-- gee-performance-existing-support-plan-v1-1-2026-10-30 -->
### 3.64 ปรับแผน GEE ให้ทำงานกับแชทผู้ช่วยเดิม — 30 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้ให้ปรับแผน GEE โดยใช้แชทผู้ช่วยเดิมช่วยงานที่แยกตรวจได้ เนื่องจากผู้ใช้รายงานว่า Ultra ใช้ไม่ได้ช่วงนี้ คำสั่งรอบนี้ให้ปรับแผนก่อน ไม่เริ่ม implementation หรือเผยแพร่

**สรุป:** ปรับ `docs/GEE_MAP_CACHE_PERFORMANCE_PLAN.md` เป็น v1.1 แชทหลักยังเป็นผู้แก้เว็บไซต์/API/schema/config/packages/tests และดำเนินการบริการจริงเพียงแชทเดียว ผู้ช่วยตรวจ source/contract ออกแบบทดสอบ ตรวจ diff และตรวจหลักฐานคู่ขนาน ใช้การตั้งค่าที่มีอยู่ ไม่รอ Ultra ไม่อ้างว่าแบ่งงานแล้วคุณภาพ/เวลาเท่า Ultra หรือเร็วขึ้นเป็นตัวคูณ ไม่มีการตรวจสาเหตุ Ultra unavailable จากผู้ให้บริการ

**แชทผู้ช่วยที่ตรวจพบจริง:** ใช้ app list_threads และอ่านประวัติแชทเดิม `02-chat ขนาน project หลัก` / `01a17cf8-a060-7fd0-bed4-d7920a297d20` / host local ยืนยันขอบเขต read-only website และ output-only artifacts เดิม ไม่สับสนกับแชท `ตรวจสอบดีเลย์ Google Earth Engine` ที่รวบรวมรายงาน ยังไม่ส่งข้อความปลุกงาน ไม่สร้างแชทหรือ spawn subagent รอบนี้

**รายละเอียดแผน:** ตาราง 6 ระยะเพิ่มเจ้าของงานหลัก/ผู้ช่วยและจุดรับผล A ก่อนตรึง recipe/key/clip/freshness/สิทธิ์/200 MB, B เมื่อมี candidate cache/build, C ก่อนสรุป benchmark/release ผู้ช่วยส่ง HANDOFF.md, SOURCE_REVIEW.md, TEST_MATRIX.md, SOURCE_MANIFEST.json และ EVIDENCE_REVIEW.md ใน `C:/mega/codex/iENA/outputs/XEDO_GEE_Performance_Parallel_2026-10-30/support/` (เป็นทางส่งมอบที่เสนอ ยังไม่สร้างหรือรันงานนั้น) ระบุ measured/source finding/hypothesis และ designed_not_run/null actual เมื่อไม่มีผลรัน แชทหลักควบคุม browser/API/GEE benchmark เพื่อไม่แย่ง session/สร้างคำขอซ้ำ ทั้งสองอิง HEAD+working-tree file hashes+build/input/cache/network เดียวกัน ทวนใหม่เมื่อ source เปลี่ยน

**กติกาไฟล์ร่วม:** แชทหลักดูแลภาพรวม/คิว ผู้ช่วยเขียนเฉพาะโฟลเดอร์ support ยกเว้น append บันทึกสั้นใน canonical สอง MD ตาม AGENTS ช่วงส่งมอบที่ประสานให้เขียนทีละแชท ต้องอ่านเวอร์ชันล่าสุดและไม่เขียนทับจากสำเนาเก่า ไม่ให้ผู้ช่วยแก้ source/tests/schema/config/Git/accounts หรือสร้าง bucket จุดรับผลระหว่างแชทไม่เพิ่มขั้นถามอนุมัติผู้ใช้ทุกช่วง เป้าข้อพบแรก 20–30 นาทีหลังเริ่มเป็นเป้าหมาย ไม่ใช่รับประกันเวลารวม

**สิ่งที่คงเดิม:** ข้อเสนอแคชเริ่ม 200,000,000 bytes, 500 MB เป็นทางเลือกภายหลัง, สามขั้นตอน/สี่ตัวคำนวณ/Inspector ส่วนตัว/CPU ในเครื่อง/Pi และรายงานผลทดลองที่พักไว้ ไม่เปิด Billing/subscription ไม่แก้ขอบเขตที่ผู้ใช้ตัดออก การให้ใช้ผู้ช่วยไม่ใช่คำสั่งเริ่ม cache implementation/push/deploy

**ไฟล์/หลักฐาน/การตรวจ/สถานะ:** เปลี่ยนแผน v1.1, canonical สอง MD และ queue.consolidatedPlan/parallelChatPolicy.geePerformanceFollowup; อ่าน AGENTS, memory, canonical, queue, plan, Git branch/HEAD/status และประวัติผู้ช่วยจริง ใช้ skill supabase:supabase ประกอบขอบเขตสิทธิ์เดิม ไม่แก้เทคนิค provider API/schema ในรอบจัดงาน ไม่ทดสอบ app/build/browser/API/GEE/CPU/usage หรือ benchmark ใหม่ ตรวจเฉพาะโครงสร้าง Markdown, links, JSON และ diff ภายหลังแก้เอกสาร ไม่ commit/push/deploy/migration/bucket/Auth/model/config/Billing/subscription ไม่มีคำถามผู้ใช้รอคำตอบ

<!-- user-clarifies-main-controlled-parallel-chats-2026-10-30 -->
### 3.64B รูปแบบ Extra High หลายแชทที่แชทหลักสั่งและรวมงานเอง — 30 ตุลาคม 2026

**หัวข้อ/สรุป:** ผู้ใช้ชี้แจงว่ามีแชทหลักหนึ่งแชทแจกงาน/ติดตาม/ตรวจรับแชทรองหนึ่งแชทที่ทำขนานและส่ง .md จึงคล้าย multi-agent ในระดับ workflow ผู้ใช้ไม่ได้ทำหน้าที่ประสานทุกช่วงเองดังกรณีทั่วไปที่คำตอบก่อนหน้าอธิบาย

**รายละเอียด:** แชทหลักวางแผน → สั่งงานผู้ช่วย → ทำงานแยก → รับ artifact .md → ตรวจและรวมผล เป็น orchestration ที่จัดไว้ผ่านแชท/ไฟล์ของโครงการ ความคล้ายนี้ไม่ยืนยันว่า Extra High หลายแชทมี reasoning/กลไกภายใน/ผลลัพธ์/ต้นทุนเท่ากับ Ultra เอกสาร [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) ระบุ maximum reasoning/proactive delegation ของ Ultra ใน ChatGPT Work และ [Models](https://learn.chatgpt.com/docs/models) อธิบายงานที่แบ่งทำอิสระได้ ยังไม่มี benchmark สองวิธีบน XEDO

**การตรวจ/สถานะรอบนี้:** เปิด official docs และอ่าน canonical/queue/Git เพิ่มเฉพาะบันทึกสอง MD ไม่เปลี่ยน architecture/behavior/ownership/config/queue; แผน GEE v1.1 ยัง planned_not_dispatched ตามหลักฐาน ไม่สร้างหรือสั่งเอเจนต์/แชท ไม่ส่งงานข้ามแชท ไม่รัน app tests/build/browser/API/GEE/CPU/benchmark ไม่ commit/push/deploy/Billing/subscription ไม่มีคำถามรอคำตอบ

<!-- gee-performance-support-a-handoff-2026-10-30 -->
### 3.64C Support A ส่ง source/contract review ของแผน GEE v1.1 ข้อ 1–2 — 30 ตุลาคม 2026

**หัวข้อ:** แชทสนับสนุนส่งชุด A ให้แชทหลักตรวจรับ ตามงานที่มอบหมายล่าสุด โดยแชทหลักยังเป็นผู้แก้เว็บไซต์/API/tests/schema/config และใช้บริการจริงเพียงแชทเดียว

**สรุป:** พร้อมที่ `C:/mega/codex/iENA/outputs/XEDO_GEE_Performance_Parallel_2026-10-30/support/HANDOFF.md` พร้อม SOURCE_REVIEW.md (14 findings), SOURCE_MANIFEST.json, CONTRACT_REVIEW.md และ TEST_MATRIX.md (C01–C44 ทั้งหมด designed_not_run/actual:null) ตรวจโครงสร้างรายงานและ hash 12 ข้อผ่าน/0 ไม่ผ่านใน REPORT_VALIDATION.json ไม่ใช่ผลทดสอบเว็บไซต์หรือ persistent cache

**รายละเอียด:** อ่าน HEAD a5612696a80470733da4155bd953d01d7b553bd4 และ baseline/candidate hashes พบ source drift ของ diagnostics main ใน api/gee.mjs, src/gee-imagery-api.js, src/gee-imagery.js และโมดูล timing ใหม่ ทวน contract ล่าสุดรวม sourceEpoch/600ms lookup-first/no speculation/5s writer headroom ซึ่งเป็นนโยบายเสนอไม่ใช่ SLA ข้อ F01/F02 ใน CONTRACT_REVIEW ขอเติม actual-renderer fallback key/claim และ backend RPC transport/explicit privilege matrix ก่อนตรึงข้อ2 ส่วน uncertain/deleting bytes, generation path ไม่ upsert, guest/private separation และ durable intent/lifecycle ครอบคลุมหลักการแล้ว ยังต้องพิสูจน์เมื่อ implement

**การตรวจ/ไฟล์/สถานะ:** support อ่าน source/docs/Git/diff และ public official documentation เท่านั้น ไม่มี app tests/build/browser/Auth/GEE/Storage/SQL/account/benchmark ใหม่ ไม่มี package/service/Billing/subscription/Git mutation/commit/push/deploy ไม่สร้างหรือส่งงานให้แชท/เอเจนต์เพิ่ม ผล615 tests/buildและproduction/local timingsที่ main รายงานไม่ใช่ผลรันของ support เขียนเฉพาะ support artifacts และ append สั้นใน canonical สอง MD หลัง re-read ตามช่วงที่ประสาน ไม่แก้ overview/queue หรือทับงาน CPU ของแชทอื่น ไม่มีคำถามผู้ใช้รอคำตอบ แชทหลักเป็นผู้รวมสถานะข้อ1–2/คิวภายหลังรับผล

<!-- gee-performance-support-a-final-review-2026-10-30 -->
**ผลทวนสุดท้ายก่อนส่งชุด A:** main แก้ F01/F02 แล้ว support อ่านยืนยัน contract จริง §3.4 (actual-renderer fallback derive pixels key/claim ใหม่หรือ bypass ไม่ publish ใต้ map key) และ §3.8 (public.xedo_cache_*_v1 SECURITY INVOKER, private xedo_map_cache ไม่ expose, explicit server USAGE/table-DML/EXECUTE และ revoke PUBLIC/anon/authenticated, UUID ไม่ใช้ sequence) จึงไม่เหลือ source/design P0 ที่ support พบในร่างล่าสุด พร้อมให้ main รับผลข้อ1–2 การ addressed นี้เป็นผลตรวจเอกสารเท่านั้น ไม่ใช่ผลทดสอบ DB/permissions/Storage/byte-cap/runtime; C01–C44 ยังคง designed_not_run/actual:null ไม่ต้องรอคำตอบจากผู้ใช้ก่อน main รวม overview/queue


<!-- gee-performance-phase-1-2-complete-2026-10-30 -->
### 3.65 ทำ GEE performance ข้อ1–2 พร้อมรับผลแชทผู้ช่วย — 30 ตุลาคม 2026

**หัวข้อ/สรุป:** ทำข้อ1–2ของแผนv1.1ครบในขอบเขตbaseline/observability/contract ใช้แชทหลักเป็นผู้แก้sourceและอ่านproviderจริง ผู้ช่วยเดิมตรวจแบบในoutputเท่านั้น รับชุดAและปิดF01/F02แล้ว ข้อ3–6ยังไม่เริ่มและไม่publish

**สถาปัตยกรรมปัจจุบัน:** request→hostedGEEFetch→geeImageryAPI→GEEservice→PNGresponse ยังใช้RAMcacheเดิม แก้api/gee.mjsให้ส่งเฉพาะsanitizedServer-Timingและcacheenum เพิ่มsrc/gee-imagery-timing.js;coreAPIสร้างcollectorต่อrequestแล้วส่งobserverไปservice;authenticatedวัดauth/metadata/pixels/map/tiles+inclusiveupstreamและกลืนobservererror ไม่มีpersistentlookup/write/backgroundtaskเพิ่มในruntimenี้ ไม่เปลี่ยนrecipe/cancellation/authorizationจริง การส่งsignalถึงsharedproducerเป็นงานข้อ3

**การตีความเวลา:** xedo_coreจบเมื่อได้Response ไม่รวมclientdownload/decode/paint;gee_upstreamรวมauthและnetwork/read;gee_pixelsไม่ใช่pureprovidercompute ห้ามบวกmetricซ้อนและห้ามตีความไม่มีupstreamspanเป็นhitโดยไม่มีcacheevidence joinpendingอาจมีแต่core span ข้อมูลStorage/clientvalidationที่ไม่วัดให้null/not_run

**Baseline/การตรวจ:** ProductionHTMLdecoded6,207,852bytes/gzip3,772,548bytes/TTFB410.47ms/transfer65.57sจากเครื่องนี้;4basemaptilesparallel1.529s ไม่ใช่FCP/P95 PNG7ไฟล์CRC/inflate/256px/visibleผ่าน LocalGEEจริงmetadata870.02ms/pixels861.65ms/RAMhitwall2.41ms PNGhashหนึ่งcaseตรงProductionและHTMLbuildhashตรงProduction ดูreceipts/ข้อจำกัดในGEE_MAP_CACHE_CONTRACT.md§3.1 Browsertoolไม่เปิดperformance จึงไม่อ้างpainttiming SQLxedo0buckets/objects/bytes;UsageUIFreeStorage0/1GBและEgress0.004/5GBเป็นsnapshotพร้อมrefreshnotice

**แบบ implementation ต่อ:** docs/GEE_MAP_CACHE_CONTRACT.mdเก็บkeyจากorderedfullassets/actualpipeline/grid/exactclip/sourceEpochและscope;lookup-first600ms/bypass;cap200000000bytesกับatomicreservation/fencing/uncertaincharge/generationpath;fallbackmap→pixelsต้องkey/claimใหม่;privateindexschema+publicbackendRPCinvoker/explicitgrantsandrevokes;guestimageryและprivatemissionแยก;writercompletionต้องruntimeที่รองรับและdurableintent ไม่reclaimunknownPUTตามTTLและไม่ใช้waitUntilแทนtransaction ค่า600ms/5sheadroom/24hreuseเป็นนโยบายเริ่มต้นสำหรับวัด/ตรวจเมื่อimplement ไม่ใช่ผลruntimeของcache

**ส่งมอบ/ทดสอบ:** ผู้ช่วยส่ง14sourcefindings/44designed_not_run cases/12structuralchecks ไม่มีappหรือproviderrequests โดยผู้ช่วย RootตรวจHEAD+sourcehashesและทวนr่างสุดท้ายก่อนรับผล Mainรันfocused34/full615testsผ่าน0fail0skip,syntax/hostedbuildผ่าน เพิ่มtests/gee-imagery-timing.test.mjsกับserviceobservercaseเพื่อคงPNGbinary/errorredaction/headersและobserverfailureisolation ไม่รันappchecksซ้ำหลังแก้docsอย่างเดียว Supportappend§3.64Cคงไว้;แชทหลักดูแลoverview/queueหลังผู้ช่วยจบ

**ไฟล์/สถานะ:** เปลี่ยนmain api/gee.mjs,src/gee-imagery-api.js,src/gee-imagery.js,เพิ่มsrc/gee-imagery-timing.js,testsที่เกี่ยวข้อง,แผน/contract/canonicalสองMD/queue ไม่แก้worker/launcherdirtyเดิม ไม่มีliveSQLmutation/Storagebucket/object/RPC/policy/key/env/configหรือdeploymentใหม่ ไม่มีBilling/subscription หลักฐานในoutputs/XEDO_GEE_Performance_Parallel_2026-10-30/primary และsupport/HANDOFF.md ไม่มีคำถามรอคำตอบ

<!-- gee-cache-phase3-support-b-2026-10-30 -->
### 3.65B Support B ตรวจ source/SQL/tests แคช GEE ข้อ3 — 30 ตุลาคม 2026

**หัวข้อ:** แชทหลักมอบหมายให้ support ตรวจ implementation ข้อ3ตามคำสั่งผู้ใช้ล่าสุด โดย main เป็นผู้เขียนและดำเนินบริการจริงคนเดียว support ไม่ส่งข้อความ/สร้างแชทหรือเอเจนต์เพิ่ม และไม่แก้ overview/queue

**สรุป:** ชุด B source-reviewed ready ที่ `C:/mega/codex/iENA/outputs/XEDO_GEE_Cache_Phase3_2026-10-30/support/HANDOFF.md` พร้อม IMPLEMENTATION_REVIEW.md, TEST_REVIEW.md, SOURCE_MANIFEST.json พบ8ประเด็นระหว่างตรวจ (P0หนึ่ง/P1เจ็ด) mainแก้แล้วและsupportอ่านยืนยัน B-F01–08 ในsource/SQL ไม่เหลือP0/P1ที่supportพบในcritical pathsที่ตรวจ ณ snapshotสุดท้าย ผลนี้ไม่ใช่runtime/DB/Storage/security acceptance และไม่ใช่การอนุญาตใหม่ให้เผยแพร่

**รายละเอียด:** ทวนactualpipeline/orderedassets/clip/epoch,global200000000byte allocator,lease/fence/generation/no-upsert,HTTP504latePUTretention,globalexpired-buildingrecovery,prePUTheadroom/cancel_unstarted,boundedfollowerwait,producererror/cancellation/retiredentry,missing-corruptvsoutageและpost-lockclock ตรวจbackend-onlyRPCgrants/guest-privateboundaryและlocalsetupsourceโดยไม่อ่านsecret เพิ่มfaultdesign21กรณีB01–B21 designed_not_run/actual:null และmapC01–C44 เก็บsource hashหลายobservationจากHEAD a5612696a80470733da4155bd953d01d7b553bd4 พร้อมdirtyงานmain/CPUเดิม โครงสร้างรายงาน/hash10ข้อผ่าน0ไม่ผ่าน ไม่ใช่app tests

**ผลรัน/ข้อจำกัด/งานต่อ:** supportรันwebsite/tests/SQL/provider/browser/benchmark0ครั้ง Mainรายงานfocused44ผ่านแต่supportไม่ได้รันหรือยืนยันcommandreceipt Fullsuiteครั้งหนึ่งmainหยุดแล้วกำลังรันใหม่หลังabortguard ไม่อ้างผ่านจากการหยุดหรือ615เก่า Mainยังต้องmatchsource/testsและตรวจcredential/additivemigration/roles/privateStorage/physicalbytes+ledger/miss-persist-hit/lifecycleและfaultconcurrencyจริง ไม่ต้องรอkeyเพื่อรับsource review แต่key/liveacceptanceเป็นmaingate ไม่มีcommit/push/deploy/Billing/subscription/hostedbuildsplitโดยsupport AppendเฉพาะcanonicalสองMDหลังอ่านล่าสุดและรักษาprefixเดิม ไม่เปลี่ยนคิว ไม่มีคำถามผู้ใช้รอคำตอบในงานsupport

<!-- gee-cache-phase3-support-b-postlive-checkpoint-2026-10-30 -->
### 3.65B2 Support B ทวน source และ receipts หลังติดตั้ง live — 30 ตุลาคม 2026

**หัวข้อ:** รับงาน follow-up จาก main เพื่อตรวจ source checkpoint ล่าสุดและอ่าน artifacts โดยไม่ยิงบริการซ้ำ Mainแจ้งติดตั้งadditiveSQL/bucketและkeysetupแล้ว;supportไม่ดำเนินการเหล่านั้นเอง

**สรุป:** HANDOFF เดิมที่ `C:/mega/codex/iENA/outputs/XEDO_GEE_Cache_Phase3_2026-10-30/support/HANDOFF.md` อัปเดตแล้ว B-F01–08ยังaddressed/no new sourceP0/P1ที่พบ อ่านonEventdiagnosticsและlookupcalibration600→1200msแบบbounded/no speculation รวมsetuphelpersและQA sourceล่าสุด เก็บsource hashes/dirtyHEAD a5612696a80470733da4155bd953d01d7b553bd4 ไม่อ้างว่าsourcepublish

**รายละเอียดหลักฐาน:** CHECKPOINT_EVIDENCE_REVIEW.jsonตรวจreceipt/text/hash/arithmetic7ผ่าน0fail แยกจากreportstructural10ผ่าน Missล่าสุด14:43UTCหลังreseed147321bytes/pixels1/ready1; freshhit14:39pixels0; injected-cacheclient-outage14:40pixels1 ทั้งสามPNGdigestตรงกัน เก็บfailed600ms hit-timeout/pixels1ไว้ ไม่เรียกว่าhitผ่านหรือP95benchmark ControlRPC192claims/8workers190leaders2bypass/peakcharged199376761<=200000000/releaseกลับ147321/cleanupledger0ที่14:41 ก่อนreseedใหม่ ไม่uploadraster190MiB ภาพSQLeditorquerysuccessถูกอ่านและsavedSQLreviewtokenตรงsource แต่ไม่แทนcatalog/roledefsครบชุด

**ข้อจำกัด/งานmainต่อ:** URLkind authenticatedในcontrolใช้publishable/anonheaders ไม่ใช่logged-inInspectorJWT จึงไม่อ้างaccountroleacceptance; physicalcleanupflagมาจากStorageAPIhelper+ledger ไม่ใช่independentpostdeleteinventory Localdeferที่QAawaitไม่พิสูจน์hostedVercellifecycle Mainต้องsynccontract/testvectors600→1200msตามsourceล่าสุด แนบcatalog/role/Storage-policyและผลfocused/fulltestsที่ตรงcandidate ไม่ใช้ผลfullที่หยุดหรือ615เก่า Supportไม่รันwebsite/SQL/provider/browser/benchmarkเองทุกcaseB01–B21ยังdesigned_not_run/actual:null ไม่แก้source/tests/schema/config/packages/env/services/Git/overview/queue ไม่มีpush/deploy/Billing/subscription/แชทหรือเอเจนต์เพิ่ม Appendนี้รักษาprefixเดิมหลังอ่านล่าสุด ไม่มีคำถามผู้ใช้รอคำตอบจากsupport

<!-- gee-cache-phase3-support-b-source-freeze-final-2026-10-30 -->
### 3.65B3 Support B ปิด source-freeze checkpoint — 30 ตุลาคม 2026

**หัวข้อ/สรุป:** อ่านAGENTS/canonicalสองMD/queue/HEAD/Gitล่าสุด แล้วทวนbindClaimที่mainเพิ่มให้ใช้ร่วมinitial/followerพร้อมtestwrongkey/path (testassertStorageอ่าน0และproducerถูกต้อง1) ปิดnonblockinghardeningnoteเดิมครบ B-F01–08ยังaddressed ไม่พบP0/P1ใหม่ในcriticalsourceที่ตรวจ ชุดBready/ปิดsource reviewที่ `C:/mega/codex/iENA/outputs/XEDO_GEE_Cache_Phase3_2026-10-30/support/HANDOFF.md` Mainเป็นผู้รับผลและรวมoverview/queueต่อ

**รายละเอียด/หลักฐาน:** SourcecacheSHA3bbcb8b783592632a8294444c77e8cf81ba96d467053620f0e24f92226eabe18/testSHA16eb563acb1300db2f159452849a6f552d2f9b6c5ceb3529a73710a407599d9a เก็บmanifest11observations อ่านmainfull-tests-final.logมีfooter626tests/626pass/0fail/0cancelled/0skip ไม่ใช่supportรันเอง Reportstructure10ผ่าน/receipt-logconsistency8ผ่าน แยกจากapp/providercasesของsupport0 MainรายงานindependentSQLinventoryหลังcleanup0objects/0bytesตรงledger (queryนอกcontrolscript;supportยังไม่มีartifactแยก) และreseedภายหลัง147321bytes ไม่อ้างDBปัจจุบัน0 MainเลือกRAMgrace<=5min/ไม่เกินsessionexpiryแยกpersistentUTCepochและจะระบุheaders-onlycache-read/backgroundwriteใช้receipt ต้องsynccontract1200ms/นโยบายRAM/metricsช่วงcloseoutโดยmain

**สถานะ/ข้อจำกัด:** Browserlocal/hostedlifecycle/logged-inInspectorStorageเป็นหลักฐานแยก ไม่ถือผ่านจากการเริ่มรันหรือrouteชื่อauthenticatedที่ใช้anonheaders B01–B21ยังdesigned_not_run/actual:nullในsupport ไม่รันwebsite/SQL/provider/browser/benchmark ไม่แก้source/tests/schema/config/packages/env/accounts/services/Git/overview/queue ไม่อ่านkey ไม่push/deploy/Billing/subscription/สร้างแชทหรือagentเพิ่ม Appendหลังอ่านล่าสุดพร้อมprefixreceipt ไม่มีคำถามผู้ใช้รอคำตอบจากsupport

<!-- gee-cache-phase3-support-b-contract-closed-2026-10-30 -->
### 3.65B4 Support B ปิดข้อทวน contract — 30 ตุลาคม 2026

**หัวข้อ/สรุป:** อ่านcontract§3.10และ§3.3/3.4ล่าสุดยืนยัน1200ms/RAMgrace<=5minไม่เกินsessionexpiry/headers-onlyread/backgroundwriteproof/local-vs-Vercel/SQLUIไม่มีmigrationhistoryแล้ว Criticalsource/testไม่เปลี่ยนจากfreeze ปิดข้อทวนsourceและcontractของsupportครบ ไม่มีP0/P1หรือข้อแก้เอกสารค้างจากsupport ชุดBfinalพร้อมให้mainรวมoverview/queueที่ outputs/XEDO_GEE_Cache_Phase3_2026-10-30/support/HANDOFF.md

**รายละเอียด/หลักฐาน/สถานะ:** ดูภาพGuestที่mainบันทึกเห็นSentinel-2backgroundพร้อมNo area selected/readiness0/4 ไม่ได้เปิดbrowserเอง Mainรายงานsweepexpired-buildingก่อนPUT1รายการแล้วready12/charged1177006ตรงphysical12/1177006 แยกชัดจากunknownPUTที่ห้ามคืนchargeด้วยTTL เก็บmanifest12observations/reportchecks10ผ่าน/evidenceconsistency8ผ่าน/mainlog626ผ่าน ทั้งหมดแยกactorและข้อจำกัดไว้ Supportไม่มีapp/provider/SQL/browser/benchmarkexecutionใหม่ ไม่มีsource/tests/schema/config/packages/env/Git/serviceหรือoverview/queuechanges ไม่มีpush/deploy/Billing/subscriptionหรือแชท/agentเพิ่ม Appendหลังอ่านล่าสุดรักษาprefixเดิม ไม่มีคำถามรอคำตอบและไม่มีงานsupportที่ต้องรอก่อนmainปิดเอกสาร

<!-- gee-cache-phase3-primary-closeout-2026-10-30 -->
### 3.66 Persistent GEE PNG cache: โครงสร้างและวิธีตรวจซ่อม — 30 ตุลาคม 2026

**หัวข้อ/สรุป:** ข้อ 3 ของ GEE v1.1 implemented ใน working tree และเชื่อม Supabase xedo จริงแล้ว แต่ production code/env ยังไม่ได้เผยแพร่ ใช้คู่กับ [GEE_MAP_CACHE_CONTRACT.md](GEE_MAP_CACHE_CONTRACT.md) §3.10 และประวัติ/หลักฐาน [XEDO_WORK_LOG.md](XEDO_WORK_LOG.md) §3.66 Full suite ใหม่ 626 ผ่าน, syntax/build ผ่าน ไม่มีคำถามรอคำตอบ

**เส้นทาง request:** API ตรวจและถอด imagery session ที่ server ออกให้ก่อน รวม bounds/z/x/y ตามขอบเขตเดิม จากนั้นอ่าน RAM ต่อด้วย Supabase persistent cache และให้ GEE สร้างเฉพาะ miss Key ใช้ ordered full Sentinel-2 asset IDs + project namespace + actual renderer (map หรือ pixels) + clip จริง + Web Mercator grid/z/x/y + RGB/gamma + UTC source epoch ไม่ใช้ nonce/expiry ของ session เป็น persistent identity การสลับ map→pixels ต้องใช้คนละ key และคืน claim เก่าที่ไม่เคย PUT อย่างถูกต้อง ไม่แชร์ข้อมูลภารกิจ Inspector ในแคชภาพพื้นหลัง

**การอ่าน/การสร้างพร้อมกัน:** RPC lookup รอสูงสุด 1,200 ms ก่อน bypass (600 ms เดิมล้มเหลวกับ cold network จริง) leader ของ key จองพื้นที่ก่อน GEE, follower รอแบบ bounded ไม่สร้าง pixels แข่งระหว่าง lookup ตรวจ schema ของ RPC และ bind key/generation/path ทั้ง initial/follower lookup ก่อน Storage read ถ้าข้อมูลหาย/PNG เสียจึง invalidate อย่างถูกประเภท ไม่ตีความ timeout ของ Storage เป็นหลักฐานว่า object หาย Shared producer นับ consumers; caller สุดท้ายออกจึง abort producer งานที่ abort แล้วยังไม่ settle อยู่ใน retired set และนับกับ concurrency cap Caller ใหม่ไม่ join producer ที่ถูก abort และ finalizer เก่าไม่ลบ replacement

**การเก็บและเพดาน:** SQL ใช้ singleton budget row lock ก่อน entry lock เสมอ และอ่าน clock ใหม่หลังล็อก ไม่ถือ network request ค้างใน transaction จองสูงสุด 1 MiB ต่อภาพ ก่อน PUT ลดเป็นจำนวนจริงและบันทึก durable write intent path เป็น key/generation ที่ไม่ upsert ทับกัน ภาพต้องเป็น PNG 256×256 8-bit RGB/RGBA ที่ CRC/decompression/visible-alpha ผ่านและมี SHA-256/size ตรง อ่านกลับหลัง PUT ก่อน publish Opaque black ถือเป็นพิกเซลถูกต้อง ไม่ตัดทิ้งเพราะสีดำ

Cap ของ adapter คือ 200,000,000 bytes รวม ready/building/uploading/uncertain charges; metadata สูงสุด 4,096 entries และ recipe 16 KiB ไม่ใช่การเพิ่มโควต้าหรือรับประกันการใช้ Storage ทั้ง project ต่อผู้ดูแลที่เขียนไฟล์นอก adapter ถ้า PUT ไม่รู้ผลจาก HTTP5xx/timeout ต้องคง charge ไว้ ไม่คืนด้วย TTL หรือ 404 เดี่ยว `cancel_unstarted` ใช้ได้เฉพาะ generation ที่ยังไม่ dispatch PUT จริง Expired building ก่อน PUT sweep ได้ ส่วน cleanup object ต้องผ่าน Storage API ให้เสร็จก่อนคืน charge จึงไม่ลบเฉพาะ metadata แล้วคิดว่าคืน disk แล้ว เมื่อไม่แน่ใจหรือ budget เต็มให้ bypass ตามระบบเดิม

**อายุภาพ:** persistent epoch ตัดตาม UTC day และไม่ reuse เกิน 24h แม้มีไฟล์อยู่ ส่วน RAM session cache อาจมี grace ไม่เกิน 5 นาทีข้าม UTC midnight และไม่เกิน session expiry ไม่อ้างว่าทุกชั้นใช้ cutoff ตรงกันทั้งหมด การกลับพื้นที่เดิมยังมีการตรวจ metadata/freshness ของ GEE จึงไม่ใช่ GEE calls ทั้งหมดเป็น 0 แม้ cache hit ไม่สร้าง pixels ซ้ำ

**ฐานข้อมูล/สิทธิ์จริง:** namespace ใหม่ `xedo_map_cache` มี budget/entries (RLS enabled) เปิดให้ server role เท่านั้น RPC `public.xedo_cache_v1(text,jsonb)` เป็น SECURITY INVOKER, revoke PUBLIC/anon/authenticated EXECUTE และ private-schema USAGE ชัดเจน Bucket `xedo-gee-map-cache-v1` private, PNG 1 MiB ไม่เพิ่ม Storage policies ให้ Inspector อ่าน/เขียนโดยตรง API เป็นผู้ตรวจ session แล้วอ่านด้วย backend credential ตรวจ catalog สดและ anonymous RPC 401 แล้ว ชื่อ route authenticated ที่ทดสอบด้วย anon headers ไม่ถือเป็นผล logged-in Inspector Storage test

**การเปิดใช้และ secrets:** `GEE_CACHE_ENABLED=1`, `GEE_CACHE_URL=https://tstmjnlhwidwtzetqxbu.supabase.co`, server-only `GEE_CACHE_SERVER_KEY` เป็น opt-in เมื่อปิด/ไม่มี key/ไม่มี trusted lifetime จะ bypass คงเส้นทางเดิม `scripts/runtime-config.mjs` allowlist เฉพาะค่าที่ต้องใช้ ไม่มีคีย์ใน client bundle/auth cookie ที่ส่ง upstream Local Windows อ่าน DPAPI `data/gee-cache-server.dpapi` ของ user เดิมได้ helper รับคีย์ผ่าน local form/stdin ไม่ใส่คีย์ใน command line และเก็บไฟล์ ignored การแก้ System.Security ในรอบนี้ทำให้บันทึก key ได้จริงและทดสอบ round trip/live RPC ผ่านแล้ว Setup server หยุดหลังเสร็จ Vercel/Linux ต้องตั้ง secret environment ภายหลัง ไม่ย้าย DPAPI file ไป server

**การทำงานหลังตอบภาพ:** ใช้ `@vercel/functions` 3.10.5 waitUntil/getDeadline เฉพาะเมื่อมี request context ที่ยอมรับงานและ deadline เหลือเพียงพอ ก่อน PUT ตรวจเวลาอีกครั้ง Local server ติดตาม promises/deadline ของตนเอง ไม่มี runtime context ไม่เริ่ม persist และไม่เรียก producer ซ้ำ หลักฐานรอบนี้เป็น local hosted adapter+จริง Supabase/GEE; ยังไม่ยืนยัน lifecycle บน Vercel production หลัง response/disconnect จริงเพราะยังไม่ deploy

**Diagnostics:** `X-XEDO-Cache` คง RAM hit/miss/outside-aoi และเพิ่ม `X-XEDO-Persistent-Cache` hit/miss/bypass/follower/disabled; Server-Timing ใช้ fixed names เท่านั้น `gee_cache_read` วัดถึง headers ไม่รวม body (body อยู่ xedo_core), cache write อาจเสร็จหลังส่ง headers จึงต้องตรวจ ledger/readback/physical receipt แทนการอนุมานจาก timing เดี่ยว ผล live เป็น isolated sample ไม่มี P95/อัตรา hit/คำรับประกันความเร็ว เพดาน lookup 1,200 ms มีบันทึกผล 600 ms ที่เคย bypass ไว้

**การติดตั้ง/การซ่อมต่อ:** apply_migration ของ connector หมดเวลาสองรอบโดยไม่สร้าง object ใช้ SQL Editor รัน transaction จากไฟล์ db/gee-map-cache.sql ที่เทียบ normalized hash แล้ว (`941e6b24566d541c18e8d481d6905b956a30d5fa0884a390c098aea5fb436d37`) และอ่าน catalogs/actual API กลับ จึงไม่มี migration-history entry ใน Dashboard ต้องตรวจ object/version ก่อนแก้ schema ครั้งหน้า ไม่ apply foundation ซ้ำ การซ่อม unknown uploads ต้องยืนยันการสิ้นสุด writer และลบผ่าน Storage API ก่อนคืน charge; ห้ามแก้ budget/entries แบบคาดเดา

**หลักฐาน:** primary `C:/mega/codex/iENA/outputs/XEDO_GEE_Cache_Phase3_2026-10-30/primary/` มี logs/JSON/ภาพ/manifest; Node process ใหม่ persistent hit ใช้ PNG 147,321 bytes hash ตรง missและ pixels0; capacity reservations 192 ผ่าน8clients รับ190/ปฏิเสธ2 peak199,376,761; คืนQAแล้ว physical/ledger0 ต่อมา Guest browserเติมภาพจริง12ภาพ ยอด1,177,006ตรง ledger/Storageทั้งหมด ณ14:51:17UTC เงื่อนไขจำนวนนี้เป็น snapshot ไม่ใช่ค่าคงที่ ชุดใหม่626ผ่าน/0fail/0cancelled/0skip, syntax/buildผ่าน Audit0high/0critical/moderate4devtoolingหลังpin zod ไม่มี AI/mission write ใหม่ ไม่มี private-account/QGC/SITL/บินจริง/long-soak/mobile qualification ใหม่

**ผู้ช่วย/เผยแพร่/งานถัดไป:** ชุด B ตรวจ source/SQL/contract และส่ง21fault designs B01–B21 designed_not_run; mainแก้8ประเด็นและfollowerbindingจนผู้ช่วยปิดreviewโดยไม่พบP0/P1เพิ่มในส่วนที่ตรวจ Source/hash/report checks ไม่แทน app acceptance เหลือข้อ4ลดhostedassets (HTMLใหญ่ยังไม่แก้), ข้อ5วัดmatchedperformance/qualification และข้อ6publish/postdeploy lifecycleตามคำสั่งถัดไป ไม่แก้3ขั้นตอน/4ตัวคำนวณ/บัญชี/AI/worker/Pi/รายงานผลทดลอง ไม่ commit/push/deploy/Billing/subscription และไม่อ้างผล online เปลี่ยนแล้ว


<!-- hosted-assets-phase4-support-closeout-2026-10-30 -->
### 3.66B Support ข้อ4 ตรวจ hosted assets และส่ง final source review — 30 ตุลาคม 2026

**หัวข้อ/สรุป:** ชุด support พร้อมให้ main รวมผลที่ `C:/mega/codex/iENA/outputs/XEDO_Hosted_Assets_Phase4_2026-10-30/support/HANDOFF.md` พร้อม source/candidate/routing/evidence reviews, manifests และ H01–H36 ทั้งหมด designed_not_run/actual:null พบ C-F01 immutable matcher กว้างเกิน contract และ C-F02 ใช้ปุ่ม Inspector ที่สร้างก่อนเริ่มระบบครบเป็น ready marker; main แก้ทั้งสองแล้ว support อ่านยืนยันไม่พบ P0/P1 ค้างในส่วนที่ตรวจ โดย C-F02 ใช้ awaited entry import/evaluation ก่อนปลด inert

**รายละเอียด/หลักฐาน:** HEAD a5612696a80470733da4155bd953d01d7b553bd4 กับ working-tree hashes จริง; support ตรวจ artifact/source16ผ่าน, report structure10ผ่าน, final freeze/evidence consistency8ผ่าน/0ไม่ผ่าน รวม20main source hashes ตรงปัจจุบัน HTML23,516bytes/gzip5,799, initialJS795,360, CSS62,807,25files และ original Sentinel/brand/favicon hashes คงเดิม Main full-suite footer633ผ่าน/0fail/cancel/skip; final matched local HTTP static-body cold355,284bytes เทียบ baseline3,732,249 และ warmHTML304/body0/no static asset request เป็นผลของ main ไม่ใช่ support run หรือ GEE/FCP/LCP/SLA Support ดูภาพ late-init fault ที่ยังมี Inspector control พร้อม Reload; lockedShells2 และ404/reload→ready มาจาก main observation Lazy3D503/clean-server closeout อยู่ในงาน main ณส่งมอบ

**ขอบเขต/ไฟล์/เผยแพร่:** support อ่าน source/diff/artifacts/public official docs และรัน Python static/report consistency เท่านั้น ไม่มี app tests/build/JS import/browser/provider/SQL/account/AI job/benchmark ใหม่ ไม่แก้ source/tests/API/schema/config/package/env/services/overview/queue/Git ไม่ commit/push/deploy/Billing/subscription ไม่สร้างchat/agentหรือส่งข้อความข้ามchatเอง อ่าน canonical ล่าสุดก่อน append สอง MD และเก็บ prefix/hash receipt ใน support/CANONICAL_APPEND_RECEIPT.json รักษางาน phase3/CPU ของแชทอื่น Private Inspector acceptance, portable file:// offline, stale-tab/full fault coverage และ production Vercel lifecycle ยังไม่ถูกแทนด้วย checks เหล่านี้ ไม่มีคำถามผู้ใช้รอคำตอบ Main รวม overview/queue และหลักฐานที่เหลือต่อได้


<!-- hosted-assets-phase4-support-qa-supplement-2026-10-30 -->
**Support ข้อ4 — รับ QA เพิ่มและ idle:** main ส่ง fault-http-receipt/clean-server-headers/preserved-boundaries/demo-http-receipt และภาพ clean desktop/mobile เพิ่มแล้ว Support อ่านหลักฐานและเก็บ hashes ใน `outputs/XEDO_Hosted_Assets_Phase4_2026-10-30/support/QA_SUPPLEMENT.json` ตรวจ20source freeze ไม่พบ drift และเทียบ7cache/backend source กับ phase3 hashes ตรงทั้งหมด Fault receipt มี injected lazy3D503; mainรายงานข้อความ Reload/กลับ2Dได้ พร้อม404→Reload→ready และ late-initยังlocked2 Mainรายงานnormalconsole0/viewport390(actualcontent375) โดย support ไม่รัน browser/app/provider ใหม่ Headerreceipt ยืนยัน HTMLno-cache, JS/CSS/PNGimmutable/MIMEตรง; missing404 มี cacheControl:null จึงไม่อ้างว่าได้รับ explicit no-cache directive Demoเก่ายังแยก boot wrapper รุ่นก่อน ไม่แทน final cold receipt ไม่มี P0/P1ค้างในส่วน source ที่ตรวจ ไม่มีคำถามผู้ใช้รอคำตอบ ไม่มี implementation/test/build/บริการ/Git/publish ใหม่จากsupport Appendหลังอ่านล่าสุดรักษาprefixเดิม ไม่แก้overview/queue Supportปิด append และ idle ให้mainรวม canonical/queueต่อได้

<!-- hosted-assets-phase4-primary-closeout-2026-10-30 -->
### 3.67 Hosted asset build, startup และการซ่อม cache — 30 ตุลาคม 2026

**หัวข้อ/สรุป:** ข้อ4ทำเสร็จในเครื่อง แยก hosted ออกจาก portable build แล้ว HTMLสุดท้าย23,516bytes/gzip5,799 และ static cold bodies355,284bytes ในการทดสอบlocalhost คง3ขั้นตอน/4ตัวคำนวณ มี633testsผ่าน ไม่เผยแพร่หรือเปิดบริการเสียเงิน ประวัติและตารางผลรันอยู่ [XEDO_WORK_LOG.md](XEDO_WORK_LOG.md) §3.67

**สถาปัตยกรรม build ปัจจุบัน:** `npm run build` → scripts/build.mjs → buildHosted ใน scripts/hosted-build.mjs สร้าง dist/index.html จาก public/planning.html และ dist/assets/ ที่มี esbuild content hashes/asset SHA-256 prefix Build report อยู่ output/hosted-build-report.json นอก dist ไม่เปิดรายงาน/source manifest/secrets ให้ browser โหลด Hosted buildไม่เรียกbuild-planning-fileอีกแล้ว ส่วน npm run build:file ยังเป็น inline/IIFE/data images ตามเดิม และ build:workspace ยังคงเส้นทางเดิม

Entry ยังคง __XEDO_STANDALONE__=true และ __XEDO_GEE_HOSTED__=true จึงใช้ in-browser calculation API ตามที่ยอมรับแล้ว ไม่เรียก workspace calculation endpoint ที่ไม่มีบน hosted ค่า runtime.localFile=false ยังแสดง Inspector/AI ใหม่ได้ __XEDO_PREVIEW_DATA__ ใน hosted เปลี่ยนเป็น /assets/sentinel-proof-<hash>.png; bindingเดิมใช้เป็นURLได้ ไม่ถือว่าเป็น data URI เท่านั้น ใช้ต้นฉบับภาพ byte-for-byte และโหลดเมื่อเลือก archived preview ไม่ทำให้ GEE image review พร้อมเพียงเพราะไฟล์มีใน cache

**การแบ่งไฟล์:** ESM splitting คง dynamic imports ของ deployment-3d.js, raster-cog.js/TIFF decoders และ planning-file-api.js แยกจาก static initial graph Preload เฉพาะ root entry และ static descendants เพื่อไม่ให้เกิด waterfall ที่ไม่จำเป็น ทุก import/CSS URL มี emitted file จริง ชื่อ JS/CSS/image มี content version และ import ระหว่าง module ใช้ relative URLs Initial closure795,360byteJS/CSS62,807bytes ไม่อ้างว่าโค้ดทั้งระบบมีขนาดเท่านี้หรือถูกลบส่วน3Dออก

**Startup:** src/planner-boot.js ถูกฝังเป็น inline type=module หลัง preload ใน head ซึ่งประเมินหลัง body parse เสร็จ แล้ว await import(data-entry) จน entry ประเมินสำเร็จครบจึงเอา inert ออกจาก header/main และลบสถานะ Loading planner ถ้าโหลด/parse/evaluateผิดพลาดจะแสดง alert/Reload โดยคง inert ไว้ ใช้ import promise แทนการอนุมานจาก element เช่น Inspector button ซึ่งอาจถูกสร้างก่อน exception จุดหลัง ค่า loading/status ไม่ผูกกับความพร้อมของ GEE pixels; ภาพมี progress/error ของตนเอง กรณี lazy3Dล้มเหลวยังมี error/Reload/เตือนเก็บsnapshot และกลับ2Dได้

**รูปสำหรับ hosted:** xedo-brand-mangrove-web.png เป็น384×384 RGBA/80,465bytes เทียบต้นฉบับ1254×1254/735,936bytes ใช้URLเดียวกันสำหรับสอง layerที่ปรับwordmarkตามCSS จึงไม่ส่งโลโก้ซ้ำสองก้อน Favicon96×96/10,150bytes cropจากต้นฉบับ x125,y110,w1000,h890 ตาม SVGเดิม แล้ววางใน96×85pxที่y5บนพื้นใส Windows System.Drawing HighQualityBicubic/HighQuality pixel offset เป็นเครื่องมือสร้าง derivativeครั้งนี้ ไม่เป็น runtime build dependency ไม่ต้องติดตั้งPython/Pillow/แพ็กเกจภาพใหม่ ต้นฉบับโลโก้/favicon/Sentinelคงhashเดิม ภาพหลักฐานดาวเทียมไม่ resize/re-encode รายละเอียด source/derivative hashesอยู่ artwork-derivatives.json

**Cache และการซ่อม:** scripts/static-cache.mjs ให้ immutable1ปีเฉพาะ /assets/<ชื่อ>-<hash>.<js|css|png|jpg|svg> HTMLใช้no-cacheเพื่อเช็กเวอร์ชันใหม่ทุกครั้ง vercel.json ใช้ named parameter/custom regexเดียวกันตาม official [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json) มี positive/negative testสำหรับชื่อไม่มีhash/nestedpath/extensionอื่น/API กฎนี้ไม่ทำให้ API/account/mission responsesถูกcache Missing local file404ในreceiptไม่มีexplicit Cache-Control header ไม่อ้างว่าresponseส่งno-cacheมา Vercelstaticheaders/runtime/cache404/assetretentionและaliasสลับreleaseยังต้องตรวจตอนเผยแพร่

เมื่อ UIเก่าพยายามโหลด feature chunkหลังสลับdeployment อาจหาไฟล์เวอร์ชันเดิมไม่พบได้ ชื่อhashป้องกันการนำไฟล์คนละรุ่นมาใช้แทนแต่ไม่รับประกันว่าไฟล์เก่าจะคงอยู่ การกู้ตามUIคือเก็บsnapshotแล้วReloadหน้าให้HTMLชี้ชุดใหม่ ไม่ทำ service worker หรือเปิดpaidassetretentionในรอบนี้ ห้ามแก้เป็นcache HTML immutableหรือpreloadทุกchunkเพื่อซ่อนปัญหา

**วิธีตรวจต่อ:** build hostedก่อน เปิด local serverด้วยXEDO_FRONTEND_MODE=hosted (ข้อมูลGEE/authอ่านค่าฝั่งserverเดิม ไม่ฝังคีย์ในbuild) เช็ก HTML MIME/no-cache และทุกroot/static import/stylesheet/imageมีไฟล์200+MIMEถูก จากนั้นเปิดGuest→GEE background, demo→archivedimage→prepare→Calculation detailsทั้ง4ส่วน→3D ตรวจcoldและwarmด้วยsource/build/input/cache/networkเดียวกัน แยกAPI/GEEออกจากstatic transfer มิฉะนั้นตัวเลขก่อนหลังจะตอบคนละคอขวด tests/hosted-build.test.mjs ครอบคลุมartifactgraph,sharedlogo/evidenceidentity,compiledcalculator,preloads,cachematcherและstartupreject/resolve

**ผลจริง/หลักฐาน:** Final HTML6,207,852→23,516bytes; browser static bodiesหลังgzip3,732,249→355,284bytes (90.4807%) ผ่านsame local server/freshorigin ไม่รวมheaders/API/GEE เป็นbyte reductionไม่ใช่load-time improvement Warmรอบนั้น HTML304/body0และไม่มีstaticrequest Mainตรวจ3Dnormalพร้อม16waypoints,partialinitlateThrowที่ยังมีInspectorDOMแต่locked2/main404→Reload→ready/lazy3D503→กลับ2D; cleanserver5182ส่งMIME/headerถูก Desktop1265/mobileoverride390×844(content375)ไม่ล้น normalconsole0 Signinpanelเปิด/ปิดได้โดยไม่loginใหม่ Fullsuite633/0fail/cancel/skip,focused7,syntax/hosted/portable/workspacebuildผ่าน ไม่มีFCP/LCP/P95/longsoakหรือfreshprivate-account/SITL acceptanceใหม่

หลักฐานprimary `C:/mega/codex/iENA/outputs/XEDO_Hosted_Assets_Phase4_2026-10-30/primary/` โดย final-http-browser-receiptเป็นsourcefreezeสุดท้าย ส่วนdemo-http-receiptเป็นรอบbootก่อนทวนที่main/lazychunksยังhashตรงfinal ต้องแยกactor/เวลา ไม่ใช้historicalcoldแทนfinal Source/backendcache7ไฟล์ตรงphase3 ผู้ช่วยเดิมตรวจsource/contract/evidenceอย่างเดียว ปิดC-F01/C-F02แล้ว Hcasesยังdesigned_not_runเมื่อไม่รัน ไม่แทนmainruntimeด้วยreportchecks

**สถานะ/งานต่อ:** Localpreviewปกติ http://127.0.0.1:5182/ เป็นรุ่นในเครื่องที่คงAPIจริงไว้ ไม่ใช่QAproxy ไม่มีcommit/push/deploy/productionconfig/Billing/subscription ไม่เปลี่ยนschema/accounts/permissions/AI/worker/model ข้อ5matchedperformance/extendedqualificationและข้อ6publish/postdeployยังรอคำสั่งถัดไปตามขอบเขต ไม่มีคำถามรอคำตอบ


<!-- performance-phase5-support-final-2026-10-30 -->
### 3.67B Support C ส่งผลตรวจข้อ5 performance/resilience ในเครื่อง — 30 ตุลาคม 2026

**หัวข้อ/สรุป:** ส่ง final support ที่ `C:/mega/codex/iENA/outputs/XEDO_Performance_Phase5_2026-10-30/support/HANDOFF.md` พร้อม METHOD/TOOL/BROWSER_TOOL/FINAL_REPORT/EVIDENCE reviews, SOURCE_MANIFEST และ P01–P32 design ทั้งหมด designed_not_run/actual:null เมื่อยังไม่ครบเงื่อนไขที่ออกแบบ ไม่ใช้ผลย่อยของ main แทนทั้งmatrix Mainแก้harness session/path/expiry replay, resourcebuffer/overflow และprecompressionก่อนวัด พร้อมแก้ REPORT wording/absolute utility pathแล้ว ไม่มี P0/P1 source/report ค้างที่ support พบใน bounded local subset

**รายละเอียด/หลักฐาน:** HEAD a5612696a80470733da4155bd953d01d7b553bd4 กับ20product source hashes ตรง initial/final/current; rebuiltHTML23,516bytes SHA5baaaa8f51b84d810d4861c78868f0511c278550e2f7b04304fdc4b111b0354f Mainfreshsuite633ผ่าน/0fail/cancel/skip และ syntax/hosted/workspace/portablebuildsผ่าน Supportรันเฉพาะfile/source/receipt arithmetic: cache12, principalstartupsummary10, supplementaryoriginaltrace8, cancellation/fallback8, soak10, finalfreeze8, reportstructure10ผ่าน/0ไม่ผ่าน ไม่รวมเป็นapplicationtests และไม่มี support app/build/JSimport/browser/provider/benchmark execution

**ผลและขอบเขตตัวเลข:** maincache5pairs hit5/5/pixels0แต่ช้ากว่าoff3/5คู่ medianpairedsaving−44.50ms ไม่อ้างเร็วสม่ำเสมอ Mainprincipalstartupcomplete-case B1R/B2/B3 vsC1/C2/C3 DOMmedian388.3→228.3ms แต่FCP140→204msช้าลง64ms เฉพาะlocalprecompressed/recordedimagefixture/actual1280×720DPR2; B1Roriginเดิม/no-store/unresetbrowserstateและoriginalB1paintnull/incompleteแยกชัด Mainlive/replayoff visible695.0021s (~11m35s) pageexceptions0/overflow0 terminalDOM815/canvas2/dialog0/trackedRAF0/Blob0 มีproxy44AbortError recordsในlivewindow แยกจากpageexceptionsและไม่อ้างว่าทุกrequestสำเร็จ Mainmanual30modalpairs+2geometryimport/20manual3Dcycles/10same-boundarypresetresets+GeoJSONA→B→A; AXยืนยันroute1.19→1.86kmและdownloadยังblocked ส่วนareaเป็นmainCUAobservations Heap/scrollเป็นค่าประมาณและcontextual ไม่ใช่leak-free/60FPS/P95/SLA

**ไฟล์/ข้อจำกัด/เผยแพร่:** ดู main primary/REPORT.md และ support auditJSONs/hashes ไม่ใช้imageryready statusแทนprecisefirsttile/required-set/AOIcompletepaint Cancellationเป็นdirectcore+localhold และoutageเป็นcache-clientinjection ไม่ทำให้providerจริงล่ม Capacity/privacyphase3/assetphase4ยังเป็นหลักฐานเดิมตามsourcehash ไม่ใช่freshphase5รับรองprivateInspector/nearcapphysicalcleanup/real31minUTCexpiry/offline/AIinference/flight/VercelCDN งานที่ไม่รันยังระบุชัด SupportเขียนเฉพาะoutputและappendสองMDหลังre-read รักษาprefix ไม่แก้overview/queue/source/tests/config/schema/package/keys/services/Git ไม่สร้างchat/agent/ส่งข้อความข้ามchatเอง ไม่มีcommit/push/deploy/Billing/subscription ไม่มีคำถามผู้ใช้รอคำตอบ Mainรวมoverview/queueและข้อ6ตามคำสั่งผู้ใช้ถัดไป Supportส่งมอบแล้วและidle

### 3.68 GEE v1.1 ข้อ 5 — วิธีวัด แยกชั้น และแก้ต่ออย่างตรวจสอบได้ (30 ต.ค. 2026)

รอบนี้เป็นqualificationของsourceหลังphase4 ไม่มีproductfixเพิ่ม 20frozenfiles/HEADa5612696a80470733da4155bd953d01d7b553bd4ตรงก่อนเริ่ม การแก้เฉพาะdiagnosticอยู่ในoutputs/XEDO_Performance_Phase5_2026-10-30/primary ไม่เข้าsrc/distที่ส่งมอบ แชทหลักรันapplication/provider ผู้ช่วยเดิมตรวจsource/คำนวณ/evidenceเท่านั้น คงplanner3steps/4calculators/privateInspector/localCPUและเลื่อนPi/ผลทดลองตามเดิม

**Measurementarchitecture:** ordinaryhostedpreview5182ใช้realAPI/cacheเดิม QAmeasurementserver5188และfreshorigins5301–5306ส่งprecompressedHTML/hashedassetsพร้อมinstrumentเดียวกันเพื่อแยกstartup CPUgzipออกจากrequesttime LiveGEEfixtureผูกexactgeometry/currentmanifest/session/expiryและfulltilepath ก่อนstartupให้replayเฉพาะชุดเดิม ปิดreplayก่อนlivesoak Noauth/privatepayloadforwardผ่านQAproxy ไม่มีpassword/key/forminputในmetrics Sample5sec/ResourceTimingcapacity5000+fullcounter และเก็บDOM/approxheap/appRAF/liveBlobcounts CustomRAFsamplerเองไม่ถูกรวมpendingappRAF

**Endpointdefinitions:** UIreadyคือobservedboundหลังmoduleประเมินสำเร็จ/overlayหาย/expectedDOM/noerror ไม่ใช่ทุกasyncdataพร้อม Basemapreadyเป็นapplicationstatusเมื่อtrackedloadsจบและมีvisiblealphaอย่างน้อยหนึ่งtile ไม่รับรองAOI/required-setcompletenessหรือpaint Image-reviewreadinessเป็นอีกcontractหนึ่ง FCP/LCPเป็นPerformanceObserverpaintmetrics แยกจากstatusและAPIlatency Resourcecountsเป็นcumulativepagelifetime ไม่ใช่ต่อaction Heapเป็นcoarseChromiumJSไม่ใช่processRAMหรือleakproof

**Startupactual:** sameIABactual1280×720/DPR2/visible/loopback/precompressed,completeB1R/B2/B3เทียบC1/C2/C3n3 UIreadymedian388.3→228.3ms และFCP140→204ms ต้องรายงานทั้งสอง ไม่ใช่ทุกmetricดีขึ้น Statusfirst569.4→373.5/last1099.5→949.2msกับrecordedfixtureไม่ใช่liveGEEเวลาจริง Candidatecoldassetsfreshoriginแต่browserprocess/code/OSwarm BaselineB1ขาดpaint/statusเก็บnullและใช้B1Rบนoriginเดิม/no-storeพร้อมcaveat Pilotmethodก่อนprecompressionตัดทั้งคู่ ไม่เก็บbaselinepilotfullrawจึงไม่สร้างข้อมูลแทน Warmn1แยกและไม่อ้างP95/SLA/productionnetworkcausality

**Cacheactual:** 5fresh-processoff/onpairsalternateorder/fulltilebodyพร้อมmetadataแยก onhitspixels0และPNGhashตรง แต่ช้ากว่าoff3/5คู่ medianpairedsaving−44.50ms ต่างจากgroupmedians1012.37→891.31ms ความสำเร็จที่ยืนยันคือreuse/reducedGEEpixels ไม่ใช่guaranteedlatencywin RAM13samplemedian2.1ms A/Bclipidentityแยกhashและกลับhitได้ sessionclock+31minจำลอง410/pixels0ไม่ใช่31minrealwait budget≤200MBตามreceiptsไม่ใช่physical/near-capqualificationใหม่ Server-Timingcache-readถึงheaders ต้องอ่านexplicitbodyspan/fullAPIwallเพื่อวัดPNGครบ Missingtimingไม่เท่ากับ0และGEEproviderinternalcacheunknown

**Live repeated-use:** visible695.002s/elapsed695.057s/no visibilitychanges,32settingspairs(30regimen+2imports),20manual2D/3Dcycles,10demoexit/restore/review/preparecyclesแบบsamepreset เพิ่มactualGeoJSONA→B→Aarea24131/15444/24131m² routes1.86/1.19/1.86kmพร้อมresetreview/recompute ไม่มีstalerouteBค้างเมื่อกลับA ค่าคลิกQAรวมprogrammaticclicksต้องใช้manualledgerแยก Scrollwheelsettings6pairs/page5pairs TerminalDOM815/canvas2/dialog0/appRAF0/Blob0 pageexceptions0/fullbuffer0 Proxy44AbortErrorrecordsระหว่างcontextsแยกจากpageexceptions ไม่มีotherproxyerrornameแต่ไม่มีper-requestID/pathสำหรับrootcauseทุกคำขอ RecordcompletedHTTP20เป็น200/livePNG12/fixturefalse อย่าอ้างทุกคำขอสำเร็จ Framegaps1751/max66.7ms/4over50/0over100ไม่ใช่ทุกเฟรม60FPS Heapmin9.92/max18.91/final14.22MBไม่พิสูจน์leakfree

**Cancellation/repair:** QAholdทำเฉพาะfirstclaimก่อนproviderdispatch150msเพื่อทดสอบconsumerabort/producerretirementที่ควบคุมเวลาได้ SharedAได้GEE_REQUEST_CANCELLED499/Bยัง200claim1 Newrequestหลังretireแต่ก่อนoldholdจบได้200claim2ตรงhash Cache-clientthrowinjectionfallbackrealGEE200/pixels1/hashตรง ไม่สร้างprovideroutageจริง FirstQAassertionใช้AbortErrornameผิดเพราะbackendnormalize499แล้ว จึงแก้diagnosticassertionและรันใหม่ ไม่ต้องแก้product Exportfinalreceiptsก่อนปิดQAserverเพราะlatestmetricsเขียนทุก5secและเปลี่ยนได้

**Rerun/evidence:** อ่านprimary/REPORT.mdที่มีprotocol/pilots/incomplete/limitsก่อน ใช้absolute `python C:/mega/codex/iENA/outputs/XEDO_Performance_Phase5_2026-10-30/primary/summarize-closeout.py`ตรวจ20sourcehash/summaryจากretainedreceipts ไม่ใช่รันbrowserใหม่ ฟังก์ชันcheckจะfailหากsourceเปลี่ยน Fullsuiteใหม่633pass/0fail/cancel/skip+syntax/3buildsผ่าน HostedHTML23516bytes/hashในverification-summary Supportchecksไม่รวม633และP01–P32ยังdesigned_not_runเมื่อไม่ครบassertionsจริง Cleanpreview5182publicGEE/zoomกลับได้console0;QAproxyปิด/viewportresetแล้ว ไม่ยึดlocalhostเป็นserverถาวรข้ามreboot

**Releaseboundary:** ไม่มีcommit/push/deploy/productionenv/Billing/subscription/schema/accounts/permissions/model/workerchangeหรือAIjobใหม่ Cachewritesตามpublicrequestsเป็นพฤติกรรมเดิม ไม่ใช่schemachange ข้อ6ต้องจัดserver-onlycachecredential/envตามauthorizationและตรวจVercelstaticrouting/MIME/cache-control/CDN/lifecycle/backgroundwrite/hashedassetretention/staletab/CI/identity/aliasรวมprivateInspector/AI/localCPUหลังdeploy Source/configunitreviewไม่แทนruntimeดังกล่าว Physicalmobile/trackpad,hourslong/OSreboot/extendedCPU,multisession,portableoffline,SITL/flight/livefaultmatrixที่ไม่รันยังfollowup ไม่มีคำถามรอคำตอบ

<!-- phase6-main-start -->
### 3.69 GEE v1.1 ข้อ6 — เตรียมpush/deployและproductionqualification (30 ต.ค.2026)

ผู้ใช้อนุมัติข้อ6ในรอบนี้อย่างชัดเจน จึงส่งงานให้supportเดิมทำsource/scope/releaseidentity/evidencereview Mainเป็นผู้แก้และดำเนินGit/provider/browserเท่านั้น ยืนยันGitmain/codexเดิมa5612696a80470733da4155bd953d01d7b553bd4และVercelxedo/projectprj_x35WcipWxA767cYwv3f0CXcdyea3/team_CV1O0uIz6BcarAQAOb8soV0I/Hobby/aliasxedo-eight.vercel.app Productionก่อนเริ่มdpl_EG7VyQiMMZpdXuSxmeSLep3KcsGmตรงรุ่นเดิม ไม่เปลี่ยนplan

ตรวจใหม่npmtest633pass/0fail/cancel/skip,npmruncheck/hostedbuildผ่าน HTML23516bytesตรงphase5 Workerunittest84ผ่านเป็นข้อมูลlocalแยก ไม่รวมเป็นapptestsและไม่ส่ง9dirtyCPUlauncher/worker/guidepathsขึ้นGitในGEEreleaseนี้ Payload31ไฟล์ตามoutputs/XEDO_Performance_Phase6_2026-10-30/primary/release-file-manifest.json รวมcachebackend/hostedassets/tests/docsและSQLsourceที่ติดตั้งแล้วในphase3 ไม่applySQLซ้ำ คง3ขั้นตอน/4ตัวคำนวณ/Inspectorprivate/AI/localCPU

Preflightscan31sourcefiles+clientartifactsรวม56ไฟล์เปรียบเทียบrealcredentialneedlesในเครื่อง พบ0matches/clientservermarkers0 ไม่บันทึกค่าkeyลงoutput MCPอ่านenvVercel403และlocalauthAPI403จึงใช้ChromeDashboardที่มีsessionเดิม อ่านชื่อ4varsเดิมได้ เตรียมGEE_CACHE_SERVER_KEYเป็นSecret/Productionแต่ยังไม่กรอกหรือSave Browserpolicyต้องยืนยันaction-timeก่อนเพิ่มsecurity-sensitiveaccessจึงถามผู้ใช้แล้ว รอคำตอบนี้ ไม่เปิดBilling/subscription ไม่เปลี่ยนschema/accounts/permissions

เป้าหมายpostdeployคือexactcommitCI+READY+alias/hash/MIME/cacheheaders/anonymousguards/GEEimagery/persistentmiss→deferredwrite→readbackhit+budget/privateLogin-history/AI-CPUflow ภาพเก่าในbrowserมีexpiredGEEsessionและprivateauthอาจต้องrefresh ต้องรักษาdraft/snapshotก่อนreload ยังไม่ถือเป็นผลpostdeploy รอบเตรียมนี้ยังไม่commit/push/deploy/applyschemaหรือสร้างAIjobใหม่ หลักฐานและสถานะล่าสุดจะเติมในownedsectionนี้หลังดำเนินการจริง

**อัปเดต31ต.ค.ก่อนpatchrelease:** ผู้ใช้ตอบอนุญาตSecretแล้ว ตั้งGEE_CACHE_SERVER_KEYเป็นSecretเฉพาะProductionและGEE_CACHE_URL/GEE_CACHE_ENABLEDเป็นConfigเฉพาะProductionผ่านChromeDashboard บันทึกยืนยันชื่อ/type/targetไม่เก็บค่า ลบtemporarycurrent-user-onlyignored.envแล้ว ไม่เปลี่ยนextensionpermissions (fileuploadถูกextensionปฏิเสธ ใช้ช่องSecretที่มีอยู่แทน) คำถามนี้ปิดแล้ว MCPอ่านenv/localauthAPI403เก็บเป็นข้อจำกัดเครื่องมือ ไม่ถือเป็นBillingหรือเพิ่มบัญชี

Commit31filesfb484bc28076b5a5d49d407e7377143cf25fbdeeถูกpushmainแล้ว CI41094473431success InitialCakfr...READYจากGit แล้วredeploysamecommitหลังenvครบเป็นdpl_D2aTXfcNyXFAmuBiRsZtB4an2Rhz READY/aliasxedo-eight.vercel.app/iad1/build11s HTML23516และ24assetshashตรงlocalทั้งหมด Public/privateAPIguardsผ่าน แคชnewclipwest101.088076543tile11/1599/951ได้miss151574bytes/hashed55d10c614435468d3a873784e4acc06534198a209af79eb7db3cfb9d58de50 แล้วSQLjoincacheentry/storageยืนยันready/write_settledtrue/content_hashตรง/physical151574bytesหลังresponse เป็นactualVercelwaitUntillifecycle ไม่ใช่localdefer สั่งreturnในinstanceเดิมได้manifestcache/sessionเดิมและRAMhit จึงไม่ใช้เป็นpersistentreturnproof เก็บsame-session-not-proofreceiptและจะตรวจอีกครั้งบนnewdeployment

**ข้อพบS03และวิธีแก้:** missinghashedURLตอบ404แต่headerwildcardให้Cache-Controlimmutable31536000จริง จึงปรับscripts/static-cache.mjsสร้างsourceจากexact24emittedassetnames เพิ่มscripts/update-hosted-cache-rules.mjsสำหรับregeneratevercel.jsonก่อนcommit และscripts/build.mjsให้failหากcacheinventoryไม่ตรงbuildgraph Cloudbuildต้องvalidateก่อนdeployไม่แก้configเงียบๆตอนruntime tests/hosted-build.test.mjsครอบคลุมunknownvalidhash404และallactualassets Focused7/buildผ่าน browserHTML/assethashไม่เปลี่ยน ยังรอfullregression+patchdeployment+postdeploy/privatebrowserqualificationก่อนถือว่าข้อ6จบ หลักฐานprimary/static-production-before-fix.json/cache-miss.json/cache-db-ready.json


**ปิดข้อ 6 หลังทดสอบจริง — 31 ต.ค. 2026:** patch `71e8f45053f7b38fefe6ce382f96619e5d682297` ถูก push ไป main, CI [41095720672](https://github.com/megaaaop/XEDO/actions/runs/41095720672) success, Production `dpl_EtSbsVA5JPknKc1G8yCEgG5NSsWG` READY/iad1 และ alias https://xedo-eight.vercel.app/ ชุด regression ใหม่ focused7/full633ผ่าน (0 fail/cancel/skip), syntax/hosted buildผ่าน; Linux CI ตรวจ hosted/workspace/portable builds ไม่อ้างว่า buildสามแบบรันใหม่ในเครื่องรอบนี้ Local worker84testsผ่านแต่เก้าไฟล์ CPU dirtyไม่ได้รวม Git release

Production HTTP29 checks: HTML23,516bytes SHA256 `5baaaa8f51b84d810d4861c78868f0511c278550e2f7b04304fdc4b111b0354f`; actual24assets bodyhash/MIME/immutableตรง localdist; missing plausible hashedURL404 `public,max-age=0,must-revalidate`; HTMLno-cache, guest/privateAPI no-store/401/405ตามสัญญา แก้S03ได้จริงโดยไม่เปลี่ยน clientHTML/asset bodies เมื่อ graphเปลี่ยนให้รัน `node scripts/update-hosted-cache-rules.mjs` แล้ว commit vercel.jsonพร้อม source; buildตรวจ staleinventoryและ fail ไม่ rewrite configเงียบๆ

Cache missPNG151,574bytes/hash `ed55d10c614435468d3a873784e4acc06534198a209af79eb7db3cfb9d58de50` เขียน DB/Storageready/write_settledเวลา17:00:53.067958UTC หลัง clientreceipt17:00:50.962UTC ยืนยัน lifecycle Vercel waitUntilจริง ต่อมาบน newdeployment/newsignedsessionอ่าน persistenthit/RAMmiss/hashเดิม ไม่มี gee_pixels timingในคำขอนี้ ไม่อ้างว่า providerlogsทั้งหมดไม่มีcompute งบ snapshot cap200,000,000/charged9,202,276/physical5,007,972bytes/43objects+4buildingreservationsยัง conservative; ไม่ใช่ near-capstressใหม่ Bucketprivate/anonและauthenticated directschema/table/RPCfalse/serverRPCtrue

Private browserผู้ใช้ Sign inเอง ไม่อ่านรหัส และไม่ reload/ปิดแท็บ draftเดิม เปิด history3/2/1/v3เดิมได้ สร้าง QAmission `0438d788-342d-4ced-b7d1-d3687d22d1ca`, Analyzeพื้นที่ใหม่651,427m², job `b31e96e2-6785-4554-ad09-416a479a7acd` succeededattempt1 (~61.37sรวมqueue/imagery/inference/publication ไม่ใช่ inferenceล้วน) ผลSAR26Oct23:00:37UTC/UNet/checkpoint41a2bd4b5b23/threshold0.3/candidates0ไม่ยืนยันไม่มีน้ำมัน Inspectorวาด4มุม/แก้GeoJSON/Undo/Redoตรง; confirmก่อนreviewภาพถูกblockโดยเก็บdraftไว้ จากนั้นโหลดSentinel2จริง27Oct03:54UTC/reviewv2manualcomplete/route2.03km22waypoints/73terrain samples/เปิด4calculators/3D Diagram–Satelliteพร้อมgroundจริง Savev3→history3/2/1→reopenv3และSQLยืนยัน geometry/sourcehash/analysisRef/owner/baseReviewRevision2ตรง ภารกิจเดิมยังv3 WorkerกลับREADYและไม่ถูกหยุด

Desktopcontent1425/scroll1425, mobileoverride390×844 actualcontent375/scroll375; accountdialogไม่ล้น คืนviewportแล้ว Consolecapturedwarning/error0; runtimeerror/fatalqueryของdeploymentในช่วงที่ตรวจไม่พบmatchingrecords ไม่ใช่รับรองทุกtraffic/monitoringใหม่ ไม่มีprivate two-account/session-expiry/conflict matrixใหม่, physicalmobile, hours-longsoak, reboot, offlineportable, QGC/SITL/บินจริง หรือaccuracyqualification Normalflightdownloadยังล็อกตามwind/battery/Home/reviewที่ขาด ไม่กดยืนยันแทนผู้ใช้ SupabaseWARNเดิม leaked-passwordprotectionยังไม่เปิดเพราะ [officialdocsระบุProขึ้นไป](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); ไม่เปลี่ยนแผนหรือเพิ่มpolicyกว้างเพื่อซ่อนINFOของprivateRLS

**หลักฐาน/ส่งต่อ:** `C:/mega/codex/iENA/outputs/XEDO_Performance_Phase6_2026-10-30/primary/REPORT.md`, static-production-patch.json/cache-return-patch.json/cache-db-ready.json/cache-budget-privileges.json/browser-acceptance.json/private-persistence.json/responsive.json/browser-console.json/production-3d-satellite.jpg และ support/HANDOFF.md ผู้ช่วยตรวจ source/artifact/receiptเท่านั้น R01–R24ยังdesigned_not_run/actual:null ไม่รวมเป็น mainruntimeผลผ่าน สอง canonicalMD/queue/แผน§19รวม final docs-onlyfollow-up; identityสุดท้าย/CI/alias/static+cache smokeและการยืนยัน appinputsไม่เปลี่ยนเก็บ `primary/final-publication.json` หลีกเลี่ยง commit-self-reference ไม่อ้าง privateUI replayบน docs-onlydeployment

**งานคงเหลือ/ขอบเขต:** GEE v1.1ข้อ1–6จบตามsubsetที่บันทึก ไม่รับรองความเร็วทุกครั้ง (phase5hitช้ากว่าoff3/5คู่/FCPlocalช้าลง64msยังคงข้อจำกัดเดิม) เก้าไฟล์ localCPU launcher/guard/guideยัง dirtyและแยกGitdelivery; workerยังใช้CPUเครื่องนี้ ต้องเปิดเครื่อง/ออนไลน์/READYเพื่อAnalyzeใหม่ ส่วนphysicalmobile/extendedqualification/flightและfuture split-to-different-split staleasset recoveryยังเป็นfollowup Pi/telemetryและรายงานทดลองก่อน–หลังพักตามเดิม ไม่มีรอคำตอบผู้ใช้ ไม่มีBilling/subscription/schema/accounts/permissionchange รอบนี้

<!-- phase6-main-end -->

<!-- capsule-degradation-document-check-2026-10-31 -->
### ขอบเขตหลักฐานวัสดุแคปซูล — ตรวจเอกสาร 31 ตุลาคม 2026

ผลตรวจเอกสารวัสดุครั้งนี้ไม่เปลี่ยนพฤติกรรมเว็บไซต์/ตัวคำนวณ โปสเตอร์ `C:/Users/ASUS/Downloads/XEDO  poster.pdf` และ `XEDO-poster.pdf` หน้า 1 กราฟ 8–9 ติดตาม **TPH removal และ viable microbial count เป็นเวลา 28 วัน** ไม่วัดการย่อยสลายของตัวเปลือก จึงไม่ใช้ 28 วันเป็น capsule lifetime/default หรืออ้างว่าเปลือกย่อยหมดภายในหนึ่งเดือน กราฟ 8 รายงาน 84.2 ± 4.8% ณ วันที่ 28 ขณะที่ `บทพูด-Xedo.docx` ผู้พูด 3 ระบุ up to 91%; ยังไม่ตรวจข้อมูลดิบ/เงื่อนไขเพื่อคลี่ความต่าง ข้อมูลทั้งสองเป็นสิ่งที่เอกสารรายงาน ไม่ใช่ผลทดลองที่รันใหม่

`XEDO.pdf` หน้า 2 อธิบาย sodium alginate outer shell / beeswax powder protection / bacterial core แต่ไม่ระบุระยะการย่อยสลายเปลือก ต้องใช้ผลทดสอบวัสดุสูตรจริงและเงื่อนไขการทดสอบเฉพาะก่อนระบุวัน/เดือน การกำจัดน้ำมัน จำนวนจุลินทรีย์ การแตกตัวของแคปซูล และการย่อยสลายทางชีวภาพของเปลือกเป็นคนละผลวัด ไม่แทนกัน หลักฐานการอ่าน/ภาพกราฟ/manifest อยู่ `C:/mega/codex/iENA/tmp/pdfs/capsule-degradation-audit-2026-10-31/` รายละเอียด chronology ใน XEDO_WORK_LOG รายการวันเดียวกัน ไม่มี code/tests/build/ทดลองวัสดุ/commit/push/deploy รอบนี้ และไม่เปลี่ยนสถานะเผยแพร่ของอีกแชทหรือคิว JSON


<!-- phase6-support-final-2026-10-31 -->
### 3.69B Support ยืนยันขอบเขต source/runtime evidence phase6 — 31 ตุลาคม 2026

**สรุป/พฤติกรรม:** application71e8f45053f7b38fefe6ce382f96619e5d682297/EtSbs...READY/CI41095720672success ตามretainedmainreceipts ไม่พบP0/P1เพิ่มเติมในsubset Sourcepatchใช้exact24generatedassetnamesในVercelheader; ordinarybuildหยุดเมื่อinventoryไม่ตรง ใช้ `node scripts/update-hosted-cache-rules.mjs` regenerateก่อนcommit ไม่rewriteconfigระหว่างcloudbuild ผลจริงHTML23516no-cache/assets24immutable/hashตรง/missing404max-age0must-revalidate/privateAPIno-store Canonicalpublicationdocscommitถัดไปยังเป็นงานmainและต้องยืนยันidentity/bodyequivalenceแยก

**หลักฐาน/ข้อจำกัด:** D2/fb484bcมีrealmiss→deferredready/settled/storage151574bytes/hashตรง; Et/71e8มีpersistenthit/RAMmiss/newsession/PNGเดิม แยกsame-sessionRAMreturnแรกไว้ Snapshotbudget/privilegesผ่านแต่ไม่ใช่near-capcleanupstress MainnewQA0candidatesจึงทดสอบmanualdraw/edit/UndoRedo→reviewv2→planner2.03km/4panels/flat-reference3D→Savev3/History/Open Supportเทียบbrowser/AX/SQLmanualgeometryและstoredreferencesแล้ว เปิดกลับยังต้องreloadcontext/reviewreadiness ไม่คืนstaleapproval UIwarningSomeGEEdataunavailableและflightinputsneededยังแสดง; ไม่อ้างterrainclearance/บินจริง/MLaccuracy/fulltwoaccountfaultmatrix/physicalmobile/retention/productionperformance

**เจ้าของงาน/ส่งต่อ:** ดู `C:/mega/codex/iENA/outputs/XEDO_Performance_Phase6_2026-10-30/support/HANDOFF.md` และ supportFINAL_REPORT_REVIEW/JSONs Mainเป็นผู้รันwebsite/provider/CPU/SQLและทำsource/Git/deployทั้งหมด Supportทำread-onlyfile/source/evidencereviewและappendสองMDตามจังหวะที่mainหยุดเขียน ไม่แก้overview/queueหรือproductใดๆ รักษา9dirtyCPUpathsและบันทึกแชทอื่นเดิม ไม่มีคำถามผู้ใช้ค้าง Mainจะรวมสถานะและทำdocs-onlyfollowupพร้อมprimary/final-publication.jsonหลังsupportidle


<!-- export-settings-guidance-2026-10-31 -->
### ความหมายและพฤติกรรม export settings ในภาพ — 31 ตุลาคม 2026

**หัวข้อ/สรุป:** ตรวจ source เพื่ออธิบายการกรอกให้ผู้ใช้ โดยไม่แก้ application: src/planning-trial-client.js กำหนดหกช่องและอ่านค่า; src/trial-export.js ตรวจข้อมูลก่อนสร้าง .plan ค่า Unknown/Not configured เป็น placeholder ของช่องว่าง

**รายละเอียดพฤติกรรม:** firmware รับ PX4/ArduPilot เป็น target ไม่พิสูจน์ installed firmware; homeAmslM เป็น AMSL ของ Home และถูกเขียนใน plannedHomePosition; ceilingM อ้างอิงเหนือ Home ต้อง >= relativeHeightM ไม่ใช่เพดานจากฐานข้อมูลหน่วยงาน; corridorM เป็น lateral margin สำหรับตรวจ route ทุก segment กับ manual no-go polygons ด้วยระยะ <= margin รวมการแตะขอบ ไม่ตั้ง onboard geofence หรือรับรอง obstacle clearance; validUntil ต้องอยู่อนาคตและครอบคลุมจบ sorties/declared mission end; source เป็นข้อความอ้างอิง user-attested ไม่ตรวจใบอนุญาตอัตโนมัติ ช่อง datetime-local ถูกตีความเป็น UTC ด้วยการเติม Z จึงให้ผู้ใช้แปลงเวลาไทยลบ 7 ชั่วโมงก่อนกรอก

Home มีทางเลือกใช้ reviewed GEE estimate ผ่าน src/planning-geospatial-ui.js: ผู้ใช้ต้องตรวจ launch elevation/compatible reference ก่อน Use reviewed estimate; ข้อมูลเป็น 30 m DSM/EGM2008 จึงไม่รับรองความสูงจริงของแท่น/ดาดฟ้าหรือ clearance Estimated demo ใน src/planning-estimated-demo.js ใช้ Home 0/ceiling 60/corridor 5 และ source ที่ระบุ synthetic constraints เป็น fixture สำหรับสาธิต มิใช่ค่ามาตรฐานของภารกิจจริง การกรอกครบหรือได้ไฟล์ไม่ใช่ flight approval คู่มือ QGC รองรับ planned Home AMSL: https://docs.qgroundcontrol.com/master/en/qgc-dev-guide/file_formats/plan.html#mission-object

**การบำรุงรักษา/สถานะ:** ยังไม่ได้รับคำสั่งเปลี่ยนฟอร์มหรือเพิ่ม requirement; ไม่เปลี่ยนคิว ไม่มีคำถามรอคำตอบ รอบนี้ source/document inspection และ documentation diff เท่านั้น ไม่รัน app tests/build/browser/QGC/SITL/บินจริง และไม่ commit/push/deploy ดู chronology ใน XEDO_WORK_LOG รายการวันเดียวกัน


<!-- ci-documentation-followup-2026-10-31 -->
### 3.70 ตรวจ CI commit เอกสารล่าสุดและทบทวนงานคงเหลือ — 31 ตุลาคม 2026

**หัวข้อ:** ผู้ใช้ขอให้ตรวจ CI ของ commit เอกสารล่าสุดอีกครั้ง หากผ่านให้อัปเดตบันทึกงานและรายละเอียดเว็บไซต์ แล้วสรุปงานที่ยังเหลือ โดยไม่เปิด Billing หรือสมัคร subscription รอบนี้เป็นการตรวจและอัปเดตเอกสาร ไม่ใช่คำสั่งเผยแพร่หรือเพิ่มฟังก์ชันใหม่

**สรุปผลสด:** GitHub push workflow `Verify XEDO`, run [41100815452](https://github.com/megaaaop/XEDO/actions/runs/41100815452), head `a767faf3b67c7248e55a329579dba67a02047532`, completed/success จากเดิมที่บันทึกไว้ว่า queued Job `124217590574` Check, test and build ผ่านทุกขั้น: install locked dependencies, JavaScript syntax, automated tests, hosted build, workspace/Worker build และ standalone file build ผลrunอัปเดต2026-10-30T17:55:18Z (31ต.ค.00:55:18เวลาไทย) และตรวจสถานะใหม่ตามtimestampในci.json ไม่ใช้ผล633testsเดิมเป็นการรันlocalใหม่รอบนี้

Vercelอ่านผ่านalias `xedo-eight.vercel.app` ใหม่ ได้deployment `dpl_DYMmXXi5Qsm2oMNM2APy5CXwv7DS`, READY, Production/iad1, main/commit a767faf ตรงCI ไม่มีการสร้างdeployment/เปลี่ยนalias/env/schema/account/สิทธิ์ ขอบเขตfresh verificationรอบนี้คือCIjobs/stepsและdeploymentidentityเท่านั้น Browser/privateAI/geometry/cache/static29checksเป็นหลักฐานก่อนหน้าที่อ้างอิงตามเดิม ไม่ได้รันซ้ำเพื่อปิดCI

**งานคงเหลือที่แนะนำเรียงลำดับ:**

1. **ซ้อมการนำเสนอบนเครื่องจริงหลังเปิดเครื่องใหม่** — เปิดshortcut CPU→READY→Login→Analyzeพื้นที่ใหม่→Inspectorแก้/ยืนยันพื้นที่→preview/3D→Save/History/Open และสาธิต.planเมื่อข้อมูลพร้อม เป็นoperationalacceptanceของระบบที่มีอยู่ ไม่ใช่ฟังก์ชันที่ยังไม่ทำ; การตรวจCIครั้งนี้ไม่ได้rebootเครื่องหรือรับรองเครือข่ายสถานที่จริง
2. **ส่งมอบชุดเปิด CPU Worker ใน Git ให้ครบ** — มีเก้าไฟล์launcher/guard/worker/คู่มือ/testsที่ทำและตรวจในเครื่องแล้ว แต่ยังdirtyและเว้นจากGEErelease ต้องตรวจdiff/secretแล้วcommit/pushในขอบเขตที่ผู้ใช้อนุมัติ ไม่ทำเพิ่มในรอบนี้ CPUยังรันในเครื่องและต้องเปิดออนไลน์
3. **เพิ่มqualificationตามขอบเขตถัดไป** — positiveAIcandidateรับ/แก้/ปฏิเสธบนรุ่นล่าสุด, regressionหลายบัญชี/session/conflict, physicalmobile/trackpad, ระยะยาว/100jobsต่อเดือน, near200km²/worst-casegeometry และcachecleanup/staleassetเมื่อgraphเปลี่ยน มีหลักฐานpilot/กรณีเดิมบางส่วนแล้ว ไม่อ้างว่าทั้งmatrixยังไม่เคยทดสอบหรือว่าผ่านครบจากCI รอบนี้ QGC/SITL/บินจริงแยกจากการปิดfunctionalprototype
4. **พัก: Raspberry Pi/รูป/telemetry** — เลขเดิม7/ลำดับคิวเดิม4 ยังไม่ต้องทำตามคำสั่งผู้ใช้ และไม่เป็นเงื่อนไขของการวางแผนก่อนบิน
5. **พัก: ผลทดลองและรายงานก่อน–หลัง** — เลขเดิม8/ลำดับคิวเดิม5 ยังเป็นงานเหลือที่ผู้ใช้พักไว้ ต้องใช้ข้อมูลทดลองจริง

ฟังก์ชันหลักUX/บัญชีInspectorส่วนตัว/Save–History/AIและแก้พื้นที่/CPUAnalyze/GEEcache200MB/3D/3ขั้นตอนและ4calculatorsทำและเผยแพร่ตามหลักฐานก่อนหน้าแล้ว GEEv1.1ข้อ1–6ไม่มีCIค้าง รายการใหม่ข้างต้นเป็นกลุ่มงานปฏิบัติการ/ส่งมอบ/qualification ไม่เพิ่มlegacyfeature-stageหรือคืนงานnormalflow/ตารางเวลาที่ผู้ใช้ตัดออก ไม่มีคำถามผู้ใช้ค้าง

**ไฟล์/หลักฐาน/การเผยแพร่:** อัปเดตสองcanonicalMDโดยmergeรายการ export-settings-guidance และ capsule-degradation ของแชทอื่นไว้ครบ อัปเดตqueue latestPublishedRelease.documentationFollowup/phase6Execution/latestRemainingWorkAudit และreceiptเดิมให้CIcomplete=true/pendingExternalVerification=[] โดยเก็บqueuedobservationเดิมเป็นประวัติ หลักฐานสด `C:/mega/codex/iENA/outputs/XEDO_CI_Followup_2026-10-31/ci.json`, jobs.json, production-deployment.json และREPORT.md; originalproductionreceiptอยู่phase6primary/final-publication.json รอบนี้ไม่แก้source/worker/tests/config/package ไม่รันlocaltests/build/browser/AIใหม่ ไม่commit/push/deploy ไม่เปิดBilling/subscription ไม่มีคำถามรอคำตอบ


<!-- remaining-work-summary-2026-10-31 -->
### 3.71 สรุปขั้นตอนที่ยังเหลือจากคิวปัจจุบัน — 31 ตุลาคม 2026

**หัวข้อ/สรุป:** ผู้ใช้ถามว่าตอนนี้เหลือขั้นตอนอะไร อ่านcanonicalสองMD, implementation-queue.json และGitstatusล่าสุดก่อนสรุป คง3กลุ่มงานต่อและ2กลุ่มพักไว้ตาม§3.70 ไม่มีการรับrequirementใหม่หรือสั่งimplementation/publish ผลCIsuccessเป็นผลที่ตรวจรอบ§3.70 ไม่ใช่การอ่านproviderใหม่รอบนี้

**รายละเอียด/ลำดับ:** (1) ซ้อมบนเครื่องที่จะนำเสนอหลังเปิดเครื่องใหม่: Shortcut→CPU READY→Login→Analyzeพื้นที่ใหม่→Inspectorแก้/ยืนยันพื้นที่→planner/3D→Save/History/Open และเตรียมภารกิจข้อมูลพร้อมสำหรับ.plan (2) เก็บชุดCPUlauncher/worker/guard/คู่มือ/tests9ไฟล์และcanonicaldocs/queueที่แก้ล่าสุดแต่ยังไม่commitลงGitเมื่อมีคำสั่งเผยแพร่ โดยตรวจdiff/secretก่อน รวมเป็นกลุ่มส่งมอบเดิม ไม่เพิ่มfeaturestageหรืออนุมัติpushจากคำขอสรุป (3) ขยายregressionกรณีAIมีcandidate/หลายบัญชี/session/conflict/มือถือจริง/trackpad/longsoakและข้อจำกัดgeometry/พื้นที่/cacheตามขอบเขต มีหลักฐานpilotและกรณีเดิมบางส่วนแล้ว (4) Pi/รูป/telemetryเลขเดิม7ยังพัก (5) ผลทดลอง/รายงานก่อน–หลังเลขเดิม8ยังพัก ไม่คืนงานnormalflow/ตารางเวลาที่ผู้ใช้ตัดออกเข้าคิว

**หลักฐาน/สถานะ:** GitHEADยังa767faf3b67c7248e55a329579dba67a02047532 พบcanonicalสองMD/queueและCPU9pathsค้างในเครื่อง อัปเดตสองMDและเติมรายละเอียดส่งมอบเอกสารในกลุ่ม2ของqueue รักษารายการแชทอื่นทั้งหมดและโครงสร้างหัวข้อ/สรุป/รายละเอียด ฟังก์ชันหลักและการเผยแพร่คงสถานะที่มีหลักฐานก่อนหน้า CIไม่มีรายการค้างตาม§3.70 ไม่มีคำถามผู้ใช้รอคำตอบ รอบนี้ไม่ได้ทดสอบapplication/build/browser/CPU/AI/CI/deploymentสด ไม่แก้source/config/accounts/schema ไม่commit/push/deploy และไม่เปิดBilling/subscription


<!-- presentation-delivery-main-start-2026-10-31 -->
### 3.72 ซ้อม flow นำเสนอและส่งมอบ CPU Worker ใน Git — 31 ตุลาคม 2026

**หัวข้อ/คำสั่ง:** ผู้ใช้สั่งเริ่มกลุ่ม1–2 ทดสอบflowก่อนนำเสนอ เก็บชุดCPUและเอกสารลงGit บันทึกสองMD และpushได้ ห้ามBilling/subscription ผู้ใช้รายงานว่ามีปัญหาการใช้งานเล็กน้อยแต่ให้เลื่อนไปแก้ภายหลัง จึงรับเป็นdeferred issueรอรายละเอียด ไม่วินิจฉัย/แก้websitefeatureจากข้อมูลที่ยังไม่มี ไม่ใช้คำสั่งนี้เปิดงานกลุ่ม3/Pi/รายงานทดลองหรือเปลี่ยนบัญชี/schema/env

**สรุปงานที่ตรวจจริงก่อนpush:**

| รายการ | ผลรอบนี้ |
|---|---|
| Node tests | 633ผ่าน/0fail/cancel/skip; fresh full log |
| Python CPU tests | 84ผ่าน/0fail; รวมWindowscross-processlock/reconnect/wrong-accountpreservation/redaction |
| Syntax/build | checkและhosted/workspace/portableผ่านทั้งสาม |
| CMD/shortcut | Start.cmdจากcwdอื่นได้ALREADY OPEN ขณะdaemonเดิมทำงาน ไม่มีworkerชุดที่สอง; check-onlyผ่านโดยไม่อ่านsession/request; Desktopshortcutreadbacktarget/cwd/args/windowstyleถูก |
| Browserใหม่ | ผู้ใช้Sign inเอง แท็บเดิม/draftเดิมไม่reload/ไม่ปิด; LocalprocessorReady |
| Analyze | พื้นที่ใหม่482,535m², job4656e09c-3778-4ed1-a8b0-39d67f3e91d1 สำเร็จattempt1/1tile; 18:55:23.380678→18:56:20.047051UTC รวม56.666s ไม่ใช่inferenceล้วน |
| Inspector | ผลใหม่0candidates; วาดmanual4มุม/แก้GeoJSON/Undo/Redoตรง ตรวจSentinel2จริง27Oct03:54UTCแล้วconfirmreviewv2manualcomplete; ก่อนมีภาพถูกblockโดยเก็บdraft |
| Planner | route2.75km/22waypoints/74terrain samples; เลือกHome/Move→Cancelคืนพิกัดเดิม; Diagramและgeoreferencedsatellitegroundพร้อมใน3D |
| Persistence | QAmission9e826af9-01f0-4cc6-92ab-4b93e2f56f39/v3, History3/2/1→Openv3คืนgeometryตรง; readonlySQLยืนยันowner/revision/analysisRef/riskDraft/targetgeometryตรง |
| Exportสาธิต | แท็บEstimateddemoแยก ข้อมูลสมมติ/archivedimage; เลือกจุดHomeและreviewsyntheticconstraintsในdemoเท่านั้น; 4/4ready/1sortie/1.88km; actual.plan8053bytes/20items/Planv1/finiteparams |
| Four calculators | เปิดผลDrift/Flight/Export/Oilครบ; Driftscenarioไม่ได้เลือก จึงไม่อ้างว่าcomputeddriftใหม่ Flightwind/batterypass/1sortie, Oil10–30L/3.772–11.316kgเป็นfixtureสมมติ |
| Console | 0capturedwarn/errorทั้งสองQAtabs |

**ข้อพบจากเครื่องมือ/การแก้ทางทดสอบ:** restrictedNodeรอบแรกspawnENOENTก่อนครบ และWindowsunit-testchildterminationทำให้lockcleanupไม่สำเร็จ เก็บrestrictedlogsแยกแล้วรันด้วยordinaryhostprocessaccessผ่าน633/84 ไม่แก้productเพื่อทำassertionให้ผ่าน Download-eventwaitของbrowsertooltimeout20s แต่เว็บแสดงDownloadstartedและมีไฟล์จริงใหม่ในDownloads19:02:20UTC จึงตรวจไฟล์นั้นตรงๆ ไม่กดซ้ำ SHA256 `44ae693769893942fa1a5c69e88baf76fc47c64a78a980dbdb9bb09132b4bd14`; screenshot/AX/receiptเก็บไว้ ไม่อ้างtooltimeoutเป็นwebsitefailureหรืออ้างว่าไม่มีtoolerror

**สิ่งที่ส่งมอบ/สถาปัตยกรรม:** 9CPUpathsเดิมคือStart/ReconnectCMD, CPU_WORKER_START_GUIDE.md, workerREADME, remote_worker.py, launch_worker.py, worker_guard.py, test_launcher.py, test_remote_worker.py รวมกับสองcanonicalMD/queueเป็น12ไฟล์ ผู้ใช้อนุมัติเก็บและpushแล้ว Guardล็อกsession+workRootก่อนอ่าน/refreshsessionหรือrecovercheckpoint และCLIstatus/login/logoutใช้guardเดียวกัน Reconnectตรวจmachine registryก่อนแทนที่protectedsessionเดิม ไม่บันทึกpassword/response ลงconsole/สถานะ ข้อมูลจริง/config/DPAPI/model/raster/venvอยู่ignoredlocalpaths ไม่ใส่GitหรือVercel .vercelignoreกันworker/CMD/docsออกจากwebdeploy Browser25buildhashesตรงapplicationที่qualifiedเดิม ไม่มีfrontend/API/config/schema/account/modelchange

**ข้อจำกัด/งานต่อ:** ทดสอบกับworkerเดิมที่เปิดอยู่ ไม่rebootWindows/ไม่restartdaemon/ไม่ทำproductionreconnect/ไม่ใช้รหัสผ่านแทนผู้ใช้ CPUยังต้องเปิดเครื่อง/online/READY ผล0candidatesไม่รับรองไม่มีน้ำมัน และmanualcaseไม่แทนpositivecandidateหรือfulltwo-account/fault/longsoakmatrix NormalflightexportของQAจริงยังgated ไม่tickphysical/airspaceapprovalให้ภารกิจจริง QGCnativeimport/SITL/บินจริง/physicalmobileยังไม่รัน ปัญหาเล็กน้อยที่ผู้ใช้รายงานยัง**รอรายละเอียดภายหลังตามที่ให้เลื่อน** ไม่บล็อกการเก็บงานที่อนุมัติ Piและรายงานทดลองยังพัก

**หลักฐาน/สถานะ:** `C:/mega/codex/iENA/outputs/XEDO_Presentation_Rehearsal_2026-10-31/` มีREPORT.md, initial/release manifests, local-verification.json, browser-observation.json, job.json, private-persistence.json, download-verification.json/presentation-demo.plan, AX/screenshots/test/buildlogs คง3mainparts/3steps/4calculatorsและบันทึกแชทอื่นครบ ก่อนpushสถานะverified_ready_for_push; publication.jsonจะเก็บexactGit/CI/automaticVerceldeploymentidentityหลังpush ไม่สร้างmanualdeploymentหรือเปิดบริการเสียเงิน ปิดreceipt/สถานะจริงในownedsectionหลังเผยแพร่


**ผลเผยแพร่และตรวจหลัง push:** เก็บ12pathsในcommit [bc533a8152a9308c2c797b1980ca4308fa21b6eb](https://github.com/megaaaop/XEDO/commit/bc533a8152a9308c2c797b1980ca4308fa21b6eb) แล้วpushmainแบบfast-forward CI [41112463796](https://github.com/megaaaop/XEDO/actions/runs/41112463796) completed/success Gitintegrationสร้างProductiondeployment `dpl_7xjXAYyQE2uo1aJJx4FpMx4xACpX` READY/iad1/aliasxedo-eight.vercel.app ไม่สร้างmanualdeploymentหรือเปลี่ยนenv/บัญชี/schema/แผนบริการ ไฟล์worker_guardเก็บextraEOFblanklineหนึ่งจุดก่อนcommit ไม่มีfunctionalchangeหลังfresh84tests

PostpushHTTP32checksผ่าน: HTML23516bytesและ24assetsตรง25hashesที่qualifiedเดิม/MIME/cacheถูก Missinghashed404ไม่immutable; Start.cmd/workerPython/CPUguide404ไม่public; guestsessionnull/privatejobs401/APIwrongmethod405/no-storeถูก Runtimeerror/fatalqueryเฉพาะdeploymentใน15minwindowไม่พบmatchingrecords ไม่ใช่alltrafficguarantee Fullprivatebrowser/CPU/Save/Historyทำก่อนpushบนDYM/a767faf และพิสูจน์25webartifactsไม่เปลี่ยนหลังpush ไม่อ้างว่าreplaybrowserครบอีกรอบบน7xjหลังpublish

**ปิดกลุ่ม1–2:** flowปัจจุบันและการส่งมอบCPUcode/คู่มือ/เอกสารทำแล้ว เหลือกลุ่ม3extendedqualificationและงานพักPi/รายงานทดลอง กลุ่ม1ทดสอบบนworkerเดิมพร้อมduplicate-startguard ไม่rebootOS/ไม่restartdaemonจริง ปัญหาใหม่จากผู้ใช้ยัง**รอคำตอบ/รายละเอียดภายหลังตามที่ให้เลื่อน** ไม่เดาrootcauseหรือแก้UIแทน

เอกสารปิดpublicationนี้จะpushเป็นdocs-onlyfollowupสามcanonicalpaths โดยไม่เปลี่ยนproduct/source; exactfinalcommit/deployment/CIและfreshstaticsmokeอยู่ `C:/mega/codex/iENA/outputs/XEDO_Presentation_Rehearsal_2026-10-31/publication.json` หลังpushเพื่อหลีกเลี่ยงcommitself-reference Sourcecommit/rehearsal/sourceCIที่อ้างข้างต้นเป็นผลตรวจจริงแล้ว ส่วนfinaldocsCIต้องอ่านreceiptแยก ไม่อ้างว่าผ่านล่วงหน้า รักษาข้อจำกัดเดิมและไม่มีBilling/subscription

<!-- presentation-delivery-main-end-2026-10-31 -->


<!-- gee-auto-home-clarification-2026-10-31 -->
### แก้ความหมาย Automatic Home และแยก constraint metadata — 31 ตุลาคม 2026

**หัวข้อ/สรุป:** ผู้ใช้ทักว่าข้อมูลควรมาจาก GEE อัตโนมัติ ตรวจ source แล้วแก้คำอธิบายจากรายการ export settings ก่อนหน้า: Home ไม่จำเป็นต้องกรอกเองหรือกด reviewed estimate ในทุกโหมด

**รายละเอียด:** planning-trial-client.js reconcileModelHome ตรวจ terrainMode automatic และ terrainAssessment ready แล้วเรียก planning-geospatial-ui.js useModelHomeEstimate ซึ่งเติมช่อง Home ที่ว่างหรือยังเป็นค่า gee_model ของ Home เดิม พร้อมหลักฐาน EGM2008/dataset/resolution/fetchedAt/expiresAt เรียกเมื่อ context เปลี่ยน ก่อนคำนวณ และหลัง input เปลี่ยน; ไม่เขียนทับ manual value เส้นทาง Use reviewed estimate เป็นอีกทางและสร้าง gee_estimate evidence แยกจาก gee_model เงื่อนไข ready อยู่ใน planning-terrain.js รวมจุด Home/พื้นที่/request match/ความใหม่/coverage/terrain tolerance ดังนั้นภาพ Home Unknown ต้องตรวจ actual mode/context/assessment จึงจะวินิจฉัยได้ ไม่ถือว่าผู้ใช้ต้องหาเลขมากรอกแทนโดยทันที

GEE context ที่เชื่อมอยู่ส่ง terrain/Home/landcover/image quality/forecast reference ส่วน firmware/ceiling/corridor/validUntil/source ในภาพไม่ได้ถูกส่งเป็นค่าอัตโนมัติจาก integration นี้ validUntil/source เป็น manual constraint review metadata แยกจาก fetchedAt/expiresAt/dataset source ของข้อมูล GEE หากออกแบบ UX ต่อ ต้องแสดงสถานะและเหตุที่ข้อมูล Home ยังไม่พร้อมให้ตรง source โดยไม่สรุปจาก placeholder เพียงอย่างเดียว รอบนี้ยังไม่มีคำสั่ง implement requirement ดังกล่าว

**สถานะ:** source/document inspection และ diff เท่านั้น ไม่มี application changes/tests/build/browser/provider calls หรือ publication ไม่เปลี่ยนคิว รายละเอียด chronology และการยอมรับข้อผิดพลาดคำตอบก่อนหน้าอยู่ใน XEDO_WORK_LOG รายการวันเดียวกัน


<!-- home-altitude-gee-fix-2026-10-31 -->
### 3.73 Home altitude ใช้ GEE sample แยกจากผลประเมินทั้งเส้นทาง — 31 ตุลาคม 2026

**หัวข้อ/สรุป:** แก้การเติม Home ที่ผูกกับการผ่าน terrain tolerance ของทั้งเส้นทาง ใน planning-trial-client.js reconcileModelHome เรียก useModelHomeEstimate เมื่อ mode automatic โดยไม่กรอง terrainAssessment ready อีก ความพร้อมของปุ่ม Replace ใช้ homeModelReady จาก canUseModelHomeEstimate แทน surfaceModelReady และ onclick ตรวจ Home availability เดียวกัน

**พฤติกรรม/การรักษาหลักฐาน:** planning-geospatial-ui.js hasModelHomeEstimate ตรวจ fresh current context/terrain state/finite Home elevation/พิกัดตรงกัน (ผ่าน normalize เดิมซึ่งตรวจ dataset/EGM2008/30m/sample) ใช้ snapshot ครั้งเดียวใน useModelHomeEstimate เพื่อหลีกเลี่ยงอ่าน context ซ้ำตรง expiry boundary คงการไม่ทับ manual value, ล้าง owned value เมื่อเปลี่ยน Home, ไม่เปลี่ยน reviewed:false เป็น human approval เพิ่มค่าตัวเลขและข้อความว่า route assessment แยกกันใน Home note Null/masked/bad-reference/stale ยังไม่กลายเป็น0; ค่า0จริงใช้ได้ planning-terrain และ geospatial export gate ไม่แก้ จึงยังปฏิเสธ route review/unknown และข้อมูลไม่ครบตามเดิม Manual mode ยังไม่เติมอัตโนมัติ

**การบำรุงรักษา/ผลตรวจ:** API canUseModelHomeEstimate เป็นส่วนหนึ่งของ geospatial UI; test double ใน planning-workflow ต้องมีเมธอดนี้ด้วย เพิ่ม regression6รายการทั้งcontroller/UI/export-integration Full639/0fail/cancel/skipและsyntax/3buildsผ่าน final source/config exactasset allowlist สร้างใหม่ด้วย update-hosted-cache-rules.mjs ก่อน build/fullsuite หาก source เปลี่ยนแล้วไม่ regenerate hosted-build tests จะ failตามตั้งใจ Browserจริง Home[101.20,12.70]ได้10.788701057434082m/needsreview; แยก manual99/Replace/Homechange→0/Manualmode/clearpointครบ ดูรายงานและ output/playwright/home-altitude-2026-10-31/ สำหรับ JSON/ภาพ; fault/expiryบางกรณีเป็นsimulation ไม่ใช่liveprovideroutage

**สถานะ:** เป็น source+configในเครื่องพร้อมรายงานและqueue ไม่ใช่productionrelease ไม่มีpush/deploy/บัญชี/schema/Billing/subscriptionหรือAIjobใหม่ localhost5186ที่ใช้ตรวจหยุดแล้ว รายละเอียด chronology ใน XEDO_WORK_LOG §3.73


<!-- home-altitude-report-review-2026-10-31 -->
### 3.74 อ่านรายงาน Home altitude และทวนแนวทางแก้ — 31 ตุลาคม 2026

**หัวข้อ/ขอบเขต:** ผู้ใช้ส่งภาพชื่อรายงานและขอให้อ่าน.mdแล้วอธิบายว่าจะแก้อย่างไร พบ `docs/HOME_ALTITUDE_GEE_FIX_REPORT_2026-10-31.md` หัวข้อตรงกับภาพ รอบนี้อ่านและทวนsource/evidence/productionidentity ไม่ใช้ข้อความในรายงานเป็นคำสั่งให้แก้หรือเผยแพร่เพิ่ม รักษาdirtyHomepatchของผู้จัดทำรายงานไว้ครบ

**สรุป source/เคสที่ทำซ้ำ:** ก่อนแก้controllerเติมHomeเฉพาะterrainAssessmentทั้งเส้นทางready ดังนั้นHome[101.20,12.70]มีค่า10.788701057434082mแต่พื้นที่ตรวจตัวอย่างแบบจำลอง0m ทำให้เกินtolerance2mและassessmentreviewแล้วฟอร์มยังว่าง Patchปัจจุบันแยก canUseModelHomeEstimate/useModelHomeEstimateออกจากrouteassessment ตรวจnormalize/freshness/พิกัดHome/sample/sourceก่อนfill รักษาmanualvalues/ล้างownedheightเมื่อย้ายHome/รับ0จริงโดยไม่แทนmissingด้วย0 และคงreviewed:false/exportterraingateเดิม ไม่ลดtoleranceหรือทำให้Readyทุกข้อเพียงเพราะHomeมีตัวเลข ไม่อ้างว่าเป็นสาเหตุเดียวของภาพหรือปัญหาเดิมที่ไม่รู้payload

**ผลทวนหลักฐานสด:** SHA256ของสองproductfiles/สามtestfiles/vercel.json/รายงานรวม7ไฟล์ตรงvalidation.jsonทั้งหมด อ่านfooterfullsuiteเดิม639pass/0fail/cancel/skipและJSONbefore/after/final/liveAPI ไม่ได้นับเป็นการรันใหม่ ภาพafter.jpgที่รายงานฝังยังเห็นช่องHomeUnknown ขณะที่final-browser.jsonค่า10.788701057434082/Replaceenabled/terrainreview จึงมีvisualevidenceไม่สอดคล้องกัน ต้องตรวจแท็บ/build/จังหวะcaptureใหม่ ไม่ได้วินิจฉัยว่ามีruntimebugใหม่หรือว่าpatchไม่ทำงานจากภาพนี้เพียงอย่างเดียว Vercelaliasสดยังเป็น9acdd8a/dpl_FXc525grnsEwmEhzmmuT4QUSmvQh/READY จึงยืนยันว่ารุ่นHomefixในworkingtreeยังไม่อยู่ในproduction

**ลำดับที่แนะนำต่อ:** (1) ใช้patchหลักที่มีอยู่เป็นฐานและคงmanual/freshness/exportguards (2) replayบนlocalbuildเดียวกัน รอHomefieldมีค่าจริงแล้วเก็บDOMJSON+ภาพหน้าจอใหม่ที่เห็นค่าตรงกัน พร้อมURL/buildhash/source/date ไม่เขียนทับbefore/afterเดิมจนเสียประวัติ (3) ตรวจcaseAutomatic/manualoverride/Replace/Homechange/0/missing/staleและterrainreviewยังblockexport ถ้ามีsourceเพิ่มให้รันregression/fullsuite/buildใหม่ (4) เมื่อผู้ใช้สั่งเผยแพร่จึงcommit/push/deploy ทดสอบCIและHomeบนproductionจริง โดยสร้างmanifestจากHomebuildใหม่และตรวจexactassetinventory ไม่ใช้25hashesเก่าก่อนHomefixเป็นค่าที่คาดหวัง ไม่มีเหตุผลจากรายงานนี้ให้เปลี่ยนบัญชี/schema/เพิ่มpaidcloudหรือปิดreadinessgate

**ไฟล์/สถานะ:** อัปเดตสองcanonicalMDและqueueให้visualevidence_recheck_pendingก่อนrelease โดยเก็บสถานะ/ผล639ของimplementationรอบก่อนเป็นhistoricalevidence รายงานต้นฉบับ/source/tests/vercel.jsonไม่เปลี่ยนในรอบนี้ หลักฐานreview.jsonและproduction-identity.jsonอยู่ `C:/mega/codex/iENA/outputs/XEDO_Home_Altitude_Report_Review_2026-10-31/` ไม่มีfreshapp/unit/build/browser/GEE/inference/CIrun ไม่มีcommit/push/deploy/env/account/schema/Billing/subscription ปัญหาอื่นที่ผู้ใช้ให้เลื่อนยังคงบันทึกแยก ไม่อนุมานว่าเป็นเรื่องเดียวกัน ไม่มีคำถามผู้ใช้ใหม่ที่จำเป็นก่อนสรุปแผน


<!-- home-altitude-release-main-2026-10-31 -->
### การตรวจและเผยแพร่ Home altitude — 31 ตุลาคม 2026 (§3.75)

Browser→planning-context→normalized fresh Home sample→automatic Home input แยกจากfull-routeassessment; current()ยังตรวจgeometry/Home/scene/time/freshness/DEM dataset/heightreferenceก่อนใช้ canUseModelHomeEstimate()และuseModelHomeEstimate()จึงไม่รับmissing/masked/referenceผิด/staleเป็น0 ManualตัวเลขของInspectorไม่ถูกทับ; Replaceเป็นการกลับมาใช้GEEโดยผู้ใช้เลือกเอง คงEGM2008/30m/source/timestampsและreviewed:false ค่าHomeมีตัวเลขไม่ได้ทำให้ทั้งภารกิจReady

Mainreleaseverificationใหม่บนhostedbuildจากsourceเดิมผ่าน639tests/syntax/3builds พร้อม7browsercasesและGEEprocessใหม่2compute/2434ms Home10.788701057434082 ตรงภาพlocal-home-surface.pngและJSONก่อน/หลังจากแท็บเดียวกัน ขณะGEE model needs reviewและDownloaddisabled ภาพcaptureแรกยังแสดงตำแหน่งก่อนscroll จึงเก็บเป็นdiagnosticแยกและใช้ภาพหลังrenderยืนยัน ไม่มีการsetvalue/attributeเพื่อสร้างหลักฐาน ภาพafter.jpgเก่ารักษาไว้แต่ไม่ใช้เป็นvisualpass

Freeze hosted-artifacts.jsonใหม่25files (HTML23,516bytes+24assets) สำหรับตรวจproduction releaseนี้ ไม่ใช้hashก่อนHomepatch เผยแพร่ด้วยnormalGitpushหลังtestsผ่าน ตรวจexactCI/deploymentSHA/aliasและliveHomeใหม่ จากนั้นบันทึกreceipt Publicationกำลังทำในรอบนี้ ยังไม่อ้างสำเร็จก่อนมีผล ไม่มีบัญชี/schema/env/worker/Billing/subscriptionchange หลักฐานใหม่ C:/mega/codex/iENA/outputs/XEDO_Home_Altitude_Release_2026-10-31/ คง3ขั้นตอน/4ตัวคำนวณและขอบเขตprototype/qualificationเดิม
