# Canon Sync v128 — Armor Numeric Audit

## Helmet progression

- Added `Helmet, Full Mantled`: 320 sp, 6 lb, D 4, AR 21, `[Blinders]`, `[Noisy]`, Sturdy/Rigid, Protective; coverage Skull + Face + Neck (Back).
- The values apply the same mantle step seen from `Helmet, Half` to `Helmet, Half Mantled`: one price step, modest weight increase, +1 D, +3 AR, and rear-neck mantle coverage.
- Corrected `Helmet, Full Visored` from 120 sp to 320 sp. The 120 sp value broke the Full -> Full Visored -> Full Visored Mantled price progression; 250 -> 320 -> 400 follows the catalog's R10-like price sequence.

## Definite catalog corrections

- `Vambraces, Metal`: AR 9 -> 18.
- `Gauntlets, Mail`: AR 16 -> 15.
- `Leggings, Boiled`: AR 10 -> 6.

These are source-table corrections where the listed value conflicts with the page-187 material ladder or reverses the material progression.

## Full numeric audit

`ARMOR_NUMERIC_AUDIT_v128.csv` records Price, Weight, D, AR, material baselines, implied Parts Ratios, and audit status for every armor record. Many source entries imply different Parts Ratios from Price versus Weight. Those are flagged rather than automatically rewritten because component form/workmanship can legitimately alter cost, while the exact granular Parts Ratio model is still being iterated.

## Deferred

Character normalization and book-rewrite table parity remain deferred. The eventual book parity pass should incorporate both the added sectional records and these numeric corrections after the editor/catalog model stabilizes.
