# XEDO — แผนปิดงาน 1: ข้อความ, UI, loading และ scroll

## 1. หัวข้อ

- วันที่: 28 ตุลาคม 2026, Asia/Bangkok
- งานล่าสุด **1 / ก่อนหน้า 2 / เลขเดิมเริ่มต้น 4**
- เว็บไซต์ที่ตรวจ: https://xedo-eight.vercel.app/
- Checkout: `C:/mega/codex/iENA/github-publish/XEDO-hardware-release`
- เป้าหมาย: ผู้ใช้เห็นทันทีว่าคำสั่งรับแล้ว กำลังทำอะไร สำเร็จหรือขัดข้องอย่างไร และเลื่อนหน้าใช้งานต่อเนื่องได้
- สถานะ: **localimplementation+supportedbrowserchecksพร้อม;531tests/3buildsผ่าน;ยังไม่publish** ดู §3.12 สำหรับผลจริงและqualificationที่ยังไม่ได้วัด ไม่ถือว่าเป้าหมายทุกข้อใน3.8ผ่านทั้งหมด
- แชทหลักเป็นผู้แก้เว็บไซต์และรวมงานเพียงแชทเดียว อีกแชทช่วยตรวจ source/ข้อความ/ออกแบบทดสอบและหลักฐานในโฟลเดอร์ support
- หลักฐานภาพรอบนี้: `C:/mega/codex/iENA/outputs/XEDO_UX_Plan_2026-10-28/`

## 2. สรุป

### 2.1 สิ่งที่พบจริงและสิ่งที่ยังต้องพิสูจน์

| ประเด็น | หลักฐานปัจจุบัน | ความแน่นอน |
| --- | --- | --- |
| Sign in ดูเหมือนเงียบระหว่างรอ | Production guest submit ด้วยบัญชีสังเคราะห์ที่ไม่มีอยู่: `aria-busy=true`, ปุ่ม disabled แต่ชื่อยัง Sign in และ status ว่าง ภาพ03 | **พบจริงทั้ง browser/source** ไม่ใช้บัญชีหรือรหัสผ่านของผู้ใช้ |
| ติ๊ก readiness แล้วหน้าต่างหาย | Airspace checkbox เปลี่ยนเป็น checked และ Ready แต่ dialog ปิดทันที เปิดกลับจึงเห็นผล ภาพ06 | **พบจริงทั้ง browser/source** คืน unchecked หลังตรวจแล้ว |
| ข้อความ Prototype ยังเหลือหลายจุด | Header, status badge, equipment name ใน main/settings/source | **พบจริง** ยังไม่ได้ทำ general cleanup |
| 3D ดัก wheel และวาดทุก input event | deployment-3d.js ยกเลิก wheel default เมื่อมี model และ draw จาก wheel/pointermove โดยตรง | **ยืนยัน source behavior** ยังไม่ได้ browser replay3Dในรอบนี้ |
| Form อาจ invalidate ซ้ำ | Settings ฟัง input+change ผ่าน changed เดียวกัน; invalidate ทำหลายส่วนก่อน debounce250ms | **ยืนยันเส้นทาง source** ต้องนับ event/call จริงเพื่อวัดผล |
| readiness ทุกวินาทีอาจทำงานมาก | Timerเรียกreadinessซึ่งอ่านmission/terrainหลายครั้ง; มีDOMdiff/cacheเดิมอยู่แล้ว | **ผู้ต้องสงสัยจาก source** ยังไม่พิสูจน์ว่าเป็นต้นเหตุ freeze |
| scrollbar ค้างหลังใช้นาน/หน่วยความจำรั่ว | ผู้ใช้รายงาน; mobile modalแบบสั้นเลื่อน0→1688ได้/page0 | **ยังไม่ reproduce การค้างระยะยาว** ยังไม่มี trace/heap/resource counts |

แยกปัญหาสองแบบในการวัด: (ก) wheel/touch ถูก map หรือ modal รับไป ทำให้หน้าไม่เลื่อน (ข) main thread/render/network/resource มีงานค้างจริง ห้ามสรุปว่าอินเทอร์เน็ตหรือ memory leak เป็นสาเหตุจากอาการอย่างเดียว

