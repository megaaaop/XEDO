# รายงานตรวจและแก้ Home altitude จาก Google Earth Engine

วันที่: **31 ตุลาคม 2026 — Asia/Bangkok**
สถานะ: **ตรวจภาพและ JSON ใหม่ตรงกันแล้ว; fresh639tests/syntax/3buildsผ่าน กำลังเผยแพร่ตามคำสั่งล่าสุด**
ฐาน source ที่เริ่มตรวจ: `9acdd8a`
โปรเจกต์: `C:\mega\codex\iENA\github-publish\XEDO-hardware-release`

## 1. ผลที่ได้

พบและแก้บั๊กที่ทำให้ช่อง **Home altitude AMSL (m)** ยังว่าง แม้ GEE ส่งค่าความสูงของ Home มาแล้ว หลังแก้ ช่องนี้เติมค่าจาก GEE ได้อัตโนมัติในโหมด **Automatic GEE model** โดยไม่ต้องกรอกตัวเลขหรือกดรับค่าด้วยตนเอง

จุดทดสอบสาธารณะ `[101.20, 12.70]` ได้ความสูง **10.788701057434082 เมตร** จากชุดข้อมูล `COPERNICUS/DEM/GLO30_2024_1` ระบบนำค่านี้ไปใส่ช่อง Home altitude จริง ขณะที่สถานะเส้นทางยังเป็น **GEE model needs review** ตามผลประเมินภูมิประเทศเดิม

![Home altitude และ Surface assessment บน build ที่ตรวจรอบ release](C:/mega/codex/iENA/outputs/XEDO_Home_Altitude_Release_2026-10-31/local-home-surface.png)

ภาพใหม่แสดง10.788701057434082ตรงกับ local-matched-proof.jsonก่อนและหลังcapture ภาพafter.jpgเดิมมีvisualdiscrepancyจึงเก็บเป็นประวัติและไม่ใช้ยืนยันผลผ่าน (ดู§3.74–3.75ในบันทึกงาน)

## 2. สาเหตุที่ตรวจพบ

เส้นทางที่ตรวจคือ **เลือกพื้นที่และ Home → browser ขอ planning-context → server อ่าน GEE → รับ Home sample → เติมฟอร์ม → ประเมินความพร้อมส่งออก**

เดิม `reconcileModelHome()` จะเรียกเติมความสูงเฉพาะเมื่อการประเมินภูมิประเทศของทั้งพื้นที่/เส้นทางเป็น `ready` เท่านั้น:

```js
if (terrainMode() === 'automatic' && terrainAssessment().state === 'ready') {
  geospatialUI?.useModelHomeEstimate();
}
```

จึงเกิดการผูกสองเรื่องเข้าด้วยกัน: การมีข้อมูลความสูงที่จุด Home กับการผ่านเกณฑ์ความต่างระดับของทั้งเส้นทาง เมื่อ Home อยู่บนฝั่งแต่พื้นที่ตรวจอยู่ในทะเล ระดับอาจต่างกันเกิน tolerance 2 เมตรของแบบจำลอง ทำให้ assessment เป็น `review` แม้ Home sample จะมีข้อมูลครบ

หลักฐานก่อนแก้จาก Chrome และ GEE จริง:

| รายการ | ผลก่อนแก้ |
|---|---|
| Home ที่กรอกเป็นพิกัดทดสอบ | longitude `101.20`, latitude `12.70` |
| พื้นที่ตรวจ | สี่เหลี่ยม longitude `101.220–101.222`, latitude `12.620–12.621` |
| โหมด | Automatic GEE model |
| สถานะ GEE | GEE planning data ready |
| Home elevation ในแผง GEE | 10.79 m · EGM2008 |
| Surface elevation | 0–0 m จากแบบจำลอง |
| การประเมินทั้งเส้นทาง | GEE model needs review |
| ช่อง Home altitude | ว่าง / placeholder Unknown |

