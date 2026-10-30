# XEDO — เปิด CPU worker หลังเปิดเครื่องและเตรียมนำเสนอ

## 1. หัวข้อ

คู่มือสำหรับเครื่อง Windows เดิมที่เตรียม XEDO ไว้แล้ว อัปเดต 31 ตุลาคม 2026

ไฟล์เริ่มงาน: `C:\mega\codex\iENA\github-publish\XEDO-hardware-release\Start-XEDO-CPU.cmd`

ไฟล์เชื่อมบัญชี CPU ใหม่เฉพาะเมื่อจำเป็น: `Reconnect-XEDO-CPU.cmd` ในโฟลเดอร์เดียวกัน

เว็บไซต์: https://xedo-eight.vercel.app/

## 2. สรุป

**ปิดแล้วเปิดคอมใหม่ได้ ไม่ต้องติดตั้ง AI สร้างบัญชี หรือให้แชทตั้งระบบใหม่ทุกครั้ง** ไฟล์โปรแกรม โมเดล การตั้งค่า และ session ที่เข้ารหัสยังอยู่ในเครื่อง ใช้ Windows user เดิม ต่ออินเทอร์เน็ต แล้วดับเบิลคลิก `Start-XEDO-CPU.cmd` รอข้อความ `[READY]` จากนั้นใช้เว็บไซต์ได้

ต้องเปิดหน้าต่าง worker ค้างไว้และไม่ให้เครื่อง Sleep ขณะต้องการ Analyze พื้นที่ใหม่ ส่วนภารกิจและผลที่บันทึกสำเร็จใน Supabase เปิดย้อนหลังได้แม้ CPU ปิด เว็บไซต์อาจให้ Sign in ด้วย Inspector ใหม่เมื่อ session ของเว็บไซต์หมดอายุ การเข้าเว็บกับการเชื่อมบัญชี CPU เป็นคนละส่วน

ไม่มีการสมัคร subscription เปิด Billing ติดตั้งแพ็กเกจเพิ่ม เปิดพอร์ตให้คนภายนอก หรือแก้การเริ่มโปรแกรมอัตโนมัติของ Windows ตัวเปิดนี้ไม่ต้อง Run as administrator และไม่เปลี่ยน Execution Policy

## 3. รายละเอียด

### 3.1 ก่อนปิดคอมหรือย้ายไปงานนำเสนอ

1. บนเว็บไซต์กด Save ภารกิจที่ต้องการเก็บ และรอข้อความบันทึกสำเร็จ
2. หากกำลัง Analyze ให้รอจนเว็บแสดงงานสำเร็จ และ worker แสดง `[SAVED]` หรือกลับเป็น `[READY]`
3. หยุด worker ด้วย `Ctrl+C` หรือปิดหน้าต่างเมื่อไม่มีงานกำลังทำ ถ้าหน้าต่างถาม `Terminate batch job (Y/N)?` ให้ตอบ `Y`
4. ปิดคอมตามปกติได้ ไฟล์โมเดล/โปรแกรม/session ไม่ถูกลบ

ถ้าปิดเครื่องระหว่าง Analyze การประมวลผลในเครื่องจะหยุด ไม่รับรองว่าจะเริ่มต่อจากเปอร์เซ็นต์หรือ tile เดิม โปรแกรมจะตรวจ checkpoint/lease และสถานะการบันทึกเมื่อเปิดใหม่ งานบางกรณีอาจจบเป็นล้มเหลวและต้อง Analyze ใหม่หลังตรวจสถานะ ไม่ควรลบ `active.json` หรือสร้างงานซ้ำทันทีเมื่อยังไม่ทราบผลการบันทึก

### 3.2 หลังเปิดคอมใหม่ที่งานนำเสนอ

