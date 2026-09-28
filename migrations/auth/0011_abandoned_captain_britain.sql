CREATE TABLE `character_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`version` integer NOT NULL,
	`draft_json` text NOT NULL,
	`schema_version` integer NOT NULL,
	`edited_by` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`edited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "character_version_number_positive" CHECK("character_versions"."version" > 0),
	CONSTRAINT "character_version_schema_valid" CHECK("character_versions"."schema_version" BETWEEN 1 AND 11),
	CONSTRAINT "character_version_json_valid" CHECK(json_valid("character_versions"."draft_json"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `character_version_number` ON `character_versions` (`character_id`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `character_version_idempotency` ON `character_versions` (`character_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `character_version_history` ON `character_versions` (`character_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`campaign_id` text,
	`is_private` integer DEFAULT false NOT NULL,
	`is_locked` integer DEFAULT false NOT NULL,
	`current_version` integer NOT NULL,
	`create_idempotency_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "character_current_version_positive" CHECK("characters"."current_version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `character_owner_create_idempotency` ON `characters` (`owner_id`,`create_idempotency_key`);--> statement-breakpoint
CREATE TRIGGER character_audit_insert AFTER INSERT ON characters BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'character', NEW.id, 'created', NEW.created_at);
END;
--> statement-breakpoint
CREATE TRIGGER character_audit_update AFTER UPDATE ON characters BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'character', NEW.id,
    'version:' || OLD.current_version || '->' || NEW.current_version ||
    CASE WHEN OLD.is_private != NEW.is_private THEN ';private:' || OLD.is_private || '->' || NEW.is_private ELSE '' END ||
    CASE WHEN OLD.is_locked != NEW.is_locked THEN ';locked:' || OLD.is_locked || '->' || NEW.is_locked ELSE '' END || ';updated', NEW.updated_at);
END;
--> statement-breakpoint
CREATE TRIGGER character_version_pointer_monotonic BEFORE UPDATE OF current_version ON characters
WHEN NEW.current_version != OLD.current_version + 1
  OR NOT EXISTS (SELECT 1 FROM character_versions v WHERE v.character_id = OLD.id AND v.version = NEW.current_version)
BEGIN SELECT RAISE(ABORT, 'Character version pointer must advance to an existing next version'); END;
--> statement-breakpoint
CREATE TRIGGER character_no_delete BEFORE DELETE ON characters BEGIN SELECT RAISE(ABORT, 'Character deletion is disabled until retention recovery is implemented'); END;
--> statement-breakpoint
CREATE TRIGGER character_version_audit_insert AFTER INSERT ON character_versions BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'character_version', NEW.character_id,
    'version=' || NEW.version || ';schema=' || NEW.schema_version, NEW.created_at);
END;
--> statement-breakpoint
CREATE TRIGGER character_version_no_update BEFORE UPDATE ON character_versions BEGIN SELECT RAISE(ABORT, 'Character versions are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER character_version_no_delete BEFORE DELETE ON character_versions BEGIN SELECT RAISE(ABORT, 'Character version history is immutable'); END;
