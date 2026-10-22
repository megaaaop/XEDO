# XEDO: เตรียมเชื่อมตัววัด Ping กับ Google Earth Engine

ตัววัดเป็นไอคอน Wi-Fi และค่า ms บนหัวแผนที่ ใช้เกณฑ์ของแดชบอร์ด: เขียว <300 ms, เหลือง 300–999 ms, แดง ≥1,000 ms หรือคำขอล้มเหลว. สีเทาและ `— ms` หมายถึงยังไม่มีค่าจริง เช่น ยังไม่ตั้งค่า GEE. เกณฑ์นี้ไม่ใช่ SLA ของ Google.

## ค่าที่เตรียมไว้ฝั่งเซิร์ฟเวอร์

| ชื่อ | การตั้งค่า |
|---|---|
| `GEE_PROJECT_ID` | Google Cloud project ที่ลงทะเบียนใช้ Earth Engine และเปิด API แล้ว |
| `GEE_SERVICE_ACCOUNT_JSON` | JSON ของ service account เก็บเป็น **secret ของ Sites** เท่านั้น |
| `GEE_PROBE_ASSET` | ไม่จำเป็น; ค่าเริ่มต้น `projects/earthengine-public/assets/COPERNICUS/S2_SR_HARMONIZED` |

ยังไม่ได้ใส่ค่าของบัญชีจริง. เมื่อพร้อม ให้ตั้ง environment ของ Site แล้วเผยแพร่รุ่นเดิม/รุ่นใหม่เพื่อใช้ค่าเหล่านั้น. Service account ต้องมีสิทธิ์ใช้โปรเจกต์และอ่าน asset ที่เลือก ตาม [คู่มือ Service Accounts ของ Google](https://developers.google.com/earth-engine/guides/service_account).

ในเครื่อง `server.mjs` อ่านค่าจาก process environment; ไม่โหลด `.env` อัตโนมัติ. ไม่ใส่ service account JSON ใน source, HTML, browser storage หรือไฟล์ที่เผยแพร่.

## การวัด

1. Browser เรียก `GET /api/v1/gee/ping?nonce=<unique value>`.
2. Worker แลก JWT ที่ลงนาม RS256 เป็น access token และต่ออายุเมื่อใกล้หมดอายุ. Token อยู่ในหน่วยความจำฝั่งเซิร์ฟเวอร์.
3. Worker เรียก [Earth Engine assets.get](https://developers.google.com/earth-engine/reference/rest/v1/projects.assets/get) แบบอ่าน metadata พร้อม `X-Goog-User-Project`. ไม่สร้างแผนที่ ไม่อ่าน pixels หรือเรียกงานวิเคราะห์ภาพ.
4. Browser แสดงเวลา HTTP ตั้งแต่ส่งคำขอผ่าน XEDO ถึง GEE จนอ่านคำตอบกลับครบ. ค่า `upstream_ms` ใน response แยกเวลา Worker → GEE สำหรับตรวจระบบภายหลัง. ตัวเลขบนหน้าจอรวมเส้นทาง Browser → XEDO → GEE → XEDO → Browser และอาจรวมการยืนยันสิทธิ์รอบแรก.

นี่ไม่ใช่ ICMP ping, เวลาโหลด tile, ความสดของภาพ หรือการวัด bandwidth. การเชื่อมแผนที่และภาพจาก GEE เป็นงานขั้นถัดไป; ตัววัดพร้อมทำงานเมื่อใส่ค่าบัญชีจริงแล้ว.

วัดประมาณทุก 30 วินาทีเฉพาะตอนเปิดหน้าแผนที่และแท็บมองเห็น. ใช้ sampler ร่วมกันทั้งสามหน้าแผนที่. เมื่อยังไม่ตั้งค่า จะตรวจสถานะเว็บทุก 60 วินาทีโดย **ไม่เรียก GEE**. ปิดแท็บ/เปลี่ยนไปหน้าที่ไม่ใช่แผนที่/ออฟไลน์แล้วหยุดวัด. ไม่บันทึกตัวเลขลงฐานข้อมูล.

หลังตั้งค่า จะมีคำขออ่าน metadata ประมาณ 2 ครั้งต่อนาทีต่อแท็บที่เปิดใช้งาน บวกการแลก token เมื่อจำเป็น. คำขอเหล่านี้ยังเป็นการใช้ API ของ GEE; ไม่ใช่การวัดที่ไม่ใช้ quota. ไม่มีการเรียกเพิ่มเพราะคลิกหรือเลื่อนแผนที่.

## สถานะ API

- `not_configured`: ไม่มี project หรือ secret; `upstream_ms` เป็น null, ไม่เติมค่า Ping เว็บแทน.
- `connected`: ได้ response ของ asset ที่ตรงกันจริง; `upstream_ms` เป็นตัวเลข.
- `error`: สิทธิ์ไม่พร้อม, quota, timeout, network หรือ response ไม่ถูกต้อง; ไม่แสดงเลขเก่าที่ดูเหมือนยังเชื่อมอยู่.

API ตอบ no-store และคืน nonce เดิม. Timeout ฝั่ง Worker 6.5 วินาทีและ browser 8 วินาที. ข้อความ error ไม่คืน private key, token หรือเนื้อหา error ต้นทาง.

ตรวจด้วย `npm test`: ทดสอบการลงนาม JWT จริงกับกุญแจชั่วคราวและ response จำลอง รวมการใช้ token ซ้ำและ failure states. ยังไม่ทดสอบบัญชี GEE จริง.

อ้างอิงการยืนยันสิทธิ์: [Google OAuth 2.0 Service Accounts](https://developers.google.com/identity/protocols/oauth2/service-account).
