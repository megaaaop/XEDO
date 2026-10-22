import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
  id: text('id').primaryKey(), kind: text('kind').notNull(), data: text('data').notNull(),
  revision: integer('revision').notNull().default(1), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull()
}, t => [index('idx_records_kind').on(t.kind)]);
export const scenes = sqliteTable('scenes', {
  id: text('id').primaryKey(), provider: text('provider').notNull(), acquiredAt: text('acquired_at').notNull(),
  metadata: text('metadata').notNull(), fetchedAt: text('fetched_at').notNull()
});
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(), sceneId: text('scene_id').notNull(), state: text('state').notNull(),
  attempts: integer('attempts').notNull().default(0), data: text('data').notNull(), updatedAt: text('updated_at').notNull()
});
export const telemetry = sqliteTable('telemetry', {
  id: text('id').primaryKey(), deviceId: text('device_id').notNull(), mode:text('mode').notNull(), bootId:text('boot_id').notNull(),
  sequence:integer('sequence').notNull(), observedAt:text('observed_at').notNull(),receivedAt:text('received_at').notNull(),payload:text('payload').notNull()
},t=>[uniqueIndex('idx_telemetry_sequence').on(t.deviceId,t.mode,t.bootId,t.sequence),index('idx_telemetry_device_mode_time').on(t.deviceId,t.mode,t.receivedAt)]);