อ่าน [ข้อมูลก่อนแก้](/C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/playwright/home-altitude-2026-10-31/before.json) ได้โดยตรง ภาพต้นฉบับจากผู้ใช้ไม่ได้มีพิกัดหรือสถานะ GEE ครบ จึงไม่สรุปว่านี่เป็นสาเหตุเดียวของภารกิจต้นฉบับ แต่เป็นบั๊กที่ทำซ้ำและยืนยันกับข้อมูลจริงได้

## 3. สิ่งที่แก้

1. **แยกการเติม Home ออกจากผลประเมินทั้งเส้นทาง** เมื่ออยู่ในโหมด Automatic ระบบพยายามใช้ Home sample ที่ตรงกับจุดปัจจุบันและยังใช้งานได้ โดยไม่ต้องรอให้ทั้งเส้นทางผ่าน tolerance
2. **เพิ่มการตรวจความพร้อมของ Home sample โดยเฉพาะ** ผ่าน `canUseModelHomeEstimate()` และใช้เงื่อนไขเดียวกันสำหรับปุ่ม Replace Home height with GEE estimate ปุ่มนี้จึงใช้งานได้เมื่อ Home มีข้อมูล แม้ภูมิประเทศของเส้นทางยังต้องทบทวน
3. **รักษาค่า manual** การเติมอัตโนมัติยังไม่เขียนทับตัวเลขที่ผู้ใช้กรอกเอง ผู้ใช้เปลี่ยนกลับมาใช้ GEE ได้ด้วยปุ่ม Replace อย่างชัดเจน
4. **รักษาหลักฐานแหล่งข้อมูล** เก็บ Home, value, dataset, EGM2008, resolution, fetchedAt/expiresAt และ `reviewed: false` ตามเดิม การได้ตัวเลขไม่ได้แปลว่ามีคนตรวจจุดขึ้นบินแล้ว
5. **ปรับข้อความในแผง GEE** ให้แสดงค่าที่นำไปใช้และระบุว่าการตรวจภูมิประเทศของเส้นทางยังเป็นอีกขั้นตอน
6. **สร้างรายการ asset cache ใหม่ใน vercel.json** ให้ตรงกับชื่อไฟล์จาก build ที่เปลี่ยนไป ไม่เปลี่ยน environment หรือ configuration ของ production ที่กำลังทำงาน

เงื่อนไขอนุญาตส่งออกใน `planning-geospatial-gate.js` และการประเมินภูมิประเทศใน `planning-terrain.js` ยังคงเดิม ตัวเลข Home ที่เติมสำเร็จไม่ทำให้เส้นทางที่ต้องทบทวนถูกอนุมัติอัตโนมัติ

## 4. ผลทดสอบ

| การตรวจ | ผล | หลักฐาน |
|---|---|---|
| ทำซ้ำใน browser ก่อนแก้กับ GEE จริง | พบช่องว่างทั้งที่ Home มี 10.79 m | `before.json` |
| browser หลัง reload build สุดท้าย | ช่องมี `10.788701057434082`, terrain ยัง needs review, ปุ่ม Replace เปิดใช้งาน | `final-browser.json`, `after.jpg` |
| GEE API จริงจาก Node process ใหม่ ไม่ใช้ cached context | terrain ready, Home `10.788701057434082`, assessment review; เรียก compute จริง 2 ครั้ง | `live-api.json` |
| ค่า manual `99` แล้ว refresh GEE | ยังคง `99`; กด Replace แล้วกลับเป็นค่าจาก GEE | `manual-override.json` และ browser observation |
| เปลี่ยน Home เป็น `[101.20, 12.65]` | ค่าเดิมถูกล้างระหว่างรอ และเติม `0` จากข้อมูลใหม่ | `changed-home.json` |
| ใช้โหมด Manual แล้วล้างความสูง/refresh | คงช่องว่าง ไม่มีการเติมอัตโนมัติ | `manual-mode.json` |
| ล้าง longitude ของ Home | ความสูงถูกล้าง และปุ่ม Replace ถูกปิด | `cleared-home.json` |
| ทดสอบ regression ด้วยเงื่อนไขเดิมที่จำลองกลับมา | ไม่ผ่านตามคาด เพราะไม่เรียกเติมค่าเมื่อ assessment review | `home-altitude-before-regression.log` |
| Full Node suite บน source/config สุดท้าย | **639 ผ่าน / 0 fail / 0 cancelled / 0 skipped** | `home-altitude-full-tests.log` |
| Syntax: npm run check | ผ่าน | `home-altitude-check.log` |
| Hosted build: npm run build | ผ่าน | `home-altitude-build.log` |
| Workspace build | ผ่าน | `home-altitude-workspace-build.log` |
| Portable HTML build | ผ่าน | `home-altitude-portable-build.log` |
| Browser warning/error ที่เก็บในช่วงตรวจ | 0 รายการ | `browser-logs.json` |

