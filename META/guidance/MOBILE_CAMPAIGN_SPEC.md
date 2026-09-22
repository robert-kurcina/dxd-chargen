# Mobile character creation and campaign specification

Status: agreed product direction; implementation not yet started.
Branch: feature/mobile-campaign-design.
This document consolidates the product conversation. It supplements FINAL_PRODUCT_PLAN.md; canonical game mechanics remain sourced from vault-sarnalen/book-rewrite. Proposed engineering choices below are distinguished from settled behavior.

## 1. First delivery and navigation

Prioritize mobile character creation before hosted accounts and collaboration. Primary layout target is 480px width with continuous vertical scrolling and top-anchored controls where practical; remain responsive at other widths. Welcome new players and GMs. Campaign selection leads to activities: generate from a mechanical preset, explore maps, customize a character, or open Library. Persistent character navigation is Design / Profile / Sheet, with Campaign and Library above it. Preserve the active draft, selections, and navigation position across views. Profile is a readable illustrated summary; Sheet preserves the exact printable PDF handout presentation. Reuse lineage imagery and maps.

Start concepts with Profession and ancestry, allowing an Alef Wizard to be refined to a specific lineage such as Akrunai. These are concept choices, not permission to bypass rule dependencies. Mechanical presets can express Wizard > Necromancer and later specializations only when canonical eligibility permits; verify exact rank gates in the manuscript. Do not invent narrative archetypes or rename canonical traits without a separate decision.

Generate replaces unlocked choices on the current character. Every editable choice supports locking; derived values recalculate. Conflicting locks yield an explanation rather than silent alteration. Each generation is one undoable transaction; manual edits support undo/redo. Redo restores the same result rather than rolling again. Undo never bypasses current campaign restrictions.

Persistent history is optional and player-configurable, with serialized history strictly below 10 KB per character. Both section and individual-field locks are required. Proposed implementation: measure UTF-8 bytes, bound patches rather than full drafts, evict oldest history, and clearly indicate when an oversized action cannot persist across reload. Current draft storage is independent and must never be evicted to satisfy the history budget. Exact memory-history limits remain an engineering decision.

## 2. Existing implementation and preset discovery

- src/app/admin/global-panel.tsx and src/lib/admin-settings.ts: current global seed, deterministic sequence, and Library tags.
- src/app/admin/tests/page.tsx loads src/app/tests.tsx: current runtime diagnostics and dice smoke tools, not a complete saved-preset catalog.
- Git history of src/app/tests.tsx contains older generators. Inspect `git show 13c5a87^:src/app/tests.tsx`: trade/rank/count rows, contractor trade/rank, squad trade/average rank, and military formation generators. Commit 13c5a87 is the Tests/Info rewrite; later refactors also touched this file. These are source candidates, not proof of a complete reusable preset format.
- src/lib/rules/generate-step.ts: current step generation using nextGlobalRandom and canonical synchronization functions. Adapt this engine rather than restoring old mechanics wholesale.
- src/app/(workspace)/workspace-provider.tsx: shared draft/library state, localStorage hydration/autosave, filesystem save and load.
- src/app/(workspace)/workspace-views.tsx: Forge, Sheet, Library integration points.
- src/lib/character-draft.ts, character-library.ts, rules/finalization.ts: preserve migrations, structured state, and validation.
- src/app/character-library-panel.tsx: existing tag filters and filesystem Library presentation.

Inventory all historical generator inputs and map them to current catalogs before shipping presets. The user identifies the legacy Admin controls as the intended source; a ready-made current preset collection has not yet been found.

Broad Skills have skill level and specialization rank. The manuscript example Science 4 > Chemistry 2 gives +4 generally and an additional +2D when Chemistry applies. Expert has separate technical/nontechnical weapon entries; Trained covers its canonical armor/shield scope. Explain scope and specialization clearly and verify against book-rewrite/02_Master_Manuscript_Entries/03_Character_Creation.md and 04_Character_Options.md. Interdisciplinary electives are not Broad Skill specializations.

