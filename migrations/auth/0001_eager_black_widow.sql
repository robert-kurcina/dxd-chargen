CREATE TABLE `auth_mail` (
	`id` text PRIMARY KEY NOT NULL,
	`encrypted_payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
