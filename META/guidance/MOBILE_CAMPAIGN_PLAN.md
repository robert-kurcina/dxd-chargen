# Mobile creation and campaigns: execution plan

Planning baseline: 2026-09-21. Branch: `feature/mobile-campaign-design`.
Product requirements: [MOBILE_CAMPAIGN_SPEC.md](MOBILE_CAMPAIGN_SPEC.md).
This is the execution/status authority for this feature. The specification governs behavior; canonical manuscripts govern game mechanics. This plan refines the specification's phase ordering, especially auditing before shared mutations and recovery before destructive controls.

## Outcome and scope

First release: a player can choose a mechanical concept, generate a detailed character, lock preferred choices, experiment safely, and move between Design, Profile, and the exact printable Sheet on a phone. Reuse the current rules, data, images, draft schema, and print rendering. Do not make the first release wait for the full administration platform.

First release is local-first. Default and Working Campaign supply context; shared ownership, private hosted content, approval, and invitations require the later server foundation. Do not present local role controls as secure multiuser authorization. Existing save/export must remain usable throughout.

## Status contract

| State | Meaning | Transition rule |
| --- | --- | --- |
| TODO | Accepted work, not started | Start only after prerequisites are met; move to WIP |
| WIP | Actively being executed | Record owner, scope, and next checkpoint; finish or explicitly return to TODO/DEFERRED |
| DONE | Deliverable exists and its acceptance checks passed | Link evidence; partial implementation is not DONE |
| REJECTED | Approach deliberately excluded | Retain reason; reopen only after an explicit decision |
| DEFERRED | Desired work outside the current delivery | Record dependency or condition that brings it into TODO |

Current checkpoint: T01–T08 technical implementation and automated release verification are DONE. Personal review is DEFERRED at the user's request; the user has explicitly authorized PR creation, push and merge. R1 technical gates pass within the browser/device limitations below. H01 and H02a are DONE; H02 remains WIP. H02b lifecycle, MFA enrollment/recovery and persistent encrypted local mail checks pass; operation journaling and transaction-coupled auth mutation evidence pass fault/concurrency tests. Next checkpoint is remaining MFA/session policies and delivery/reconciliation workflows. Default owner for execution is the implementing agent; product decisions belong to the user. Keep at most one main implementation work item WIP at a time.

## Priority order

1. P0: verify existing behavior, inventory real presets, protect saved characters.
2. P1: deliver the local mobile creation loop, including reversible generation.
3. P2: establish hosted identities, authorization, audit, and recovery foundations before shared campaign behavior.
4. P3: deliver campaign policy, approval, collaboration, and moderation on that foundation.
5. P4: finish administrative takeover, archive automation, and retention operations; permanent purge stays disabled until verified.

Do not prioritize broad infrastructure configuration or cosmetic redesign above a working creation loop. Do not enable destructive features before reliable restoration.

## DONE — planning evidence

| ID | Deliverable | Evidence |
| --- | --- | --- |
| D01 | Feature branch created | `feature/mobile-campaign-design`; existing staged changes preserved |
| D02 | Product specification consolidated | `MOBILE_CAMPAIGN_SPEC.md` |
| D03 | Initial implementation/source reconnaissance | Current Admin seed/tag controls, diagnostic page, workspace provider and generation engine identified in specification section 2 |
| D04 | Historical Admin generator location found | `git show 13c5a87^:src/app/tests.tsx`; input inventory still TODO, not complete |
| D05 | Prior build health restored | Earlier session: data validation, typecheck and production build passed; asset tracing warning resolved. This is historical evidence, not a new branch regression run |
| D06 | Prioritized status plan established | This document; linked from guidance index |
| T01 / P0 | Baseline and preset inventory | [Source mapping and measured findings](MOBILE_PRESET_INVENTORY.md); twelve route/viewport checks at 480/360/768/1440px; profile and loaded-character/print references in `/private/tmp/dxd-mobile-baseline/` |

## DONE — immediate mobile defect correction