## 3. Campaigns, IDs, revisions, and policy

Use stable UUIDs for accounts, campaigns, revisions, characters, and other persisted entities. UUIDs are identifiers, not credentials. Human names, build labels, and aliases resolve to IDs.

Default Campaign is immutable, always first, cannot activate, and must be forked. Working Campaign initially forks Default and receives initial edits. Administrators create named campaigns from Default or existing campaigns; proposed fork semantics are independent snapshots. Player campaign listings reference available campaign IDs. Characters can remain in Default; GMs control assignable campaigns.

Campaign configuration covers tags, regions, settlements, species, lineages, trades, professions, and other options. Begin unrestricted within the canonical supported catalog. Tags organize presets and filters; membership, visibility, approval, and permissions must not be inferred solely from editable tags.

Administrators draft change sets, preview affected characters, and publish revisions. Players use the latest published revision only. Default build prefix is the campaign slug: the_folly_of_giants-0005. Changing prefix to folly affects future revisions; old published names remain. All historical prefixes are searchable aliases to the same campaign. Revision numbers continue across renames. Alias uniqueness scope must be specified before backend implementation.

Restriction modes:
- Allowed: selectable and valid.
- Disallowed going forward: unavailable for new selections/characters; existing choices are grandfathered through unrelated edits. Leaving that choice forfeits its grandfathering. New copies must satisfy current restrictions.
- Disallowed for everyone: retain existing data, report conflicts with warning or enforcement severity chosen by Administrator.

Warnings allow finalization; enforcement blocks readiness/finalization, but not editing, saving, or printing. Existing approval becomes Approved — changes required when applicable, without erasing the approved version. Track creation revision, validation revision, and grandfathering provenance. GM character lists show warning and blocker counts.

Map flow: Region > Settlement > Character, with selected origin carried into generation and locked. Disallow prevents selection but permits reading details. GM-private visibility overrides public readability: secret settlements, regions, NPCs, and other material must not be delivered to unauthorized clients.

## 4. Library, ownership, and lifecycle

Library shows accessible non-private campaign characters and the player's unassigned characters, with campaign/tag filtering. The latest direction excludes other players' private summaries (superseding the earlier visible-private-row proposal). Players edit their own eligible drafts and view others' non-private records. GMs/Administrators access private campaign characters. Do not expose variants without permission.

Assigning from Default creates a campaign copy with a new character ID and source-character link. Display Campaign copy, This is a copy, and Active in Campaign as appropriate. This differs from migration, which moves existing IDs.

Campaign lifecycle: Preparing > Active > Archived; reopening supported. Default cannot activate. Players may join later and edit until their character is admitted into an active campaign. GM actions: Approve, Admit, Approve and admit. Approval binds to an exact version and becomes Needs review after pre-admission edits. Admission requires active campaign and approval.

Admitted versions are locked, including presentation fields. Players experiment in a separate proposed change set; accepted version remains available. GM review accepts changes, comments, or requests correction. Character Approved is a system-managed filterable badge, not a user-editable permission tag.

Alive/Dead, approval, and active-roster state are separate. Campaign GMs mark death/restoration with a required reason and audit event. Death removes active-roster status while preserving sheet/history/approval. Do not automatically readmit on restoration without eligibility review.

## 5. Accounts, offline work, invitations, and messages

Guests use localStorage; signed-in users use local drafts plus cloud persistence. Capture email and username; provide account management, password change/reset/forgot-password, and appropriate authentication verification. Develop and run the web service locally. Authentication/persistence architecture must support this; remote provider and hosting decisions are deferred until deployment is requested. Provider/database choice remains open. Never store passwords or authoritative permissions in localStorage. Enforce access server-side.

Guest message: Create an account to save your character online and access it across devices. Currently, it is stored only in this browser on this machine. Clearing browser data may erase it.

