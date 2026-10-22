// Translate original system defaults for display; stored records and user notes stay intact.
const defaultLabels = new Map([
  ['ชายฝั่งระยอง', 'Rayong coast'],
  ['สำรวจตัวอย่าง · จำลองเท่านั้น', 'Example survey · Simulation only'],
  ['ค่าตั้งต้นสำหรับทดสอบซอฟต์แวร์ ยังไม่ใช่ผลสอบเทียบโดรน', 'Default values for software testing. These are not drone calibration results.'],
  ['Pi จำลอง', 'Simulated Pi'],
  ['Raspberry Pi ของทีม', 'Team Raspberry Pi'],
]);
const defaultIds = new Set(['rayong', 'PROFILE_sim_basic', 'sim-pi-001', 'pi-001']);
export function presentDefaultRecord(record) {
  if (!defaultIds.has(record.id)) return record;
  const presented = {...record};
  for (const field of ['name', 'source']) {
    if (defaultLabels.has(presented[field])) presented[field] = defaultLabels.get(presented[field]);
  }
  return presented;
}