M01: User-reported heavy mobile header and clipped/obstructed buttons fixed ahead of T02. Compact progress/reset/menu row replaces large mobile title/version header; navigation opener is inline, dialog uses a portal, and step actions scroll with the form. Development indicator disabled to avoid covering controls. This is a focused correction, not completion of T04's full navigation redesign.

Validation: `npm run check` passed. Headless Chrome at 320/360/480/768/1440px: no page-width overflow, Continue fully visible and unobstructed; mobile menu > Character summary > Escape and Continue step transition passed. At 480px combined pinned header height reduced from 162 to 118px (second row 106 to 62px). Screenshots and results: `/private/tmp/dxd-mobile-baseline/*-header-fixed-scrolled.png` and `header-check.json`. Physical mobile browsers remain untested.

## DONE — navigation trial (T04 subset)

User requested trying the recommended mobile menu plus bottom navigation. Implemented compact top menu/name/file status/Save, Library/Admin/Reset in menu, direct Design/Profile/Sheet navigation, per-view scroll positions, and shared editor state. Reserved bottom-bar space protects form actions and embedded sheet. Campaign menu entry remains deferred until campaigns exist. Steps is labeled distinctly from the workspace menu. User accepted this navigation direction. Full T04 and R1 are not complete.

Validation: data/type/build checks passed; Chrome at 320/480/768/1440px verified Profile navigation, retained selected step, menu/Library, Sheet clearance and unobstructed Continue. Checks repeated successfully after final scroll/label refinement. Screenshots in `/private/tmp/dxd-mobile-baseline/trial-*-480.png`.

## DONE — T02/T03 state and history foundation

- T02: [State contract](MOBILE_STATE_CONTRACT.md) defines identity, normalized edit transactions, patch persistence, input-lock invariants, and future generation RNG ownership. Campaign/preset runtime schemas and actual locks remain in their integration tasks; they are not shipped features.
- T03: `src/lib/draft-history.ts` and WorkspaceProvider integrate atomic normalized edits, Undo/Redo, optional persistent history strictly below 10,000 UTF-8 bytes per local character, contiguous pruning, stale-history rejection, and a 50-action memory cap. Switching files uses separate local entries. Loading a different version is a history boundary. Reset retains existing new-character semantics and starts a new history.
- Quota/storage failures retain edits in memory and show warnings. Unreadable stored drafts are not overwritten by automatic saving. Async save/revert results cannot overwrite newer/current-character edits. Message feedback is visible on mobile.
- Verification: six pure history tests pass (`node --test scripts/draft-history.test.mjs`). `npm run check` passes. Browser tests pass for grouped generation undo/redo, reload and cross-view history, byte budget, preference opt-out, file-load isolation, quota errors, unreadable storage, and delayed-save edit/identity preservation. Headless Chrome at 480px, fresh profiles; no physical mobile-device claim.
- Reproducible browser checks: start the local service on 127.0.0.1:3000; run `node scripts/workspace-history.browser.mjs` , `node scripts/workspace-storage.browser.mjs`, and `node scripts/workspace-save-race.browser.mjs` with Playwright available. If installed outside this repository, set `DXD_PLAYWRIGHT_MODULE` to its importable module path. Tests use installed Chrome, disposable browser profiles, and read-only loads of existing Library records; the storage test requires at least one record. They do not save character files.
- Historical T03 boundary, resolved by T05: Forge generation now uses per-character transaction-owned random state; failed generation consumes no persisted random state and redo restores recorded output.

## DONE — T04 local campaign and activity entry

First-time empty sessions enter `/campaigns`; existing drafts retain their current route. Default (first, immutable/non-activatable) and Working (derived from Default) have stable UUIDs. Selection is a preference, not a move of an existing character. Activities create a separate draft, explore regions/settlements, or open Library. Local browser drafts remain reopenable with their history; Library filters both browser and filesystem records by campaign. Missing legacy campaign IDs count as Default/unassigned. New optional draft metadata persists campaign identity; no schema-11 data rewrite or automatic file migration.