### 2.2 ลำดับงานภายในขั้น1

| รอบย่อย | งานหลัก | สิ่งส่งมอบ/จุดตรวจ |
| --- | --- | --- |
| **1A** | เก็บ baseline และ inventory | ยืนยันการทำซ้ำของการค้าง แยก scroll owner/CPU/resource พร้อม action/message inventory |
| **1B** | Feedback สำหรับทุกงานที่ต้องรอ | Spinner/ข้อความเฉพาะงานก่อน awaitแรก, checkboxไม่ปิดdialog, ป้องกันกดซ้ำ |
| **1C** | ซ่อม scroll/render/lifecycle ตามหลักฐาน | wheel/touch ownership, RAFรวมเฟรม, semantic eventหนึ่งครั้ง, cache/cleanupที่ตรวจได้ |
| **1D** | เก็บข้อความและ UI ทั้ง flow | ลบป้ายPrototype/noteซ้ำ ปรับคำเรียก/ตำแหน่งstatus/empty/error/disabled reason |
| **1E** | ตรวจรับรวมและสรุปข้อจำกัด | regression, desktop/mobile, slow/error/cancel, repeated-use trace และ2Markdown/queueตรงผลจริง |

รอบย่อยเหล่านี้เป็นส่วนของงาน1 ไม่เพิ่มเลขงานหลัก และไม่ทำงานAIข้อ3หรือรื้อnormal-profile/ระบบเวลาใหม่ที่ผู้ใช้ตัดออก

## 3. รายละเอียด

### 3.1 ขอบเขตและสิ่งที่คงไว้

- คง flowเลือกพื้นที่ → ตรวจภาพ → เตรียมแผน และตัวคำนวณ Drift / กล้อง-การบิน-แบตเตอรี่ / Export / น้ำมัน-แคปซูล
- คงขนาดพื้นที่ preview3D,ขอบเขตพื้นภาพเดิม,Diagram/Satellite และหลักฐานวันเวลาภาพ
- คง24hgate/เวลาจริง/Surface reasons/Unknown/source freshness/owner-session-revision guards
- คงภาษาอังกฤษของUIปัจจุบัน โดยอธิบายแผนเป็นภาษาไทย ไม่เพิ่มงานแปลทั้งเว็บ
- เปลี่ยนข้อความแสดงผล ไม่เปลี่ยนtechnicalprofileID/schema/contracts/compatibilityfilenamesด้วยglobalreplace
- ไม่เปิดสิทธิ์บัญชีใหม่ ไม่แก้DB/Authsettings ไม่ใช้passwordจริงสำหรับplanningaudit
- ไม่เพิ่มglobaloverlayที่ขวางทั้งเว็บเมื่อมีเพียงงานย่อย และไม่เพิ่มtimerหนึ่งตัวต่อspinner

### 3.2 1A: baseline ก่อนลงมือ

1. Freeze source SHA,device/browser,viewport,fixture,network modeและจังหวะที่รายงานค้าง เปรียบเทียบก่อน/หลังด้วยเงื่อนไขเดียวกัน
2. แยก wheel,trackpad,ลาก scrollbar thumb,PageDown,มือถือtouch;ลองทั้ง main page/settings/readiness/account,2D/3D Diagram/Satellite
3. วัดช่วง idle,กำลังGEEโหลด,กำลังcalculate,หลังเปลี่ยนภาพ/พื้นที่หลายรอบ และหลังเปิดปิดdialog
4. เก็บmain-thread long tasks/frame gaps/network/call countsของinvalidate/calculate/render/readiness/3Ddraw พร้อมจำนวนlayers/listeners/timers/controllers/textures
5. ใช้DevTools traceหรือinstrumentationชั่วคราวในlocal QAเท่านั้น ไม่injectdebugหรือส่งtelemetryที่มีข้อมูลบัญชีลงproduction
6. แยกเวลารอnetworkจากเวลาที่กดแล้วเฟรมแรกยังไม่แสดงfeedback และแยกqueue-waitจากrequest-in-flight
7. ถ้ายังreproduceอาการเดิมไม่ได้ให้ระบุขอบเขตที่ตรวจได้ ไม่ใช้“เลื่อนครั้งเดียวผ่าน”เป็นหลักฐานปิดfreeze

