# XEDO Inspector — ผลใช้ migration และตรวจฐานข้อมูลจริง

## 1. หัวข้อ

- วันที่: **28 ตุลาคม 2026**, Asia/Bangkok
- Target: **xedo / `tstmjnlhwidwtzetqxbu`**, องค์กร **megaphijak**
- ผู้ใช้อนุมัติไฟล์ `db/inspector-foundation.sql` และให้ตรวจตาราง/สิทธิ์ โดยให้ทีมสร้างบัญชีภายหลัง
- SHA-256 ที่อ่านก่อนใช้: `62fe9b38623b3e3b8ce4fd04ad2cbb9aace6ca8553ae817ef34e31f6cc1633d2`
- Migration ที่ Supabase บันทึก: **`20261027184951` / `xedo_inspector_foundation`**
- เวลา catalog verification: `2026-10-27T18:50:35.115672Z` ตรงกับ **28 ตุลาคม 2026 01:50:35 น.** ในไทย หมายเลข migration เป็นเวลาฝั่งบริการ ไม่ใช่วันที่แสดงในไทย

## 2. สรุป

**ใช้ migration สำเร็จและตรวจตาราง/สิทธิ์จริงผ่าน 15 checks** โดยไม่สร้างบัญชีหรือภารกิจ โค้ด frontend/API ยังอยู่ในเครื่อง ไม่มี commit/push/deploy การ Login ด้วยบัญชีจริงและการแยกภารกิจของ A/B ยังรอทีมสร้างบัญชี

ก่อนใช้ target เป็น ACTIVE_HEALTHY, private schema/RPC ยังไม่มี, public/private tables และ migrations ว่าง, Auth users=0 ไฟล์ hash ตรงกับที่อนุมัติทั้งหมด ใช้ผ่าน Supabase `apply_migration` เท่านั้น ไม่มีการแก้ SQL เพิ่ม ไม่มี D1/R2 migration หรือการเปลี่ยน Auth providers/billing/ownership

## 3. รายละเอียด

### ตารางและโครงสร้างที่ตรวจจริง

| ตารางใน `xedo_private` | หน้าที่ | RLS | จำนวนแถว |
| --- | --- | --- | --- |
| `inspector_accounts` | รายชื่อ Auth user ที่ทีมเปิดสิทธิ์ Inspector | เปิด | 0 |
| `revoked_sessions` | session ที่ออกจาก XEDO และถูกเพิกถอน | เปิด | 0 |
| `mission_heads` | เจ้าของและ revision ปัจจุบัน | เปิด | 0 |
| `mission_revisions` | document/hash/ผู้บันทึก/เวลาแต่ละเวอร์ชัน | เปิด | 0 |
| `mutation_receipts` | ผลบันทึกเดิมสำหรับ retry อย่างปลอดภัย | เปิด | 0 |

ตรวจ primary keys, foreign keys และ CHECK constraints จาก catalog มี 5 PK และ index `mission_heads_owner_updated` ตาม SQL รวม 6 indexes Auth users ยังคง **0** ไม่มี password/email/user data ถูกอ่านหรือใส่ลงหลักฐาน

### สิทธิ์ตาราง schema และฟังก์ชัน

- `anon` และ `authenticated` ไม่มี SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER ในทั้ง 5 ตาราง ไม่มี column-level SELECT/INSERT/UPDATE/REFERENCES ที่เปิดช่องทางอื่น
- `anon` ไม่มี USAGE/CREATE ใน private schema; `authenticated` มี USAGE แต่ไม่มี CREATE
- ไม่มี RLS policies ตามแบบที่อนุมัติ: client ไม่เข้าตารางโดยตรง คำขอผ่าน transaction routine ที่ตรวจ session, team roster และ owner เท่านั้น RLS เป็นชั้น deny-by-default สำหรับ direct access ผู้ดูแล `postgres` ยังเป็น owner ตามปกติ ไม่ FORCE RLS ในแบบนี้
- ตรวจ definitions ที่อ่านกลับจากฐานข้อมูล เทียบ function body ของทั้ง 3 ตัวกับ SQL ที่อนุมัติแล้วตรงกัน

| ฟังก์ชัน | Security | PUBLIC / anon EXECUTE | authenticated EXECUTE |
| --- | --- | --- | --- |
| `xedo_private.require_inspector(boolean)` | DEFINER, search_path ว่าง | ไม่มี | ไม่มี |
| `xedo_private.inspector_request(text,jsonb)` | DEFINER, search_path ว่าง | ไม่มี | มี |
| `public.xedo_inspector(text,jsonb)` | INVOKER, search_path ว่าง | ไม่มี | มี |

### Negative probes ที่รันบนฐานข้อมูลจริง

