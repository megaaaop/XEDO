# XEDO Inspector — ชุดเปลี่ยนฐานข้อมูลที่อนุมัติและใช้แล้ว

## 1. หัวข้อ

- วันที่เตรียม: 27 ตุลาคม 2026; อนุมัติและใช้จริง: 28 ตุลาคม 2026, Asia/Bangkok
- องค์กร: **megaphijak** (`rphjcbkprrafgiregduu`)
- โปรเจกต์: **xedo**, ref **`tstmjnlhwidwtzetqxbu`**
- SQL ที่ขอใช้: `db/inspector-foundation.sql`
- SHA-256: `62fe9b38623b3e3b8ce4fd04ad2cbb9aace6ca8553ae817ef34e31f6cc1633d2`
- สถานะ: **ผู้ใช้อนุมัติแล้ว ใช้กับฐานข้อมูลจริงและตรวจตาราง/สิทธิ์แล้ว** migration `20261027184951` / `xedo_inspector_foundation` ไฟล์ SQL/hash ตรงชุดที่อนุมัติ

## 2. สรุป

ผู้ใช้อนุมัติชุด SQL นี้โดยตรงเมื่อ 28 ตุลาคม 2026 แล้วใช้กับ xedo ผ่าน connection **megaphijak** สำเร็จ ตรวจตาราง/RLS/สิทธิ์/definition และกรณีปฏิเสธ role/session รวม 15 checks ผ่าน ดู [หลักฐานรอบใช้จริง](INSPECTOR_DATABASE_VERIFICATION_2026-10-28.md) ตอนจบรอบmigrationยังไม่มี Auth user/mission data หรือ frontend/API release ต่อมาผู้ใช้อนุมัติเผยแพร่และตรวจLoginแล้วตาม [WEBSITE_DETAILS §3.22](WEBSITE_DETAILS.md#322-inspector-account-release--28-ตุลาคม-2026) ไม่ได้สร้างบัญชีทดลอง

สถานะก่อน migration ที่ตรวจจริง: target ACTIVE_HEALTHY; public/private tables และ migrations ว่าง; Auth users=0 ผล public Auth settings ของรอบเตรียม 27 ต.ค. เป็น email enabled และ `disable_signup=false` ไม่ได้เปลี่ยนหรือตรวจ setting นี้ใหม่ในรอบ apply

ชุด SQL นี้เพิ่มที่เก็บภารกิจส่วนตัว ประวัติเวอร์ชัน การกันบันทึกซ้ำ และจุดตรวจสิทธิ์ของ Inspector โดยใช้ Supabase Auth เดิม ไม่สร้างบัญชีผู้ทดลอง ผู้ใช้ยืนยันว่าทีมจะสร้างบัญชีให้ภายหลัง

**ประวัติการขออนุมัติ:** รอบเตรียมเครื่องมือ apply_migration ถูกระบบตรวจอนุมัติอัตโนมัติปฏิเสธ เพราะยังไม่มีคำอนุญาตที่ระบุ migration ชุดนี้ชัดเจนและ SQL ยังต้องตรวจครบ จึงทดสอบในเครื่องจนจบ ไม่ใช้ execute_sql หลบ ต่อมาผู้ใช้อนุมัติไฟล์/target โดยตรงแล้ว จึงส่ง apply_migration อีกครั้งตามหลักฐานอนุญาตใหม่และสำเร็จ สถานะเดิม false/false/0 ถูกแทนด้วย schema/RPC ที่ตรวจแล้วและ Auth users=0 ไม่มีคำถามอนุมัติชุดนี้ค้าง

## 3. รายละเอียด

### สิ่งที่ SQL จะเพิ่ม

| รายการ | จุดประสงค์ |
| --- | --- |
| schema `xedo_private` | แยกข้อมูลภารกิจออกจาก public tables/ระบบ workspace เดิม |
| `inspector_accounts` | รายชื่อ Auth user ID ที่ทีมอนุญาตให้ใช้ XEDO; มี role ในแอปเดียวคือ Inspector |
| `revoked_sessions` | บล็อก session ที่ออกจาก XEDO แม้ access JWT ยังไม่หมดอายุ |
| `mission_heads` | เจ้าของ ชื่อ และ revision ปัจจุบันของภารกิจ |
| `mission_revisions` | ประวัติ document/hash/ผู้บันทึก/เวลา เพิ่มเป็นเวอร์ชันใหม่ทุกครั้ง |
| `mutation_receipts` | คืนผลเดิมเมื่อ retry คำขอเดิม และปฏิเสธ mutation ID ที่ถูกใช้กับข้อมูลอีกชุด |
| private functions 2 ตัว | ตรวจ active session/team roster และทำธุรกรรมที่บังคับ owner |
| public RPC `xedo_inspector` | wrapper แบบ SECURITY INVOKER ให้ authenticated เรียก operation ที่กำหนด |

เปิด RLS ทั้ง 5 ตาราง และไม่ให้ anon/authenticated อ่านหรือเขียนตารางโดยตรง ทุก operation ต้องผ่าน routine ที่ตรวจ `auth.uid()`, JWT expiry, `auth.sessions` ที่ตรง user/session ID, `not_after` และรายการ revocation จากนั้นตรวจเจ้าของ mission ซ้ำ ไม่เชื่อ owner/actor/time ที่ client ส่งมา

private routines ใช้ SECURITY DEFINER เฉพาะธุรกรรมที่ต้องเข้าตารางซึ่งไม่ให้ผู้ใช้เขียนตรง ตั้ง `search_path=''` และอ้าง relation แบบเต็ม การตรวจ owner ใน routine เป็นข้อบังคับ เพราะ definer ไม่ได้พึ่ง RLS เพียงอย่างเดียว ถอน EXECUTE ของ PUBLIC/anon และให้ authenticated เฉพาะ routine/wrapper ที่จำเป็น

ล็อกตาม session ก่อนตรวจสิทธิ์ เพื่อเรียง Save/Logout; ล็อกตาม owner+mutation ID ก่อนอ่าน receipt; update ล็อก mission head แล้วตรวจ expected revision จากนั้นเพิ่ม revision/update head/receipt ใน transaction เดียว คำขอข้ามเจ้าของและ ID ที่ไม่มีอยู่ตอบ 404 เหมือนกัน งานของตนเองแต่ revision เก่าตอบ 409

### สิ่งที่ชุดนี้ไม่เปลี่ยน

ไม่มีคำสั่งลบตาราง/ข้อมูลเดิม ไม่แก้ Auth users หรือสร้างบัญชี ไม่เปลี่ยน Auth signup/provider/billing/password/project ownership ไม่ย้าย D1/R2 และไม่เปลี่ยนโมเดล AI โปรไฟล์โดรน หรือเวลาวางแผนเดิม ไม่มี service-role key ใน client หรือในไฟล์ชุดนี้

ผล AI/review ยังไม่เปิดยืนยัน: API/RPC ปฏิเสธ `confirm_risk` จนกว่าจะเชื่อม geometry/coverage/review validation ครบ เก็บได้เฉพาะร่างในรอบนี้

### โค้ดที่เตรียมเชื่อม

- `api/inspector.mjs`: same-origin BFF สำหรับ login/session/logout/Save/list/get/history ใช้ JWT ของผู้ใช้กับ RPC และ publishable key ของ XEDO
- `src/inspector-validation.js`: AJV 2020 + UUID/date-time + geometry/size limits
- `src/inspector-client.js`, `inspector-state.js`, `inspector.css`: My missions, Save, Save a new copy, ประวัติ, session/edit epochs และการรักษาร่างเมื่อคำขอล้มเหลว
- `src/planning-trial-client.js`: capture/restore inputs และตรวจ session/account ก่อนและหลังรอ export; คง 3 ขั้นตอน/4 calculators และ browser calculation API เดิม
- `server.mjs`, `vercel.json`: จัดเส้นทาง `/api/v1/inspector/*` ก่อน GEE catch-all

Browser ได้เพียง cookie แบบ HttpOnly/Secure/SameSite บน HTTPS ไม่มี token ใน localStorage หรือ API response ทุก private request ผูก expected actor เพื่อกันอีกแท็บเปลี่ยนบัญชีระหว่างทำงาน ค่า expected actor เป็นการตรวจความสอดคล้องเท่านั้น สิทธิ์จริงมาจาก Supabase JWT และ DB

Session รุ่นแรกเก็บ access token อย่างเดียว ไม่มีการเก็บ refresh token จึงต้อง login ใหม่เมื่อหมดอายุ cookie สูงสุด 1 ชั่วโมง การออกจากระบบพยายาม revoke ทั้ง XEDO และ Supabase; หากยืนยัน server revocation ไม่ได้ จะแจ้งว่าไม่สำเร็จครบถ้วนและล้าง cookie ของ browser ไม่อ้างว่าลบ JWT เก่าได้ในกรณีนั้น

### ผลตรวจรอบเตรียม 27 ตุลาคม 2026 — ไม่ได้รันซ้ำในรอบ apply

- `npm test`: **500 ผ่าน / 0 ล้มเหลว / 0 ข้าม**
- Syntax check และ build เว็บ/workspace/portable HTML: ผ่านทั้ง 3 รูปแบบ
- SQL จริงใน PGlite แบบ in-memory: ผ่าน owner isolation, history, retry receipt, stale revision, owner spoof, direct table/anon denial, expired/mismatched/unapproved/revoked sessions
- Browser กับ Auth จำลองและ PostgreSQL ในเครื่อง: A บันทึก 2 เวอร์ชัน เปิดประวัติ/เวอร์ชันเก่า และถูกกัน stale save; B ไม่เห็นรายการของ A; บันทึกและเปิดพื้นที่ 24,131 m² กลับได้ โดย export ยังล็อกและคง 3 ขั้น/4 calculators; dialog 390 px ไม่ล้นแนวนอน
- API tests เพิ่ม expected actor ข้ามแท็บ และ workflow tests ตรวจการหมด session ระหว่าง export
- เป็น PostgreSQL/role tests และ UI simulated-Auth tests **ไม่ใช่** Supabase password-login/real-account/RLS acceptance บน production ไม่มีการทดสอบ multi-connection concurrency จริง (PGlite มี connection เดียว)
- npm audit พบ moderate 4 รายการในสาย dev tooling เดิม (`drizzle-kit`/esbuild-kit/esbuild), high/critical 0 ไม่ใช้ audit fix --force และไม่ขยาย scope อัปเกรดเครื่องมือเดิมอัตโนมัติ

หลักฐานอยู่ `output/release-check/inspector-foundation-2026-10-27/` และคำสั่งรันทดสอบซ้ำคือ `npm run test:inspector` / `npm run preview:inspector` เซิร์ฟเวอร์ QA ผูกเฉพาะ localhost และไม่เชื่อม Supabase จริง

### หลังอนุมัติ — สถานะ ณ 28 ตุลาคม 2026

1. **เสร็จ:** เทียบ SHA-256 ตรงและตรวจ schema จริงก่อนใช้ migration `20261027184951` กับ **xedo ref นี้เท่านั้น** ผ่าน connection megaphijak
2. **เสร็จ:** ตรวจ 5 tables/RLS, table/column/schema/function grants, function bodies และ 5 negative role/session probes รวม 15 checks ผ่าน Advisors มี INFO 5 รายการเรื่อง RLS ไม่มี policy ตามแบบ RPC-only และ performance INFO เรื่อง FK index 2/unused index 1 ไม่มี security WARN/ERROR ไม่เพิ่ม DDL นอกไฟล์ที่อนุมัติ
3. ทีมสร้างผู้ทดลองผ่าน Supabase Authentication แล้วเพิ่ม Auth user ID ใน `xedo_private.inspector_accounts` ด้วยช่องทาง admin; ไม่ใส่รหัสผ่านในแชทหรือ log
4. ตรวจนโยบายปิดรับสมัครทั่วไปก่อน release ปัจจุบัน provider ยัง `disable_signup=false` แต่ XEDO ไม่มี signup UI/API และ RPC ไม่รับบัญชีที่ไม่ได้อยู่ใน team roster
5. ใช้บัญชีจริง A/B ตรวจ login-cookie-save-history-logout/foreign ID/expired session และทดสอบ concurrency ผ่านบริการจริง
6. ปิดงาน UX และเชื่อม prepared AI/risk editor ตามคิวเดิม ตรวจรวม แล้วเผยแพร่เฉพาะภายในขอบเขตคำอนุญาตที่ยืนยันสำหรับรอบนั้น

**รอคำตอบ:** ไม่มีคำถาม migration ค้าง ผู้ใช้อนุมัติและตรวจผลครบแล้ว บัญชีผู้ทดลองให้ทีมสร้างภายหลังตามเดิม Frontend/APIเผยแพร่ในรอบอนุมัติreleaseถัดมาแล้ว ส่วนreal-account acceptanceยังรอทีมสร้างบัญชี การอนุมัติชุดฐานข้อมูลนี้ไม่รวมการสร้างบัญชีหรือเปลี่ยน billing