Current bounded observation: 390px settings dialog345px/clientHeight741/scrollHeight2456; wheel2pagesทำscrollTop0→1688/page0 ไม่มีแนวนอนล้นในการสังเกตนี้ ไม่ใช่performance benchmark

### 3.3 1B: มาตรฐานสถานะการทำงาน

วงจรที่แสดงต่อผู้ใช้: `idle → queued/running → success | error | cancelled` พร้อมactionID,operationIDและcontextrevisionภายใน ไม่แสดงtechnicalIDsบนUI

- เริ่มข้อความpendingก่อน awaitแรก รวมเวลาในserializedrequestqueue และให้browserpaintก่อนงานCPUหนักที่จำเป็น
- ปุ่มที่เริ่มงานมีspinnerขนาดเล็กและชื่อเฉพาะงาน พร้อมข้อความสั้นใกล้ผล ไม่ทำให้layoutกระโดด
- ปิดเฉพาะcontrolที่ส่งคำสั่งชนกัน แต่close/cancel/navigationยังใช้ได้ตามความหมายจริง
- ใช้ `role=status`/live region ที่ประกาศเริ่ม/จบอย่างพอดี, `aria-busy`ที่panel และlabelของprogressที่ถูกต้อง; spinnerอย่างเดียวไม่พอ
- ถ้ายังไม่ทราบจำนวนงานใช้indeterminate ไม่สร้างเปอร์เซ็นต์วิ่งตามเวลา GEEใช้completed request stagesและ3Dใช้loaded tile countsเดิม
- ใช้CSS animationที่เบา เคารพprefers-reduced-motion และหยุดเมื่อhidden/unmounted ไม่สร้างbackgroundrenderloopเพื่อหมุนspinner
- งานสำเร็จเร็วให้ข้อความผลปรากฏทันที ไม่หน่วงงานให้spinnerแสดงครบเวลาสมมติ
- เมื่อรอนานให้บอกว่ายังรอข้อมูลและทางเลือกที่มีจริง ใช้timeout/cancel/retryเดิม ห้ามแสดง“ค้าง”จากการเดาเวลารอ
- `finally`ของoperationเก่าห้ามปิดspinnerหรือเขียนstatusทับoperationใหม่; successเก่าห้ามคืนReadyให้contextใหม่
- จบด้วยผลที่อ่านได้ เช่น Saved as version3 หรือ Request cancelled ไม่เงียบหายไปเฉยๆ

| Action | ข้อความระหว่างทำที่เสนอ | ผล/ทางออก |
| --- | --- | --- |
| Sign in | Signing in… → Loading your missions… | Signed in หรือerrorที่แยกcredentials/สิทธิ์/session/networkโดยไม่เปิดเผยข้อมูลผู้อื่น |
| เปิดaccount/refresh | Checking account… / Loading missions… | รายการภารกิจหรือNo saved missions yet |
| Save/copy | Saving mission… / Saving a new copy… | Saved as versionN;รักษาdraftและpending mutationเมื่อerror |
| Open/history | Opening mission… / Loading history… | เวอร์ชันที่เปิดพร้อมnextaction;ไม่ล้างงานเดิมก่อนvalidationสำเร็จ |
| Sign out | Signing out… | ล้างlocalprivateUIทันทีและแยกserverrevocationสำเร็จ/ยังยืนยันไม่ได้ |
| Prepare mission | Preparing mission… | Mission prepared หรือretryที่ตรงงาน ไม่เรียกว่าLoading satellite image |
| Calculate | Updating calculations… / Calculating route… | Calculations updated หรือtimeoutพร้อมRetry |
| Download | Checking account… → Checking current conditions… → Preparing mission file… | File ready / Download started;ไม่รับรองว่าOSบันทึกไฟล์สำเร็จ |
| ค้น/โหลดภาพ | Searching acquisitions… / Loading selected image… | คงstage/cancel/retryและเงื่อนไขvisiblepixelsเดิม |
| GEE/conditions | Loading planning data… / Checking conditions… | partial/errorพร้อมreason/nextactionไม่ซ่อนในcollapsedsectionอย่างเดียว |
| Import/snapshot | Loading boundary… / Reading snapshot… | Imported หรือvalidationerrorโดยเก็บภารกิจเดิม |
| เปิด3Dครั้งแรก | Preparing 3D view… | พื้นและเส้นทางพร้อม หรือerror/retryโดยรักษากรอบpreview |

