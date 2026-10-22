# เตรียม XEDO ขึ้น GitHub และ deploy

ชุดนี้เตรียมจากหน้า Draft ล่าสุด: คง 3 ขั้นตอน ระบบคำนวณ 4 ส่วน โลโก้ และปุ่ม Information โดยค่าเริ่มต้นสร้างเป็นเว็บ static สำหรับสาธิต การจัดชุดไฟล์ยังไม่ได้ push ไป GitHub หรือ deploy จริง

## 1. ใช้โฟลเดอร์ให้ถูก

นำ **ไฟล์และโฟลเดอร์ภายในชุด XEDO** ไปวางที่รากของ repository ให้เห็น `package.json`, `package-lock.json`, `vercel.json`, `src`, `public`, `scripts`, `tests` และ `.github` ที่ระดับเดียวกัน เปิดการแสดงไฟล์ซ่อนขณะคัดลอกเพื่อให้ `.github` และ `.gitignore` ไปครบ

อย่าอัปโหลด `node_modules`, `dist`, `dist-workspace`, `output`, `data`, ไฟล์ฐานข้อมูล, `.env` จริง, token หรือ private key ไฟล์ `.gitignore` จัดรายการยกเว้นไว้แล้ว เก็บ `.env.example` และ `pi-agent/pi.env.example` ซึ่งเป็นเพียงตัวอย่างการตั้งค่าไว้ได้

## 2. ตรวจและ build ในเครื่อง

ติดตั้ง Node.js 24 จากนั้นเปิด terminal ที่โฟลเดอร์เดียวกับ `package.json` แล้วรัน:

```powershell
npm ci
npm run check
npm test
npm run build
```

คำสั่งสุดท้ายสร้าง `dist/index.html` ซึ่งเป็นผลลัพธ์สำหรับ deploy สามารถเปิดไฟล์นี้ในเครื่องเพื่อตรวจหน้า Draft ได้โดยไม่ต้องเปิดพอร์ต หากต้องการไฟล์ทดลองชื่อเดิม ให้รัน `npm run build:file` แล้วเปิด `output/standalone/XEDO-Planning-Trial.html`

## 3. อัปโหลด source ไป GitHub

อัปโหลด source ทั้งชุดตามข้อ 1 โดยไม่รวมรายการที่ `.gitignore` ยกเว้น ตรวจว่า `package-lock.json` และ `.github/workflows/ci.yml` อยู่ใน repository ด้วย GitHub Actions จะตรวจ syntax, รัน tests และ build เมื่อ push หรือเปิด pull request โดยไม่ต้องตั้ง secret และไม่ deploy อัตโนมัติ อ่านรายละเอียดใน [CI.md](CI.md)

หากใช้ repository เดิม ให้ตรวจ diff และ branch ปลายทางก่อนส่ง เพื่อไม่ทับงานที่มีอยู่ การเตรียมชุดนี้ไม่ได้เปลี่ยนสิทธิ์หรือสาขาของ repository เดิม

## 4. ตั้ง Vercel เมื่อพร้อมเผยแพร่

Import repository จาก GitHub แล้วตั้งค่าดังนี้:

| ช่อง | ค่า |
| --- | --- |
| Framework preset | Other |
| Root directory | โฟลเดอร์ที่มี `package.json` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js version | 24.x |
| Environment variables | ไม่ต้องตั้งสำหรับ static draft |

`vercel.json` เตรียมค่าการ build ไว้แล้ว หน้า `/` เป็น Draft ส่วน `/planning` และ `/planning.html` redirect กลับหน้าแรก ควรเปิด preview deployment เพื่อตรวจ 3 ขั้นตอน ปุ่ม Information โลโก้ จอมือถือ และการดาวน์โหลดไฟล์ก่อนเลือกใช้งานจริง

อ้างอิงการตั้งค่าจาก [Configure a build](https://vercel.com/docs/builds/configure-a-build) และ [vercel.json](https://vercel.com/docs/project-configuration/vercel-json) ของ Vercel

## ขอบเขตของเว็บที่ deploy ด้วยค่าเริ่มต้น

- ใช้งาน 3 ขั้นตอนและระบบคำนวณ 4 ส่วนใน browser โดยใช้ภาพ Sentinel-2 ที่เก็บไว้ และแสดงผลเฉพาะพื้นที่ที่ภาพครอบคลุม
- ภาพเก็บไว้ไม่ใช่ข้อมูล GEE realtime และขอบเขตที่เลือกไม่ใช่ผลยืนยันคราบน้ำมันจาก AI
- แผนที่ฐานต้องใช้อินเทอร์เน็ต ส่วนภาพที่ฝังไว้และการคำนวณใช้ในเครื่องได้
- ไม่ deploy API, ฐานข้อมูล หรือ dashboard ขั้นสูง และไม่รับข้อมูล Pi หรือสั่งโดรน/ปล่อยวัสดุจริง
- ดาวน์โหลดแผน QGroundControl `.plan` ได้เมื่อการตรวจผ่าน ส่วน DJI KMZ ยังไม่เปิดใช้งาน
- ไม่มีความจำเป็นต้องตั้ง GEE service account หรือ Pi token ให้ static draft

## ถ้าต้องการพัฒนาระบบหลังบ้านต่อ

ซอร์ส workspace, Worker, migrations และ Pi agent ยังอยู่ในชุดนี้ แต่แยกจากเว็บ static หากทดสอบ workspace ในเครื่องให้รัน:

```powershell
npm run build:workspace
npm run dev:workspace
```

ต้อง build ก่อนเปิด server จากนั้นเข้า `http://127.0.0.1:5173` ผลลัพธ์ workspace อยู่ใน `dist-workspace` และข้อมูลทดสอบอยู่ใน `data` ตามค่าเริ่มต้น หากต้องตั้งค่าฝั่ง server ให้คัดลอก `.env.example` เป็น `.env` ในเครื่อง คำสั่ง `dev:workspace` อ่านไฟล์นี้ให้ ส่วนค่า token และ service account จริงห้าม commit ขึ้น GitHub

**ยังไม่มี backend deployment สำหรับ Vercel ในชุดนี้** ก่อนเผยแพร่ API ต้องจัด runtime ให้รองรับ Worker, เชื่อมฐานข้อมูลและ object storage แบบถาวร, ย้าย/ตรวจ migrations, เพิ่มการควบคุมสิทธิ์ผู้ใช้ และตั้ง secrets ฝั่ง server ให้ครบ โดยคงสิทธิ์ส่วนตัวเดิมไว้ อย่าเปิด local development server เป็น API สาธารณะ

อ่าน [README](../README.md) สำหรับคำสั่งปัจจุบัน ส่วน [LEGACY-WORKSPACE.md](LEGACY-WORKSPACE.md) เป็นเอกสารอ้างอิงของระบบเดิม การที่ tests/build ผ่านยังไม่เท่ากับผ่านการตรวจบัญชี GEE, QGroundControl จริง, เขตการบิน หรืออุปกรณ์ Raspberry Pi และโดรน
