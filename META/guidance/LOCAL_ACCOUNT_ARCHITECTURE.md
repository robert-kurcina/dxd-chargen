# ADR H01: local accounts and persistent campaign storage

Date: 2026-09-24. Status: selected implementation direction; not implemented.
Owner: implementing agent. Product authority: [specification](MOBILE_CAMPAIGN_SPEC.md).
Scope: H01. No dependency installation, database migration, account creation, email sending, or changes to existing character files occur in this decision.

## Decision

Keep the Next.js application as a single local Node web service. Use SQLite on a persistent local volume, Drizzle for explicit schema/migrations, and Better Auth with its Drizzle SQLite adapter for account/session handling. Use `better-sqlite3` as the initial driver, subject to the H02 compatibility gate against the project's Node/Next versions. Pin tested versions and commit the lockfile during that gate; do not run floating-version migration commands in normal startup.

Use Better Auth's email/password flow, username plugin and TOTP/recovery-code support. Keep campaign authorization in application services, independent of authentication plugins. UUIDs identify records; they confer no access. An external auth provider, Firebase, remote host and remote object store are not prerequisites.

SQLite suits the initial single-host service and file-based operations. WAL supports concurrent readers but still only one writer; keep transactions short, configure a bounded busy timeout, enable foreign keys per connection, and keep DB/WAL files on the same local volume. Do not put the database on a network share or an ephemeral deployment filesystem. Move to PostgreSQL if measured write contention or multi-host operation requires it; repository interfaces reduce coupling but do not make that migration automatic. [SQLite WAL](https://www.sqlite.org/wal.html)

Better Auth documents SQLite and Drizzle integration, email/password authentication and a Next.js handler. This is a library choice, not evidence that authorization or recovery already works in this application. Verify actual plugin migrations, callbacks and transaction behavior in H02. [Installation](https://better-auth.com/docs/installation), [Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)

## Existing implementation and gaps

| Current code | Finding | Transition |
| --- | --- | --- |
| `src/app/admin/layout.tsx`, `admin-shell.tsx` | Admin navigation has no authenticated server guard | Require Site Administrator for global settings; campaign actions use scoped permissions |
| `src/lib/admin-settings.ts`, `src/app/admin/global-panel.tsx` | Seed/sequence/Library tags are localStorage preferences | Retain generation preferences; move authoritative campaign/global policy to server records |
| `src/app/api/character-files/route.ts` | Direct filesystem saves, short legacy IDs, no account ownership; GET invokes Library normalization | Replace shared mode with authorized repository calls; migration becomes an explicit job, never a read side effect |
| `src/app/api/character-files/tags/route.ts` | Batch writes may partly succeed and are not versioned/authorized | Validate every target, then commit authorized updates and events atomically |
| Character file/version/image handlers | Filename validation, not access authorization | Authorize record and version/asset access before opening or returning content |
| `src/app/api/data-assets/[category]/[filename]/route.ts` | Public baseline art, including remote citystate fallback | Keep public catalog art public; private campaign assets use separate protected storage/routes |
| WorkspaceProvider / character-library | Guest browser drafts, bounded history, backup import/export | Preserve guest mode; add account-scoped caches and explicit selected import |
| `src/lib/local-campaigns.ts` | Immutable Default and Working fixtures with UUIDs | Idempotently seed those IDs; map them to real server campaigns, not staff privileges |

The installed Next.js authentication guide recommends a library and separating authentication/session management from authorization. Server authorization belongs close to data access; hiding UI or guarding only layouts is insufficient. See `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.

## Runtime and repository boundaries

Proposed paths (future implementation): `src/server/db`, `src/server/auth`, `src/server/policy`, `src/server/repositories`, `src/server/services`, `src/server/jobs`. Mark server modules server-only. Route handlers validate input and call services; services resolve the authenticated actor and enforce policy, and repositories execute parameterized queries. Do not accept actor identity, owner changes or privileged roles from a character JSON blob.

Use an application data directory outside public assets, configured by `DXD_DATA_DIR`, with database, private blobs and backup manifests. Ignore generated files in Git. Serve private images through authorization-aware handlers with private/no-store caching. Filter data before serialization, including server-rendered props, lists, counts, searches, exports and version endpoints; never deliver private campaign material and hide it in React.

Introduce an explicit legacy-local versus accounts mode during transition. Legacy-local file APIs remain confined to local development. Accounts mode fails closed if DB/auth configuration is missing and disables the unprotected legacy endpoints; there is no anonymous fallback to file access. Keep the public baseline catalog distinct from future campaign overrides. Startup/deployment tests must prove this boundary before accounts mode is offered to other users.

## Data model and identities

Auth-library tables remain library-owned, generated into reviewed migrations. Configure UUID creation where supported; if a plugin requires its own identifier, map it uniquely to an application UUID. Never shorten new application UUIDs to eight characters.

| Application records | Required relationships/invariants |
| --- | --- |
| Accounts / account status | Auth subject unique; normalized email and username unique; separate Site Administrator flag; disabled/banned status checked server-side |
| Campaigns / memberships | Campaign UUID; immutable Default flag; lifecycle; unique campaign/account membership; role, inviter UUID and ban status |
| Campaign revisions / aliases | Immutable published revisions, unique campaign/revision number; globally unique normalized campaign aliases, retained after rename; build names resolve through aliases plus revision |
| Characters / character versions | UUID, owner UUID, nullable campaign UUID, current version, source-character UUID, private/dead state; immutable version payload with schema version, timestamp and editor |
| Legacy imports | Unique source namespace + original identifier + source checksum mapped to UUID; retain original paths/IDs as provenance, not permissions |
| Assets | UUID, checksum, MIME/size, storage key and authorization through owning records; never expose storage paths |
| Audit events / outbox | Actual actor, effective context, scope, action, target/version, timestamp, reason, request ID; notifications reference authorized objects |
| Recovery manifests | Deletion timestamp, dependency inventory, versions/assets and restore state; created before enabling deletion |

Store the mechanical draft as versioned JSON so current rules/migrations stay reusable. Keep ownership, campaign membership, visibility, admission and approval outside that editable JSON. System approval badges are derived, not user-authored tags. Foreign keys restrict unintended deletion; ordinary record removal uses recoverable state transitions. Campaign fork/configuration UI follows in C01.

Existing eight-character IDs and browser UUIDs are not automatically trusted as server identities. An import preview assigns a new server UUID and records provenance. Repeated imports are idempotent by manifest key; conflicts produce a separate version or require an explicit choice, never silent overwrite. The local Default/Working IDs can be seeded directly. Unknown campaign IDs stay in import provenance until mapped to an authorized destination.

## Role and permission contract

The principal is resolved on every authoritative request, including session validity, account status and relevant membership. Guests have local drafts and, later, explicitly granted player-visible invite previews. They cannot enumerate server files.

| Role | Scope and capabilities |
| --- | --- |
| Player | Own editable drafts and proposals; view accessible non-private characters. No direct changes to admitted/locked versions |
| Campaign GM | Campaign configuration/review, approval/admission, private campaign content, death/restoration and campaign audit. May ban campaign Players and GMs they invited, not Campaign Administrators. No campaign rename or role escalation |
| Campaign Administrator | Campaign GM capabilities plus campaign rename and membership-role administration, including assigning Campaign Administrators |
| Site Administrator | Cross-campaign administration and audit, site bans/recovery; later explicit, reasoned Become GM mode |

A global user can be a Player in one campaign and GM in another. No separate View staff role until its visibility is decided. Normal campaign administration does not imply that the actor has become another account. Become GM must retain both real and effective identities, notifications and expiry.

Preserve a final active Site Administrator; self-demotion/ban cannot remove the only recovery authority. Bootstrap through a one-time local administrative command addressed to a verified account, recorded in audit; never make the first public signup an Administrator. Campaign role checks and inviter restrictions are tested as policies, not inferred from tag names.

## Accounts, sessions and MFA

Capture username and email at registration. Require verified email for shared membership and authoritative writes. Use library password hashing, verification/reset tokens and session handling; no bespoke password cryptography. Password change requires recent authentication, and reset/change revokes other sessions. Recovery endpoints return neutral responses with rate limits; tokens expire and cannot be reused. Email changes require verification of the replacement address. [Email/password reference](https://better-auth.com/docs/authentication/email-password)

Use database-backed sessions in HttpOnly cookies, Secure outside explicit loopback development, an explicit trusted origin, and library CSRF/origin protections. Do not store session tokens, password hashes or permissions in localStorage. Do not rely on a cached role cookie for bans or privileged authorization. Logout invalidates the server session and clears the active account's cached content.

TOTP plus recovery codes is the initial MFA choice. The library provides enrollment/verification and recovery-code features. H02 must prove incomplete enrollment, replay resistance, session invalidation and recovery behavior. Danger Zone later requires fresh server-verified MFA, not merely an enabled flag or a trusted-device login; proposed freshness is five minutes with action/session binding. Store the freshness proof server-side and consume it atomically with a destructive action. Enrollment/reset must not itself bypass that gate. [Two-factor documentation](https://better-auth.com/docs/plugins/2fa)

Use a `MailTransport` boundary: a local-only test inbox or loopback SMTP during development; SMTP/provider configuration later. Never log tokens in application/audit logs or expose a development inbox in accounts mode outside loopback. No real email is sent as part of H01. Durable notification outbox and delivery retries come with H03; auth callbacks must persist their delivery request before reporting success.

## Saving, conflicts and offline drafts

Guest localStorage keys and backup exports remain supported. Signed-in cache keys include account UUID and schema version. Never automatically upload or attach all guest drafts: show an explicit selection and campaign destination, then import through authorized services. A successful import must be acknowledged before changing local import status; do not delete the original guest draft.

Character writes carry expected version and an idempotency key. In one database transaction: recheck authority and expected version, create immutable version, advance current-version pointer, append event, and enqueue notifications. A stale version returns a conflict with only authorized metadata; the local candidate remains available. UI shows editor/timestamp and offers explicit reconciliation or copy; never silently overwrite the server version.

Offline edits remain browser-local with a visible warning until acknowledged. Admission, policy publication, bans and approvals require connectivity. Upon reconnection, revalidate access before syncing or displaying cached shared content. Logout/account switch clears account-scoped material; retain unsynced own work via an explicit backup option before clearing. Already delivered data cannot be remotely erased while a device is offline; cache only minimal shared data and avoid persisting GM-private records offline by default.

## Audit, recovery and retention

Minimum account/security audit plumbing is part of H02, before privileged account mutations. H03 extends transaction-coupled domain events, versions, outbox and restoration before campaign edits ship. Verify auth-library hooks against their actual transaction boundary: if audit cannot share the auth transaction, use a durable reconciliation mechanism and test crashes before enabling the relevant operation; do not label a best-effort callback atomic.

Expose no manual audit update/delete API. Database guards reject event updates; scheduled expiry deletes only eligible rows at event +24 calendar months. Application Site Administrators do not receive DB credentials. SQLite cannot defend against an operating-system owner rewriting the database; that limit must be explicit, and any later tamper-evidence/archive protection must not claim to prevent host-root modification.

Deleted content follows deletion time: readable recovery through month 6, compressed through month 18, warning/recovery through month 24, then purge. Audit expires on its own event clock. Use UTC calendar-month arithmetic with defined end-of-month clamping and boundary tests. Keep permanent purge disabled until restore tests, notification retries, backup expiry and recovery/purge races pass.

Backup through SQLite's online backup API or another documented consistent snapshot mechanism, accompanied by an asset manifest; copying a live DB file alone is not sufficient. Restore into an isolated temporary environment and verify referential integrity and blob checksums. Filesystem blobs are staged/checksummed before the DB references them; orphan cleanup follows a grace period. Restores apply an expiry ledger before serving data so old backups do not resurrect purged records. Snapshot retention and encryption-key handling must be settled before A03; compression alone is not backup. [SQLite backup documentation](https://sqlite.org/backup.html)

## Migration and delivery order

1. **H02a — dependency and persistence harness (next).** Pin compatible auth/Drizzle/SQLite packages; validate Node native-driver build and Next production bundling. Apply reviewed schema migrations only to a disposable database, repeat safely, test rollback-on-failure, constraints and consistent backup/restore. No existing file import yet.
2. **H02b — account lifecycle.** Registration/verification, login/logout, password change/reset, username/email uniqueness, session revocation, rate limiting, local mail harness and MFA. Include account/security audit and explicit bootstrap. Failures must not grant partial sessions or privileges.
3. **H02c — server policy and route cutover.** Implement the role matrix and negative cross-account/campaign/version/image tests. Prove accounts mode cannot fall back to unauthenticated file routes. Existing local-only mode remains usable during construction.
4. **H03a — shared versions/audit/outbox.** Transactional mutation service, optimistic concurrency and retry idempotency. Test duplicate requests, stale writers, lost responses, session revocation and full rollback if event/outbox insertion fails.
5. **H03b — import/cache/recovery.** Explicit filesystem migration dry-run, ownership mapping, temporary staging DB, source checksums and idempotent manifest; no source deletion. Guest selection, account isolation, offline conflict preservation and verified restore. Switch reads to DB only after migration reconciliation; no permanent dual-write mode.
6. Continue H04 invitations and C01 campaign revisions after their existing prerequisites. Destructive controls and automated expiry remain later gated work.

## Alternatives and remaining boundaries

Rejected: custom password/session implementation; tags or UUID secrecy as authorization; continuing mutable filesystem JSON as shared authority; first-signup admin; exposing server-private data and filtering client-side.

Deferred: remote host, SMTP provider, PostgreSQL/object storage deployment, social login/passkeys, standalone DM scope and View staff role. No user answer is required for H02a. Product decisions already recorded remain authoritative; five-minute MFA freshness and global alias uniqueness are engineering defaults to validate at their implementation boundary.

H01 acceptance: current boundaries inventoried; local-capable stack selected; permissions, identity migration, offline behavior, audit/retention limits and H02/H03 acceptance order documented. This ADR completes that architecture deliverable, not the security or persistence implementation.
