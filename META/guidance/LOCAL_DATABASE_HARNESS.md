# H02a: local database compatibility and migration harness

Completed 2026-09-24 on `feature/local-account-architecture`. This prepares dependencies and schema; there are no account endpoints, live database migrations or outbound emails. Existing character files remain the application's storage authority until H02c/H03 cutover.

## Pinned stack and runtime

Tested on Node 24.21.0, macOS arm64:

- Better Auth and its Drizzle adapter: 1.7.6.
- Drizzle ORM: 0.45.3; drizzle-kit: 0.31.11.
- better-sqlite3: 13.0.3 (SQLite 3.53.4 in this installation).
- Auth schema CLI: 1.7.6; better-sqlite3 types: 9.6.0.
- Existing Next dependency updated within its declared range to 16.3.6; sharp also updated through the lockfile to clear reported runtime advisories.

`package-lock.json` fixes the resolved graph. The targeted `@esbuild-kit/core-utils` esbuild override to 0.25.12 fixes the schema-tool development-server advisory without downgrading Drizzle. Generation was rerun successfully; npm reported zero vulnerabilities afterwards. Revisit the override when upstream removes that legacy dependency. Other OS/Node/native ABI combinations remain unverified; install/build failure must block their adoption rather than silently replacing the driver.

## Files and commands

- `scripts/config/auth-schema.ts`: generation-only Better Auth configuration with username and two-factor plugins. Its explicit placeholder secret is never runtime configuration; it opens no database and sends no email.
- `src/server/db/auth-schema.ts`: CLI-generated schema, including plugin columns/tables and relations.
- `migrations/auth`: reviewed initial SQL, snapshot and journal. Cascade relations are confined to library-owned auth records; no campaign or character deletion behavior is introduced.
- `src/server/db/connection.ts`: server-only explicit connection factory. Requires an absolute path, enables foreign keys/WAL/5-second busy timeout, and closes on initialization failure. Importing it does not open a database. Migration takes an explicit directory and is never run from a web request.
- `drizzle.config.ts`: generation paths only, no default connection credentials.

Run with the supported Node runtime:

```sh
npm run db:generate
npm run test:db
npm run test:db:bundle
npm run check
```

`db:generate` regenerates source/migration artifacts, not a live database. Review every generated SQL change before application. A repeated generation produced no new migration.

`test:db` uses a unique OS temporary directory and removes it in `finally`. It exercises the real driver, Drizzle migrator and Better Auth adapter, checking:

- Initial migration and repeat execution without duplicate journal entries.
- WAL, foreign keys and busy timeout configuration.
- Unverified signup with UUID identity, username and hashed password; no granted session and no email transport.
- Unique email and foreign-key rejection.
- A deliberately broken migration rolls back DDL and its journal entry.
- Online SQLite backup while the source connection is open; restored integrity, foreign keys, user/account rows and migration journal.

This signup is compatibility coverage, not H02b's account lifecycle acceptance. MFA tables/plugins load, but MFA flows, recovery mail, session revocation, rate limits and audit are still TODO.

`test:db:bundle` creates an isolated temporary Next project under the repository, builds a static probe using the actual server module, executes migrations/native SQLite/auth initialization during prerender, and checks the resulting response. The fixture and its database are removed. No probe route is added to the main app. This verifies native module execution through production bundling, not just TypeScript importability. Next automatically treats better-sqlite3 as an external server package; no extra application configuration was required.

## Validation and remaining work

Database harness and isolated production bundle pass. `npm run check` passes data validation, standalone TypeScript and production build. The existing 38 character/history/preset/storage tests pass. Browser backup/import and creation/Profile/undo/redo/two-page-PDF checks pass on the patched Next runtime.

H02a does not migrate legacy files, scope browser caches, enable accounts, bootstrap an Administrator or enforce RBAC. Next is H02b: local mail transport, registration/verification, login/logout, password recovery, sessions/MFA and minimum account-security audit. H02c must still prove no anonymous fallback to the legacy file APIs in accounts mode. Backup/restore here covers the auth database only; complete assets/character recovery remains H03.

## H02b checkpoint: local mail and lifecycle

`src/server/auth/local-harness.ts` is a server-only factory restricted to loopback origins. Mail is captured in an encrypted SQLite local inbox; it has no HTTP inbox route and no external delivery. A fresh secret is required and must remain available across reopening to decrypt queued messages. This remains a local harness, not the external runtime mail delivery service.

`npm run test:accounts` exercises actual Better Auth HTTP Request/Response handling against disposable SQLite:

- Signup queues verification mail and grants no session; unverified login is denied.
- Verification permits login; session cookies are HttpOnly; logout invalidates the cookie.
- Password-reset responses match for known/unknown email addresses, while unknown addresses receive no message.
- Reset tokens are single-use and expired tokens fail; successful reset invalidates all prior sessions and the old password.
- Password change with other-session revocation rotates the current session cookie and invalidates other sessions.
- An untrusted Origin cannot sign the user out; the existing session survives that rejection.

Tests and standalone TypeScript pass. Expected library warning/error messages for rejected credentials/origins appear in test output; no reset/verification tokens or passwords are printed. No live account, user file or application route is changed.

H02b remains WIP. The current-session/password-change and rate-limit policies still need service-level enforcement. MFA replay/concurrency/freshness checks, email changes, uniqueness edge cases, durable security audit, mail-worker retries and crash reconciliation remain to implement/test. Auth database after-hooks alone are not accepted as proof that domain audit and credential mutations are atomic. These gates must pass before exposing account routes; the compatibility harness is not a production auth service.


