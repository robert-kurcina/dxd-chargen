CREATE TABLE `security_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text,
	`actor_id` text,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`change` text NOT NULL,
	`occurred_at` integer NOT NULL
);

--> statement-breakpoint
CREATE TRIGGER security_user_insert AFTER INSERT ON `user` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'user', NEW.id, 'insert', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_user_update AFTER UPDATE ON `user` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'user', NEW.id, 'update', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_user_delete AFTER DELETE ON `user` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'user', OLD.id, 'delete', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_account_insert AFTER INSERT ON `account` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'account', NEW.id, 'insert', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_account_update AFTER UPDATE ON `account` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'account', NEW.id, 'update', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_account_delete AFTER DELETE ON `account` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'account', OLD.id, 'delete', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_session_insert AFTER INSERT ON `session` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'session', NEW.id, 'insert', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_session_update AFTER UPDATE ON `session` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'session', NEW.id, 'update', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_session_delete AFTER DELETE ON `session` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'session', OLD.id, 'delete', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_two_factor_insert AFTER INSERT ON `two_factor` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'two_factor', NEW.id, 'insert', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_two_factor_update AFTER UPDATE ON `two_factor` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'two_factor', NEW.id, 'update', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_two_factor_delete AFTER DELETE ON `two_factor` BEGIN INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'two_factor', OLD.id, 'delete', cast(unixepoch('subsecond') * 1000 as integer)); END;

--> statement-breakpoint
CREATE TRIGGER security_changes_no_update BEFORE UPDATE ON security_changes BEGIN SELECT RAISE(ABORT, 'Security evidence is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER security_changes_no_delete BEFORE DELETE ON security_changes BEGIN SELECT RAISE(ABORT, 'Security evidence expiry is not enabled'); END;