1. เข้า Windows ด้วย user เดิม ต่อ Wi‑Fi/อินเทอร์เน็ต และเสียบไฟหากสะดวก
2. เปิด File Explorer ไปยัง `C:\mega\codex\iENA\github-publish\XEDO-hardware-release`
3. ดับเบิลคลิก `Start-XEDO-CPU.cmd` ไม่ต้องเปิด Codex หรือ local QA server ก่อน
4. รอ `[CONNECTING]` เปลี่ยนเป็น `[READY]` และเปิดหน้าต่างนี้ค้างไว้
5. เปิด https://xedo-eight.vercel.app/ ถ้าถูกขอให้ Sign in ให้ใช้บัญชี **Inspector** เดิม
6. ตรวจว่าเว็บแสดง `Local processor · Ready` จากนั้นเลือกพื้นที่และกด Analyze ได้
7. ถ้าจะเปิดงานเดิม ให้ไป My missions → เลือกภารกิจ หรือ History → เลือก Version เว็บจะให้โหลดและตรวจภาพ context ใหม่ก่อนเตรียมแผนตามเงื่อนไขเดิม

สร้าง Shortcut ชื่อ **XEDO CPU Worker** ไว้บน Desktop ให้แล้ว และทดสอบเปิดผ่าน Shortcut ได้ `READY` จริง คุณดับเบิลคลิกไอคอนนี้แทนการเข้าโฟลเดอร์ release ได้ เก็บไฟล์ `.cmd` และโปรแกรมไว้ในโฟลเดอร์เดิม Desktop ของเครื่องนี้อยู่ใน OneDrive; Shortcut ชี้โปรแกรมบนเครื่องนี้ ไม่ได้ติดตั้งโปรแกรม/โมเดลให้คอมเครื่องอื่นโดยอัตโนมัติ

สำหรับการนำเสนอควรเปิดและตรวจ Ready ล่วงหน้า รวมถึงเตรียมภารกิจที่ Save สำเร็จไว้ให้เปิดย้อนหลัง หากอินเทอร์เน็ตในสถานที่ไม่พร้อม งาน Analyze ใหม่ที่ต้องใช้ GEE/Supabase จะยังทำไม่ได้ ผลที่เคยเปิดบนเว็บไม่ได้รับรองว่าใช้งานแบบออฟไลน์ได้ทั้งหมด

### 3.3 ความหมายของสถานะในหน้าต่าง

| สถานะ | ความหมายและสิ่งที่ทำ |
| --- | --- |
| `CONNECTING` | กำลังเชื่อมบัญชี CPU เดิม รอสักครู่ |
| `READY` | เชื่อมสำเร็จ ตรวจคิวแล้ว และกำลังรอรับงาน เปิดเว็บเพื่อกด Analyze ได้ |
| `WORKING` | กำลังค้น/โหลดภาพ วิเคราะห์ หรือจัดผล ตัวเลข tiles คือส่วนที่ประมวลผลจริง |
| `SAVED` | ผลของงานถูกบันทึกสำเร็จ ไปตรวจและแก้พื้นที่บนเว็บได้ |
| `RECONNECTING` | การเชื่อมต่อสะดุด โปรแกรมกำลังลองใหม่แบบจำกัดจำนวน |
| `ALREADY OPEN` | มี worker หรือการเชื่อมบัญชี CPU เดิมเปิดอยู่แล้ว ไม่ได้เปิด worker ตัวที่สอง ให้ดูหน้าต่างเดิมและสถานะบนเว็บ |
| `STOPPED` | โปรแกรมไม่รับงานใหม่ อ่านข้อความ/รหัสสาเหตุ แก้สิ่งที่ระบุ แล้วเปิดไฟล์เริ่มใหม่ |

หากเน็ตหลุดนานจนโปรแกรมหยุด ให้ต่ออินเทอร์เน็ตแล้วเปิด Start ใหม่ ไม่ใช่ระบบ retry ไม่จำกัดเวลา เมื่อหยุดโปรแกรม สถานะบนเว็บอาจใช้เวลาถึงประมาณ 3 นาทีจึงเปลี่ยนเป็น Offline เพราะใช้ heartbeat/presence

### 3.4 ต้องกรอกบัญชี CPU ใหม่เมื่อใด

ปกติการปิด–เปิดเครื่องไม่ต้องกรอกรหัส CPU ใหม่ โปรแกรมอ่าน session ที่เข้ารหัสของ Windows user เดิมและต่ออายุ access token ตามวิธีที่รองรับ แต่ถ้า session ถูกยกเลิก ไฟล์ session หาย/อ่านไม่ได้ หรือ refresh ถูกปฏิเสธ จะต้องเชื่อมใหม่

