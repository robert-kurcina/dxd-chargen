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

## H02b checkpoint: password/session policy

On `feature/account-policy-gates`, the journaled local handler now enforces password-change policy before delegating to Better Auth: a server-resolved session must be less than five minutes old, invalid/future timestamps fail closed, and `revokeOtherSessions` is always true regardless of client input. Request Origin and cookie headers are retained so the library still performs its own checks. Password verification and hashing remain library-owned. Stale sessions receive `REAUTHENTICATION_REQUIRED`; users must sign in again before changing their password. This is a session-recency rule, not Danger Zone MFA proof.

Regression tests send `revokeOtherSessions: false` and verify other sessions are nevertheless revoked. A stale session cannot change the password, and the unchanged password still works. A completed MFA login challenge cannot be used again even with a different valid recovery code. Five account/security scenarios and TypeScript pass.

Remaining distinction: single-use challenge and recovery-code tests do not prove that the same TOTP counter cannot be used across two independently issued challenges. Installed `two-factor/totp/index.mjs` verifies the OTP and consumes the login challenge, but does not by itself establish persisted per-counter consumption. That separate gate and lockout/freshness tests remain pending; account endpoints are still unexposed. Do not describe H02b as complete or the session-recency rule as recent MFA verification.

## H02b checkpoint: cross-challenge TOTP replay and lockout

A new concurrent-login regression reproduced the same TOTP authorizing two distinct challenges in the unguarded library flow. The local journaled handler now derives a purpose-separated HMAC fingerprint for a six-digit TOTP request. The fifth migration's BEFORE INSERT session trigger consumes that fingerprint per user in the same SQLite statement as session creation. A duplicate aborts session creation and is mapped to HTTP 401 `TOTP_ALREADY_USED` by the handler. Better Auth still performs OTP validation; this guard does not implement its own OTP verifier. Enrollment-generated sessions also consume the code. The test generates the next accepted time-step code, independent of the library, and verifies exactly one successful concurrent login.

The configuration fixes six digits and a 30-second period. Fingerprints expire after 90 seconds, covering the pinned verifier's current/adjacent-step acceptance window. Expired rows for a user are removed on their next TOTP session creation; general cleanup and key-rotation policy remain pending. All processes must share the same secret and registered database functions. Do not rotate that secret during the acceptance window without an explicit invalidation strategy. No plaintext OTP is persisted. A rejected attempt may already have consumed its login challenge, so users must restart login with a fresh code; nothing is automatically replayed.

This guard applies to session creation, not an already authenticated caller's MFA step-up result. Danger Zone still requires its own fresh, action-bound proof. Raw auth API access still bypasses handler fingerprint setup and must remain internal; H02c route cutover tests are required before exposure. The expected SQLite trigger error can appear in local library test output, but the caller receives the explicit 401 response and no session credentials from that response.

The MFA scenario also seeds nine persisted prior failures, submits a failing TOTP at the default threshold of ten, verifies active lockout rejects a valid recovery code with 429, then advances the stored lock expiry and verifies recovery succeeds. This exercises the boundary without sleeping; it is not a distributed rate-limit load test. Account/security tests, migration/backup, TypeScript and isolated production bundling pass for this checkpoint.

## H02b checkpoint: account identity and email verification

The journaled local handler requires a nonblank username during signup. Username format and normalization remain with the library. Email changes are enabled with verification required and the same five-minute session-recency gate as password changes; the existing address remains authoritative until the replacement is verified. The original account UUID and ownership remain unchanged.

The account identity scenario verifies missing/blank username rejection, case normalization, a neutral duplicate-email signup response with no new user/session, case-insensitive username uniqueness, username login, replacement-address verification, stable UUID and inability to log in using the former address. The MFA scenario now additionally resets the password of an MFA-enabled account and confirms that login still stops at the second-factor challenge with no authenticated session.

Six account/security scenarios and TypeScript pass. Real mail is not sent and no account route is exposed. Remaining work includes durable external delivery/retry semantics, reconciliation handling for interrupted multi-step operations, rate-limit/abuse coverage and account-management UI. These tests do not constitute H02c server authorization or a completed shared-account service.


## H02b checkpoint: read-only recovery review

`createSecurityJournal().reviewCandidates()` provides a bounded snapshot of older
requests with missing completion, a recorded exception, or an HTTP error response.
It includes the count of transaction-coupled auth changes, including changes made
before an exception. Defaults are a five-minute minimum age and 100 results;
limits must be positive integers no greater than 1,000. `hasMore` indicates a
truncated result. Detailed existing `evidence(operationId)` inspection remains
available internally.