คำขอSaveที่ลองใหม่ใช้immutablebody/mutationIDเดิม คงrequestserialization,epoch/edit/user/missioncompareและconflict handling ไม่รื้อคิวเพื่อทำspinner ขณะDownloadต้องdeduplicateตั้งแต่ก่อนensureSession/ensureFresh แต่คงchecksก่อน/หลังawaitและก่อนdownload

### 3.4 Checkbox และการเปลี่ยนค่าฟอร์ม

1. Checkboxรับchecked/uncheckedทันทีและคงdialogที่ผู้ใช้กำลังอ่าน โดยเฉพาะRoute&airspace
2. Checkboxที่เปลี่ยนเพียงreviewlocalไม่แสดงfake loader;เปลี่ยนlabel/statusสั้นว่าได้รับการยืนยันแล้ว
3. หากมีfollow-oncalculation/networkจริงให้แสดงUpdating checks…ที่panelที่ได้รับผล และwithdrawdownloadทันทีจนผลปัจจุบันใช้ได้
4. แยกtext/number `input` แบบdebounce ออกจากcheckbox/select `change` ครั้งเดียว ไม่ส่งทั้งinput+changeเข้าการinvalidateหนักเดียวกัน
5. ทำdependency mapก่อนลดขอบเขตinvalidate เช่นreviewflagไม่ควรสร้างrouteซ้ำโดยไม่มีเหตุผล แต่ต้องพิสูจน์ว่าderivedresultsที่นำกลับใช้ยังถูกต้อง
6. ถอนreadinessที่ไม่ถูกต้องทันที การdebounceเป็นของcalculation/renderไม่ใช่การเก็บReadyเก่าไว้อีก250ms
7. ไม่scrollIntoView/fitmap/เปลี่ยนfocusทุกครั้งที่ติ๊ก;ใช้เฉพาะactionที่ผู้ใช้ขอไปดูจุดนั้น

### 3.5 1C: scroll และประสิทธิภาพ

**ก. กำหนดผู้รับwheel/touch**

- ขณะดูpreviewทั่วไป wheelเลื่อนหน้า;กด/focusหรือเปิดinteractionของmapก่อนจึงใช้wheelzoom ให้ทางออกด้วยEsc/blurหรือcontrolที่ชัดเจน
- ทำ2Dและ3Dให้สอดคล้องกัน คงdrag/pinch/keyboardเมื่อโต้ตอบจริง
- ลดtouch trapจากtouch-action:noneที่เปิดค้าง โดยแยกviewmodeกับinteractionmode ตรวจpointercapture/cancel/blur cleanup
- Modalมีscrollownerที่ชัดเจน หัวข้อ/ปิดยังเข้าถึงได้ ตรวจwheelที่ขอบmodalและคืนpage scrollหลังclose/Escape ไม่วางglobalpreventDefaultหรือoverflow:hiddenค้าง
- ประเด็นwheelไม่เท่ากับลากscrollbarthumbค้าง ต้องแยกทดสอบทั้งสอง

**ข. รวมการวาดและลดงานซ้ำ**

