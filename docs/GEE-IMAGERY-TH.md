# ภาพดาวเทียมจาก Google Earth Engine

## ใช้งาน

1. เปิดเว็บแล้วรอภาพพื้นหลัง GEE โหลดได้เลย โดยยังไม่ต้องวาดพื้นที่ ระบบแสดงช่วงวันที่ถ่ายและจำนวนภาพที่ใช้ต่อกันเป็นพื้นหลัง
2. เลื่อนหรือซูมแผนที่ แล้ววาด Polygon ทับภาพดาวเทียม หรือ import ขอบเขต จากนั้นเลือก Review area image
3. ระบบค้นหาและโหลดภาพล่าสุดที่ครอบคลุมพื้นที่ให้ หากต้องการภาพอื่น เปลี่ยนวันที่/เปอร์เซ็นต์เมฆ กดค้นหา เลือกฉาก แล้วกด Load selected image
4. รอภาพ RGB โหลดครบ ตรวจวันเวลาถ่ายและเปอร์เซ็นต์เมฆ จากนั้นจึงเลือก Prepare drone mission การเห็นภาพพื้นหลังเพียงอย่างเดียวยังไม่ผ่านขั้นตรวจภาพของพื้นที่

ภาพพื้นหลังใช้ฉาก Sentinel-2 ที่ตัดกับหน้าจอจากช่วง 30 วันล่าสุดตาม UTC สูงสุด 31 ฉาก โดยวางฉากใหม่ทับฉากเก่า จึงแสดงเป็นช่วงวันที่ พื้นที่แสดงผลแต่ละครั้งกว้าง/สูงไม่เกิน 100 กม. และเว็บจำกัดการซูมออกให้เหมาะกับกรอบนี้ หากภาพโหลดไม่ได้จะแจ้งข้อผิดพลาดและปุ่มลองใหม่ ไม่สลับไปใช้ OpenStreetMap ในโหมด hosted

ระบบใช้ `COPERNICUS/S2_SR_HARMONIZED` แถบ B4/B3/B2 ความละเอียดต้นฉบับ 10 เมตร ภาพเป็นการถ่ายตามรอบดาวเทียม ไม่ใช่วิดีโอหรือการยืนยันคราบน้ำมัน เปอร์เซ็นต์เมฆเป็นค่าของทั้งฉาก ไม่ใช่ผลประเมินเฉพาะขอบเขตที่เลือก

ค้นได้ครั้งละไม่เกิน 90 วัน ขอบเขตกว้าง/สูงไม่เกิน 100 กม. และแสดงฉากที่ครอบคลุมเต็มพื้นที่สูงสุด 12 ฉาก หากไม่มีผลให้เปลี่ยนวันที่ เกณฑ์เมฆ หรือพื้นที่ ระบบไม่สลับไปใช้ภาพตัวอย่างโดยอัตโนมัติ

## ในเครื่อง

ตั้ง `.env` และ credential file ตาม [CONNECTIONS-TH.md](CONNECTIONS-TH.md) แล้วรัน:

```powershell
npm run build:workspace
npm run dev:workspace
```

เปิด `http://127.0.0.1:5173/` หรือ `/planning.html` โหมด workspace บันทึกภาพอ้างอิงและขอบเขตเดิมใน SQLite เมื่อเตรียมภารกิจ การเปิด survey เดิมจะสร้าง tile session ใหม่จากแหล่งภาพเดิม

`npm run build:file` ยังคงเป็นไฟล์ offline ที่ใช้ภาพเก็บไว้ ไม่มี GEE API หรือ credentials ฝังในไฟล์

## Vercel

ใช้โปรเจกต์ XEDO เดิม: Node 24, Framework Other, build `npm run build`, output `dist` และ source `api/gee.mjs` ตั้ง `GEE_PROJECT_ID` และ `GEE_SERVICE_ACCOUNT_JSON` เป็น server environment variables โดย JSON เป็น secret ไม่ใช่ตัวแปร public อย่าอัปโหลด `secrets/` หรือ `.env`

หน้าเว็บที่ hosted ใช้ GEE imagery API และเครื่องคำนวณใน browser แต่ไม่เปิด API ฐานข้อมูล/Pi/flight control ของ workspace การบันทึกข้อมูลถาวรบน Supabase เป็นงานเชื่อมต่ออีกส่วน

บัญชีที่มีสิทธิ์คำนวณแต่ไม่มี `earthengine.maps.create` ใช้การ render RGB ผ่าน `image:computePixels` แบบ 256×256 ต่อ tile ได้ ระบบเลือกวิธีนี้อัตโนมัติเมื่อ map creation ถูกปฏิเสธ จึงไม่ต้องเพิ่มสิทธิ์เขียนให้บัญชีเดิมเพื่อแสดงภาพ

## HTTP และการจำกัดขอบเขต

| Endpoint | ข้อมูล |
|---|---|
| POST `/api/v1/gee/imagery/basemap` | `{geometry}` ของหน้าจอ → ภาพพื้นหลังจาก GEE, ช่วงวันเวลาถ่ายจริง, จำนวนภาพ และ tile session อายุ 30 นาที |
| POST `/api/v1/gee/imagery/search` | `{geometry,start,end,maxCloud}` → รายชื่อภาพและวันที่ถ่าย |
| POST `/api/v1/gee/imagery/map` | `{sceneId,geometry}` → แหล่งภาพที่ตรวจใหม่, `geometry`, session อายุ 30 นาที และ same-origin tile URL |
| GET `/api/v1/gee/imagery/tiles/{sessionId}/{z}/{x}/{y}` | PNG RGB; zoom 0–18 |

Server รับเฉพาะ dataset และ expression ที่กำหนดไว้ ตรวจ geometry/source ใหม่ก่อนสร้างภาพ และไม่รับ URL หรือคำสั่ง GEE จาก browser Tile session ถูกเข้ารหัสและตรวจความถูกต้อง ทำงานข้าม cold start ได้โดยไม่เปิดเผย Google access token ภาพถูก clip ตามกรอบขอบเขต และ tile นอกกรอบเป็นภาพโปร่งใส Browser ตรวจว่ามีพิกเซลที่ไม่โปร่งใสภายใน polygon จริงก่อนเปิดปุ่มเตรียมภารกิจ หากภาพว่างทั้งหมดจะแจ้งให้เลือกภาพอื่น การเปลี่ยนพื้นที่/แหล่งภาพหรือ tile session หมดอายุยกเลิกความพร้อมของการตรวจภาพ

อ้างอิง: [Sentinel-2 dataset](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED), [GEE maps.create](https://developers.google.com/earth-engine/reference/rest/v1/projects.maps/create), [GEE computePixels](https://developers.google.com/earth-engine/reference/rest/v1/projects.image/computePixels), [GEE tiles.get](https://developers.google.com/earth-engine/reference/rest/v1/projects.maps.tiles/get), [Vercel Node runtime](https://vercel.com/docs/functions/runtimes/node-js)
