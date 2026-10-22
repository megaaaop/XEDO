# XEDO Pi agent · receive-only contract 1.0

รุ่นนี้รับภาพนิ่ง ผลจากโปรแกรมที่มี และสถานะชุดปล่อย ไม่มี API สั่งบิน/GPIO/PWM/ปล่อยวัสดุ การทดสอบที่ผ่านมาเป็น Python agent ในเครื่องและ API fixture ไม่ใช่ Pi/กล้อง/driver จริง

## ติดตั้งและตั้งค่า

ใช้ Python 3.11 ขึ้นไป มีเฉพาะ standard library คัดลอก `pi-agent/agent.py` ไปเครื่อง Pi ตั้ง `XEDO_API_URL` เป็น backend HTTPS ที่ทีมอนุญาต หรือ localhost ผ่าน tunnel

- `XEDO_PI_TOKEN`: credential เฉพาะอุปกรณ์ ตั้งค่าเดียวกันที่ server และ Pi ไม่เก็บใน Git/browser/export
- `XEDO_PI_DEVICE_ID`: ฝั่ง server ค่าเริ่ม `pi-001`
- บน Site ส่วนตัวต้องใช้ platform service access เพิ่มทาง `XEDO_SITE_ACCESS_TOKEN` ตามสิทธิเดิมของเจ้าของเว็บ ส่งเป็น `OAI-Sites-Authorization` เฉพาะ Site นี้ เก็บที่ Pi; ไม่มีการสร้าง/แจก credential ใหม่ในงานนี้
- Local server รับ environment ข้างต้น แต่ UI ในเครื่องเป็น workspace สำหรับเจ้าของบน loopback จึงยังไม่ใช่ระบบสมาชิกหลายทีม
- ถ้ายังไม่ได้ตั้ง Pi token API live คืน DEVICE_NOT_CONFIGURED, frontend แสดง unknown

```bash
python agent.py --spool spool --device pi-001 heartbeat --count 10 --clock-quality unknown
python agent.py --spool spool flush
python agent.py --spool spool status
```

เลือก clock-quality synced เฉพาะเมื่อซิงก์เวลาแล้ว โปรแกรมที่มีสามารถเขียน `status.json` แล้วใช้ `heartbeat --status-json status.json`:

```json
{
  "position": null,
  "battery": null,
  "dispenser": {
    "state": "unknown",
    "driver_version": null,
    "requested_setting": null,
    "measured_rate_kg_s": null,
    "measured_remaining_kg": null,
    "measured_released_kg": null,
    "fault_code": null
  },
  "health": {"agent": "online", "fault_code": null}
}
```

position เมื่อมีใช้ object longitude/latitude/valid, altitude_m + altitude_reference AGL/MSL/ellipsoid/unknown. battery.percent คือแบตเตอรี่โดรนที่มีตัวอ่าน ไม่ใช่ไฟเลี้ยง Pi. requested_setting มี value/unit (`pwm_percent`, `rpm`, `duty_fraction`) แยกจาก kg/s หรือ kg ที่วัดจริง

## ภาพและ processing adapter

บันทึก metadata ตาม `contracts/capture.schema.json` โดย capture_id/device_id/incident_id ต้องอ้างข้อมูลที่มีจริง วันเวลา UTC มี timezone, width/height คือจำนวน pixel หรือ null

```bash
python agent.py image field-image.jpg capture-metadata.json
python agent.py result processing-result.json
```

ไฟล์ภาพที่มีอยู่ใช้ capture_mode imported. ถ้าทีมพร้อมใช้กล้องที่รองรับ rpicam เรียก `capture output.jpg capture-metadata.json` ซึ่งเรียก `rpicam-jpeg` พร้อม timeout แล้วระบุ captured_live เฉพาะภาพที่คำสั่งถ่ายได้จริง ไม่ได้ทดสอบขั้นนี้บนฮาร์ดแวร์

processing-result ใช้ run_id/capture_id/algorithm_version/parameters/duration_ms/bboxes/coordinate_space/processed_at/reason. bbox คือ [x1,y1,x2,y2] ใน pixel และต้องไม่เกินขนาดภาพ; รุ่นนี้ไม่ทำ georeference จากภาพ Pi. ถ้าไม่มี processor ใช้ status unavailable, coordinate_space none, ไม่เติมผลตรวจจับ

อ้างอิงกล้องตาม [Raspberry Pi camera software](https://www.raspberrypi.com/documentation/computers/camera_software.html) ต้องเลือก driver ให้ตรงกับกล้อง/OS. ตัวส่งใช้ [Python urllib.request](https://docs.python.org/3/library/urllib.request.html)

## Spool/retry และลำดับ packet

- SQLite WAL เก็บ payload/ภาพสำเนาและ event ID เดิมจน API ตอบสำเร็จ รวมไม่เกิน 1,000 รายการหรือ JSON 64 MiB; เต็มแล้ว reject รายการใหม่พร้อม spool_overflow โดยไม่ลบทิ้งของเดิม
- timeout/เครือข่ายขาด/429/5xx retry แบบ backoff 2–60 s; 4xx อื่นเก็บ rejected สำหรับตรวจ ไม่ retry คำขอที่ข้อมูล/สิทธิผิด
- event_id เดิม/payload เดิมได้ duplicates; payload เปลี่ยนหรือ boot+sequence ซ้ำต่าง ID ได้ conflict
- packet เก่าใน boot เดิมไม่ย้อน latest; packet จาก boot ที่เคยปิดไปไม่ย้อนสถานะหลัง reboot; clock unknown ข้าม boot ยังต้องให้ทีมตรวจการซิงก์
- ใช้ boot_id Linux เมื่อมี sequence เก็บถาวร; ถ้าไม่มี `/proc` ใช้ persistent fallback boot ID สำหรับทดสอบในเครื่อง
- หน้า live poll 2 s, รับเก่ากว่า 5 s stale, 15 s disconnected เป็นเกณฑ์ทดสอบ; heartbeat ไม่ยืนยันเที่ยวบิน
- เก็บ raw events แยกจาก latest state. Replay/Simulator ไม่เขียน live state

## ตรวจรับกับทีมเมื่อ Pi พร้อม

บันทึก Pi รุ่น/OS/กล้อง/processing/dispenser driver ใน Monitor → inventory. ทดสอบภาพหนึ่งภาพ เวลาจริง หน่วย bbox และค่าที่ไม่มีต้องเป็น null; ปิดเครือข่าย/เปิดกลับ/reboot แล้วตรวจ event ไม่ซ้ำและ latest ไม่ย้อน. ทดสอบ driver ชุดปล่อยบนโต๊ะตามข้อกำหนดเพื่อนก่อนเพิ่มการควบคุมจริง

`python -m unittest discover -s pi-agent -p test_agent.py` ตรวจ durable spool/retry/idempotency/overflow ด้วย fixture ในเครื่องเท่านั้น