`/maps` reuses current region/settlement and overland controls on a scratch draft. Creating from that origin makes a separate character. T05 now locks origins selected here. Campaign option restrictions remain T07/C01 work. No fake preset button, cloud permissions, public accounts, or Administrator editor was introduced. Static local campaign fixtures are not a multiuser security boundary.

Evidence: `npm run check` passed. `scripts/workspace-campaigns.browser.mjs` verifies fresh-session entry, selection without reassignment, distinct character identity, campaign filtering, reopening history, map exploration without editing the active draft, and 320/480/768/1440px widths. Existing history/storage/delayed-save browser regressions also pass. Temporary screenshot: `/private/tmp/dxd-mobile-baseline/campaigns-480.png`.

## DONE — T05 presets, locks and owned randomness

- `src/lib/rules/preset-generation.ts`: 12 catalog Trade presets plus Wizard > Necromancer, stable UUIDs, versioned creation metadata, tag filtering, selectable ancestry/lineage constraints, bounded candidacy search, and native roll/array/75-point-buy methods. Rank 1 is explicit; no unverified high-rank Spellcaster entitlement.
- Collapsible Design controls expose a mechanical preset, optional Ancestral Group/Lineage, Spin character, and section/field locks. Locks govern generated inputs; explicit manual edits remain possible. Derived attributes, language levels and physical projections recalculate. Origin exploration creates a separately identified draft with Region/Settlement locked.
- One spin replaces generated selections in a fresh candidate and commits one normalized history action. Character identity, campaign, notes, portraits, relationships and possessions remain. Spells/gear are not randomly awarded; the UI asks the player to review remaining Design steps. Imported attribute mode and locked Child of Strife configurations return explicit unsupported-preset explanations rather than inventing rules.
- Presets and existing Forge random controls use an injected per-character random stream. The initial seed combines the local character UUID and Administrator seed default. Later Administrator resets do not alter existing character streams. Failed operations preserve draft/history/sequence; Undo/Redo restores the recorded draft and owned sequence. No-op generation consumes no persisted randomness.
- Eligibility is an explicit generator predicate, tested with excluded candidates. Current Default/Working fixtures allow everything; configurable hosted campaign policies and server enforcement are still C01/H02 work, not supplied by this predicate.
- Evidence: `scripts/preset-generation.test.mjs` plus history tests cover catalog/seed sampling, determinism, native methods, all section locks, partial array/point-buy locks, language projections, normalized conflicts, eligibility, no-op generation and thrown callbacks. `scripts/workspace-presets.browser.mjs` covers Alef/Akrunai Necromancer, exact undo/redo, no shared RNG writes, locks/conflicts/reload, and 320/480/768/1440px controls. Existing history/campaign/storage/save-race browser checks pass. `npm run check` validates data, standalone TypeScript and production build. Tests use disposable browser profiles and do not save character files. Physical mobile/Safari and complete print/export gates remain T08.

## DONE — T06 concept-to-character flow

- Generated drafts offer direct links to Profile and the printable Sheet. Profile places unresolved required steps and their existing rule messages near the top, with explicit name/portrait editing and printable-sheet controls. No new completion or approval rules are introduced.
- Review actions open the correct Design step, scroll it into view below the header, and focus its heading for keyboard use. Existing Design/Profile shared state, manual/non-preset editing, undo/redo and the exact handout rendering remain intact.
- Profile exposes labeled lineage/group reference examples from the existing catalog images. These are separate from the player's portrait; shared filename mappings keep the editor and Profile consistent. Missing images use the existing unavailable state.
- Evidence: `scripts/workspace-creation-flow.browser.mjs` verifies Alef > Akrunai / Wizard > Necromancer generation, actual reference-image loading, keyboard review navigation, name editing, exact undo/redo, current draft propagation to the unchanged sheet, and an actual PDF download with two pages. Profile has no horizontal overflow at 320/480/768/1440px. The test uses a disposable browser and never saves character files. `npm run check` passes. Full print comparison, import/export round-trip, physical mobile browsers and user review remain T08.

## DONE — T07 Maps, Library and terminology

