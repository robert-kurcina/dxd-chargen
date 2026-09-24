# T02 — character editing and generation contract

Status: DONE (design contract). Implementation tracked under T03/T05 in MOBILE_CAMPAIGN_PLAN.md.

## Identity and migration

CharacterDraft already has characterId; preserve it. Native unsaved drafts already receive a UUID local-library entry ID before history. Use that stable local identity until filesystem identity is assigned; do not silently rewrite legacy filesystem IDs. History uses the stable local-library entry ID; file-backed entries map deterministically from characterId (or filename fallback for legacy records). Loading a different character creates/selects its own local entry; never attach its history to the previous active character. Historical variants of the same character may reuse characterId but must not reuse history unless their exact content matches its saved head. Explicit imports/copies get new identities where existing APIs require them. File paths remain transport references, not identity.

Keep history separate from CharacterDraft and exported game data. Existing schema-11 drafts remain importable. Campaign/revision/preset IDs will live in versioned creation context; introducing UI-only history does not require pretending campaigns exist.

## Transaction

An edit has one before state, one candidate, one normalized result and an action label. Evaluate updater functions once, outside React state-updater callbacks that React may repeat. Normalize before recording so undo reverses all dependent changes together. Ignore updatedAt for change detection; undo/redo timestamps record the action time rather than reverting clocks. No-op edits do not create history. New edits clear redo. Loading/importing another version is a history boundary, not an edit of the previous character.

Manual edits, reset of the current character, and later whole-character generation are transactions. Creating a genuinely new character is an identity change, not a reset transaction. Do not alter the current reset/new semantics silently while building the history foundation.

## Locks and generation (T05 integration)

Lock editable inputs by registered paths; a section lock expands to its editable input paths. Derived projections are never independently locked. A preset is a versioned set of catalog-backed input assignments plus generation policy and tags. User locks take precedence; incompatible preset assignments produce a conflict before mutation.

Generate on a cloned candidate with explicit seeded RNG; no localStorage/global-sequence writes inside pure generation or normalization. Capture starting random state and commit ending state only with successful generation. Failed attempts discard draft and random-state changes. Redo applies recorded output, never executes generation again. Do not rewind shared Administrator randomness on user undo; transaction-owned random state avoids rewinding other characters' streams.

Use canonical dependency order: concept constraints, origin/species/age, heritage, legal attributes/trade/rank, grants/skills/languages, physical projections, approved utilities. Existing generateStep is a source of logic, not a sufficient whole-character algorithm. It must accept an injected RNG before whole-character reuse. Validate locked inputs after normalization: if an upstream change would alter them, fail with explanatory conflict. Generation must not invent spell/magic-item entitlement or infer unverified rank gates.

## History budget and persistence

Per-character persistent undo/redo is optional and strictly less than 10,000 UTF-8 bytes, including envelope metadata. This conservative decimal cap satisfies the user's less-than-10-KB limit. Default persistence on; user can disable it. In-memory history has a bounded number of actions independent of persistence.

Store reversible JSON patches rather than complete portraits/drafts for each entry. Preserve explicit absent-versus-null values. Retain a contiguous chain nearest the current head; truncate distant history first. Oversized nearest action may leave no persistable history, but remains available in memory. Inform users when reload history is shorter. Never truncate the current character to meet the history budget.

Bind persisted history to character ID and current-content fingerprint. Invalid format, oversized envelopes, unsafe paths or stale content discard history only. Patch application checks expected current values, including key existence, before returning any candidate. Normalization changes after reload invalidate history if results differ, rather than replaying outdated rules.

Write current drafts separately from history; failed writes must visibly state that changes remain only in memory. If draft save succeeds but history write fails, say so distinctly. Browser-close warnings should not falsely assert online persistence. Capture quota and unavailable-storage failures. Catch async filesystem save/load errors and retain draft/history.

## Verification matrix

- Multi-field normalized edit undoes/redoes all changes as one action.
- No-op is ignored; new edit after undo clears redo.
- Arrays, added/removed optional values and Unicode round-trip.
- Oversized portrait action cannot exceed persisted budget or corrupt current draft.
- Current-head mismatch and malformed/tampered patch are rejected without partial application.
- Different character/version does not inherit history; optional preference survives reload.
- Browser storage failure preserves in-memory edits and exposes an error.
- UI undo/redo works across Design/Profile/Sheet without changing file-save confirmation behavior.

## Sequence

T03 first implements and tests reusable reversible state/persistence primitives, then integrates identity boundaries and controls into WorkspaceProvider. T05 converts random generation to injected transaction RNG and adds locks/presets. Existing random step behavior must not be described as transactionally safe until that conversion passes tests.

## T05 implementation evidence (2026-09-24)

Creation metadata is optional in schema 11: version, preset UUID, registered lock paths,
seed and sequence. It travels with the local draft and its undo history. Section locks
expand into field paths; attribute locks retain rolls/player adjustments, and language
locks retain authored non-default choices while allowing calculated levels to change.
Default languages follow origin. Notes, portraits, relationships and possessions are
retained by presets; spells and equipment still require review. Manual edits can change
locked inputs deliberately. Native generation uses the selected method; imported
attributes require an explicit method change before preset replacement.

See `scripts/preset-generation.test.mjs` and `scripts/workspace-presets.browser.mjs`.
Forge no longer advances the shared Administrator sequence. The Administrator seed is
captured when a character stream is created; existing streams are stable thereafter.