1. ปิดหน้าต่าง worker เดิมก่อน ขณะไม่มีงานกำลังทำ
2. ดับเบิลคลิก `Reconnect-XEDO-CPU.cmd`
3. กรอกอีเมลและรหัสของ **บัญชี CPU ที่ทีมสร้างไว้** ไม่ใช่ Inspector รหัสผ่านซ่อนขณะพิมพ์
4. เมื่อเชื่อมและตรวจทะเบียน CPU สำเร็จ จะเก็บ session เข้ารหัสใหม่แล้วทำงานต่อจนขึ้น Ready

ไม่ต้องส่งรหัสผ่านในแชท ไม่ใส่รหัสใน `.cmd`, config หรือเอกสาร ไม่ต้องสร้างผู้ใช้ใหม่ การเชื่อมผิดบัญชีหรือรหัสไม่ถูกต้องจะไม่แทนที่ไฟล์ session เดิมก่อนผ่านการตรวจทะเบียน CPU

หาก Windows user เปลี่ยนหรือย้ายไป **คอมอีกเครื่อง** ไม่ควรคัดลอก DPAPI session ไปใช้ตรง ๆ ต้องเตรียม Python/โมเดล/config/GEE ให้เครื่องนั้นและเชื่อม CPU ใหม่ คู่มือนี้พร้อมใช้กับเครื่องเดิมที่เตรียมไว้แล้ว

### 3.5 ข้อผิดพลาดที่พบได้

| อาการหรือรหัส | วิธีจัดการ |
| --- | --- |
| `CONFIG_MISSING` / `LOCAL_FILE_MISSING` | ตรวจว่าเปิดไฟล์จากโฟลเดอร์ release เดิม และไม่ได้ย้าย/ลบ environment, โมเดล หรือ config |
| `ENVIRONMENT_MISSING` | ให้ผู้ดูแลตรวจ environment เดิม ตัวเปิดจะไม่ติดตั้งเอง |
| `MACHINE_SIGN_IN_REQUIRED` / `SESSION_INVALID` / `DPAPI_FAILED` | ใช้ Reconnect ตามข้อ 3.4 |
| `NETWORK_UNAVAILABLE` / `RECONNECTING` | ตรวจ Wi‑Fi/อินเทอร์เน็ต รอ retry หากหยุดแล้วให้เปิด Start ใหม่ |
| `WORKER_CHECK_UNAVAILABLE` | โปรแกรมตรวจตัวที่เปิดอยู่ไม่สำเร็จ จึงไม่เปิดซ้ำ ปิดหน้าต่าง worker เดิมขณะว่างแล้วลองใหม่ |
| หน้าต่างขึ้น Ready แต่เว็บยังขอ Sign in | เข้าเว็บไซต์ด้วย Inspector เดิม CPU login ไม่ได้แทนการ Sign in บนเว็บ |
| เปิดงานเก่าแล้วต้องโหลดภาพใหม่ | เป็นเงื่อนไขตรวจข้อมูลภาพ/flight readiness ของ snapshot ไม่จำเป็นต้อง Analyze AI ใหม่เพียงเพื่อดูผลที่บันทึกแล้ว |

### 3.6 หมายเหตุสำหรับผู้ดูแล

`Start-XEDO-CPU.cmd` เปลี่ยน working directory จากตำแหน่งไฟล์เอง แล้วใช้ venv ที่เตรียมไว้รัน `workers/local-ai/launch_worker.py` Config เดิมอยู่ใน ignored `local-data/local-ai-worker/worker.config.json` ตัวเปิดและ direct CLI ใช้ byte lock ของทั้ง session และ workRoot ก่อนอ่าน/refresh session หรือ recover checkpoint พร้อมตรวจ daemon เก่าที่เปิดก่อนมี lock ไม่มีการ kill โปรแกรมตัวเดิมอัตโนมัติ Windows ปล่อย lock เมื่อโปรเซสจบหรือเครื่องปิด ไฟล์ marker ที่เหลือไม่ทำให้ต้องลบทิ้ง