Offer explicit selection of guest characters to import on sign-up. Offline edits continue with visible warning that drafts are only in this browser until synchronization succeeds and may be lost if browser data is cleared. Approvals, admission, and authoritative campaign operations require connectivity. Preserve conflicting versions with timestamps and last editor; no silent last-write-wins. Scope local caches by account and revoke unauthorized content on reconnection; offline revocation limitations require explicit implementation treatment.

Invite tab generates shareable Discord/email links. Default expiration: one hour or three successful authenticated joins, whichever comes first; configurable. Preview/open/link scanning does not consume a use. Valid invitations immediately permit guest preview of player-visible material only. Enforce usage atomically on the server and support revocation.

In-app interactions support newest-first messages/comments, unread/read state, and problem/resolved status. Daily email digests by default, configurable/disableable by recipients. Notifications link to authorized review screens. General standalone DM scope remains to be settled during messaging implementation. Security/takeover and Danger Zone actions require immediate in-app notifications; exact immediate email policy remains open.

## 6. Authority and auditing

Separate site Administrator authority from campaign membership roles. Confirmed roles are Player, campaign GM (formerly Edit), Campaign Administrator, and Site Administrator. Guest is an unauthenticated access state. A separate View staff permission remains unresolved and is not enabled. Campaign Administrators assign Administrators. GMs operate only in their own campaigns; site Administrators oversee all. Access logs: site Administrators across campaigns; GMs within their campaigns. Clarify View staff visibility before enabling that role.

Edit/GM has GM capabilities except campaign renaming and permission escalation. Later decisions explicitly permit full campaign-scoped Danger Zone, overriding earlier deletion/ejection exclusions. GMs may campaign-ban Players and GMs they invited, never campaign Administrators; site Administrators may site-ban accounts and reverse campaign bans. Preserve banned members' characters/history and mark characters inactive; revoke access and prevent rejoining.

Danger Zone requires MFA for both GMs and Administrators; notify other campaign GMs. Destructive actions remain recoverable during retention. Ordinary campaign deletion requires characters manually moved/deleted first; Danger Zone supports cascading deletion.

Administrator Become GM is temporary until exit. Notify the affected GM persistently while active; allow concurrent GM work with conflict detection. Record actual Administrator ID, effective GM context, reason, start/end, and each action. Never attribute takeover actions solely to the GM. Expiry/disconnect cleanup is required so abandoned sessions do not remain active indefinitely.

Audit application actions including membership, configuration, revisions, moderation, approval, admission, death/restoration, migration, recovery, and takeover. No manual log edits/deletes, including by Administrators. Logs automatically expire 24 months after event timestamp. Do not extend audit retention indefinitely. Do not log credentials/tokens or unnecessarily duplicate private content. Backend append-only controls and protected storage are needed; frontend restrictions alone are insufficient.

## 7. Retention, recovery, and migration

Deleted content retention runs from deletion:
- 0–6 months: readily recoverable.
- 6–18 months: compressed, recoverable.
- 18–24 months: pending-deletion warning period, recoverable.
- At 24 months: permanent automatic deletion unless recovered.

Active content is not deleted merely because it is old. Audit retention runs separately from event creation. Notify responsible GM and Administrator at month 18 and 30/7/1 days before purge. Notification links show inventory/dependencies and recovery action. Coordinate archives/backups with retention; compression is not a backup. Restoration must be tested.

Recover into Recovered-foo campaign in Preparing, invitations disabled and no active roster (proposed safe defaults). Preserve provenance and label records Recovered with date/source. Existing GUID collision creates a recovered version with its own version ID, never overwrites the current version. Restore related records together. Permission checks apply even to deletion previews.

Migrate to Campaign chooses destination and previews ownership/access changes, duplicates, and rule conflicts. Requires GM/Administrator authority in both campaigns; site Administrator can override. Move IDs/history rather than copy; operation is atomic. Conflicts may remain as flags, but characters stay inactive until corrected and destination-approved. Preserve prior approvals as history, not destination admission authority.