Age is only a review filter: a request may still be running. No recorded changes
is not proof of rollback, and a nonzero count is not proof of whole-operation
success. Successful responses are outside this exception report. The query does
not change the journal, resolve an incident, retry credentials, or deliver mail.
It exposes no account email, credential material, or arbitrary request data.
There is no public route or review UI. Durable review decisions, worker ownership,
delivery retries, and reconciliation with external delivery remain unfinished.

Validation: all three security-journal tests and standalone TypeScript pass.
The new test covers age filtering, error/exception classification, change counts,
bounded results, invalid options, and absence of database mutations during review.


## H02b checkpoint: recoverable local delivery leases

Migration 0005 adds lease token/expiry, attempt count, and next-available time to
existing encrypted mail rows. `claim()` atomically selects one eligible message,
increments its attempt count, and returns a random ownership token plus decrypted
mail. Decryption failure rolls back the claim. `complete()` and `retry()` require
the current, unexpired token; an old worker cannot delete or reschedule a message
reclaimed after lease expiry. Retry delay is configurable, with a 30-second default.
Expired messages cannot be claimed. Leases default to one minute, capped at five.

This is an internal queue primitive, not an enabled sender or scheduler. A worker
must send outside the database transaction and use token-bound completion/retry;
existing pending/acknowledge/clear helpers are only for the local harness. External
delivery may occur before a crash or expired lease, so retry can duplicate mail.
Use the stable mail UUID as a provider idempotency key where supported; no
exactly-once delivery claim is made. No network delivery, provider choice, queue
UI, retry ceiling, background cleanup, or permanent attempt history is implemented.
Attempt count survives retries/restarts while the queue row exists. Successful
completion removes its encrypted payload and queue metadata.

Validation: eight account/security scenarios, TypeScript, and the SQLite
migration/rollback/backup-restore test pass. The new queue test uses separate DB
connections and a reopen, verifies exclusive claims, delayed retries, rejection
of stale tokens, decryption rollback, and expired-message exclusion. Migration
count is now six; no live database was migrated.


## H02b checkpoint: explicit delivery runner

`deliverNextMail(queue, send)` processes at most one eligible message through an
injected sender. It passes the stable mail UUID as `idempotencyKey`, acknowledges
only after sender acceptance, and schedules rejected sends with exponential delay
starting at 30 seconds and capped at five minutes. Results contain only the mail
ID and idle/accepted/retry-scheduled/lease-lost status. Accepted means transport
acceptance, not recipient delivery. Provider exception details are discarded.
Database failures propagate outside the sender catch; failed acknowledgement
leaves the leased row available for recovery after expiry.

Tests cover idle behavior, stable retry identity, sender failure, delayed retry,
acceptance, ownership lost during send, and injected acknowledgement failure.
Nine account/security scenarios and standalone TypeScript pass. No provider,
network send, automatic worker loop, or public endpoint is enabled. The future
transport adapter must implement bounded timeouts and provider deduplication where
available; lease expiry cannot cancel an already accepted external send. Permanent
attempt history, retry exhaustion policy and operator reconciliation remain open.


## H02b checkpoint: development rate-limit coverage

The loopback harness now explicitly enables BetterAuth's in-memory rate limiter
rather than depending on its production-only default. Lifecycle tests explicitly
opt out with `disableRateLimitsForTests`; the dedicated rate test uses the default.
The pinned library's X-Retry-After is also exposed as standard Retry-After by the
handler wrapper. Concurrent tests prove three of six password-reset requests are
accepted and three rejected, independently of three allowed/three rejected login
attempts. Unknown accounts enqueue no mail, rejected logins create no sessions,
and all six 429 responses are journaled. Ten account/security scenarios and
standalone TypeScript pass.

This is not the public-service rate-limit gate: counters are process-local,
shared by library instances and reset on process restart. Requests without a
resolved trusted client IP share the library's per-path fallback bucket. No
trusted reverse-proxy configuration has been selected. Durable atomic counters,
expiry-boundary/restart tests, trusted-IP spoofing tests and per-account abuse
controls remain necessary before exposing routes. The raw internal auth API and
wrapper prevalidation require review at H02c cutover; these tests exercise the
journaled handler, not every possible internal invocation.


## H02b checkpoint: persistent rate-limit counters

