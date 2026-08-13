# dxd-chargen Canon Sync — v98

Authority: `book-rewrite` from `Sarna_Len_Book_Architecture_updated_2026-08-11_v98_Conlang_Outstanding_Concerns_Resolved(1).zip`.

This archive was reconciled against the iterated canon rather than treated as an independent rules source.

## Updated

- Canonical terminology and lineages: Sarukhen, Quagkh, Steppe, Gilvanar, Cherigili Restanoi; added Human Eniyaski and Pazkharan.
- Environ Heritage costs and exact environment lookup names.
- Character-creation Attribute IM schedule, kept separate from ordinary advancement IMs.
- Profession candidacy, per-100K distribution, Naming Practices, title table, salaries/Savings, and the Merchant Trade. Merchant candidacy/distribution remain null because Book III does not yet specify them.
- Social ranks and titles, including Tribal.
- Known Deity roster: removed conjoinments from the roster; corrected Fuala spelling in random tables.
- PML tier/titles, minimum Age Group table, Primary Mutation metadata, Favor/Hitpoint/Recovery/Max Advantage formulas, and calculated-ability descriptions.
- Trait catalogue entries/metadata identified by the v95 reconciliation and current individual trait definitions.
- Executable support logic for nullable profession candidacy and the separate Assign Intrinsics Attribute-cost schedule.
- Character sheet schema uses `pml` rather than the retired `level` field; the sample sheet was recalculated for current Hitpoints, Recovery Rate, Cellburn Limit, and Vasik Realms terminology.

## Deliberately retained

- Ordinary Attribute `im` values remain the in-play advancement schedule.
- Existing ancestry numeric adjustments were retained where they matched the v98 book-rewrite.
- `favoredTradesByLineage.json` remains derived support data; only canonical lineage keys were renamed. No Merchant or new-lineage probability weights were invented because the book-rewrite does not specify them.
- The explicit Ranger candidacy formula in Book III was retained despite nearby prose using a different Attribute set.

## Canon conflicts handled conservatively

- The generator uses the focused current Manapool rule (`ZED + SIZ DM`) rather than the stray older summary line that still says “SIZ plus Affinity.”
- The generator uses explicit PML formulas where a quick-reference row is inconsistent with the surrounding current rules text.

## Equipment, spells, and magic items catalogue sync

Added structured static-data catalogues sourced from the v98 iterated canon:

- `src/data/itemWeapons.json` — 93 weapon entries from Book V weapon capability tables.
- `src/data/itemArmors.json` — 55 standard sectional, gear, shield, helmet, and armor-set entries from Book V.
- `src/data/itemEquipments.json` — 157 physical ammunition, containers, supplies, scrolls, tools, shelters, written works, and clothing entries from Book V. Transportation services and fashion cost-adjustment rows are not inventory items and were not imported.
- `src/data/spells.json` — 84 Common, Divine, and Arcane spells from Book VI, including current AP, Spell Level, canonical chiral `±` names, casting metadata, tests, keywords, and effect text.
- `src/data/magicItems.json` — 144 current Known Magic Item/detail entries from Book X, with later detailed names taking precedence over stale catalogue aliases.

All five arrays are exported through `src/data/index.ts` under the exact keys `itemWeapons`, `itemArmors`, `itemEquipments`, `spells`, and `magicItems`.

### Catalogue conversion rules

- Currency uses the requested generator convention: `100 cp = 10 sp = 1 gp`; canonical silver-piece prices are stored as numeric `priceGp` values by dividing by 10.
- A canonical non-fixed, missing, or formula price/weight is stored as numeric `0` and the original canonical statement is retained in `notes`; no replacement value is invented.
- Weapon fixed bracket ranges such as `[8]` are represented as `ora: 8` and `isBracket: true`; ordinary ORa values use `isBracket: false`. `N/A` or an unlisted ORa is retained in `notes` and represented numerically as 0.
- Weapon Damage such as `2D+3` is split into `damageDice: 2` and `damageOffset: 3`.
- Armor `D` maps to `deflectRating`; `AR` maps to `armorRating`.
- Every Spell begins with the current universal magical ignition of 1 living mana, therefore `costMana: 1`; the printed bracketed spell cost is `costAp`. Additional mana may replace AP under Manaflow and may become Excess Mana only where the spell permits it.
- Magic Item `gradeLevel` defaults to `1`, following the canon rule that reusable imbuements and legacy names are X1 unless another X is specified. `gradeAvailability` records the stated Base Rarity. Where the Known Magic Items index contains no detailed rarity/effect entry, availability is left blank and the description explicitly says the detail is not specified rather than importing stale data.
- Later detailed Magic Item headings supersede obvious stale aliases in the earlier Known Magic Items list (for example `Anklets of Stealth X` over `Anklet of Stealth`, and `Veil of Detoxification X` over `Shroud of Detoxification X`). Detailed-only current entries are also retained.
