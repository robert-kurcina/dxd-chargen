# Canon Sync v113 — Expendable Notes and Inventory Presentation

v113 separates catalogue purchase units from historical character possessions without adding a new resource datatype.

## Notes boundary

`utilities.notes` remains unstructured, editable text. A Note has no catalogue relationship, quantity field, price, weight, provenance, or other mechanical property. Possessions placed in Notes are not included in carried-weight or starting-gear calculations. The character builder is a character-creation and historical-record tool rather than an active-play consumable tracker.

Ordinary expendable ammunition is therefore retained in the catalogue as a purchase unit but is moved to Notes when assigned to a character. The current designated ammunition purchase units are Arrows, Bolts, Bullets, Rounds, and Pellets. No `arrowsCount`, resource object, or similar persistent datatype is introduced.

Examples:

- catalogue `Arrow × 10` presents as `10 x Arrows`; when assigned it becomes the plain Note `10 x Arrows`
- three Ranger starting packages become the plain Note `30 x Arrows`
- a historical count of 24 is simply the editable Note `24 x Arrows`
- `Bolt, small × 10` presents as `10 x Small Bolts`

Magic ammunition remains governed by the Magic Item catalogue and is not converted by this ordinary-ammunition rule.

## Container normalization

Containers remain structured inventory when an exact catalogue identity is known. Historical combined descriptions are split into container plus Note quantity where appropriate.

- `Quiver of 24 Arrows` -> Equipment `Quiver, Large` + Note `24 x Arrows`
- `Arrow quiver` with 20 arrows -> Equipment `Quiver, Small` + Note `20 x Arrows`
- `Small Bolt quiver` -> Equipment `Case, Small`; loose ammunition remains a Note such as `20 x Small Bolts`
- `Bedroll` -> Equipment `Bed roll, Simple`
- a single `Pouch` remains Notes because catalogue `Pouch × 10` is a different purchasing unit
- `Small sack` remains Notes and is normalized to `Small Bag` because catalogue `Bag, Small × 10` is a different purchasing unit
- `Cookbook` uses the catalogue concept `Skill Tome` and is retained as the plain Note `Skill Tome (Cook)`; no `Book, Small` entry is required

## Skill Tome / Cookbook

The former equipment-catalogue label `Skill Book` is normalized to `Skill Tome`. Historical `Cookbook` is not stored as structured inventory; because the relevant Skill is `Labor > { Cook }`, it is the editable Note `Skill Tome (Cook)`. Notes remain mechanically inert.

## Magestick canonical data

The embedded `❶` glyph has been removed from the four Magestick weapon catalogue names. Canonical names are now `Magestick, Rod`, `Magestick, Small Wand`, `Magestick, Wand`, and `Magestick, Staff`. The glyph was source annotation, not item identity. Deterministic catalogue IDs remain unchanged because the glyph did not contribute to their slug. Legacy aliases now normalize directly to the clean canonical names.

`Magestick Wand` normalizes to `Magestick, Wand`. Existing assigned Magesticks were migrated to the clean canonical names.