The harness now uses `createRateLimitStore` through BetterAuth customStorage,
replacing the preceding in-memory checkpoint. Migration 0006 adds operational
`auth_throttle` counters, separate from immutable evidence. An immediate SQLite
transaction reads and consumes each bucket, preventing competing connections
from passing the same stale count. Each allowed request refreshes the window;
rejected requests do not extend it. Buckets expire at the exact stored boundary.
Keys are HMAC fingerprints rather than raw client/path identifiers. The same
secret must be retained across restarts and shared by instances; changing it or
the window policy produces fresh buckets and needs an explicit rollout policy.

Eleven account/security tests, TypeScript, and migration/backup-restore checks
pass. Tests cover two connections, reopen persistence, exact expiry and injected
write failure (which throws rather than allowing the request). The connection
test interleaves calls in one Node process; it is not a multi-process load test.
Migration count is nine. No live database was migrated.

Trusted client-IP handling, per-account abuse controls, expired-counter cleanup,
multi-process contention tests and public-route bypass review remain open. Old
expired buckets are overwritten when reused but are not yet globally pruned.
The test-only rate-limit bypass remains explicit. Account routes remain unexposed.


## H02b checkpoint: loopback header trust and counter cleanup

The direct loopback harness explicitly sets `ipAddressHeaders: []`. No proxy is
configured to sanitize client-supplied headers, so forwarded headers cannot
select a different rate-limit bucket. Local requests share the library's
localhost/fallback per-path bucket. Tests exhaust that bucket and then try
multiple invented X-Forwarded-For, X-Real-IP and Forwarded values, including a
chain and malformed value; all remain rejected and journaled.

`removeExpired(limit)` deletes only counters at or past expiry, at most 1,000 by
default (maximum 10,000). Tests cover bounded batches, exact expiry, preservation
of a renewed active counter and invalid limits. This is an explicit maintenance
primitive, not a running scheduler; the deletion limit bounds mutations, not the
scan cost. Eleven account/security scenarios and TypeScript pass.

Deployment still needs a separately tested transport/proxy trust contract and
appropriate client/account abuse controls. Do not enable forwarded headers solely
because a host supplies them. Shared loopback throttling is intentionally not a
public multi-user configuration. Scheduler wiring, contention/load tests and
explicit reconciliation decisions remain unfinished; account routes stay closed.


## H02b checkpoint: indexed throttle cleanup

Migration 0007 adds `auth_throttle_expiry`, an index on counter expiry used by
the existing bounded cleanup query. This avoids a full table scan to locate each
expired batch as the table grows. Migration count is eight. The migration has
not been applied to a live database; automated checks were not run for this
checkpoint. Cleanup still requires an explicitly scheduled maintenance call.


## H02b checkpoint: explicit local maintenance command

`npm run maintenance:local` removes one bounded batch of expired throttle
counters and expired encrypted auth mail from an already-migrated local SQLite
database. It requires `DXD_DATA_DIR` to name an existing absolute directory with
a real `dxd.sqlite`; it refuses missing databases, symlink database files, or
missing account tables/indexes. Set `DXD_MAINTENANCE_BATCH_SIZE` to an integer
from 1 to 10,000 (default 1,000) to bound each table's deletions. Both deletes
run in one short immediate transaction, and output includes counts only. The
command applies no migrations, starts no scheduler and sends no mail. An operator
may invoke it manually or from an external local scheduler after backups and
maintenance cadence are arranged.

This is not wired into application startup; request handlers must not run global
cleanup. The database and account harness remain development foundations with no
production account routes. The command was not run against a real database for
this checkpoint.


## H02b checkpoint: durable account-operation review decisions

Migration 0008 adds append-only `security_review_decisions`. The journal can
record `reviewed-no-automatic-retry` or `follow-up-required`, with a reason code
derived from transaction-coupled change evidence. Recording requires an
authenticated journal context, a dedicated `POST review-security-operation`
action, an incomplete or failed operation at least five minutes old, and a match
between reviewer and source actor. The review record captures the review request
UUID and actor from server context. No free-form notes or credential data are
stored. Candidate reports include the latest disposition, reason, reviewer and
time.

A decision is an assessment; it does not mark credentials successful or
authorize replay. This self-review rule requires a non-null original actor and
does not cover signup/reset operations where the actor is null. No HTTP handler
or UI exposes this action, and no staff-role authorization is implemented. Do
not wire it to a route without Site Administrator policy, fresh MFA and access
logging. Migration count is nine. No tests were run for this checkpoint.


## H02c checkpoint: fail-closed legacy character APIs