- 3Dpointer/wheelอัปเดตcameraแล้วmarkdirty ให้RAFวาดอย่างมากหนึ่งครั้งต่อframe;รวมresize/setData/mode updatesในframeเดียว
- ไม่วาด3Dตอนซ่อน/idle;ใช้texture/meshที่เตรียมแล้ว ไม่เตรียม512trianglesและdrawImageซ้ำตามทุกinputeventโดยไม่มีframebudget
- ไม่โหลดtileใหม่จากการorbit/scrollถ้าfloorimageryboundsเดิมไม่เปลี่ยน ไม่ลดcoverage/ภาพจริงหรือขนาดpreviewเพื่อให้ดูเร็ว
- หนึ่งsemanticinputchangeทำinvalidationครั้งเดียว และrenderเฉพาะค่าเปลี่ยน คงDOMdiff/mapfeaturecacheที่มีอยู่
- อ่านmission/report/readiness snapshotหนึ่งชุดต่อรอบ ลดclone/stringify/terrain assessmentซ้ำ ใช้revision+tolerance+reportidentityเป็นcachekey พร้อมexpiryที่ถูกต้อง
- Timer1วินาทีทำเฉพาะสถานะเวลาที่เปลี่ยน/ถึงexpiry ไม่ทำfullassessmentใหม่ถ้าdependencyเดิม;ห้ามลบexpirycheckingเพื่อให้เร็ว
- การnotifyที่เกิดระหว่างอ่านstateรวมเป็นrenderรอบถัดไป ป้องกันreentrantcascadeตามtraceจริง

**ค. ตรวจอายุresource**

- map/source/listener/timer/RAF/ResizeObserver/AbortController/objectURL/textureมีownerและdisposeที่จับคู่กัน
- เมื่อเปลี่ยนภาพ/พื้นที่หรือตอนpagehideให้ยกเลิกงานเก่าที่ควรยกเลิก ตรวจbfcache persisted/pageshowไม่ทำsingletonตายแล้วกลับมาไม่ทำงาน
- Cacheมีงบประมาณและeviction;วัดหลังwarm-upและหลังGCในlabเพื่อแยกboundedcacheจากleak ห้ามอ้างleakเพียงเพราะheapสูงขึ้นครั้งแรก
- ไม่เพิ่มworker/เปลี่ยนarchitectureครั้งใหญ่จนtraceชี้ว่ามีCPUtaskที่แบ่ง/ย้ายได้และมีประโยชน์จริง

### 3.6 1D: ข้อความและตำแหน่งUI

| ข้อความ/ส่วน | วิธีเก็บงาน |
| --- | --- |
| Prototype mode / Prototype trial / Trial notice | เอาป้ายและnoteที่ซ้ำตามคำสั่งออก ไม่เพิ่มป้ายPrototypeจุดใหม่ |
| XEDO Prototype01 / Fixed trial settings | เสนอชื่อแสดง XEDO inspection profile / Fixed inspection settings;คงค่าและIDภายใน |
| Trial file ready / standalone prototype / footerAbout | ปรับเป็นMission file ready / planner/helpที่ตรงหน้าที่ |
| Estimated demo | คงความสามารถและบอกว่าใช้ข้อมูล/สมมติฐานใดจริง ไม่ทำให้แยกข้อมูลสมมติจากข้อมูลจริงไม่ได้ |
| ปุ่มdisabled | ใกล้ปุ่มมีเหตุผลและnextaction เช่นChoose launch point / Review a satellite image ไม่ใช่สีเทาเงียบ |
| Unknown/partial/stale/blocked | คงความหมายตามข้อมูลจริง บอกสิ่งที่ขาดและปุ่มไปแก้ ไม่แปลงUnknownเป็นReadyจากการย่อข้อความ |
| แหล่งข้อมูล/วันเวลา/model assumptions | สรุปใกล้ผล รายละเอียดยาวอยู่Help/Sourcesโดยไม่ซ่อนเหตุผลที่ขวางการทำงาน |
| Success/error | ใช้คำตรงงานและแนวแก้;errorไม่ถูกtoastชั่วครู่จนอ่านไม่ทัน;ไม่ใช้alertdialogทุกการติ๊ก |
| Dialog/layout | โครงสร้างหัวข้อ→สถานะ→control→result consistent,ลดช่องว่างซ้ำ,focusและscrollpositionไม่กระโดด |

