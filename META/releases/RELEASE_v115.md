# DXD Character Forge v115 — Custom Item Appends

- Added optional instance-level `customAppend` to assigned selections.
- Exposed editable custom text for all structured Magic Items and Tome/Codex/Scroll Equipment.
- Kept the append presentation-only; it does not affect catalog identity, price, weight, quantity, X, physical form, or effects.
- Allowed separate Tome/Codex/Scroll instances so different subjects/appends can coexist.
- Updated sheet, worksheet, and expanded-sheet presentation to render appends in parentheses.
- Extended legacy normalization so eligible trailing parentheticals can become `customAppend` without changing canonical item names.
- Migrated Honri Heminsur's historical `Cookbook` from Notes to canonical `Skill Tome` with `customAppend: "Cook"`, presenting as `Skill Tome (Cook)`.
- Preserved the v114 boundary: mechanically customized items and Magic Items above X=1 remain Notes-only.
