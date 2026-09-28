CREATE TABLE `campaign_invitation_joins` (
	`id` text PRIMARY KEY NOT NULL,
	`invitation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`invitation_id`) REFERENCES `campaign_invitations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_invitation_join_user` ON `campaign_invitation_joins` (`invitation_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `campaign_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`role` text NOT NULL,
	`expires_at` integer NOT NULL,
	`max_uses` integer NOT NULL,
	`uses` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "campaign_invitation_role_valid" CHECK("campaign_invitations"."role" IN ('player', 'gm', 'campaign-administrator')),
	CONSTRAINT "campaign_invitation_use_limit" CHECK("campaign_invitations"."max_uses" BETWEEN 1 AND 100 AND "campaign_invitations"."uses" BETWEEN 0 AND "campaign_invitations"."max_uses")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_invitations_token_hash_unique` ON `campaign_invitations` (`token_hash`);--> statement-breakpoint
CREATE INDEX `campaign_invitation_active` ON `campaign_invitations` (`campaign_id`,`expires_at`,`revoked_at`);--> statement-breakpoint
CREATE TRIGGER campaign_invitation_audit_insert AFTER INSERT ON campaign_invitations BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'campaign_invitation', NEW.id,
    'created;role=' || NEW.role || ';maxUses=' || NEW.max_uses, NEW.created_at);
END;
--> statement-breakpoint
CREATE TRIGGER campaign_invitation_update_guard BEFORE UPDATE ON campaign_invitations
WHEN NEW.id IS NOT OLD.id OR NEW.campaign_id IS NOT OLD.campaign_id OR NEW.token_hash IS NOT OLD.token_hash
  OR NEW.role IS NOT OLD.role OR NEW.expires_at IS NOT OLD.expires_at OR NEW.max_uses IS NOT OLD.max_uses
  OR NEW.created_by IS NOT OLD.created_by OR NEW.created_at IS NOT OLD.created_at
  OR NOT ((NEW.uses = OLD.uses + 1 AND NEW.revoked_at IS OLD.revoked_at)
       OR (NEW.uses = OLD.uses AND OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'Only invitation use or revocation can change'); END;
--> statement-breakpoint
CREATE TRIGGER campaign_invitation_audit_update AFTER UPDATE ON campaign_invitations BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'campaign_invitation', NEW.id,
    CASE WHEN NEW.uses != OLD.uses THEN 'use:' || OLD.uses || '->' || NEW.uses ELSE 'revoked' END,
    cast(unixepoch('subsec') * 1000 as integer));
END;
--> statement-breakpoint
CREATE TRIGGER campaign_invitation_no_delete BEFORE DELETE ON campaign_invitations BEGIN SELECT RAISE(ABORT, 'Invitation history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER campaign_invitation_join_audit_insert AFTER INSERT ON campaign_invitation_joins BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'campaign_invitation_join', NEW.id, 'joined', NEW.joined_at);
END;
--> statement-breakpoint
CREATE TRIGGER campaign_invitation_join_no_update BEFORE UPDATE ON campaign_invitation_joins BEGIN SELECT RAISE(ABORT, 'Invitation join history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER campaign_invitation_join_no_delete BEFORE DELETE ON campaign_invitation_joins BEGIN SELECT RAISE(ABORT, 'Invitation join history is immutable'); END;
