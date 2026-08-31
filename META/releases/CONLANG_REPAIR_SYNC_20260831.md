# DXD Character Forge — Conlang Repair Sync — 2026-08-31

This patch synchronizes the character generator's incorporated conlang data with the repaired `_conlang` archive dated 2026-08-31.

## Applied

- Replaced all 17 staged D66 generator Markdown sources with the repaired conlang versions.
- Added `src/data/name-generators/Lineage Sound-Change Profiles.md`, required by the repaired generator etymology notes.
- Rebuilt the runtime `src/data/nameGenerators.json` Begin/Middle D66 arrays from the repaired Markdown tables while preserving the existing runtime generator schema, D6 patterns, suffix tables, IDs, and Borensk special generator structure.
- Corrected the playable/distributed language display spelling from `Ershthiikal` to `Ershthikal`. The repaired lineage distinguishes Q1 Ershthikal from the separate historical J2 Ershthiikal branch.
- Updated active import aliases, locale/settlement descriptions, and current character records that cached the old playable-language display spelling.

## Not changed

- Language IDs remain stable, including `language-ershthikal`.
- Existing character source/import provenance files are not rewritten.
- No chargen mechanics, Trait/Skill rules, equipment, spells, Heritage, or non-language datasets are changed by this sync.
- The ASJP-40 scaffold from the conlang archive is not imported into runtime chargen data; it is a comparative-authoring resource, not a character-generation dependency.

## Validation

- `node scripts/validate-data.mjs`: PASS (`79` JSON files; `17` languages; `17` structured D66 generators).
- Structured runtime Begin/Middle arrays were reparsed from their staged repaired Markdown sources and compared slot-for-slot: PASS.
- Whole-table duplicate audit across the 16 standard generators: PASS; every BEGIN table and every MIDDLE table is distinct.
- Blacktongue/Ithuuikal no longer share an identical productive kernel; the repaired runtime has 30/72 exact aligned Begin+Middle slot matches rather than 72/72.
- Stale active `Ershthiikal`, `Arrikah`, and `Orokugu` chargen spellings: none found. Historical `J2 Ershthiikal` remains a distinct conlang-lineage term where applicable.
- Full `npm run typecheck` was attempted but cannot provide a meaningful project gate from this archive because dependencies are not installed (`node_modules` is absent); diagnostics are dominated by missing `next`, `react`, Radix, and type packages. No dependency installation was performed.
