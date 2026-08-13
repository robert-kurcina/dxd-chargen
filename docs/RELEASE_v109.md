# DXD Character Forge v109 — Repository Consolidation

v109 reorganizes maintainer material and executable scripts without changing runtime DXD rules or the CharacterDraft schema.

## Repository structure

- `META/` now owns all `CANON_SYNC_v*.md` files plus the application `blueprint.md` and `FINAL_PRODUCT_PLAN.md`.
- `docs/` retains release notes, data-integrity material, and machine-readable validation reports.
- `scripts/` owns the local launchers and data-validation utilities.
- Root-level `run-local.sh` and `run-local.cmd` no longer exist.

## Launching

Preferred cross-platform entry point:

```bash
npm run local
```

Platform-specific alternatives:

```bash
bash scripts/run-local.sh
```

```bat
scripts\run-local.cmd
```

The launch implementation installs locked dependencies with `npm ci` when Next.js is absent, then starts `npm run dev` from the project root.

## Package commands

- `npm run local` -> `node scripts/run-local.mjs`
- `npm run validate:data` -> `node scripts/validate-data.mjs`
- `npm run typecheck`
- `npm run build`
- `npm run check`

No CharacterDraft migration is required from v108.
