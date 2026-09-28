CREATE TABLE `security_review_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`source_operation_id` text NOT NULL,
	`review_operation_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`disposition` text NOT NULL,
	`reason_code` text NOT NULL,
	`occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_review_request` ON `security_review_decisions` (`review_operation_id`);--> statement-breakpoint
CREATE INDEX `security_review_source` ON `security_review_decisions` (`source_operation_id`,`occurred_at`);--> statement-breakpoint
CREATE TRIGGER security_review_decisions_no_update BEFORE UPDATE ON security_review_decisions BEGIN SELECT RAISE(ABORT, 'security review decisions are append-only'); END;--> statement-breakpoint
CREATE TRIGGER security_review_decisions_no_delete BEFORE DELETE ON security_review_decisions BEGIN SELECT RAISE(ABORT, 'security review decisions expire only under the retention policy'); END;
