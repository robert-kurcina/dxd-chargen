CREATE TABLE `consumed_totp` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consumed_totp_user_code` ON `consumed_totp` (`user_id`,`fingerprint`);--> statement-breakpoint
CREATE TRIGGER session_totp_single_use BEFORE INSERT ON session
WHEN dxd_totp_fingerprint() IS NOT NULL
BEGIN
  DELETE FROM consumed_totp WHERE user_id = NEW.user_id AND expires_at <= cast(unixepoch('subsecond') * 1000 as integer);
  SELECT dxd_note_totp_replay() WHERE EXISTS (SELECT 1 FROM consumed_totp WHERE user_id = NEW.user_id AND fingerprint = dxd_totp_fingerprint());
  SELECT CASE WHEN EXISTS (SELECT 1 FROM consumed_totp WHERE user_id = NEW.user_id AND fingerprint = dxd_totp_fingerprint()) THEN RAISE(ABORT, 'TOTP already consumed') END;
  INSERT INTO consumed_totp (id, user_id, fingerprint, expires_at) VALUES (dxd_event_id(), NEW.user_id, dxd_totp_fingerprint(), cast(unixepoch('subsecond') * 1000 as integer) + 90000);
END;
