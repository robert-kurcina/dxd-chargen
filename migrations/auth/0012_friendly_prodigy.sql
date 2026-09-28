ALTER TABLE `campaigns` ADD `parent_campaign_id` text REFERENCES campaigns(id);--> statement-breakpoint
ALTER TABLE `campaigns` ADD `create_idempotency_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_create_idempotency` ON `campaigns` (`created_by`,`create_idempotency_key`) WHERE "campaigns"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
INSERT INTO campaigns (id, name, lifecycle, is_default, parent_campaign_id, create_idempotency_key, created_at, created_by)
VALUES ('7841aa01-33f4-4a90-8d13-000000000001', 'Default Campaign', 'preparing', 1, NULL, NULL, CAST(unixepoch('subsec') * 1000 AS INTEGER), NULL);
--> statement-breakpoint
INSERT INTO campaigns (id, name, lifecycle, is_default, parent_campaign_id, create_idempotency_key, created_at, created_by)
VALUES ('7841aa01-33f4-4a90-8d13-000000000002', 'Working Campaign', 'preparing', 0, '7841aa01-33f4-4a90-8d13-000000000001', NULL, CAST(unixepoch('subsec') * 1000 AS INTEGER), NULL);
--> statement-breakpoint
CREATE TRIGGER campaign_parent_immutable BEFORE UPDATE OF parent_campaign_id ON campaigns
WHEN NEW.parent_campaign_id IS NOT OLD.parent_campaign_id
BEGIN SELECT RAISE(ABORT, 'Campaign fork provenance is immutable'); END;
