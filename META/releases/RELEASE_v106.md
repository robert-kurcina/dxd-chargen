# DXD Character Forge v106 — Finalization and Character Library

## Included

v106 completes Milestone 6 on top of the full v105 project.

### Whole-character validation

- all configured canonical creation steps are re-assessed together;
- warning-only steps are considered resolved but remain visible;
- blocking incomplete steps prevent `Ready` status;
- imported Spell, Language, inventory, and Magic Item catalogue references are checked for staleness.

### Finished sheet

- the active structured draft is projected directly into the existing Character Record Sheet;
- the Sheet tab no longer displays the empty template for the active character;
- Spells are included in History & Notes;
- the Affinity marker follows the selected Affinity Attribute;
- Print / Save PDF uses the browser print system with print-specific layout rules.

### Local character library

- multiple characters are autosaved locally in the browser;
- active-character switching;
- New, Duplicate, Delete, reopen/Edit, and Open Sheet controls;
- existing v105 `dxd-character-draft-v1` storage automatically migrates into the v106 library when no library exists;
- the legacy key continues mirroring the active character for backward compatibility.

### JSON portability

- export uses a versioned `dxd-chargen-character` envelope containing the complete structured draft;
- import accepts that envelope, a library-entry-like object containing `draft`, or a raw CharacterDraft;
- imported drafts are run through the existing v1–v6 draft migration before use.

## Scope retained

Relationships, Merchant completion, Kriket age data, incomplete Magic Items, and demographic fine detail remain intentionally outside this tranche. No starting Spell/Magic Item entitlement is inferred. No per-item throwing OR is stored.

## Running locally

macOS/Linux:

```bash
./run-local.sh
```

Windows:

```bat
run-local.cmd
```

The launch scripts install the locked dependencies when `node_modules` is absent and then start the Next application.

## Validation

The release was checked against the complete source tree and again from a fresh extraction of the packaged ZIP.

- 75 JSON files parse and pass the project data validator.
- 36 Heritage packages, 17 languages/name generators, 11 playable Trade packages, 100 physical-scale rows, and the 96 complete selectable Magic Items validate.
- All 50 TS/TSX source files pass syntax/transpilation diagnostics.
- The dependency-free core rules, draft migration, finalization, character-library, CRS-projection, and data layer pass strict TypeScript checking.
- Local source import resolution reports zero unresolved imports.
- Runtime smoke tests cover whole-character Ready validation, CRS projection, library creation/duplication, JSON export/import, v105 single-draft promotion, and v1-v6 draft migration.
- `package.json` and `package-lock.json` agree at version `0.106.0`.
- `git diff --check` passes.
- `run-local.sh` is executable.

## Generation environment limitation

The generation sandbox cannot complete a clean npm dependency installation because required npm tarballs are not all cached and registry requests fail at the container/network boundary. Consequently a dependency-backed `next build` cannot be run here. No partial `node_modules` directory is shipped. On a normally networked machine, `run-local.sh` or `run-local.cmd` performs the locked `npm ci` before starting the application.