ทุก probe เป็น transaction แบบ read-only/role-local ไม่มีการเพิ่ม Auth user/session/ข้อมูลทดสอบ ข้อผิดพลาดด้านล่างเป็นผลที่คาดหวังและนับผ่าน ไม่ทำตาม HINT ให้เปิด SELECT เพิ่ม

| กรณี | ผลที่ได้รับ | ผลตรวจ |
| --- | --- | --- |
| anon เรียก public RPC | SQLSTATE `42501`, permission denied for function | ผ่าน |
| authenticated เรียก RPC โดยไม่มี claims/session | `PT401 SESSION_REQUIRED` | ผ่าน |
| authenticated อ่าน `mission_heads` ตรง | `42501`, permission denied for table | ผ่าน |
| authenticated เรียก identity helper ตรง | `42501`, permission denied for function | ผ่าน |
| authenticated พร้อม claims ทดสอบ แต่ไม่มี session/user จริงใน Auth | `PT401 SESSION_REQUIRED` | ผ่าน |

กรณีสุดท้ายใส่ claims เฉพาะ transaction ของ admin เพื่อพิสูจน์การตรวจ `auth.sessions` ไม่ใช่การสร้าง signed JWT หรือการ Login จริง ไม่มีบัญชีทดสอบค้างอยู่

15 checks รวม 10 กลุ่ม catalog/body/count checks กับ 5 negative probes ทุกข้อผ่าน การประกอบ catalog query ครั้งแรกมีวงเล็บเกินจึงเกิด syntax error แก้เฉพาะ SELECT ตรวจสอบแล้วรันผ่าน ไม่เปลี่ยน schema ที่ใช้แล้ว

### Supabase advisors

- **Security:** ไม่มี WARN/ERROR มี INFO `rls_enabled_no_policy` 5 ตาราง ตรงกับแบบ RPC-only ที่ตั้งใจปิด direct access ไม่เพิ่ม allow policy เพื่อทำให้ INFO หาย ดู [คำอธิบาย RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) และ [ข้อกำหนดความปลอดภัยของ database functions](https://supabase.com/docs/guides/database/functions)
- **Performance:** INFO FK ไม่มี covering index 2 จุด คือ `mission_revisions.created_by` และ `revoked_sessions.user_id` เก็บเป็น maintenance เมื่อรองรับข้อมูลมากขึ้น ไม่เปลี่ยนไฟล์/hash ที่อนุมัติหรือเพิ่ม follow-up DDL โดยเงียบ ดู [Unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
- INFO `unused_index` 1 จุดคือ `mission_heads_owner_updated` ตารางเพิ่งสร้างและยังไม่มีภารกิจ จึงเก็บ index ที่ใช้ list ของ owner ไว้ ดู [Unused index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)

### สิ่งที่ยังต้องทำภายหลัง

1. ทีมสร้าง Auth users สำหรับผู้ทดลอง แล้วเพิ่ม Auth user ID ใน `xedo_private.inspector_accounts` พร้อม `enabled=true` ผ่านช่องทาง admin บัญชีไม่อยู่ใน roster ใช้ private missions ไม่ได้ ห้ามส่ง password ในแชทหรือใส่ใน log
2. ทดสอบ Login/Logout/Save/history/foreign mission ID/session expiry ด้วยบัญชีจริง A/B และการบันทึกพร้อมกันจากหลาย connection
3. เผยแพร่ frontend/API ของบัญชีเมื่อได้รับคำสั่ง release ภายในขอบเขตนั้น รอบนี้อนุมัติและทำเฉพาะ migration/verification
4. ตรวจนโยบาย public signup ก่อนเปิดใช้งานกลุ่มทดลอง ผลตั้งค่าล่าสุดของรอบเตรียมคือ provider signup ยังเปิด แต่ XEDO ไม่มี signup route และ private RPC ตรวจ roster ไม่ได้แก้หรือตรวจ Auth settings ใหม่ในรอบนี้

**ขอบเขตหลักฐาน:** ไม่มี application tests/build/browser rerun ในรอบ apply ผล 500 tests/3 builds/QA จำลองเป็นของ 27 ต.ค. ไม่ใช่ผลใหม่ ไม่มี real-password login, real-account ownership acceptance หรือ concurrency acceptance รอบนี้ ไม่มี commit/push/deploy

หลักฐานเครื่อง: `output/release-check/inspector-live-migration-2026-10-28/verification.json` เก็บ catalog/privileges/counts/advisors/check outcomes โดยไม่มี credentials; เอกสารนี้เป็นสรุปที่เก็บใน checkout เพื่อส่งต่อได้

**รอคำตอบ:** ไม่มีสำหรับ migration นี้ บัญชีผู้ทดลองให้ทีมทำภายหลังตามคำสั่งเดิม