## H02b checkpoint: MFA and persistent local mail

`npm run test:accounts` now also verifies rejected enrollment passwords/codes, inactive MFA before confirmation, successful TOTP enrollment, challenged login without a full session, recovery-code login and rejection of recovery-code reuse. The test computes its enrollment TOTP independently using HMAC-SHA1. No secrets or recovery codes are printed. This does not yet prove TOTP replay prevention, concurrent challenges, lockout limits or Danger Zone step-up freshness.

The second reviewed migration creates `auth_mail`. `local-mail-store.ts` persists AES-256-GCM ciphertext using a random nonce, record ID as authenticated data and a purpose-separated key derived from the caller's high-entropy secret. Recipient and token-bearing URL are inside the encrypted payload. Reads do not remove messages; explicit acknowledgement does. The test-only `takeMail` helper drains within a SQLite transaction. Queued messages survive reopening with the same secret, fail decryption with a wrong secret without deletion, and become unreadable through the inbox after one hour. Explicit expiry cleanup removes those rows. No worker or recurring cleanup is enabled yet, and key rotation is not implemented.

Three account/MFA/mail scenarios, the migration/backup harness and TypeScript pass. Existing source files remain untouched. Installed Better Auth `dist/db/with-hooks.mjs` uses `queueAfterTransactionHook` for after-hooks; durable audit cannot simply be appended in those callbacks and described as atomic with credential changes. Next checkpoint is a crash-tested security-event strategy and mail delivery reconciliation before any account route is exposed.

## H02b checkpoint: durable operation journal

The third reviewed migration adds `security_events`, with database triggers rejecting updates and deletions. Automatic 24-month expiry remains unimplemented and must replace the delete guard through a reviewed retention migration before release of retention operations; this guard is not a decision to keep logs forever.

`security-journal.ts` appends an operation UUID and `started` event before session resolution or invoking an account handler. It then appends `responded` with HTTP status or `threw` without exception text. Session resolution disables refresh; authenticated completion events include the server-resolved actor UUID. Anonymous attempts remain unattributed rather than trusting an email/ID in request data. Only fixed action names and normalized methods are stored, never query strings, arbitrary paths, request bodies, cookies, credentials or exception messages. This journal records operation delivery, not authoritative per-entity mutation outcomes or successful authentication inferred from status 200.

The local harness exposes a journaled `handle` entry used by the lifecycle/MFA tests. The raw library object remains available internally for configuration/API experiments; no public route is mounted. H02c must enforce the wrapper and close all bypass paths before deployment.

`test:accounts` includes fault injection: initial append failure prevents handler execution; final append failure leaves a started operation visible after database close/reopen. Existing events reject SQL UPDATE/DELETE. Handler exceptions receive a terminal event without leaking the exception text. No unfinished operation is automatically retried: it may already have changed credentials, and replay would be unsafe. `unresolved()` is an inspection primitive, not completed crash reconciliation; a live operation can also be unresolved. Worker leasing, actor/target attribution across anonymous recovery, and read-only reconciliation evidence remain required before production exposure. SQLite host owners can still modify the database outside application controls.

Four account/mail/MFA/journal scenarios, the database migration/backup harness and TypeScript pass. H02b remains WIP; next work is crash reconciliation and remaining MFA/session policy gates, then durable external delivery semantics. This step neither claims transaction-coupled credential auditing nor enables accounts.

## H02b checkpoint: transaction-coupled mutation evidence

The fourth migration adds `security_changes` plus INSERT/UPDATE/DELETE triggers for the library-owned user, account, session and two-factor tables. Each trigger inserts only entity type/ID, change kind, time, operation UUID and server-resolved actor UUID. It never copies row values such as passwords, email addresses, session tokens, MFA secrets or recovery codes. Evidence updates/deletes are guarded; expiry remains a later reviewed migration. Preserve these custom triggers during future schema/table rebuilds; Drizzle's generated schema snapshot does not itself describe them.

`openDatabase` registers the trigger functions. `operation-context.ts` uses AsyncLocalStorage so overlapping asynchronous requests retain separate attribution. The journal establishes context after the durable started event and before session lookup. Internal writes outside a journaled operation are recorded with null operation/actor IDs rather than invented attribution; production route wiring must eliminate unintended bypasses.

A mutation and its evidence now share the SQLite statement/transaction: injected evidence failure rolls back a user insert. If the separate response-journal append fails after that insert commits, both the user and its evidence survive reopening. `journal.evidence(operationId)` supplies a read-only record of those changes for reconciliation. It does not infer overall request success, replay a password operation, mark the request resolved, or reconstruct old credential values. Lost responses and partial multi-statement library operations still require deliberate handling. Verification-token consumption and outbound mail are not covered by these four table triggers; those remain distinct reconciliation concerns.

Fault tests verify failed evidence prevents mutation, a committed mutation remains discoverable after completion-log failure, and two interleaved requests retain the correct actor IDs. MFA tests additionally reject disabling MFA with a wrong password and verify that two concurrent login attempts using one recovery code produce exactly one successful session. Five account/security scenarios, migration/backup tests, TypeScript and the isolated Next production-bundle check form this checkpoint's validation.

Remaining H02b gates include TOTP replay/freshness/lockout, account/email/username edge cases, application-enforced password/session policies, and durable delivery/reconciliation workflows. Accounts remain unexposed; there is no automatic classification of a live operation as crashed.