- Library shares campaign and exact, case-insensitive tag filters across browser drafts and saved files. Unassigned-only filtering and explicit labels distinguish legacy/unassigned characters from known campaigns; unknown campaign IDs are labeled Other campaign. Browser storage is not an ownership claim.
- Settlement Disallow tags are consumed by Design selectors, map-origin creation, preset eligibility and the normalized edit boundary. Existing origins remain usable under prospective restrictions; Explore origins retains readable maps/details. Current local fixtures deliberately have empty policies and allow everything. Configurable policy editing, published revisions, retroactive compliance and server authorization remain C01/H02/H03.
- Collapsible help in Granted and Additional Skills explains skill level, specialization rank, Expert versus Technical Expert, and Trained armor/shield scope without renaming catalog identities or changing mechanics. Canonical sources: `vault-sarnalen/book-rewrite/02_Master_Manuscript_Entries/03_Character_Creation.md`, Broad Skills (Science 4 > Chemistry 2 and Trained categories), and `05_Wealth_Equipment_and_Property.md`, standard/technical weapon proficiency requirements.
- Evidence: `scripts/campaign-origins.test.mjs` tests injected Disallow policies, preserved existing origins/readable catalog data, actual preset rejection and combined filtering. All 23 origin/preset/history tests pass. `scripts/workspace-library-context.browser.mjs` verifies shared filters with mocked saved-file responses and disposable local drafts, mobile skill help and 320/480/768/1440px widths. Campaign navigation and complete creation-to-two-page-PDF browser regressions pass. `npm run check` passes data validation, TypeScript and production build. Browser tests do not modify saved character files. Policy UI configuration is not claimed by these tests.

## DONE — T08 technical release verification (personal review deferred)

- Added `scripts/character-storage-roundtrip.test.mjs`: all 13 presets preserve persisted JSON, campaign identity, generation seed/sequence/locks, Unicode notes, tags and sheet projection through actual storage normalization and load migration. A temporary-file test verifies Library maintenance leaves current Forge drafts unchanged and legacy alias repair still runs.
- Found and fixed a release regression: historical import normalization was applied to current Forge drafts during save and Library maintenance. It moved some generated Mariner gear to Notes and could apply name-based legacy overrides. Drafts with versioned `creation` metadata now bypass historical repairs after schema migration. Older drafts without that metadata retain the existing import path; this is not a general rewrite of legacy migration.
- Validation: 23 existing origin/preset/history tests and 15 storage/backup tests pass (38 total). `npm run check` passes all 79 JSON files, standalone TypeScript and production build. Creation/Profile/keyboard/undo/redo/PDF browser regression passes at the existing responsive widths.
- Print source comparison against merged baseline `926b07ccb471b61d55b7235f8db18209dc4546da`: no differences in `public/character-creator`, `src/lib/browser-pdf.ts`, or `src/app/expanded-character-sheet.tsx`. Actual PDF output has two pages. `scripts/handout-baseline.browser.mjs` additionally compares both rendered sides using a generated Necromancer and long notes: pixel-identical to that baseline. Current front/back artifacts were visually inspected in `/private/tmp/dxd-handout-comparison`. Physical printer/Safari testing remains unperformed.
- Workspace menu now downloads the version-1 Forge backup envelope and imports it as a separate browser copy, retaining campaign, generation settings, locks and authored data. Source file identity is detached, preserving existing files on subsequent Save; undo history is excluded. The import rejects unsupported formats, future schemas, incomplete drafts and unreadable JSON. File input is capped at 20 MB. The standalone Sheet JSON projection is not this backup format.
- `scripts/workspace-backup.browser.mjs` passes actual download/import, reload, invalid-input preservation, detached Save and responsive menu checks. Final history, presets, delayed-save, campaigns, Library context, storage failure, creation-to-two-page-PDF and 20-marker regressions all pass. Storage failure tests now use mocked file responses instead of requiring an existing Library record.
- Remaining limits: desktop Chrome emulation at 320/480/768/1440px, not physical iOS/Android or Safari; print comparison is representative rather than exhaustive; eight map markers have no regional artwork and show an explicit unavailable state. Current campaign fixtures allow all origins; configurable/server policy and ownership remain later work. Personal review is deferred, not represented as completed.
- This item covers technical release verification. Personal review has moved to R01 below to reflect the user's explicit instruction to continue and merge without waiting for review.


