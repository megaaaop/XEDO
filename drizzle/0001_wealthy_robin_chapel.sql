CREATE TABLE `telemetry` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`mode` text NOT NULL,
	`boot_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`observed_at` text NOT NULL,
	`received_at` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_telemetry_sequence` ON `telemetry` (`device_id`,`mode`,`boot_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_telemetry_device_mode_time` ON `telemetry` (`device_id`,`mode`,`received_at`);