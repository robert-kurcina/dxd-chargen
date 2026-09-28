CREATE TABLE `site_administrators` (
	`user_id` text PRIMARY KEY NOT NULL,
	`granted_at` integer NOT NULL,
	`bootstrap_operation_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_administrators_bootstrap_operation_id_unique` ON `site_administrators` (`bootstrap_operation_id`);