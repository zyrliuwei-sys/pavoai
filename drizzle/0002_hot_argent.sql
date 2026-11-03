CREATE TABLE `ops_assignment` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text DEFAULT '' NOT NULL,
	`visitor_id` text DEFAULT '' NOT NULL,
	`variant` text DEFAULT '' NOT NULL,
	`attribution_ends_at` integer,
	`exposed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ops_assignment_lookup` ON `ops_assignment` (`experiment_id`,`visitor_id`);--> statement-breakpoint
CREATE TABLE `ops_checkout` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text DEFAULT '' NOT NULL,
	`assignment_id` text,
	`price_snapshot_id` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ops_checkout_lookup` ON `ops_checkout` (`visitor_id`);--> statement-breakpoint
CREATE TABLE `ops_control` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`hourly` integer DEFAULT false NOT NULL,
	`default_group` text DEFAULT 'monthly' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ops_event` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT '' NOT NULL,
	`build_label` text DEFAULT '' NOT NULL,
	`build_id` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ops_event_lookup` ON `ops_event` (`visitor_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ops_experiment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`hypothesis` text NOT NULL,
	`control_group` text DEFAULT '' NOT NULL,
	`variant_group` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`active_slot` text,
	`min_visitors` integer DEFAULT 400 NOT NULL,
	`winner_group` text,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`ended_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ops_experiment_active_slot_unique` ON `ops_experiment` (`active_slot`);--> statement-breakpoint
CREATE TABLE `ops_log` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text,
	`actor_id` text,
	`action` text DEFAULT '' NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ops_log_lookup` ON `ops_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `ops_price_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ops_visitor` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`source` text DEFAULT '' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`landing_path` text DEFAULT '' NOT NULL,
	`build_label` text DEFAULT '' NOT NULL,
	`build_id` text DEFAULT '' NOT NULL,
	`price_snapshot_id` text DEFAULT '' NOT NULL,
	`excluded` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ops_visitor_lookup` ON `ops_visitor` (`created_at`,`user_id`);