## 8. Phased backlog and acceptance gates

The [execution plan](MOBILE_CAMPAIGN_PLAN.md) is the current task/status authority and refines this high-level ordering. Audit and recovery foundations precede shared mutations and destructive controls.

### Phase 1 — Mobile design and local experimentation (first delivery)

1. Inventory legacy Admin generators from Git and current rules; produce sourced preset mapping with unsupported options flagged.
2. Introduce versioned campaign/preset identity contracts and local Default/Working Campaign fixtures without claiming secure multiuser permissions.
3. Build campaign/activity entry and Design/Profile/Sheet navigation; integrate existing illustration assets and exact print sheet.
4. Implement preset-driven generation as one transaction with input locks, deterministic results, dependency validation, and conflict explanations.
5. Add undo/redo, optional sub-10-KB persisted history, storage-failure handling, offline/guest messaging, and draft migrations.
6. Add map-origin entry and local campaign/tag filters; make scope/specializations understandable without changing rules.

Acceptance: at the primary 480px width and narrower responsive widths creation controls are usable without horizontal scrolling; PDF preview may pan/zoom. Keyboard/focus navigation works. Tab changes preserve character and position. Generate/undo/redo round-trips complete state and locks. Oversized history never loses current draft. Reload restores retained history. Unavailable origins cannot be generated. Legacy drafts import. Existing printed layout stays stable. Run data validation, typecheck, production build, and focused behavioral tests for generation/history/migrations.

### Phase 2 — Accounts and shared persistence

Choose hosting/auth/database, define migrations and UUID/alias constraints, implement account recovery/MFA, ownership, guest import, cloud synchronization, invite joins, campaign-scoped authorization, conflict UI, and protected content delivery. Security-sensitive shared features do not ship on client-only permissions.

Acceptance: cross-account and cross-campaign access tests; invite expiry/use races; anonymous secret-content exclusion; offline conflict preservation; logout/account-switch cache isolation; failed local writes produce warnings rather than false saved status.

### Phase 3 — Campaign revisions and play admission

Implement campaign editor, mechanical preset tags, published revisions/aliases, grandfathering, compliance counts, copy-to-campaign, exact-version approval/admission, proposed changes, death/restoration, and campaign lifecycle.

Acceptance: policies distinguish existing/new choices; changing approval-bound draft invalidates approval; all mutation paths enforce locks and server permissions; inactive/conflicted copies cannot enter play.

### Phase 4 — Collaboration and moderation

Add review comments/inbox, daily digests, staff roles, bans, MFA Danger Zone, temporary Administrator takeover, and audit UI/storage. Audit foundation must precede authoritative mutations in earlier phases; this phase completes its product interface.

Acceptance: inviter-limited GM bans, Administrator protection, takeover attribution/concurrency, notification authorization, MFA enforcement, no log-update/delete API.

### Phase 5 — Recovery and retention operations

Ship deletion inventories, recoverable cascades, compressed archives, reminder scheduling, Recovered campaigns/version collision handling, atomic migration, and 24-month expiry for content/logs on their separate clocks. Recoverability must exist before destructive features are enabled; scheduled compression/purge can follow after restore tests.

Acceptance: test exact retention boundaries, notification retries, recovery-vs-purge races, complete dependency restores, failed migration rollback, duplicate GUID recovery, authorization in both campaigns, and retained live records. Permanent deletion remains disabled until retention and backup handling are verified.

## 9. Open engineering decisions (not blockers for the specification)

Hosting, authentication provider, cloud database/object storage, transaction model, canonical alias namespace, precise persisted-history behavior for oversized actions, and standalone DM scope require implementation evaluation. No cloud service, SQLite choice, credential system, or deployment has been selected by this document. Implementation must not imply that accounts, campaign security, or recovery already exist.
