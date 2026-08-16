# Canon Sync v114 — Catalog Cleanup and Magic Item Physical Forms

v114 keeps catalogue identity, character-history Notes, and presentation separate.

## Canonical names and presentation

- `Banweapon X` is the canonical Magic Item catalogue entry (Sarna Len p. 561).
- Source Wingding/circled-number markers are not item identity and are removed from canonical names.
- Package labels remain canonical purchase units in data, while display uses quantity-first natural English: `Arrow × 10` -> `10 x Arrows`, `Knife, Throwing × 3` -> `3 x Throwing Knives`.
- `Standard`, `Medium`, and `Average` remain suppressible presentation defaults; canonical stored names are unchanged.

## Ammunition

Ordinary ammunition and ammunition components are purchase-unit catalogue entries but become editable `utilities.notes` text when assigned. Notes carry no price, weight, quantity datatype, provenance, or active-play state. Magic ammunition remains a structured Magic Item.

## Magic Items

Structured Magic Items are always X=1. The Forge does not expose an X-level control. GM-granted/custom X=2+ items are removed from structured Magic Items and retained as Notes.

Where a physical form is supported by an existing Weapons/Armor/Equipment record, the Magic Item uses that canonical record to determine weight. Variable weapon forms use actual eligible weapon-catalog entries. `Vorpal Weapon X` and `Banweapon X` accept catalog weapons except natural/improvised/non-object attack forms such as fists/bare feet, claws, talons, boots, and gauntlets. Jewelry, jewels, and other currently missing physical forms remain unresolved rather than receiving synthetic catalog entries.

## Historical character decisions

- Illian's upgraded Magewand remains Notes-only.
- John's historical Vorpal Sword remains Notes-only.
- Khao's `Bansword-2` remains Notes-only.
- Sir Mandolore's `Banhammer-2` remains Notes-only.
- Periwinkle's Bracelet Armor remains Notes pending its future Magic Item definition.
- Zoey's ordinary X=1 Dagger of Stabbing remains structured and uses `Dagger, Standard` as its physical form.
