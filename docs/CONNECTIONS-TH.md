# การตั้งค่า GEE และ Supabase ในเครื่อง

คำสั่งตรวจการเชื่อมต่อเป็นการอ่านอย่างเดียว ไม่สร้างตาราง ไม่อัปโหลดข้อมูล และไม่เปลี่ยนฐานข้อมูลของเว็บจาก SQLite เป็น Supabase

## ตั้งค่า

1. ใช้ `.env` ในโฟลเดอร์เดียวกับ `package.json` โดยอ้างอิง `.env.example`
2. ตั้ง `GEE_PROJECT_ID` เป็นโปรเจกต์ที่ลงทะเบียน Earth Engine และเปิด API แล้ว
3. วาง Service Account JSON ที่ `secrets/gee-service-account.json` หรือเปลี่ยน `GEE_SERVICE_ACCOUNT_FILE` ให้ตรงตำแหน่งจริง ไฟล์จะถูกอ่านเฉพาะฝั่ง Node server หากตั้ง `GEE_SERVICE_ACCOUNT_JSON` ไว้ด้วย ค่า inline มีลำดับก่อน
4. ตั้ง `SUPABASE_URL` และ `SUPABASE_PUBLISHABLE_KEY` เป็นคู่ของโปรเจกต์เดียวกัน
5. เรียก `npm run connections:check`

`.env` และ `secrets/` ถูกยกเว้นจาก Git อยู่แล้ว เก็บ Service Account JSON เฉพาะในเครื่องหรือ secret configuration ของ server ไม่ใส่ในหน้าเว็บหรือ public assets

## การอ่านผล

- GEE `connected` หมายถึงยืนยันตัวตนและอ่าน metadata จาก Earth Engine ได้ ยังต้องตรวจสิทธิ์คำนวณแยกด้วย deployment preview ที่ใช้ `useGEE: true`
- GEE `GEE_CREDENTIAL_FILE_MISSING` หมายถึงยังไม่พบไฟล์ที่ตั้งไว้ โปรแกรมไม่ใช้ค่าจำลองแทน
- Supabase ตรวจ Auth settings และ Data API schema โดยส่ง publishable key ใน `apikey` header ไม่มีการอ่านแถวข้อมูล
- Supabase `partial` พร้อม `schema_check_requires_secret` หมายถึง Auth ยอมรับ key แล้ว แต่ endpoint อ่าน schema ต้องใช้สิทธิ์เพิ่ม ไม่ได้หมายความว่า key ใช้ไม่ได้ และไม่ได้ยืนยันสิทธิ์อ่านหรือเขียนตาราง
- คำสั่งคืน exit code 1 หากมีบริการที่ยังไม่เชื่อมครบ จึงต้องอ่าน `state` และ `code` ของแต่ละบริการประกอบ

ก่อนเชื่อมข้อมูล XEDO กับ Supabase ต้องตรวจ schema เดิมและกำหนดสิทธิ์ผู้ใช้/RLS รวมถึงที่เก็บภาพ ปัจจุบัน Supabase connector ต้องได้รับสิทธิ์ในโปรเจกต์เป้าหมายก่อนทำงานส่วนจัดการฐานข้อมูล

`npm run dev:workspace` อ่าน credential file นี้เช่นกัน ส่วน `npm run build` ยังคงสร้างเว็บ static โดยไม่มี credentials หรือ API server ภายในไฟล์

อ้างอิง: [Earth Engine service accounts](https://developers.google.com/earth-engine/guides/service_account), [Supabase API keys](https://supabase.com/docs/guides/api/api-keys)
