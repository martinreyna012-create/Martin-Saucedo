CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`session_date` text NOT NULL,
	`start_time` text NOT NULL,
	`start_minute` integer NOT NULL,
	`duration` integer NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`goal` text DEFAULT '' NOT NULL,
	`plan_json` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `appointments_owner_date_idx` ON `appointments` (`owner_id`,`session_date`);--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`age` integer,
	`goal` text DEFAULT '' NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `patients_owner_idx` ON `patients` (`owner_id`);--> statement-breakpoint
CREATE TABLE `therapist_profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`specialty` text DEFAULT '' NOT NULL,
	`clinic` text DEFAULT '' NOT NULL,
	`license` text DEFAULT '' NOT NULL,
	`color` text DEFAULT 'green' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
