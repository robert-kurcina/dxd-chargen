CREATE TABLE `account_access` (
	`user_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`changed_at` integer NOT NULL,
	`changed_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`changed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "account_access_status_valid" CHECK("account_access"."status" IN ('active', 'disabled', 'banned'))
);
--> statement-breakpoint
CREATE TABLE `campaign_memberships` (
	`campaign_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`state` text NOT NULL,
	`invited_by_user_id` text,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "campaign_membership_role_valid" CHECK("campaign_memberships"."role" IN ('player', 'gm', 'campaign-administrator')),
	CONSTRAINT "campaign_membership_state_valid" CHECK("campaign_memberships"."state" IN ('active', 'banned', 'removed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_membership_campaign_user` ON `campaign_memberships` (`campaign_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`lifecycle` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "campaign_lifecycle_valid" CHECK("campaigns"."lifecycle" IN ('preparing', 'active', 'archived'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_single_default` ON `campaigns` (`is_default`) WHERE "campaigns"."is_default" = 1;
--> statement-breakpoint
CREATE TRIGGER account_access_audit_insert AFTER INSERT ON account_access BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'account_access', NEW.user_id, 'status=' || NEW.status, NEW.changed_at);
END;
--> statement-breakpoint
CREATE TRIGGER account_access_audit_update AFTER UPDATE ON account_access BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'account_access', NEW.user_id, 'status:' || OLD.status || '->' || NEW.status, NEW.changed_at);
END;
--> statement-breakpoint
CREATE TRIGGER account_access_no_delete BEFORE DELETE ON account_access BEGIN SELECT RAISE(ABORT, 'Account access state must be changed, not deleted'); END;
--> statement-breakpoint
CREATE TRIGGER campaign_audit_insert AFTER INSERT ON campaigns BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'campaign', NEW.id, 'created', NEW.created_at);
END;
--> statement-breakpoint
CREATE TRIGGER campaign_audit_update AFTER UPDATE ON campaigns BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'campaign', NEW.id, 'updated', cast(unixepoch('subsecond') * 1000 as integer));
END;
--> statement-breakpoint
CREATE TRIGGER campaign_no_delete BEFORE DELETE ON campaigns BEGIN SELECT RAISE(ABORT, 'Campaigns must be archived or recovered, not deleted'); END;
--> statement-breakpoint
CREATE TRIGGER campaign_default_immutable BEFORE UPDATE ON campaigns WHEN OLD.is_default = 1 BEGIN SELECT RAISE(ABORT, 'Default campaign is immutable; fork it'); END;
--> statement-breakpoint
CREATE TRIGGER campaign_membership_audit_insert AFTER INSERT ON campaign_memberships BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'campaign_membership', NEW.campaign_id || ':' || NEW.user_id, 'role=' || NEW.role || ';state=' || NEW.state, NEW.joined_at);
END;
--> statement-breakpoint
CREATE TRIGGER campaign_membership_audit_update AFTER UPDATE ON campaign_memberships BEGIN
  INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at)
  VALUES (dxd_event_id(), dxd_operation_id(), dxd_actor_id(), 'campaign_membership', NEW.campaign_id || ':' || NEW.user_id,
    'role:' || OLD.role || '->' || NEW.role || ';state:' || OLD.state || '->' || NEW.state,
    cast(unixepoch('subsecond') * 1000 as integer));
END;
--> statement-breakpoint
CREATE TRIGGER campaign_membership_no_delete BEFORE DELETE ON campaign_memberships BEGIN SELECT RAISE(ABORT, 'Campaign membership history is append/update only'); END;