## DONE — H01 local account/persistence architecture

[ADR H01](LOCAL_ACCOUNT_ARCHITECTURE.md) inventories the current browser Admin preferences and unprotected filesystem routes; selects SQLite/Drizzle/Better Auth for local development; defines server authorization, UUID/legacy migration, account lifecycle, offline cache isolation, audit/recovery and implementation gates. Official library/SQLite sources and the installed Next.js auth guide were checked. This is documentation only: no packages installed, accounts enabled or character data migrated.

## DONE — H02a dependency and persistence harness

[Compatibility evidence and commands](LOCAL_DATABASE_HARNESS.md). Pinned local auth/SQLite dependencies, generated/reviewed auth and plugin migrations, server-only explicit connection factory, disposable migration/constraint/rollback/backup tests, and an isolated Next production-bundle execution test. No auth routes or live migrations are enabled. Existing Next/sharp advisories and the schema-tool esbuild advisory were cleared. Account lifecycle, security audit and route authorization remain H02b/H02c.

## TODO / WIP — next delivery

Execute in ID order except where dependencies explicitly allow otherwise. Acceptance is per item; release requires all R1 gates.

| ID / priority | Deliverable | Depends on | Acceptance / evidence |
| --- | --- | --- | --- |
| H02 / P2 | Accounts and server authorization (WIP); next H02b local mail/account lifecycle | H01 | Follow the staged acceptance gates in [local account architecture](LOCAL_ACCOUNT_ARCHITECTURE.md); account/security audit precedes privileged mutations |

### R1 release gates

- A valid supported preset produces a coherent detailed character or explicitly identifies missing canonical decisions; no invented spell entitlement or rank gate.
- Lock invariants and generated-state undo/redo pass; navigation never forks or discards the active draft accidentally.
- Persistent undo footprint is below the agreed byte cap; exceeding it degrades history persistence transparently, never current-character persistence.
- Library/print/export and existing draft migrations remain intact.
- Responsive profile and design work on a phone; exact handout layout remains unchanged.
- Generation may be shown on a development branch before completion, but R1 is not marked DONE until these gates pass.

## DEFERRED — accepted later deliveries

Deferred means accepted but not current WIP. Promote individual rows to TODO when prerequisites pass; keep IDs stable.

| ID / priority | Deliverable | Promotion prerequisite / exit gate |
| --- | --- | --- |
| R01 | Personal review and physical-device feedback | User resumes review; no block on the explicitly authorized merge |
| H03 / P2 | Shared persistence, audit and recovery foundations | H02. Account-scoped caches, optimistic version checks, conflict versions with timestamp/editor, guest import selection, unauthorized-data exclusion, append-only events, recoverable version/deletion records and tested backups. Every authoritative mutation emits an attributable event. Set 24-month log-expiry contract now |
| H04 / P2 | Membership and invitations | H02–H03. One-hour/three-successful-joins defaults, immediate authorized guest preview, atomic usage consumption, expiration/revocation, no use consumption by link scanners |
| C01 / P3 | Campaign configuration and revisions | H03. Immutable Default, forks, Working, UUIDs/aliases/build numbering, private draft/publish, latest revision, policy differences for existing/new choices, compliance counts and historical provenance |
| C02 / P3 | Admission and character proposals | C01. Default-to-campaign copy, approved-version binding, edits invalidate pending approval, active-only admission, locked accepted version with editable proposal, dead/restored with reason, Preparing/Active/Archived/reopen |
| C03 / P3 | Review inbox and daily digest | H03, C02. Review comments, newest-first, read/unread, problem/resolved, recipient preferences and authorized links. Decide general DM scope separately |
| C04 / P3 | Campaign bans and staff controls | H02–H04, C03. Inviter-limited GM-to-GM bans, protected Administrators, campaign/site scope, inactive preserved characters, audit and notifications |
| C05 / P3 | Recovery UI and atomic migration | H03, C01–C02. Deleted inventory, Recovered campaign, labeled recovered versions on GUID collision, permission in both campaigns, move IDs/history, conflicts retained inactive, rollback and recovery-vs-purge race tests |
| C06 / P3 | Full campaign Danger Zone | C03–C05. MFA for GMs/Admins, required reasons, notifications to other GMs, deletion dependency preview, recoverable cascades. Gate all destructive controls on demonstrated restore success |
| A01 / P4 | Administrator Become GM | H02–H03, C03. Actual/effective actor audit, required reason, temporary mode, persistent notice, concurrent editing and safe session expiry/exit |
| A02 / P4 | Compression and deletion notification scheduler | C05–C06. Deleted content: 0–6 months readily recoverable; 6–18 compressed; 18–24 pending purge. Notify at month 18 and 30/7/1 days before purge, with idempotent delivery/retries |
| A03 / P4 | Automated permanent expiry | A02 plus restore tests and backup-retention verification. Purge deleted content at deletion+24 months unless recovered; audit at event+24 months. Active content unaffected. No manual log edit/delete; verify time boundaries and competing recovery |
| X01 | Bulk NPC/formation generation | R1 accepted and explicit prioritization; historical formation tools inform presets but bulk output is not required for first character loop |
| X02 | Canonical skill renaming | Separate canon decision; initial implementation explains existing terms rather than changing saved identities or mechanics |