Added a shared server-only storage-mode gate at the start of every filesystem
character API handler: character list/save, tags, current/historical versions and
portraits. In development, an unset `DXD_STORAGE_MODE` keeps the existing
`legacy-local` workflow. In production, it defaults to `accounts`, which returns
503 before reading request bodies, parsing path parameters, or touching files. An
explicit accounts mode and every unrecognized value also block these endpoints.
Explicit `legacy-local` cannot re-enable them in production.
Baseline data-assets routes are unchanged.

This is a boundary checkpoint, not accounts-mode delivery: no authenticated
character API or auth handler exists, so selecting accounts mode intentionally
leaves character storage unavailable. `npm run test:legacy-api-boundary` starts
the built production app with accounts, explicit legacy, unknown and unset storage
modes and checks every filesystem route. Malformed POST/PATCH bodies still receive
the same 503 before parsing; every response is no-store. Other deployment policy,
including startup refusal for a missing persistent DB/auth secret, is still required
before accounts can be operated. Run `npm run build` before this test.


## H02c checkpoint: explicit local database provisioning

`npm run db:migrate:local` creates/applies the reviewed account migrations in
`$DXD_DATA_DIR/dxd.sqlite`. The path must be absolute, outside public assets,
and its resolved directory must have owner-only permissions;
the database is restricted to mode 0600. SQLite foreign keys, WAL and a bounded
busy timeout are enabled. The command is explicit and separate from web requests;
normal startup does not apply migrations. Its output includes only the local DB
path and migration count. It does not configure the auth secret, expose routes,
or enable outbound mail.

Only syntax and package metadata were checked for this checkpoint; the command
was not run against a local database. Existing databases with looser directory
permissions require an operator to choose and secure an appropriate data path
first.


## H02c checkpoint: local account runtime preflight

`npm run accounts:check:local` performs read-only readiness checks before any
account API runtime is wired. It requires explicit accounts mode, a non-production
environment, an auth secret of at least 32 characters, and a loopback auth origin.
It checks owner-only data directory/database permissions, rejects database symlinks,
and requires auth/audit/mail/throttle tables, the current ten migrations, Site Administrator table and throttle
expiry index, SQLite integrity and foreign-key consistency. It never opens the DB
for writing, applies migrations, or prints the auth secret. Errors name the missing
configuration/check without exposing credentials.

The preflight is an operator command only. It does not mean accounts mode is
operational: authenticated handlers, rate-limit trust review, delivery access and
role authorization remain prerequisites. It was not run against a database for
this checkpoint.


## H02b checkpoint: loopback development account API

`npm run accounts:dev` starts Next development bound to `127.0.0.1` with explicit
accounts mode. The catch-all `/api/auth` handler is available only when both
`NODE_ENV=development` and accounts mode are set; it returns a generic 503 otherwise.
At request time it opens only an existing private DB with all ten migrations,
required tables and throttle index, validates the auth secret and loopback origin,
and never runs migrations. Runtime state is reused through a process-global
singleton for development HMR. Character file APIs are disabled in this mode.
Production auth remains closed.

Signup and password reset links are queued encrypted. `npm run
accounts:mail:local` prints them only from a private interactive terminal while
accounts mode and a valid local DB/key are configured. Treat terminal output as
credential material. No remote mail is sent. The Account page supports local signup, sign-in, verification, reset, MFA challenge and
sign-out. A one-time CLI bootstraps the first verified Site Administrator; only that
role can read bounded security-operation candidates and append review decisions. Shared
character DB routes and role-management UI remain unbuilt; this is not a production
account service.


## H02b checkpoint: Site Administrator bootstrap and reconciliation

Migration 0009 adds a local Site Administrator grant linked to a verified account.
`npm run accounts:bootstrap-admin:local -- <username>` grants only the first Site
Administrator and records the grant in the append-only security journal. The command
requires accounts mode, a private existing database, the current ten migrations, and a
local auth secret; it never creates or migrates a database.

The development-only auth harness exposes a bounded reconciliation report and an
append-only review decision endpoint only to a bootstrapped Site Administrator. Reviews
can cover an eligible failure from another account but do not retry or change credentials.
Writes require the configured same origin; report responses are no-store and contain no
email addresses or request bodies. Character-file APIs remain closed in accounts mode,
and production auth remains disabled. Tests cover unverified/duplicate bootstrap,
unauthorized access, limits, cross-origin requests, actor attribution and immutability.
Action-bound fresh MFA and the broader H02c role/policy cutover remain open.