สถานะเฉพาะเครื่องอยู่ที่ `local-data/local-ai-worker/launcher-status.json` เก็บ state/time/code ที่เลือก ไม่มี password/JWT/provider response หรือข้อมูลบัญชี ไม่ใช่หลักฐานว่า daemon ยังทำงานหลัง process ถูกปิดทันที ต้องตรวจหน้าต่างและ Ready ของเว็บประกอบ

ตรวจไฟล์/แพ็กเกจแบบออฟไลน์โดยไม่อ่าน session หรือเชื่อมเครือข่ายได้ด้วย:

```powershell
& 'C:\mega\codex\iENA\tmp\local-ai-worker-venv\Scripts\python.exe' -X utf8 -B workers/local-ai/launch_worker.py --check-only
```

ไม่ใช้ direct CLI `status/login/logout` ขนานกับ worker ที่เปิดอยู่ เพราะคำสั่งเหล่านี้อาจต่ออายุหรือเปลี่ยน session ปัจจุบันจึงใช้ guard เดียวกัน การเชื่อม Supabase session อ้างอิง [เอกสาร User sessions](https://supabase.com/docs/guides/auth/sessions) โดยไม่เปลี่ยนการตั้งค่า Auth ของโปรเจกต์


### 3.7 ซ้อม flow ก่อนนำเสนอ

1. ใช้Windowsuserเดิมและอินเทอร์เน็ต เปิดShortcut **XEDO CPU Worker** หรือStart-XEDO-CPU.cmd รอREADY หากขึ้นALREADY OPENให้ใช้หน้าต่างเดิม
2. เปิดเว็บไซต์ Sign inด้วยInspectorเมื่อเว็บขอ CPUและInspectorเป็นคนละsession
3. เลือก/วาดพื้นที่ แล้วAnalyze ยืนยันการบันทึกพื้นที่และรอผลสำเร็จ ห้ามปิดworkerระหว่างทำงาน
4. ตรวจวันที่SAR/coverage ถ้าไม่มีcandidateยังวาดmanualinspectionareaได้ ผล0candidateไม่ยืนยันว่าไม่มีน้ำมัน แก้พื้นที่/Undo/Redoได้ก่อนยืนยัน
5. Reviewareaimage โหลดภาพที่ครอบคลุมและตรวจภาพ แล้วConfirminspectionarea จากนั้นPreparedronemission ดูเส้นทาง/2D/3D DiagramหรือSatellite
6. ตั้งLaunch/Returnที่ต้องการตรวจ ตรวจข้อมูลลม/แบตเตอรี่/ความสูง/เงื่อนไขก่อนส่งออกตามปกติ หากข้อมูลยังไม่ครบระบบยังล็อกdownload
7. Saveผ่านMy missions รอVersion…Saved ใช้Historyเปิดกลับ ตรวจรูปทรง/ผลAI เมื่อเปิดงานเก่าต้องreloadacquisitionและreviewflightreadinessใหม่ตามข้อความระบบ
8. สำหรับสาธิตไฟล์ใช้Estimateddemoในแท็บแยก โหลดstoredimageแล้วPrepare เลือกHomeบนแผนที่และตรวจsyntheticconstraintsให้ครบ ดาวน์โหลด**demo mission file** ข้อมูลสาธิตเป็นสมมติ ไม่ใช้รับรองบินจริง

ผลซ้อม31ต.ค.: freshNode633/Python84และ3buildsผ่าน; newareaCPUjob→manualedit→reviewv2→route2.75km/3D→Savev3/History/Openตรงกัน Demo.planจริง20missionitems/8053bytesผ่านการตรวจJSON รายละเอียดและสถานะGitล่าสุดอยู่XEDO_WORK_LOG/WEBSITE_DETAILS§3.72

รอบนี้ตรวจshortcuttargetและทดสอบStartจากcwdอื่นขณะworkerเดิมเปิดอยู่(ALREADY OPEN) ไม่ได้rebootWindowsหรือrestartdaemonจริง เครื่องใหม่ยังต้องเตรียมenvironment/model/config/GEEและเชื่อมCPUของเครื่องนั้นตามข้อ3.4 การpushGitไม่ย้ายDPAPIsession/config/modelจากเครื่องนี้และไม่ทำให้CPUทำงานตลอดเมื่อปิดเครื่อง