ทำcopy inventoryทีละstringพร้อมตำแหน่ง/เหตุผล/ข้อความใหม่/สถานะreview ไม่ใช้replaceคำprototype/trialทั่วrepoเพราะอาจทำIDหรือcontractเสีย

### 3.7 แผนสองแชทและจุดส่งมอบ

| ช่วงหลังเริ่มimplementation (ประมาณการ) | แชทหลัก | แชทสนับสนุน |
| --- | --- | --- |
| 0–20นาที | เก็บbaseline/reproและfreezeoperation contract | ส่งcriticalfindings/copyinventory/testcasesชุดแรก |
| 20–75นาที | Inspector/downloadfeedbackและcheckboxdialog | ตรวจstates/retry/cancel/slowqueueและsourceevent/lifecyclemap |
| 75–135นาที | wheel/touch/RAF/eventcoalescingและtraceเทียบ | ส่งfinalcopy/testmatrix/measurementrecipe;reviewdiffreadonlyเมื่อmainส่งให้ |
| 135–165นาที | copy/UIlayoutและresponsiveร่วมกับfeedback | ตรวจตกหล่น/ข้อขัดแย้งและหลักฐาน ไม่แก้เว็บ |
| 165–210นาที | acceptance/regression/trace/repeated-use/docs | auditผลที่ส่งมาว่าพิสูจน์เกณฑ์ครบหรือยัง |

ประมาณการรวม2.5–4ชั่วโมงหลังเริ่มลงมือ ขึ้นกับการreproducefreezeและผลtrace ไม่ใช่เริ่มนับกรอบ4ชั่วโมงเดิมใหม่หรือรับรองว่าจะผ่านทุกเกณฑ์ในเวลานี้

- Mainแก้source/tests/integrationและcanonicaloverview/queueเพียงผู้เดียว
- Supportเขียนเฉพาะ `C:/mega/codex/iENA/outputs/XEDO_UX_Parallel_2026-10-28/support/` ไม่แก้source/config/package/DB/Auth/Git/deployหรือเปิดบัญชีจริง
- ถ้าAGENTSกำหนดcanonicalworklogทุกturn ให้supportอ่านล่าสุดแล้วappendhandoffreferenceสั้นในสองMarkdownเท่านั้น ห้ามทับoverview/queue/mainentries
- Deliverables: ACTION_FEEDBACK_MATRIX.md, COPY_INVENTORY.md, SCROLL_DIAGNOSIS.md, TEST_MATRIX.md, HANDOFF.md พร้อมfile:line/sourceSHA,confirmed-vs-hypothesisและdesigned_not_run-vs-executed
- Promptพร้อมใช้: `C:/mega/codex/iENA/outputs/XEDO_UX_Plan_2026-10-28/PARALLEL_CHAT_PROMPT.md`
- ไม่ส่งคำสั่งไปuser-ownedchatอัตโนมัติในรอบวางแผนนี้ ผู้ใช้ส่งpromptให้chatสนับสนุนเอง

### 3.8 1E: เกณฑ์ปิดงานที่ตรวจได้