## REJECTED — approaches not to implement

| ID | Approach | Reason |
| --- | --- | --- |
| J01 | Account/platform overhaul before local mobile creation | User selected creation experience as first delivery |
| J02 | Tags or human-readable names as authorization/identity | Stable UUID relationships and server permissions are required |
| J03 | Silent last-write-wins, generated partial mutations, automatic lock changes | User requires experimentation, conflict preservation and undo/redo |
| J04 | Reflow printable sheet into the mobile editor | Sheet is the exact PDF handout; Profile/Design are responsive views |
| J05 | Approve/admit through a freely editable tag | Approval binds to a version and requires authorized action |
| J06 | Indefinite audit retention or manual audit deletion | Latest explicit decision: immutable logs automatically expire at 24 months |
| J07 | Permanently delete before recovery and notifications exist | Recovery, review period and MFA are requirements |
| J08 | Restore legacy generator logic wholesale | Historical controls may use outdated rules; map to current canonical runtime |
| J09 | Make players implement every step before seeing a generated character | User wants preset > spin > adjust > edit |

## Confirmed implementation decisions

- Undo history budget is per character, not per library. Keep it strictly below 10 KB serialized; current draft storage is separate.
- Both section and individual editable-field locks are required. Derived values recalculate.
- Primary responsive target: 480px wide with vertical document scrolling; anchor controls to the top when practical. Check narrower widths as regressions, not as a different product target.
- Development is a local web service. Remote hosting and deployment are deferred; do not ask for Firebase or choose a remote provider as an early dependency.
- Confirmed roles: Player, campaign GM, Campaign Administrator, Site Administrator. Guest is unauthenticated access, not a staff role. Earlier Edit corresponds to GM. Separate View staff permissions remain unresolved and must not be enabled or inferred as access to GM-private material.

## Remaining decisions at implementation boundaries

No product answer is required to begin the H02b local mail and account-lifecycle harness. Keep Rank 1 presets separate from unverified higher-rank specialization. Broader account, storage and read-only staff decisions remain deferred to their respective items.

## Updating this plan

On starting an item, move it to WIP and record scope/next checkpoint. On completion, move it to DONE with code/document links and exact validation evidence. Keep rejected alternatives and deferred dependencies visible. New user decisions update both the relevant specification section and this board. Do not treat a passing build as proof of mobile usability, security, successful email delivery, or recovery correctness.

## Next action

Continue H02b from the verified loopback mail/lifecycle harness: implement MFA tests and durable security-event/delivery handling before privileged account mutations. Keep account routes unexposed until verification, session, MFA and authorization gates are satisfied. Existing local file behavior remains intact until H02c/H03 cutover.
