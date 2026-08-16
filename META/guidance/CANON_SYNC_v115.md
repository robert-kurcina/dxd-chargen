# Canon Sync v115 — Instance-Level Custom Appends

v115 adds a narrow presentation field to assigned items without expanding the catalog or creating a dynamic resource model.

## Custom append

Assigned Magic Items and physical Tomes, Codexes, and Scrolls may carry optional `customAppend` text. The canonical catalog record remains authoritative. Presentation renders the append in parentheses after the normalized item name.

Examples:

- canonical `Skill Tome` + `customAppend: "Cook"` -> `Skill Tome (Cook)`
- canonical `Blank Codex` + no append -> `Spellbook`
- canonical `Scroll, Plain` + `customAppend: "Wardwyrd"` -> `Plain Scroll (Wardwyrd)`
- canonical X=1 Magic Item + descriptive append -> normalized Magic Item name followed by the append

`customAppend` has no price, weight, quantity, X, form, effect, or other mechanical meaning. It is not a second item-name field. Mechanically altered objects remain Notes. Structured Magic Items remain X=1.

## Import normalization

Legacy import first resolves canonical identity. A trailing parenthetical may be retained as `customAppend` only when the base resolves to an eligible Magic Item, Tome, Codex, or Scroll. Canonical names containing parentheses are matched before this interpretation.

Historical `Cookbook` now resolves to canonical Equipment `Skill Tome` with `customAppend: "Cook"`, corresponding to `Labor > { Cook }`. It is no longer a Notes-only possession.

Tome/Codex/Scroll catalog rows may be assigned as separate instances so different appends can coexist. Their normal catalog price and weight still apply because they remain structured Equipment.

## Boundary with Notes

The custom append is descriptive only. Illian's upgraded Magewand, John's historical Vorpal Sword, Khao's Bansword-2, Sir Mandolore's Banhammer-2, Periwinkle's Bracelet Armor, and other mechanically customized or unsupported objects remain Notes under the existing v114 rules.