| กลุ่ม | เกณฑ์รับ |
| --- | --- |
| Feedback | ทุกasyncactionในinventoryแสดงpendingก่อนawaitแรก;เป้าหมายfeedbackpaint≤100msบนreferenceเครื่องในnormalcondition ไม่มีspinnerค้างหลังsuccess/error/timeout/cancel/supersede |
| Race/dedup | กดซ้ำ10ครั้งมีactiveoperation/ผลส่งออกตามpolicyหนึ่งชุด;stalecompletionไม่ทับงานใหม่;pendingSave retryคงmutationIDเดิม |
| Checkbox | checkedทันที/dialogไม่ปิดเอง/semanticchangeครั้งเดียว;recalculateเฉพาะdependencyและdownloadwithdrawทันทีเมื่อจำเป็น |
| Slow/offline | ทดสอบnormal/slow/offline/HTTPerror/timeouts/cancel/retry ได้ข้อความและทางไปต่อ รักษาdraft ไม่มีautomaticwritereplayที่สร้างข้อมูลซ้ำ |
| Scroll ownership | mainpage/modal/2D/3D/mousewheel/trackpad/scrollbarthumb/PageDown/touchใช้งานได้;ออกจากinteractionหรือปิดdialogแล้วpageเลื่อนต่อได้ |
| Render | 3Ddraw≤1ต่อRAF ไม่มีdrawloopตอนhidden/idle;orbit/scrollไม่สร้างimageryrequestถ้าบริบทเดิม |
| Latency | เป้าหมายlocalp95visiblefeedback≤200msและไม่มีreproducibleapp-inducedmain-threadblock>200msในชุดscrollที่กำหนด วัดจริงเทียบbaseline ไม่อ้างfieldINPจากlabสั้นๆหรือรับรอง60fpsทุกเครื่อง |
| Repeated use | วงจร10–15นาที:เปิดปิดdialogs30รอบ,2D↔3D20รอบ,เปลี่ยนพื้นที่/ภาพ10รอบ+idle วัดresourcesไม่โตค้างตามจำนวนรอบหลังเผื่อcache;ต้องอธิบายregression/limitที่ยังอยู่ |
| UI/accessibility | 390/768/1280px ไม่มีhorizontaloverflowบนflowที่แก้;keyboardfocus/Tab/Escape/reducedmotion/statusannouncementตรวจจริง ไม่อ้างWCAGcomplianceเต็มจากภาพ |
| Regression | คง3steps/4calculators/normal+demo/2D3D/visible-pixelgate/24hgate/Surface reasons/account-session-owner-revisionguards/Save/open/draftretention |
| Release evidence | targetedbehavior testsที่จำเป็น+fullsuite+syntax+3buildsเมื่อsourceเปลี่ยน;actualbrowsernegative/positiveflowพร้อมscreenshots/trace และอัปเดตสองMarkdown/queueตามผลจริง |

การตรวจsuccessfulaccountflowsใช้ผู้ใช้กรอกpasswordเองหรือsession/fixtureทดสอบที่ได้รับอนุญาต ไม่บันทึกpassword/token/sessionในhandoff;รอบนี้ไม่ได้ทำsuccessfulpasswordlogin

ปิดงาน1เมื่อเกณฑ์ที่เกี่ยวข้องผ่านและข้อจำกัดที่เหลือระบุชัด ห้ามทำเครื่องหมาย“scrollfixed”จากspinnerหรือการลดข้อความอย่างเดียว การเผยแพร่ทำตามคำอนุญาตของรอบimplementationนั้น ไม่ตีความคำถามวางแผนนี้เป็นpush/deploy

### 3.9 ไฟล์เป้าหมายสำหรับ implementation

- หลัก: src/inspector-client.js,inspector.css,planning-trial-client.js,planning-trial.css,planning-readiness.js/css,deployment-3d.js
- Feedbackadapterเล็กอาจแยกเป็นmodule/CSSตามpatternเดิม แต่existingcontrollersเป็นsourceoftruthของnetwork/calculation/readiness
- สำรองตามtrace: planning-geospatial-ui.js,planning-environment-ui.js,planning-terrain.js,planning-basemap.js,planning-3d-ground-controller.js,deployment-ground.js,planning-map-overlay.js
- Copy: public/planning.html,planning-help-content.js,planning-runtime.js,planning-hardware-profile.js และvisiblecopyในclient;คงmachineIDs/values
- เพิ่ม/แก้testเฉพาะbehavior/race/scrollownership/lifecycleที่เปลี่ยน ไม่สร้างtestที่เพียงเทียบimplementationกับตัวเอง

### 3.10 แหล่งอ้างอิงและขอบเขตผลรอบนี้

