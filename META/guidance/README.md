# DXD Character Forge — Guidance

This directory contains development/canon synchronization material for maintainers and LLM-assisted implementation. It is not runtime game data and is not the player-facing rules source.

## Canon synchronization history

`CANON_SYNC_v*.md` records how each generator release reconciled the application with Sarna Len / DXD canon. The files remain versioned individually so earlier implementation decisions and corrections can be audited.

## Development instructions and architecture

- [Mobile campaign execution plan](MOBILE_CAMPAIGN_PLAN.md) — prioritized TODO/WIP/DONE/REJECTED/DEFERRED board, dependencies, acceptance gates, and open questions.
- [Mobile campaign specification](MOBILE_CAMPAIGN_SPEC.md) — agreed product behavior and supporting source inventory.

- `blueprint.md` — compact application architecture and UX guidance.
- `FINAL_PRODUCT_PLAN.md` — implementation roadmap, release criteria, state/rules architecture, validation expectations, and product constraints.

- [Local account architecture](LOCAL_ACCOUNT_ARCHITECTURE.md) — H01 stack decision, server permissions, data migration and H02/H03 delivery gates.

## Other project records

Release notes and machine-readable validation reports live under `META/releases/`. Runtime catalogues remain under `src/data/`; filesystem records and provenance assets live under `data/`; executable and validation scripts remain under `scripts/`.

- [Preset inventory and mobile baseline](MOBILE_PRESET_INVENTORY.md) — T01 source mappings, measured responsive behavior and integration risks.

- [Character state contract](MOBILE_STATE_CONTRACT.md) — normalized transactions, identity boundaries, locks and bounded history.

- [Local database harness](LOCAL_DATABASE_HARNESS.md) — H02a pinned dependencies, migrations, disposable backup/restore and production-bundle checks.