เพิ่ม regression tests 6 รายการ ครอบคลุม controller จริงใน workflow harness, Home ที่ทราบค่าแต่เส้นทาง review/unknown, provider อื่นไม่พร้อม, sample หาย, Home/height reference ไม่ตรง, ข้อมูลหมดอายุ, ค่า 0/ค่าติดลบ, การรักษา manual และการปฏิเสธส่งออกเมื่อพื้นที่ต่างระดับ แม้ Home เติมครบแล้ว

ระหว่างพัฒนาเคยมี full-suite ไม่ผ่านจาก test double ที่ยังไม่มีเมธอดใหม่ และจาก asset inventory ที่ยังไม่ regenerate หลังแก้ source แก้ทั้งสองอย่างแล้วจึงรันชุดสุดท้ายจนผ่านครบ เก็บ log สองรอบที่ไม่ผ่านแยกไว้ ไม่ใช้เป็นผลสำเร็จ

## 5. ไฟล์ที่เปลี่ยน

| ไฟล์ | การเปลี่ยน |
|---|---|
| `src/planning-trial-client.js` | การเรียกเติมอัตโนมัติ และความพร้อม/การทำงานของปุ่ม Replace |
| `src/planning-geospatial-ui.js` | ตรวจ Home sample แยกจากเส้นทาง และข้อความแสดงค่าที่ใช้ |
| `tests/planning-workflow.test.mjs` | ปรับ test double และเพิ่ม regression ของ controller/ปุ่ม |
| `tests/planning-geospatial-ui.test.mjs` | เพิ่มกรณี Home พร้อมแต่ข้อมูลส่วนอื่นต้องทบทวน/ไม่พร้อม |
| `tests/planning-terrain-integration.test.mjs` | ยืนยันว่าการมี Home ไม่ข้าม export gate |
| `vercel.json` | รายชื่อ hashed assets ให้ตรง build |
| `docs/XEDO_WORK_LOG.md` | ประวัติ ผลตรวจ และสถานะงานรอบนี้ |
| `docs/WEBSITE_DETAILS.md` | พฤติกรรมใหม่และรายละเอียดการบำรุงรักษา |
| `docs/implementation-queue.json` | scope/issue/หลักฐานของงานแก้ Home |
| รายงานฉบับนี้ | ผลตรวจและการส่งมอบตามคำขอ |

## 6. การใช้งานหลังนำรุ่นแก้ไขไปใช้

เลือกพื้นที่ → ระบุพิกัด Home หรือเลือกจุดบนแผนที่ → ใช้ Surface reference เป็น **Automatic GEE model** → รอข้อมูล GEE ของจุดนั้น ช่อง Home altitude จะรับค่าที่ GEE ส่งมาเอง หากมีค่า manual อยู่ ระบบเก็บค่านั้นไว้ ใช้ปุ่ม Replace เมื่อต้องการเปลี่ยนกลับมาใช้ค่าจาก GEE

