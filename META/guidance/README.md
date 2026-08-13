# DXD Character Forge — Guidance

This directory contains development/canon synchronization material for maintainers and LLM-assisted implementation. It is not runtime game data and is not the player-facing rules source.

## Canon synchronization history

`CANON_SYNC_v*.md` records how each generator release reconciled the application with Sarna Len / DXD canon. The files remain versioned individually so earlier implementation decisions and corrections can be audited.

## Development instructions and architecture

- `blueprint.md` — compact application architecture and UX guidance.
- `FINAL_PRODUCT_PLAN.md` — implementation roadmap, release criteria, state/rules architecture, validation expectations, and product constraints.

## Other project records

Release notes and machine-readable validation reports live under `META/releases/`. Runtime catalogues remain under `src/data/`; filesystem records and provenance assets live under `data/`; executable and validation scripts remain under `scripts/`.
