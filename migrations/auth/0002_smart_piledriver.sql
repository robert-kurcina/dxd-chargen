CREATE TABLE `security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`phase` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text,
	`occurred_at` integer NOT NULL,
	`response_status` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_operation_phase` ON `security_events` (`operation_id`,`phase`);--> statement-breakpoint
CREATE TRIGGER security_events_no_update BEFORE UPDATE ON security_events BEGIN SELECT RAISE(ABORT, 'Security events are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER security_events_no_delete BEFORE DELETE ON security_events BEGIN SELECT RAISE(ABORT, 'Security event expiry is not enabled'); END;