หากยังไม่ได้เลือก Home, GEE ไม่มีข้อมูลจุดนั้น, height reference ไม่ถูกต้อง หรือคำขอล้มเหลว ช่องอาจยังว่างได้อย่างถูกต้อง ระบบไม่สร้างค่า 0 ทดแทนข้อมูลที่ไม่มี

## 7. ขอบเขตและสถานะเผยแพร่

**รุ่นแก้ไขนี้ยังอยู่ในเครื่อง ยังไม่ได้ commit/push/deploy** เว็บ production จึงยังไม่ได้รับ source รอบนี้ การตรวจ browser ทำที่ `http://127.0.0.1:5186/` ด้วย build ที่แก้แล้ว และ GEE จริง ใช้ภารกิจชั่วคราวใน browser ไม่สร้างงาน AI หรือบันทึก mission ใหม่ในบัญชี

ข้อมูลความสูงยังเป็นแบบจำลอง DSM ความละเอียด 30 เมตรและใช้ EGM2008 ซึ่งรวมอิทธิพลสิ่งปลูกสร้าง/พืชพรรณตามคำอธิบายของ [Google Earth Engine Data Catalog](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_DEM_GLO30_2024_1) จึงต้องตรวจระดับจุดขึ้นบินและการอ้างอิงความสูงจริงก่อนใช้ภาคสนาม ผลนี้ไม่ใช่การทดสอบ QGroundControl native import, SITL หรือการบินจริง

ไม่มีการเปลี่ยนบัญชี สิทธิ์ schema หรือแผนบริการ และไม่เปิด Billing/subscription รอบนี้

## 8. ตำแหน่งหลักฐาน

- [โฟลเดอร์หลักฐาน browser/API](/C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/playwright/home-altitude-2026-10-31)
- [ผล GEE API จริง](/C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/playwright/home-altitude-2026-10-31/live-api.json)
- [ผล browser บน build สุดท้าย](/C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/playwright/home-altitude-2026-10-31/final-browser.json)
- [Full-suite log สุดท้าย](/C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/home-altitude-full-tests.log)
- [Regression ด้วยเงื่อนไขเดิม](/C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/home-altitude-before-regression.log)
- [Validation manifest และ SHA-256](/C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/playwright/home-altitude-2026-10-31/validation.json)

หลักฐานใน `output/` เป็นไฟล์ QA ในเครื่องและถูก ignore ตาม workflow เดิม รายงานนี้กับ canonical docs เป็นไฟล์สำหรับส่งต่อ ไม่ใส่ credential หรือ environment contents ลงรายงาน


## 9. การทวนและเผยแพร่ตามคำสั่งล่าสุด — 31 ตุลาคม 2026

Mainchatทดสอบใหม่639ผ่าน/0fail/cancel/skip syntaxและ3buildsผ่าน GuestChromeที่127.0.0.1:5187 ได้7browsercasesตรงความคาดหวัง; liveGEEprocessใหม่2compute/2434ms/Home10.788701057434082/assessmentreview ภาพ local-home-surface.pngตรงJSONก่อนและหลังในแท็บ889234777: Homeมีค่าจริง,reviewedfalse,needsreview,Downloaddisabled ภาพแรกทันทีหลังscrollยังเห็นก่อนหน้า จึงใช้captureใหม่หลังrenderโดยไม่แก้DOM ไม่มีหลักฐานพอให้สรุปว่านี่คือสาเหตุเดียวของภาพafter.jpgเก่า

Sourcepatchไม่ต้องแก้เพิ่มหลังreplay ผลmasked/stale/referenceผิดเป็นfixture ไม่ใช่providerfaultจริง เตรียมเผยแพร่ตามauthorizationใหม่และจะเติมCI/deployment/liveproofจริงต่อท้าย ตรวจเฉพาะHome/GEEและrelease regressions ไม่อ้างทดสอบบินจริงหรือprivateCPUflowใหม่ NoBilling/subscription หลักฐาน: C:/mega/codex/iENA/outputs/XEDO_Home_Altitude_Release_2026-10-31/
