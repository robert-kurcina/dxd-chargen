# Canon Sync v109 — Repository Structure

v109 is a repository-organization release. It does not change Sarna Len / DXD rules, catalogue semantics, CharacterDraft schema, or character-generation behavior.

## Meta consolidation

- Moved `CANON_SYNC_v98.md` through `CANON_SYNC_v108.md` from the project root into `META/`.
- Added this `CANON_SYNC_v109.md` to the same lineage.
- Moved the LLM/development-oriented `blueprint.md` and `FINAL_PRODUCT_PLAN.md` from `docs/` into `META/`.
- Added `META/README.md` to distinguish maintainer/LLM meta material from player/runtime data and release records.

## Script consolidation

- Moved `run-local.sh` and `run-local.cmd` from the project root into `scripts/`.
- Added `scripts/run-local.mjs` as the cross-platform launch implementation.
- `package.json` now exposes `npm run local` -> `node scripts/run-local.mjs`.
- `validate:data` continues to resolve through `scripts/validate-data.mjs`.

## Documentation boundaries

- `META/`: canon-sync history, implementation architecture, LLM/development instructions.
- `docs/`: release notes, data-integrity notes, validation records.
- `scripts/`: executable launch/validation utilities.
- `src/data/`: runtime/static game catalogues.

## Compatibility

No CharacterDraft migration is required. Existing v108 browser-local characters remain compatible because only repository paths and maintainer documentation changed.