- [สถานะที่ผู้ใช้และassistive technologyรับรู้ได้ — W3C](https://www.w3.org/WAI/WCAG21/Understanding/status-messages)
- [wheel/cancellation/passive behavior — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event)
- [INPและการแยกfieldmeasurement — web.dev](https://web.dev/articles/optimize-inp)
- รอบนี้ทำplanning/sourceinspection/boundedproductionUIobservationหนึ่งsyntheticinvalidlogin/checkboxdialog/mobilemodalscroll และอ่านdocs ไม่แก้application ไม่รันstandardtests/build/long-soak/performanceprofile/newinference/DBmutation/push/deploy
- ค่าตัวเลขใน3.8เป็น**เกณฑ์ที่เสนอ ยังไม่รันตรวจรับหลังแก้** ผล510testsของreleaseก่อนหน้าไม่ใช่ผลของรอบแผนนี้

<!-- ux-feedback-implementation-2026-10-28 -->
### 3.11 Implementation checkpoint — 28 ตุลาคม 2026

- Userอนุมัติเริ่มimplementationและส่งfullpromptไป02-chat ขนาน project หลักแล้ว Supportส่ง34action/136copy/8diagnosis/64designed_not_run cases;rootแก้source/testsเพียงผู้เดียว
- 1Aได้frozenbaseline+controlledrenderercomparison ยังไม่reproduceผู้ใช้freezeยาว;1Bfeedback/dedup/stale/cancel/checkboxcandidateพร้อมtests;1Cfocus/RAF/hidden/bfcachecandidateพร้อมtests;1Dvisiblecopycandidateแล้ว;1E524tests/3buildsผ่านแต่finalbrowserresponsive/fullflow/longsoakยังไม่ครบ
- ผล: 100focusedwheelevents×5,ก่อน100draws/193.3–303.9msevent;หลัง1draw/0.6–1.3msevent/paint7.8–17.4ms มีstartup81mslongtask ไม่ใช่fieldINP/60fps/leakproof สังเคราะห์texture512px/canvas850×440CSSpx ไม่ใช่realimageryacceptance
- Inspectorlocal500ms/stageเห็นSigning in…แล้วSigned in.Loadingyourmissions…พร้อมspinner ไม่มีpasswordผู้ใช้จริง;browserหลุดก่อนfinalaccountSave/history/mobile/soak
- **รอคำตอบ:** ผู้ใช้เปิดBrowserในแชทหลักและแจ้ง “เปิดแล้ว” เพื่อรับงาน3.8ต่อ เก็บ30dialogs/20mode/10area-image/10–15min/reponsive3907681280+nativeinputตามรายการ ห้ามทำเครื่องหมายขั้น1completeก่อนมีหลักฐาน ไม่มีpush/deployรอบนี้
- Finalsource/screenshot/metrics/testbuildlogs/frozenbefore/receipt: C:/mega/codex/iENA/github-publish/XEDO-hardware-release/output/release-check/ux-2026-10-28/RESULT.json รายละเอียดสองcanonicalMDอัปเดตแล้ว

<!-- ux-browser-resume-2026-10-28 -->
### 3.12 Browser resume checkpoint และเกณฑ์ที่ยังไม่วัด

ผู้ใช้เปิดBrowserแล้ว คำถามเดิมresolved ตรวจnormalGEE10uniquePolygon/imagecontexts,30dialogs/20modecyclesใน11.15min,390/768/1280ไม่มีhorizontaloverflow,localfixtureSave/history/open/logout/confirmationCancel-Escape,unfocusedwheel/modal/PageDown/3DpointerExit/keyboard,liveSatelliteground/Retry,18-itemdemoPlanและ52hBlocked ผ่านในชุดที่ตรวจ เก็บfinalcopy/confirmation/downloadcleanupเพิ่มแล้วตรวจ531tests/3builds+smokeบนbuildใหม่ ไม่มีpush/deploy

ข้อ3.8ที่ยังไม่วัดครบ:physicaltouch/native-trackpad/OSreducedmotion/fullappp95/fieldINP/heap-listeners และdependencyselectivecalculation (ยังใช้one-semantic-event→fullcalcเดิม) จึงให้สถานะlocalcandidateverifiedwithlimits ไม่ทำเครื่องหมายทุกqualificationcompleteหรืออ้างno-leak/60fps บันทึกสองcanonicalMD§3.32/RESULT.jsonและbrowser-acceptance-resume.jsonแล้ว ไม่มีรอคำตอบBrowserอีก
