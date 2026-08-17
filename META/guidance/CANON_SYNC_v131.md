# CANON SYNC v131 — Character Armor Legality and Import Normalization

Scope: `dxd-chargen` legacy-import normalization plus synchronized character archive.

## Rules

- Armor Sets are abstract Suit quick-picks. A detailed Sectional Suit supersedes an overlapping Armor Set instead of coexisting with it.
- One Helmet, one Shield, and one Gear layer may be worn.
- Sectional Armor and Helm occupancy may not overlap except at Elbows and Knees.
- Conflicting owned physical armor is retained as mechanically inert Notes.
- A losing Armor Set is a redundant abstraction, not a second physical object, and is removed without manufacturing a possession Note.
- Detailed Sectional Armor is preferred over an overlapping abstract Armor Set when legacy data contains both.
- Within otherwise equal sectional conflicts, broader atomic coverage is preferred before source-order fallback.

## Legacy import corrections

- `Breastplate` now maps to canonical `Breastplate, Metal`, not `Cuirass, Metal`.
- Legacy History possessions and sheet-equipped items retain separate source-detail markers during normalization.
- Sheet-equipped armor normally outranks History possession records unless a more-specific Sectional Suit supersedes an abstract Armor Set.
- Unworn conflicting physical pieces are moved to Notes automatically.

## Character synchronization

The companion `characters_inventory-normalized_v131.zip` synchronizes all active Armor unit Weight/Price data to v130 and resolves existing illegal worn combinations while leaving source/provenance files unchanged.
