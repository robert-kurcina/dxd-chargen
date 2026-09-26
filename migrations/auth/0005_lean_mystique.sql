ALTER TABLE `auth_mail` ADD `lease_token` text;--> statement-breakpoint
ALTER TABLE `auth_mail` ADD `lease_until` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `auth_mail` ADD `attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `auth_mail` ADD `available_at` integer DEFAULT 0 NOT NULL;